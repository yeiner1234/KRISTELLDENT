import SectionTitle from '../../components/common/SectionTitle';
import DataTable, { type DataTableColumn } from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import { professionals, specialties } from '../../data/mockData';
import { formatFullName } from '../../utils/format';
import type { ProfessionalMock } from '../../data/mockData';

const columns: DataTableColumn<ProfessionalMock>[] = [
  { key: 'name', header: 'Nombre', render: (row) => formatFullName(row.firstName, row.lastName) },
  {
    key: 'specialty',
    header: 'Especialidad',
    render: (row) => specialties.find((specialty) => specialty.id === row.specialtyId)?.name ?? '—',
  },
  { key: 'experienceYears', header: 'Experiencia', render: (row) => `${row.experienceYears} años` },
  {
    key: 'active',
    header: 'Estado',
    render: (row) => <StatusBadge label={row.active ? 'Activo' : 'Inactivo'} tone={row.active ? 'success' : 'neutral'} />,
  },
];

function ProfessionalsPage() {
  return (
    <div className="flex flex-col gap-6">
      <SectionTitle title="Profesionales" align="left" />
      <DataTable columns={columns} rows={professionals} getRowId={(row) => row.id} />
    </div>
  );
}

export default ProfessionalsPage;
