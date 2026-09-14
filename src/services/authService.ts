import type { User } from '../types/User';

export interface LoginCredentials {
  email: string;
  password: string;
}

export async function login(credentials: LoginCredentials): Promise<User> {
  void credentials;
  throw new Error('authService.login not implemented yet — pending API integration');
}

export async function logout(): Promise<void> {
  return Promise.resolve();
}

export async function getCurrentUser(): Promise<User | null> {
  return Promise.resolve(null);
}
