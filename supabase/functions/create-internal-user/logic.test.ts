import { describe, expect, it } from 'vitest';
import { ADMIN_GLOBAL_FORBIDDEN, isProfessionalRole, validateCreateUserRequest } from './logic.ts';

const payload = { email: ' Ana@Kristell.PE ', fullName: ' Ana Ríos ', role: 'especialista', branchIds: ['jaen'] };

describe('validateCreateUserRequest', () => {
  it('normaliza correo y nombre', () => {
    expect(validateCreateUserRequest(payload, { role: 'admin_global', branchIds: [] })).toEqual({
      ok: true,
      value: { email: 'ana@kristell.pe', fullName: 'Ana Ríos', role: 'especialista', branchIds: ['jaen'] },
    });
  });

  it('nunca crea una admin_global desde la app, ni con un POST directo', () => {
    expect(validateCreateUserRequest({ ...payload, role: 'admin_global' }, { role: 'admin_global', branchIds: [] })).toEqual({
      ok: false,
      status: 403,
      error: ADMIN_GLOBAL_FORBIDDEN,
    });
  });

  it('rechaza datos incompletos o un rol que no existe', () => {
    expect(validateCreateUserRequest({ ...payload, email: '' }, { role: 'admin_global', branchIds: [] })).toMatchObject({
      ok: false,
      status: 400,
    });
    expect(validateCreateUserRequest({ ...payload, role: 'paciente' }, { role: 'admin_global', branchIds: [] })).toMatchObject({
      ok: false,
      status: 400,
    });
  });

  it('pide al menos una sede', () => {
    expect(validateCreateUserRequest({ ...payload, branchIds: [] }, { role: 'admin_global', branchIds: [] })).toEqual({
      ok: false,
      status: 400,
      error: 'Debes asignar al menos una sede para este rol.',
    });
  });

  it('admin_sede solo crea roles clínicos o técnicas, y solo en sus sedes', () => {
    const caller = { role: 'admin_sede', branchIds: ['jaen'] };
    expect(validateCreateUserRequest({ ...payload, role: 'admin_sede' }, caller)).toMatchObject({ ok: false, status: 403 });
    expect(validateCreateUserRequest({ ...payload, branchIds: ['bagua'] }, caller)).toEqual({
      ok: false,
      status: 403,
      error: 'No puedes asignar sedes que no te pertenecen.',
    });
    expect(validateCreateUserRequest({ ...payload, role: 'tecnica' }, caller)).toMatchObject({ ok: true });
  });

  it('solo admin_global y admin_sede crean cuentas', () => {
    expect(validateCreateUserRequest(payload, { role: 'tecnica', branchIds: ['jaen'] })).toMatchObject({ ok: false, status: 403 });
  });

  it('quita sedes repetidas', () => {
    const result = validateCreateUserRequest({ ...payload, branchIds: ['jaen', 'jaen'] }, { role: 'admin_global', branchIds: [] });
    expect(result.ok && result.value.branchIds).toEqual(['jaen']);
  });
});

describe('isProfessionalRole', () => {
  it('especialista y odontóloga general llevan ficha; técnica y admins no', () => {
    expect(isProfessionalRole('especialista')).toBe(true);
    expect(isProfessionalRole('odontologa_general')).toBe(true);
    expect(isProfessionalRole('tecnica')).toBe(false);
    expect(isProfessionalRole('admin_sede')).toBe(false);
  });
});
