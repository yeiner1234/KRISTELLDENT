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
  serviceIds: string[];
}
