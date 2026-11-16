import { describe, expect, it } from 'vitest';
import { homePathForRole, isAdminRole } from './roleHome';

describe('homePathForRole', () => {
  it('lleva a los admins a /admin y al resto del equipo a /profesional', () => {
    expect(homePathForRole('admin_global')).toBe('/admin');
    expect(homePathForRole('admin_sede')).toBe('/admin');
    expect(homePathForRole('especialista')).toBe('/profesional');
    expect(homePathForRole('odontologa_general')).toBe('/profesional');
    expect(homePathForRole('tecnica')).toBe('/profesional');
  });

  it('isAdminRole distingue los dos roles de administración', () => {
    expect(isAdminRole('admin_sede')).toBe(true);
    expect(isAdminRole('tecnica')).toBe(false);
  });
});
