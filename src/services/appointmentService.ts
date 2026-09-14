import type { Appointment } from '../types/Appointment';
import type { TimeSlotOption } from '../types/Schedule';
import { appointments, timeSlots } from '../data/mockData';

export async function getAvailableSlots(professionalId: string, date: string): Promise<TimeSlotOption[]> {
  void professionalId;
  void date;
  return Promise.resolve(timeSlots);
}

export interface CreateAppointmentInput {
  patientId: string;
  professionalId: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
}

export async function createAppointment(input: CreateAppointmentInput): Promise<Appointment> {
  const appointment: Appointment = {
    id: `apt-${Date.now()}`,
    status: 'pending',
    ...input,
  };
  appointments.push(appointment);
  return Promise.resolve(appointment);
}

export async function getAppointmentsByPatientDni(dni: string): Promise<Appointment[]> {
  return Promise.resolve(appointments.filter((appointment) => appointment.patientId === dni));
}
