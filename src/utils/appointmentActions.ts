import type { AppointmentStatus } from '../types/Appointment';
import type { AppRole } from '../types/User';

export type AppointmentAction = 'confirm' | 'arrive' | 'complete' | 'reschedule' | 'cancel';

export type StatusAction = Exclude<AppointmentAction, 'reschedule'>;

export const ACTION_TARGET_STATUS: Record<StatusAction, AppointmentStatus> = {
  confirm: 'confirmed',
  arrive: 'in_room',
  complete: 'completed',
  cancel: 'cancelled',
};

export const ACTION_LABELS: Record<AppointmentAction, string> = {
  confirm: 'Confirmar',
  arrive: 'Marcar llegada',
  complete: 'Marcar como atendida',
  reschedule: 'Reprogramar',
  cancel: 'Cancelar',
};

// Mismas transiciones que el trigger guard_appointment_changes: pending →
// confirmed | in_room | cancelled, confirmed → in_room | cancelled, in_room →
// completed | cancelled. Solo se reprograma una cita pendiente o confirmada.
const ACTIONS_BY_STATUS: Record<AppointmentStatus, AppointmentAction[]> = {
  pending: ['confirm', 'arrive', 'reschedule', 'cancel'],
  confirmed: ['arrive', 'reschedule', 'cancel'],
  in_room: ['complete', 'cancel'],
  completed: [],
  cancelled: [],
};

const ACTIONS_BY_ROLE: Record<AppRole, AppointmentAction[]> = {
  admin_global: ['confirm', 'arrive', 'complete', 'reschedule', 'cancel'],
  admin_sede: ['confirm', 'arrive', 'complete', 'reschedule', 'cancel'],
  especialista: ['confirm', 'complete', 'cancel'],
  odontologa_general: ['confirm', 'complete', 'cancel'],
  tecnica: ['arrive'],
};

export function getAppointmentActions(status: AppointmentStatus, role: AppRole): AppointmentAction[] {
  const allowedForRole = ACTIONS_BY_ROLE[role];
  return ACTIONS_BY_STATUS[status].filter((action) => allowedForRole.includes(action));
}
