import { Check } from 'lucide-react';

export const bookingSteps = [
  'Sucursal',
  'Atención',
  'Profesional',
  'Servicio',
  'Fecha y hora',
  'Tus datos',
  'Resumen',
  'Confirmación',
];

interface BookingStepperProps {
  currentStep: number;
}

function BookingStepper({ currentStep }: BookingStepperProps) {
  return (
    <ol
      className="flex items-center gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label={`Paso ${currentStep} de ${bookingSteps.length}`}
    >
      {bookingSteps.map((label, index) => {
        const stepNumber = index + 1;
        const isDone = stepNumber < currentStep;
        const isActive = stepNumber === currentStep;

        return (
          <li key={label} className="flex shrink-0 items-center gap-1.5">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                  isDone
                    ? 'bg-brand-600 text-white'
                    : isActive
                      ? 'bg-brand-600 text-white'
                      : 'border border-border bg-white text-ink-tertiary'
                }`}
              >
                {isDone ? <Check size={14} /> : stepNumber}
              </span>
              <span
                className={`whitespace-nowrap text-[13px] ${
                  isActive ? 'font-semibold text-brand-900' : 'text-ink-tertiary'
                }`}
              >
                {label}
              </span>
            </div>
            {stepNumber < bookingSteps.length && <span className="mx-1 h-px w-5 shrink-0 bg-border" />}
          </li>
        );
      })}
    </ol>
  );
}

export default BookingStepper;
