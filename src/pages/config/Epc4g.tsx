import { useState, useEffect } from 'react';
import {
  Paper, Typography, TextField, Button, Grid,
  Accordion, AccordionSummary, AccordionDetails, Alert
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SaveIcon from '@mui/icons-material/Save';
import SyncStatusBar from '../../components/SyncStatusBar';
import { useNfConfig, useUpdateNfConfig } from '../../hooks/useNfConfig';

export default function Epc4g() {
  // ── MME state ──────────────────────────────────────────────
  const [mmeS1ap, setMmeS1ap] = useState('');
  const [mmeGtpc, setMmeGtpc] = useState('');
  const [mmeSgwcAddr, setMmeSgwcAddr] = useState('');
  const [mmeSmfAddr, setMmeSmfAddr] = useState('');
  const [mmeMcc, setMmeMcc] = useState('');
  const [mmeMnc, setMmeMnc] = useState('');
  const [mmeGid, setMmeGid] = useState('');
  const [mmeCode, setMmeCode] = useState('');
  const [mmeName, setMmeName] = useState('');
  const [mmeSaved, setMmeSaved] = useState(false);

  // ── SGWC state ─────────────────────────────────────────────
  const [sgwcGtpc, setSgwcGtpc] = useState('');
  const [sgwcPfcp, setSgwcPfcp] = useState('');
  const [sgwcSgwuAddr, setSgwcSgwuAddr] = useState('');
  const [sgwcSaved, setSgwcSaved] = useState(false);

  // ── SGWU state ─────────────────────────────────────────────
  const [sgwuPfcp, setSgwuPfcp] = useState('');
  const [sgwuGtpu, setSgwuGtpu] = useState('');
  const [sgwuSaved, setSgwuSaved] = useState(false);

  // ── Data queries ───────────────────────────────────────────
  const mmeQuery = useNfConfig('mme');
  const sgwcQuery = useNfConfig('sgwc');
  const sgwuQuery = useNfConfig('sgwu');

  // ── Mutations ──────────────────────────────────────────────
  const updateMme = useUpdateNfConfig('mme');
  const updateSgwc = useUpdateNfConfig('sgwc');
  const updateSgwu = useUpdateNfConfig('sgwu');

  // ── Load MME ───────────────────────────────────────────────
  useEffect(() => {
    if (!mmeQuery.data?.config) return;
    const c = mmeQuery.data.config as Record<string, any>;

    if (c.s1ap?.addr) setMmeS1ap(c.s1ap.addr);
    if (c.gtpc?.addr) setMmeGtpc(c.gtpc.addr);
    if (c.gtpc?.client?.sgwc?.addr) setMmeSgwcAddr(c.gtpc.client.sgwc.addr);
    if (c.gtpc?.client?.smf?.addr) setMmeSmfAddr(c.gtpc.client.smf.addr);
    if (c.gummei?.plmn_id?.mcc) setMmeMcc(String(c.gummei.plmn_id.mcc));
    if (c.gummei?.plmn_id?.mnc) setMmeMnc(String(c.gummei.plmn_id.mnc));
    if (c.gummei?.mme_gid) setMmeGid(String(c.gummei.mme_gid));
    if (c.gummei?.mme_code) setMmeCode(String(c.gummei.mme_code));
    if (c.mme_name) setMmeName(c.mme_name);
  }, [mmeQuery.data]);

  // ── Load SGWC ──────────────────────────────────────────────
  useEffect(() => {
    if (!sgwcQuery.data?.config) return;
    const c = sgwcQuery.data.config as Record<string, any>;

    if (c.gtpc?.addr) setSgwcGtpc(c.gtpc.addr);
    if (c.pfcp?.addr) setSgwcPfcp(c.pfcp.addr);
    if (c.pfcp?.client?.sgwu?.addr) setSgwcSgwuAddr(c.pfcp.client.sgwu.addr);
  }, [sgwcQuery.data]);

  // ── Load SGWU ──────────────────────────────────────────────
  useEffect(() => {
    if (!sgwuQuery.data?.config) return;
    const c = sgwuQuery.data.config as Record<string, any>;

    if (c.pfcp?.addr) setSgwuPfcp(c.pfcp.addr);
    if (c.gtpu?.addr) setSgwuGtpu(c.gtpu.addr);
  }, [sgwuQuery.data]);

  // ── Save handlers ──────────────────────────────────────────
  const handleSaveMme = () => {
    const base = mmeQuery.data?.config
      ? structuredClone(mmeQuery.data.config as Record<string, any>)
      : {};

    base.s1ap = { ...(base.s1ap || {}), addr: mmeS1ap };
    base.gtpc = {
      ...(base.gtpc || {}),
      addr: mmeGtpc,
      client: {
        ...(base.gtpc?.client || {}),
        sgwc: { addr: mmeSgwcAddr },
        smf: { addr: mmeSmfAddr },
      },
    };
    base.gummei = {
      plmn_id: { mcc: mmeMcc, mnc: mmeMnc },
      mme_gid: mmeGid,
      mme_code: mmeCode,
    };
    base.mme_name = mmeName;

    updateMme.mutate(base, { onSuccess: () => setMmeSaved(true) });
  };

  const handleSaveSgwc = () => {
    const base = sgwcQuery.data?.config
      ? structuredClone(sgwcQuery.data.config as Record<string, any>)
      : {};

    base.gtpc = { ...(base.gtpc || {}), addr: sgwcGtpc };
    base.pfcp = {
      ...(base.pfcp || {}),
      addr: sgwcPfcp,
      client: {
        ...(base.pfcp?.client || {}),
        sgwu: { addr: sgwcSgwuAddr },
      },
    };

    updateSgwc.mutate(base, { onSuccess: () => setSgwcSaved(true) });
  };

  const handleSaveSgwu = () => {
    const base = sgwuQuery.data?.config
      ? structuredClone(sgwuQuery.data.config as Record<string, any>)
      : {};

    base.pfcp = { ...(base.pfcp || {}), addr: sgwuPfcp };
    base.gtpu = { ...(base.gtpu || {}), addr: sgwuGtpu };

    updateSgwu.mutate(base, { onSuccess: () => setSgwuSaved(true) });
  };

  // ── Render ─────────────────────────────────────────────────
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>4G EPC</Typography>
      <SyncStatusBar />

      {/* ── MME ──────────────────────────────────────────────── */}
      <Accordion defaultExpanded sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">MME</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {mmeSaved && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMmeSaved(false)}>
              保存成功
            </Alert>
          )}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="S1AP 地址" value={mmeS1ap}
                onChange={e => setMmeS1ap(e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="GTP-C 地址" value={mmeGtpc}
                onChange={e => setMmeGtpc(e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="SGWC 地址" value={mmeSgwcAddr}
                onChange={e => setMmeSgwcAddr(e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="SMF 地址" value={mmeSmfAddr}
                onChange={e => setMmeSmfAddr(e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField fullWidth label="MCC" value={mmeMcc}
                onChange={e => setMmeMcc(e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField fullWidth label="MNC" value={mmeMnc}
                onChange={e => setMmeMnc(e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField fullWidth label="MME GID" value={mmeGid}
                onChange={e => setMmeGid(e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField fullWidth label="MME Code" value={mmeCode}
                onChange={e => setMmeCode(e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 8 }}>
              <TextField fullWidth label="MME Name" value={mmeName}
                onChange={e => setMmeName(e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Button variant="contained" startIcon={<SaveIcon />}
                onClick={handleSaveMme} disabled={updateMme.isPending}>
                保存 MME
              </Button>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* ── HSS ──────────────────────────────────────────────── */}
      <Accordion sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">HSS</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Alert severity="info">freeDiameter 配置通过文件管理</Alert>
        </AccordionDetails>
      </Accordion>

      {/* ── SGWC ─────────────────────────────────────────────── */}
      <Accordion sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">SGWC</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {sgwcSaved && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSgwcSaved(false)}>
              保存成功
            </Alert>
          )}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField fullWidth label="GTP-C 地址" value={sgwcGtpc}
                onChange={e => setSgwcGtpc(e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField fullWidth label="PFCP 地址" value={sgwcPfcp}
                onChange={e => setSgwcPfcp(e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField fullWidth label="SGWU 地址" value={sgwcSgwuAddr}
                onChange={e => setSgwcSgwuAddr(e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Button variant="contained" startIcon={<SaveIcon />}
                onClick={handleSaveSgwc} disabled={updateSgwc.isPending}>
                保存 SGWC
              </Button>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* ── SGWU ─────────────────────────────────────────────── */}
      <Accordion sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">SGWU</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {sgwuSaved && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSgwuSaved(false)}>
              保存成功
            </Alert>
          )}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="PFCP 地址" value={sgwuPfcp}
                onChange={e => setSgwuPfcp(e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="GTP-U 地址" value={sgwuGtpu}
                onChange={e => setSgwuGtpu(e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Button variant="contained" startIcon={<SaveIcon />}
                onClick={handleSaveSgwu} disabled={updateSgwu.isPending}>
                保存 SGWU
              </Button>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* ── PCRF ─────────────────────────────────────────────── */}
      <Accordion sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">PCRF</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Alert severity="info">freeDiameter 配置通过文件管理</Alert>
        </AccordionDetails>
      </Accordion>
    </Paper>
  );
}
