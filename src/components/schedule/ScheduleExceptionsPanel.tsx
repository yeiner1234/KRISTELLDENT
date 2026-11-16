import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { CalendarOff, Trash2 } from 'lucide-react';
import Button from '../common/Button';
import Input from '../common/Input';
import Select from '../common/Select';
import Spinner from '../common/Spinner';
import StatusBadge from '../common/StatusBadge';
import {
  createScheduleException,
  deleteScheduleException,
  getUpcomingBranchClosures,
  getUpcomingProfessionalExceptions,
  type ScheduleException,
} from '../../services/scheduleExceptionService';
import { formatDateLong, getTodayIsoDate } from '../../utils/date';

// Un mismo panel para las dos pantallas:
//  - professional: ausencias (día completo o rango) y turnos extra.
//  - branch: feriados y cierres de día completo de la sede.
//    El turno extra vale en UNA sede (se elige entre `branches`, las sedes
//    de la profesional); la ausencia, sin sede, vale en todas.
type ScheduleExceptionsPanelProps =
  | { mode: 'professional'; professionalId: string; branches: { id: string; name: string }[] }
  | { mode: 'branch'; branchId: string };

interface ExceptionFormState {
  date: string;
  fullDay: boolean;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  extraBranchId: string;
  reason: string;
}

const emptyForm: ExceptionFormState = {
  date: '',
  fullDay: true,
  startTime: '09:00',
  endTime: '13:00',
  isAvailable: false,
  extraBranchId: '',
  reason: '',
};

const errorBoxClass =
  'rounded-[10px] border border-adm-status-cancelled-border bg-adm-status-cancelled-bg px-3.5 py-2.5 text-sm font-medium text-adm-danger-text';
const timeInputClass =
  'h-9 rounded-[8px] border border-adm-line-field bg-adm-surface-input px-2 text-sm text-adm-ink-700 outline-none focus:border-brand-600';

function ScheduleExceptionsPanel(props: ScheduleExceptionsPanelProps) {
  const isProfessional = props.mode === 'professional';
  const ownerId = props.mode === 'professional' ? props.professionalId : props.branchId;
  const professionalBranches = props.mode === 'professional' ? props.branches : [];
  const branchName = (id: string | null) => professionalBranches.find((branch) => branch.id === id)?.name;

  const [exceptions, setExceptions] = useState<ScheduleException[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState<ExceptionFormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchList = useCallback(
    () => (isProfessional ? getUpcomingProfessionalExceptions(ownerId) : getUpcomingBranchClosures(ownerId)),
    [isProfessional, ownerId],
  );

  const showLoadError = (err: unknown) =>
    setLoadError(err instanceof Error ? err.message : 'No se pudieron cargar las excepciones.');

  useEffect(() => {
    let isActive = true;
    fetchList()
      .then((data) => isActive && setExceptions(data))
      .catch((err) => isActive && showLoadError(err))
      .finally(() => isActive && setIsLoading(false));
    return () => {
      isActive = false;
    };
  }, [fetchList]);

  const load = () => {
    setLoadError(null);
    fetchList().then(setExceptions).catch(showLoadError);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setIsSaving(true);

    // La sede siempre cierra el día completo. Del profesional: el turno extra
    // lleva su sede; la ausencia va sin sede y vale en todas.
    const fullDay = !isProfessional || form.fullDay;
    const exceptionBranchId = !isProfessional ? ownerId : form.isAvailable ? form.extraBranchId || null : null;
    try {
      await createScheduleException({
        professionalId: isProfessional ? ownerId : null,
        branchId: exceptionBranchId,
        date: form.date,
        isAvailable: isProfessional ? form.isAvailable : false,
        startTime: fullDay ? null : form.startTime,
        endTime: fullDay ? null : form.endTime,
        reason: form.reason,
      });
      setForm(emptyForm);
      load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo guardar.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setLoadError(null);
    try {
      await deleteScheduleException(id);
      setExceptions((current) => current.filter((item) => item.id !== id));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'No se pudo borrar.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4 py-2">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-adm-ink-700">
          {isProfessional ? 'Próximas ausencias y turnos extra' : 'Próximos feriados y cierres'}
        </span>
        {loadError && <p className={errorBoxClass}>{loadError}</p>}
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Spinner size={22} />
          </div>
        ) : exceptions.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-adm-ink-400">
            <CalendarOff size={15} />
            {isProfessional ? 'No hay ausencias ni turnos extra programados.' : 'No hay feriados ni cierres programados.'}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {exceptions.map((item) => (
              <li
                key={item.id}
                className="flex items-start justify-between gap-2 rounded-[10px] border border-adm-line-field p-2.5"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="text-sm font-medium capitalize text-adm-ink-700">{formatDateLong(item.date)}</span>
                  <span className="text-[13px] text-adm-ink-400">
                    {item.startTime && item.endTime ? `${item.startTime} – ${item.endTime}` : 'Todo el día'}
                    {isProfessional ? ` · ${branchName(item.branchId) ?? 'Todas sus sedes'}` : ''}
                    {item.reason ? ` · ${item.reason}` : ''}
                  </span>
                  {isProfessional && (
                    <StatusBadge
                      label={item.isAvailable ? 'Turno extra' : 'No disponible'}
                      tone={item.isAvailable ? 'adm-confirmed' : 'adm-cancelled'}
                    />
                  )}
                </div>
                <button
                  type="button"
                  aria-label="Borrar"
                  disabled={deletingId === item.id}
                  onClick={() => handleDelete(item.id)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] text-adm-ink-300 transition-colors hover:bg-adm-status-cancelled-bg hover:text-adm-danger-text disabled:opacity-50"
                >
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 border-t border-adm-line-div pt-4">
        <span className="text-sm font-medium text-adm-ink-700">
          {isProfessional ? 'Agregar ausencia o turno extra' : 'Agregar feriado o cierre'}
        </span>
        {formError && <p className={errorBoxClass}>{formError}</p>}

        <Input
          label="Fecha"
          type="date"
          variant="admin"
          min={getTodayIsoDate()}
          value={form.date}
          onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
          required
        />

        {isProfessional && (
          <>
            <div className="flex flex-wrap gap-4 text-sm text-adm-ink-700">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="exception-type"
                  className="h-[15px] w-[15px] accent-brand-600"
                  checked={!form.isAvailable}
                  onChange={() => setForm((current) => ({ ...current, isAvailable: false }))}
                />
                No disponible
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="exception-type"
                  className="h-[15px] w-[15px] accent-brand-600"
                  checked={form.isAvailable}
                  // Un turno extra siempre tiene horas.
                  onChange={() =>
                    setForm((current) => ({
                      ...current,
                      isAvailable: true,
                      fullDay: false,
                      extraBranchId: current.extraBranchId || (professionalBranches[0]?.id ?? ''),
                    }))
                  }
                />
                Turno extra
              </label>
            </div>

            {form.isAvailable && (
              <Select
                label="Sede del turno extra"
                value={form.extraBranchId}
                onChange={(event) => setForm((current) => ({ ...current, extraBranchId: event.target.value }))}
                options={[
                  { value: '', label: 'Elige una sede' },
                  ...professionalBranches.map((branch) => ({ value: branch.id, label: branch.name })),
                ]}
              />
            )}

            <label className="flex items-center gap-2 text-sm text-adm-ink-700">
              <input
                type="checkbox"
                className="h-[15px] w-[15px] accent-brand-600"
                checked={form.fullDay}
                disabled={form.isAvailable}
                onChange={() => setForm((current) => ({ ...current, fullDay: !current.fullDay }))}
              />
              Todo el día
            </label>

            {!form.fullDay && (
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  aria-label="Hora de inicio"
                  value={form.startTime}
                  onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))}
                  className={timeInputClass}
                />
                <span className="text-sm text-adm-ink-400">a</span>
                <input
                  type="time"
                  aria-label="Hora de fin"
                  value={form.endTime}
                  onChange={(event) => setForm((current) => ({ ...current, endTime: event.target.value }))}
                  className={timeInputClass}
                />
              </div>
            )}
          </>
        )}

        <Input
          label="Motivo (opcional)"
          variant="admin"
          value={form.reason}
          onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
        />

        {isProfessional && (
          <p className="text-[12.5px] text-adm-ink-400">
            Una ausencia aplica en todas las sedes del profesional. Un turno extra solo vale en la sede elegida y dentro de su horario.
          </p>
        )}

        <div className="flex justify-end">
          <Button type="submit" variant="admin-solid" size="sm" disabled={isSaving}>
            {isSaving ? 'Guardando…' : 'Agregar'}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default ScheduleExceptionsPanel;
