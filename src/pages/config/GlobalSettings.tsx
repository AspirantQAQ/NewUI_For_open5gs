import { useState, useEffect } from 'react';
import {
  Paper, Typography, TextField, Select, MenuItem, FormControl,
  InputLabel, FormControlLabel, Checkbox, Button, Box, Grid, Alert
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import SyncStatusBar from '../../components/SyncStatusBar';
import { useNfConfig } from '../../hooks/useNfConfig';
import { useQueryClient } from '@tanstack/react-query';
import { getNfConfig, updateNfConfig } from '../../services/config';

const NF_TYPES = [
  'nrf', 'scp', 'amf', 'smf', 'upf', 'ausf', 'udm', 'udr',
  'pcf', 'nssf', 'bsf', 'mme', 'hss', 'sgwc', 'sgwu', 'pcrf', 'sepp1', 'sepp2'
];

const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'];

export default function GlobalSettings() {
  const [logLevel, setLogLevel] = useState('info');
  const [logPath, setLogPath] = useState('/var/log/open5gs');
  const [maxUe, setMaxUe] = useState('1024');
  const [maxPeer, setMaxPeer] = useState('');
  const [dbUri, setDbUri] = useState('mongodb://localhost/open5gs');
  const [applyTo, setApplyTo] = useState<string[]>([...NF_TYPES]);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const amfConfig = useNfConfig('amf');

  useEffect(() => {
    if (amfConfig.data?.config) {
      const cfg = amfConfig.data.config as any;
      if (cfg.logger?.file?.path) {
        const p = cfg.logger.file.path;
        setLogPath(p.replace(/\/[^/]+\.log$/, ''));
      }
      if (cfg.global?.max?.ue) setMaxUe(String(cfg.global.max.ue));
      if (cfg.global?.max?.peer) setMaxPeer(String(cfg.global.max.peer));
    }
  }, [amfConfig.data]);

  const queryClient = useQueryClient();

  const handleToggleNf = (nf: string) => {
    setApplyTo(prev =>
      prev.includes(nf) ? prev.filter(n => n !== nf) : [...prev, nf]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    for (const nf of applyTo) {
      try {
        const current = await getNfConfig(nf);
        const updated = { ...current.config } as any;
        updated.logger = updated.logger || {};
        updated.logger.file = updated.logger.file || {};
        updated.logger.file.path = `${logPath}/${nf}.log`;
        if (logLevel) updated.logger.level = logLevel;
        updated.global = updated.global || {};
        updated.global.max = updated.global.max || {};
        updated.global.max.ue = parseInt(maxUe) || 1024;
        if (maxPeer) updated.global.max.peer = parseInt(maxPeer) || 64;
        if (['hss', 'pcrf', 'udr', 'pcf'].includes(nf)) {
          updated.db_uri = dbUri;
        }
        await updateNfConfig(nf, updated);
      } catch {
        // NF may not have MongoDB record yet, skip
      }
    }
    queryClient.invalidateQueries({ queryKey: ['syncStatus'] });
    setSaving(false);
    setSaved(true);
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>全局设置</Typography>
      <SyncStatusBar />
      {saved && <Alert severity="success" sx={{ mb: 2 }}>保存成功</Alert>}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <FormControl fullWidth>
            <InputLabel>日志级别</InputLabel>
            <Select value={logLevel} label="日志级别" onChange={e => setLogLevel(e.target.value)}>
              {LOG_LEVELS.map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField fullWidth label="日志路径前缀" value={logPath}
            onChange={e => setLogPath(e.target.value)}
            helperText="自动补充: /<nf>.log" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField fullWidth label="最大 UE 数" type="number" value={maxUe}
            onChange={e => setMaxUe(e.target.value)} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField fullWidth label="最大 Peer 数（可选）" type="number" value={maxPeer}
            onChange={e => setMaxPeer(e.target.value)} />
        </Grid>
        <Grid size={12}>
          <TextField fullWidth label="MongoDB 连接串" value={dbUri}
            onChange={e => setDbUri(e.target.value)}
            helperText="仅影响 HSS / PCRF / UDR / PCF" />
        </Grid>
        <Grid size={12}>
          <Typography variant="subtitle2" gutterBottom>应用到以下 NF：</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {NF_TYPES.map(nf => (
              <FormControlLabel key={nf} control={
                <Checkbox size="small" checked={applyTo.includes(nf)}
                  onChange={() => handleToggleNf(nf)} />
              } label={nf.toUpperCase()} />
            ))}
          </Box>
        </Grid>
        <Grid size={12}>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={saving}>
            保存
          </Button>
        </Grid>
      </Grid>
    </Paper>
  );
}
