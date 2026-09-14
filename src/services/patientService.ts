import type { Patient } from '../types/Patient';
import { patients } from '../data/mockData';

export async function findPatientByDni(dni: string): Promise<Patient | null> {
  const patient = patients.find((item) => item.dni === dni);
  return Promise.resolve(patient ?? null);
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
