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
  // Copia del servicio al reservar o reprogramar (appointments.service_*): el
  // historial no cambia si después se edita el servicio. null en citas sin
  // servicio; ausente en datos que no la traen.
  serviceName?: string | null;
  servicePrice?: number | null;
  serviceDuration?: number | null;
  // Cuándo se registró (anticipación de reserva en los reportes).
  createdAt?: string | null;
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
