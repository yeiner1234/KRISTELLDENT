import { supabase } from '../lib/supabase';
import { avatarObjectPath } from '../utils/avatar';

const BUCKET = 'avatars';

const NOT_ENABLED_MESSAGE =
  'Las fotos de perfil aún no están habilitadas. Aplica la migración 20261124001200_foto_perfil.sql.';

function friendlyStorageError(message: string): string {
  if (/bucket not found/i.test(message)) {
    return NOT_ENABLED_MESSAGE;
  }
  if (/row-level security|unauthorized|not authorized/i.test(message)) {
    return 'No tienes permiso para cambiar la foto de esta persona.';
  }
  if (/payload too large|exceeded the maximum/i.test(message)) {
    return 'La foto es demasiado pesada. Prueba con otra.';
  }
  return 'No se pudo subir la foto. Revisa tu conexión e inténtalo de nuevo.';
}

function friendlyRpcError(message: string): string {
  if (/set_profile_avatar|could not find the function/i.test(message)) {
    return NOT_ENABLED_MESSAGE;
  }
  return message;
}

export function getAvatarUrl(path: string | null | undefined): string | null {
  if (!path) {
    return null;
  }
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

// Borra un archivo que ya no se usa. Si falla solo queda un archivo huérfano:
// no se interrumpe a la persona.
async function removeQuietly(path: string | null): Promise<void> {
  if (!path) {
    return;
  }
  await supabase.storage.from(BUCKET).remove([path]);
}

// Guarda la ruta en el perfil (la base revisa el permiso) y devuelve la anterior.
async function savePath(userId: string, path: string | null): Promise<string | null> {
  const { data, error } = await supabase.rpc('set_profile_avatar', { p_user_id: userId, p_path: path });
  if (error) {
    throw new Error(friendlyRpcError(error.message));
  }
  return (data as string | null) ?? null;
}

// Sube la foto (ya recortada y en JPG), la deja en el perfil y borra la anterior.
export async function uploadAvatar(userId: string, photo: Blob): Promise<string> {
  const path = avatarObjectPath(userId, Date.now());

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, photo, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false });
  if (uploadError) {
    throw new Error(friendlyStorageError(uploadError.message));
  }

  let previous: string | null;
  try {
    previous = await savePath(userId, path);
  } catch (error) {
    await removeQuietly(path);
    throw error;
  }

  await removeQuietly(previous);
  return path;
}

export async function removeAvatar(userId: string): Promise<void> {
  const previous = await savePath(userId, null);
  await removeQuietly(previous);
}
