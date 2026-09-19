import { supabase } from '../lib/supabase';
import type { Specialty } from '../types/Specialty';

interface SpecialtyRow {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
}

function mapRow(row: SpecialtyRow): Specialty {
  return { id: row.id, name: row.name, description: row.description, active: row.active };
}

export async function getSpecialties(): Promise<Specialty[]> {
  const { data, error } = await supabase
    .from('specialties')
    .select('id, name, description, active')
    .eq('active', true)
    .order('name', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapRow);
}

export async function getSpecialtyById(id: string): Promise<Specialty | null> {
  const { data, error } = await supabase
    .from('specialties')
    .select('id, name, description, active')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapRow(data) : null;
}

export async function getAllSpecialtiesForAdmin(): Promise<Specialty[]> {
  const { data, error } = await supabase
    .from('specialties')
    .select('id, name, description, active')
    .order('name', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapRow);
}

export interface SpecialtyInput {
  name: string;
  description: string | null;
}

export async function createSpecialty(input: SpecialtyInput): Promise<Specialty> {
  const { data, error } = await supabase
    .from('specialties')
    .insert({ name: input.name, description: input.description })
    .select('id, name, description, active')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapRow(data);
}

export async function updateSpecialty(id: string, input: SpecialtyInput): Promise<Specialty> {
  const { data, error } = await supabase
    .from('specialties')
    .update({ name: input.name, description: input.description })
    .eq('id', id)
    .select('id, name, description, active')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapRow(data);
}

export async function setSpecialtyActive(id: string, active: boolean): Promise<Specialty> {
  const { data, error } = await supabase
    .from('specialties')
    .update({ active })
    .eq('id', id)
    .select('id, name, description, active')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapRow(data);
}
