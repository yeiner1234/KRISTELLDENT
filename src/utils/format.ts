import type { AppointmentStatus } from '../types/Appointment';

export function formatFullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

export function getInitials(fullName: string): string {
  const [first, second] = fullName.trim().split(/\s+/);
  return `${first?.[0] ?? ''}${second?.[0] ?? ''}`.toUpperCase();
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

export function formatAppointmentCode(date: string, id: string): string {
  const compact = date.replace(/-/g, '').slice(2);
  const suffix = id.replace(/\D/g, '').slice(-2).padStart(2, '0');
  return `KD-${compact}${suffix}`;
}
