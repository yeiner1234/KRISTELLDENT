import type { Appointment } from '../types/Appointment';

// Selector "Sede" del panel profesional. '' = "Todas mis sedes".

// Por defecto, la sede donde tiene horario hoy; si son varias o ninguna, todas.
export function defaultPanelBranch(branchIds: string[], todayBranchIds: string[]): string {
  const today = [...new Set(todayBranchIds)].filter((id) => branchIds.includes(id));
  return today.length === 1 ? today[0] : '';
}

export function filterByPanelBranch(appointments: Appointment[], branchId: string): Appointment[] {
  return branchId ? appointments.filter((appointment) => appointment.branchId === branchId) : appointments;
}

// Día de la semana de una fecha AAAA-MM-DD (0 = domingo, como day_of_week).
// Se calcula en UTC para que la zona horaria del navegador no corra el día.
export function dayOfWeekOf(isoDate: string): number {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}
