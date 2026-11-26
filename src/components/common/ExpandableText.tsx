import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface ExpandableTextProps {
  text: string | null | undefined;
  // Desde cuántos caracteres se recorta y aparece "Ver más".
  maxChars?: number;
  emptyLabel?: string;
  className?: string;
}

// Texto largo recortado a dos líneas con "Ver más" para desplegarlo. Los
// textos cortos se muestran enteros, sin botón.
function ExpandableText({ text, maxChars = 90, emptyLabel = 'Sin descripción', className = '' }: ExpandableTextProps) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const value = text?.trim() ?? '';

  if (!value) {
    return <p className={`text-[13px] italic text-adm-ink-200 ${className}`}>{emptyLabel}</p>;
  }

  const isLong = value.length > maxChars;

  return (
    <div className={`flex flex-col items-start gap-1 ${className}`}>
      <p
        id={id}
        className={`text-pretty text-[13.5px] leading-relaxed text-adm-ink-400 ${isLong && !expanded ? 'line-clamp-2' : ''}`}
      >
        {value}
      </p>
      {isLong && (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => setExpanded((current) => !current)}
          className="inline-flex items-center gap-1 rounded text-[12.5px] font-semibold text-kd-pink-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-adm-accent-ring"
        >
          {expanded ? 'Ver menos' : 'Ver más'}
          <ChevronDown size={14} aria-hidden="true" className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      )}
    </div>
  );
}

export default ExpandableText;
