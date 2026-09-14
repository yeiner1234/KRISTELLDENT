import type { FormEvent } from 'react';
import Input from '../common/Input';
import Button from '../common/Button';

export interface PatientFormValues {
  dni: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

interface PatientFormProps {
  values: PatientFormValues;
  onChange: (values: PatientFormValues) => void;
  onSubmit: () => void;
  isNewPatient?: boolean;
}

function PatientForm({ values, onChange, onSubmit, isNewPatient = false }: PatientFormProps) {
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="DNI"
        name="dni"
        inputMode="numeric"
        maxLength={8}
        value={values.dni}
        onChange={(event) => onChange({ ...values, dni: event.target.value })}
        required
      />
      <Input
        label="Correo electrónico"
        name="email"
        type="email"
        value={values.email}
        onChange={(event) => onChange({ ...values, email: event.target.value })}
        required
      />

      {isNewPatient && (
        <>
          <Input
            label="Nombres"
            name="firstName"
            value={values.firstName ?? ''}
            onChange={(event) => onChange({ ...values, firstName: event.target.value })}
            required
          />
          <Input
            label="Apellidos"
            name="lastName"
            value={values.lastName ?? ''}
            onChange={(event) => onChange({ ...values, lastName: event.target.value })}
            required
          />
          <Input
            label="Teléfono"
            name="phone"
            inputMode="numeric"
            value={values.phone ?? ''}
            onChange={(event) => onChange({ ...values, phone: event.target.value })}
            required
          />
        </>
      )}

      <Button type="submit" className="w-full">
        Continuar
      </Button>
    </form>
  );
}

export default PatientForm;
