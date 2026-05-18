import { useState, useEffect } from 'react';
import {
  Paper, Typography, TextField, Button, Grid, Tabs, Tab, Alert,
  IconButton, Box,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SyncStatusBar from '../../components/SyncStatusBar';
import { useNfConfig, useUpdateNfConfig } from '../../hooks/useNfConfig';

interface SmfSubnetEntry {
  subnet: string;
  gateway: string;
}

interface UpfSubnetEntry {
  subnet: string;
}

interface SmfForm {
  pfcpAddress: string;
  gtpcAddress: string;
  gtpuAddress: string;
  upfConnectionAddress: string;
  sessionSubnets: SmfSubnetEntry[];
  dns: string;
  mtu: string;
}

interface UpfForm {
  pfcpAddress: string;
  gtpuAddress: string;
  sessionSubnets: UpfSubnetEntry[];
}

const DEFAULT_SMF: SmfForm = {
  pfcpAddress: '',
  gtpcAddress: '',
  gtpuAddress: '',
  upfConnectionAddress: '',
  sessionSubnets: [{ subnet: '', gateway: '' }] as SmfSubnetEntry[],
  dns: '',
  mtu: '',
};

const DEFAULT_UPF: UpfForm = {
  pfcpAddress: '',
  gtpuAddress: '',
  sessionSubnets: [{ subnet: '' }] as UpfSubnetEntry[],
};

function extractSmfForm(config: Record<string, unknown>): SmfForm {
  const subnets = config.sessionSubnets as Array<Record<string, string>> | undefined;
  return {
    pfcpAddress: (config.pfcpAddress as string) ?? '',
    gtpcAddress: (config.gtpcAddress as string) ?? '',
    gtpuAddress: (config.gtpuAddress as string) ?? '',
    upfConnectionAddress: (config.upfConnectionAddress as string) ?? '',
    sessionSubnets: subnets && subnets.length > 0
      ? subnets.map(s => ({ subnet: s.subnet ?? '', gateway: s.gateway ?? '' }))
      : [{ subnet: '', gateway: '' }],
    dns: (config.dns as string) ?? '',
    mtu: (config.mtu as string) ?? '',
  };
}

function extractUpfForm(config: Record<string, unknown>): UpfForm {
  const subnets = config.sessionSubnets as Array<Record<string, string>> | undefined;
  return {
    pfcpAddress: (config.pfcpAddress as string) ?? '',
    gtpuAddress: (config.gtpuAddress as string) ?? '',
    sessionSubnets: subnets && subnets.length > 0
      ? subnets.map(s => ({ subnet: s.subnet ?? '' }))
      : [{ subnet: '' }],
  };
}

export default function SessionUpf() {
  const [tab, setTab] = useState(0);

  const { data: smfData } = useNfConfig('smf');
  const { data: upfData } = useNfConfig('upf');
  const updateSmf = useUpdateNfConfig('smf');
  const updateUpf = useUpdateNfConfig('upf');

  const [smfForm, setSmfForm] = useState<SmfForm>(DEFAULT_SMF);
  const [upfForm, setUpfForm] = useState<UpfForm>(DEFAULT_UPF);

  useEffect(() => {
    if (smfData?.config) {
      setSmfForm(extractSmfForm(smfData.config));
    }
  }, [smfData]);

  useEffect(() => {
    if (upfData?.config) {
      setUpfForm(extractUpfForm(upfData.config));
    }
  }, [upfData]);

  // Subnet consistency check
  const smfSubnets = smfForm.sessionSubnets.map(s => s.subnet).filter(Boolean).sort();
  const upfSubnets = upfForm.sessionSubnets.map(s => s.subnet).filter(Boolean).sort();
  const subnetsMismatch = smfSubnets.length > 0 && upfSubnets.length > 0 &&
    (smfSubnets.length !== upfSubnets.length ||
      smfSubnets.some((s, i) => s !== upfSubnets[i]));

  // --- SMF handlers ---
  const updateSmfField = <K extends keyof SmfForm>(key: K, value: SmfForm[K]) => {
    setSmfForm(prev => ({ ...prev, [key]: value }));
  };

  const updateSmfSubnet = (index: number, field: keyof SmfSubnetEntry, value: string) => {
    setSmfForm(prev => {
      const next = [...prev.sessionSubnets];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, sessionSubnets: next };
    });
  };

  const addSmfSubnet = () => {
    setSmfForm(prev => ({
      ...prev,
      sessionSubnets: [...prev.sessionSubnets, { subnet: '', gateway: '' } as SmfSubnetEntry],
    }));
  };

  const removeSmfSubnet = (index: number) => {
    setSmfForm(prev => ({
      ...prev,
      sessionSubnets: prev.sessionSubnets.filter((_, i) => i !== index),
    }));
  };

  const handleSaveSmf = async () => {
    const base = smfData?.config ? structuredClone(smfData.config) : {};
    const merged = {
      ...base,
      pfcpAddress: smfForm.pfcpAddress,
      gtpcAddress: smfForm.gtpcAddress,
      gtpuAddress: smfForm.gtpuAddress,
      upfConnectionAddress: smfForm.upfConnectionAddress,
      sessionSubnets: smfForm.sessionSubnets,
      dns: smfForm.dns,
      mtu: smfForm.mtu,
    };
    await updateSmf.mutateAsync(merged);
  };

  // --- UPF handlers ---
  const updateUpfField = <K extends keyof UpfForm>(key: K, value: UpfForm[K]) => {
    setUpfForm(prev => ({ ...prev, [key]: value }));
  };

  const updateUpfSubnet = (index: number, value: string) => {
    setUpfForm(prev => {
      const next = [...prev.sessionSubnets];
      next[index] = { ...next[index], subnet: value };
      return { ...prev, sessionSubnets: next };
    });
  };

  const addUpfSubnet = () => {
    setUpfForm(prev => ({
      ...prev,
      sessionSubnets: [...prev.sessionSubnets, { subnet: '' } as UpfSubnetEntry],
    }));
  };

  const removeUpfSubnet = (index: number) => {
    setUpfForm(prev => ({
      ...prev,
      sessionSubnets: prev.sessionSubnets.filter((_, i) => i !== index),
    }));
  };

  const handleSaveUpf = async () => {
    const base = upfData?.config ? structuredClone(upfData.config) : {};
    const merged = {
      ...base,
      pfcpAddress: upfForm.pfcpAddress,
      gtpuAddress: upfForm.gtpuAddress,
      sessionSubnets: upfForm.sessionSubnets,
    };
    await updateUpf.mutateAsync(merged);
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>会话与用户面</Typography>

      <SyncStatusBar />

      {subnetsMismatch && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          SMF 与 UPF 的会话子网列表不一致，请检查配置。
        </Alert>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="SMF" />
        <Tab label="UPF" />
      </Tabs>

      {/* ==================== SMF Tab ==================== */}
      {tab === 0 && (
        <Box>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="PFCP 地址"
                fullWidth
                value={smfForm.pfcpAddress}
                onChange={e => updateSmfField('pfcpAddress', e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="GTP-C 地址"
                fullWidth
                value={smfForm.gtpcAddress}
                onChange={e => updateSmfField('gtpcAddress', e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="GTP-U 地址"
                fullWidth
                value={smfForm.gtpuAddress}
                onChange={e => updateSmfField('gtpuAddress', e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="UPF 连接地址"
                fullWidth
                value={smfForm.upfConnectionAddress}
                onChange={e => updateSmfField('upfConnectionAddress', e.target.value)}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle1" sx={{ mt: 1, mb: 1 }}>会话子网列表</Typography>
              {smfForm.sessionSubnets.map((entry, idx) => (
                <Box key={idx} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                  <TextField
                    label="子网"
                    size="small"
                    sx={{ flex: 1 }}
                    value={entry.subnet}
                    onChange={e => updateSmfSubnet(idx, 'subnet', e.target.value)}
                  />
                  <TextField
                    label="网关"
                    size="small"
                    sx={{ flex: 1 }}
                    value={entry.gateway}
                    onChange={e => updateSmfSubnet(idx, 'gateway', e.target.value)}
                  />
                  <IconButton
                    color="error"
                    onClick={() => removeSmfSubnet(idx)}
                    disabled={smfForm.sessionSubnets.length <= 1}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              ))}
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={addSmfSubnet}
              >
                添加子网
              </Button>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="DNS（逗号分隔）"
                fullWidth
                value={smfForm.dns}
                onChange={e => updateSmfField('dns', e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="MTU"
                fullWidth
                value={smfForm.mtu}
                onChange={e => updateSmfField('mtu', e.target.value)}
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSaveSmf}
              disabled={updateSmf.isPending}
            >
              {updateSmf.isPending ? '保存中…' : '保存 SMF 配置'}
            </Button>
            {updateSmf.isError && (
              <Alert severity="error" sx={{ flex: 1 }}>
                保存失败：{(updateSmf.error as Error)?.message ?? '未知错误'}
              </Alert>
            )}
            {updateSmf.isSuccess && (
              <Alert severity="success" sx={{ flex: 1 }}>SMF 配置已保存</Alert>
            )}
          </Box>
        </Box>
      )}

      {/* ==================== UPF Tab ==================== */}
      {tab === 1 && (
        <Box>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="PFCP 地址"
                fullWidth
                value={upfForm.pfcpAddress}
                onChange={e => updateUpfField('pfcpAddress', e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="GTP-U 地址"
                fullWidth
                value={upfForm.gtpuAddress}
                onChange={e => updateUpfField('gtpuAddress', e.target.value)}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle1" sx={{ mt: 1, mb: 1 }}>会话子网列表</Typography>
              {upfForm.sessionSubnets.map((entry, idx) => (
                <Box key={idx} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                  <TextField
                    label="子网"
                    size="small"
                    sx={{ flex: 1 }}
                    value={entry.subnet}
                    onChange={e => updateUpfSubnet(idx, e.target.value)}
                  />
                  <IconButton
                    color="error"
                    onClick={() => removeUpfSubnet(idx)}
                    disabled={upfForm.sessionSubnets.length <= 1}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              ))}
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={addUpfSubnet}
              >
                添加子网
              </Button>
            </Grid>
          </Grid>

          <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSaveUpf}
              disabled={updateUpf.isPending}
            >
              {updateUpf.isPending ? '保存中…' : '保存 UPF 配置'}
            </Button>
            {updateUpf.isError && (
              <Alert severity="error" sx={{ flex: 1 }}>
                保存失败：{(updateUpf.error as Error)?.message ?? '未知错误'}
              </Alert>
            )}
            {updateUpf.isSuccess && (
              <Alert severity="success" sx={{ flex: 1 }}>UPF 配置已保存</Alert>
            )}
          </Box>
        </Box>
      )}
    </Paper>
  );
}
