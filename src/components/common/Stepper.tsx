interface StepperProps {
  steps: string[];
  currentStep: number;
}

function Stepper({ steps, currentStep }: StepperProps) {
  return (
    <ol className="flex flex-wrap items-center gap-2">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === currentStep;
        const isDone = stepNumber < currentStep;

        return (
          <li key={step} className="flex items-center gap-2">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                isDone
                  ? 'bg-brand-600 text-white'
                  : isActive
                    ? 'border-2 border-brand-600 text-brand-700'
                    : 'border border-border text-ink-tertiary'
              }`}
            >
              {stepNumber}
            </span>
            <span className={`text-sm ${isActive ? 'font-semibold text-brand-900' : 'text-ink-tertiary'}`}>
              {step}
            </span>
            {stepNumber < steps.length && <span className="mx-1 h-px w-6 bg-border" />}
          </li>
        );
      })}
    </ol>
  );
}

export default Stepper;
