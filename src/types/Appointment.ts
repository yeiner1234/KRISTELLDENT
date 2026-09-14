export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface Appointment {
  id: string;
  patientId: string;
  professionalId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  reason: string;
}
