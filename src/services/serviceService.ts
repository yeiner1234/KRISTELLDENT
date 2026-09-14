import type { Service } from '../types/Service';
import { services } from '../data/mockData';

export async function getServices(): Promise<Service[]> {
  return Promise.resolve(services);
}

export async function getServicesBySpecialty(specialtyId: string): Promise<Service[]> {
  return Promise.resolve(services.filter((service) => service.specialtyId === specialtyId));
}
