import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import Button from './Button';

interface AppointmentCodeBoxProps {
  code: string;
  hint?: string;
  variant?: 'public' | 'admin';
}

// Código KD-XXXXXX en grande con botón Copiar. Con el DNI, el código permite
// reprogramar o cancelar la cita, así que se muestra destacado.
function AppointmentCodeBox({ code, hint, variant = 'public' }: AppointmentCodeBoxProps) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setCopyFailed(false);
    } catch {
      setCopyFailed(true);
    }
  };

  return (
    <div className="flex w-full flex-col items-center gap-3 rounded-2xl border border-brand-600/30 bg-brand-50 px-5 py-5 text-center">
      <span className="text-xs font-semibold uppercase tracking-wide text-ink-tertiary">Código de tu cita</span>
      <span className="font-mono text-3xl font-bold tracking-widest text-brand-900 sm:text-4xl">{code}</span>
      <Button
        type="button"
        size="sm"
        variant={variant === 'admin' ? 'admin-outline' : 'secondary'}
        icon={copied ? <Check size={14} /> : <Copy size={14} />}
        onClick={handleCopy}
      >
        {copied ? 'Copiado' : 'Copiar'}
      </Button>
      {copyFailed && <p className="text-xs text-rose-700">No se pudo copiar. Anótalo a mano.</p>}
      {hint && <p className="max-w-sm text-sm leading-relaxed text-ink-secondary">{hint}</p>}
    </div>
  );
}

export default AppointmentCodeBox;
