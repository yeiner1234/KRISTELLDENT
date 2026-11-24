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

// En celular y tablet: "Paso 3 de 8 · Profesional" con una barra de progreso.
// Desde lg: los 8 pasos, como siempre.
function BookingStepper({ currentStep }: BookingStepperProps) {
  const total = bookingSteps.length;
  const progress = `${(Math.min(Math.max(currentStep, 0), total) / total) * 100}%`;

  return (
    <>
      <div data-testid="booking-stepper-compact" className="flex flex-col gap-2 lg:hidden">
        <p className="text-sm text-ink-tertiary">
          <span className="font-semibold text-brand-600">
            Paso {currentStep} de {total}
          </span>
          {' · '}
          <span className="font-semibold text-brand-900">{bookingSteps[currentStep - 1]}</span>
        </p>
        <div
          role="progressbar"
          aria-label="Progreso de la reserva"
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={currentStep}
          className="h-1.5 w-full overflow-hidden rounded-full bg-border"
        >
          <div
            data-testid="booking-stepper-bar"
            className="h-full rounded-full bg-brand-600 transition-[width] duration-300"
            style={{ width: progress }}
          />
        </div>
      </div>
      <ol
        className="hidden items-center gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] lg:flex [&::-webkit-scrollbar]:hidden"
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
    </>
  );
}

export default BookingStepper;
