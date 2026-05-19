import { useState, useEffect } from 'react';
import {
  Paper, Typography, TextField, Button, Grid, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SyncStatusBar from '../../components/SyncStatusBar';
import { useNfConfig } from '../../hooks/useNfConfig';
import { getNfConfig, updateNfConfig } from '../../services/config';
import { useQueryClient } from '@tanstack/react-query';

const PLMN_NFS = ['amf', 'mme', 'nrf'];

interface SnssaiEntry {
  sst: string;
  sd: string;
}

export default function PlmnIdentity() {
  const [mcc, setMcc] = useState('');
  const [mnc, setMnc] = useState('');
  const [tac, setTac] = useState('');
  const [networkFull, setNetworkFull] = useState('');
  const [networkShort, setNetworkShort] = useState('');
  const [snssaiList, setSnssaiList] = useState<SnssaiEntry[]>([{ sst: '', sd: '' }]);
  const [security5g, setSecurity5g] = useState('');
  const [security4g, setSecurity4g] = useState('');

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const amfConfig = useNfConfig('amf');
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!amfConfig.data?.config) return;
    const cfg = amfConfig.data.config as Record<string, unknown>;

    const plmn = (cfg.plmn_list ?? cfg.plmnlist) as Record<string, unknown>[] | undefined;
    const firstPlmn = Array.isArray(plmn) ? plmn[0] : undefined;
    if (firstPlmn) {
      if (firstPlmn.plmn_id) {
        const plmnId = firstPlmn.plmn_id as Record<string, unknown>;
        if (plmnId.mcc) setMcc(String(plmnId.mcc));
        if (plmnId.mnc) setMnc(String(plmnId.mnc));
      }
      if (firstPlmn.tac) setTac(String(firstPlmn.tac));
    }

    const slices = (cfg.s_nssai ?? cfg.snssai) as Record<string, unknown>[] | undefined;
    if (Array.isArray(slices) && slices.length > 0) {
      setSnssaiList(
        slices.map((s) => ({
          sst: s.sst != null ? String(s.sst) : '',
          sd: s.sd != null ? String(s.sd) : '',
        }))
      );
    }

    const netName = cfg.network as Record<string, unknown> | undefined;
    if (netName) {
      if (netName.full) setNetworkFull(String(netName.full));
      if (netName.short) setNetworkShort(String(netName.short));
    }

    const secInfo = cfg.security as Record<string, unknown> | undefined;
    if (secInfo) {
      if (Array.isArray(secInfo.integrity_order)) {
        setSecurity5g((secInfo.integrity_order as string[]).join(', '));
      }
      if (Array.isArray(secInfo.ciphering_order)) {
        setSecurity4g((secInfo.ciphering_order as string[]).join(', '));
      }
    }
  }, [amfConfig.data]);

  const handleAddSnssai = () => {
    setSnssaiList((prev) => [...prev, { sst: '', sd: '' }]);
  };

  const handleRemoveSnssai = (index: number) => {
    setSnssaiList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSnssaiChange = (index: number, field: keyof SnssaiEntry, value: string) => {
    setSnssaiList((prev) =>
      prev.map((entry, i) => (i === index ? { ...entry, [field]: value } : entry))
    );
  };

  const parseCommaList = (text: string): string[] =>
    text
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

  const buildConfig = (existing: Record<string, unknown>): Record<string, unknown> => {
    const updated = { ...existing };
    const plmnList = (updated.plmn_list ?? updated.plmnlist ?? [{}]) as Record<string, unknown>[];
    if (plmnList.length === 0) plmnList.push({});
    plmnList[0] = {
      ...plmnList[0],
      plmn_id: {
        ...(typeof plmnList[0].plmn_id === 'object' && plmnList[0].plmn_id !== null
          ? plmnList[0].plmn_id
          : {}),
        mcc,
        mnc,
      },
      tac: tac,
    };
    updated.plmn_list = plmnList;
    delete updated.plmnlist;

    updated.network = {
      ...(typeof updated.network === 'object' && updated.network !== null
        ? updated.network
        : {}),
      full: networkFull,
      short: networkShort,
    };

    updated.s_nssai = snssaiList
      .filter((e) => e.sst !== '')
      .map((e) => {
        const entry: Record<string, unknown> = { sst: parseInt(e.sst) || 0 };
        if (e.sd) entry.sd = e.sd;
        return entry;
      });
    delete updated.snssai;

    const existingSec =
      typeof updated.security === 'object' && updated.security !== null
        ? (updated.security as Record<string, unknown>)
        : {};
    updated.security = {
      ...existingSec,
      integrity_order: parseCommaList(security5g),
      ciphering_order: parseCommaList(security4g),
    };

    return updated;
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const targets = ['amf', 'mme'];
      for (const nf of targets) {
        try {
          const current = await getNfConfig(nf);
          const updated = buildConfig(current.config as Record<string, unknown>);
          await updateNfConfig(nf, updated);
        } catch {
          // NF may not exist in DB yet, skip
        }
      }
      queryClient.invalidateQueries({ queryKey: ['syncStatus'] });
      for (const nf of targets) {
        queryClient.invalidateQueries({ queryKey: ['nfConfig', nf] });
      }
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
      setConfirmOpen(false);
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        PLMN / 网络标识
      </Typography>
      <SyncStatusBar />

      {saved && (
        <Alert severity="success" sx={{ mb: 2 }}>
          保存成功
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            fullWidth
            label="MCC"
            value={mcc}
            onChange={(e) => setMcc(e.target.value.replace(/\D/g, '').slice(0, 3))}
            slotProps={{ htmlInput: { maxLength: 3 } }}
            helperText="3 位数字"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            fullWidth
            label="MNC"
            value={mnc}
            onChange={(e) => setMnc(e.target.value.replace(/\D/g, '').slice(0, 3))}
            slotProps={{ htmlInput: { maxLength: 3 } }}
            helperText="2-3 位数字"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            fullWidth
            label="TAC"
            value={tac}
            onChange={(e) => setTac(e.target.value)}
            helperText="Tracking Area Code"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label="网络全称"
            value={networkFull}
            onChange={(e) => setNetworkFull(e.target.value)}
            helperText="network.full"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label="网络简称"
            value={networkShort}
            onChange={(e) => setNetworkShort(e.target.value)}
            helperText="network.short"
          />
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Typography variant="subtitle1" gutterBottom>
            S-NSSAI 切片列表
          </Typography>
          {snssaiList.map((entry, idx) => (
            <Grid container spacing={2} key={idx} sx={{ mb: 1, alignItems: 'center' }}>
              <Grid size={{ xs: 4, sm: 3 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="SST"
                  value={entry.sst}
                  onChange={(e) => handleSnssaiChange(idx, 'sst', e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 4, sm: 3 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="SD（可选）"
                  value={entry.sd}
                  onChange={(e) => handleSnssaiChange(idx, 'sd', e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 4, sm: 1 }}>
                <IconButton
                  color="error"
                  onClick={() => handleRemoveSnssai(idx)}
                  disabled={snssaiList.length <= 1}
                >
                  <DeleteIcon />
                </IconButton>
              </Grid>
            </Grid>
          ))}
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={handleAddSnssai}
            sx={{ mt: 1 }}
          >
            添加切片
          </Button>
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label="5G 安全算法"
            value={security5g}
            onChange={(e) => setSecurity5g(e.target.value)}
            helperText="逗号分隔，例如: NIA0, NIA1, NIA2"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label="4G 安全算法"
            value={security4g}
            onChange={(e) => setSecurity4g(e.target.value)}
            helperText="逗号分隔，例如: EIA0, EIA1, EIA2"
          />
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={() => setConfirmOpen(true)}
            disabled={saving}
          >
            保存
          </Button>
        </Grid>
      </Grid>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>确认保存</DialogTitle>
        <DialogContent>
          <Typography>
            将 PLMN 标识配置写入 {PLMN_NFS.length} 个网络功能（AMF、MME、NRF）。确认继续？
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            确认保存
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
