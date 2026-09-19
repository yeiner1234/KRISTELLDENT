import type { FormEvent } from 'react';
import { MailCheck } from 'lucide-react';
import CodeInput from '../common/CodeInput';

interface VerificationCodeProps {
  title: string;
  subtitle: string;
  email: string;
  code: string;
  onChangeCode: (code: string) => void;
  onSubmit: () => void;
  onResend: () => void;
  error?: string;
}

function VerificationCode({ title, subtitle, email, code, onChangeCode, onSubmit, onResend, error }: VerificationCodeProps) {
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col items-center text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: '#eef6f7' }}>
        <MailCheck size={22} className="text-brand-700" />
      </span>

      <h2 className="mt-4 text-[22px] font-semibold text-brand-900">{title}</h2>
      <p className="mt-1 max-w-sm text-sm leading-relaxed text-ink-tertiary">
        {subtitle} <span className="font-medium text-brand-900">{email}</span>.
      </p>

      <div className="mt-6">
        <CodeInput value={code} onChange={onChangeCode} />
      </div>

      {error && <p className="mt-2 text-xs font-medium text-rose-600">{error}</p>}

      <button type="submit" className="sr-only">
        Verificar código
      </button>

      <p className="mt-5 text-sm text-ink-tertiary">
        ¿No recibiste el código?{' '}
        <button type="button" onClick={onResend} className="font-medium text-brand-700 hover:underline">
          Reenviar código
        </button>
      </p>
    </form>
  );
}

export default VerificationCode;
