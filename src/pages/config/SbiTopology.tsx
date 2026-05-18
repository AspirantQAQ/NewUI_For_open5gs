import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Paper, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Collapse, Box, TextField,
  Select, MenuItem, FormControl, InputLabel, Button, Grid, Alert,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import SaveIcon from '@mui/icons-material/Save';
import SyncStatusBar from '../../components/SyncStatusBar';
import { getNfConfig, updateNfConfig } from '../../services/config';
import type { NfConfig } from '../../types';

const SBI_NFS = ['nrf', 'scp', 'amf', 'smf', 'ausf', 'udm', 'udr', 'pcf', 'nssf', 'bsf'] as const;

const CLIENT_MODES = ['none', 'nrf', 'scp'] as const;

const NF_LABELS: Record<string, string> = {
  nrf: 'NRF',
  scp: 'SCP',
  amf: 'AMF',
  smf: 'SMF',
  ausf: 'AUSF',
  udm: 'UDM',
  udr: 'UDR',
  pcf: 'PCF',
  nssf: 'NSSF',
  bsf: 'BSF',
};

interface SbiRow {
  nfType: string;
  address: string;
  port: string;
  clientMode: string;
  clientUri: string;
}

function getSbiData(config: NfConfig, nfType: string): SbiRow {
  const cfg = config.config as Record<string, unknown>;
  const sbi = (cfg?.sbi ?? {}) as Record<string, unknown>;
  const client = (sbi?.client ?? {}) as Record<string, unknown>;

  return {
    nfType,
    address: String(sbi?.ad ?? ''),
    port: String(sbi?.port ?? ''),
    clientMode: String(client?.mode ?? 'none'),
    clientUri: String(client?.uri ?? ''),
  };
}

function fetchAllSbiConfigs(): Promise<Record<string, SbiRow>> {
  const promises = SBI_NFS.map(async (nfType) => {
    try {
      const config = await getNfConfig(nfType);
      return [nfType, getSbiData(config, nfType)] as const;
    } catch {
      return [nfType, { nfType, address: '', port: '', clientMode: 'none', clientUri: '' }] as const;
    }
  });
  return Promise.all(promises).then(Object.fromEntries);
}

export default function SbiTopology() {
  const queryClient = useQueryClient();

  const { data: rows, isLoading, error } = useQuery<Record<string, SbiRow>>({
    queryKey: ['allSbiConfigs'],
    queryFn: fetchAllSbiConfigs,
  });

  const [editing, setEditing] = useState<Record<string, SbiRow>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saveResults, setSaveResults] = useState<Record<string, 'success' | 'error'>>({});

  const toggleExpand = (nfType: string) => {
    setExpanded((prev) => ({ ...prev, [nfType]: !prev[nfType] }));
  };

  const startEdit = (row: SbiRow) => {
    setEditing((prev) => ({ ...prev, [row.nfType]: { ...row } }));
    if (!expanded[row.nfType]) {
      setExpanded((prev) => ({ ...prev, [row.nfType]: true }));
    }
  };

  const updateEdit = (nfType: string, field: keyof SbiRow, value: string) => {
    setEditing((prev) => ({
      ...prev,
      [nfType]: { ...prev[nfType], [field]: value },
    }));
  };

  const handleSave = async (nfType: string) => {
    const editRow = editing[nfType];
    if (!editRow) return;

    setSaving((prev) => ({ ...prev, [nfType]: true }));
    setSaveResults((prev) => {
      const next = { ...prev };
      delete next[nfType];
      return next;
    });

    try {
      const current = await getNfConfig(nfType);
      const updated = { ...(current.config as Record<string, unknown>) };
      const sbi = { ...((updated.sbi as Record<string, unknown>) ?? {}) };
      const client = { ...((sbi.client as Record<string, unknown>) ?? {}) };

      sbi.ad = editRow.address;
      sbi.port = Number(editRow.port) || 0;
      client.mode = editRow.clientMode;
      client.uri = editRow.clientUri;
      sbi.client = client;
      updated.sbi = sbi;

      await updateNfConfig(nfType, updated);
      setSaveResults((prev) => ({ ...prev, [nfType]: 'success' }));
      setEditing((prev) => {
        const next = { ...prev };
        delete next[nfType];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ['allSbiConfigs'] });
    } catch {
      setSaveResults((prev) => ({ ...prev, [nfType]: 'error' }));
    } finally {
      setSaving((prev) => ({ ...prev, [nfType]: false }));
    }
  };

  const cancelEdit = (nfType: string) => {
    setEditing((prev) => {
      const next = { ...prev };
      delete next[nfType];
      return next;
    });
  };

  const getRow = (nfType: string): SbiRow => {
    if (editing[nfType]) return editing[nfType];
    return rows?.[nfType] ?? { nfType, address: '', port: '', clientMode: 'none', clientUri: '' };
  };

  if (isLoading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>5GC SBI Network Topology</Typography>
        <Typography color="text.secondary">Loading...</Typography>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>5GC SBI Network Topology</Typography>
        <Alert severity="error">Failed to load NF configurations</Alert>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>5GC SBI Network Topology</Typography>
      <SyncStatusBar />

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 48 }} />
              <TableCell sx={{ width: 80 }}>NF</TableCell>
              <TableCell>SBI Address</TableCell>
              <TableCell sx={{ width: 100 }}>Port</TableCell>
              <TableCell sx={{ width: 140 }}>Client Mode</TableCell>
              <TableCell>Connection URI</TableCell>
              <TableCell sx={{ width: 100 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {SBI_NFS.map((nfType) => {
              const row = getRow(nfType);
              const isOpen = expanded[nfType] ?? false;
              const editingNf = !!editing[nfType];
              const savingNf = saving[nfType] ?? false;

              return (
                <TableRow key={nfType} hover>
                  <TableCell>
                    <IconButton size="small" onClick={() => toggleExpand(nfType)}>
                      {isOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ fontWeight: 'bold' }}>{NF_LABELS[nfType]}</Box>
                  </TableCell>
                  <TableCell>{row.address || '-'}</TableCell>
                  <TableCell>{row.port || '-'}</TableCell>
                  <TableCell>{row.clientMode}</TableCell>
                  <TableCell>{row.clientUri || '-'}</TableCell>
                  <TableCell>
                    {!editingNf && (
                      <Button size="small" variant="outlined" onClick={() => startEdit(row)}>
                        Edit
                      </Button>
                    )}
                    {editingNf && (
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<SaveIcon />}
                          onClick={() => handleSave(nfType)}
                          disabled={savingNf}
                        >
                          {savingNf ? '...' : 'Save'}
                        </Button>
                        <Button size="small" variant="outlined" onClick={() => cancelEdit(nfType)}>
                          X
                        </Button>
                      </Box>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ mt: 1 }}>
        {SBI_NFS.map((nfType) => {
          const row = getRow(nfType);
          const isOpen = expanded[nfType] ?? false;
          const editingNf = !!editing[nfType];
          const savingNf = saving[nfType] ?? false;
          const result = saveResults[nfType];

          return (
            <Collapse key={`panel-${nfType}`} in={isOpen} timeout="auto" unmountOnExit>
              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, mb: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  {NF_LABELS[nfType]} SBI Configuration
                </Typography>
                {result === 'success' && (
                  <Alert severity="success" sx={{ mb: 1, py: 0 }}>Saved successfully</Alert>
                )}
                {result === 'error' && (
                  <Alert severity="error" sx={{ mb: 1, py: 0 }}>Save failed</Alert>
                )}
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="SBI Address"
                      value={row.address}
                      onChange={(e) => updateEdit(nfType, 'address', e.target.value)}
                      disabled={!editingNf}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Port"
                      type="number"
                      value={row.port}
                      onChange={(e) => updateEdit(nfType, 'port', e.target.value)}
                      disabled={!editingNf}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Client Mode</InputLabel>
                      <Select
                        value={row.clientMode}
                        label="Client Mode"
                        onChange={(e) => updateEdit(nfType, 'clientMode', e.target.value)}
                        disabled={!editingNf}
                      >
                        {CLIENT_MODES.map((m) => (
                          <MenuItem key={m} value={m}>{m}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Connection URI"
                      value={row.clientUri}
                      onChange={(e) => updateEdit(nfType, 'clientUri', e.target.value)}
                      disabled={!editingNf}
                    />
                  </Grid>
                  <Grid size={12}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {!editingNf ? (
                        <Button size="small" variant="outlined" onClick={() => startEdit(row)}>
                          Edit
                        </Button>
                      ) : (
                        <>
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<SaveIcon />}
                            onClick={() => handleSave(nfType)}
                            disabled={savingNf}
                          >
                            {savingNf ? 'Saving...' : 'Save'}
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => cancelEdit(nfType)}
                          >
                            Cancel
                          </Button>
                        </>
                      )}
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            </Collapse>
          );
        })}
      </Box>
    </Paper>
  );
}
