import type { AppRole } from './User';

export interface Professional {
  id: string;
  fullName: string;
  // null en las lecturas públicas: anon no puede leer profiles.role.
  role: AppRole | null;
  bio: string | null;
  active: boolean;
  specialtyIds: string[];
  branchIds: string[];
  // Servicios que atiende (filas activas de professional_services).
  serviceIds: string[];
}

// Servicio que atiende y la sede de ese servicio.
export interface ProfessionalAssignment {
  serviceId: string;
  branchId: string | null;
}

// Lo que el panel admin necesita además para la ficha por sede.
export interface AdminProfessional extends Professional {
  // Cuenta de la persona (profiles.active, se cambia en Equipo). "active" es la
  // ficha (professionals.active). Sin cualquiera de las dos no sale en la reserva.
  accountActive: boolean;
  assignments: ProfessionalAssignment[];
  // Sedes donde tiene al menos un bloque de horario semanal.
  scheduleBranchIds: string[];
}
