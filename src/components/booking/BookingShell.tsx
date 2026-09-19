import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Button from '../common/Button';
import BookingStepper, { bookingSteps } from './BookingStepper';

interface BookingShellProps {
  currentStep: number;
  children: ReactNode;
  onBack?: () => void;
  onContinue?: () => void;
  continueDisabled?: boolean;
  continueLabel?: string;
  continueIcon?: ReactNode;
  hideFooter?: boolean;
}

function BookingShell({
  currentStep,
  children,
  onBack,
  onContinue,
  continueDisabled = false,
  continueLabel = 'Continuar',
  continueIcon,
  hideFooter = false,
}: BookingShellProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    navigate(-1);
  };

  return (
    <section className="mx-auto w-full max-w-[1050px] px-4 py-10 sm:px-6 sm:py-14">
      <Link
        to="/"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-ink-tertiary hover:text-brand-700"
      >
        <ArrowLeft size={16} />
        Volver
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="text-[12px] font-semibold uppercase tracking-[0.04em] text-brand-600">
            Reserva online
          </span>
          <h1 className="mt-1 text-[28px] font-semibold text-brand-900 sm:text-[32px]">Reserva tu cita</h1>
          <p className="mt-1 max-w-md text-sm text-ink-tertiary">
            Completa los siguientes pasos para encontrar el horario que mejor se adapte a ti.
          </p>
        </div>
        <span className="text-[12.5px] font-semibold text-brand-600">
          Paso {currentStep} de {bookingSteps.length}
        </span>
      </div>

      <div className="mt-6">
        <BookingStepper currentStep={currentStep} />
      </div>

      <div
        className="mt-6 rounded-[18px] border border-[#e6edf0] bg-white p-[18px] sm:p-7"
        style={{ boxShadow: '0 10px 30px rgba(18,35,43,0.05)' }}
      >
        {children}

        {!hideFooter && (
          <div className="mt-7 flex flex-col-reverse gap-3 border-t border-border pt-[18px] sm:flex-row sm:items-center sm:justify-between">
            <Button variant="secondary" onClick={handleBack} className="sm:w-fit">
              Atrás
            </Button>
            <Button onClick={onContinue} disabled={continueDisabled} icon={continueIcon} className="sm:w-fit">
              {continueLabel}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

export default BookingShell;
