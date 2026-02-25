export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
}

export interface LoginResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  user: User;
}

export interface RefreshResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}
