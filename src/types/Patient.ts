export interface Patient {
  id: string;
  dni: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  // N.º de historia (HC-00245), fecha de nacimiento y domicilio: los usa la
  // historia del paciente. Ausentes en datos que no los traen.
  historyNumber?: number | null;
  birthDate?: string | null;
  address?: string | null;
}
