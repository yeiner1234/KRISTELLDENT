import { useRef, type KeyboardEvent } from 'react';

interface CodeInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
}

function CodeInput({ length = 6, value, onChange }: CodeInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, index) => value[index] ?? '');

  const setDigit = (index: number, digit: string) => {
    const next = digits.slice();
    next[index] = digit;
    onChange(next.join(''));

    if (digit && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  return (
    <div className="flex gap-2">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputsRef.current[index] = el;
          }}
          value={digit}
          onChange={(event) => setDigit(index, event.target.value.replace(/\D/g, '').slice(-1))}
          onKeyDown={(event) => handleKeyDown(event, index)}
          inputMode="numeric"
          maxLength={1}
          aria-label={`Dígito ${index + 1}`}
          className="h-12 w-11 rounded-xl border border-border text-center text-lg font-semibold text-brand-900 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
        />
      ))}
    </div>
  );
}

export default CodeInput;
