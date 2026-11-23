import type { Service } from '../types/Service';
import type { Specialty } from '../types/Specialty';

export interface ServiceGroup {
  key: string;
  title: string;
  services: Service[];
}

const UNKNOWN_KEY = 'sin-especialidad';

// Un grupo por especialidad (por nombre, sin las vacías). Los servicios cuya
// especialidad no está en la lista van al final, en "Sin especialidad".
export function groupServicesBySpecialty(services: Service[], specialties: Specialty[]): ServiceGroup[] {
  const groups = [...specialties]
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
    .map((specialty) => ({
      key: specialty.id,
      title: specialty.name,
      services: services.filter((service) => service.specialtyId === specialty.id),
    }))
    .filter((group) => group.services.length > 0);

  const knownIds = new Set(specialties.map((specialty) => specialty.id));
  const orphans = services.filter((service) => !knownIds.has(service.specialtyId));
  if (orphans.length > 0) {
    groups.push({ key: UNKNOWN_KEY, title: 'Sin especialidad', services: orphans });
  }

  return groups;
}
