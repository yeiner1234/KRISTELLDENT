import { describe, expect, it } from 'vitest';
import { accountAction } from './teamAccounts';

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
