import { useEffect, useState } from 'react';
import CalendarPicker from '../common/CalendarPicker';
import Spinner from '../common/Spinner';
import EmptyState from '../common/EmptyState';
import Button from '../common/Button';
import { CalendarX2, RefreshCw } from 'lucide-react';
import { getAvailableSlots } from '../../services/appointmentService';
import { getTodayIsoDate } from '../../utils/date';
import type { TimeSlotOption } from '../../types/Schedule';

interface AdminSlotPickerProps {
  professionalId: string;
  branchId: string;
  serviceId: string | null;
  // Al reprogramar: la cita que se mueve no ocupa su propio horario.
  excludeAppointmentId?: string | null;
  date: string | null;
  time: string | null;
  onSelectDate: (date: string) => void;
  onSelectTime: (time: string) => void;
}

function AdminSlotPicker({
  professionalId,
  branchId,
  serviceId,
  excludeAppointmentId = null,
  date,
  time,
  onSelectDate,
  onSelectTime,
}: AdminSlotPickerProps) {
  const [slots, setSlots] = useState<TimeSlotOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!date) {
      setSlots([]);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);
    setHasFailed(false);

    getAvailableSlots({ professionalId, branchId, serviceId, date, excludeAppointmentId })
      .then((data) => {
        if (!isCancelled) {
          setSlots(data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setSlots([]);
          setHasFailed(true);
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [date, professionalId, branchId, serviceId, excludeAppointmentId, retryCount]);

  return (
    <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
      <CalendarPicker selectedDate={date} onSelect={onSelectDate} minDate={getTodayIsoDate()} />

      <div>
        <p className="text-sm font-medium text-adm-ink-700">Horarios disponibles</p>
        {!date ? (
          <p className="mt-2 text-sm text-adm-ink-400">Selecciona una fecha.</p>
        ) : isLoading ? (
          <div className="mt-2 flex justify-center py-4">
            <Spinner size={22} />
          </div>
        ) : hasFailed ? (
          <div className="mt-2 flex flex-col items-start gap-3">
            <p role="alert" className="text-sm text-adm-danger-text">
              No se pudieron cargar los horarios. Intenta de nuevo.
            </p>
            <Button
              type="button"
              variant="admin-outline"
              size="sm"
              icon={<RefreshCw size={14} />}
              onClick={() => setRetryCount((count) => count + 1)}
            >
              Reintentar
            </Button>
          </div>
        ) : slots.length === 0 ? (
          <div className="mt-2">
            <EmptyState icon={CalendarX2} title="Sin horarios libres" description="No hay horarios disponibles esta fecha." />
          </div>
        ) : (
          <div className="mt-2 grid grid-cols-3 gap-2">
            {slots.map((slot) => (
              <button
                key={slot.time}
                type="button"
                onClick={() => onSelectTime(slot.time)}
                className={`h-9 rounded-[8px] border text-sm font-medium transition-colors ${
                  time === slot.time
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : 'border-adm-line-field text-adm-ink-700 hover:bg-adm-surface-hover'
                }`}
              >
                {slot.time}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminSlotPicker;
