import { supabase } from '../lib/supabase';
import type {
  AdminSpecialty,
  BookableProfessional,
  BookableService,
  BranchSpecialty,
  DirectoryProfessional,
  OfferOverviewCell,
  ServiceOfferStatus,
} from '../types/Offer';
import type { AppRole } from '../types/User';

// Oferta de cada sede: todo lo calcula la base (funciones de
// 20261124000100_oferta_sede_funciones.sql), así la pantalla y la reserva
// usan la misma regla de "servicio reservable".

async function callRpc<T>(name: string, args?: Record<string, unknown>): Promise<T[]> {
  const { data, error } = await (args ? supabase.rpc(name, args) : supabase.rpc(name));
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as T[];
}

// numeric llega como texto desde PostgREST.
const toNumber = (value: number | string) => Number(value);
const toNumberOrNull = (value: number | string | null) => (value === null ? null : Number(value));

interface OfferProfessionalRow {
  id: string;
  full_name: string;
  active: boolean;
  // Llegan desde 20261124000900; sin esa migración se deducen de "active".
  account_active?: boolean;
  record_active?: boolean;
  has_schedule: boolean;
  bookable: boolean;
}

interface OfferStatusRow {
  service_id: string;
  name: string;
  specialty_id: string;
  specialty_name: string;
  specialty_active: boolean;
  price: number | string;
  duration_minutes: number;
  active: boolean;
  professionals: OfferProfessionalRow[] | null;
  bookable: boolean;
  reason: string | null;
}

export async function getBranchOfferStatus(branchId: string): Promise<ServiceOfferStatus[]> {
  const rows = await callRpc<OfferStatusRow>('get_branch_offer_status', { p_branch_id: branchId });
  return rows.map((row) => ({
    serviceId: row.service_id,
    name: row.name,
    specialtyId: row.specialty_id,
    specialtyName: row.specialty_name,
    specialtyActive: row.specialty_active,
    price: toNumber(row.price),
    duration: row.duration_minutes,
    active: row.active,
    professionals: (row.professionals ?? []).map((professional) => ({
      id: professional.id,
      fullName: professional.full_name,
      active: professional.active,
      accountActive: professional.account_active ?? professional.active,
      recordActive: professional.record_active ?? professional.active,
      hasSchedule: professional.has_schedule,
      bookable: professional.bookable,
    })),
    bookable: row.bookable,
    reason: row.reason,
  }));
}

interface OverviewRow {
  branch_id: string;
  branch_name: string;
  branch_active: boolean;
  specialty_id: string;
  specialty_name: string;
  specialty_active: boolean;
  services_count: number;
  active_count: number;
  bookable_count: number;
  min_price: number | string | null;
  max_price: number | string | null;
}

export async function getOfferOverview(): Promise<OfferOverviewCell[]> {
  const rows = await callRpc<OverviewRow>('get_offer_overview');
  return rows.map((row) => ({
    branchId: row.branch_id,
    branchName: row.branch_name,
    branchActive: row.branch_active,
    specialtyId: row.specialty_id,
    specialtyName: row.specialty_name,
    specialtyActive: row.specialty_active,
    servicesCount: row.services_count,
    activeCount: row.active_count,
    bookableCount: row.bookable_count,
    minPrice: toNumberOrNull(row.min_price),
    maxPrice: toNumberOrNull(row.max_price),
  }));
}

interface AdminSpecialtyRow {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  created_by_name: string | null;
  branch_names: string[] | null;
}

export async function getSpecialtiesAdmin(): Promise<AdminSpecialty[]> {
  const rows = await callRpc<AdminSpecialtyRow>('get_specialties_admin');
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    active: row.active,
    createdByName: row.created_by_name,
    branchNames: row.branch_names ?? [],
  }));
}

interface DirectoryRow {
  id: string;
  full_name: string;
  role: AppRole;
  specialty_names: string[] | null;
  branch_ids: string[] | null;
  branch_names: string[] | null;
}

export async function searchProfessionalsDirectory(query: string): Promise<DirectoryProfessional[]> {
  const rows = await callRpc<DirectoryRow>('search_professionals_directory', { p_query: query.trim() });
  return rows.map((row) => ({
    id: row.id,
    fullName: row.full_name,
    role: row.role,
    specialtyNames: row.specialty_names ?? [],
    branchIds: row.branch_ids ?? [],
    branchNames: row.branch_names ?? [],
  }));
}

// --- Reserva pública (anon) -----------------------------------------------------

export async function getBranchSpecialties(branchId: string): Promise<BranchSpecialty[]> {
  return callRpc<BranchSpecialty>('get_branch_specialties', { p_branch_id: branchId });
}

interface BookableServiceRow {
  id: string;
  name: string;
  specialty_id: string;
  specialty_name: string;
  price: number | string;
  duration_minutes: number;
}

export interface BookableServicesQuery {
  branchId: string;
  specialtyId?: string | null;
  // null = cualquier profesional.
  professionalId?: string | null;
}

export async function getBookableServices(query: BookableServicesQuery): Promise<BookableService[]> {
  const rows = await callRpc<BookableServiceRow>('get_bookable_services', {
    p_branch_id: query.branchId,
    p_specialty_id: query.specialtyId ?? null,
    p_professional_id: query.professionalId ?? null,
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    specialtyId: row.specialty_id,
    specialtyName: row.specialty_name,
    price: toNumber(row.price),
    duration: row.duration_minutes,
  }));
}

export interface BookableProfessionalsQuery {
  branchId: string;
  specialtyId?: string | null;
  serviceId?: string | null;
}

export async function getBookableProfessionals(query: BookableProfessionalsQuery): Promise<BookableProfessional[]> {
  const rows = await callRpc<{ id: string; full_name: string }>('get_bookable_professionals', {
    p_branch_id: query.branchId,
    p_specialty_id: query.specialtyId ?? null,
    p_service_id: query.serviceId ?? null,
  });
  return rows.map((row) => ({ id: row.id, fullName: row.full_name }));
}
