import { createContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { User } from '../types/User';
import * as authService from '../services/authService';
import type { LoginCredentials } from '../services/authService';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  // Mensaje si no se pudo comprobar la sesión al abrir la app (por ejemplo, sin red).
  sessionError: string | null;
  login: (credentials: LoginCredentials) => Promise<User>;
  logout: () => Promise<void>;
  // Tras cambiar la propia foto de perfil.
  setAvatarPath: (path: string | null) => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    authService
      .getCurrentUser()
      .then((currentUser) => {
        if (isMounted) setUser(currentUser);
      })
      .catch(() => {
        if (isMounted) setSessionError('No se pudo comprobar tu sesión. Revisa tu conexión e inténtalo de nuevo.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    const unsubscribe = authService.onAuthStateChange((userId) => {
      if (!userId && isMounted) {
        setUser(null);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const login = async (credentials: LoginCredentials) => {
    const nextUser = await authService.login(credentials);
    setSessionError(null);
    setUser(nextUser);
    return nextUser;
  };

  // signOut borra la sesión local aunque falle la llamada al servidor, así
  // que el usuario sale de la app igual.
  const logout = async () => {
    try {
      await authService.logout();
    } catch {
      // Sin nada que mostrar: la sesión local ya no existe.
    } finally {
      setUser(null);
    }
  };

  const setAvatarPath = (path: string | null) => {
    setUser((current) => (current ? { ...current, avatarPath: path } : current));
  };

  const value = useMemo<AuthContextValue>(
    () => ({ user, isLoading, sessionError, login, logout, setAvatarPath }),
    [user, isLoading, sessionError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
