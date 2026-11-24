import { describe, expect, it } from 'vitest';
import { buildAppointmentViews, filterAppointmentViews, patientsOfAppointments } from './appointmentViews';
import type { Appointment } from '../types/Appointment';
import type { Patient } from '../types/Patient';
import type { Professional } from '../types/Professional';
import type { Service } from '../types/Service';

const appointment = (overrides: Partial<Appointment>): Appointment => ({
  id: 'a1',
  code: 'KD-ABC234',
  patientId: 'pt1',
  professionalId: 'p1',
  branchId: 'b1',
  serviceId: 's1',
  date: '2026-11-16',
  startTime: '09:00',
  endTime: '09:30',
  status: 'pending',
  reason: '',
  ...overrides,
});

const patients: Patient[] = [
  { id: 'pt1', dni: '12345678', firstName: 'Ana', lastName: 'Ríos', phone: null, email: null },
  { id: 'pt2', dni: '87654321', firstName: 'Luis', lastName: 'Paz', phone: null, email: null },
  { id: 'pt3', dni: '11112222', firstName: 'Sin', lastName: 'Citas', phone: null, email: null },
];

const professional = (id: string, fullName: string, active = true): Professional => ({
  id,
  fullName,
  role: 'especialista',
  bio: null,
  active,
  specialtyIds: [],
  branchIds: [],
  serviceIds: [],
});

const professionals = [professional('p1', 'Dra. Kristell Vega'), professional('p2', 'Dra. Inés Soto', false)];
const services: Service[] = [{ id: 's1', name: 'Limpieza', specialtyId: 'x', branchId: 'b1', duration: 30, price: 0, active: true }];

const appointments = [
  appointment({ id: 'a3', date: '2026-11-17', startTime: '08:00', patientId: 'pt2', professionalId: 'p2', code: 'KD-ZZZ999' }),
  appointment({ id: 'a2', startTime: '10:00', status: 'in_room', branchId: 'b2', patientId: 'pt2', professionalId: 'p2', code: 'KD-QWE777' }),
  appointment({ id: 'a1' }),
];

const views = buildAppointmentViews(appointments, { patients, professionals, services });

describe('buildAppointmentViews', () => {
  it('resuelve nombres por id, incluido un profesional inactivo, y ordena por fecha y hora', () => {
    expect(views.map((view) => view.appointment.id)).toEqual(['a1', 'a2', 'a3']);
    expect(views[0]).toMatchObject({
      patientName: 'Ana Ríos',
      patientDni: '12345678',
      professionalName: 'Dra. Kristell Vega',
      serviceName: 'Limpieza',
    });
    expect(views[1].professionalName).toBe('Dra. Inés Soto');
  });

  it('muestra el servicio tal como se reservó aunque después lo hayan renombrado', () => {
    const [view] = buildAppointmentViews([appointment({ id: 'a9', serviceName: 'Limpieza simple' })], {
      patients,
      professionals,
      services,
    });

    expect(view.serviceName).toBe('Limpieza simple');
  });

  it('usa valores por defecto cuando falta un dato', () => {
    const [view] = buildAppointmentViews([appointment({ patientId: 'x', professionalId: 'y', serviceId: null })], {
      patients,
      professionals,
      services,
    });
    expect(view).toMatchObject({ patientName: 'Paciente', patientDni: '', professionalName: '—', serviceName: '—' });
  });
});

describe('filterAppointmentViews', () => {
  const ids = (filters: Parameters<typeof filterAppointmentViews>[1]) =>
    filterAppointmentViews(views, filters).map((view) => view.appointment.id);

  it('filtra por fecha, profesional, estado y sede', () => {
    expect(ids({ date: '2026-11-16' })).toEqual(['a1', 'a2']);
    expect(ids({ professionalId: 'p2' })).toEqual(['a2', 'a3']);
    expect(ids({ status: 'in_room' })).toEqual(['a2']);
    expect(ids({ branchId: 'b2' })).toEqual(['a2']);
    expect(ids({ date: '', professionalId: '', status: '', branchId: '', query: '' })).toEqual(['a1', 'a2', 'a3']);
  });

  it('la búsqueda encuentra por código, DNI, paciente o profesional sin importar mayúsculas', () => {
    expect(ids({ query: 'kd-abc' })).toEqual(['a1']);
    expect(ids({ query: '4567' })).toEqual(['a1']);
    expect(ids({ query: 'RÍOS' })).toEqual(['a1']);
    expect(ids({ query: 'inés' })).toEqual(['a2', 'a3']);
  });
});

describe('patientsOfAppointments', () => {
  it('deja solo los pacientes que tienen alguna de esas citas', () => {
    expect(patientsOfAppointments(patients, [appointments[2]]).map((patient) => patient.id)).toEqual(['pt1']);
  });
});
