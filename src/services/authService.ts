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
}

function mapProfileToUser(profile: ProfileRow): User {
  return {
    id: profile.id,
    name: profile.full_name,
    email: profile.email,
    role: profile.role,
  };
}

async function fetchOwnProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, active')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function login({ email, password }: LoginCredentials): Promise<User> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.session) {
    throw new Error('Correo o contraseña incorrectos.');
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
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

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
