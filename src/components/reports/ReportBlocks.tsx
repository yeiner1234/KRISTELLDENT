import type { ReactNode } from 'react';
import type { Trend } from './ReportParts';

// Bloques de los reportes de administración (catálogo de reportes): resumen con
// tarjeta grande y rejilla 2 × 2, barras horizontales, aviso y definiciones.

export function SummaryLayout({ hero, children }: { hero: ReactNode; children: ReactNode }) {
  return (
    <div className="report-keep mt-3 grid grid-cols-[1fr_1.55fr] gap-4">
      {hero}
      <div className="grid grid-cols-2 rounded-[8px] border border-ag-line [&>*:nth-child(-n+2)]:border-b [&>*:nth-child(even)]:border-l">
        {children}
      </div>
    </div>
  );
}

export function TrendText({ trend, suffix }: { trend?: Trend | null; suffix?: string }) {
  if (!trend && !suffix) return null;
  const isGood = trend ? trend.value >= 0 === trend.good : true;
  return (
    <span className="text-[9.5px] leading-[1.35] text-ag-label">
      {trend && (
        <span className={`font-semibold ${isGood ? 'text-ag-teal' : 'text-ag-magenta'}`}>
          {trend.value > 0 ? '▲' : trend.value < 0 ? '▼' : '='} {trend.text}
        </span>
      )}
      {trend && suffix ? ' ' : ''}
      {suffix}
    </span>
  );
}

export function HeroStat({
  label,
  value,
  trend,
  trendSuffix,
  children,
}: {
  label: string;
  value: string;
  trend?: Trend | null;
  trendSuffix?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-[8px] bg-[#E8F1F3] px-4 py-3.5">
      <span className="text-[8.5px] font-medium uppercase tracking-[0.12em] text-ag-label">{label}</span>
      <span className="mt-1.5 text-[40px] font-bold leading-none text-[#0E5E68] [font-variant-numeric:tabular-nums]">{value}</span>
      <span className="mt-2">
        <TrendText trend={trend} suffix={trendSuffix} />
      </span>
      <div className="mt-auto pt-4">{children}</div>
    </div>
  );
}

export function StatCell({ label, value, trend, hint }: { label: string; value: string; trend?: Trend | null; hint?: string }) {
  return (
    <div className="flex flex-col border-ag-line px-3.5 py-2.5">
      <span className="text-[8.5px] font-medium uppercase tracking-[0.12em] text-ag-label">{label}</span>
      <span className="mt-0.5 text-[24px] font-semibold leading-tight text-ag-ink [font-variant-numeric:tabular-nums]">{value}</span>
      <span className="mt-0.5">
        <TrendText trend={trend} suffix={hint} />
      </span>
    </div>
  );
}

// Barra apilada con su leyenda en % (atendidas / canceladas / sin cerrar…).
export function StackedBar({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const percent = (value: number) => {
    if (total === 0) return '0 %';
    const share = (value / total) * 100;
    return share > 0 && share < 1 ? '<1 %' : `${Math.round(share)} %`;
  };
  return (
    <div>
      <div className="flex h-[9px] w-full gap-[2px] overflow-hidden rounded-full bg-ag-line">
        {segments.map((segment) =>
          segment.value > 0 ? (
            <span key={segment.label} style={{ width: `${(segment.value / total) * 100}%`, backgroundColor: segment.color }} />
          ) : null,
        )}
      </div>
      <div className="mt-1.5 flex flex-wrap justify-between gap-x-3 gap-y-1 text-[9px] text-ag-ink">
        {segments.map((segment) => (
          <span key={segment.label} className="flex items-center gap-1">
            <span className="h-[8px] w-[8px] rounded-[2px]" style={{ backgroundColor: segment.color }} />
            {segment.label} {percent(segment.value)}
          </span>
        ))}
      </div>
    </div>
  );
}

export function HeroFacts({ items }: { items: { value: string; label: string }[] }) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1 text-[9.5px] text-ag-label">
      {items.map((item) => (
        <span key={item.label}>
          <strong className="font-semibold text-ag-ink">{item.value}</strong> {item.label}
        </span>
      ))}
    </div>
  );
}

// Barras horizontales con valor y % (atendidas por día, demanda, por sede…).
export function HBarList({
  title,
  items,
  color = '#008F9F',
}: {
  title: string;
  items: { label: string; value: number; display: string; share?: number }[];
  color?: string;
}) {
  const max = Math.max(1, ...items.map((item) => item.value));
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-ag-ink">{title}</p>
      {items.length === 0 ? (
        <p className="mt-2.5 text-[10.5px] text-ag-label">Sin datos en el periodo.</p>
      ) : (
        <ul className="mt-2.5 flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.label} className="grid grid-cols-[110px_1fr_auto] items-center gap-3 text-[10.5px] text-ag-ink">
              <span className="truncate">{item.label}</span>
              <span className="h-[8px] rounded-full bg-ag-bg">
                <span className="block h-full rounded-full" style={{ width: `${(item.value / max) * 100}%`, backgroundColor: color }} />
              </span>
              <span className="min-w-[64px] text-right [font-variant-numeric:tabular-nums]">
                <strong className="font-semibold">{item.display}</strong>
                {item.share !== undefined && <span className="ml-1 text-[9px] text-ag-label">{Math.round(item.share)} %</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Barra corta dentro de una celda (registradas, atenciones, ingreso).
export function InlineBar({ value, max, display }: { value: number; max: number; display: string }) {
  return (
    <span className="flex items-center justify-end gap-2">
      <span className="h-[6px] w-[64px] rounded-full bg-ag-bg">
        <span className="block h-full rounded-full bg-ag-teal" style={{ width: `${max === 0 ? 0 : (value / max) * 100}%` }} />
      </span>
      <span className="min-w-[48px] text-right">{display}</span>
    </span>
  );
}

// Puntos de 0 a 10 (atenciones en 12 meses de un paciente frecuente).
export function DotScale({ value }: { value: number }) {
  return (
    <span className="flex items-center justify-end gap-1.5">
      <span className="flex gap-[2px]">
        {Array.from({ length: 10 }, (_, index) => (
          <span key={index} className={`h-[5px] w-[5px] rounded-full ${index < value ? 'bg-ag-teal' : 'bg-ag-line'}`} />
        ))}
      </span>
      <strong className="min-w-[16px] text-right font-semibold">{value}</strong>
    </span>
  );
}

export function Banner({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 rounded-[8px] border border-[#F0D2B8] bg-[#FDF3EA] px-3.5 py-2 text-[10.5px] text-[#7A4A1E]">{children}</p>
  );
}

export const numCell = 'px-2 py-[5px] text-right [font-variant-numeric:tabular-nums]';
export const totalRowClass = 'border-t-2 border-ag-ink font-semibold';

export function DefinitionsBlock({ definitions, sources }: { definitions: [string, string][]; sources: string[] }) {
  return (
    <div className="report-notes mt-6 grid grid-cols-2 gap-8 border-t-2 border-ag-ink pt-3 text-[10px] text-ag-ink">
      <div>
        <p className="font-bold uppercase tracking-[0.08em]">Definiciones</p>
        <dl className="mt-2 grid grid-cols-[100px_1fr] gap-x-4 gap-y-1.5">
          {definitions.map(([term, definition]) => (
            <div key={term} className="contents">
              <dt className="font-semibold">{term}</dt>
              <dd className="text-ag-label">{definition}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div>
        <p className="font-bold uppercase tracking-[0.08em]">Fuente y alcance</p>
        <ul className="mt-2 flex flex-col gap-1.5">
          {sources.map((source) => (
            <li key={source} className="flex gap-2">
              <span className="font-bold text-ag-teal">–</span>
              <span className="text-ag-label">{source}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function TableNote({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-[9.5px] text-ag-label">{children}</p>;
}
