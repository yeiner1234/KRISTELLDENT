import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AuthProvider } from './AuthContext';
import { useAuth } from '../hooks/useAuth';
import * as authService from '../services/authService';
import type { User } from '../types/User';

vi.mock('../services/authService', () => ({
  getCurrentUser: vi.fn(),
  onAuthStateChange: vi.fn(() => () => {}),
  login: vi.fn(),
  logout: vi.fn(),
}));

const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('si no puede comprobar la sesión, deja de cargar y da un mensaje', async () => {
    vi.mocked(authService.getCurrentUser).mockRejectedValue(new Error('Failed to fetch'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user).toBeNull();
    expect(result.current.sessionError).toBe(
      'No se pudo comprobar tu sesión. Revisa tu conexión e inténtalo de nuevo.',
    );
  });

  it('cerrar sesión limpia el usuario aunque Supabase falle', async () => {
    vi.mocked(authService.getCurrentUser).mockResolvedValue({ id: 'u1', role: 'admin_global' } as User);
    vi.mocked(authService.logout).mockRejectedValue(new Error('Failed to fetch'));

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.user).not.toBeNull());

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
  });
});
