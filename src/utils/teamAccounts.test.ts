import { describe, expect, it } from 'vitest';
import { accountAction, countTeamRoles, filterTeamMembers, type TeamFilters, type TeamMemberLike } from './teamAccounts';

const member = (overrides: Partial<Parameters<typeof accountAction>[0]> = {}) => ({
  id: 'tere',
  role: 'tecnica' as const,
  active: true,
  branchIds: ['jaen'],
  inactiveBranchIds: [] as string[],
  ...overrides,
});

const global = { isAdminGlobal: true, myBranchIds: null, selfId: 'yo' };
const jaen = { isAdminGlobal: false, myBranchIds: ['jaen'], selfId: 'yo' };

describe('accountAction', () => {
  it('admin_global activa y desactiva la cuenta de cualquiera menos la suya', () => {
    expect(accountAction(member({ role: 'admin_sede', branchIds: ['bagua'] }), global)).toEqual({
      kind: 'account',
      blockedReason: null,
    });
    expect(accountAction(member({ id: 'yo' }), global)).toEqual({ kind: 'none' });
  });

  it('admin_sede desactiva la cuenta de quien trabaja solo en su sede', () => {
    expect(accountAction(member(), jaen)).toEqual({ kind: 'account', blockedReason: null });
    expect(accountAction(member({ role: 'especialista' }), jaen)).toEqual({ kind: 'account', blockedReason: null });
  });

  it('profesional en varias sedes: admin_sede la activa o desactiva solo en su sede', () => {
    expect(accountAction(member({ role: 'especialista', branchIds: ['bagua', 'jaen'] }), jaen)).toEqual({
      kind: 'branch',
      branchId: 'jaen',
      active: true,
    });
    expect(
      accountAction(member({ role: 'especialista', branchIds: ['bagua', 'jaen'], inactiveBranchIds: ['jaen'] }), jaen),
    ).toEqual({ kind: 'branch', branchId: 'jaen', active: false });
  });

  it('con la cuenta desactivada, admin_sede activa la cuenta aunque trabaje en varias sedes', () => {
    expect(accountAction(member({ role: 'especialista', branchIds: ['bagua', 'jaen'], active: false }), jaen)).toEqual({
      kind: 'account',
      blockedReason: null,
    });
  });

  it('técnica en varias sedes: se le quita la sede con "Editar sedes"', () => {
    expect(accountAction(member({ branchIds: ['bagua', 'jaen'] }), jaen)).toEqual({
      kind: 'account',
      blockedReason: 'Trabaja también en otra sede: quítale tu sede con "Editar sedes".',
    });
  });

  it('admin_sede no toca cuentas de administradoras ni la suya', () => {
    expect(accountAction(member({ role: 'admin_sede' }), jaen)).toEqual({ kind: 'none' });
    expect(accountAction(member({ role: 'admin_global' }), jaen)).toEqual({ kind: 'none' });
    expect(accountAction(member({ id: 'yo' }), jaen)).toEqual({ kind: 'none' });
  });
});

describe('filterTeamMembers', () => {
  const member = (overrides: Partial<TeamMemberLike>): TeamMemberLike => ({
    fullName: 'Ana Ríos',
    email: 'ana@kristelldent.pe',
    role: 'tecnica',
    active: true,
    branchIds: ['b1'],
    ...overrides,
  });
  const members = [
    member({ fullName: 'Ana Ríos' }),
    member({ fullName: 'Bea Soto', email: 'bea@k.pe', role: 'especialista', branchIds: ['b1', 'b2'] }),
    member({ fullName: 'Carla Paz', email: 'carla@k.pe', role: 'especialista', active: false, branchIds: ['b2'] }),
  ];
  const names = (filters: Partial<TeamFilters>) =>
    filterTeamMembers(members, { query: '', role: '', status: '', branchId: '', ...filters }).map((m) => m.fullName);

  it('sin filtros devuelve a todos', () => {
    expect(names({})).toEqual(['Ana Ríos', 'Bea Soto', 'Carla Paz']);
  });

  it('busca por nombre o correo, sin importar mayúsculas ni tildes', () => {
    expect(names({ query: 'rios' })).toEqual(['Ana Ríos']);
    expect(names({ query: 'BEA@' })).toEqual(['Bea Soto']);
  });

  it('filtra por rol, estado y sede, y los combina', () => {
    expect(names({ role: 'especialista' })).toEqual(['Bea Soto', 'Carla Paz']);
    expect(names({ status: 'inactive' })).toEqual(['Carla Paz']);
    expect(names({ branchId: 'b2' })).toEqual(['Bea Soto', 'Carla Paz']);
    expect(names({ role: 'especialista', status: 'active', branchId: 'b2' })).toEqual(['Bea Soto']);
  });

  it('cuenta por rol con los demás filtros aplicados', () => {
    expect(countTeamRoles(members, { query: '', role: '', status: 'active', branchId: '' })).toEqual({
      '': 2,
      admin_global: 0,
      admin_sede: 0,
      especialista: 1,
      odontologa_general: 0,
      tecnica: 1,
    });
  });
});
