import { supabase } from '../lib/supabase';
import { friendlyWriteError } from '../utils/supabaseErrors';
import type { Service } from '../types/Service';

interface ServiceRow {
  id: string;
  name: string;
  specialty_id: string;
  branch_id: string | null;
  duration_minutes: number;
  price: number | string;
  active: boolean;
}

function mapRow(row: ServiceRow): Service {
  return {
    id: row.id,
    name: row.name,
    specialtyId: row.specialty_id,
    branchId: row.branch_id,
    duration: row.duration_minutes,
    // numeric llega como texto desde PostgREST.
    price: Number(row.price),
    active: row.active,
  };
}

const SELECT_COLUMNS = 'id, name, specialty_id, branch_id, duration_minutes, price, active';

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

// Servicios de todas las sedes (el personal los ve todos; solo edita los de
// sus sedes). Lo usan las pantallas que muestran nombres de servicios.
export async function getAllServicesForAdmin(): Promise<Service[]> {
  const { data, error } = await supabase.from('services').select(SELECT_COLUMNS).order('name', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapRow);
}

// Servicios viejos sin uso que la migración dejó sin sede.
export async function getServicesWithoutBranch(): Promise<Service[]> {
  const { data, error } = await supabase
    .from('services')
    .select(SELECT_COLUMNS)
    .is('branch_id', null)
    .order('name', { ascending: true });

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

export const MAX_SERVICE_DURATION = 480;

// Lo mismo que exige la base (services_duration_max, precio >= 0), dicho antes
// de enviar.
export function validateServiceInput(input: ServiceInput): string | null {
  if (!input.name.trim()) return 'Escribe el nombre del servicio.';
  if (!input.specialtyId) return 'Elige una especialidad.';
  if (!Number.isInteger(input.duration) || input.duration < 1 || input.duration > MAX_SERVICE_DURATION) {
    return `La duración debe estar entre 1 y ${MAX_SERVICE_DURATION} minutos.`;
  }
  if (!Number.isFinite(input.price) || input.price < 0) return 'El precio no puede ser negativo.';
  return null;
}

function toRow(input: ServiceInput) {
  return {
    name: input.name.trim(),
    specialty_id: input.specialtyId,
    duration_minutes: input.duration,
    price: input.price,
  };
}

function check(input: ServiceInput): void {
  const problem = validateServiceInput(input);
  if (problem) {
    throw new Error(problem);
  }
}

// Cada servicio es de una sede: su precio y duración son los de esa sede.
export async function createService(input: ServiceInput & { branchId: string }): Promise<Service> {
  if (!input.branchId) {
    throw new Error('Elige una sede.');
  }
  check(input);

  const { data, error } = await supabase
    .from('services')
    .insert({ branch_id: input.branchId, ...toRow(input) })
    .select(SELECT_COLUMNS)
    .single();

  if (error) {
    throw new Error(friendlyWriteError(error.message));
  }

  return mapRow(data);
}

// Un servicio no cambia de sede (lo impide la base): para otra sede se crea otro.
export async function updateService(id: string, input: ServiceInput): Promise<Service> {
  check(input);

  const { data, error } = await supabase.from('services').update(toRow(input)).eq('id', id).select(SELECT_COLUMNS).single();

  if (error) {
    throw new Error(friendlyWriteError(error.message));
  }

  return mapRow(data);
}

export async function setServiceActive(id: string, active: boolean): Promise<Service> {
  const { data, error } = await supabase.from('services').update({ active }).eq('id', id).select(SELECT_COLUMNS).single();

  if (error) {
    throw new Error(friendlyWriteError(error.message));
  }

  return mapRow(data);
}

// Solo para un servicio "sin sede" (la base no deja mover uno que ya tiene).
export async function assignServiceBranch(id: string, branchId: string): Promise<Service> {
  const { data, error } = await supabase
    .from('services')
    .update({ branch_id: branchId })
    .eq('id', id)
    .select(SELECT_COLUMNS)
    .single();

  if (error) {
    throw new Error(friendlyWriteError(error.message));
  }

  return mapRow(data);
}

// La base lo impide si alguna cita usa el servicio: entonces se desactiva.
export async function deleteService(id: string): Promise<void> {
  const { error } = await supabase.from('services').delete().eq('id', id);

  if (error) {
    throw new Error(friendlyWriteError(error.message));
  }
}
