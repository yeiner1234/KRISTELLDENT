import { useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import SectionTitle from '../../components/common/SectionTitle';
import PatientForm, { type PatientFormValues } from '../../components/booking/PatientForm';
import { requestVerificationCode } from '../../services/patientService';
import type { BookingSelection } from './BookingPage';

function PatientDataPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const selection = location.state as BookingSelection | null;
  const [values, setValues] = useState<PatientFormValues>({ dni: '', email: '' });

  if (!selection) {
    return <Navigate to="/reservar" replace />;
  }

  const handleSubmit = async () => {
    await requestVerificationCode(values.dni, values.email);
    navigate('/reservar/verificar', {
      state: { ...selection, dni: values.dni, email: values.email },
    });
  };

  return (
    <section className="mx-auto max-w-lg px-4 py-12 sm:px-6">
      <SectionTitle title="Tus datos" subtitle="Ingresa tu DNI y correo electrónico" align="left" />

      <div className="mt-8">
        <PatientForm values={values} onChange={setValues} onSubmit={handleSubmit} />
      </div>
    </section>
  );
}

export default PatientDataPage;
