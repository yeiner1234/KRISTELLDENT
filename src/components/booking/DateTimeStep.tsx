import { useEffect, useState } from 'react';
import { Calendar, CalendarX2, RefreshCw } from 'lucide-react';
import Button from '../common/Button';
import CalendarPicker from '../common/CalendarPicker';
import StepHeader from './StepHeader';
import Spinner from '../common/Spinner';
import EmptyState from '../common/EmptyState';
import { ANY_PROFESSIONAL, candidateProfessionals } from '../../utils/bookingCandidates';
import { useProfessionals } from '../../hooks/useProfessionals';
import { getAvailableSlots } from '../../services/appointmentService';
import { getBranchWeeklyHours } from '../../services/branchScheduleService';
import { isBranchClosedOn, type WeeklyHours } from '../../utils/businessHours';
import { formatDateLong, getTodayIsoDate } from '../../utils/date';

interface SlotsResult {
  key: string;
  // Hora → profesional que la tiene libre.
  byTime: Record<string, string>;
  failed: boolean;
}

interface DateTimeStepProps {
  specialtyId: string;
  branchId: string;
  professionalId: string;
  serviceId: string;
  date: string | null;
  time: string | null;
  onSelectDate: (date: string) => void;
  onSelectTime: (time: string, resolvedProfessionalId: string) => void;
}

function DateTimeStep({
  specialtyId,
  branchId,
  professionalId,
  serviceId,
  date,
  time,
  onSelectDate,
  onSelectTime,
}: DateTimeStepProps) {
  const { professionals, isLoading: isLoadingProfessionals } = useProfessionals();
  const [result, setResult] = useState<SlotsResult | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [weeklyHours, setWeeklyHours] = useState<WeeklyHours | null>(null);

  const isAnyProfessional = professionalId === ANY_PROFESSIONAL;
  const candidateKey = candidateProfessionals(professionals, { specialtyId, branchId, professionalId })
    .map((p) => p.id)
    .join(',');
  // Identifica la consulta en curso: si el resultado guardado es de otra
  // clave, todavía se está cargando la nueva.
  const requestKey = `${date}|${branchId}|${serviceId}|${candidateKey}|${retryCount}`;

  useEffect(() => {
    let isCancelled = false;
    // Solo para deshabilitar días cerrados: si falla, no se deshabilita nada.
    getBranchWeeklyHours(branchId)
      .then((hours) => !isCancelled && setWeeklyHours(hours))
      .catch(() => !isCancelled && setWeeklyHours(null));
    return () => {
      isCancelled = true;
    };
  }, [branchId]);

  useEffect(() => {
    if (!date || !candidateKey) return;

    let isCancelled = false;
    const candidateIds = candidateKey.split(',');

    Promise.all(
      candidateIds.map((id) =>
        getAvailableSlots({ professionalId: id, branchId, serviceId, date }).then((data) =>
          data.map((slot) => ({ time: slot.time, professionalId: id })),
        ),
      ),
    )
      .then((lists) => {
        if (isCancelled) return;

        // Con "cualquier profesional", cada horario libre se resuelve al
        // primer profesional de la especialidad que realmente lo tiene libre
        // — nunca se inventa disponibilidad ni se reparte round-robin.
        const byTime: Record<string, string> = {};
        for (const list of lists) {
          for (const slot of list) {
            if (!(slot.time in byTime)) {
              byTime[slot.time] = slot.professionalId;
            }
          }
        }
        setResult({ key: requestKey, byTime, failed: false });
      })
      .catch(() => {
        if (!isCancelled) setResult({ key: requestKey, byTime: {}, failed: true });
      });

    return () => {
      isCancelled = true;
    };
  }, [requestKey, date, branchId, serviceId, candidateKey]);

  const isLoading = Boolean(date) && (isLoadingProfessionals || (Boolean(candidateKey) && result?.key !== requestKey));
  const current = result?.key === requestKey ? result : null;
  const slotProfessionals = current?.byTime ?? {};
  const slots = Object.keys(slotProfessionals).sort();
  const isDateDisabled = weeklyHours ? (iso: string) => isBranchClosedOn(iso, weeklyHours) : undefined;

  return (
    <div>
      <StepHeader icon={Calendar} title="Elige fecha y hora" subtitle="Selecciona el momento que mejor se adapte a ti." />

      <div className="grid gap-6 lg:grid-cols-[55%_45%]">
        <CalendarPicker
          selectedDate={date}
          onSelect={onSelectDate}
          minDate={getTodayIsoDate()}
          isDateDisabled={isDateDisabled}
        />

        <div>
          <p className="text-sm font-semibold text-brand-900">Horarios disponibles</p>
          {date && <p className="mt-0.5 text-[13px] capitalize text-ink-tertiary">{formatDateLong(date)}</p>}

          {!date ? (
            <p className="mt-4 text-sm text-ink-tertiary">Selecciona una fecha para ver los horarios.</p>
          ) : isLoading ? (
            <div className="mt-4">
              <Spinner size={24} />
            </div>
          ) : current?.failed ? (
            <div className="mt-4 flex flex-col items-start gap-3">
              <p className="text-sm text-ink-secondary">No se pudieron cargar los horarios. Intenta de nuevo.</p>
              <Button size="sm" icon={<RefreshCw size={15} />} onClick={() => setRetryCount((count) => count + 1)}>
                Reintentar
              </Button>
            </div>
          ) : slots.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                icon={CalendarX2}
                title="No hay horarios disponibles"
                description="No quedan horarios libres para esta fecha. Prueba con otro día."
              />
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              {slots.map((slotTime) => {
                const resolvedProfessionalId = slotProfessionals[slotTime];
                const professional = professionals.find((item) => item.id === resolvedProfessionalId);
                const isSelected = time === slotTime;

                return (
                  <button
                    key={slotTime}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => onSelectTime(slotTime, resolvedProfessionalId)}
                    className="rounded-xl px-3 py-2.5 text-left transition-colors"
                    style={{
                      border: isSelected ? '1.5px solid #0f7b86' : '1px solid #e1e8ec',
                      background: isSelected ? '#f5fafb' : '#ffffff',
                    }}
                  >
                    <span className="text-sm font-semibold" style={{ color: isSelected ? '#0f7b86' : '#12232b' }}>
                      {slotTime}
                    </span>
                    {isAnyProfessional && professional && (
                      <span className="mt-0.5 block truncate text-[11.5px] text-ink-tertiary">{professional.fullName}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DateTimeStep;
