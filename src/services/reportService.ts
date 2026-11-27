import { supabase } from '../lib/supabase';
import type { AppointmentStatus } from '../types/Appointment';

// Lecturas de los reportes del Sprint 4 que la RLS de appointments no permite
// directamente (RPC SECURITY DEFINER, migración 20261126100000_sprint4_reportes).

export interface AttendanceTotals {
  completed: number;
  cancelled: number;
}

interface AttendanceRpcRow {
  completed: number | string;
  cancelled: number | string;
}

// Atendidas y canceladas de la sede (o de todas las de la profesional) en el
// periodo: referencia para su tasa de atención. No trae datos de pacientes.
export async function getBranchAttendance(filters: { from: string; to: string; branchId: string }): Promise<AttendanceTotals> {
  const { data, error } = await supabase.rpc('branch_attendance_summary', {
    p_from: filters.from,
    p_to: filters.to,
    p_branch_id: filters.branchId || null,
  });

  if (error) {
    throw new Error('No se pudo cargar el promedio de la sede.');
  }

  const row = ((data ?? []) as AttendanceRpcRow[])[0];
  // bigint llega como texto desde PostgREST.
  return { completed: Number(row?.completed ?? 0), cancelled: Number(row?.cancelled ?? 0) };
}

// Fecha de la primera cita atendida en la clínica (con cualquier profesional)
// de cada paciente de la profesional con sesión.
export async function getMyPatientsFirstVisit(): Promise<Map<string, string>> {
  const { data, error } = await supabase.rpc('my_patients_first_visit');

  if (error) {
    throw new Error('No se pudo cargar el historial de tus pacientes.');
  }

  return new Map(
    ((data ?? []) as { patient_id: string; first_completed_on: string }[]).map((row) => [row.patient_id, row.first_completed_on]),
  );
}

export interface PatientHistoryEntry {
  id: string;
  date: string;
  startTime: string;
  status: AppointmentStatus;
  reason: string;
  serviceId: string | null;
  serviceName: string | null;
  serviceSessions: number;
  professionalId: string;
  professionalName: string | null;
  branchId: string;
  branchName: string;
}

interface PatientHistoryRpcRow {
  id: string;
  appointment_date: string;
  start_time: string;
  status: AppointmentStatus;
  reason: string | null;
  service_id: string | null;
  service_name: string | null;
  service_sessions: number | null;
  professional_id: string;
  professional_name: string | null;
  branch_id: string;
  branch_name: string;
}

// Citas del paciente que quien llama puede ver en su historia (la base decide).
export async function getPatientHistory(patientId: string): Promise<PatientHistoryEntry[]> {
  const { data, error } = await supabase.rpc('patient_history', { p_patient_id: patientId });

  if (error) {
    throw new Error('No se pudo cargar la historia del paciente.');
  }

  return ((data ?? []) as PatientHistoryRpcRow[]).map((row) => ({
    id: row.id,
    date: row.appointment_date,
    startTime: row.start_time.slice(0, 5),
    status: row.status,
    reason: row.reason ?? '',
    serviceId: row.service_id,
    serviceName: row.service_name,
    serviceSessions: row.service_sessions ?? 1,
    professionalId: row.professional_id,
    professionalName: row.professional_name,
    branchId: row.branch_id,
    branchName: row.branch_name,
  }));
}

export interface ClinicBenchmarks {
  completed: number;
  cancelled: number;
  unclosed: number;
  completedMinutes: number;
  doctors: number;
  patientsAttended: number;
  patientsRecurrent: number;
}

interface ClinicBenchmarksRpcRow {
  completed: number | string;
  cancelled: number | string;
  unclosed: number | string;
  completed_minutes: number | string;
  doctors: number | string;
  patients_attended: number | string;
  patients_recurrent: number | string;
}

// Totales de toda la clínica en el periodo: la referencia "promedio clínica"
// de los reportes de la admin de sede (solo agregados, sin pacientes).
export async function getClinicBenchmarks(period: { from: string; to: string }): Promise<ClinicBenchmarks> {
  const { data, error } = await supabase.rpc('clinic_benchmarks', { p_from: period.from, p_to: period.to });

  if (error) {
    throw new Error('No se pudo cargar el promedio de la clínica.');
  }

  const row = ((data ?? []) as ClinicBenchmarksRpcRow[])[0];
  return {
    completed: Number(row?.completed ?? 0),
    cancelled: Number(row?.cancelled ?? 0),
    unclosed: Number(row?.unclosed ?? 0),
    completedMinutes: Number(row?.completed_minutes ?? 0),
    doctors: Number(row?.doctors ?? 0),
    patientsAttended: Number(row?.patients_attended ?? 0),
    patientsRecurrent: Number(row?.patients_recurrent ?? 0),
  };
}

// Primera cita atendida en la clínica de cada paciente que quien llama puede
// ver (nuevo / recurrente en los reportes de administración).
export async function getPatientsFirstVisit(): Promise<Map<string, string>> {
  const { data, error } = await supabase.rpc('patients_first_visit');

  if (error) {
    throw new Error('No se pudo cargar el historial de los pacientes.');
  }

  return new Map(
    ((data ?? []) as { patient_id: string; first_completed_on: string }[]).map((row) => [row.patient_id, row.first_completed_on]),
  );
}
