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

// Cita tal como la ve el paciente en /mis-citas (Edge Function patient-appointments).
export interface PatientAppointment {
  id: string;
  code: string;
  date: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  branchId: string;
  branchName: string | null;
  professionalId: string;
  professionalName: string | null;
  serviceId: string | null;
  serviceName: string | null;
  serviceDuration: number | null;
}
