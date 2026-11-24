import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import DataTable, { type DataTableColumn } from './DataTable';

interface Row {
  id: string;
  name: string;
  status: string;
}

const columns: DataTableColumn<Row>[] = [
  { key: 'name', header: 'Paciente', render: (row) => row.name },
  { key: 'status', header: 'Estado', render: (row) => row.status },
  { key: 'notes', header: 'Notas', render: () => 'interna', mobile: 'hidden' },
  { key: 'actions', header: 'Acciones', render: (row) => <button type="button">Ver {row.name}</button> },
  { key: 'extra', header: '', render: () => <button type="button">Borrar</button> },
];

const rows: Row[] = [
  { id: '1', name: 'Ana', status: 'Pendiente' },
  { id: '2', name: 'Luis', status: 'Confirmada' },
];

function renderTable() {
  render(<DataTable columns={columns} rows={rows} getRowId={(row) => row.id} />);
}

describe('DataTable', () => {
  it('en escritorio es una tabla con sus cabeceras', () => {
    renderTable();

    const table = screen.getByRole('table');
    expect(table).toHaveClass('block', 'md:table');
    expect(table.querySelector('thead')).toHaveClass('hidden', 'md:table-header-group');
    expect(screen.getByRole('columnheader', { name: 'Paciente' })).toBeInTheDocument();
  });

  it('en celular cada fila es una tarjeta con "etiqueta: valor"', () => {
    renderTable();

    const anaCell = screen.getByText('Ana').closest('td') as HTMLElement;
    const card = anaCell.closest('tr') as HTMLElement;

    expect(card).toHaveClass('flex', 'flex-col', 'md:table-row');
    expect(anaCell).toHaveAttribute('data-label', 'Paciente');
    expect(anaCell).toHaveClass('flex', 'before:content-[attr(data-label)]', 'md:table-cell', 'md:before:content-none');
    expect(within(card).getByText('Pendiente').closest('td')).toHaveAttribute('data-label', 'Estado');
  });

  it('las acciones van abajo de la tarjeta, sin etiqueta', () => {
    renderTable();

    const card = screen.getByText('Ana').closest('tr') as HTMLElement;
    const actionCells = [
      within(card).getByRole('button', { name: 'Ver Ana' }).closest('td'),
      within(card).getByRole('button', { name: 'Borrar' }).closest('td'),
    ];

    for (const cell of actionCells) {
      expect(cell).toHaveClass('order-last');
      expect(cell).not.toHaveAttribute('data-label');
    }
  });

  it('una columna puede ocultarse solo en celular', () => {
    renderTable();

    const notes = screen.getAllByText('interna')[0].closest('td');
    expect(notes).toHaveClass('hidden', 'md:table-cell');
  });
});
