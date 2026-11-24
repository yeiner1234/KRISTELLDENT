import type { AppRole } from './User';

// Profesional asignada a un servicio de la sede (get_branch_offer_status).
export interface OfferProfessional {
  id: string;
  fullName: string;
  // Cuenta y ficha activas a la vez.
  active: boolean;
  // Cuenta (profiles.active, Equipo) y ficha (professionals.active, Profesionales).
  accountActive: boolean;
  recordActive: boolean;
  hasSchedule: boolean;
  bookable: boolean;
}

// Un servicio de la sede con su estado en la reserva.
export interface ServiceOfferStatus {
  serviceId: string;
  name: string;
  specialtyId: string;
  specialtyName: string;
  specialtyActive: boolean;
  price: number;
  duration: number;
  active: boolean;
  professionals: OfferProfessional[];
  bookable: boolean;
  // Por qué un servicio activo no se ve en la reserva; null si se ve o está inactivo.
  reason: string | null;
}

// Una celda de "Oferta por sede": una sede y una especialidad.
export interface OfferOverviewCell {
  branchId: string;
  branchName: string;
  branchActive: boolean;
  specialtyId: string;
  specialtyName: string;
  specialtyActive: boolean;
  servicesCount: number;
  activeCount: number;
  bookableCount: number;
  minPrice: number | null;
  maxPrice: number | null;
}

// Especialidad de la lista compartida, como la ve el panel.
export interface AdminSpecialty {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  createdByName: string | null;
  // Sedes con al menos un servicio reservable de esta especialidad.
  branchNames: string[];
}

// Resultado del directorio (sin correo, teléfono ni citas).
export interface DirectoryProfessional {
  id: string;
  fullName: string;
  role: AppRole;
  specialtyNames: string[];
  branchIds: string[];
  branchNames: string[];
}

// Servicio reservable de una sede (reserva pública).
export interface BookableService {
  id: string;
  name: string;
  specialtyId: string;
  specialtyName: string;
  price: number;
  duration: number;
}

export interface BookableProfessional {
  id: string;
  fullName: string;
}

export interface BranchSpecialty {
  id: string;
  name: string;
  description: string | null;
}
