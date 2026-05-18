export interface NfConfigMeta {
  lastSyncedAt: string | null;
  lastModifiedAt: string;
  lastModifiedBy: string;
  yamlPath: string;
}

export interface NfConfig {
  _id: string;
  nfType: string;
  config: Record<string, unknown>;
  meta: NfConfigMeta;
  createdAt: string;
  updatedAt: string;
}

export interface NfConfigSummary {
  _id: string;
  nfType: string;
  meta: NfConfigMeta;
}

export interface SyncStatus {
  nfType: string;
  lastSyncedAt: string | null;
  lastModifiedAt: string;
  pendingSync: boolean;
}

export interface SyncResult {
  nfType: string;
  success: boolean;
  error?: string;
}

export interface AuthSession {
  clientMaxAge: number;
  csrfToken: string;
  user?: { _id: string; username: string; roles: string[] };
  authToken?: string;
}
