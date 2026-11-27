import { describe, expect, it } from 'vitest';
import type { PatientHistoryEntry } from '../../services/reportService';
import {
  ageFromBirthDate,
  buildTreatments,
  findNextAppointment,
  formatHistoryNumber,
  historyDocumentCode,
  matchesPatientSearch,
  patientSinceLabel,
  summarizeHistory,
} from './patientHistory';

function entry(overrides: Partial<PatientHistoryEntry>): PatientHistoryEntry {
  return {
    id: overrides.id ?? Math.random().toString(36).slice(2),
    date: '2026-09-18',
    startTime: '10:00',
    status: 'completed',
    reason: 'Dolor o sensibilidad',
    serviceId: 'endo',
    serviceName: 'Endodoncia',
    serviceSessions: 4,
    professionalId: 'd1',
    professionalName: 'Lucía Mendoza Paz',
    branchId: 'b1',
    branchName: 'Bagua',
    ...overrides,
  };
}

const today = '2026-10-14';

describe('Historia de paciente: datos del paciente', () => {
  it('N.º de historia con cinco cifras y código del documento', () => {
    expect(formatHistoryNumber(245)).toBe('HC-00245');
    expect(formatHistoryNumber(null)).toBe('—');
    expect(historyDocumentCode(245, '2026-10-14')).toBe('HIS-HC00245-2026-1014');
  });

  it('edad cumplida a la fecha', () => {
    expect(ageFromBirthDate('1992-03-01', today)).toBe(34);
    expect(ageFromBirthDate('1992-10-15', today)).toBe(33);
    expect(ageFromBirthDate(null, today)).toBeNull();
  });

  it('tiempo como paciente', () => {
    expect(patientSinceLabel('2024-03-12', today)).toBe('2 años y 7 meses como paciente');
    expect(patientSinceLabel('2026-09-20', today)).toBe('Menos de un mes como paciente');
    expect(patientSinceLabel('2025-10-14', today)).toBe('1 año como paciente');
  });

  it('busca por DNI, nombre o N.º de historia', () => {
    const patient = { dni: '46831572', firstName: 'Sofía', lastName: 'Guevara Núñez', historyNumber: 245 };
    expect(matchesPatientSearch(patient, '4683')).toBe(true);
    expect(matchesPatientSearch(patient, 'guevara nunez')).toBe(true);
    expect(matchesPatientSearch(patient, 'HC-00245')).toBe(true);
    expect(matchesPatientSearch(patient, '245')).toBe(true);
    expect(matchesPatientSearch(patient, 'rojas')).toBe(false);
  });
});

describe('Historia de paciente: resumen y próxima cita', () => {
  const entries = [
    entry({ id: 'n', date: '2026-10-16', startTime: '09:30', status: 'confirmed', serviceName: 'Curación con resina', serviceSessions: 1 }),
    entry({ id: 'a', date: '2026-09-18' }),
    entry({ id: 'c', date: '2026-03-27', status: 'cancelled', branchName: 'Jaén' }),
    entry({ id: 'f', date: '2024-03-12' }),
  ];

  it('atendidas, canceladas, primera, última atención y sede', () => {
    expect(summarizeHistory(entries)).toEqual({
      completed: 2,
      cancelled: 1,
      firstDate: '2024-03-12',
      lastAttention: '2026-09-18',
      branchName: 'Bagua',
    });
  });

  it('la próxima cita pendiente o confirmada desde ahora', () => {
    expect(findNextAppointment(entries, today, '08:00')?.id).toBe('n');
    expect(findNextAppointment(entries, '2026-10-16', '10:00')).toBeNull();
  });
});

describe('Historia de paciente: tratamientos', () => {
  it('servicio de varias sesiones con próxima sesión: En tratamiento, sesión atendidas de total', () => {
    const treatments = buildTreatments(
      [
        entry({ date: '2026-08-21' }),
        entry({ date: '2026-09-04' }),
        entry({ date: '2026-09-18' }),
        entry({ date: '2026-10-16', status: 'confirmed' }),
        // Una sesión: no es tratamiento.
        entry({ serviceId: 'cons', serviceName: 'Consulta y diagnóstico', serviceSessions: 1 }),
      ],
      today,
      '08:00',
    );

    expect(treatments).toEqual([
      {
        key: 'endo',
        serviceName: 'Endodoncia',
        startDate: '2026-08-21',
        completedSessions: 3,
        totalSessions: 4,
        doctorName: 'Lucía Mendoza Paz',
        nextSession: '2026-10-16',
        status: 'in_treatment',
      },
    ]);
  });

  it('sin próxima sesión y sin volver en 60 días, o con la última cita cancelada: Cancelado', () => {
    const treatments = buildTreatments(
      [
        entry({ serviceId: 'blanq', serviceName: 'Blanqueamiento dental', serviceSessions: 2, date: '2025-06-30', professionalName: 'Milagros Rojas Díaz' }),
        entry({ serviceId: 'orto', serviceName: 'Ortodoncia', serviceSessions: 12, date: '2026-09-30' }),
        entry({ serviceId: 'orto', serviceName: 'Ortodoncia', serviceSessions: 12, date: '2026-10-07', status: 'cancelled' }),
        // Sesión reciente sin próxima cita: todavía en tratamiento.
        entry({ serviceId: 'perio', serviceName: 'Periodoncia', serviceSessions: 3, date: '2026-09-20' }),
      ],
      today,
      '08:00',
    );

    expect(treatments.map((t) => [t.serviceName, t.status, `${t.completedSessions} de ${t.totalSessions}`])).toEqual([
      ['Periodoncia', 'in_treatment', '1 de 3'],
      ['Ortodoncia', 'cancelled', '1 de 12'],
      ['Blanqueamiento dental', 'cancelled', '1 de 2'],
    ]);
  });

  it('un tratamiento con todas sus sesiones atendidas ya no se lista; uno nuevo del mismo servicio, sí', () => {
    const base = { serviceId: 'blanq', serviceName: 'Blanqueamiento dental', serviceSessions: 2 };
    const finished = [entry({ ...base, date: '2026-01-10' }), entry({ ...base, date: '2026-01-24' })];

    expect(buildTreatments(finished, today, '08:00')).toEqual([]);

    const restarted = buildTreatments([...finished, entry({ ...base, date: '2026-10-01' })], today, '08:00');
    expect(restarted).toMatchObject([{ startDate: '2026-10-01', completedSessions: 1, status: 'in_treatment' }]);
  });
});
