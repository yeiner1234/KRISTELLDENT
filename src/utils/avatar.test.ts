import { describe, expect, it } from 'vitest';
import type { AppRole } from '../types/User';
import { avatarObjectPath, canManageProfilePhoto, centerSquareCrop, validateAvatarFile } from './avatar';

describe('validateAvatarFile', () => {
  it('acepta JPG, PNG y WebP de hasta 10 MB', () => {
    expect(validateAvatarFile({ type: 'image/jpeg', size: 3_000_000 })).toBeNull();
    expect(validateAvatarFile({ type: 'image/png', size: 10 * 1024 * 1024 })).toBeNull();
    expect(validateAvatarFile({ type: 'image/webp', size: 1 })).toBeNull();
  });

  it('rechaza otros formatos con un mensaje claro', () => {
    expect(validateAvatarFile({ type: 'application/pdf', size: 1000 })).toBe('Elige una imagen JPG, PNG o WebP.');
    expect(validateAvatarFile({ type: '', size: 1000 })).toBe('Elige una imagen JPG, PNG o WebP.');
  });

  it('rechaza imágenes de más de 10 MB', () => {
    expect(validateAvatarFile({ type: 'image/jpeg', size: 10 * 1024 * 1024 + 1 })).toBe('La imagen pesa más de 10 MB. Elige otra más liviana.');
  });
});

describe('centerSquareCrop', () => {
  it('recorta el centro de una foto horizontal', () => {
    expect(centerSquareCrop(1200, 800)).toEqual({ sx: 200, sy: 0, size: 800 });
  });

  it('recorta el centro de una foto vertical', () => {
    expect(centerSquareCrop(600, 1000)).toEqual({ sx: 0, sy: 200, size: 600 });
  });

  it('una foto cuadrada queda igual', () => {
    expect(centerSquareCrop(500, 500)).toEqual({ sx: 0, sy: 0, size: 500 });
  });
});

describe('avatarObjectPath', () => {
  it('guarda en la carpeta de la cuenta con la marca de tiempo', () => {
    expect(avatarObjectPath('u-1', 1732460000000)).toBe('u-1/1732460000000.jpg');
  });
});

describe('canManageProfilePhoto', () => {
  const me = (role: AppRole) => ({ id: 'yo', role });

  it('cada persona cambia su propia foto', () => {
    expect(canManageProfilePhoto(me('tecnica'), { id: 'yo', role: 'tecnica' })).toBe(true);
    expect(canManageProfilePhoto(me('admin_sede'), { id: 'yo', role: 'admin_sede' })).toBe(true);
  });

  it('admin_global cambia la de cualquiera', () => {
    expect(canManageProfilePhoto(me('admin_global'), { id: 'otra', role: 'admin_sede' })).toBe(true);
  });

  it('admin_sede cambia la del personal de su sede, no la de otras admins', () => {
    expect(canManageProfilePhoto(me('admin_sede'), { id: 'otra', role: 'tecnica' })).toBe(true);
    expect(canManageProfilePhoto(me('admin_sede'), { id: 'otra', role: 'especialista' })).toBe(true);
    expect(canManageProfilePhoto(me('admin_sede'), { id: 'otra', role: 'admin_sede' })).toBe(false);
    expect(canManageProfilePhoto(me('admin_sede'), { id: 'otra', role: 'admin_global' })).toBe(false);
  });

  it('el resto no cambia fotos ajenas', () => {
    expect(canManageProfilePhoto(me('tecnica'), { id: 'otra', role: 'tecnica' })).toBe(false);
    expect(canManageProfilePhoto(null, { id: 'otra', role: 'tecnica' })).toBe(false);
  });
});
