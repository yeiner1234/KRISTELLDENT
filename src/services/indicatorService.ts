import { supabase } from '../lib/supabase';
import type { AppointmentStatus } from '../types/Appointment';
import type { IndicatorRow } from '../utils/appointmentIndicators';

export interface IndicatorFilters {
  from: string;
  to: string;
  // '' = todos.
  professionalId: string;
  branchId: string;
}

interface IndicatorRpcRow {
  branch_id: string;
  professional_id: string;
  status: AppointmentStatus;
  is_past: boolean;
  total: number | string;
}

// HU16: cuenta en la base (RPC appointment_indicators, SECURITY INVOKER). La
// RLS decide qué sedes entran: el admin_sede solo ve la suya.
export async function getAppointmentIndicators(filters: IndicatorFilters): Promise<IndicatorRow[]> {
  const { data, error } = await supabase.rpc('appointment_indicators', {
    p_from: filters.from,
    p_to: filters.to,
    p_professional_id: filters.professionalId || null,
    p_branch_id: filters.branchId || null,
  });

  if (error) {
    throw new Error('No se pudieron cargar los indicadores.');
  }

  return ((data ?? []) as IndicatorRpcRow[]).map((row) => ({
    branchId: row.branch_id,
    professionalId: row.professional_id,
    status: row.status,
    isPast: row.is_past,
    // bigint llega como texto desde PostgREST.
    total: Number(row.total),
  }));
}
