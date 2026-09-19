import { supabase } from '../lib/supabase';
import type { Appointment, AppointmentStatus } from '../types/Appointment';
import type { TimeSlotOption } from '../types/Schedule';

export interface AvailableSlotsQuery {
  professionalId: string;
  branchId: string;
  serviceId: string | null;
  date: string;
}

interface AvailableSlotRow {
  slot_start: string;
  slot_end: string;
}

// Motor de disponibilidad real: cruza branch_schedules + professional_schedules
// + schedule_exceptions + citas no canceladas (función SECURITY DEFINER, ver
// migración de la FASE 10). Nunca expone filas crudas de esas tablas, solo horas.
export async function getAvailableSlots(query: AvailableSlotsQuery): Promise<TimeSlotOption[]> {
  const { data, error } = await supabase.rpc('get_available_slots', {
    p_professional_id: query.professionalId,
    p_branch_id: query.branchId,
    p_service_id: query.serviceId,
    p_date: query.date,
  });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as AvailableSlotRow[]).map((row) => ({
    time: row.slot_start.slice(0, 5),
    available: true,
  }));
}

export interface CreatePublicAppointmentInput {
  dni: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  professionalId: string;
  branchId: string;
  serviceId: string | null;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
}

export interface CreatePublicAppointmentResult {
  id: string;
  patientId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
}

async function extractFunctionErrorMessage(error: unknown): Promise<string | null> {
  if (error && typeof error === 'object' && 'context' in error) {
    try {
      const context = (error as { context: Response }).context;
      const body = await context.json();
      if (typeof body?.error === 'string') {
        return body.error;
      }
    } catch {
      return null;
    }
  }
  return null;
}

// Única vía real para que un paciente (sin cuenta) cree una cita — corre en
// el servidor (Edge Function) porque patients/appointments no aceptan
// escritura anónima directa. La protección real contra choques de horario
// es la restricción de exclusión de la base de datos, no esta función.
export async function createPublicAppointment(
  input: CreatePublicAppointmentInput,
): Promise<CreatePublicAppointmentResult> {
  const { data, error } = await supabase.functions.invoke('create-public-appointment', {
    body: input,
  });

  if (error) {
    const message = await extractFunctionErrorMessage(error);
    throw new Error(message ?? 'No se pudo reservar la cita.');
  }

  return data;
}

interface LookupAppointmentRow {
  id: string;
  professionalId: string;
  branchId: string;
  serviceId: string | null;
  date: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  reason: string | null;
}

interface LookupResponse {
  patient: { id: string } | null;
  appointments: LookupAppointmentRow[];
}

// Vía pública para que un paciente (sin cuenta) consulte SUS citas por DNI —
// pasa por una Edge Function porque anon no tiene permiso de lectura directa
// sobre patients/appointments (evita que cualquiera consulte datos de otro
// paciente adivinando un DNI vía la API REST).
export async function getAppointmentsByPatientDni(dni: string): Promise<Appointment[]> {
  const { data, error } = await supabase.functions.invoke<LookupResponse>('lookup-appointments-by-dni', {
    body: { dni },
  });

  if (error) {
    const message = await extractFunctionErrorMessage(error);
    throw new Error(message ?? 'No se pudieron consultar las citas.');
  }

  if (!data?.patient) {
    return [];
  }

  const patientId = data.patient.id;

  return data.appointments.map((row) => ({
    id: row.id,
    patientId,
    professionalId: row.professionalId,
    branchId: row.branchId,
    serviceId: row.serviceId,
    date: row.date,
    startTime: row.startTime.slice(0, 5),
    endTime: row.endTime.slice(0, 5),
    status: row.status,
    reason: row.reason ?? '',
  }));
}

interface AppointmentRow {
  id: string;
  patient_id: string;
  professional_id: string;
  branch_id: string;
  service_id: string | null;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  reason: string | null;
}

function mapRow(row: AppointmentRow): Appointment {
  return {
    id: row.id,
    patientId: row.patient_id,
    professionalId: row.professional_id,
    branchId: row.branch_id,
    serviceId: row.service_id,
    date: row.appointment_date,
    startTime: row.start_time.slice(0, 5),
    endTime: row.end_time.slice(0, 5),
    status: row.status,
    reason: row.reason ?? '',
  };
}

export async function getAllAppointments(): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select('id, patient_id, professional_id, branch_id, service_id, appointment_date, start_time, end_time, status, reason')
    .order('appointment_date', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as AppointmentRow[]).map(mapRow);
}

export async function setAppointmentStatus(id: string, status: AppointmentStatus): Promise<void> {
  const { error } = await supabase.from('appointments').update({ status }).eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
}

export interface RescheduleAppointmentInput {
  date: string;
  startTime: string;
  endTime: string;
}

// La protección real contra choques sigue siendo la restricción de exclusión
// de la base de datos (aplica también a UPDATE, no solo a INSERT).
export async function rescheduleAppointment(id: string, input: RescheduleAppointmentInput): Promise<void> {
  const { error } = await supabase
    .from('appointments')
    .update({ appointment_date: input.date, start_time: input.startTime, end_time: input.endTime })
    .eq('id', id);

  if (error) {
    if (error.code === '23P01') {
      throw new Error('Ese horario ya no está disponible. Elige otro.');
    }
    throw new Error(error.message);
  }
}
