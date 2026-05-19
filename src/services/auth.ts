import api from './api';
import type { AuthSession } from '../types';

export async function getCsrfToken(): Promise<string> {
  const res = await api.get('/auth/csrf');
  return res.data.csrfToken;
}

export async function getSession(): Promise<AuthSession> {
  const res = await api.get('/auth/session');
  return res.data;
}

export async function login(username: string, password: string): Promise<AuthSession> {
  const csrfToken = await getCsrfToken();
  await api.post('/auth/login', { username, password }, {
    headers: { 'X-CSRF-Token': csrfToken },
    maxRedirects: 0,
    validateStatus: (status) => status >= 200 && status < 400,
  });
  const session = await getSession();
  if (session.authToken) localStorage.setItem('authToken', session.authToken);
  return session;
}

export async function logout(): Promise<void> {
  const csrfToken = await getCsrfToken();
  await api.post('/auth/logout', {}, {
    headers: { 'X-CSRF-Token': csrfToken },
  });
  localStorage.removeItem('authToken');
}
