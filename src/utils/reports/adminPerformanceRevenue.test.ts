import { describe, expect, it } from 'vitest';
import type { ReportAppointment } from './adminData';
import {
  demandBySpecialty,
  performanceBy,
  performanceReadings,
  servicesRanking,
  summarizePerformance,
} from './adminPerformance';
import { revenueBy, revenueReadings, revenueSeries, summarizeRevenue } from './adminRevenue';
import { monthBuckets } from './period';

function row(overrides: Partial<ReportAppointment>): ReportAppointment {
  return {
    id: Math.random().toString(36).slice(2),
    code: 'KD-1',
    patientId: 'p1',
    professionalId: 'd1',
    branchId: 'bagua',
    serviceId: 'limp',
    date: '2026-08-10',
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

const endo = { serviceId: 'endo', serviceLabel: 'Endodoncia', specialtyId: 'endo', specialtyName: 'Endodoncia', durationMinutes: 90, price: 350, listPrice: 380 };

const rows = [
  row({}),
  row({ patientId: 'p2' }),
  row({ ...endo, professionalId: 'd2', doctorName: 'Lucía Mendoza Paz' }),
  row({ ...endo, professionalId: 'd2', doctorName: 'Lucía Mendoza Paz', status: 'cancelled' }),
  row({ branchId: 'jaen', branchName: 'Jaén', professionalId: 'd3', doctorName: 'Ana Torres Ríos', date: '2026-09-02' }),
];

describe('Reporte de desempeño', () => {
  it('resumen: horas clínicas, promedios por doctora y mayor demanda', () => {
    const summary = summarizePerformance(rows);

    expect(summary).toMatchObject({ attentions: 4, hours: 3, doctors: 3, branches: 2, minutesPerAttention: 45 });
    expect(summary.attentionsPerDoctor).toBeCloseTo(4 / 3);
    expect(summary.topSpecialty).toEqual({ label: 'Odontología general', share: 75 });
  });

  it('demanda por especialidad', () => {
    expect(demandBySpecialty(rows)).toEqual([
      { label: 'Odontología general', value: 3, share: 75 },
      { label: 'Endodoncia', value: 1, share: 25 },
    ]);
  });

  it('por doctora: atenciones, pacientes, horas, minutos por atención y cancelación', () => {
    const doctors = performanceBy(rows, (item) => item.professionalId, (item) => item.doctorName, (item) => item.branchName);

    expect(doctors[0]).toMatchObject({ label: 'Milagros Rojas Díaz', attentions: 2, patients: 2, hours: 1, minutesPerAttention: 30 });
    expect(doctors.find((item) => item.key === 'd2')).toMatchObject({ attentions: 1, hours: 1.5, cancellation: 50 });
  });

  it('ranking de servicios y lectura', () => {
    const services = servicesRanking(rows);
    expect(services).toEqual([
      { label: 'Limpieza dental', specialty: 'Odontología general', attentions: 3, share: 75, minutes: 30, hours: 1.5 },
      { label: 'Endodoncia', specialty: 'Endodoncia', attentions: 1, share: 25, minutes: 90, hours: 1.5 },
    ]);

    const doctors = performanceBy(rows, (item) => item.professionalId, (item) => item.doctorName);
    const branches = performanceBy(rows, (item) => item.branchId, (item) => item.branchName);
    expect(performanceReadings({ doctors, groups: branches, services })).toEqual([
      'Milagros Rojas Díaz lidera en atenciones (2); la diferencia con la última es de 1 atención.',
      'Bagua tiene la mayor tasa de cancelación (25.0 %).',
      'Endodoncia ocupa 90 min por atención: conviene planificar su agenda en bloques largos.',
    ]);
  });
});

describe('Reporte de ingresos', () => {
  it('resumen: ingreso con el precio de la cita, ticket, no realizado y proyectado a 30 días', () => {
    const upcoming = [
      row({ status: 'pending', date: '2026-10-20', price: 100 }),
      row({ status: 'confirmed', date: '2026-11-30', price: 999 }),
    ];
    const summary = summarizeRevenue(rows, [...rows, ...upcoming], '2026-10-14', '08:00');

    expect(summary).toEqual({
      income: 80 + 80 + 350 + 80,
      attentions: 4,
      ticket: 590 / 4,
      notRealized: 350,
      cancelledCount: 1,
      projected: 100,
      projectedCount: 1,
      topSpecialty: { label: 'Endodoncia', share: (350 / 590) * 100 },
    });
  });

  it('ingreso por mes y por servicio con su precio vigente', () => {
    expect(revenueSeries(rows, monthBuckets('2026-08-01', '2026-09-30'))).toEqual([
      { label: 'Agosto', value: 510 },
      { label: 'Setiembre', value: 80 },
    ]);

    const byService = revenueBy(rows, (item) => item.serviceLabel, (item) => item.serviceLabel, (item) => item.specialtyName);
    expect(byService[0]).toMatchObject({ label: 'Endodoncia', attentions: 1, income: 350, listPrice: 380, detail: 'Endodoncia' });
    expect(byService[1]).toMatchObject({ label: 'Limpieza dental', attentions: 3, income: 240, ticket: 80 });
  });

  it('lectura: servicios de alto valor y lo que no se realizó', () => {
    const byService = revenueBy(rows, (item) => item.serviceLabel, (item) => item.serviceLabel);
    const summary = summarizeRevenue(rows, rows, '2026-10-14', '08:00');

    expect(revenueReadings({ byService, summary })).toEqual([
      'Endodoncia concentra buena parte del ingreso con pocas atenciones: conviene proteger esos horarios en la agenda.',
      'La cita cancelada dejó de sumar un estimado de S/ 350.',
    ]);
  });
});
