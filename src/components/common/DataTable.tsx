import type { ReactNode } from 'react';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
}

function DataTable<T>({ columns, rows, getRowId }: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface-alt">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="px-4 py-3 font-semibold text-ink-tertiary">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr key={getRowId(row)} className="hover:bg-surface-alt/60">
              {columns.map((column) => (
                <td key={column.key} className="px-4 py-3 text-ink-secondary">
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
