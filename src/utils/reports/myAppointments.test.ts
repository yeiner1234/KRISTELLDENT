import { describe, expect, it } from 'vitest';
import type { Appointment } from '../../types/Appointment';
import type { Patient } from '../../types/Patient';
import {
  attendanceRate,
  buildAttendanceSeries,
  buildUnclosedRows,
  buildUpcomingRows,
  filterMyAppointments,
  myAppointmentsReadings,
  summarizeMyAppointments,
} from './myAppointments';
import { monthBuckets } from './period';

function appt(overrides: Partial<Appointment>): Appointment {
  return {
    id: overrides.id ?? Math.random().toString(36).slice(2),
    code: 'KD-1',
    patientId: 'p1',
    professionalId: 'd1',
    branchId: 'b1',
    serviceId: 's1',
    date: '2026-07-10',
    startTime: '08:30',
    endTime: '09:00',
    status: 'completed',
    reason: 'Dolor o sensibilidad',
    serviceName: 'Endodoncia',
    ...overrides,
  };
}

const patients: Patient[] = [
  { id: 'p1', dni: '46831572', firstName: 'Sofía', lastName: 'Guevara Núñez', phone: null, email: null },
  { id: 'p2', dni: '43906715', firstName: 'Fabián', lastName: 'Olano Ruiz', phone: null, email: null },
];

const filters = { from: '2026-07-01', to: '2026-09-30', branchId: '', serviceName: '', status: 'all' as const };

describe('Mis citas: filtros', () => {
  it('deja las citas del periodo, la sede, el servicio y el estado elegidos', () => {
    const list = [
      appt({ id: 'a', date: '2026-06-30' }),
      appt({ id: 'b', date: '2026-07-01' }),
      appt({ id: 'c', date: '2026-09-30', branchId: 'b2' }),
      appt({ id: 'd', date: '2026-08-15', serviceName: 'Limpieza dental' }),
      appt({ id: 'e', date: '2026-08-16', status: 'cancelled' }),
    ];

    expect(filterMyAppointments(list, filters).map((a) => a.id)).toEqual(['b', 'c', 'd', 'e']);
    expect(filterMyAppointments(list, { ...filters, branchId: 'b2' }).map((a) => a.id)).toEqual(['c']);
    expect(filterMyAppointments(list, { ...filters, serviceName: 'Limpieza dental' }).map((a) => a.id)).toEqual(['d']);
    expect(filterMyAppointments(list, { ...filters, status: 'cancelled' }).map((a) => a.id)).toEqual(['e']);
  });
});

describe('Mis citas: resumen', () => {
  it('tasa de atención = atendidas ÷ (atendidas + canceladas); sin cierres, null', () => {
    expect(attendanceRate(221, 19)).toBeCloseTo(92.1, 1);
    expect(attendanceRate(0, 0)).toBeNull();
  });

  it('cuenta registradas, atendidas, canceladas y las pasadas sin estado final', () => {
    const list = [
      appt({ status: 'completed' }),
      appt({ status: 'completed' }),
      appt({ status: 'cancelled' }),
      appt({ status: 'confirmed', date: '2026-09-05' }),
      appt({ status: 'in_room', date: '2026-09-23' }),
      // Hoy o después: todavía no es "sin cerrar".
      appt({ status: 'pending', date: '2026-10-14' }),
    ];

    expect(summarizeMyAppointments(list, '2026-10-14')).toEqual({
      total: 6,
      completed: 2,
      cancelled: 1,
      rate: (2 / 3) * 100,
      unclosed: 2,
    });
  });
});

describe('Mis citas: evolución', () => {
  it('atendidas y canceladas por mes', () => {
    const list = [
      appt({ date: '2026-07-02' }),
      appt({ date: '2026-07-20', status: 'cancelled' }),
      appt({ date: '2026-08-02' }),
      appt({ date: '2026-08-03', status: 'pending' }),
    ];

    expect(buildAttendanceSeries(list, monthBuckets('2026-07-01', '2026-08-31'))).toEqual([
      { key: '2026-07', label: 'Julio', completed: 1, cancelled: 1 },
      { key: '2026-08', label: 'Agosto', completed: 1, cancelled: 0 },
    ]);
  });
});

describe('Mis citas: tablas', () => {
  it('citas sin cerrar, de la más antigua, con días de atraso', () => {
    const list = [
      appt({ id: 'x', status: 'pending', date: '2026-09-23', startTime: '09:30', patientId: 'p2' }),
      appt({ id: 'y', status: 'confirmed', date: '2026-09-05', startTime: '08:30' }),
      appt({ id: 'z', status: 'completed', date: '2026-09-01' }),
    ];

    expect(buildUnclosedRows(list, patients, '2026-10-14')).toEqual([
      { id: 'y', date: '2026-09-05', time: '08:30', patientName: 'Guevara Núñez, Sofía', status: 'confirmed', delayDays: 39 },
      { id: 'x', date: '2026-09-23', time: '09:30', patientName: 'Olano Ruiz, Fabián', status: 'pending', delayDays: 21 },
    ]);
  });

  it('próximas citas desde ahora, pendientes o confirmadas, y cuántas hay en 30 días', () => {
    const list = [
      appt({ id: 'pasada', status: 'pending', date: '2026-10-14', startTime: '08:00' }),
      appt({ id: 'hoy', status: 'confirmed', date: '2026-10-14', startTime: '16:00', reason: 'Urgencia dental' }),
      appt({ id: 'luego', status: 'pending', date: '2026-10-20', startTime: '09:30' }),
      appt({ id: 'lejos', status: 'pending', date: '2026-12-20' }),
      appt({ id: 'cancelada', status: 'cancelled', date: '2026-10-15' }),
    ];

    const result = buildUpcomingRows(list, patients, '2026-10-14', '15:00', 2);

    expect(result.within30Days).toBe(2);
    expect(result.total).toBe(3);
    expect(result.rows.map((row) => row.id)).toEqual(['hoy', 'luego']);
    expect(result.rows[0]).toMatchObject({ serviceName: 'Endodoncia', reason: 'Urgencia dental', status: 'confirmed' });
  });
});

describe('Mis citas: lectura del periodo', () => {
  it('compara con la sede, la evolución y avisa de las citas sin cerrar', () => {
    const readings = myAppointmentsReadings({
      rate: 92.1,
      branchRate: 89.4,
      series: [
        { key: '2026-07', label: 'Julio', completed: 70, cancelled: 7 },
        { key: '2026-09', label: 'Setiembre', completed: 77, cancelled: 6 },
      ],
      unclosed: 2,
    });

    expect(readings).toEqual([
      'Su tasa de atención (92.1 %) supera el promedio de la sede (89.4 %).',
      'Las atenciones crecieron de 70 en julio a 77 en setiembre.',
      'Tiene 2 citas pasadas sin estado final; actualícelas para que el reporte sea exacto.',
    ]);
  });

  it('sin datos dice que no hay citas cerradas', () => {
    expect(myAppointmentsReadings({ rate: null, branchRate: null, series: [], unclosed: 0 })).toEqual([
      'No hay citas atendidas ni canceladas en el periodo.',
      'Todas sus citas pasadas tienen estado final.',
    ]);
  });
});
