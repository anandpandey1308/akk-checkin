import * as React from 'react';
import type { User } from '@/types';
import type { LoginCredentials } from '@/features/auth/schemas/auth.schema';
import { AuthService } from '@/services/auth.service';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials, onSuccess?: (user: User) => Promise<void>) => Promise<User>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const checkSession = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const me = await AuthService.getMe();
      setUser(me);
    } catch (err) {
      // Unauthenticated, clear local user
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    checkSession();
  }, [checkSession]);

  const login = React.useCallback(async (credentials: LoginCredentials, onSuccess?: (user: User) => Promise<void>): Promise<User> => {
    try {
      const loggedUser = await AuthService.login(credentials);
      
      if (onSuccess) {
        await onSuccess(loggedUser);
      }
      
      setUser(loggedUser);
      
      // Handle Remember Me on frontend
      if (credentials.rememberMe) {
        localStorage.setItem('akk_remembered_user', credentials.emailOrUsername);
      } else {
        localStorage.removeItem('akk_remembered_user');
      }
      
      return loggedUser;
    } catch (error) {
      throw error;
    }
  }, []);

  const logout = React.useCallback(async (): Promise<void> => {
    try {
      await AuthService.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const value = React.useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
      checkSession,
    }),
    [user, isLoading, login, logout, checkSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
