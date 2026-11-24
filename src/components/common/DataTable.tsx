import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  // En celular: 'field' (etiqueta: valor), 'actions' (abajo de la tarjeta,
  // sin etiqueta) o 'hidden'. Por defecto, la columna 'actions' y las de
  // cabecera vacía son acciones.
  mobile?: 'field' | 'actions' | 'hidden';
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  pageSize?: number;
}

function mobileMode<T>(column: DataTableColumn<T>): 'field' | 'actions' | 'hidden' {
  if (column.mobile) {
    return column.mobile;
  }
  return column.key === 'actions' || column.header === '' ? 'actions' : 'field';
}

// Desde md, la celda de siempre.
const desktopCellClasses =
  'md:table-cell md:whitespace-nowrap md:border-t md:border-adm-line-div md:px-4 md:py-3.5 md:text-left md:group-hover:bg-adm-surface-hover';

const mobileCellClasses = {
  field:
    'flex items-start justify-between gap-3 text-right before:shrink-0 before:text-left before:font-medium before:text-adm-ink-300 before:content-[attr(data-label)] md:before:content-none',
  actions: 'order-last block pt-1.5',
  hidden: 'hidden',
};

// En celular cada fila es una tarjeta (etiqueta: valor) con las acciones
// abajo; desde md es la tabla de siempre. Es el mismo HTML: solo cambia el CSS.
function DataTable<T>({ columns, rows, getRowId, pageSize = 8 }: DataTableProps<T>) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, pageCount);

  const visibleRows = useMemo(
    () => rows.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [rows, currentPage, pageSize],
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-adm-line-card">
      <div className="overflow-x-auto">
        <table className="block w-full border-collapse text-left md:table">
          <thead className="hidden md:table-header-group">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="whitespace-nowrap px-4 pb-2.5 pt-4 text-xs font-semibold uppercase tracking-[0.04em] text-adm-ink-300"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="block md:table-row-group">
            {visibleRows.map((row) => (
              <tr
                key={getRowId(row)}
                className="group flex flex-col gap-2.5 border-t border-adm-line-div p-4 first:border-t-0 md:table-row md:border-t-0 md:p-0"
              >
                {columns.map((column) => {
                  const mode = mobileMode(column);
                  return (
                    <td
                      key={column.key}
                      data-label={mode === 'field' ? column.header : undefined}
                      className={`${mobileCellClasses[mode]} text-sm text-adm-ink-700 ${desktopCellClasses}`}
                    >
                      {column.render(row)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length > pageSize && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-adm-line-div px-4 py-3.5 md:px-5">
          <span className="text-sm text-adm-ink-300 md:text-[13px]">
            {rows.length} resultados · página {currentPage} de {pageCount}
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              aria-label="Página anterior"
              disabled={currentPage === 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-adm-line-control text-adm-ink-400 transition-colors hover:bg-adm-surface-hover disabled:pointer-events-none disabled:opacity-40 md:h-8 md:w-8"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                onClick={() => setPage(pageNumber)}
                className={`flex h-11 w-11 items-center justify-center rounded-lg border text-sm font-medium transition-colors md:h-8 md:w-8 md:text-[13px] ${
                  pageNumber === currentPage
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : 'border-adm-line-control text-adm-ink-400 hover:bg-adm-surface-hover'
                }`}
              >
                {pageNumber}
              </button>
            ))}
            <button
              type="button"
              aria-label="Página siguiente"
              disabled={currentPage === pageCount}
              onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-adm-line-control text-adm-ink-400 transition-colors hover:bg-adm-surface-hover disabled:pointer-events-none disabled:opacity-40 md:h-8 md:w-8"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
