import type { Professional } from '../types/Professional';
import { professionals } from '../data/mockData';

export async function getProfessionals(): Promise<Professional[]> {
  return Promise.resolve(professionals);
}

export async function getProfessionalsBySpecialty(specialtyId: string): Promise<Professional[]> {
  return Promise.resolve(professionals.filter((professional) => professional.specialtyId === specialtyId));
}
