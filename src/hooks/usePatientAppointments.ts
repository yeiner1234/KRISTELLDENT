import { useCallback, useEffect, useState } from 'react';
import type { PatientAppointment } from '../types/Appointment';
import { getPatientAppointments } from '../services/appointmentService';

interface LoadedState {
  key: string;
  patientName: string;
  appointments: PatientAppointment[];
  error: string | null;
}

export function usePatientAppointments(dni: string | undefined, code: string | undefined) {
  const [loaded, setLoaded] = useState<LoadedState | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const hasIdentity = Boolean(dni && code);
  // Si lo guardado es de otra clave, todavía se está cargando la nueva.
  const requestKey = `${dni}|${code}|${reloadKey}`;

  useEffect(() => {
    if (!dni || !code) return;

    let isCancelled = false;
    getPatientAppointments(dni, code)
      .then((data) => {
        if (!isCancelled) setLoaded({ key: requestKey, ...data, error: null });
      })
      .catch((err: unknown) => {
        if (!isCancelled) {
          const message = err instanceof Error ? err.message : 'No se pudieron consultar tus citas.';
          setLoaded({ key: requestKey, patientName: '', appointments: [], error: message });
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [dni, code, requestKey]);

  const refetch = useCallback(() => setReloadKey((key) => key + 1), []);
  // Al recargar se conservan las citas ya mostradas mientras llega la respuesta.
  const isLoading = hasIdentity && loaded?.key !== requestKey;

  return {
    patientName: loaded?.patientName ?? '',
    appointments: loaded?.appointments ?? [],
    error: isLoading ? null : (loaded?.error ?? null),
    isLoading,
    refetch,
  };
}
