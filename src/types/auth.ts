export interface IAuthManager {
  getAuthUrl(): Promise<string>;
  checkAuthStatus(token: string): Promise<IUserData>;
}

export interface IUserData {
  id: string;
  username: string;
  email: string;
  is_active: boolean;
  current_session: string;
}

export interface IAuthResponse {
  url: string;
}
