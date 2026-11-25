import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AvatarUploadModal from './AvatarUploadModal';
import { removeAvatar, uploadAvatar } from '../../services/avatarService';

vi.mock('../../services/avatarService', () => ({
  getAvatarUrl: (path: string | null | undefined) => (path ? `https://cdn/avatars/${path}` : null),
  uploadAvatar: vi.fn(),
  removeAvatar: vi.fn(),
}));

const onChanged = vi.fn();
const onClose = vi.fn();

function renderModal(props: Partial<Parameters<typeof AvatarUploadModal>[0]> = {}) {
  render(
    <AvatarUploadModal
      userId="u1"
      name="Ana Ruiz"
      role="tecnica"
      avatarPath={null}
      isOwn
      onClose={onClose}
      onChanged={onChanged}
      {...props}
    />,
  );
  return userEvent.setup({ applyAccept: false });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AvatarUploadModal', () => {
  it('a una profesional le avisa que su foto sale en la página principal', () => {
    renderModal({ role: 'especialista' });

    expect(screen.getByText(/sale en la página principal/)).toBeInTheDocument();
  });

  it('rechaza un archivo que no es imagen y no sube nada', async () => {
    const user = renderModal();

    await user.upload(screen.getByLabelText('Elegir foto'), new File(['x'], 'cv.pdf', { type: 'application/pdf' }));

    expect(screen.getByText('Elige una imagen JPG, PNG o WebP.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar foto' })).toBeDisabled();
    expect(uploadAvatar).not.toHaveBeenCalled();
  });

  it('quita la foto actual', async () => {
    vi.mocked(removeAvatar).mockResolvedValue();
    const user = renderModal({ avatarPath: 'u1/1.jpg' });

    expect(screen.getByRole('img', { name: 'Foto de Ana Ruiz' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Quitar foto' }));

    expect(removeAvatar).toHaveBeenCalledWith('u1');
    expect(onChanged).toHaveBeenCalledWith(null);
    expect(onClose).toHaveBeenCalled();
  });

  it('muestra el error si no se puede quitar', async () => {
    vi.mocked(removeAvatar).mockRejectedValue(new Error('No puedes cambiar la foto de esta persona.'));
    const user = renderModal({ avatarPath: 'u1/1.jpg', isOwn: false });

    expect(screen.getByRole('dialog', { name: 'Foto de Ana Ruiz' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Quitar foto' }));

    expect(await screen.findByText('No puedes cambiar la foto de esta persona.')).toBeInTheDocument();
    expect(onChanged).not.toHaveBeenCalled();
  });
});
