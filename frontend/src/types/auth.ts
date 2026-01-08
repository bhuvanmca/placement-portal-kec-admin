export interface User {
  _id?: string;
  email: string;
  role: string;
  name?: string;
}

export interface AuthResponse {
  email: string;
  message: string;
  role: string;
  token: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}
