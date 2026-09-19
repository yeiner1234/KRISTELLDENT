import { supabase } from '../lib/supabase';
import type { Branch } from '../types/Branch';

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
}

const SELECT_COLUMNS = 'id, name, address, region, google_maps_address, phone, lat, lng, active';

function mapRow(row: BranchRow): Branch {
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
  };
}

export async function getBranches(): Promise<Branch[]> {
  const { data, error } = await supabase
    .from('branches')
    .select(SELECT_COLUMNS)
    .eq('active', true)
    .order('name', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapRow);
}

export async function getBranchById(id: string): Promise<Branch | null> {
  const { data, error } = await supabase.from('branches').select(SELECT_COLUMNS).eq('id', id).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapRow(data) : null;
}
