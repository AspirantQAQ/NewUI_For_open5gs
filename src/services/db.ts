import api from './api';
import type { Subscriber, Profile, Account } from '../types/db';

// --- Subscribers ---

export async function listSubscribers(): Promise<Subscriber[]> {
  const res = await api.get('/db/subscribers');
  return res.data;
}

export async function getSubscriber(imsi: string): Promise<Subscriber> {
  const res = await api.get(`/db/subscribers/${imsi}`);
  return res.data;
}

export async function createSubscriber(data: Omit<Subscriber, '_id' | '__v'>): Promise<Subscriber> {
  const res = await api.post('/db/subscribers', data);
  return res.data;
}

export async function updateSubscriber(imsi: string, data: Partial<Subscriber>): Promise<Subscriber> {
  const res = await api.put(`/db/subscribers/${imsi}`, data);
  return res.data;
}

export async function deleteSubscriber(imsi: string): Promise<void> {
  await api.delete(`/db/subscribers/${imsi}`);
}

// --- Profiles ---

export async function listProfiles(): Promise<Profile[]> {
  const res = await api.get('/db/profiles');
  return res.data;
}

export async function getProfile(id: string): Promise<Profile> {
  const res = await api.get(`/db/profiles/${id}`);
  return res.data;
}

export async function createProfile(data: Omit<Profile, '_id' | '__v'>): Promise<Profile> {
  const res = await api.post('/db/profiles', data);
  return res.data;
}

export async function updateProfile(id: string, data: Partial<Profile>): Promise<Profile> {
  const res = await api.put(`/db/profiles/${id}`, data);
  return res.data;
}

export async function deleteProfile(id: string): Promise<void> {
  await api.delete(`/db/profiles/${id}`);
}

// --- Accounts ---

export async function listAccounts(): Promise<Account[]> {
  const res = await api.get('/db/accounts');
  return res.data;
}

export async function createAccount(username: string, password: string, roles: string[]): Promise<Account> {
  const res = await api.post('/db/accounts', { username, roles, password });
  return res.data;
}

export async function updateAccount(username: string, data: { roles?: string[]; password?: string }): Promise<void> {
  await api.put(`/db/accounts/${username}`, data);
}

export async function deleteAccount(username: string): Promise<void> {
  await api.delete(`/db/accounts/${username}`);
}
