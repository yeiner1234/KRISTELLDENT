import { supabase } from '../lib/supabase';
import { friendlyWriteError } from '../utils/supabaseErrors';
import type { AdminProfessional, Professional } from '../types/Professional';
import type { AppRole } from '../types/User';

interface ProfileNameRow {
  full_name: string;
  role: AppRole;
}

interface ServiceAssignmentRow {
  service_id: string;
  branch_id: string | null;
  active: boolean;
}

interface ProfessionalRow {
  id: string;
  bio: string | null;
  active: boolean;
  profiles?: ProfileNameRow | ProfileNameRow[] | null;
  professional_specialties: { specialty_id: string }[];
  professional_branches: { branch_id: string }[];
  professional_services: ServiceAssignmentRow[];
  professional_schedules?: { branch_id: string }[];
}

const SELECT_COLUMNS = `
  id, bio, active,
  profiles ( full_name, role ),
  professional_specialties ( specialty_id ),
  professional_branches ( branch_id ),
  professional_services ( service_id, branch_id, active ),
  professional_schedules ( branch_id )
`;

// Lectura pública: anon no puede leer profiles, los nombres llegan por
// get_public_professionals().
const PUBLIC_SELECT_COLUMNS = `
  id, bio, active,
  professional_specialties ( specialty_id ),
  professional_branches ( branch_id ),
  professional_services ( service_id, branch_id, active )
`;

interface PublicProfessionalNameRow {
  id: string;
  full_name: string;
}

function extractProfile(profiles: ProfessionalRow['profiles']): ProfileNameRow | null {
  if (!profiles) return null;
  return Array.isArray(profiles) ? (profiles[0] ?? null) : profiles;
}

function mapRow(row: ProfessionalRow): Professional {
  return {
    id: row.id,
    fullName: extractProfile(row.profiles)?.full_name ?? '',
    role: extractProfile(row.profiles)?.role ?? null,
    bio: row.bio,
    active: row.active,
    specialtyIds: row.professional_specialties.map((item) => item.specialty_id),
    branchIds: row.professional_branches.map((item) => item.branch_id),
    serviceIds: row.professional_services.filter((item) => item.active).map((item) => item.service_id),
  };
}

function mapAdminRow(row: ProfessionalRow): AdminProfessional {
  return {
    ...mapRow(row),
    assignments: row.professional_services
      .filter((item) => item.active)
      .map((item) => ({ serviceId: item.service_id, branchId: item.branch_id })),
    scheduleBranchIds: [...new Set((row.professional_schedules ?? []).map((item) => item.branch_id))],
  };
}

export async function getProfessionals(): Promise<Professional[]> {
  const [{ data, error }, { data: names, error: namesError }] = await Promise.all([
    supabase.from('professionals').select(PUBLIC_SELECT_COLUMNS).eq('active', true),
    supabase.rpc('get_public_professionals'),
  ]);

  if (error) {
    throw new Error(error.message);
  }
  if (namesError) {
    throw new Error(namesError.message);
  }

  const nameById = new Map(((names ?? []) as PublicProfessionalNameRow[]).map((row) => [row.id, row.full_name]));

  // Sin nombre público = perfil inactivo: no se ofrece en la reserva.
  return ((data ?? []) as unknown as ProfessionalRow[])
    .filter((row) => nameById.has(row.id))
    .map((row) => ({ ...mapRow(row), fullName: nameById.get(row.id) ?? '' }));
}

// Un admin_sede solo lee el perfil del personal que comparte sede con él; si
// el nombre llega vacío se toma de get_public_professionals (solo
// profesionales activos).
export async function getAllProfessionalsForAdmin(): Promise<AdminProfessional[]> {
  const [{ data, error }, { data: names, error: namesError }] = await Promise.all([
    supabase.from('professionals').select(SELECT_COLUMNS),
    supabase.rpc('get_public_professionals'),
  ]);

  if (error) {
    throw new Error(error.message);
  }
  if (namesError) {
    throw new Error(namesError.message);
  }

  const nameById = new Map(((names ?? []) as PublicProfessionalNameRow[]).map((row) => [row.id, row.full_name]));

  return ((data ?? []) as unknown as ProfessionalRow[]).map((row) => {
    const professional = mapAdminRow(row);
    return professional.fullName ? professional : { ...professional, fullName: nameById.get(row.id) ?? '' };
  });
}

// Roles clínicos que atienden citas y por eso llevan ficha en professionals.
export const PROFESSIONAL_ROLES: AppRole[] = ['especialista', 'odontologa_general'];

export interface EligibleProfile {
  id: string;
  fullName: string;
  email: string;
  role: AppRole;
}

// Cuentas con rol clínico (especialista u odontóloga general) que todavía no
// tienen ficha profesional.
export async function getEligibleProfilesForProfessional(): Promise<EligibleProfile[]> {
  const [{ data: profiles, error: profilesError }, { data: existing, error: existingError }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, email, role').in('role', PROFESSIONAL_ROLES).eq('active', true),
    supabase.from('professionals').select('id'),
  ]);

  if (profilesError) {
    throw new Error(profilesError.message);
  }
  if (existingError) {
    throw new Error(existingError.message);
  }

  const takenIds = new Set((existing ?? []).map((row) => row.id));

  return (profiles ?? [])
    .filter((profile) => !takenIds.has(profile.id))
    .map((profile) => ({ id: profile.id, fullName: profile.full_name, email: profile.email, role: profile.role }));
}

function throwIfError(error: { message: string } | null): void {
  if (error) {
    throw new Error(friendlyWriteError(error.message));
  }
}

const difference = (list: string[], other: string[]) => list.filter((id) => !other.includes(id));

export interface CreateProfessionalInput {
  profileId: string;
  bio: string | null;
  specialtyIds: string[];
  branchIds: string[];
}

// Ficha para una cuenta que aún no la tiene. Los servicios se eligen después,
// en la pestaña de cada sede.
export async function createProfessional(input: CreateProfessionalInput): Promise<void> {
  if (input.branchIds.length === 0) {
    throw new Error('Elige al menos una sede.');
  }
  if (input.specialtyIds.length === 0) {
    throw new Error('Elige una especialidad.');
  }

  throwIfError((await supabase.from('professionals').insert({ id: input.profileId, bio: input.bio })).error);
  throwIfError(
    (
      await supabase
        .from('professional_specialties')
        .insert(input.specialtyIds.map((specialtyId) => ({ professional_id: input.profileId, specialty_id: specialtyId })))
    ).error,
  );
  throwIfError(
    (
      await supabase
        .from('professional_branches')
        .insert(input.branchIds.map((branchId) => ({ professional_id: input.profileId, branch_id: branchId })))
    ).error,
  );
}

export interface ProfessionalProfileInput {
  bio: string | null;
  specialtyIds: string[];
}

// Datos generales: valen para todas sus sedes. Las bajas van antes que las
// altas: un especialista cambia de especialidad sin chocar con
// enforce_specialist_single_specialty. Quitar una especialidad que usa en
// alguna sede lo rechaza la base (prevent_specialty_removal_in_use).
export async function updateProfessionalProfile(
  id: string,
  input: ProfessionalProfileInput,
  currentSpecialtyIds: string[],
): Promise<void> {
  if (input.specialtyIds.length === 0) {
    throw new Error('Elige una especialidad.');
  }

  throwIfError((await supabase.from('professionals').update({ bio: input.bio }).eq('id', id)).error);

  const toRemove = difference(currentSpecialtyIds, input.specialtyIds);
  const toAdd = difference(input.specialtyIds, currentSpecialtyIds);

  if (toRemove.length > 0) {
    throwIfError(
      (await supabase.from('professional_specialties').delete().eq('professional_id', id).in('specialty_id', toRemove))
        .error,
    );
  }
  if (toAdd.length > 0) {
    throwIfError(
      (
        await supabase
          .from('professional_specialties')
          .insert(toAdd.map((specialtyId) => ({ professional_id: id, specialty_id: specialtyId })))
      ).error,
    );
  }
}

// La sincronización con Equipo (user_branch_access) la hace un trigger.
export async function addProfessionalToBranch(professionalId: string, branchId: string): Promise<void> {
  throwIfError(
    (await supabase.from('professional_branches').insert({ professional_id: professionalId, branch_id: branchId })).error,
  );
}

// La base rechaza si tiene citas pendientes ahí; si no, se van también su
// horario, sus excepciones y sus servicios de esa sede.
export async function removeProfessionalFromBranch(professionalId: string, branchId: string): Promise<void> {
  throwIfError(
    (
      await supabase
        .from('professional_branches')
        .delete()
        .eq('professional_id', professionalId)
        .eq('branch_id', branchId)
    ).error,
  );
}

// Servicios que atiende en una sede: cada servicio es de una sola sede, así
// que la diferencia entre lo elegido y lo actual de esa sede no toca otras.
export async function setProfessionalBranchServices(
  professionalId: string,
  wantedServiceIds: string[],
  currentServiceIds: string[],
): Promise<void> {
  const toRemove = difference(currentServiceIds, wantedServiceIds);
  const toAdd = difference(wantedServiceIds, currentServiceIds);

  if (toRemove.length > 0) {
    throwIfError(
      (await supabase.from('professional_services').delete().eq('professional_id', professionalId).in('service_id', toRemove))
        .error,
    );
  }
  if (toAdd.length > 0) {
    throwIfError(
      (
        await supabase
          .from('professional_services')
          .insert(toAdd.map((serviceId) => ({ professional_id: professionalId, service_id: serviceId })))
      ).error,
    );
  }
}

export async function setProfessionalActive(id: string, active: boolean): Promise<void> {
  const { error } = await supabase.from('professionals').update({ active }).eq('id', id);

  if (error) {
    throw new Error(friendlyWriteError(error.message));
  }
}
