import { describe, expect, it } from 'vitest';
import {
  buildPatientSummaries,
  countPatientFilters,
  daysBetween,
  filterPatientSummaries,
  formatDaysAgo,
  formatRelativeDay,
  sortPatientSummaries,
} from './patientSummary';
import type { Appointment } from '../types/Appointment';
import type { Patient } from '../types/Patient';
import type { Professional } from '../types/Professional';

const TODAY = '2026-11-25';

const appointment = (overrides: Partial<Appointment>): Appointment => ({
  id: 'a1',
  code: 'KD-AAA111',
  patientId: 'pt1',
  professionalId: 'p1',
  branchId: 'b1',
  serviceId: null,
  serviceName: 'Limpieza',
  date: TODAY,
  startTime: '09:00',
  endTime: '09:30',
  status: 'pending',
  reason: '',
  ...overrides,
});

const patient = (id: string, firstName: string): Patient => ({
  id,
  dni: `${id}000000`.slice(0, 8),
  firstName,
  lastName: 'Prueba',
  phone: null,
  email: null,
});

const professional = (id: string, fullName: string): Professional => ({
  id,
  fullName,
  role: null,
  bio: null,
  avatarPath: null,
  active: true,
  specialtyIds: [],
  branchIds: [],
  serviceIds: [],
});

const lookups = {
  professionals: [professional('p1', 'Dra. Kristell'), professional('p2', 'Dr. Pérez')],
  services: [],
};

function summaryOf(appointments: Appointment[], patients = [patient('pt1', 'Ana')]) {
  return buildPatientSummaries(patients, appointments, lookups, TODAY)[0];
}

describe('daysBetween y formatRelativeDay', () => {
  it('cuenta días calendario sin depender de la zona horaria', () => {
    expect(daysBetween('2026-11-20', TODAY)).toBe(5);
    expect(daysBetween('2026-05-25', TODAY)).toBe(184);
  });

  it('dice hoy, mañana, ayer o el día abreviado', () => {
    expect(formatRelativeDay(TODAY, TODAY)).toBe('Hoy');
    expect(formatRelativeDay('2026-11-26', TODAY)).toBe('Mañana');
    expect(formatRelativeDay('2026-11-24', TODAY)).toBe('Ayer');
    expect(formatRelativeDay('2026-11-27', TODAY)).toBe('vie 27 nov');
    expect(formatRelativeDay('2025-11-27', TODAY)).toBe('jue 27 nov 2025');
  });

  it('dice hace cuánto en días, meses o años', () => {
    expect(formatDaysAgo(0)).toBe('hoy');
    expect(formatDaysAgo(1)).toBe('hace 1 día');
    expect(formatDaysAgo(23)).toBe('hace 23 días');
    expect(formatDaysAgo(184)).toBe('hace 6 meses');
    expect(formatDaysAgo(400)).toBe('hace más de 1 año');
  });
});

describe('buildPatientSummaries', () => {
  it('toma la próxima cita activa más cercana, con servicio y profesional', () => {
    const summary = summaryOf([
      appointment({ id: 'a1', date: '2026-12-02', status: 'confirmed', professionalId: 'p2' }),
      appointment({ id: 'a2', date: '2026-11-28', startTime: '10:30', status: 'pending' }),
      appointment({ id: 'a3', date: '2026-11-27', status: 'cancelled' }),
    ]);

    expect(summary.next?.appointment.id).toBe('a2');
    expect(summary.next?.professionalName).toBe('Dra. Kristell');
    expect(summary.next?.serviceName).toBe('Limpieza');
  });

  it('la última visita es la última cita completada y cuenta los días', () => {
    const summary = summaryOf([
      appointment({ id: 'a1', date: '2026-10-01', status: 'completed', serviceName: 'Resina' }),
      appointment({ id: 'a2', date: '2026-11-15', status: 'completed', serviceName: 'Limpieza' }),
      appointment({ id: 'a3', date: '2026-11-20', status: 'cancelled' }),
    ]);

    expect(summary.lastVisit?.appointment.id).toBe('a2');
    expect(summary.daysSinceLastVisit).toBe(10);
  });

  it('separa la cita de hoy aunque ya esté en sala', () => {
    const summary = summaryOf([appointment({ id: 'a1', status: 'in_room' })]);

    expect(summary.today?.appointment.status).toBe('in_room');
  });

  it('cuenta atendidas, canceladas y pendientes', () => {
    const summary = summaryOf([
      appointment({ id: 'a1', date: '2026-10-01', status: 'completed' }),
      appointment({ id: 'a2', date: '2026-10-08', status: 'completed' }),
      appointment({ id: 'a3', date: '2026-10-15', status: 'cancelled' }),
      appointment({ id: 'a4', date: '2026-12-01', status: 'confirmed' }),
    ]);

    expect(summary.counts).toEqual({ completed: 2, cancelled: 1, upcoming: 1, total: 4 });
  });

  it('el motivo sale de la próxima cita y, si no tiene, de la última', () => {
    expect(
      summaryOf([
        appointment({ id: 'a1', date: '2026-10-01', status: 'completed', reason: 'Dolor de muela' }),
        appointment({ id: 'a2', date: '2026-12-01', status: 'pending', reason: '' }),
      ]).reason,
    ).toBe('Dolor de muela');
    expect(
      summaryOf([
        appointment({ id: 'a1', date: '2026-10-01', status: 'completed', reason: 'Dolor de muela' }),
        appointment({ id: 'a2', date: '2026-12-01', status: 'pending', reason: 'Control' }),
      ]).reason,
    ).toBe('Control');
  });

  it('agrupa los servicios atendidos con cuántas veces y la última fecha', () => {
    const summary = summaryOf([
      appointment({ id: 'a1', date: '2026-09-01', status: 'completed', serviceName: 'Limpieza' }),
      appointment({ id: 'a2', date: '2026-10-01', status: 'completed', serviceName: 'Resina' }),
      appointment({ id: 'a3', date: '2026-11-01', status: 'completed', serviceName: 'Limpieza' }),
      appointment({ id: 'a4', date: '2026-11-10', status: 'cancelled', serviceName: 'Extracción' }),
    ]);

    expect(summary.servicesReceived).toEqual([
      { name: 'Limpieza', count: 2, lastDate: '2026-11-01' },
      { name: 'Resina', count: 1, lastDate: '2026-10-01' },
    ]);
  });

  it('profesional y sede habituales: los más frecuentes sin contar canceladas', () => {
    const summary = summaryOf([
      appointment({ id: 'a1', date: '2026-09-01', status: 'completed', professionalId: 'p2', branchId: 'b2' }),
      appointment({ id: 'a2', date: '2026-10-01', status: 'completed', professionalId: 'p2', branchId: 'b2' }),
      appointment({ id: 'a3', date: '2026-10-02', status: 'cancelled', professionalId: 'p1', branchId: 'b1' }),
      appointment({ id: 'a4', date: '2026-10-03', status: 'cancelled', professionalId: 'p1', branchId: 'b1' }),
      appointment({ id: 'a5', date: '2026-10-04', status: 'cancelled', professionalId: 'p1', branchId: 'b1' }),
    ]);

    expect(summary.usualProfessionalName).toBe('Dr. Pérez');
    expect(summary.usualBranchId).toBe('b2');
  });

  describe('alertas', () => {
    it('paciente nuevo: nunca fue atendido', () => {
      expect(summaryOf([appointment({ date: '2026-12-01' })]).alerts).toContain('new');
      expect(
        summaryOf([appointment({ date: '2026-11-01', status: 'completed' })]).alerts,
      ).not.toContain('new');
    });

    it('muchas cancelaciones: dos o más', () => {
      const summary = summaryOf([
        appointment({ id: 'a1', date: '2026-10-01', status: 'cancelled' }),
        appointment({ id: 'a2', date: '2026-10-08', status: 'cancelled' }),
      ]);
      expect(summary.alerts).toContain('cancellations');
    });

    it('inactivo: más de 6 meses sin venir y sin cita próxima', () => {
      const old = appointment({ id: 'a1', date: '2026-05-01', status: 'completed' });
      expect(summaryOf([old]).alerts).toContain('inactive');
      expect(
        summaryOf([old, appointment({ id: 'a2', date: '2026-12-01', status: 'pending' })]).alerts,
      ).not.toContain('inactive');
      expect(
        summaryOf([appointment({ date: '2026-08-01', status: 'completed' })]).alerts,
      ).not.toContain('inactive');
    });

    it('por confirmar: la próxima cita sigue pendiente', () => {
      expect(summaryOf([appointment({ date: '2026-12-01', status: 'pending' })]).alerts).toContain('unconfirmed');
      expect(summaryOf([appointment({ date: '2026-12-01', status: 'confirmed' })]).alerts).not.toContain(
        'unconfirmed',
      );
    });
  });

  it('el historial va de la más reciente a la más antigua', () => {
    const summary = summaryOf([
      appointment({ id: 'a1', date: '2026-09-01', status: 'completed' }),
      appointment({ id: 'a2', date: '2026-12-01', status: 'pending' }),
    ]);

    expect(summary.history.map((view) => view.appointment.id)).toEqual(['a2', 'a1']);
  });
});

describe('filtros y orden', () => {
  const patients = [patient('pt1', 'Ana'), patient('pt2', 'Beto'), patient('pt3', 'Carla'), patient('pt4', 'Dora')];
  const summaries = buildPatientSummaries(
    patients,
    [
      appointment({ id: 'a1', patientId: 'pt1', status: 'confirmed', startTime: '11:00' }),
      appointment({ id: 'a2', patientId: 'pt2', date: '2026-11-30', status: 'pending' }),
      appointment({ id: 'a3', patientId: 'pt2', date: '2026-10-01', status: 'completed' }),
      appointment({ id: 'a4', patientId: 'pt3', date: '2026-03-01', status: 'completed' }),
      appointment({ id: 'a5', patientId: 'pt4', date: '2026-11-26', status: 'confirmed' }),
      appointment({ id: 'a6', patientId: 'pt4', date: '2026-11-01', status: 'completed' }),
    ],
    lookups,
    TODAY,
  );

  it('filtra por cita hoy, por confirmar, inactivos y nuevos', () => {
    const names = (filter: Parameters<typeof filterPatientSummaries>[1]) =>
      filterPatientSummaries(summaries, filter, '').map((summary) => summary.patient.firstName);

    expect(names('today')).toEqual(['Ana']);
    expect(names('unconfirmed')).toEqual(['Beto']);
    expect(names('inactive')).toEqual(['Carla']);
    expect(names('new')).toEqual(['Ana']);
  });

  it('busca por nombre o DNI dentro del filtro', () => {
    expect(filterPatientSummaries(summaries, 'all', 'carla').map((s) => s.patient.id)).toEqual(['pt3']);
    expect(filterPatientSummaries(summaries, 'all', 'pt4').map((s) => s.patient.id)).toEqual(['pt4']);
  });

  it('cuenta cuántos pacientes caen en cada filtro', () => {
    expect(countPatientFilters(summaries)).toEqual({ all: 4, today: 1, unconfirmed: 1, inactive: 1, new: 1 });
  });

  it('ordena por próxima cita; los que no tienen van al final', () => {
    expect(sortPatientSummaries(summaries, 'next').map((s) => s.patient.firstName)).toEqual([
      'Ana',
      'Dora',
      'Beto',
      'Carla',
    ]);
  });

  it('ordena por última visita (más reciente primero) o por nombre', () => {
    expect(sortPatientSummaries(summaries, 'lastVisit').map((s) => s.patient.firstName)).toEqual([
      'Dora',
      'Beto',
      'Carla',
      'Ana',
    ]);
    expect(sortPatientSummaries(summaries, 'name').map((s) => s.patient.firstName)).toEqual([
      'Ana',
      'Beto',
      'Carla',
      'Dora',
    ]);
  });
});
