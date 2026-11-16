import type { AppointmentStatus } from '../types/Appointment';

// El paciente solo puede reprogramar o cancelar citas pendientes o
// confirmadas que todavía no empiezan (hora de Lima). El servidor vuelve a
// comprobarlo: esto solo decide qué botones se muestran.
export function canPatientModify(
  appointment: { status: AppointmentStatus; date: string; startTime: string },
  nowLima: { date: string; time: string },
): boolean {
  if (appointment.status !== 'pending' && appointment.status !== 'confirmed') return false;
  if (appointment.date !== nowLima.date) return appointment.date > nowLima.date;
  return appointment.startTime.slice(0, 5) > nowLima.time;
}
