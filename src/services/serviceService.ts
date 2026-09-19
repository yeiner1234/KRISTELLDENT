import { supabase } from '../lib/supabase';
import type { Service } from '../types/Service';

interface ServiceRow {
  id: string;
  name: string;
  specialty_id: string;
  duration_minutes: number;
  price: number;
  active: boolean;
}

function mapRow(row: ServiceRow): Service {
  return {
    id: row.id,
    name: row.name,
    specialtyId: row.specialty_id,
    duration: row.duration_minutes,
    price: row.price,
    active: row.active,
  };
}

const SELECT_COLUMNS = 'id, name, specialty_id, duration_minutes, price, active';

export async function getServices(): Promise<Service[]> {
  const { data, error } = await supabase
    .from('services')
    .select(SELECT_COLUMNS)
    .eq('active', true)
    .order('name', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapRow);
}

export async function getServicesBySpecialty(specialtyId: string): Promise<Service[]> {
  const { data, error } = await supabase
    .from('services')
    .select(SELECT_COLUMNS)
    .eq('specialty_id', specialtyId)
    .eq('active', true)
    .order('name', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapRow);
}

export async function getAllServicesForAdmin(): Promise<Service[]> {
  const { data, error } = await supabase.from('services').select(SELECT_COLUMNS).order('name', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapRow);
}

export interface ServiceInput {
  name: string;
  specialtyId: string;
  duration: number;
  price: number;
}

export async function createService(input: ServiceInput): Promise<Service> {
  const { data, error } = await supabase
    .from('services')
    .insert({
      name: input.name,
      specialty_id: input.specialtyId,
      duration_minutes: input.duration,
      price: input.price,
    })
    .select(SELECT_COLUMNS)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapRow(data);
}

export async function updateService(id: string, input: ServiceInput): Promise<Service> {
  const { data, error } = await supabase
    .from('services')
    .update({
      name: input.name,
      specialty_id: input.specialtyId,
      duration_minutes: input.duration,
      price: input.price,
    })
    .eq('id', id)
    .select(SELECT_COLUMNS)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapRow(data);
}

export async function setServiceActive(id: string, active: boolean): Promise<Service> {
  const { data, error } = await supabase
    .from('services')
    .update({ active })
    .eq('id', id)
    .select(SELECT_COLUMNS)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapRow(data);
}
