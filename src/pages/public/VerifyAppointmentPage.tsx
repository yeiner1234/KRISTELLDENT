import { useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import SectionTitle from '../../components/common/SectionTitle';
import VerificationCode from '../../components/booking/VerificationCode';
import { verifyCode } from '../../services/patientService';
import { isValidVerificationCode } from '../../utils/validation';

interface ConsultLocationState {
  dni: string;
}

function VerifyAppointmentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as ConsultLocationState | null;

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);

  if (!state) {
    return <Navigate to="/consultar-citas" replace />;
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

    navigate('/mis-citas', { state: { dni: state.dni } });
  };

  const handleResend = () => {
    setCode('');
    setError(undefined);
  };

  return (
    <section className="mx-auto max-w-lg px-4 py-12 sm:px-6">
      <SectionTitle
        eyebrow="Verificación"
        title="Ingresa el código recibido"
        subtitle="Enviamos un código de verificación al correo registrado con tu DNI"
        align="left"
      />

      <div className="mt-8">
        <VerificationCode
          email="tu correo registrado"
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

export default VerifyAppointmentPage;
