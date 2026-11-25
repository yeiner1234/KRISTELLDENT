import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import Avatar from './Avatar';

vi.mock('../../services/avatarService', () => ({
  getAvatarUrl: (path: string | null | undefined) => (path ? `https://cdn/avatars/${path}` : null),
}));

describe('Avatar', () => {
  it('muestra la foto si hay', () => {
    render(<Avatar name="Ana Ruiz" path="u1/1.jpg" />);

    expect(screen.getByRole('img', { name: 'Foto de Ana Ruiz' })).toHaveAttribute('src', 'https://cdn/avatars/u1/1.jpg');
  });

  it('sin foto muestra las iniciales', () => {
    render(<Avatar name="Ana Ruiz" path={null} />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('AR')).toBeInTheDocument();
  });

  it('si la foto no carga vuelve a las iniciales', () => {
    render(<Avatar name="Ana Ruiz" path="u1/1.jpg" />);

    fireEvent.error(screen.getByRole('img'));

    expect(screen.getByText('AR')).toBeInTheDocument();
  });
});
