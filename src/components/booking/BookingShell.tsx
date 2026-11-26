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
    <section className="mx-auto w-full max-w-[1050px] px-4 py-6 sm:px-6 sm:py-14">
      <Link
        to="/"
        className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-ink-tertiary hover:text-brand-700 sm:mb-6 sm:min-h-0"
      >
        <ArrowLeft size={16} />
        Volver
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="text-[12px] font-semibold uppercase tracking-[0.04em] text-brand-600">
            Reserva online
          </span>
          <h1 className="mt-1 text-[26px] font-semibold text-brand-900 sm:text-[32px]">Reserva tu cita</h1>
          <p className="mt-1 max-w-md text-[13.5px] text-ink-tertiary sm:text-sm">
            Completa los siguientes pasos para encontrar el horario que mejor se adapte a ti.
          </p>
        </div>
        {/* En celular y tablet el paso ya sale en el indicador compacto. */}
        <span className="hidden text-[12.5px] font-semibold text-brand-600 lg:inline">
          Paso {currentStep} de {bookingSteps.length}
        </span>
      </div>

      <div className="mt-5 sm:mt-6">
        <BookingStepper currentStep={currentStep} />
      </div>

      <div
        className="mt-5 rounded-[18px] border border-[#e6edf0] bg-white p-4 sm:mt-6 sm:p-7"
        style={{ boxShadow: '0 10px 30px rgba(18,35,43,0.05)' }}
      >
        {children}

        {!hideFooter && (
          // En celular el pie queda fijo abajo: "Continuar" siempre a la vista
          // aunque la lista sea larga. Desde sm, al final del recuadro.
          <div className="sticky bottom-0 z-10 -mx-4 -mb-4 mt-6 flex items-center gap-3 rounded-b-[18px] border-t border-border bg-white/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:mb-0 sm:mt-7 sm:justify-between sm:rounded-none sm:bg-transparent sm:px-0 sm:pb-0 sm:pt-[18px] sm:backdrop-blur-none">
            <Button variant="secondary" onClick={handleBack} className="w-fit shrink-0">
              Atrás
            </Button>
            <Button onClick={onContinue} disabled={continueDisabled} icon={continueIcon} className="flex-1 sm:w-fit sm:flex-none">
              {continueLabel}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

export default BookingShell;
