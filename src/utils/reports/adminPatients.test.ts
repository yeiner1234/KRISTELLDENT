import { describe, expect, it } from 'vitest';
import type { Patient } from '../../types/Patient';
import type { ReportAppointment } from './adminData';
import { frequentPatients, patientsBy, patientsReadings, patientsSeries, summarizePatients } from './adminPatients';
import { monthBuckets } from './period';

function row(overrides: Partial<ReportAppointment>): ReportAppointment {
  return {
    id: Math.random().toString(36).slice(2),
    code: 'KD-1',
    patientId: 'p1',
    professionalId: 'd1',
    branchId: 'bagua',
    serviceId: 's1',
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
    doctorName: 'Lucía Mendoza Paz',
    branchName: 'Bagua',
    ...overrides,
  };
}

const period = { from: '2026-07-01', to: '2026-09-30' };
const patients: Patient[] = [
  { id: 'p1', dni: '46831572', firstName: 'Sofía', lastName: 'Guevara Núñez', phone: null, email: null },
  { id: 'p2', dni: '44228390', firstName: 'Teresa', lastName: 'Huamán Cubas', phone: null, email: null },
];

// p1: viene desde 2024 (dato de la clínica), 3 atenciones en el año → frecuente.
// p2: primera atención en agosto, en Jaén → nueva.
const rows = [
  row({ patientId: 'p1', date: '2026-07-15' }),
  row({ patientId: 'p1', date: '2026-08-21' }),
  row({ patientId: 'p1', date: '2026-09-18', professionalId: 'd2', doctorName: 'Milagros Rojas Díaz' }),
  row({ patientId: 'p2', date: '2026-08-24', branchId: 'jaen', branchName: 'Jaén' }),
  row({ patientId: 'p2', date: '2026-09-10', status: 'cancelled' }),
];
const firstVisits = new Map([
  ['p1', '2024-03-12'],
  ['p2', '2026-08-24'],
]);

describe('Reporte de pacientes', () => {
  it('resumen: atendidos, nuevos, recurrentes, frecuentes y citas por paciente', () => {
    expect(summarizePatients(rows, period, firstVisits)).toEqual({
      attended: 2,
      newCount: 1,
      recurrentCount: 1,
      frequentCount: 1,
      appointmentsPerPatient: 2,
    });
  });

  it('evolución mensual de nuevos y recurrentes', () => {
    expect(patientsSeries(rows, monthBuckets(period.from, period.to), firstVisits)).toEqual([
      { key: '2026-07', label: 'Julio', newCount: 0, recurrentCount: 1 },
      { key: '2026-08', label: 'Agosto', newCount: 1, recurrentCount: 1 },
      { key: '2026-09', label: 'Setiembre', newCount: 0, recurrentCount: 1 },
    ]);
  });

  it('comparativo por sede: nuevo es la primera atención en esa sede', () => {
    const groups = patientsBy(rows, period, (item) => item.branchId, (item) => item.branchName, {
      firstVisits,
      newInGroup: true,
    });

    // En Bagua, p1 se atendió por primera vez (en la sede visible) en julio: es nuevo en la sede.
    expect(groups.map((group) => [group.label, group.attended, group.newCount, group.frequentCount])).toEqual([
      ['Bagua', 1, 1, 1],
      ['Jaén', 1, 1, 0],
    ]);
  });

  it('desglose por doctora con nuevo según la clínica y su sede principal', () => {
    const groups = patientsBy(rows, period, (item) => item.professionalId, (item) => item.doctorName, {
      firstVisits,
      newInGroup: false,
      detailOf: (item) => item.specialtyName,
    });

    expect(groups[0]).toMatchObject({ label: 'Lucía Mendoza Paz', attended: 2, newCount: 1, recurrentCount: 1, recurrence: 50 });
    expect(groups[0].detail).toBe('Odontología general');
  });

  it('pacientes frecuentes con DNI enmascarado y doctora tratante', () => {
    expect(frequentPatients(rows, patients, period.to)).toEqual([
      {
        patientId: 'p1',
        patientName: 'Guevara Núñez, Sofía',
        maskedDni: '4683••••',
        branchName: 'Bagua',
        doctorName: 'Lucía Mendoza Paz',
        visits: 3,
        lastAttention: '2026-09-18',
      },
    ]);
  });

  it('lectura: nivel sede compara la recurrencia con la clínica', () => {
    const summary = { attended: 368, newCount: 93, recurrentCount: 275, frequentCount: 55, appointmentsPerPatient: 1.6 };
    const readings = patientsReadings({
      summary,
      series: [
        { key: '2026-07', label: 'Julio', newCount: 29, recurrentCount: 87 },
        { key: '2026-09', label: 'Setiembre', newCount: 33, recurrentCount: 96 },
      ],
      clinicRecurrence: 75,
      groups: [],
      isBranchLevel: true,
    });

    expect(readings).toEqual([
      'Setiembre registró el mayor ingreso de pacientes nuevos (33).',
      'La recurrencia de la sede es 74.7 %, en línea con el promedio de la clínica (75.0 %).',
    ]);
  });
});
