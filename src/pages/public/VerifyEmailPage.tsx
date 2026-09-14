import { useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import SectionTitle from '../../components/common/SectionTitle';
import VerificationCode from '../../components/booking/VerificationCode';
import { verifyCode } from '../../services/patientService';
import { isValidVerificationCode } from '../../utils/validation';
import type { BookingSelection } from './BookingPage';

type VerifyEmailState = BookingSelection & { dni: string; email: string };

function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as VerifyEmailState | null;

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);

  if (!state) {
    return <Navigate to="/reservar" replace />;
  }

  const handleSubmit = async () => {
    if (!isValidVerificationCode(code)) {
      setError('Ingresa el código de 6 dígitos que recibiste por correo.');
      return;
    }

    const isValid = await verifyCode(state.dni, code);

    if (!isValid) {
      setError('El código ingresado no es válido.');
      return;
    }

    navigate('/reservar/confirmar', { state });
  };

  const handleResend = () => {
    setCode('');
    setError(undefined);
  };

  return (
    <section className="mx-auto max-w-lg px-4 py-12 sm:px-6">
      <SectionTitle
        eyebrow="Verificación"
        title="Verifica tu correo"
        subtitle="Ingresa el código que enviamos a tu correo electrónico"
        align="left"
      />

      <div className="mt-8">
        <VerificationCode
          email={state.email}
          code={code}
          onChangeCode={setCode}
          onSubmit={handleSubmit}
          onResend={handleResend}
          error={error}
        />
      </div>
    </section>
  );
}

export default VerifyEmailPage;
