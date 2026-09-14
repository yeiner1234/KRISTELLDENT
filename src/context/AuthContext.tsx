import { createContext, useMemo, useState, type ReactNode } from 'react';
import type { User, UserRole } from '../types/User';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, role: UserRole) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);

  const login = (email: string, role: UserRole) => {
    setUser({ id: `user-${Date.now()}`, name: email.split('@')[0] ?? email, email, role });
  };

  const logout = () => {
    setUser(null);
  };

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: user !== null, login, logout }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
