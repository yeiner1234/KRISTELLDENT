import { supabase } from '../lib/supabase';
import { getManageableBranchIds } from './adminBranchService';
import type { Professional } from '../types/Professional';
import type { AppRole } from '../types/User';

interface ProfileNameRow {
  full_name: string;
  role: AppRole;
}

interface ProfessionalRow {
  id: string;
  bio: string | null;
  active: boolean;
  profiles?: ProfileNameRow | ProfileNameRow[] | null;
  professional_specialties: { specialty_id: string }[];
  professional_branches: { branch_id: string }[];
  professional_services: { service_id: string }[];
}

const SELECT_COLUMNS = `
  id, bio, active,
  profiles ( full_name, role ),
  professional_specialties ( specialty_id ),
  professional_branches ( branch_id ),
  professional_services ( service_id )
`;

// Lectura pública: anon no puede leer profiles, los nombres llegan por
// get_public_professionals().
const PUBLIC_SELECT_COLUMNS = `
  id, bio, active,
  professional_specialties ( specialty_id ),
  professional_branches ( branch_id ),
  professional_services ( service_id )
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
    serviceIds: row.professional_services.map((item) => item.service_id),
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

export async function getProfessionalsBySpecialty(specialtyId: string): Promise<Professional[]> {
  const all = await getProfessionals();
  return all.filter((professional) => professional.specialtyIds.includes(specialtyId));
}

export async function getAllProfessionalsForAdmin(): Promise<Professional[]> {
  const { data, error } = await supabase.from('professionals').select(SELECT_COLUMNS);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as unknown as ProfessionalRow[]).map(mapRow);
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

export interface ProfessionalRelationsInput {
  specialtyIds: string[];
  branchIds: string[];
  serviceIds: string[];
}

const RELATIONS = [
  { table: 'professional_specialties', column: 'specialty_id', key: 'specialtyIds' },
  { table: 'professional_branches', column: 'branch_id', key: 'branchIds' },
  { table: 'professional_services', column: 'service_id', key: 'serviceIds' },
] as const;

function throwIfError(results: { error: { message: string } | null }[]): void {
  for (const result of results) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }
}

async function getCurrentRelationIds(professionalId: string, table: string, column: string): Promise<string[]> {
  const { data, error } = await supabase.from(table).select(column).eq('professional_id', professionalId);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as unknown as Record<string, string>[]).map((row) => row[column]);
}

// Guarda solo la diferencia: inserta lo nuevo y borra lo quitado. Un
// admin_sede no toca las sedes que no son suyas.
async function replaceRelations(professionalId: string, input: ProfessionalRelationsInput): Promise<void> {
  const [currentIds, manageableBranchIds] = await Promise.all([
    Promise.all(RELATIONS.map((relation) => getCurrentRelationIds(professionalId, relation.table, relation.column))),
    getManageableBranchIds(),
  ]);

  const changes = RELATIONS.map((relation, index) => {
    const current = currentIds[index];
    const wanted = input[relation.key];
    const canManage = (id: string) =>
      relation.table !== 'professional_branches' || manageableBranchIds === null || manageableBranchIds.includes(id);

    return {
      relation,
      toAdd: wanted.filter((id) => !current.includes(id) && canManage(id)),
      toRemove: current.filter((id) => !wanted.includes(id) && canManage(id)),
    };
  });

  const removeFrom = (table: string) => {
    const change = changes.find((item) => item.relation.table === table)!;
    return change.toRemove.length === 0
      ? Promise.resolve({ error: null })
      : supabase
          .from(table)
          .delete()
          .eq('professional_id', professionalId)
          .in(change.relation.column, change.toRemove);
  };
  const addTo = (table: string) => {
    const change = changes.find((item) => item.relation.table === table)!;
    return change.toAdd.length === 0
      ? Promise.resolve({ error: null })
      : supabase
          .from(table)
          .insert(change.toAdd.map((id) => ({ professional_id: professionalId, [change.relation.column]: id })));
  };

  // El orden importa por dos triggers:
  // - enforce_specialist_single_specialty cuenta las especialidades después de
  //   cada insert: las bajas van antes que las altas.
  // - enforce_service_matches_specialty pide que el servicio sea de una
  //   especialidad del profesional: los servicios salen antes que su
  //   especialidad y entran después de ella.
  throwIfError([await removeFrom('professional_services')]);
  throwIfError(await Promise.all([removeFrom('professional_specialties'), removeFrom('professional_branches')]));
  throwIfError(await Promise.all([addTo('professional_specialties'), addTo('professional_branches')]));
  throwIfError([await addTo('professional_services')]);
}

// Criterio 1 de la HU: todo profesional queda con al menos una sede y una
// especialidad (la odontóloga general la deriva de sus servicios). Se valida
// antes de escribir para no dejar una ficha a medias.
function validateRelations(input: ProfessionalRelationsInput): void {
  if (input.branchIds.length === 0) {
    throw new Error('Elige al menos una sede.');
  }
  if (input.specialtyIds.length === 0) {
    throw new Error('Elige una especialidad.');
  }
}

export interface CreateProfessionalInput extends ProfessionalRelationsInput {
  profileId: string;
  bio: string | null;
}

export async function createProfessional(input: CreateProfessionalInput): Promise<void> {
  validateRelations(input);

  const { error } = await supabase.from('professionals').insert({ id: input.profileId, bio: input.bio });

  if (error) {
    throw new Error(error.message);
  }

  await replaceRelations(input.profileId, input);
}

export interface UpdateProfessionalInput extends ProfessionalRelationsInput {
  bio: string | null;
}

export async function updateProfessional(id: string, input: UpdateProfessionalInput): Promise<void> {
  validateRelations(input);

  const { error } = await supabase.from('professionals').update({ bio: input.bio }).eq('id', id);

  if (error) {
    throw new Error(error.message);
  }

  await replaceRelations(id, input);
}

export async function setProfessionalActive(id: string, active: boolean): Promise<void> {
  const { error } = await supabase.from('professionals').update({ active }).eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
}
