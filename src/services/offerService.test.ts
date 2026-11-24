import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '../lib/supabase';
import {
  getBookableProfessionals,
  getBookableServices,
  getBranchOfferStatus,
  getBranchSpecialties,
  getOfferOverview,
  getSpecialtiesAdmin,
  searchProfessionalsDirectory,
} from './offerService';

vi.mock('../lib/supabase', () => ({
  supabase: { rpc: vi.fn() },
}));

function rpcReturns(data: unknown, error: { message: string } | null = null) {
  vi.mocked(supabase.rpc).mockResolvedValue({ data, error } as never);
}

describe('offerService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getBranchOfferStatus convierte cada servicio con sus profesionales y el motivo', async () => {
    rpcReturns([
      {
        service_id: 's1',
        name: 'Control de ortodoncia',
        specialty_id: 'orto',
        specialty_name: 'Ortodoncia',
        specialty_active: true,
        price: '80.00',
        duration_minutes: 30,
        active: true,
        professionals: [
          { id: 'ana', full_name: 'ANali', active: true, account_active: true, record_active: true, has_schedule: false, bookable: false },
          { id: 'bea', full_name: 'Bea', active: false, account_active: false, record_active: true, has_schedule: true, bookable: false },
        ],
        bookable: false,
        reason: 'No visible en reservas: la profesional asignada no tiene horario en esta sede.',
      },
    ]);

    const rows = await getBranchOfferStatus('jaen');

    expect(supabase.rpc).toHaveBeenCalledWith('get_branch_offer_status', { p_branch_id: 'jaen' });
    expect(rows).toEqual([
      {
        serviceId: 's1',
        name: 'Control de ortodoncia',
        specialtyId: 'orto',
        specialtyName: 'Ortodoncia',
        specialtyActive: true,
        price: 80,
        duration: 30,
        active: true,
        professionals: [
          { id: 'ana', fullName: 'ANali', active: true, accountActive: true, recordActive: true, hasSchedule: false, bookable: false },
          { id: 'bea', fullName: 'Bea', active: false, accountActive: false, recordActive: true, hasSchedule: true, bookable: false },
        ],
        bookable: false,
        reason: 'No visible en reservas: la profesional asignada no tiene horario en esta sede.',
      },
    ]);
  });

  it('getOfferOverview convierte las celdas sede × especialidad', async () => {
    rpcReturns([
      {
        branch_id: 'jaen',
        branch_name: 'Jaén',
        branch_active: true,
        specialty_id: 'orto',
        specialty_name: 'Ortodoncia',
        specialty_active: true,
        services_count: 3,
        active_count: 2,
        bookable_count: 1,
        min_price: '50',
        max_price: null,
      },
    ]);

    const [cell] = await getOfferOverview();

    expect(cell).toEqual({
      branchId: 'jaen',
      branchName: 'Jaén',
      branchActive: true,
      specialtyId: 'orto',
      specialtyName: 'Ortodoncia',
      specialtyActive: true,
      servicesCount: 3,
      activeCount: 2,
      bookableCount: 1,
      minPrice: 50,
      maxPrice: null,
    });
  });

  it('getSpecialtiesAdmin trae quién la agregó y dónde se ofrece', async () => {
    rpcReturns([
      { id: 'orto', name: 'Ortodoncia', description: null, active: true, created_by_name: null, branch_names: ['Jaén'] },
    ]);

    expect(await getSpecialtiesAdmin()).toEqual([
      { id: 'orto', name: 'Ortodoncia', description: null, active: true, createdByName: null, branchNames: ['Jaén'] },
    ]);
  });

  it('searchProfessionalsDirectory busca por nombre', async () => {
    rpcReturns([
      {
        id: 'ana',
        full_name: 'ANali',
        role: 'especialista',
        specialty_names: ['Ortodoncia'],
        branch_ids: ['bagua'],
        branch_names: ['Bagua'],
      },
    ]);

    const results = await searchProfessionalsDirectory('  ana ');

    expect(supabase.rpc).toHaveBeenCalledWith('search_professionals_directory', { p_query: 'ana' });
    expect(results[0]).toEqual({
      id: 'ana',
      fullName: 'ANali',
      role: 'especialista',
      specialtyNames: ['Ortodoncia'],
      branchIds: ['bagua'],
      branchNames: ['Bagua'],
    });
  });

  it('funciones públicas de la reserva: especialidades, servicios y profesionales de la sede', async () => {
    rpcReturns([{ id: 'orto', name: 'Ortodoncia', description: 'Brackets' }]);
    expect(await getBranchSpecialties('jaen')).toEqual([{ id: 'orto', name: 'Ortodoncia', description: 'Brackets' }]);
    expect(supabase.rpc).toHaveBeenLastCalledWith('get_branch_specialties', { p_branch_id: 'jaen' });

    rpcReturns([
      { id: 's1', name: 'Control', specialty_id: 'orto', specialty_name: 'Ortodoncia', price: '80', duration_minutes: 30 },
    ]);
    expect(await getBookableServices({ branchId: 'jaen', specialtyId: 'orto' })).toEqual([
      { id: 's1', name: 'Control', specialtyId: 'orto', specialtyName: 'Ortodoncia', price: 80, duration: 30 },
    ]);
    expect(supabase.rpc).toHaveBeenLastCalledWith('get_bookable_services', {
      p_branch_id: 'jaen',
      p_specialty_id: 'orto',
      p_professional_id: null,
    });

    rpcReturns([{ id: 'ana', full_name: 'ANali' }]);
    expect(await getBookableProfessionals({ branchId: 'jaen', serviceId: 's1' })).toEqual([{ id: 'ana', fullName: 'ANali' }]);
    expect(supabase.rpc).toHaveBeenLastCalledWith('get_bookable_professionals', {
      p_branch_id: 'jaen',
      p_specialty_id: null,
      p_service_id: 's1',
    });
  });

  it('propaga el error de la base', async () => {
    rpcReturns(null, { message: 'No tienes permiso para ver la oferta de esta sede.' });

    await expect(getBranchOfferStatus('bagua')).rejects.toThrow('No tienes permiso para ver la oferta de esta sede.');
  });
});
