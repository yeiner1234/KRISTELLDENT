import { useEffect, useState } from 'react';
import { Calendar, CalendarX2 } from 'lucide-react';
import CalendarPicker from '../common/CalendarPicker';
import StepHeader from './StepHeader';
import Spinner from '../common/Spinner';
import EmptyState from '../common/EmptyState';
import { ANY_PROFESSIONAL } from './ProfessionalStep';
import { useProfessionals } from '../../hooks/useProfessionals';
import { getAvailableSlots } from '../../services/appointmentService';
import { formatDateLong, getTodayIsoDate } from '../../utils/date';
import type { TimeSlotOption } from '../../types/Schedule';

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
  const { professionals } = useProfessionals();
  const [slots, setSlots] = useState<TimeSlotOption[]>([]);
  const [slotProfessionals, setSlotProfessionals] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const isAnyProfessional = professionalId === ANY_PROFESSIONAL;
  const matchingProfessionals = professionals.filter((professional) => professional.specialtyIds.includes(specialtyId));
  const candidateIds = isAnyProfessional ? matchingProfessionals.map((p) => p.id) : [professionalId];
  const candidateKey = candidateIds.join(',');

  useEffect(() => {
    if (!date || candidateIds.length === 0) {
      setSlots([]);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);

    Promise.all(
      candidateIds.map((id) =>
        getAvailableSlots({ professionalId: id, branchId, serviceId, date }).then((data) =>
          data.map((slot) => ({ time: slot.time, professionalId: id })),
        ),
      ),
    ).then((results) => {
      if (isCancelled) return;

      // Con "cualquier profesional", cada horario libre se resuelve al
      // primer profesional de la especialidad que realmente lo tiene libre
      // — nunca se inventa disponibilidad ni se reparte round-robin.
      const byTime: Record<string, string> = {};
      for (const list of results) {
        for (const slot of list) {
          if (!(slot.time in byTime)) {
            byTime[slot.time] = slot.professionalId;
          }
        }
      }

      const times = Object.keys(byTime).sort();
      setSlotProfessionals(byTime);
      setSlots(times.map((t) => ({ time: t, available: true })));
      setIsLoading(false);
    });

    return () => {
      isCancelled = true;
    };
  }, [date, branchId, serviceId, candidateKey]);

  return (
    <div>
      <StepHeader icon={Calendar} title="Elige fecha y hora" subtitle="Selecciona el momento que mejor se adapte a ti." />

      <div className="grid gap-6 lg:grid-cols-[55%_45%]">
        <CalendarPicker selectedDate={date} onSelect={onSelectDate} minDate={getTodayIsoDate()} />

        <div>
          <p className="text-sm font-semibold text-brand-900">Horarios disponibles</p>
          {date && <p className="mt-0.5 text-[13px] capitalize text-ink-tertiary">{formatDateLong(date)}</p>}

          {!date ? (
            <p className="mt-4 text-sm text-ink-tertiary">Selecciona una fecha para ver los horarios.</p>
          ) : isLoading ? (
            <div className="mt-4">
              <Spinner size={24} />
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
              {slots.map((slot) => {
                const resolvedProfessionalId = slotProfessionals[slot.time];
                const professional = professionals.find((item) => item.id === resolvedProfessionalId);
                const isSelected = time === slot.time;

                return (
                  <button
                    key={slot.time}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => onSelectTime(slot.time, resolvedProfessionalId)}
                    className="rounded-xl px-3 py-2.5 text-left transition-colors"
                    style={{
                      border: isSelected ? '1.5px solid #0f7b86' : '1px solid #e1e8ec',
                      background: isSelected ? '#f5fafb' : '#ffffff',
                    }}
                  >
                    <span className="text-sm font-semibold" style={{ color: isSelected ? '#0f7b86' : '#12232b' }}>
                      {slot.time}
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
