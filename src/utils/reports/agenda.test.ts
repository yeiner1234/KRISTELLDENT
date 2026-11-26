import { describe, expect, it } from 'vitest';
import {
  assignDoctorColors,
  branchHoursLabel,
  buildAgendaRows,
  buildDocumentCode,
  doctorInitials,
  firstSurname,
  formatAgendaDate,
  formatDoctorName,
  formatGeneratedAt,
  formatPatientName,
  matchesShift,
  matchesStatusFilter,
  reportRoleLabel,
  summarizeAgenda,
  sheetFitScale,
} from './agenda';
import type { Appointment, AppointmentStatus } from '../../types/Appointment';
import type { Patient } from '../../types/Patient';
import type { Professional } from '../../types/Professional';
import type { Service } from '../../types/Service';

function appointment(overrides: Partial<Appointment> & { id: string }): Appointment {
  return {
    code: 'KD-000001',
    patientId: 'pa1',
    professionalId: 'pr-mendoza',
    branchId: 'bagua',
    serviceId: 'sv1',
    date: '2026-10-15',
    startTime: '08:00',
    endTime: '08:30',
    status: 'confirmed' as AppointmentStatus,
    reason: '',
    ...overrides,
  };
}

function professional(id: string, fullName: string): Professional {
  return { id, fullName, role: null, bio: null, avatarPath: null, active: true, specialtyIds: [], branchIds: ['bagua'], serviceIds: [] };
}

const patients: Patient[] = [
  { id: 'pa1', dni: '12345678', firstName: 'Álvaro', lastName: 'Chumpitaz Rey', phone: null, email: null },
  { id: 'pa2', dni: '87654321', firstName: 'Teresa', lastName: 'Huamán Cubas', phone: null, email: null },
];
const professionals = [
  professional('pr-mendoza', 'Lucía Mendoza Paz'),
  professional('pr-rojas', 'María Rojas Díaz'),
  professional('pr-sanchez', 'Karen Sánchez Mori'),
];
const services = [{ id: 'sv1', name: 'Extracción simple' }] as Service[];
const lookups = { patients, professionals, services };

describe('buildDocumentCode', () => {
  it('usa las tres primeras letras de la sede sin tildes, el año y MMDD', () => {
    expect(buildDocumentCode('Bagua', '2026-10-15')).toBe('AGE-BAG-2026-1015');
    expect(buildDocumentCode('Jaén', '2026-01-05')).toBe('AGE-JAE-2026-0105');
  });

  it('ignora el prefijo "Sede" y los espacios', () => {
    expect(buildDocumentCode('Sede Utcubamba', '2026-12-31')).toBe('AGE-UTC-2026-1231');
  });
});

describe('formatAgendaDate', () => {
  it('da el día de la semana, el día, el mes abreviado de Perú y el año', () => {
    expect(formatAgendaDate('2026-10-15')).toBe('Jueves 15 oct 2026');
    expect(formatAgendaDate('2026-09-07')).toBe('Lunes 7 set 2026');
    expect(formatAgendaDate('2026-11-01')).toBe('Domingo 1 nov 2026');
  });
});

describe('formatGeneratedAt', () => {
  it('muestra la fecha y la hora en Lima aunque en UTC ya sea otro día', () => {
    expect(formatGeneratedAt(new Date('2026-10-15T02:30:00Z'))).toBe('14/10/2026 · 21:30');
    expect(formatGeneratedAt(new Date('2026-10-14T20:00:00Z'))).toBe('14/10/2026 · 15:00');
  });
});

describe('nombres de la doctora', () => {
  it('toma el primer nombre y el primer apellido para las iniciales', () => {
    expect(doctorInitials('Lucía Mendoza Paz')).toBe('LM');
    expect(doctorInitials('María José Rojas Díaz')).toBe('MR');
    expect(doctorInitials('Karen Sánchez')).toBe('KS');
  });

  it('abrevia el nombre: "Dra. L. Mendoza Paz"', () => {
    expect(formatDoctorName('Lucía Mendoza Paz')).toBe('Dra. L. Mendoza Paz');
    expect(formatDoctorName('María José Rojas Díaz')).toBe('Dra. M. Rojas Díaz');
    expect(formatDoctorName('Karen Sánchez')).toBe('Dra. K. Sánchez');
  });

  it('devuelve el primer apellido', () => {
    expect(firstSurname('Lucía Mendoza Paz')).toBe('Mendoza');
    expect(firstSurname('Karen Sánchez')).toBe('Sánchez');
  });

  it('asigna los colores por orden de apellido, sin importar el orden de llegada', () => {
    const colors = assignDoctorColors([...professionals].reverse());
    expect(colors.get('pr-mendoza')).toBe(0);
    expect(colors.get('pr-rojas')).toBe(1);
    expect(colors.get('pr-sanchez')).toBe(2);
    expect(assignDoctorColors([...professionals, professional('pr-zea', 'Ana Zea Ruiz')]).get('pr-zea')).toBe(0);
  });
});

describe('formatPatientName', () => {
  it('pone apellidos, nombres', () => {
    expect(formatPatientName('Álvaro', 'Chumpitaz Rey')).toBe('Chumpitaz Rey, Álvaro');
  });
});

describe('matchesShift', () => {
  it('mañana es antes de las 13:00 y tarde desde las 13:00', () => {
    expect(matchesShift('12:59', 'morning')).toBe(true);
    expect(matchesShift('13:00', 'morning')).toBe(false);
    expect(matchesShift('13:00', 'afternoon')).toBe(true);
    expect(matchesShift('08:00', 'afternoon')).toBe(false);
    expect(matchesShift('17:30', 'all')).toBe(true);
  });
});

describe('matchesStatusFilter', () => {
  it('por defecto deja pasar pendientes y confirmadas', () => {
    expect(matchesStatusFilter('pending', 'pending_confirmed')).toBe(true);
    expect(matchesStatusFilter('confirmed', 'pending_confirmed')).toBe(true);
    expect(matchesStatusFilter('cancelled', 'pending_confirmed')).toBe(false);
    expect(matchesStatusFilter('cancelled', 'all')).toBe(true);
    expect(matchesStatusFilter('in_room', 'in_room')).toBe(true);
    expect(matchesStatusFilter('completed', 'in_room')).toBe(false);
  });
});

describe('buildAgendaRows', () => {
  const appointments = [
    appointment({ id: 'a3', startTime: '13:30', professionalId: 'pr-rojas', patientId: 'pa2' }),
    appointment({ id: 'a2', startTime: '08:00', professionalId: 'pr-sanchez', status: 'pending' }),
    appointment({ id: 'a1', startTime: '08:00', professionalId: 'pr-mendoza' }),
    appointment({ id: 'x-otra-sede', branchId: 'jaen' }),
    appointment({ id: 'x-otro-dia', date: '2026-10-16' }),
    appointment({ id: 'x-cancelada', status: 'cancelled' }),
  ];
  const base = { branchId: 'bagua', date: '2026-10-15', professionalId: '', status: 'pending_confirmed', shift: 'all' } as const;

  it('filtra por sede, fecha y estado, y ordena por hora y luego por doctora', () => {
    const rows = buildAgendaRows(appointments, lookups, base);
    expect(rows.map((row) => row.id)).toEqual(['a1', 'a2', 'a3']);
    expect(rows[0]).toMatchObject({
      time: '08:00',
      patientName: 'Chumpitaz Rey, Álvaro',
      serviceName: 'Extracción simple',
      doctorName: 'Dra. L. Mendoza Paz',
      doctorInitials: 'LM',
      status: 'confirmed',
    });
  });

  it('el servicio sale de la copia guardada en la cita', () => {
    const rows = buildAgendaRows([appointment({ id: 'a1', serviceName: 'Extracción (precio 2025)' })], lookups, base);

    expect(rows[0].serviceName).toBe('Extracción (precio 2025)');
  });

  it('filtra por doctora y por turno', () => {
    expect(buildAgendaRows(appointments, lookups, { ...base, professionalId: 'pr-sanchez' }).map((r) => r.id)).toEqual([
      'a2',
    ]);
    expect(buildAgendaRows(appointments, lookups, { ...base, shift: 'afternoon' }).map((r) => r.id)).toEqual(['a3']);
  });
});

describe('summarizeAgenda', () => {
  it('cuenta citas, confirmadas, pendientes y doctoras con sus primeros apellidos ordenados', () => {
    const rows = buildAgendaRows(
      [
        appointment({ id: 'a1', professionalId: 'pr-sanchez' }),
        appointment({ id: 'a2', professionalId: 'pr-mendoza', status: 'pending' }),
        appointment({ id: 'a3', professionalId: 'pr-mendoza', startTime: '09:00' }),
        appointment({ id: 'a4', professionalId: 'pr-rojas', status: 'in_room' }),
      ],
      lookups,
      { branchId: 'bagua', date: '2026-10-15', professionalId: '', status: 'all', shift: 'all' },
    );
    expect(summarizeAgenda(rows)).toEqual({
      total: 4,
      confirmed: 2,
      pending: 1,
      doctorCount: 3,
      doctorSurnames: 'Mendoza · Rojas · Sánchez',
    });
  });

  it('con la agenda vacía todo es cero', () => {
    expect(summarizeAgenda([])).toEqual({ total: 0, confirmed: 0, pending: 0, doctorCount: 0, doctorSurnames: '' });
  });
});

describe('reportRoleLabel', () => {
  it('traduce los roles que ven el reporte', () => {
    expect(reportRoleLabel('tecnica')).toBe('Técnica');
    expect(reportRoleLabel('admin_sede')).toBe('Administradora de sede');
    expect(reportRoleLabel('admin_global')).toBe('Administradora general');
  });
});

describe('branchHoursLabel', () => {
  const hours = { thu: { open: '08:00', close: '18:00' } };

  it('muestra el horario del día de la agenda', () => {
    expect(branchHoursLabel('Bagua', hours, '2026-10-15')).toBe('Sede Bagua · 08:00 – 18:00');
  });

  it('dice "Sede cerrada" si ese día no abre', () => {
    expect(branchHoursLabel('Bagua', hours, '2026-10-18')).toBe('Sede cerrada');
  });
});

// En pantallas angostas la hoja A4 se achica para verse entera (nunca se agranda).
describe('sheetFitScale', () => {
  it('en un celular de 360 px achica la hoja de 794 px para que quepa entera', () => {
    expect(sheetFitScale(360, 794)).toBeCloseTo(360 / 794, 4);
  });

  it('en pantallas anchas la deja a tamaño real', () => {
    expect(sheetFitScale(1200, 794)).toBe(1);
    expect(sheetFitScale(794, 794)).toBe(1);
  });

  it('sin medidas todavía (0) la deja a tamaño real', () => {
    expect(sheetFitScale(0, 794)).toBe(1);
    expect(sheetFitScale(360, 0)).toBe(1);
  });
});
