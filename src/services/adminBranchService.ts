import { supabase } from '../lib/supabase';

export interface BranchRecord {
  id: string;
  name: string;
  address: string;
  region: string | null;
  googleMapsAddress: string | null;
  phone: string | null;
  lat: number | null;
  lng: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BranchInput {
  name: string;
  address: string;
  region: string | null;
  googleMapsAddress: string | null;
  phone: string | null;
  lat: number | null;
  lng: number | null;
}

interface BranchRow {
  id: string;
  name: string;
  address: string;
  region: string | null;
  google_maps_address: string | null;
  phone: string | null;
  lat: number | null;
  lng: number | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

const SELECT_COLUMNS = 'id, name, address, region, google_maps_address, phone, lat, lng, active, created_at, updated_at';

function mapRow(row: BranchRow): BranchRecord {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    region: row.region,
    googleMapsAddress: row.google_maps_address,
    phone: row.phone,
    lat: row.lat,
    lng: row.lng,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(input: BranchInput) {
  return {
    name: input.name,
    address: input.address,
    region: input.region,
    google_maps_address: input.googleMapsAddress,
    phone: input.phone,
    lat: input.lat,
    lng: input.lng,
  };
}

export async function getAllBranches(): Promise<BranchRecord[]> {
  const { data, error } = await supabase.from('branches').select(SELECT_COLUMNS).order('name', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapRow);
}

export async function createBranch(input: BranchInput): Promise<BranchRecord> {
  const { data, error } = await supabase.from('branches').insert(toRow(input)).select(SELECT_COLUMNS).single();

  if (error) {
    throw new Error(error.message);
  }

  return mapRow(data);
}

export async function updateBranch(id: string, input: BranchInput): Promise<BranchRecord> {
  const { data, error } = await supabase
    .from('branches')
    .update(toRow(input))
    .eq('id', id)
    .select(SELECT_COLUMNS)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapRow(data);
}

export async function setBranchActive(id: string, active: boolean): Promise<BranchRecord> {
  const { data, error } = await supabase
    .from('branches')
    .update({ active })
    .eq('id', id)
    .select(SELECT_COLUMNS)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapRow(data);
}
