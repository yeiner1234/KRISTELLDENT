import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '../lib/supabase';
import { getAvatarUrl, removeAvatar, uploadAvatar } from './avatarService';

const bucket = {
  upload: vi.fn(),
  remove: vi.fn(),
  getPublicUrl: vi.fn((path: string) => ({ data: { publicUrl: `https://cdn/avatars/${path}` } })),
};

vi.mock('../lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
    storage: { from: vi.fn(() => bucket) },
  },
}));

const photo = new Blob(['x'], { type: 'image/jpeg' });

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(Date, 'now').mockReturnValue(1000);
  bucket.upload.mockResolvedValue({ data: {}, error: null });
  bucket.remove.mockResolvedValue({ data: [], error: null });
});

describe('getAvatarUrl', () => {
  it('da la URL pública de la ruta, o null sin foto', () => {
    expect(getAvatarUrl('u1/1.jpg')).toBe('https://cdn/avatars/u1/1.jpg');
    expect(getAvatarUrl(null)).toBeNull();
    expect(getAvatarUrl(undefined)).toBeNull();
  });
});

describe('uploadAvatar', () => {
  it('sube la foto, la guarda en el perfil y borra la anterior', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: 'u1/500.jpg', error: null } as never);

    const path = await uploadAvatar('u1', photo);

    expect(path).toBe('u1/1000.jpg');
    expect(supabase.storage.from).toHaveBeenCalledWith('avatars');
    expect(bucket.upload).toHaveBeenCalledWith('u1/1000.jpg', photo, expect.objectContaining({ contentType: 'image/jpeg', upsert: false }));
    expect(supabase.rpc).toHaveBeenCalledWith('set_profile_avatar', { p_user_id: 'u1', p_path: 'u1/1000.jpg' });
    expect(bucket.remove).toHaveBeenCalledWith(['u1/500.jpg']);
  });

  it('sin foto anterior no borra nada', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as never);

    await uploadAvatar('u1', photo);

    expect(bucket.remove).not.toHaveBeenCalled();
  });

  it('si falla la subida no toca el perfil', async () => {
    bucket.upload.mockResolvedValue({ data: null, error: { message: 'new row violates row-level security policy' } });

    await expect(uploadAvatar('u2', photo)).rejects.toThrow('No tienes permiso para cambiar la foto de esta persona.');
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('si el perfil no la acepta, borra el archivo recién subido y muestra el motivo', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: { message: 'No puedes cambiar la foto de esta persona.' } } as never);

    await expect(uploadAvatar('u1', photo)).rejects.toThrow('No puedes cambiar la foto de esta persona.');
    expect(bucket.remove).toHaveBeenCalledWith(['u1/1000.jpg']);
  });

  it('sin la migración aplicada da un mensaje claro', async () => {
    bucket.upload.mockResolvedValue({ data: null, error: { message: 'Bucket not found' } });

    await expect(uploadAvatar('u1', photo)).rejects.toThrow('Las fotos de perfil aún no están habilitadas');
  });

  it('un error al borrar la foto anterior no hace fallar el cambio', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: 'u1/500.jpg', error: null } as never);
    bucket.remove.mockResolvedValue({ data: null, error: { message: 'boom' } });

    await expect(uploadAvatar('u1', photo)).resolves.toBe('u1/1000.jpg');
  });
});

describe('removeAvatar', () => {
  it('quita la foto del perfil y borra el archivo', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: 'u1/500.jpg', error: null } as never);

    await removeAvatar('u1');

    expect(supabase.rpc).toHaveBeenCalledWith('set_profile_avatar', { p_user_id: 'u1', p_path: null });
    expect(bucket.remove).toHaveBeenCalledWith(['u1/500.jpg']);
  });

  it('muestra el error de la base', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: { message: 'No puedes cambiar la foto de esta persona.' } } as never);

    await expect(removeAvatar('u1')).rejects.toThrow('No puedes cambiar la foto de esta persona.');
  });
});
