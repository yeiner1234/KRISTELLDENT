import { supabase } from '../lib/supabase';
import type { Patient } from '../types/Patient';

interface PatientRow {
  id: string;
  dni: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
}

function mapRow(row: PatientRow): Patient {
  return {
    id: row.id,
    dni: row.dni,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    email: row.email,
  };
}

export async function getAllPatients(): Promise<Patient[]> {
  const { data, error } = await supabase
    .from('patients')
    .select('id, dni, first_name, last_name, phone, email')
    .order('last_name', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapRow);
}

export async function requestVerificationCode(dni: string, email: string): Promise<void> {
  void dni;
  void email;
  return Promise.resolve();
}

export async function verifyCode(dni: string, code: string): Promise<boolean> {
  void dni;
  void code;
  return Promise.resolve(true);
}
