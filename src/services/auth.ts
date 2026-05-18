import api from './api';
import type { AuthSession } from '../types';

export async function getSession(): Promise<AuthSession> {
  const res = await api.get('/auth/session');
  return res.data;
}

export async function login(username: string, password: string): Promise<AuthSession> {
  await api.post('/auth/login', { username, password });
  const session = await getSession();
  if (session.authToken) localStorage.setItem('authToken', session.authToken);
  return session;
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout');
  localStorage.removeItem('authToken');
}
