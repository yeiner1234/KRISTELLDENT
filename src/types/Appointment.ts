export type AppointmentStatus = 'pending' | 'confirmed' | 'in_room' | 'completed' | 'cancelled';

export interface Appointment {
  id: string;
  code: string;
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
