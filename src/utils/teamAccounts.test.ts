import { describe, expect, it } from 'vitest';
import { accountToggle } from './teamAccounts';

const member = (overrides: Partial<Parameters<typeof accountToggle>[0]> = {}) => ({
  id: 'tere',
  role: 'tecnica' as const,
  active: true,
  branchIds: ['jaen'],
  ...overrides,
});

const global = { isAdminGlobal: true, myBranchIds: null, selfId: 'yo' };
const jaen = { isAdminGlobal: false, myBranchIds: ['jaen'], selfId: 'yo' };

describe('accountToggle', () => {
  it('admin_global activa y desactiva cualquier cuenta menos la suya', () => {
    expect(accountToggle(member({ role: 'admin_sede', branchIds: ['bagua'] }), global)).toEqual({ show: true, blockedReason: null });
    expect(accountToggle(member({ id: 'yo' }), global).show).toBe(false);
  });

  it('admin_sede desactiva a quien trabaja solo en su sede', () => {
    expect(accountToggle(member(), jaen)).toEqual({ show: true, blockedReason: null });
    expect(accountToggle(member({ role: 'especialista' }), jaen)).toEqual({ show: true, blockedReason: null });
  });

  it('admin_sede no desactiva a quien también atiende en otra sede, pero sí la activa', () => {
    expect(accountToggle(member({ role: 'especialista', branchIds: ['bagua', 'jaen'] }), jaen)).toEqual({
      show: true,
      blockedReason: 'Atiende también en otra sede: solo la administración general puede desactivar su cuenta.',
    });
    expect(
      accountToggle(member({ role: 'especialista', branchIds: ['bagua', 'jaen'], active: false }), jaen),
    ).toEqual({ show: true, blockedReason: null });
  });

  it('admin_sede no toca cuentas de administradoras ni la suya', () => {
    expect(accountToggle(member({ role: 'admin_sede' }), jaen).show).toBe(false);
    expect(accountToggle(member({ role: 'admin_global' }), jaen).show).toBe(false);
    expect(accountToggle(member({ id: 'yo' }), jaen).show).toBe(false);
  });
});
