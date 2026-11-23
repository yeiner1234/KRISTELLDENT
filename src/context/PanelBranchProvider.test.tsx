import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PanelBranchProvider from './PanelBranchProvider';
import PanelBranchSelector from '../components/dashboard/PanelBranchSelector';
import { usePanelBranch } from '../hooks/usePanelBranch';
import { getMyPanelBranches } from '../services/myBranchesService';

const branch = (id: string, name: string) => ({
  id,
  name,
  address: '',
  region: null,
  googleMapsAddress: null,
  phone: null,
  lat: null,
  lng: null,
  active: true,
});

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'ana', name: 'ANali', email: 'a@k.pe', role: 'especialista' } }),
}));
vi.mock('../hooks/useBranches', () => ({
  useBranches: () => ({
    branches: [branch('bagua', 'Bagua'), branch('chacha', 'Chachapoyas'), branch('jaen', 'Jaén')],
    isLoading: false,
    error: null,
  }),
}));
vi.mock('../services/myBranchesService', () => ({ getMyPanelBranches: vi.fn() }));
vi.mock('../utils/date', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../utils/date')>()),
  getTodayIsoDate: () => '2026-11-23',
}));

function Selected() {
  const { selectedBranchId, isLoading } = usePanelBranch();
  return <p data-testid="selected">{isLoading ? 'cargando' : selectedBranchId || 'todas'}</p>;
}

function renderPanel() {
  return render(
    <PanelBranchProvider>
      <PanelBranchSelector />
      <Selected />
    </PanelBranchProvider>,
  );
}

describe('PanelBranchProvider + PanelBranchSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('abre en la sede donde tiene horario hoy (lunes en Lima)', async () => {
    vi.mocked(getMyPanelBranches).mockResolvedValue({ branchIds: ['bagua', 'jaen'], todayBranchIds: ['jaen'] });

    renderPanel();

    expect(await screen.findByLabelText('Sede')).toHaveValue('jaen');
    expect(getMyPanelBranches).toHaveBeenCalledWith('ana', 'especialista', 1);
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Todas mis sedes',
      'Bagua',
      'Jaén',
    ]);
  });

  it('con horario en varias sedes hoy, abre en "Todas mis sedes"', async () => {
    vi.mocked(getMyPanelBranches).mockResolvedValue({ branchIds: ['bagua', 'jaen'], todayBranchIds: ['bagua', 'jaen'] });

    renderPanel();

    expect(await screen.findByLabelText('Sede')).toHaveValue('');
    expect(screen.getByTestId('selected')).toHaveTextContent('todas');
  });

  it('recuerda la sede elegida mientras dure la sesión', async () => {
    vi.mocked(getMyPanelBranches).mockResolvedValue({ branchIds: ['bagua', 'jaen'], todayBranchIds: ['jaen'] });
    const user = userEvent.setup();
    const { unmount } = renderPanel();

    await user.selectOptions(await screen.findByLabelText('Sede'), '');
    expect(screen.getByTestId('selected')).toHaveTextContent('todas');
    unmount();

    renderPanel();
    expect(await screen.findByLabelText('Sede')).toHaveValue('');
  });

  it('con una sola sede no muestra el selector', async () => {
    vi.mocked(getMyPanelBranches).mockResolvedValue({ branchIds: ['bagua'], todayBranchIds: [] });

    renderPanel();

    expect(await screen.findByText('todas')).toBeInTheDocument();
    expect(screen.queryByLabelText('Sede')).not.toBeInTheDocument();
  });
});
