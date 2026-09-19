import { useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { IdCard } from 'lucide-react';
import BookingShell from '../../components/booking/BookingShell';
import StepHeader from '../../components/booking/StepHeader';
import PatientForm, { type PatientFormValues } from '../../components/booking/PatientForm';
import { isValidDni, isValidEmail, isValidPhone } from '../../utils/validation';
import type { BookingSelection } from './BookingPage';

type PatientDataState = BookingSelection & Partial<PatientFormValues>;

function PatientDataPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const selection = location.state as PatientDataState | null;

  const [values, setValues] = useState<PatientFormValues>({
    firstName: selection?.firstName ?? '',
    lastName: selection?.lastName ?? '',
    dni: selection?.dni ?? '',
    phone: selection?.phone ?? '',
    email: selection?.email ?? '',
  });

  if (!selection) {
    return <Navigate to="/reservar" replace />;
  }

  const canContinue =
    values.firstName.trim().length > 1 &&
    values.lastName.trim().length > 1 &&
    isValidDni(values.dni) &&
    isValidPhone(values.phone) &&
    isValidEmail(values.email);

  const handleBack = () => {
    navigate('/reservar', { state: { ...selection, ...values, resumeStep: 5 } });
  };

  const handleContinue = () => {
    if (!canContinue) {
      return;
    }

    navigate('/reservar/confirmar', { state: { ...selection, ...values } });
  };

  return (
    <BookingShell
      currentStep={6}
      onBack={handleBack}
      onContinue={handleContinue}
      continueDisabled={!canContinue}
    >
      <StepHeader
        icon={IdCard}
        title="Tus datos"
        subtitle="Necesitamos algunos datos para registrar tu reserva."
      />
      <PatientForm values={values} onChange={setValues} />
    </BookingShell>
  );
}

export default PatientDataPage;
