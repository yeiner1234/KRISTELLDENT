export interface Professional {
  id: string;
  fullName: string;
  bio: string | null;
  active: boolean;
  specialtyIds: string[];
  branchIds: string[];
  serviceIds: string[];
}
