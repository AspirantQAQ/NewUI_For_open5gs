import api from './api';
import type { NfConfig, NfConfigSummary, SyncStatus, SyncResult } from '../types';

export async function listNfConfigs(): Promise<NfConfigSummary[]> {
  const res = await api.get('/config/nfs');
  return res.data;
}

export async function getNfConfig(nfType: string): Promise<NfConfig> {
  const res = await api.get(`/config/nfs/${nfType}`);
  return res.data;
}

export async function updateNfConfig(nfType: string, config: Record<string, unknown>): Promise<NfConfig> {
  const res = await api.put(`/config/nfs/${nfType}`, { config });
  return res.data;
}

export async function syncNfConfig(nfType: string): Promise<{ success: boolean; nfType: string; syncedAt: string }> {
  const res = await api.post(`/config/sync/${nfType}`);
  return res.data;
}

export async function syncAllNfConfigs(): Promise<{ results: SyncResult[] }> {
  const res = await api.post('/config/sync');
  return res.data;
}

export async function importNfConfig(nfType: string): Promise<NfConfig> {
  const res = await api.post(`/config/import/${nfType}`);
  return res.data;
}

export async function getSyncStatus(): Promise<SyncStatus[]> {
  const res = await api.get('/config/status');
  return res.data;
}
