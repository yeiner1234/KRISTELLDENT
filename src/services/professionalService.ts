import { supabase } from '../lib/supabase';
import type { Professional } from '../types/Professional';

interface ProfileNameRow {
  full_name: string;
}

interface ProfessionalRow {
  id: string;
  bio: string | null;
  active: boolean;
  profiles: ProfileNameRow | ProfileNameRow[] | null;
  professional_specialties: { specialty_id: string }[];
  professional_branches: { branch_id: string }[];
  professional_services: { service_id: string }[];
}

const SELECT_COLUMNS = `
  id, bio, active,
  profiles ( full_name ),
  professional_specialties ( specialty_id ),
  professional_branches ( branch_id ),
  professional_services ( service_id )
`;

function extractFullName(profiles: ProfessionalRow['profiles']): string {
  if (!profiles) return '';
  return Array.isArray(profiles) ? (profiles[0]?.full_name ?? '') : profiles.full_name;
}

function mapRow(row: ProfessionalRow): Professional {
  return {
    id: row.id,
    fullName: extractFullName(row.profiles),
    bio: row.bio,
    active: row.active,
    specialtyIds: row.professional_specialties.map((item) => item.specialty_id),
    branchIds: row.professional_branches.map((item) => item.branch_id),
    serviceIds: row.professional_services.map((item) => item.service_id),
  };
}

export async function getProfessionals(): Promise<Professional[]> {
  const { data, error } = await supabase.from('professionals').select(SELECT_COLUMNS).eq('active', true);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as unknown as ProfessionalRow[]).map(mapRow);
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

export interface EligibleProfile {
  id: string;
  fullName: string;
  email: string;
}

// Cuentas con role = especialista que todavía no tienen ficha profesional.
export async function getEligibleProfilesForProfessional(): Promise<EligibleProfile[]> {
  const [{ data: profiles, error: profilesError }, { data: existing, error: existingError }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, email').eq('role', 'especialista').eq('active', true),
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
    .map((profile) => ({ id: profile.id, fullName: profile.full_name, email: profile.email }));
}

export interface ProfessionalRelationsInput {
  specialtyIds: string[];
  branchIds: string[];
  serviceIds: string[];
}

async function replaceRelations(professionalId: string, input: ProfessionalRelationsInput): Promise<void> {
  const tasks = [
    supabase.from('professional_specialties').delete().eq('professional_id', professionalId),
    supabase.from('professional_branches').delete().eq('professional_id', professionalId),
    supabase.from('professional_services').delete().eq('professional_id', professionalId),
  ];

  for (const result of await Promise.all(tasks)) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  const inserts = [];

  if (input.specialtyIds.length > 0) {
    inserts.push(
      supabase
        .from('professional_specialties')
        .insert(input.specialtyIds.map((specialtyId) => ({ professional_id: professionalId, specialty_id: specialtyId }))),
    );
  }
  if (input.branchIds.length > 0) {
    inserts.push(
      supabase
        .from('professional_branches')
        .insert(input.branchIds.map((branchId) => ({ professional_id: professionalId, branch_id: branchId }))),
    );
  }
  if (input.serviceIds.length > 0) {
    inserts.push(
      supabase
        .from('professional_services')
        .insert(input.serviceIds.map((serviceId) => ({ professional_id: professionalId, service_id: serviceId }))),
    );
  }

  for (const result of await Promise.all(inserts)) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }
}

export interface CreateProfessionalInput extends ProfessionalRelationsInput {
  profileId: string;
  bio: string | null;
}

export async function createProfessional(input: CreateProfessionalInput): Promise<void> {
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
