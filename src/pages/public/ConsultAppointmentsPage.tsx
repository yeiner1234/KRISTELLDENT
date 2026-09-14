import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import SectionTitle from '../../components/common/SectionTitle';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { isValidDni } from '../../utils/validation';

function ConsultAppointmentsPage() {
  const navigate = useNavigate();
  const [dni, setDni] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (!isValidDni(dni)) {
      setError('Ingresa un DNI válido de 8 dígitos.');
      return;
    }

    navigate('/consultar-citas/verificar', { state: { dni } });
  };

  return (
    <section className="mx-auto max-w-lg px-4 py-12 sm:px-6">
      <SectionTitle
        eyebrow="Consultar citas"
        title="Ingresa tu DNI"
        subtitle="Te enviaremos un código de verificación al correo registrado"
        align="left"
      />

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <Input
          label="DNI"
          name="dni"
          inputMode="numeric"
          maxLength={8}
          value={dni}
          onChange={(event) => setDni(event.target.value)}
          error={error}
          required
        />
        <Button type="submit" className="w-full">
          Continuar
        </Button>
      </form>
    </section>
  );
}

export default ConsultAppointmentsPage;
