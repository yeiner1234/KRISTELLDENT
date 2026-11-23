import { supabase } from '../lib/supabase';
import { friendlyWriteError } from '../utils/supabaseErrors';
import type { Specialty } from '../types/Specialty';

interface SpecialtyRow {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
}

const SELECT_COLUMNS = 'id, name, description, active';

function mapRow(row: SpecialtyRow): Specialty {
  return { id: row.id, name: row.name, description: row.description, active: row.active };
}

export async function getSpecialties(): Promise<Specialty[]> {
  const { data, error } = await supabase
    .from('specialties')
    .select(SELECT_COLUMNS)
    .eq('active', true)
    .order('name', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapRow);
}

export async function getSpecialtyById(id: string): Promise<Specialty | null> {
  const { data, error } = await supabase.from('specialties').select(SELECT_COLUMNS).eq('id', id).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapRow(data) : null;
}

export async function getAllSpecialtiesForAdmin(): Promise<Specialty[]> {
  const { data, error } = await supabase.from('specialties').select(SELECT_COLUMNS).order('name', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapRow);
}

export interface SpecialtyInput {
  name: string;
  description: string | null;
}

function toRow(input: SpecialtyInput) {
  const name = input.name.trim().replace(/\s+/g, ' ');
  if (!name) {
    throw new Error('Escribe el nombre de la especialidad.');
  }
  const description = input.description?.trim() ? input.description.trim() : null;
  return { name, description };
}

// La lista es compartida: la agregan admin_global y admin_sede. La base
// rechaza un nombre repetido (sin tildes, mayúsculas ni espacios de más).
export async function createSpecialty(input: SpecialtyInput): Promise<Specialty> {
  const row = toRow(input);
  const { data, error } = await supabase.from('specialties').insert(row).select(SELECT_COLUMNS).single();

  if (error) {
    throw new Error(friendlyWriteError(error.message));
  }

  return mapRow(data);
}

// Renombrar, desactivar y borrar: solo admin_global (afecta a todas las sedes).
export async function updateSpecialty(id: string, input: SpecialtyInput): Promise<Specialty> {
  const row = toRow(input);
  const { data, error } = await supabase
    .from('specialties')
    .update(row)
    .eq('id', id)
    .select(SELECT_COLUMNS)
    .single();

  if (error) {
    throw new Error(friendlyWriteError(error.message));
  }

  return mapRow(data);
}

export async function setSpecialtyActive(id: string, active: boolean): Promise<Specialty> {
  const { data, error } = await supabase
    .from('specialties')
    .update({ active })
    .eq('id', id)
    .select(SELECT_COLUMNS)
    .single();

  if (error) {
    throw new Error(friendlyWriteError(error.message));
  }

  return mapRow(data);
}

// Solo si nada la usa: las FK de services y professional_specialties lo impiden.
export async function deleteSpecialty(id: string): Promise<void> {
  const { data, error } = await supabase.from('specialties').delete().eq('id', id).select('id');

  if (error) {
    throw new Error(friendlyWriteError(error.message));
  }
  if (!data || data.length === 0) {
    throw new Error('No se pudo borrar la especialidad.');
  }
}
