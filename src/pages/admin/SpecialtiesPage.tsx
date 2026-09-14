import SectionTitle from '../../components/common/SectionTitle';
import DataTable, { type DataTableColumn } from '../../components/common/DataTable';
import { professionals, specialties } from '../../data/mockData';
import type { Specialty } from '../../types/Specialty';

const columns: DataTableColumn<Specialty>[] = [
  { key: 'name', header: 'Especialidad', render: (row) => row.name },
  { key: 'description', header: 'Descripción', render: (row) => row.description },
  {
    key: 'professionals',
    header: 'Profesionales',
    render: (row) => professionals.filter((professional) => professional.specialtyId === row.id).length,
  },
];

function SpecialtiesPage() {
  return (
    <div className="flex flex-col gap-6">
      <SectionTitle title="Especialidades" align="left" />
      <DataTable columns={columns} rows={specialties} getRowId={(row) => row.id} />
    </div>
  );
}

export default SpecialtiesPage;
