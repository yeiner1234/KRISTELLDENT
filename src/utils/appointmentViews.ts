import type { Appointment, AppointmentStatus } from '../types/Appointment';
import type { Patient } from '../types/Patient';
import type { Professional } from '../types/Professional';
import type { Service } from '../types/Service';
import { formatFullName } from './format';

// Cita con los nombres ya resueltos, lista para mostrar y buscar.
export interface AppointmentView {
  appointment: Appointment;
  patientName: string;
  patientDni: string;
  professionalName: string;
  serviceName: string;
}

// '' = sin filtro.
export interface AppointmentFilters {
  date: string;
  professionalId: string;
  status: AppointmentStatus | '';
  branchId: string;
  query: string;
}

interface AppointmentLookups {
  patients: Patient[];
  professionals: Professional[];
  services: Service[];
}

export function buildAppointmentViews(appointments: Appointment[], lookups: AppointmentLookups): AppointmentView[] {
  const patientById = new Map(lookups.patients.map((patient) => [patient.id, patient]));
  const professionalById = new Map(lookups.professionals.map((professional) => [professional.id, professional]));
  const serviceById = new Map(lookups.services.map((service) => [service.id, service]));

  return [...appointments]
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
    .map((appointment) => {
      const patient = patientById.get(appointment.patientId);
      const professionalName = professionalById.get(appointment.professionalId)?.fullName;
      // La copia guardada en la cita manda; el servicio actual solo cubre
      // citas anteriores a esa copia.
      const serviceName =
        appointment.serviceName ?? (appointment.serviceId ? serviceById.get(appointment.serviceId)?.name : undefined);
      return {
        appointment,
        patientName: patient ? formatFullName(patient.firstName, patient.lastName) : 'Paciente',
        patientDni: patient?.dni ?? '',
        professionalName: professionalName || '—',
        serviceName: serviceName ?? '—',
      };
    });
}

export function filterAppointmentViews(views: AppointmentView[], filters: Partial<AppointmentFilters>): AppointmentView[] {
  const term = filters.query?.trim().toLowerCase() ?? '';

  return views.filter(({ appointment, patientName, patientDni, professionalName }) => {
    if (filters.date && appointment.date !== filters.date) return false;
    if (filters.professionalId && appointment.professionalId !== filters.professionalId) return false;
    if (filters.status && appointment.status !== filters.status) return false;
    if (filters.branchId && appointment.branchId !== filters.branchId) return false;
    if (!term) return true;
    return [patientName, patientDni, appointment.code, professionalName].some((value) =>
      value.toLowerCase().includes(term),
    );
  });
}

export function patientsOfAppointments(patients: Patient[], appointments: Appointment[]): Patient[] {
  const patientIds = new Set(appointments.map((appointment) => appointment.patientId));
  return patients.filter((patient) => patientIds.has(patient.id));
}
