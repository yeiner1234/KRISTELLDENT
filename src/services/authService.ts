import { supabase } from '../lib/supabase';
import type { AppRole, User } from '../types/User';

export interface LoginCredentials {
  email: string;
  password: string;
}

interface ProfileRow {
  id: string;
  full_name: string;
  email: string;
  role: AppRole;
  active: boolean;
  avatar_path?: string | null;
}

function mapProfileToUser(profile: ProfileRow): User {
  return {
    id: profile.id,
    name: profile.full_name,
    email: profile.email,
    role: profile.role,
    avatarPath: profile.avatar_path ?? null,
  };
}

async function fetchOwnProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, active, avatar_path')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

function describeAuthError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes('invalid login credentials')) {
    return 'Correo o contraseña incorrectos.';
  }
  if (normalized.includes('email not confirmed')) {
    return 'Este correo todavía no fue confirmado. Revisa la bandeja de entrada del correo de confirmación.';
  }
  if (normalized.includes('rate limit') || normalized.includes('too many requests')) {
    return 'Demasiados intentos seguidos. Espera un minuto y vuelve a intentarlo.';
  }
  if (normalized.includes('failed to fetch') || normalized.includes('network')) {
    return 'No se pudo conectar con el servidor. Revisa tu conexión o la configuración de Supabase (.env.local).';
  }

  // Cause not recognized: show the real Supabase message instead of hiding it,
  // so a misconfigured project/key doesn't look identical to a wrong password.
  return `No se pudo iniciar sesión: ${message}`;
}

export async function login({ email, password }: LoginCredentials): Promise<User> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.session) {
    throw new Error(describeAuthError(error?.message ?? 'Respuesta de autenticación vacía.'));
  }

  const profile = await fetchOwnProfile(data.session.user.id);

  if (!profile || !profile.active) {
    await supabase.auth.signOut();
    throw new Error('Esta cuenta no tiene acceso autorizado a la plataforma.');
  }

  return mapProfileToUser(profile);
}

export async function logout(): Promise<void> {
  await supabase.auth.signOut();
}

export async function getCurrentUser(): Promise<User | null> {
  const { data } = await supabase.auth.getSession();
  const session = data.session;

  if (!session) {
    return null;
  }

  const profile = await fetchOwnProfile(session.user.id);

  if (!profile || !profile.active) {
    return null;
  }

  return mapProfileToUser(profile);
}

export async function requestPasswordReset(email: string): Promise<void> {
  const redirectTo = `${window.location.origin}/actualizar-contrasena`;
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });

  if (error) {
    throw new Error(error.message);
  }
}

export function onAuthStateChange(callback: (userId: string | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user.id ?? null);
  });

  return () => data.subscription.unsubscribe();
}
