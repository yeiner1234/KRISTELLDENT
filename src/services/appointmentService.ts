import { supabase } from '../lib/supabase';
import type { Appointment, AppointmentStatus, PatientAppointment } from '../types/Appointment';
import type { TimeSlotOption } from '../types/Schedule';

export interface AvailableSlotsQuery {
  professionalId: string;
  branchId: string;
  serviceId: string | null;
  date: string;
  // Al reprogramar: la cita que se mueve no debe chocar consigo misma.
  excludeAppointmentId?: string | null;
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
    p_exclude_appointment_id: query.excludeAppointmentId ?? null,
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
  // Sin endTime: el servidor lo calcula con la duración del servicio.
  reason: string;
}

export interface CreatePublicAppointmentResult {
  id: string;
  // Código KD-XXXXXX: con el DNI permite reprogramar o cancelar.
  code: string;
  patientId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  // true solo si el servidor confirmó el envío del correo con el código.
  emailSent: boolean;
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

interface PatientAppointmentsResponse {
  patient: { firstName: string; lastName: string };
  appointments: PatientAppointment[];
}

export interface PatientAppointmentsResult {
  patientName: string;
  appointments: PatientAppointment[];
}

// Vía pública para que un paciente (sin cuenta) gestione SUS citas: pasa por
// la Edge Function patient-appointments, que exige DNI + código de una de sus
// citas. anon no tiene permiso de lectura ni escritura directa sobre
// patients/appointments.
async function invokePatientAppointments<T>(body: Record<string, string>, fallback: string): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>('patient-appointments', { body });

  if (error || !data) {
    const message = error ? await extractFunctionErrorMessage(error) : null;
    throw new Error(message ?? fallback);
  }

  return data;
}

export async function getPatientAppointments(dni: string, code: string): Promise<PatientAppointmentsResult> {
  const data = await invokePatientAppointments<PatientAppointmentsResponse>(
    { action: 'list', dni, code },
    'No se pudieron consultar tus citas.',
  );
  return {
    patientName: `${data.patient.firstName} ${data.patient.lastName}`.trim(),
    appointments: data.appointments,
  };
}

export async function cancelPatientAppointment(dni: string, code: string, appointmentId: string): Promise<void> {
  await invokePatientAppointments({ action: 'cancel', dni, code, appointmentId }, 'No se pudo cancelar la cita.');
}

export async function reschedulePatientAppointment(
  dni: string,
  code: string,
  appointmentId: string,
  slot: { date: string; startTime: string },
): Promise<void> {
  await invokePatientAppointments(
    { action: 'reschedule', dni, code, appointmentId, date: slot.date, startTime: slot.startTime },
    'No se pudo reprogramar la cita.',
  );
}

// La respuesta es la misma exista o no el DNI: nunca revela si hay citas.
export async function requestAppointmentCodes(dni: string): Promise<string> {
  const data = await invokePatientAppointments<{ message: string }>(
    { action: 'resend-code', dni },
    'No se pudo enviar el código. Inténtalo de nuevo.',
  );
  return data.message;
}

interface AppointmentRow {
  id: string;
  appointment_code: string;
  patient_id: string;
  professional_id: string;
  branch_id: string;
  service_id: string | null;
  service_name: string | null;
  service_price: number | string | null;
  service_duration_minutes: number | null;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  reason: string | null;
  created_at?: string | null;
}

function mapRow(row: AppointmentRow): Appointment {
  return {
    id: row.id,
    code: row.appointment_code,
    patientId: row.patient_id,
    professionalId: row.professional_id,
    branchId: row.branch_id,
    serviceId: row.service_id,
    date: row.appointment_date,
    startTime: row.start_time.slice(0, 5),
    endTime: row.end_time.slice(0, 5),
    status: row.status,
    reason: row.reason ?? '',
    serviceName: row.service_name,
    // numeric llega como texto desde PostgREST.
    servicePrice: row.service_price === null ? null : Number(row.service_price),
    serviceDuration: row.service_duration_minutes,
    createdAt: row.created_at ?? null,
  };
}

export async function getAllAppointments(): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select(
      'id, appointment_code, patient_id, professional_id, branch_id, service_id, service_name, service_price, service_duration_minutes, appointment_date, start_time, end_time, status, reason, created_at',
    )
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
}

// La RPC reschedule_appointment (SECURITY INVOKER: aplica la RLS de quien
// llama) comprueba con get_available_slots que la hora esté dentro del
// horario libre del profesional y calcula end_time con la duración del
// servicio. La restricción de exclusión sigue siendo la última protección
// contra choques.
export async function rescheduleAppointment(id: string, input: RescheduleAppointmentInput): Promise<void> {
  const { error } = await supabase.rpc('reschedule_appointment', {
    p_appointment_id: id,
    p_date: input.date,
    p_start_time: input.startTime,
  });

  if (error) {
    if (error.code === '23P01') {
      // Dos restricciones de exclusión: la del profesional y la del paciente.
      if (error.message.includes('appointments_no_patient_overlap')) {
        throw new Error('El paciente ya tiene otra cita que se cruza con ese horario.');
      }
      throw new Error('Ese horario ya no está disponible. Elige otro.');
    }
    throw new Error(error.message);
  }
}
