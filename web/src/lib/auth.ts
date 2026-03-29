import api from './api';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface OrgContext {
  orgId: string;
  orgSlug: string;
  orgName: string;
  role: string;
}

export async function login(email: string, password: string) {
  const { data } = await api.post('/auth/login', { email, password });
  if (data.success) {
    localStorage.setItem('placd_access_token', data.data.accessToken);
    localStorage.setItem('placd_refresh_token', data.data.refreshToken);
  }
  return data;
}

export async function getMyOrgs(): Promise<OrgContext[]> {
  const { data } = await api.get('/orgs/me');
  return data.data;
}

export function logout() {
  localStorage.removeItem('placd_access_token');
  localStorage.removeItem('placd_refresh_token');
  window.location.href = '/login';
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('placd_access_token');
}
