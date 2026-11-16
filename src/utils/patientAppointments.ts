import type { AppointmentStatus } from '../types/Appointment';

// El paciente solo puede reprogramar o cancelar citas pendientes o
// confirmadas de hoy en adelante (hora de Lima). El servidor vuelve a
// comprobarlo: esto solo decide qué botones se muestran.
export function canPatientModify(appointment: { status: AppointmentStatus; date: string }, todayIso: string): boolean {
  return (appointment.status === 'pending' || appointment.status === 'confirmed') && appointment.date >= todayIso;
}
