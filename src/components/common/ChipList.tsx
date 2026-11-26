import { useState, type ReactNode } from 'react';

interface ChipListProps {
  items: string[];
  // Cuántos chips se ven antes del "+N más".
  max?: number;
  emptyLabel?: string;
  icon?: ReactNode;
  // Color de un chip según su texto (p. ej. profesional sin horario).
  chipClassName?: (item: string) => string;
}

const baseChip =
  'inline-flex max-w-full items-center gap-1.5 truncate rounded-full border px-2.5 py-1 text-[12.5px] font-medium';
const defaultChip = 'border-adm-line-control bg-adm-surface-sel text-adm-ink-500';

// Lista de chips que se corta en `max` con un botón "+N más" para verlos todos.
function ChipList({ items, max = 3, emptyLabel = 'Ninguna', icon, chipClassName }: ChipListProps) {
  const [expanded, setExpanded] = useState(false);

  if (items.length === 0) {
    return <span className="text-[13px] italic text-adm-ink-200">{emptyLabel}</span>;
  }

  const visible = expanded ? items : items.slice(0, max);
  const hidden = items.length - visible.length;

  return (
    <ul className="flex flex-wrap gap-1.5">
      {visible.map((item) => (
        <li key={item} className={`${baseChip} ${chipClassName?.(item) ?? defaultChip}`}>
          {icon}
          <span className="truncate">{item}</span>
        </li>
      ))}
      {(hidden > 0 || (expanded && items.length > max)) && (
        <li>
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="rounded-full px-2 py-1 text-[12.5px] font-semibold text-kd-pink-700 hover:bg-kd-pink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-adm-accent-ring"
          >
            {expanded ? 'Ver menos' : `+${hidden} más`}
          </button>
        </li>
      )}
    </ul>
  );
}

export default ChipList;
