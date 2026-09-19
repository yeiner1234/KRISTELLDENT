export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface Appointment {
  id: string;
  patientId: string;
  professionalId: string;
  branchId: string;
  serviceId: string | null;
  date: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  reason: string;
}
