export type UserRole = 'admin' | 'super_admin' | 'coordinator' | 'student';

export interface User {
  id?: number;
  _id?: string;
  email: string;
  role: UserRole;
  name?: string;
  department_code?: string;
  permissions?: string[];
  profile_photo_url?: string;
}

export interface AuthResponse {
  id?: number;
  email: string;
  message: string;
  role: UserRole;
  token: string;
  name?: string;
  department_code?: string;
  permissions?: string[];
  profile_photo_url?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}
