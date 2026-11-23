import Select from '../common/Select';
import { usePanelBranch } from '../../hooks/usePanelBranch';

// Selector "Sede" del panel profesional: filtra todas sus pantallas. Con una
// sola sede (o mientras carga) no se muestra.
function PanelBranchSelector() {
  const { branches, selectedBranchId, setSelectedBranchId, isLoading } = usePanelBranch();

  if (isLoading || branches.length <= 1) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5 rounded-[14px] border border-adm-line-card bg-white px-4 py-3">
      <div className="w-full max-w-[260px]">
        <Select
          label="Sede"
          value={selectedBranchId}
          onChange={(event) => setSelectedBranchId(event.target.value)}
          options={[
            { value: '', label: 'Todas mis sedes' },
            ...branches.map((branch) => ({ value: branch.id, label: branch.name })),
          ]}
        />
      </div>
    </div>
  );
}

export default PanelBranchSelector;
