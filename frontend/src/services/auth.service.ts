import { api } from './api';
import type { AuthResponse, LogoutResponse, User } from '@/types';
import type { LoginCredentials } from '@/features/auth/schemas/auth.schema';

export const AuthService = {
  /**
   * Logs in a user with username and password credentials.
   * Note that even though the UI might display "Email", the database schema and 
   * Express routes strictly map this to 'username'.
   */
  async login(credentials: LoginCredentials): Promise<User> {
    const response = await api.post<AuthResponse>('/auth/login', {
      username: credentials.emailOrUsername,
      password: credentials.password,
    });
    return response.data.user;
  },

  /**
   * Logs out the current session and clears cookies.
   */
  async logout(): Promise<void> {
    await api.post<LogoutResponse>('/auth/logout');
  },

  /**
   * Fetches the current authenticated user's session.
   * Throws 401 if unauthenticated.
   */
  async getMe(): Promise<User> {
    const response = await api.get<AuthResponse>('/auth/me');
    return response.data.user;
  },
};

export default AuthService;
