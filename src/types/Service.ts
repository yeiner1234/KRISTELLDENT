export interface Service {
  id: string;
  name: string;
  specialtyId: string;
  // Sede dueña del servicio. null: servicio viejo "sin sede" (migración).
  branchId: string | null;
  duration: number;
  price: number;
  active: boolean;
  // Sesiones que requiere (más de una = tratamiento). Ausente en datos viejos.
  sessions?: number;
}
