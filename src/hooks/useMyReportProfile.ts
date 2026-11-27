import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { useProfessionals, useSpecialties } from './useProfessionals';

// Especialidad de la profesional con sesión, para el rol del encabezado de sus
// reportes ("Especialista · Endodoncia"). null si no tiene o no se conoce.
export function useMyReportProfile(): { specialtyName: string | null } {
  const { user } = useAuth();
  const { professionals } = useProfessionals();
  const { specialties } = useSpecialties();

  return useMemo(() => {
    const me = professionals.find((professional) => professional.id === user?.id);
    const specialtyId = me?.specialtyIds[0];
    return { specialtyName: specialties.find((specialty) => specialty.id === specialtyId)?.name ?? null };
  }, [professionals, specialties, user?.id]);
}
