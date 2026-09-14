import type { Specialty } from '../types/Specialty';
import { specialties } from '../data/mockData';

export async function getSpecialties(): Promise<Specialty[]> {
  return Promise.resolve(specialties);
}

export async function getSpecialtyById(id: string): Promise<Specialty | null> {
  return Promise.resolve(specialties.find((specialty) => specialty.id === id) ?? null);
}
