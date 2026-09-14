import { useMemo, useState } from 'react';
import { CalendarX2, Eye } from 'lucide-react';
import SectionTitle from '../../components/common/SectionTitle';
import DataTable, { type DataTableColumn } from '../../components/common/DataTable';
import EmptyState from '../../components/common/EmptyState';
import AppointmentModal from '../../components/appointments/AppointmentModal';
import AppointmentStatus from '../../components/appointments/AppointmentStatus';
import ProfessionalSelector from '../../components/professionals/ProfessionalSelector';
import { appointments, professionals } from '../../data/mockData';
import { formatFullName } from '../../utils/format';
import { formatDateLong, formatTimeRange } from '../../utils/date';
import type { Appointment } from '../../types/Appointment';

function AppointmentsPage() {
  const [professionalId, setProfessionalId] = useState('');
  const [selected, setSelected] = useState<Appointment | null>(null);

  const filteredAppointments = useMemo(
    () =>
      professionalId ? appointments.filter((appointment) => appointment.professionalId === professionalId) : appointments,
    [professionalId],
  );

  const professionalName = (id: string) => {
    const professional = professionals.find((item) => item.id === id);
    return professional ? formatFullName(professional.firstName, professional.lastName) : '—';
  };

  const columns: DataTableColumn<Appointment>[] = [
    { key: 'professional', header: 'Profesional', render: (row) => professionalName(row.professionalId) },
    { key: 'date', header: 'Fecha', render: (row) => <span className="capitalize">{formatDateLong(row.date)}</span> },
    { key: 'time', header: 'Hora', render: (row) => formatTimeRange(row.startTime, row.endTime) },
    { key: 'status', header: 'Estado', render: (row) => <AppointmentStatus status={row.status} /> },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <button
          type="button"
          onClick={() => setSelected(row)}
          aria-label="Ver detalle de la cita"
          className="rounded-lg p-1.5 text-ink-tertiary hover:bg-tint hover:text-brand-700"
        >
          <Eye size={16} />
        </button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <SectionTitle title="Citas" align="left" />

      <div className="max-w-xs">
        <ProfessionalSelector professionals={professionals} value={professionalId} onChange={setProfessionalId} />
      </div>

      {filteredAppointments.length === 0 ? (
        <EmptyState
          icon={CalendarX2}
          title="Sin citas para mostrar"
          description="Las citas reservadas por los pacientes aparecerán en esta lista."
        />
      ) : (
        <DataTable columns={columns} rows={filteredAppointments} getRowId={(row) => row.id} />
      )}

      <AppointmentModal
        appointment={selected}
        professionalName={selected ? professionalName(selected.professionalId) : undefined}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}

export default AppointmentsPage;
