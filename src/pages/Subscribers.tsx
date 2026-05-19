import { useState, useMemo } from 'react';
import {
  Box, Typography, TextField, IconButton, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Dialog, DialogTitle,
  DialogContent, DialogActions, Button, Fab, Tooltip, Chip, Stack,
  Accordion, AccordionSummary, AccordionDetails, FormControl, InputLabel,
  Select, MenuItem, FormControlLabel, Checkbox, Snackbar,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  useSubscribers, useCreateSubscriber, useUpdateSubscriber, useDeleteSubscriber,
  useProfiles,
} from '../hooks/useDb';
import type { Subscriber } from '../types/db';

const AMBR_UNITS = ['bps', 'Kbps', 'Mbps', 'Gbps', 'Tbps'];
const SESSION_TYPES = [{ value: 1, label: 'IPv4' }, { value: 2, label: 'IPv6' }, { value: 3, label: 'IPv4v6' }];
const SST_VALUES = [1, 2, 3, 4];
const QCI_VALUES = [1, 2, 3, 4, 65, 66, 67, 75, 71, 72, 73, 74, 76, 5, 6, 7, 8, 9, 69, 70, 79, 80, 82, 83, 84, 85, 86];
const ARP_LEVELS = Array.from({ length: 15 }, (_, i) => i + 1);

const SUBSCRIBER_DEFAULTS: Partial<Subscriber> = {
  security: { k: '465B5CE8 B199B49F AA5F0A2E E238A6BC', amf: '8000', opc: 'E8ED289D EBA952E4 283B54E8 8E6183CA' },
  ambr: { downlink: { value: 1, unit: 3 }, uplink: { value: 1, unit: 3 } },
  slice: [{
    sst: 1, default_indicator: true,
    session: [{
      name: 'internet', type: 3,
      qos: { index: 9, arp: { priority_level: 8, pre_emption_capability: 1, pre_emption_vulnerability: 1 } },
      ambr: { downlink: { value: 1, unit: 3 }, uplink: { value: 1, unit: 3 } },
    }],
  }],
  subscriber_status: 0,
  operator_determined_barring: 0,
  network_access_mode: 0,
  subscribed_rau_tau_timer: 12,
  access_restriction_data: 32,
  schema_version: 1,
};

function formatAmbr(ambr?: { value: number; unit: number }) {
  if (!ambr || ambr.value === undefined) return 'unlimited';
  return `${ambr.value} ${AMBR_UNITS[ambr.unit ?? 0]}`;
}

export default function Subscribers() {
  const { data: subscribers = [], isLoading } = useSubscribers();
  const { data: profiles = [] } = useProfiles();
  const createMut = useCreateSubscriber();
  const updateMut = useUpdateSubscriber();
  const deleteMut = useDeleteSubscriber();

  const [search, setSearch] = useState('');
  const [viewItem, setViewItem] = useState<Subscriber | null>(null);
  const [editItem, setEditItem] = useState<Subscriber | null>(null);
  const [editMode, setEditMode] = useState<'create' | 'update'>('create');
  const [deleteImsi, setDeleteImsi] = useState<string | null>(null);
  const [snack, setSnack] = useState('');

  const filtered = useMemo(() => {
    if (!search) return subscribers;
    const s = search.toLowerCase();
    return subscribers.filter(sub =>
      sub.imsi.toLowerCase().includes(s) ||
      sub.msisdn?.some(m => m.includes(s))
    );
  }, [subscribers, search]);

  const sorted = useMemo(() =>
    [...filtered].sort((a, b) => a.imsi.localeCompare(b.imsi)),
    [filtered]
  );

  const handleCreate = () => {
    setEditItem({ ...SUBSCRIBER_DEFAULTS, imsi: '' } as Subscriber);
    setEditMode('create');
  };

  const handleEdit = (sub: Subscriber) => {
    setEditItem(JSON.parse(JSON.stringify(sub)));
    setEditMode('update');
  };

  const handleSave = async () => {
    if (!editItem) return;
    try {
      if (editMode === 'create') {
        await createMut.mutateAsync(editItem as any);
        setSnack(`Subscriber ${editItem.imsi} created`);
      } else {
        await updateMut.mutateAsync({ imsi: editItem.imsi, data: editItem });
        setSnack(`Subscriber ${editItem.imsi} updated`);
      }
      setEditItem(null);
    } catch (e: any) {
      setSnack(`Error: ${e.response?.data?.message || e.message}`);
    }
  };

  const handleDelete = async () => {
    if (!deleteImsi) return;
    try {
      await deleteMut.mutateAsync(deleteImsi);
      setSnack(`Subscriber ${deleteImsi} deleted`);
      setDeleteImsi(null);
      if (viewItem?.imsi === deleteImsi) setViewItem(null);
    } catch (e: any) {
      setSnack(`Error: ${e.response?.data?.message || e.message}`);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>Subscribers</Typography>

      <Paper sx={{ display: 'flex', alignItems: 'center', mb: 2, px: 2 }}>
        <SearchIcon color="action" />
        <TextField
          fullWidth variant="standard" placeholder="Search IMSI or MSISDN..."
          value={search} onChange={e => setSearch(e.target.value)}
          sx={{ mx: 1 }} InputProps={{ disableUnderline: true }}
        />
        {search && <IconButton size="small" onClick={() => setSearch('')}><ClearIcon /></IconButton>}
      </Paper>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>IMSI</TableCell>
              <TableCell>MSISDN</TableCell>
              <TableCell>Security (K)</TableCell>
              <TableCell>AMBR DL/UL</TableCell>
              <TableCell>Slice</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={7} align="center">Loading...</TableCell></TableRow>}
            {!isLoading && sorted.length === 0 && (
              <TableRow><TableCell colSpan={7} align="center">
                <Typography color="text.secondary" sx={{ py: 4 }}>
                  No subscribers. Click + to add one.
                </Typography>
              </TableCell></TableRow>
            )}
            {sorted.map(sub => (
              <TableRow key={sub.imsi} hover>
                <TableCell sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{sub.imsi}</TableCell>
                <TableCell>{sub.msisdn?.join(', ') || '—'}</TableCell>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                  {sub.security?.k ? `${sub.security.k.substring(0, 16)}...` : '—'}
                </TableCell>
                <TableCell>{formatAmbr(sub.ambr?.downlink)} / {formatAmbr(sub.ambr?.uplink)}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5}>
                    {sub.slice?.map((s, i) => (
                      <Chip key={i} label={`SST:${s.sst}${s.sd ? ` SD:${s.sd}` : ''}`} size="small" />
                    ))}
                  </Stack>
                </TableCell>
                <TableCell>
                  <Chip
                    label={sub.subscriber_status === 0 ? 'Granted' : 'Barred'}
                    color={sub.subscriber_status === 0 ? 'success' : 'error'}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="View"><IconButton size="small" onClick={() => setViewItem(sub)}><VisibilityIcon /></IconButton></Tooltip>
                  <Tooltip title="Edit"><IconButton size="small" onClick={() => handleEdit(sub)}><EditIcon /></IconButton></Tooltip>
                  <Tooltip title="Delete"><IconButton size="small" onClick={() => setDeleteImsi(sub.imsi)}><DeleteIcon /></IconButton></Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Fab color="primary" sx={{ position: 'fixed', bottom: 24, right: 24 }} onClick={handleCreate}>
        <AddIcon />
      </Fab>

      <Dialog open={!!viewItem} onClose={() => setViewItem(null)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Subscriber: {viewItem?.imsi}
            <Box>
              <IconButton onClick={() => { handleEdit(viewItem!); setViewItem(null); }}><EditIcon /></IconButton>
              <IconButton onClick={() => { setDeleteImsi(viewItem!.imsi); setViewItem(null); }}><DeleteIcon /></IconButton>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {viewItem && <SubscriberView subscriber={viewItem} />}
        </DialogContent>
        <DialogActions><Button onClick={() => setViewItem(null)}>Close</Button></DialogActions>
      </Dialog>

      <Dialog open={!!editItem} onClose={() => setEditItem(null)} maxWidth="md" fullWidth>
        <DialogTitle>{editMode === 'create' ? 'Create Subscriber' : 'Edit Subscriber'}</DialogTitle>
        <DialogContent dividers>
          {editItem && (
            <SubscriberForm
              subscriber={editItem}
              onChange={setEditItem}
              disabled={editMode === 'update'}
              profiles={profiles}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditItem(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}
            disabled={createMut.isPending || updateMut.isPending}>
            {createMut.isPending || updateMut.isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deleteImsi} onClose={() => setDeleteImsi(null)}>
        <DialogTitle>Delete Subscriber</DialogTitle>
        <DialogContent>
          <Typography>Delete subscriber <strong>{deleteImsi}</strong>? This cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteImsi(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDelete} disabled={deleteMut.isPending}>
            {deleteMut.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={4000} onClose={() => setSnack('')} message={snack} />
    </Box>
  );
}

function SubscriberView({ subscriber: sub }: { subscriber: Subscriber }) {
  return (
    <Box>
      <Typography variant="subtitle2" color="text.secondary">Security</Typography>
      <Typography sx={{ fontFamily: 'monospace', fontSize: 12 }}>
        K: {sub.security?.k}<br />
        AMF: {sub.security?.amf}<br />
        {sub.security?.opc && `OPc: ${sub.security.opc}`}
        {sub.security?.op && `OP: ${sub.security.op}`}
        {sub.security?.sqn !== undefined && ` | SQN: ${sub.security.sqn}`}
      </Typography>

      <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>AMBR</Typography>
      <Typography>DL: {formatAmbr(sub.ambr?.downlink)} / UL: {formatAmbr(sub.ambr?.uplink)}</Typography>

      <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>Status</Typography>
      <Typography>
        {sub.subscriber_status === 0 ? 'SERVICE_GRANTED' : 'OPERATOR_DETERMINED_BARRING'} |
        Barring: {sub.operator_determined_barring}
      </Typography>

      {sub.slice?.map((slice, si) => (
        <Box key={si} sx={{ mt: 2 }}>
          <Typography variant="subtitle2">
            Slice {si + 1}: SST={slice.sst}{slice.sd ? ` SD=${slice.sd}` : ''}
            {slice.default_indicator ? ' (Default)' : ''}
          </Typography>
          {slice.session?.map((sess, sei) => (
            <Paper key={sei} variant="outlined" sx={{ p: 1.5, ml: 2, mb: 1 }}>
              <Typography variant="body2">
                <strong>{sess.name}</strong> | Type: {SESSION_TYPES.find(t => t.value === sess.type)?.label} |
                5QI: {sess.qos?.index} | ARP: {sess.qos?.arp?.priority_level} |
                LBO: {sess.lbo_roaming_allowed ? 'Allowed' : 'Not allowed'}
              </Typography>
              <Typography variant="body2">
                Session AMBR: {formatAmbr(sess.ambr?.downlink)} / {formatAmbr(sess.ambr?.uplink)}
              </Typography>
              {sess.ue && <Typography variant="body2">UE: {sess.ue.ipv4 || '—'} / {sess.ue.ipv6 || '—'}</Typography>}
              {sess.smf && <Typography variant="body2">SMF: {sess.smf.ipv4 || '—'} / {sess.smf.ipv6 || '—'}</Typography>}
              {sess.pcc_rule?.map((pcc, pi) => (
                <Box key={pi} sx={{ ml: 2, mt: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    PCC Rule {pi + 1}: 5QI={pcc.qos.index} ARP={pcc.qos.arp.priority_level}
                    {pcc.qos.mbr && ` | MBR: ${formatAmbr(pcc.qos.mbr.downlink)}/${formatAmbr(pcc.qos.mbr.uplink)}`}
                    {pcc.qos.gbr && ` | GBR: ${formatAmbr(pcc.qos.gbr.downlink)}/${formatAmbr(pcc.qos.gbr.uplink)}`}
                  </Typography>
                  {pcc.flow?.map((f, fi) => (
                    <Typography key={fi} variant="caption" sx={{ ml: 2 }}>
                      {f.direction === 1 ? 'DL' : 'UL'}: {f.description}
                    </Typography>
                  ))}
                </Box>
              ))}
            </Paper>
          ))}
        </Box>
      ))}
    </Box>
  );
}

function SubscriberForm({ subscriber, onChange, disabled, profiles }: {
  subscriber: Subscriber;
  onChange: (s: Subscriber) => void;
  disabled: boolean;
  profiles: any[];
}) {
  const s = subscriber;
  const set = (partial: Partial<Subscriber>) => onChange({ ...s, ...partial });
  const setSecurity = (partial: any) => set({ security: { ...s.security, ...partial } });
  const setAmbr = (partial: any) => set({ ambr: { ...s.ambr, ...partial } as any });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <TextField label="IMSI" required value={s.imsi} disabled={disabled}
        onChange={e => set({ imsi: e.target.value })}
        inputProps={{ maxLength: 15 }}
        helperText={disabled ? '' : 'Digits only, max 15'} />

      <TextField label="MSISDN (comma separated)" value={s.msisdn?.join(', ') || ''}
        onChange={e => set({ msisdn: e.target.value.split(',').map(v => v.trim()).filter(Boolean) })}
        helperText="Up to 2 MSISDN" />

      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography fontWeight="bold">Security</Typography></AccordionSummary>
        <AccordionDetails sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField label="K (Subscriber Key)" required value={s.security?.k || ''}
            onChange={e => setSecurity({ k: e.target.value })} inputProps={{ style: { fontFamily: 'monospace' } }} />
          <TextField label="AMF" required value={s.security?.amf || ''}
            onChange={e => setSecurity({ amf: e.target.value })} inputProps={{ style: { fontFamily: 'monospace' } }} />
          <FormControl>
            <InputLabel>USIM Type</InputLabel>
            <Select value={s.security?.opc ? 0 : 1}
              onChange={e => {
                if (e.target.value === 0) setSecurity({ opc: s.security?.opc || '', op: undefined as any });
                else setSecurity({ op: s.security?.op || '', opc: undefined as any });
              }}>
              <MenuItem value={0}>OPc</MenuItem>
              <MenuItem value={1}>OP</MenuItem>
            </Select>
          </FormControl>
          <TextField label={s.security?.opc !== undefined ? 'OPc' : 'OP'} required
            value={s.security?.opc || s.security?.op || ''}
            onChange={e => {
              if (s.security?.opc !== undefined) setSecurity({ opc: e.target.value });
              else setSecurity({ op: e.target.value });
            }}
            inputProps={{ style: { fontFamily: 'monospace' } }} />
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography fontWeight="bold">UE-AMBR</Typography></AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
            <TextField label="Downlink" type="number" value={s.ambr?.downlink?.value ?? ''}
              onChange={e => setAmbr({ downlink: { value: Number(e.target.value), unit: s.ambr?.downlink?.unit ?? 3 } })} sx={{ flex: 1 }} />
            <FormControl sx={{ minWidth: 100 }}>
              <InputLabel>Unit</InputLabel>
              <Select value={s.ambr?.downlink?.unit ?? 3}
                onChange={e => setAmbr({ downlink: { value: s.ambr?.downlink?.value ?? 1, unit: Number(e.target.value) } })}>
                {AMBR_UNITS.map((u, i) => <MenuItem key={i} value={i}>{u}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField label="Uplink" type="number" value={s.ambr?.uplink?.value ?? ''}
              onChange={e => setAmbr({ uplink: { value: Number(e.target.value), unit: s.ambr?.uplink?.unit ?? 3 } })} sx={{ flex: 1 }} />
            <FormControl sx={{ minWidth: 100 }}>
              <InputLabel>Unit</InputLabel>
              <Select value={s.ambr?.uplink?.unit ?? 3}
                onChange={e => setAmbr({ uplink: { value: s.ambr?.uplink?.value ?? 1, unit: Number(e.target.value) } })}>
                {AMBR_UNITS.map((u, i) => <MenuItem key={i} value={i}>{u}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>
        </AccordionDetails>
      </Accordion>

      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography fontWeight="bold" sx={{ flex: 1 }}>Slices ({s.slice?.length || 0})</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {s.slice?.map((slice, si) => (
            <Paper key={si} variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                <FormControl sx={{ minWidth: 80 }}>
                  <InputLabel>SST</InputLabel>
                  <Select value={slice.sst} onChange={e => {
                    const newSlices = [...s.slice!];
                    newSlices[si] = { ...slice, sst: Number(e.target.value) };
                    set({ slice: newSlices });
                  }}>
                    {SST_VALUES.map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                  </Select>
                </FormControl>
                <TextField label="SD (hex)" value={slice.sd || ''}
                  onChange={e => {
                    const newSlices = [...s.slice!];
                    newSlices[si] = { ...slice, sd: e.target.value || undefined };
                    set({ slice: newSlices });
                  }} />
                <FormControlLabel control={<Checkbox checked={slice.default_indicator || false}
                  onChange={e => {
                    const newSlices = [...s.slice!];
                    newSlices[si] = { ...slice, default_indicator: e.target.checked };
                    set({ slice: newSlices });
                  }} />} label="Default S-NSSAI" />
              </Box>

              {slice.session?.map((sess, sei) => (
                <Paper key={sei} variant="outlined" sx={{ p: 1.5, ml: 2, mb: 1 }}>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                    <TextField label="DNN/APN" required size="small" value={sess.name}
                      onChange={e => {
                        const newSlices = JSON.parse(JSON.stringify(s.slice));
                        newSlices[si].session[sei].name = e.target.value;
                        set({ slice: newSlices });
                      }} sx={{ flex: 1, minWidth: 120 }} />
                    <FormControl size="small" sx={{ minWidth: 100 }}>
                      <InputLabel>Type</InputLabel>
                      <Select value={sess.type} onChange={e => {
                        const newSlices = JSON.parse(JSON.stringify(s.slice));
                        newSlices[si].session[sei].type = Number(e.target.value);
                        set({ slice: newSlices });
                      }}>
                        {SESSION_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 80 }}>
                      <InputLabel>5QI</InputLabel>
                      <Select value={sess.qos?.index ?? 9} onChange={e => {
                        const newSlices = JSON.parse(JSON.stringify(s.slice));
                        newSlices[si].session[sei].qos.index = Number(e.target.value);
                        set({ slice: newSlices });
                      }}>
                        {QCI_VALUES.map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 80 }}>
                      <InputLabel>ARP</InputLabel>
                      <Select value={sess.qos?.arp?.priority_level ?? 8} onChange={e => {
                        const newSlices = JSON.parse(JSON.stringify(s.slice));
                        newSlices[si].session[sei].qos.arp.priority_level = Number(e.target.value);
                        set({ slice: newSlices });
                      }}>
                        {ARP_LEVELS.map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField label="Session AMBR DL" size="small" type="number" value={sess.ambr?.downlink?.value ?? ''}
                      onChange={e => {
                        const newSlices = JSON.parse(JSON.stringify(s.slice));
                        if (!newSlices[si].session[sei].ambr) newSlices[si].session[sei].ambr = { downlink: { value: 1, unit: 3 }, uplink: { value: 1, unit: 3 } };
                        newSlices[si].session[sei].ambr.downlink.value = Number(e.target.value);
                        set({ slice: newSlices });
                      }} sx={{ flex: 1 }} />
                    <TextField label="Session AMBR UL" size="small" type="number" value={sess.ambr?.uplink?.value ?? ''}
                      onChange={e => {
                        const newSlices = JSON.parse(JSON.stringify(s.slice));
                        if (!newSlices[si].session[sei].ambr) newSlices[si].session[sei].ambr = { downlink: { value: 1, unit: 3 }, uplink: { value: 1, unit: 3 } };
                        newSlices[si].session[sei].ambr.uplink.value = Number(e.target.value);
                        set({ slice: newSlices });
                      }} sx={{ flex: 1 }} />
                  </Box>
                </Paper>
              ))}
              <Button size="small" onClick={() => {
                const newSlices = [...s.slice!];
                newSlices[si] = { ...slice, session: [...(slice.session || []), {
                  name: '', type: 3,
                  qos: { index: 9, arp: { priority_level: 8, pre_emption_capability: 1, pre_emption_vulnerability: 1 } },
                }]};
                set({ slice: newSlices });
              }}>+ Add Session</Button>
            </Paper>
          ))}
          <Button onClick={() => {
            set({ slice: [...(s.slice || []), {
              sst: 1, default_indicator: true,
              session: [{ name: 'internet', type: 3, qos: { index: 9, arp: { priority_level: 8, pre_emption_capability: 1, pre_emption_vulnerability: 1 } } }],
            }]});
          }}>+ Add Slice</Button>
        </AccordionDetails>
      </Accordion>

      <Box sx={{ display: 'flex', gap: 2 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Subscriber Status</InputLabel>
          <Select value={s.subscriber_status ?? 0} onChange={e => set({ subscriber_status: Number(e.target.value) })}>
            <MenuItem value={0}>SERVICE_GRANTED</MenuItem>
            <MenuItem value={1}>OPERATOR_DETERMINED_BARRING</MenuItem>
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Operator Barring</InputLabel>
          <Select value={s.operator_determined_barring ?? 0} onChange={e => set({ operator_determined_barring: Number(e.target.value) })}>
            {[
              '(0) No barring', '(1) Roamer HPLMN-AP Barred', '(2) Roamer VPLMN-AP Barred',
              '(3) All outgoing calls', '(4) International calls', '(5) Intl calls except home',
              '(6) Inter-zonal calls', '(7) Inter-zonal except home', '(8) Intl + Inter-zonal',
            ].map((label, i) => <MenuItem key={i} value={i}>{label}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>
    </Box>
  );
}
