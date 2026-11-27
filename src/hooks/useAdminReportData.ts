import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { useAllAppointments } from './useAppointments';
import { useAllPatients } from './usePatients';
import { useAdminProfessionals } from './useAdminProfessionals';
import { useAdminSpecialties } from './useAdminSpecialties';
import { useBranches } from './useBranches';
import { useLoad } from './useLoad';
import { useManageableBranchIds } from './useManageableBranchIds';
import { getAllServicesForAdmin } from '../services/serviceService';
import { enrichAppointments, type ReportAppointment } from '../utils/reports/adminData';
import type { Branch } from '../types/Branch';
import type { Patient } from '../types/Patient';
import type { AdminProfessional } from '../types/Professional';
import type { Specialty } from '../types/Specialty';

export interface AdminReportData {
  // admin_global: todas las sedes; admin_sede: las suyas (la RLS ya lo limita).
  isGlobal: boolean;
  allowedBranches: Branch[];
  rows: ReportAppointment[];
  patients: Patient[];
  professionals: AdminProfessional[];
  specialties: Specialty[];
  isLoading: boolean;
  error: string | null;
}

// Datos de los reportes de administración: citas con su especialidad,
// duración, precio, doctora y sede.
export function useAdminReportData(): AdminReportData {
  const { user } = useAuth();
  const { appointments, isLoading: loadingAppointments, error: appointmentsError } = useAllAppointments();
  const { patients, isLoading: loadingPatients, error: patientsError } = useAllPatients();
  const { professionals, isLoading: loadingProfessionals, error: professionalsError } = useAdminProfessionals();
  const { specialties, isLoading: loadingSpecialties, error: specialtiesError } = useAdminSpecialties();
  const { branches, isLoading: loadingBranches, error: branchesError } = useBranches();
  const { branchIds, isLoading: loadingAccess, error: accessError } = useManageableBranchIds();
  const services = useLoad('servicios', getAllServicesForAdmin, [], 'No se pudieron cargar los servicios.');

  const isGlobal = user?.role === 'admin_global';
  const allowedBranches = useMemo(
    () => (isGlobal || branchIds === null ? branches : branches.filter((branch) => branchIds.includes(branch.id))),
    [branches, branchIds, isGlobal],
  );
  const rows = useMemo(
    () =>
      enrichAppointments(appointments, {
        services: services.data,
        specialties,
        professionals,
        branches,
      }),
    [appointments, services.data, specialties, professionals, branches],
  );

  return {
    isGlobal,
    allowedBranches,
    rows,
    patients,
    professionals,
    specialties,
    isLoading:
      loadingAppointments ||
      loadingPatients ||
      loadingProfessionals ||
      loadingSpecialties ||
      loadingBranches ||
      loadingAccess ||
      services.isLoading,
    error:
      appointmentsError ?? patientsError ?? professionalsError ?? specialtiesError ?? branchesError ?? accessError ?? services.error,
  };
}
