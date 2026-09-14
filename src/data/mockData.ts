import type { Appointment } from '../types/Appointment';
import type { Patient } from '../types/Patient';
import type { Professional } from '../types/Professional';
import type { Service } from '../types/Service';
import type { Specialty } from '../types/Specialty';
import type { TimeSlotOption } from '../types/Schedule';

export const specialties: Specialty[] = [
  {
    id: 'sp-general',
    name: 'Odontología general',
    description: 'Revisiones, higiene y empastes. La puerta de entrada para cualquier tratamiento.',
  },
  {
    id: 'sp-ortodoncia',
    name: 'Ortodoncia',
    description: 'Brackets y alineadores transparentes con control de avance cada mes.',
  },
  {
    id: 'sp-endodoncia',
    name: 'Endodoncia',
    description: 'Tratamiento de conductos con microscopio para conservar el diente.',
  },
  {
    id: 'sp-periodoncia',
    name: 'Periodoncia',
    description: 'Diagnóstico y control de encías, raspados y mantenimiento periodontal.',
  },
  {
    id: 'sp-odontopediatria',
    name: 'Odontopediatría',
    description: 'Primeras visitas, selladores y seguimiento del recambio dental.',
  },
  {
    id: 'sp-cirugia',
    name: 'Cirugía dental',
    description: 'Extracciones, cordales e implantes con planificación digital previa.',
  },
];

export interface ProfessionalMock extends Professional {
  experienceYears: number;
}

export const professionals: ProfessionalMock[] = [
  { id: 'pr-1', firstName: 'Sofía', lastName: 'Herrera', specialtyId: 'sp-general', active: true, experienceYears: 8 },
  { id: 'pr-2', firstName: 'Lucía', lastName: 'Fernández', specialtyId: 'sp-ortodoncia', active: true, experienceYears: 12 },
  { id: 'pr-3', firstName: 'Marcos', lastName: 'Ruiz', specialtyId: 'sp-endodoncia', active: true, experienceYears: 9 },
  { id: 'pr-4', firstName: 'Elena', lastName: 'Ríos', specialtyId: 'sp-periodoncia', active: true, experienceYears: 11 },
  { id: 'pr-5', firstName: 'Paula', lastName: 'Sanz', specialtyId: 'sp-odontopediatria', active: true, experienceYears: 7 },
  { id: 'pr-6', firstName: 'Iván', lastName: 'Torres', specialtyId: 'sp-cirugia', active: true, experienceYears: 15 },
];

export const timeSlots: TimeSlotOption[] = [
  { time: '09:00', available: true },
  { time: '09:30', available: true },
  { time: '10:00', available: false },
  { time: '10:30', available: true },
  { time: '11:00', available: true },
  { time: '11:30', available: false },
  { time: '15:00', available: true },
  { time: '15:30', available: true },
  { time: '16:00', available: true },
];

export const services: Service[] = [
  { id: 'sv-1', name: 'Revisión y diagnóstico', specialtyId: 'sp-general', duration: 30, price: 40 },
  { id: 'sv-2', name: 'Limpieza dental', specialtyId: 'sp-general', duration: 45, price: 55 },
  { id: 'sv-3', name: 'Control de ortodoncia', specialtyId: 'sp-ortodoncia', duration: 30, price: 60 },
  { id: 'sv-4', name: 'Tratamiento de conducto', specialtyId: 'sp-endodoncia', duration: 60, price: 180 },
  { id: 'sv-5', name: 'Raspado y alisado periodontal', specialtyId: 'sp-periodoncia', duration: 45, price: 90 },
  { id: 'sv-6', name: 'Primera visita infantil', specialtyId: 'sp-odontopediatria', duration: 30, price: 35 },
  { id: 'sv-7', name: 'Extracción simple', specialtyId: 'sp-cirugia', duration: 40, price: 70 },
];

export const patients: Patient[] = [];

export const appointments: Appointment[] = [];
