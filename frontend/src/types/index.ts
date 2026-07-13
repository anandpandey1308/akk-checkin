export type UserRole = 'admin' | 'checkin' | 'display' | 'doctor' | 'filemanager';

export interface User {
  id: number;
  name: string;
  username: string;
  role: UserRole;
}

export interface AuthResponse {
  user: User;
}

export interface LogoutResponse {
  message: string;
}

export interface ApiError {
  message: string;
  status: number;
  originalError?: any;
}
