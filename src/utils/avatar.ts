import type { AppRole } from '../types/User';

// Fotos de perfil: validación del archivo elegido y recorte cuadrado.

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
// La foto se reduce a AVATAR_SIZE px antes de subirla; esto es solo el
// límite del archivo original que elige la persona.
const MAX_SOURCE_BYTES = 10 * 1024 * 1024;

export const AVATAR_SIZE = 512;

export function validateAvatarFile(file: { type: string; size: number }): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Elige una imagen JPG, PNG o WebP.';
  }
  if (file.size > MAX_SOURCE_BYTES) {
    return 'La imagen pesa más de 10 MB. Elige otra más liviana.';
  }
  return null;
}

// Cuadrado más grande centrado en la imagen.
export function centerSquareCrop(width: number, height: number): { sx: number; sy: number; size: number } {
  const size = Math.min(width, height);
  return { sx: Math.round((width - size) / 2), sy: Math.round((height - size) / 2), size };
}

// Cada foto nueva tiene otra ruta: el navegador nunca muestra la anterior.
export function avatarObjectPath(userId: string, timestamp: number): string {
  return `${userId}/${timestamp}.jpg`;
}

// Si la pantalla ofrece cambiar la foto de una persona. Refleja
// can_manage_profile_photo (la base decide igual): la propia, admin_global
// cualquiera y admin_sede la del personal (Equipo ya solo muestra su sede).
export function canManageProfilePhoto(
  viewer: { id: string; role: AppRole } | null,
  member: { id: string; role: AppRole },
): boolean {
  if (!viewer) return false;
  if (viewer.id === member.id || viewer.role === 'admin_global') return true;
  return viewer.role === 'admin_sede' && ['tecnica', 'especialista', 'odontologa_general'].includes(member.role);
}
