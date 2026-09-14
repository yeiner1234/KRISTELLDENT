import type { FormEvent } from 'react';
import CodeInput from '../common/CodeInput';
import Button from '../common/Button';

interface VerificationCodeProps {
  email: string;
  code: string;
  onChangeCode: (code: string) => void;
  onSubmit: () => void;
  onResend: () => void;
  error?: string;
}

function VerificationCode({ email, code, onChangeCode, onSubmit, onResend, error }: VerificationCodeProps) {
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-ink-secondary">
        Enviamos un código de verificación a <span className="font-semibold text-brand-700">{email}</span>.
      </p>

      <div>
        <CodeInput value={code} onChange={onChangeCode} />
        {error && <p className="mt-2 text-xs font-medium text-rose-600">{error}</p>}
      </div>

      <Button type="submit" className="w-full">
        Verificar código
      </Button>

      <button
        type="button"
        onClick={onResend}
        className="text-sm font-medium text-brand-700 underline-offset-2 hover:underline"
      >
        Reenviar código
      </button>
    </form>
  );
}

export default VerificationCode;
