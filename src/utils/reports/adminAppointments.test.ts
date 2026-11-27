import { describe, expect, it } from 'vitest';
import type { Patient } from '../../types/Patient';
import type { ReportAppointment } from './adminData';
import {
  attendedByWeekday,
  buildToConfirmRows,
  buildUnclosedReportRows,
  highestCancellationNote,
  specialtyStats,
  statsBy,
  summarizeAppointments,
  unclosedConcentrationNote,
  workingDaysLimit,
} from './adminAppointments';

function row(overrides: Partial<ReportAppointment>): ReportAppointment {
  return {
    id: overrides.id ?? Math.random().toString(36).slice(2),
    code: 'KD-1',
    patientId: 'p1',
    professionalId: 'd1',
    branchId: 'bagua',
    serviceId: 's1',
    date: '2026-09-07',
    startTime: '09:00',
    endTime: '09:30',
    status: 'completed',
    reason: '',
    specialtyId: 'gen',
    specialtyName: 'Odontología general',
    serviceLabel: 'Limpieza dental',
    durationMinutes: 30,
    price: 80,
    listPrice: 80,
    doctorName: 'Milagros Rojas Díaz',
    branchName: 'Bagua',
    ...overrides,
  };
}

const patients: Patient[] = [{ id: 'p1', dni: '46831572', firstName: 'Kevin', lastName: 'Ríos Delgado', phone: null, email: null }];
const today = '2026-10-14';

describe('Reporte de citas', () => {
  it('resumen: tasas, sin cerrar y anticipación promedio', () => {
    const summary = summarizeAppointments(
      [
        row({ createdAt: '2026-09-03T15:00:00+00:00' }),
        row({ status: 'cancelled', createdAt: '2026-09-01T15:00:00+00:00' }),
        row({ status: 'confirmed', date: '2026-09-20' }),
        row({ status: 'pending', date: '2026-10-20' }),
      ],
      today,
    );

    expect(summary).toEqual({
      total: 4,
      completed: 1,
      cancelled: 1,
      unclosed: 1,
      attendanceRate: 50,
      cancellationRate: 50,
      leadDays: 5,
    });
  });

  it('atendidas por día de lunes a sábado', () => {
    // 2026-09-07 es lunes; 2026-09-12, sábado.
    const days = attendedByWeekday([row({}), row({}), row({ date: '2026-09-12' }), row({ status: 'cancelled' })]);
    expect(days[0]).toEqual({ label: 'Lunes', value: 2 });
    expect(days[5]).toEqual({ label: 'Sábado', value: 1 });
    expect(days).toHaveLength(6);
  });

  it('comparativo por sede ordenado por registradas, con su nota de sin cerrar', () => {
    const rows = [
      row({ branchId: 'jaen', branchName: 'Jaén' }),
      row({ branchId: 'bagua', status: 'confirmed', date: '2026-09-01' }),
      row({ branchId: 'bagua', status: 'cancelled' }),
    ];
    const stats = statsBy(rows, (item) => item.branchId, (item) => item.branchName, today);

    expect(stats.map((item) => [item.label, item.registered, item.unclosed])).toEqual([
      ['Bagua', 2, 1],
      ['Jaén', 1, 0],
    ]);
    expect(unclosedConcentrationNote(stats, 1)).toBe('Bagua concentra 1 de las 1 citas sin cerrar.');
  });

  it('nota de la cancelación más alta por doctora', () => {
    const stats = statsBy(
      [
        row({ professionalId: 'a', doctorName: 'Ana' }),
        row({ professionalId: 'a', doctorName: 'Ana', status: 'cancelled' }),
        row({ professionalId: 'b', doctorName: 'Bea' }),
        row({ professionalId: 'b', doctorName: 'Bea' }),
        row({ professionalId: 'b', doctorName: 'Bea', status: 'cancelled' }),
      ],
      (item) => item.professionalId,
      (item) => `Dra. ${item.doctorName}`,
      today,
    );

    expect(highestCancellationNote(stats)).toBe(
      'Dra. Ana concentra la mayor tasa de cancelación (50.0 %): revisar la confirmación previa de sus citas.',
    );
  });

  it('por especialidad: atendidas, % del total y duración promedio', () => {
    const stats = specialtyStats([
      row({}),
      row({}),
      row({ specialtyId: 'endo', specialtyName: 'Endodoncia', durationMinutes: 90 }),
      row({ specialtyId: 'endo', specialtyName: 'Endodoncia', status: 'cancelled' }),
    ]);

    expect(stats[0]).toMatchObject({ label: 'Odontología general', completed: 2, avgDuration: 30 });
    expect(stats[0].share).toBeCloseTo(66.7, 1);
    expect(stats[1]).toMatchObject({ label: 'Endodoncia', completed: 1, cancelled: 1, attendanceRate: 50, avgDuration: 90 });
  });

  it('citas sin cerrar con sede, doctora y atraso', () => {
    const rows = buildUnclosedReportRows([row({ status: 'confirmed', date: '2026-07-18', startTime: '10:30' })], patients, today);
    expect(rows).toEqual([
      {
        id: rows[0].id,
        date: '2026-07-18',
        time: '10:30',
        branchName: 'Bagua',
        patientName: 'Ríos Delgado, Kevin',
        doctorName: 'Milagros Rojas Díaz',
        status: 'confirmed',
        delayDays: 88,
      },
    ]);
  });

  it('próximas por confirmar: pendientes en los siguientes 5 días hábiles', () => {
    // Miércoles 14/10: 5 días hábiles llegan al martes 20/10 (el domingo no cuenta).
    expect(workingDaysLimit(today, 5)).toBe('2026-10-20');

    const rows = buildToConfirmRows(
      [
        row({ id: 'si', status: 'pending', date: '2026-10-15' }),
        row({ id: 'confirmada', status: 'confirmed', date: '2026-10-15' }),
        row({ id: 'lejos', status: 'pending', date: '2026-10-21' }),
        row({ id: 'ya-paso', status: 'pending', date: today, startTime: '08:00' }),
      ],
      patients,
      today,
      '12:00',
      5,
    );
    expect(rows.map((item) => item.id)).toEqual(['si']);
  });
});
