import type { ChangeEvent } from 'react';
import { Mail } from 'lucide-react';
import Input from '../common/Input';

export interface PatientFormValues {
  firstName: string;
  lastName: string;
  dni: string;
  phone: string;
  email: string;
}

interface PatientFormProps {
  values: PatientFormValues;
  onChange: (values: PatientFormValues) => void;
}

function PatientForm({ values, onChange }: PatientFormProps) {
  const setField = (field: keyof PatientFormValues) => (event: ChangeEvent<HTMLInputElement>) =>
    onChange({ ...values, [field]: event.target.value });

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Nombre" name="firstName" value={values.firstName} onChange={setField('firstName')} required />
        <Input label="Apellidos" name="lastName" value={values.lastName} onChange={setField('lastName')} required />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="DNI"
          name="dni"
          inputMode="numeric"
          maxLength={8}
          value={values.dni}
          onChange={setField('dni')}
          required
        />
        <Input
          label="Teléfono"
          name="phone"
          inputMode="numeric"
          value={values.phone}
          onChange={setField('phone')}
          required
        />
      </div>

      <Input
        label="Correo electrónico"
        name="email"
        type="email"
        value={values.email}
        onChange={setField('email')}
        required
      />

      <div
        className="flex items-start gap-2.5 rounded-xl p-3.5"
        style={{ background: '#f5fafb', border: '1px solid #e3eff1' }}
      >
        <Mail size={16} className="mt-0.5 shrink-0 text-brand-600" />
        <p className="text-[13px] leading-relaxed text-ink-secondary">
          Te enviaremos la confirmación de tu cita a este correo.
        </p>
      </div>
    </div>
  );
}

export default PatientForm;
