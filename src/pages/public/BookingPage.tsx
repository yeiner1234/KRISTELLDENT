import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import SectionTitle from '../../components/common/SectionTitle';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import Stepper from '../../components/common/Stepper';
import SpecialtySelector from '../../components/booking/SpecialtySelector';
import ProfessionalSelector from '../../components/booking/ProfessionalSelector';
import DateSelector from '../../components/booking/DateSelector';
import TimeSlot from '../../components/booking/TimeSlot';
import { useSpecialties, useProfessionals } from '../../hooks/useProfessionals';
import { getAvailableSlots } from '../../services/appointmentService';
import type { TimeSlotOption } from '../../types/Schedule';

const steps = ['Especialidad', 'Profesional', 'Fecha', 'Horario'];

export interface BookingSelection {
  specialtyId: string;
  professionalId: string;
  date: string;
  time: string;
}

function BookingPage() {
  const navigate = useNavigate();
  const { specialties, isLoading: isLoadingSpecialties } = useSpecialties();
  const { professionals, isLoading: isLoadingProfessionals } = useProfessionals();

  const [step, setStep] = useState(1);
  const [specialtyId, setSpecialtyId] = useState<string | null>(null);
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [slots, setSlots] = useState<TimeSlotOption[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  const availableProfessionals = useMemo(
    () => professionals.filter((professional) => professional.specialtyId === specialtyId),
    [professionals, specialtyId],
  );

  useEffect(() => {
    if (step === 4 && professionalId && date) {
      setIsLoadingSlots(true);
      getAvailableSlots(professionalId, date).then((data) => {
        setSlots(data);
        setIsLoadingSlots(false);
      });
    }
  }, [step, professionalId, date]);

  const goBack = () => {
    if (step === 1) {
      navigate('/');
      return;
    }
    setStep((current) => current - 1);
  };

  const handleSelectSpecialty = (id: string) => {
    setSpecialtyId(id);
    setProfessionalId(null);
    setStep(2);
  };

  const handleSelectProfessional = (id: string) => {
    setProfessionalId(id);
    setStep(3);
  };

  const handleSelectDate = (value: string) => {
    setDate(value);
    setTime(null);
    setStep(4);
  };

  const handleContinue = () => {
    if (!specialtyId || !professionalId || !date || !time) {
      return;
    }

    const selection: BookingSelection = { specialtyId, professionalId, date, time };
    navigate('/reservar/datos', { state: selection });
  };

  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <button
        type="button"
        onClick={goBack}
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-ink-tertiary hover:text-brand-700"
      >
        <ArrowLeft size={16} />
        Volver
      </button>

      <SectionTitle title="Reservar una cita" align="left" />

      <div className="mt-6">
        <Stepper steps={steps} currentStep={step} />
      </div>

      <div className="mt-8">
        {step === 1 &&
          (isLoadingSpecialties ? (
            <Spinner size={28} />
          ) : (
            <SpecialtySelector specialties={specialties} selectedId={specialtyId} onSelect={handleSelectSpecialty} />
          ))}

        {step === 2 &&
          (isLoadingProfessionals ? (
            <Spinner size={28} />
          ) : (
            <ProfessionalSelector
              professionals={availableProfessionals}
              selectedId={professionalId}
              onSelect={handleSelectProfessional}
            />
          ))}

        {step === 3 && <DateSelector selectedDate={date} onSelect={handleSelectDate} />}

        {step === 4 && (
          <div className="flex flex-col gap-6">
            {isLoadingSlots ? (
              <Spinner size={28} />
            ) : (
              <div className="flex flex-wrap gap-3">
                {slots.map((slot) => (
                  <TimeSlot
                    key={slot.time}
                    time={slot.time}
                    available={slot.available}
                    selected={time === slot.time}
                    onSelect={setTime}
                  />
                ))}
              </div>
            )}

            <Button onClick={handleContinue} disabled={!time} className="w-fit">
              Continuar
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

export default BookingPage;
