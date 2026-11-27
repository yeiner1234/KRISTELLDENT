import { useRef, useState, type ReactNode } from 'react';
import { Download, Minus, Plus, Printer, Scan } from 'lucide-react';
import Button from '../common/Button';
import { AGENDA_STATUS_LABELS, sheetFitScale, zoomSheet } from '../../utils/reports/agenda';
import { pdfFileName } from '../../utils/reports/pdfPages';
import type { AppointmentStatus } from '../../types/Appointment';
import icon from '../../../imagenes/kristelldent-icon.png';
import wordmark from '../../../imagenes/kristelldent-wordmark.png';
import '../../styles/report-sheet.css';

// Piezas comunes de las hojas A4 de los reportes (mismo diseño que la agenda
// imprimible): barra de filtros, controles de tamaño en celular, encabezado,
// tarjetas, tablas, notas y pie. Se imprimen con la impresión del navegador.

// Ancho real de la hoja A4 en pantalla (210 mm a 96 ppp).
const SHEET_WIDTH_PX = 794;

const zoomButtonClasses =
  'flex h-11 w-11 items-center justify-center rounded-[10px] border border-adm-line-control bg-white text-adm-ink-700 transition-colors hover:border-adm-accent-line hover:bg-adm-surface-sel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-adm-accent-ring';

// Filtros (no se imprimen): de a dos por fila en celular, en una fila desde sm.
export function ReportToolbar({ children }: { children: ReactNode }) {
  return (
    <div className="report-toolbar grid grid-cols-2 items-end gap-x-2.5 gap-y-2.5 rounded-[14px] border border-adm-line-card bg-white p-3 [&_label]:text-[12.5px] sm:flex sm:flex-wrap sm:gap-3 sm:p-4 sm:[&>*]:w-auto sm:[&_label]:text-sm">
      {children}
    </div>
  );
}

// "Descargar PDF" genera el archivo directo (sin el diálogo de impresión, más
// cómodo en celular); "Imprimir" usa la impresión del navegador.
export function PrintButton({ fileName }: { fileName: string }) {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    const sheet = document.querySelector<HTMLElement>('[data-pdf-sheet]');
    if (!sheet) return;
    setIsExporting(true);
    setError(null);
    try {
      const { exportSheetToPdf } = await import('../../lib/pdfExport');
      await exportSheetToPdf(sheet, pdfFileName(fileName));
    } catch {
      setError('No se pudo generar el PDF. Prueba con «Imprimir» y elige «Guardar como PDF».');
    } finally {
      setIsExporting(false);
    }
  };

  // En celular, los dos botones van juntos en su propia fila; desde sm, al
  // final de la barra.
  return (
    <div className="col-span-2 grid grid-cols-2 gap-2.5 sm:ml-auto sm:flex sm:flex-wrap sm:justify-end sm:gap-3">
      <Button
        type="button"
        variant="admin-solid"
        size="md"
        className="w-full sm:w-auto"
        icon={<Download size={16} />}
        onClick={handleDownload}
        disabled={isExporting}
      >
        {isExporting ? 'Generando…' : 'Descargar PDF'}
      </Button>
      <Button
        type="button"
        variant="admin-outline"
        size="md"
        className="w-full sm:w-auto"
        icon={<Printer size={16} />}
        onClick={() => window.print()}
      >
        Imprimir
      </Button>
      {error && (
        <p role="alert" className="col-span-2 text-sm text-adm-danger-text sm:basis-full sm:text-right">
          {error}
        </p>
      )}
    </div>
  );
}

// Celular y tablet: agrandar, achicar o ajustar la hoja; en papel, siempre real.
// `report` nombra la página de impresión (@page) con su pie propio.
export function ReportSheet({ report, children }: { report: string; children: ReactNode }) {
  const [zoom, setZoom] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <div className="report-zoom-controls flex items-center justify-end gap-1.5 lg:hidden" role="group" aria-label="Tamaño de la hoja">
        <button type="button" aria-label="Reducir la hoja" onClick={() => setZoom((current) => zoomSheet(current, -1))} className={zoomButtonClasses}>
          <Minus size={17} />
        </button>
        <span className="min-w-[52px] text-center text-sm font-semibold text-adm-ink-700 [font-variant-numeric:tabular-nums]">
          {Math.round(zoom * 100)} %
        </span>
        <button type="button" aria-label="Agrandar la hoja" onClick={() => setZoom((current) => zoomSheet(current, 1))} className={zoomButtonClasses}>
          <Plus size={17} />
        </button>
        <button
          type="button"
          aria-label="Ajustar la hoja a la pantalla"
          onClick={() => setZoom(sheetFitScale(scrollRef.current?.clientWidth ?? 0, SHEET_WIDTH_PX))}
          className={`${zoomButtonClasses} w-auto gap-1.5 px-3 text-sm font-medium`}
        >
          <Scan size={16} />
          Ajustar
        </button>
      </div>

      <div ref={scrollRef} className="report-sheet-scroll">
        {/* zoom (y no transform): también cambia el espacio que ocupa. */}
        <article className="report-sheet" data-report={report} data-pdf-sheet style={zoom !== 1 ? { zoom } : undefined}>
          {children}
        </article>
      </div>
    </>
  );
}

export interface MetaItem {
  label: string;
  value: ReactNode;
}

// 1. Encabezado: logo y sede a la izquierda; documento, fecha, emisor y alcance a la derecha.
export function ReportHeader({ branchLine, meta, scope }: { branchLine: string; meta: MetaItem[]; scope: string }) {
  return (
    <>
      <div className="flex items-start justify-between gap-6">
        <div className="flex items-start gap-3">
          <img src={icon} alt="" className="h-[52px] w-[52px] rounded-[12px]" />
          <div className="flex flex-col gap-0.5 pt-0.5">
            <img src={wordmark} alt="KristellDent" className="h-[24px] w-auto self-start" />
            <span className="text-[12px] text-ag-ink">Clínica odontológica</span>
            <span className="text-[10.5px] text-ag-label">{branchLine}</span>
          </div>
        </div>
        <dl className="grid grid-cols-[auto_auto] gap-x-8 gap-y-1 text-[11px]">
          {meta.map((item) => (
            <Meta key={item.label} label={item.label}>
              {item.value}
            </Meta>
          ))}
          <div className="col-span-2">
            <Meta label="Alcance de los datos">
              <span className="text-ag-teal">{scope}</span>
            </Meta>
          </div>
        </dl>
      </div>
      <div className="mt-2.5 flex h-[2px] w-full bg-ag-line">
        <span className="w-[56px] bg-ag-teal" />
        <span className="w-[22px] bg-ag-magenta" />
      </div>
    </>
  );
}

function Meta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col">
      <dt className="text-[8.5px] font-medium uppercase tracking-[0.12em] text-ag-label">{label}</dt>
      <dd className="text-[11px] text-ag-ink">{children}</dd>
    </div>
  );
}

// 2 y 3. Módulo, título y el dato destacado de la derecha (periodo o fecha).
export function ReportTitle({
  level,
  title,
  subtitle,
  asideLabel,
  asideValue,
  asideHint,
}: {
  level: string;
  title: string;
  subtitle: string;
  asideLabel: string;
  asideValue: string;
  asideHint?: string;
}) {
  return (
    <>
      <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.42em] text-ag-teal">
        Módulo de reportes <span className="text-ag-magenta">•</span> {level}
      </p>
      <div className="mt-1.5 flex items-start justify-between gap-6">
        <h1 className="report-title max-w-[124mm] text-[40px] font-bold leading-[1.02] tracking-[-0.015em] text-ag-ink">{title}</h1>
        <div className="shrink-0 border-l-2 border-ag-teal pl-4">
          <p className="text-[9.5px] font-medium uppercase tracking-[0.12em] text-ag-label">{asideLabel}</p>
          <p className="mt-0.5 text-[20px] font-bold text-ag-ink">{asideValue}</p>
          {asideHint && <p className="text-[10.5px] text-ag-label">{asideHint}</p>}
        </div>
      </div>
      <p className="mt-2 text-[12px] text-ag-label">{subtitle}</p>
    </>
  );
}

// 4. Filtros aplicados, en una fila.
export function AppliedFilters({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div className="mt-3 grid rounded-[8px] border border-ag-line bg-ag-bg" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map((item) => (
        <div key={item.label} className="flex flex-col gap-0.5 border-l border-ag-line px-3.5 py-2.5 first:border-l-0">
          <span className="text-[8.5px] font-medium uppercase tracking-[0.12em] text-ag-label">{item.label}</span>
          <span className="truncate text-[12px] text-ag-ink">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

export function SummaryCards({ children }: { children: ReactNode }) {
  return <div className="mt-3 grid grid-cols-5 rounded-[8px] border border-ag-line">{children}</div>;
}

export interface Trend {
  // Positivo, negativo o sin cambio; good dice si subir es bueno (cancelaciones: no).
  value: number;
  text: string;
  good: boolean;
}

export function SummaryCard({ label, value, hint, trend }: { label: string; value: string | number; hint?: string; trend?: Trend | null }) {
  const isGood = trend ? (trend.value >= 0) === trend.good : true;
  return (
    <div className="flex flex-col border-l border-ag-line px-3.5 py-2.5 first:border-l-0">
      <span className="text-[8.5px] font-medium uppercase tracking-[0.12em] text-ag-label">{label}</span>
      <span className="mt-0.5 text-[26px] font-semibold leading-none text-ag-ink [font-variant-numeric:tabular-nums]">{value}</span>
      {(trend || hint) && (
        <span className="mt-1.5 text-[9px] leading-[1.3] text-ag-label">
          {trend && (
            <span className={isGood ? 'text-ag-teal' : 'text-ag-magenta'}>
              {trend.value > 0 ? '▲' : trend.value < 0 ? '▼' : '='} {trend.text}
            </span>
          )}
          {trend && hint ? ' ' : ''}
          {hint}
        </span>
      )}
    </div>
  );
}

export function SectionTitle({ number, title, aside }: { number: string; title: string; aside?: string }) {
  return (
    <div className="mt-5 flex items-end justify-between gap-4 border-b border-ag-line pb-1.5">
      <h2 className="flex items-baseline gap-2 text-[14px] font-bold text-ag-ink">
        <span className="font-mono text-[11px] font-semibold text-ag-teal">{number}</span>
        {title}
      </h2>
      {aside && <span className="text-right text-[10.5px] text-ag-label">{aside}</span>}
    </div>
  );
}

// Tabla del reporte: cabecera que se repite en cada hoja y filas que no se parten.
export function ReportTable({ head, children }: { head: { label: string; className?: string }[]; children: ReactNode }) {
  return (
    <table className="report-table mt-2 w-full border-collapse text-[10.5px] leading-[16px] text-ag-ink">
      <thead>
        <tr className="bg-ag-bg text-left text-[9px] font-semibold uppercase tracking-[0.08em] text-ag-label">
          {head.map((column) => (
            <th key={column.label} className={`px-2 py-[7px] font-semibold ${column.className ?? ''}`}>
              {column.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-2 py-5 text-center text-ag-label">
        {children}
      </td>
    </tr>
  );
}

export const cellClass = 'px-2 py-[5px]';
export const rowClass = 'border-b border-ag-line';

// "Lectura del periodo": frases numeradas junto al gráfico.
export function Readings({ items }: { items: string[] }) {
  return (
    <div className="border-t-2 border-ag-ink pt-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-ag-ink">Lectura del periodo</p>
      <ol className="mt-2.5 flex flex-col gap-2.5">
        {items.map((item, index) => (
          <li key={item} className="flex gap-2.5 text-[10.5px] leading-[1.45] text-ag-ink">
            <span className="font-mono text-[10px] font-semibold text-ag-teal">{String(index + 1).padStart(2, '0')}</span>
            <span>{item}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export interface BarSeries {
  label: string;
  color: string;
}

// Barras agrupadas por tramo (mes o semana), con el valor encima de cada barra.
export function GroupedBarChart({
  series,
  points,
  ariaLabel,
  formatValue = String,
  showLegend = true,
}: {
  series: BarSeries[];
  points: { label: string; values: number[] }[];
  ariaLabel: string;
  formatValue?: (value: number) => string;
  showLegend?: boolean;
}) {
  const width = 400;
  const height = 170;
  const left = 38;
  const bottom = 22;
  const top = 14;
  const plotHeight = height - bottom - top;
  const rawMax = Math.max(1, ...points.flatMap((point) => point.values));
  const step = niceStep(rawMax);
  const max = Math.ceil(rawMax / step) * step;
  const ticks = Array.from({ length: Math.round(max / step) + 1 }, (_, index) => index * step);
  const groupWidth = (width - left) / Math.max(points.length, 1);
  const barWidth = Math.min(30, (groupWidth * 0.7) / series.length);
  const showValues = points.length <= 14;
  const labelEvery = points.length > 8 ? Math.ceil(points.length / 8) : 1;

  return (
    <div>
      <div className={`flex gap-4 text-[9.5px] text-ag-ink ${showLegend ? '' : 'hidden'}`}>
        {series.map((item) => (
          <span key={item.label} className="flex items-center gap-1.5">
            <span className="h-[9px] w-[9px] rounded-[2px]" style={{ backgroundColor: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel} className="mt-2 h-auto w-full">
        {ticks.map((tick) => {
          const y = top + plotHeight - (tick / max) * plotHeight;
          return (
            <g key={tick}>
              <line x1={left} x2={width} y1={y} y2={y} stroke="#E3E8EB" strokeWidth={0.6} />
              <text x={left - 6} y={y + 3} textAnchor="end" fontSize={8} fill="#6B7880">
                {formatValue(tick)}
              </text>
            </g>
          );
        })}
        {points.map((point, groupIndex) => {
          const groupX = left + groupIndex * groupWidth + (groupWidth - barWidth * series.length - 2 * (series.length - 1)) / 2;
          return (
            <g key={`${point.label}-${groupIndex}`}>
              {point.values.map((value, seriesIndex) => {
                const barHeight = (value / max) * plotHeight;
                const x = groupX + seriesIndex * (barWidth + 2);
                const y = top + plotHeight - barHeight;
                return (
                  <g key={series[seriesIndex].label}>
                    <rect x={x} y={y} width={barWidth} height={barHeight} rx={2} fill={series[seriesIndex].color} />
                    {showValues && (
                      <text x={x + barWidth / 2} y={y - 3} textAnchor="middle" fontSize={8} fill="#17242C">
                        {formatValue(value)}
                      </text>
                    )}
                  </g>
                );
              })}
              {groupIndex % labelEvery === 0 && (
                <text x={left + groupIndex * groupWidth + groupWidth / 2} y={height - 6} textAnchor="middle" fontSize={8.5} fill="#17242C">
                  {point.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function niceStep(max: number): number {
  const rough = max / 4;
  const power = 10 ** Math.floor(Math.log10(rough));
  const candidates = [1, 2, 2.5, 5, 10].map((factor) => factor * power);
  return Math.max(1, candidates.find((candidate) => candidate >= rough) ?? power * 10);
}

export function ReportNotes({ left, right }: { left: ReactNode[]; right: ReactNode[] }) {
  return (
    <div className="report-notes mt-5 border-t-2 border-ag-ink pt-3">
      <div className="grid grid-cols-[70px_1fr_1fr] gap-x-6 text-[10.5px] text-ag-ink">
        <p className="font-bold uppercase tracking-[0.06em]">Notas</p>
        <ul className="flex flex-col gap-1.5">
          {left.map((note, index) => (
            <Note key={index}>{note}</Note>
          ))}
        </ul>
        <ul className="flex flex-col gap-1.5">
          {right.map((note, index) => (
            <Note key={index}>{note}</Note>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Note({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className="font-bold text-ag-teal">–</span>
      <span>{children}</span>
    </li>
  );
}

// En papel el pie lo pone @page en cada hoja, con el número de página.
export function ReportScreenFooter({ title }: { title: string }) {
  return (
    <div className="report-screen-footer mt-8 flex items-center justify-between border-t border-ag-line pt-2 text-[9.5px] text-ag-label">
      <span data-pdf-footer>{title}</span>
      <span>Confidencial — uso interno</span>
      <span>
        Página <strong className="text-ag-ink">1</strong> de <strong className="text-ag-ink">1</strong>
      </span>
    </div>
  );
}

// Confirmada: círculo verde azulado con punto; Pendiente: aro naranja; el
// resto, con el color de su StatusBadge.
const STATUS_MARK_COLORS: Record<AppointmentStatus, { ring: string; dot: string | null }> = {
  confirmed: { ring: '#008F9F', dot: '#008F9F' },
  pending: { ring: '#E07B39', dot: null },
  in_room: { ring: 'var(--color-adm-status-in-room-solid)', dot: 'var(--color-adm-status-in-room-solid)' },
  completed: { ring: 'var(--color-adm-status-completed-solid)', dot: 'var(--color-adm-status-completed-solid)' },
  cancelled: { ring: 'var(--color-adm-status-cancelled-solid)', dot: 'var(--color-adm-status-cancelled-solid)' },
};

export function StatusMark({ status }: { status: AppointmentStatus }) {
  const { ring, dot } = STATUS_MARK_COLORS[status];
  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap">
      <span className="flex h-[11px] w-[11px] shrink-0 items-center justify-center rounded-full border-[1.5px]" style={{ borderColor: ring }}>
        {dot && <span className="h-[4px] w-[4px] rounded-full" style={{ backgroundColor: dot }} />}
      </span>
      {AGENDA_STATUS_LABELS[status]}
    </span>
  );
}

// Punto sólido con la etiqueta (estados finales de la historia y tratamientos).
export function DotLabel({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap">
      <span className="h-[8px] w-[8px] shrink-0 rounded-full" style={{ backgroundColor: color }} />
      {children}
    </span>
  );
}

export function Tag({ tone, children }: { tone: 'magenta' | 'gray' | 'teal'; children: ReactNode }) {
  const classes = {
    magenta: 'bg-[#FBE1EB] text-[#A3124D]',
    gray: 'bg-[#EDF0F2] text-[#3E4C55]',
    teal: 'bg-[#D9F0F2] text-[#00707D]',
  }[tone];
  return <span className={`inline-block rounded-[4px] px-1.5 py-[1px] text-[8.5px] font-medium ${classes}`}>{children}</span>;
}
