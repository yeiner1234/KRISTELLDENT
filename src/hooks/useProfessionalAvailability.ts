import { useCallback, useEffect, useState } from 'react';
import {
  getProfessionalWeeklySchedule,
  type ProfessionalBranchScheduleEntry,
} from '../services/professionalScheduleService';
import { getProfessionalExceptionsBetween, type ScheduleException } from '../services/scheduleExceptionService';
import { availabilityForDay, type AvailabilityBlock } from '../utils/agendaAvailability';

interface LoadedAvailability {
  key: string;
  weekly: ProfessionalBranchScheduleEntry[];
  exceptions: ScheduleException[];
  error: string | null;
}

interface UseProfessionalAvailabilityResult {
  blocksFor: (isoDate: string) => AvailabilityBlock[];
  error: string | null;
}

// Horario + ausencias/turnos extra de un profesional para las fechas
// fromDate..toDate de la agenda. Sin profesional no carga nada.
export function useProfessionalAvailability(
  professionalId: string,
  fromDate: string,
  toDate: string,
): UseProfessionalAvailabilityResult {
  const [loaded, setLoaded] = useState<LoadedAvailability | null>(null);
  const key = `${professionalId}|${fromDate}|${toDate}`;

  useEffect(() => {
    if (!professionalId) return;

    let isCancelled = false;
    Promise.all([
      getProfessionalWeeklySchedule(professionalId),
      getProfessionalExceptionsBetween(professionalId, fromDate, toDate),
    ])
      .then(([weekly, exceptions]) => {
        if (!isCancelled) setLoaded({ key, weekly, exceptions, error: null });
      })
      .catch(() => {
        if (!isCancelled) {
          setLoaded({ key, weekly: [], exceptions: [], error: 'No se pudo cargar el horario del profesional.' });
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [key, professionalId, fromDate, toDate]);

  // Un resultado de otra semana u otro profesional no se pinta.
  const current = professionalId && loaded?.key === key ? loaded : null;

  const blocksFor = useCallback(
    (isoDate: string) => (current ? availabilityForDay(isoDate, current.weekly, current.exceptions) : []),
    [current],
  );

  return { blocksFor, error: current?.error ?? null };
}
