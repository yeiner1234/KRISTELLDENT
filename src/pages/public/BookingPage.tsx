import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import BookingShell from '../../components/booking/BookingShell';
import BranchSelector from '../../components/booking/BranchSelector';
import AttentionStep from '../../components/booking/AttentionStep';
import ProfessionalStep, { ANY_PROFESSIONAL } from '../../components/booking/ProfessionalStep';
import ServiceStep from '../../components/booking/ServiceStep';
import DateTimeStep from '../../components/booking/DateTimeStep';

export interface BookingSelection {
  branchId: string;
  specialtyId: string;
  attentionMotiveLabel: string | null;
  professionalId: string;
  serviceId: string;
  date: string;
  time: string;
}

type IncomingState = Partial<BookingSelection> & { resumeStep?: number };

function BookingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const incoming = (location.state as IncomingState | null) ?? null;

  const [step, setStep] = useState(incoming?.resumeStep ?? 1);
  const [branchId, setBranchId] = useState<string | null>(incoming?.branchId ?? null);
  const [specialtyId, setSpecialtyId] = useState<string | null>(incoming?.specialtyId ?? null);
  const [motiveLabel, setMotiveLabel] = useState<string | null>(incoming?.attentionMotiveLabel ?? null);
  const [professionalChoice, setProfessionalChoice] = useState<string | null>(incoming?.professionalId ?? null);
  const [resolvedProfessionalId, setResolvedProfessionalId] = useState<string | null>(
    incoming?.professionalId ?? null,
  );
  const [serviceId, setServiceId] = useState<string | null>(incoming?.serviceId ?? null);
  const [date, setDate] = useState<string | null>(incoming?.date ?? null);
  const [time, setTime] = useState<string | null>(incoming?.time ?? null);

  const handleBack = () => {
    if (step === 1) {
      navigate('/');
      return;
    }
    setStep((current) => current - 1);
  };

  const handleChangeSpecialty = (id: string, motive: string | null) => {
    setSpecialtyId(id);
    setMotiveLabel(motive);
    setProfessionalChoice(null);
    setResolvedProfessionalId(null);
    setServiceId(null);
  };

  const handleChangeProfessional = (id: string) => {
    setProfessionalChoice(id);
    setResolvedProfessionalId(id === ANY_PROFESSIONAL ? null : id);
    setServiceId(null);
    setDate(null);
    setTime(null);
  };

  const handleChangeService = (id: string) => {
    setServiceId(id);
    setDate(null);
    setTime(null);
  };

  const handleSelectTime = (selectedTime: string, professionalId: string) => {
    setTime(selectedTime);
    setResolvedProfessionalId(professionalId);
  };

  const handleFinish = () => {
    if (!branchId || !specialtyId || !resolvedProfessionalId || !serviceId || !date || !time) {
      return;
    }

    const selection: BookingSelection = {
      branchId,
      specialtyId,
      attentionMotiveLabel: motiveLabel,
      professionalId: resolvedProfessionalId,
      serviceId,
      date,
      time,
    };

    navigate('/reservar/datos', { state: selection });
  };

  const stepConfig = {
    1: {
      canContinue: branchId !== null,
      onContinue: () => setStep(2),
    },
    2: {
      canContinue: specialtyId !== null,
      onContinue: () => setStep(3),
    },
    3: {
      canContinue: professionalChoice !== null,
      onContinue: () => setStep(4),
    },
    4: {
      canContinue: serviceId !== null,
      onContinue: () => setStep(5),
    },
    5: {
      canContinue: Boolean(date && time && resolvedProfessionalId),
      onContinue: handleFinish,
    },
  } as const;

  const current = stepConfig[step as 1 | 2 | 3 | 4 | 5];

  return (
    <BookingShell
      currentStep={step}
      onBack={handleBack}
      onContinue={current.onContinue}
      continueDisabled={!current.canContinue}
    >
      {step === 1 && <BranchSelector selectedId={branchId} onSelect={setBranchId} />}

      {step === 2 && (
        <AttentionStep
          specialtyId={specialtyId}
          motiveLabel={motiveLabel}
          onChange={handleChangeSpecialty}
          onContinue={() => setStep(3)}
        />
      )}

      {step === 3 && specialtyId && (
        <ProfessionalStep
          specialtyId={specialtyId}
          professionalId={professionalChoice}
          onChange={handleChangeProfessional}
        />
      )}

      {step === 4 && specialtyId && professionalChoice && (
        <ServiceStep
          specialtyId={specialtyId}
          professionalId={professionalChoice}
          serviceId={serviceId}
          onChange={handleChangeService}
        />
      )}

      {step === 5 && specialtyId && professionalChoice && branchId && serviceId && (
        <DateTimeStep
          specialtyId={specialtyId}
          branchId={branchId}
          professionalId={professionalChoice}
          serviceId={serviceId}
          date={date}
          time={time}
          onSelectDate={(value) => {
            setDate(value);
            setTime(null);
          }}
          onSelectTime={handleSelectTime}
        />
      )}
    </BookingShell>
  );
}

export default BookingPage;
