import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Trash2 } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Select from '../common/Select';
import Spinner from '../common/Spinner';
import FormError from '../common/FormError';
import ScheduleExceptionsPanel from '../schedule/ScheduleExceptionsPanel';
import {
  getProfessionalScheduleForAdmin,
  setProfessionalSchedule,
  type ProfessionalScheduleEntry,
} from '../../services/professionalScheduleService';
import { getBranchScheduleForAdmin, type BranchScheduleEntry } from '../../services/branchScheduleService';
import {
  DAY_LABELS,
  rangesOutsideBranchHours,
  validateWeeklySchedule,
  validateWithinBranchHours,
} from '../../utils/scheduleValidation';
import { activeBranchesOf } from '../../utils/professionalBranches';
import type { Professional } from '../../types/Professional';

// Lunes primero en pantalla; day_of_week sigue siendo 0 = domingo.
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

interface TimeBlock {
  start: string;
  end: string;
}

interface DayBlocksState {
  open: boolean;
  blocks: TimeBlock[];
}

function emptyScheduleForm(): DayBlocksState[] {
  return DAY_LABELS.map(() => ({ open: false, blocks: [] }));
}

interface ProfessionalScheduleModalProps {
  professional: Professional;
  branches: { id: string; name: string; active: boolean }[];
  canManageBranch: (branchId: string) => boolean;
  // Sede con la que abre (la pestaña de la ficha); si no, la primera activa
  // que el usuario administra.
  initialBranchId?: string;
  onClose: () => void;
  onSaved?: () => void;
}

// Horario semanal y ausencias de una profesional. Un admin_sede ve el horario
// de todas sus sedes (es público), pero solo guarda en las suyas. Se monta de
// nuevo cada vez que se abre (key en el padre).
function ProfessionalScheduleModal({
  professional,
  branches,
  canManageBranch,
  initialBranchId,
  onClose,
  onSaved,
}: ProfessionalScheduleModalProps) {
  const professionalBranches = activeBranchesOf(professional.branchIds, branches);
  const firstBranch =
    (initialBranchId && professionalBranches.some((branch) => branch.id === initialBranchId) ? initialBranchId : null) ??
    professionalBranches.find((branch) => canManageBranch(branch.id))?.id ??
    professionalBranches[0]?.id ??
    '';

  const [scheduleBranchId, setScheduleBranchId] = useState(firstBranch);
  const [scheduleForm, setScheduleForm] = useState<DayBlocksState[]>(emptyScheduleForm());
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(Boolean(firstBranch));
  // Sin el horario de la sede (o el de la profesional) no se puede validar ni
  // guardar: se evita pisar el horario real con un formulario vacío.
  const [scheduleLoadFailed, setScheduleLoadFailed] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [branchHours, setBranchHours] = useState<BranchScheduleEntry[]>([]);
  const [scheduleTab, setScheduleTab] = useState<'weekly' | 'exceptions'>('weekly');
  const [loadKey, setLoadKey] = useState(0);

  useEffect(() => {
    if (!scheduleBranchId) return;
    let isMounted = true;
    Promise.all([getBranchScheduleForAdmin(scheduleBranchId), getProfessionalScheduleForAdmin(professional.id, scheduleBranchId)])
      .then(([hours, entries]) => {
        if (!isMounted) return;
        setBranchHours(hours);
        const next = emptyScheduleForm();
        for (const entry of entries) {
          next[entry.dayOfWeek] = {
            open: true,
            blocks: [...next[entry.dayOfWeek].blocks, { start: entry.startTime, end: entry.endTime }],
          };
        }
        setScheduleForm(next);
      })
      .catch((err) => {
        if (!isMounted) return;
        setScheduleLoadFailed(true);
        setScheduleError(err instanceof Error ? err.message : 'No se pudo cargar el horario.');
      })
      .finally(() => isMounted && setIsLoadingSchedule(false));
    return () => {
      isMounted = false;
    };
  }, [professional.id, scheduleBranchId, loadKey]);

  const handleScheduleBranchChange = (branchId: string) => {
    setScheduleBranchId(branchId);
    setScheduleForm(emptyScheduleForm());
    setBranchHours([]);
    setScheduleError(null);
    setScheduleLoadFailed(false);
    setIsLoadingSchedule(Boolean(branchId));
    setLoadKey((key) => key + 1);
  };

  // Cualquier cambio en el horario deja atrás el error del intento anterior.
  const updateDays = (update: (current: DayBlocksState[]) => DayBlocksState[]) => {
    setScheduleError(null);
    setScheduleForm(update);
  };

  const toggleScheduleDay = (dayIndex: number) =>
    updateDays((current) =>
      current.map((day, index) =>
        index === dayIndex
          ? { open: !day.open, blocks: day.blocks.length > 0 ? day.blocks : [{ start: '09:00', end: '13:00' }] }
          : day,
      ),
    );

  const addScheduleBlock = (dayIndex: number) =>
    updateDays((current) =>
      current.map((day, index) =>
        index === dayIndex ? { ...day, blocks: [...day.blocks, { start: '14:00', end: '17:00' }] } : day,
      ),
    );

  const removeScheduleBlock = (dayIndex: number, blockIndex: number) =>
    updateDays((current) =>
      current.map((day, index) =>
        index === dayIndex ? { ...day, blocks: day.blocks.filter((_, i) => i !== blockIndex) } : day,
      ),
    );

  const updateScheduleBlock = (dayIndex: number, blockIndex: number, field: 'start' | 'end', value: string) =>
    updateDays((current) =>
      current.map((day, index) =>
        index === dayIndex
          ? { ...day, blocks: day.blocks.map((block, i) => (i === blockIndex ? { ...block, [field]: value } : block)) }
          : day,
      ),
    );

  const scheduleEntries: ProfessionalScheduleEntry[] = useMemo(
    () =>
      scheduleForm.flatMap((day, dayOfWeek) =>
        day.open ? day.blocks.map((block) => ({ dayOfWeek, startTime: block.start, endTime: block.end })) : [],
      ),
    [scheduleForm],
  );
  const daysOutsideBranchHours = useMemo(
    () => rangesOutsideBranchHours(scheduleEntries, branchHours),
    [scheduleEntries, branchHours],
  );

  const handleSaveSchedule = async (event: FormEvent) => {
    event.preventDefault();
    if (!scheduleBranchId) return;

    const validationError =
      validateWeeklySchedule(scheduleEntries) ?? validateWithinBranchHours(scheduleEntries, branchHours);
    if (validationError) {
      setScheduleError(validationError);
      return;
    }

    setScheduleError(null);
    setIsSavingSchedule(true);

    try {
      await setProfessionalSchedule(professional.id, scheduleBranchId, scheduleEntries);
      onSaved?.();
      onClose();
    } catch (err) {
      setScheduleError(err instanceof Error ? err.message : 'No se pudo guardar el horario.');
    } finally {
      setIsSavingSchedule(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Horario — ${professional.fullName}`}
      maxWidth="max-w-[560px]"
      footer={
        scheduleTab === 'weekly' ? (
          <>
            <Button type="button" variant="admin-outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form="horario-profesional-form"
              variant="admin-solid"
              disabled={
                isSavingSchedule ||
                isLoadingSchedule ||
                scheduleLoadFailed ||
                !scheduleBranchId ||
                !canManageBranch(scheduleBranchId)
              }
            >
              {isSavingSchedule ? 'Guardando…' : 'Guardar horario'}
            </Button>
          </>
        ) : undefined
      }
    >
      <div role="tablist" className="flex gap-1 border-b border-adm-line-div">
        {(
          [
            ['weekly', 'Horario semanal'],
            ['exceptions', 'Ausencias y turnos extra'],
          ] as const
        ).map(([tab, label]) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={scheduleTab === tab}
            onClick={() => setScheduleTab(tab)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              scheduleTab === tab
                ? 'border-brand-600 text-adm-accent-deep'
                : 'border-transparent text-adm-ink-400 hover:text-adm-ink-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {scheduleTab === 'exceptions' && (
        <ScheduleExceptionsPanel mode="professional" professionalId={professional.id} branches={professionalBranches} />
      )}

      {scheduleTab === 'weekly' && (
        <form id="horario-profesional-form" onSubmit={handleSaveSchedule} className="flex flex-col gap-4 py-2">
          <FormError message={scheduleError} />

          <Select
            label="Sede"
            value={scheduleBranchId}
            onChange={(event) => handleScheduleBranchChange(event.target.value)}
            options={professionalBranches.map((branch) => ({
              value: branch.id,
              label: canManageBranch(branch.id) ? branch.name : `${branch.name} (solo lectura)`,
            }))}
          />

          {scheduleBranchId && !canManageBranch(scheduleBranchId) && (
            <p className="rounded-[10px] border border-adm-line-field bg-adm-surface-input px-3.5 py-2.5 text-sm text-adm-ink-400">
              No administras esta sede: puedes ver el horario, pero solo lo cambia su administrador o el administrador
              general.
            </p>
          )}

          {isLoadingSchedule ? (
            <div className="flex justify-center py-8">
              <Spinner size={26} />
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-adm-line-div rounded-[10px] border border-adm-line-field">
              {DAY_ORDER.map((dayIndex) => {
                const label = DAY_LABELS[dayIndex];
                const day = scheduleForm[dayIndex];
                const branchDay = branchHours.find((item) => item.dayOfWeek === dayIndex);
                const timeClass =
                  'h-8 rounded-[8px] border border-adm-line-field bg-adm-surface-input px-1.5 text-sm text-adm-ink-700 outline-none focus:border-brand-600';
                // Una fila por día: nombre, bloques y "+ Bloque"; pasa a otra
                // línea solo si no cabe. Un día sin marcar es solo su nombre.
                return (
                  <div
                    key={label}
                    className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 px-2.5 ${day.open ? 'py-2' : 'py-1.5'}`}
                  >
                    <label className="flex w-[124px] shrink-0 items-center gap-2 text-sm font-medium text-adm-ink-700">
                      <input
                        type="checkbox"
                        className="h-[15px] w-[15px] accent-brand-600"
                        checked={day.open}
                        onChange={() => toggleScheduleDay(dayIndex)}
                      />
                      <span className="flex flex-col leading-tight">
                        {label}
                        <span className="text-[11px] font-normal text-adm-ink-400">
                          {branchDay ? `Sede ${branchDay.openTime}–${branchDay.closeTime}` : 'Sede cerrada'}
                        </span>
                      </span>
                    </label>

                    {day.open &&
                      day.blocks.map((block, blockIndex) => (
                        <div key={blockIndex} className="flex items-center gap-1">
                          <input
                            type="time"
                            aria-label={`${label}, inicio del bloque ${blockIndex + 1}`}
                            value={block.start}
                            onChange={(event) => updateScheduleBlock(dayIndex, blockIndex, 'start', event.target.value)}
                            className={timeClass}
                          />
                          <span className="text-sm text-adm-ink-400">–</span>
                          <input
                            type="time"
                            aria-label={`${label}, fin del bloque ${blockIndex + 1}`}
                            value={block.end}
                            onChange={(event) => updateScheduleBlock(dayIndex, blockIndex, 'end', event.target.value)}
                            className={timeClass}
                          />
                          <button
                            type="button"
                            aria-label="Quitar bloque"
                            onClick={() => removeScheduleBlock(dayIndex, blockIndex)}
                            className="flex h-8 w-7 items-center justify-center rounded-[8px] text-adm-ink-300 transition-colors hover:bg-adm-status-cancelled-bg hover:text-adm-danger-text"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}

                    {day.open && (
                      <button
                        type="button"
                        onClick={() => addScheduleBlock(dayIndex)}
                        className="text-[13px] font-medium text-adm-accent-deep hover:underline"
                      >
                        + Bloque
                      </button>
                    )}

                    {day.open && daysOutsideBranchHours.includes(dayIndex) && (
                      <p className="basis-full pl-[23px] text-[12.5px] text-adm-danger-text">
                        Fuera del horario de la sede: ajústalo para poder guardar.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </form>
      )}
    </Modal>
  );
}

export default ProfessionalScheduleModal;
