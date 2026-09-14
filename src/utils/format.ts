import type { AppointmentStatus } from '../types/Appointment';

export function formatFullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount);
}

const statusLabels: Record<AppointmentStatus, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
};

export function formatAppointmentStatus(status: AppointmentStatus): string {
  return statusLabels[status];
}
