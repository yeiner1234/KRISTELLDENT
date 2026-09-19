import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  pageSize?: number;
}

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
        <table className="w-full border-collapse text-left">
          <thead>
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
          <tbody>
            {visibleRows.map((row) => (
              <tr key={getRowId(row)} className="group">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className="whitespace-nowrap border-t border-adm-line-div px-4 py-3.5 text-sm text-adm-ink-700 group-hover:bg-adm-surface-hover"
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length > pageSize && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-adm-line-div px-5 py-3.5">
          <span className="text-[13px] text-adm-ink-300">
            {rows.length} resultados · página {currentPage} de {pageCount}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label="Página anterior"
              disabled={currentPage === 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-adm-line-control text-adm-ink-400 transition-colors hover:bg-adm-surface-hover disabled:pointer-events-none disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                onClick={() => setPage(pageNumber)}
                className={`flex h-8 w-8 items-center justify-center rounded-lg border text-[13px] font-medium transition-colors ${
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
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-adm-line-control text-adm-ink-400 transition-colors hover:bg-adm-surface-hover disabled:pointer-events-none disabled:opacity-40"
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
