import { describe, expect, it } from 'vitest';
import type { Appointment } from '../../types/Appointment';
import type { Patient } from '../../types/Patient';
import { buildMyPatientRows, buildPatientSeries, myPatientsReadings, summarizeMyPatients } from './myPatients';
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
    reason: '',
    serviceName: 'Endodoncia',
    ...overrides,
  };
}

const patients: Patient[] = [
  { id: 'p1', dni: '46831572', firstName: 'Sofía', lastName: 'Guevara Núñez', phone: null, email: null },
  { id: 'p2', dni: '44228390', firstName: 'Teresa', lastName: 'Huamán Cubas', phone: null, email: null },
  { id: 'p3', dni: '45179063', firstName: 'Marco', lastName: 'Inga Sopla', phone: null, email: null },
];

const filters = { from: '2026-07-01', to: '2026-09-30', branchId: '', serviceName: '', type: 'all' as const };
const today = '2026-10-14';

// p1: ya venía a la clínica (2024), 3 atenciones en el periodo → recurrente y frecuente.
// p2: primera atención en agosto → nueva. p3: atendida antes con otra doctora, sin próxima cita.
const appointments = [
  appt({ patientId: 'p1', date: '2026-07-15' }),
  appt({ patientId: 'p1', date: '2026-08-21' }),
  appt({ patientId: 'p1', date: '2026-09-18', serviceName: 'Curación con resina' }),
  appt({ patientId: 'p1', date: '2026-10-16', status: 'confirmed' }),
  appt({ patientId: 'p2', date: '2026-08-24', serviceName: 'Consulta y diagnóstico' }),
  appt({ patientId: 'p2', date: '2026-09-10', status: 'cancelled' }),
  appt({ patientId: 'p2', date: '2026-10-15', status: 'pending' }),
  appt({ patientId: 'p3', date: '2026-09-09' }),
  // Fuera del periodo: no cuenta como atención del periodo.
  appt({ patientId: 'p3', date: '2026-06-01' }),
];
const firstVisits = new Map([
  ['p1', '2024-03-12'],
  ['p2', '2026-08-24'],
  ['p3', '2025-01-20'],
]);

describe('Mis pacientes: filas', () => {
  it('un paciente por fila (más citas y atención más reciente primero), con su tipo, citas atendidas, última atención y próxima cita', () => {
    const rows = buildMyPatientRows(appointments, patients, firstVisits, filters, today, '08:00');

    expect(rows).toEqual([
      {
        patientId: 'p1',
        patientName: 'Guevara Núñez, Sofía',
        dni: '46831572',
        type: 'recurrent',
        frequent: true,
        completedCount: 3,
        lastAttention: '2026-09-18',
        lastService: 'Curación con resina',
        nextAppointment: '2026-10-16',
      },
      {
        patientId: 'p3',
        patientName: 'Inga Sopla, Marco',
        dni: '45179063',
        type: 'recurrent',
        frequent: false,
        completedCount: 1,
        lastAttention: '2026-09-09',
        lastService: 'Endodoncia',
        nextAppointment: null,
      },
      {
        patientId: 'p2',
        patientName: 'Huamán Cubas, Teresa',
        dni: '44228390',
        type: 'new',
        frequent: false,
        completedCount: 1,
        lastAttention: '2026-08-24',
        lastService: 'Consulta y diagnóstico',
        nextAppointment: '2026-10-15',
      },
    ]);
  });

  it('filtra por tipo de paciente', () => {
    const only = (type: 'new' | 'recurrent' | 'frequent') =>
      buildMyPatientRows(appointments, patients, firstVisits, { ...filters, type }, today, '08:00').map((row) => row.patientId);

    expect(only('new')).toEqual(['p2']);
    expect(only('recurrent')).toEqual(['p1', 'p3']);
    expect(only('frequent')).toEqual(['p1']);
  });

  it('sin dato de la clínica, la primera atención es la primera con ella', () => {
    const rows = buildMyPatientRows(appointments, patients, new Map(), filters, today, '08:00');

    expect(rows.find((row) => row.patientId === 'p3')?.type).toBe('recurrent');
    expect(rows.find((row) => row.patientId === 'p1')?.type).toBe('new');
  });
});

describe('Mis pacientes: resumen, evolución y lectura', () => {
  it('cuenta atendidos, nuevos, recurrentes, frecuentes y citas por paciente', () => {
    const rows = buildMyPatientRows(appointments, patients, firstVisits, filters, today, '08:00');

    expect(summarizeMyPatients(rows)).toEqual({
      attended: 3,
      newCount: 1,
      recurrentCount: 2,
      frequentCount: 1,
      withoutNext: 1,
      appointmentsPerPatient: 5 / 3,
    });
  });

  it('pacientes atendidos por mes, nuevos o recurrentes', () => {
    const series = buildPatientSeries(appointments, firstVisits, filters, monthBuckets('2026-07-01', '2026-09-30'));

    expect(series).toEqual([
      { key: '2026-07', label: 'Julio', newCount: 0, recurrentCount: 1 },
      { key: '2026-08', label: 'Agosto', newCount: 1, recurrentCount: 1 },
      { key: '2026-09', label: 'Setiembre', newCount: 0, recurrentCount: 2 },
    ]);
  });

  it('lectura del periodo', () => {
    expect(
      myPatientsReadings({
        summary: { attended: 142, newCount: 34, recurrentCount: 108, frequentCount: 21, withoutNext: 12, appointmentsPerPatient: 1.56 },
        series: [
          { key: '2026-07', label: 'Julio', newCount: 10, recurrentCount: 34 },
          { key: '2026-09', label: 'Setiembre', newCount: 13, recurrentCount: 38 },
        ],
      }),
    ).toEqual([
      '76 % de sus pacientes ya se habían atendido antes en la clínica.',
      'Los pacientes nuevos subieron de 10 en julio a 13 en setiembre.',
      '12 pacientes no tienen una próxima cita: conviene programar su seguimiento.',
    ]);
  });
});
