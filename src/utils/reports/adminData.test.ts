import { describe, expect, it } from 'vitest';
import type { Appointment } from '../../types/Appointment';
import {
  createdDateInLima,
  enrichAppointments,
  filterReportAppointments,
  formatInteger,
  formatMoney,
  formatMoneyShort,
  isUnclosedAppointment,
  maskDni,
  maskPhone,
  rate,
  type ReportAppointment,
} from './adminData';

function appt(overrides: Partial<Appointment>): Appointment {
  return {
    id: overrides.id ?? Math.random().toString(36).slice(2),
    code: 'KD-1',
    patientId: 'p1',
    professionalId: 'd1',
    branchId: 'bagua',
    serviceId: 'endo',
    date: '2026-08-10',
    startTime: '09:00',
    endTime: '10:30',
    status: 'completed',
    reason: '',
    ...overrides,
  };
}

const lookups = {
  services: [
    { id: 'endo', name: 'Endodoncia', specialtyId: 'sp-endo', branchId: 'bagua', duration: 90, price: 350, active: true },
    { id: 'limp', name: 'Limpieza dental', specialtyId: 'sp-gen', branchId: 'bagua', duration: 30, price: 80, active: true },
  ],
  specialties: [
    { id: 'sp-endo', name: 'Endodoncia', description: null, active: true },
    { id: 'sp-gen', name: 'Odontología general', description: null, active: true },
  ],
  professionals: [{ id: 'd1', fullName: 'Lucía Mendoza Paz' }],
  branches: [{ id: 'bagua', name: 'Bagua' }],
};

describe('enrichAppointments', () => {
  it('suma especialidad, duración y precio guardados en la cita, doctora y sede', () => {
    const [row] = enrichAppointments([appt({ serviceName: 'Endodoncia', servicePrice: 320, serviceDuration: 80 })], lookups);

    expect(row).toMatchObject({
      specialtyId: 'sp-endo',
      specialtyName: 'Endodoncia',
      serviceLabel: 'Endodoncia',
      durationMinutes: 80,
      price: 320,
      doctorName: 'Lucía Mendoza Paz',
      branchName: 'Bagua',
    });
  });

  it('sin copia en la cita usa el servicio vigente; sin servicio, la hora de la cita', () => {
    const [fromService, fromTimes] = enrichAppointments(
      [appt({ serviceId: 'limp' }), appt({ serviceId: null, startTime: '09:00', endTime: '09:45' })],
      lookups,
    );

    expect(fromService).toMatchObject({ durationMinutes: 30, price: 80, serviceLabel: 'Limpieza dental' });
    expect(fromTimes).toMatchObject({ durationMinutes: 45, price: 0, specialtyName: 'Sin especialidad', serviceLabel: '—' });
  });
});

describe('filtros y estados', () => {
  const rows = enrichAppointments(
    [
      appt({ id: 'a', date: '2026-07-01' }),
      appt({ id: 'b', date: '2026-08-01', branchId: 'jaen' }),
      appt({ id: 'c', date: '2026-08-02', serviceId: 'limp', status: 'cancelled' }),
      appt({ id: 'd', date: '2026-08-03', professionalId: 'd2' }),
      appt({ id: 'e', date: '2026-10-01' }),
    ],
    lookups,
  );
  const base = { from: '2026-07-01', to: '2026-09-30', branchId: '', professionalId: '', specialtyId: '', status: 'all' as const };
  const ids = (list: ReportAppointment[]) => list.map((row) => row.id);

  it('periodo, sede, doctora, especialidad y estado', () => {
    expect(ids(filterReportAppointments(rows, base))).toEqual(['a', 'b', 'c', 'd']);
    expect(ids(filterReportAppointments(rows, { ...base, branchId: 'jaen' }))).toEqual(['b']);
    expect(ids(filterReportAppointments(rows, { ...base, professionalId: 'd2' }))).toEqual(['d']);
    expect(ids(filterReportAppointments(rows, { ...base, specialtyId: 'sp-gen' }))).toEqual(['c']);
    expect(ids(filterReportAppointments(rows, { ...base, status: 'cancelled' }))).toEqual(['c']);
  });

  it('sin cerrar: fecha pasada y pendiente, confirmada o en sala', () => {
    expect(isUnclosedAppointment({ date: '2026-10-13', status: 'confirmed' }, '2026-10-14')).toBe(true);
    expect(isUnclosedAppointment({ date: '2026-10-14', status: 'pending' }, '2026-10-14')).toBe(false);
    expect(isUnclosedAppointment({ date: '2026-10-01', status: 'completed' }, '2026-10-14')).toBe(false);
  });

  it('fecha de registro en hora de Lima', () => {
    // 02:00 UTC del 15 es todavía el 14 en Lima.
    expect(createdDateInLima('2026-11-15T02:00:00+00:00')).toBe('2026-11-14');
  });
});

describe('formatos', () => {
  it('enmascara DNI y teléfono para el papel', () => {
    expect(maskDni('46831572')).toBe('4683••••');
    expect(maskPhone('951384207')).toBe('951 ••• 207');
    expect(maskPhone(null)).toBe('—');
  });

  it('miles con coma, soles y montos cortos', () => {
    expect(formatInteger(2266)).toBe('2,266');
    expect(formatMoney(239050)).toBe('S/ 239,050');
    expect(formatMoneyShort(76200)).toBe('76.2 mil');
    expect(formatMoneyShort(80000)).toBe('80 mil');
    expect(formatMoneyShort(950)).toBe('950');
  });

  it('tasa en %, sin base null', () => {
    expect(rate(1, 4)).toBe(25);
    expect(rate(1, 0)).toBeNull();
  });
});
