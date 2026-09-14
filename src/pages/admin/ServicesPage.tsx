import SectionTitle from '../../components/common/SectionTitle';
import DataTable, { type DataTableColumn } from '../../components/common/DataTable';
import Badge from '../../components/common/Badge';
import { services, specialties } from '../../data/mockData';
import { formatCurrency } from '../../utils/format';
import type { Service } from '../../types/Service';

const columns: DataTableColumn<Service>[] = [
  { key: 'name', header: 'Servicio', render: (row) => row.name },
  {
    key: 'specialty',
    header: 'Especialidad',
    render: (row) => (
      <Badge tone="brand">{specialties.find((specialty) => specialty.id === row.specialtyId)?.name ?? '—'}</Badge>
    ),
  },
  { key: 'duration', header: 'Duración', render: (row) => `${row.duration} min` },
  { key: 'price', header: 'Precio', render: (row) => formatCurrency(row.price) },
];

function ServicesPage() {
  return (
    <div className="flex flex-col gap-6">
      <SectionTitle title="Servicios" align="left" />
      <DataTable columns={columns} rows={services} getRowId={(row) => row.id} />
    </div>
  );
}

export default ServicesPage;
