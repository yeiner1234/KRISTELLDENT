import { useState, type FormEvent } from 'react';
import Input from '../common/Input';
import Button from '../common/Button';
import type { Patient } from '../../types/Patient';

export type PatientFormValues = Omit<Patient, 'id'>;

interface PatientFormProps {
  initialValues?: PatientFormValues;
  onSubmit: (values: PatientFormValues) => void;
}

const emptyValues: PatientFormValues = { dni: '', firstName: '', lastName: '', phone: '', email: '' };

function PatientForm({ initialValues = emptyValues, onSubmit }: PatientFormProps) {
  const [values, setValues] = useState<PatientFormValues>(initialValues);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Nombres"
        value={values.firstName}
        onChange={(event) => setValues({ ...values, firstName: event.target.value })}
        required
      />
      <Input
        label="Apellidos"
        value={values.lastName}
        onChange={(event) => setValues({ ...values, lastName: event.target.value })}
        required
      />
      <Input
        label="DNI"
        inputMode="numeric"
        maxLength={8}
        value={values.dni}
        onChange={(event) => setValues({ ...values, dni: event.target.value })}
        required
      />
      <Input
        label="Teléfono"
        inputMode="numeric"
        value={values.phone}
        onChange={(event) => setValues({ ...values, phone: event.target.value })}
        required
      />
      <Input
        label="Correo electrónico"
        type="email"
        value={values.email}
        onChange={(event) => setValues({ ...values, email: event.target.value })}
        required
      />
      <Button type="submit">Guardar paciente</Button>
    </form>
  );
}

export default PatientForm;
