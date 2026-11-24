import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddProfessionalToBranchModal from './AddProfessionalToBranchModal';
import { searchProfessionalsDirectory } from '../../services/offerService';

vi.mock('../../services/offerService', () => ({ searchProfessionalsDirectory: vi.fn() }));
vi.mock('../../services/professionalService', () => ({ addProfessionalToBranch: vi.fn() }));

const onCreateNew = vi.fn();

function renderModal() {
  render(
    <AddProfessionalToBranchModal
      branches={[{ id: 'jaen', name: 'Jaén' }]}
      onClose={vi.fn()}
      onAdded={vi.fn()}
      onCreateNew={onCreateNew}
    />,
  );
  return userEvent.setup();
}

async function search(user: ReturnType<typeof userEvent.setup>, text: string) {
  await user.type(screen.getByLabelText('Nombre de la profesional'), text);
  await user.click(screen.getByRole('button', { name: 'Buscar' }));
}

describe('AddProfessionalToBranchModal', () => {
  it('antes de buscar explica qué hacer', () => {
    renderModal();

    expect(screen.getByText(/Escribe su nombre y pulsa Buscar/)).toBeInTheDocument();
  });

  it('pide al menos 2 letras', async () => {
    const user = renderModal();
    await search(user, 'c');

    expect(screen.getByText('Escribe al menos 2 letras del nombre.')).toBeInTheDocument();
    expect(searchProfessionalsDirectory).not.toHaveBeenCalled();
  });

  it('sin resultados lo dice con el nombre buscado', async () => {
    vi.mocked(searchProfessionalsDirectory).mockResolvedValue([]);
    const user = renderModal();
    await search(user, 'zoila');

    expect(await screen.findByText('No encontramos a nadie llamado “zoila”.')).toBeInTheDocument();
  });

  it('muestra rol, especialidades y sedes; si ya atiende en mis sedes no ofrece agregarla', async () => {
    vi.mocked(searchProfessionalsDirectory).mockResolvedValue([
      { id: 'carla', fullName: 'Carla Díaz', role: 'especialista', specialtyNames: ['Endodoncia'], branchIds: ['jaen'], branchNames: ['Jaén'] },
    ]);
    const user = renderModal();
    await search(user, 'carla');

    expect(await screen.findByText('Carla Díaz')).toBeInTheDocument();
    expect(screen.getByText('1 profesional encontrada')).toBeInTheDocument();
    expect(screen.getByText('Especialista')).toBeInTheDocument();
    expect(screen.getByText('Endodoncia')).toBeInTheDocument();
    expect(screen.getByText('CD')).toBeInTheDocument();
    expect(screen.getByText('Ya atiende en tus sedes')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Agregar a/ })).not.toBeInTheDocument();
  });

  it('"Nuevo profesional" lleva a crear la ficha', async () => {
    const user = renderModal();
    await user.click(screen.getByRole('button', { name: 'Nuevo profesional' }));

    expect(onCreateNew).toHaveBeenCalledTimes(1);
  });
});
