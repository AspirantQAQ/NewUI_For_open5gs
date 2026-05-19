import { useState } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Dialog, DialogTitle, DialogContent,
  DialogActions, Button, IconButton, Fab, Tooltip, TextField,
  Snackbar, FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useProfiles, useCreateProfile, useUpdateProfile, useDeleteProfile } from '../hooks/useDb';
import type { Profile } from '../types/db';

const AMBR_UNITS = ['bps', 'Kbps', 'Mbps', 'Gbps', 'Tbps'];

const PROFILE_DEFAULTS: Partial<Profile> = {
  security: { k: '465B5CE8 B199B49F AA5F0A2E E238A6BC', amf: '8000', opc: 'E8ED289D EBA952E4 283B54E8 8E6183CA' },
  ambr: { downlink: { value: 1, unit: 3 }, uplink: { value: 1, unit: 3 } },
  slice: [{
    sst: 1, default_indicator: true,
    session: [{
      name: 'internet', type: 3,
      qos: { index: 9, arp: { priority_level: 8, pre_emption_capability: 1, pre_emption_vulnerability: 1 } },
    }],
  }],
  subscriber_status: 0,
  operator_determined_barring: 0,
  schema_version: 1,
};

export default function Profiles() {
  const { data: profiles = [], isLoading } = useProfiles();
  const createMut = useCreateProfile();
  const updateMut = useUpdateProfile();
  const deleteMut = useDeleteProfile();

  const [editItem, setEditItem] = useState<Profile | null>(null);
  const [editMode, setEditMode] = useState<'create' | 'update'>('create');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [snack, setSnack] = useState('');

  const handleCreate = () => {
    setEditItem({ ...PROFILE_DEFAULTS, title: '' } as Profile);
    setEditMode('create');
  };

  const handleEdit = (p: Profile) => {
    setEditItem(JSON.parse(JSON.stringify(p)));
    setEditMode('update');
  };

  const handleSave = async () => {
    if (!editItem) return;
    try {
      if (editMode === 'create') {
        await createMut.mutateAsync(editItem as any);
        setSnack(`Profile "${editItem.title}" created`);
      } else {
        await updateMut.mutateAsync({ id: editItem._id, data: editItem });
        setSnack(`Profile "${editItem.title}" updated`);
      }
      setEditItem(null);
    } catch (e: any) {
      setSnack(`Error: ${e.response?.data?.message || e.message}`);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMut.mutateAsync(deleteId);
      setSnack('Profile deleted');
      setDeleteId(null);
    } catch (e: any) {
      setSnack(`Error: ${e.response?.data?.message || e.message}`);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>Profiles</Typography>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Security (K)</TableCell>
              <TableCell>AMBR DL/UL</TableCell>
              <TableCell>Slices</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={6} align="center">Loading...</TableCell></TableRow>}
            {!isLoading && profiles.length === 0 && (
              <TableRow><TableCell colSpan={6} align="center">
                <Typography color="text.secondary" sx={{ py: 4 }}>No profiles. Click + to add one.</Typography>
              </TableCell></TableRow>
            )}
            {profiles.map(p => (
              <TableRow key={p._id} hover>
                <TableCell sx={{ fontWeight: 'bold' }}>{p.title}</TableCell>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                  {p.security?.k ? `${p.security.k.substring(0, 16)}...` : '—'}
                </TableCell>
                <TableCell>
                  {p.ambr?.downlink ? `${p.ambr.downlink.value} ${AMBR_UNITS[p.ambr.downlink.unit ?? 0]}` : '—'} /
                  {p.ambr?.uplink ? ` ${p.ambr.uplink.value} ${AMBR_UNITS[p.ambr.uplink.unit ?? 0]}` : ' —'}
                </TableCell>
                <TableCell>{p.slice?.length || 0} slice(s)</TableCell>
                <TableCell>{p.subscriber_status === 0 ? 'Granted' : 'Barred'}</TableCell>
                <TableCell align="right">
                  <Tooltip title="Edit"><IconButton size="small" onClick={() => handleEdit(p)}><EditIcon /></IconButton></Tooltip>
                  <Tooltip title="Delete"><IconButton size="small" onClick={() => setDeleteId(p._id)}><DeleteIcon /></IconButton></Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Fab color="primary" sx={{ position: 'fixed', bottom: 24, right: 24 }} onClick={handleCreate}><AddIcon /></Fab>

      <Dialog open={!!editItem} onClose={() => setEditItem(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{editMode === 'create' ? 'Create Profile' : 'Edit Profile'}</DialogTitle>
        <DialogContent dividers>
          {editItem && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField label="Title" required value={editItem.title}
                disabled={editMode === 'update'}
                onChange={e => setEditItem({ ...editItem, title: e.target.value })} />
              <TextField label="K (Profile Key)" required value={editItem.security?.k || ''}
                onChange={e => setEditItem({ ...editItem, security: { ...editItem.security!, k: e.target.value } })}
                inputProps={{ style: { fontFamily: 'monospace' } }} />
              <TextField label="AMF" required value={editItem.security?.amf || ''}
                onChange={e => setEditItem({ ...editItem, security: { ...editItem.security!, amf: e.target.value } })}
                inputProps={{ style: { fontFamily: 'monospace' } }} />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <FormControl sx={{ minWidth: 120 }}>
                  <InputLabel>USIM Type</InputLabel>
                  <Select value={editItem.security?.opc !== undefined ? 0 : 1}
                    onChange={e => {
                      const sec = { ...editItem.security! };
                      if (e.target.value === 0) { sec.opc = sec.opc || ''; delete sec.op; }
                      else { sec.op = sec.op || ''; delete sec.opc; }
                      setEditItem({ ...editItem, security: sec });
                    }}>
                    <MenuItem value={0}>OPc</MenuItem>
                    <MenuItem value={1}>OP</MenuItem>
                  </Select>
                </FormControl>
                <TextField label={editItem.security?.opc !== undefined ? 'OPc' : 'OP'} required
                  value={editItem.security?.opc || editItem.security?.op || ''}
                  onChange={e => {
                    const sec = { ...editItem.security! };
                    if (sec.opc !== undefined) sec.opc = e.target.value;
                    else sec.op = e.target.value;
                    setEditItem({ ...editItem, security: sec });
                  }}
                  inputProps={{ style: { fontFamily: 'monospace' } }} sx={{ flex: 1 }} />
              </Box>
              <FormControl>
                <InputLabel>Subscriber Status</InputLabel>
                <Select value={editItem.subscriber_status ?? 0}
                  onChange={e => setEditItem({ ...editItem, subscriber_status: Number(e.target.value) })}>
                  <MenuItem value={0}>SERVICE_GRANTED</MenuItem>
                  <MenuItem value={1}>OPERATOR_DETERMINED_BARRING</MenuItem>
                </Select>
              </FormControl>
            </Box>
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

      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle>Delete Profile</DialogTitle>
        <DialogContent><Typography>Delete this profile? This cannot be undone.</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDelete} disabled={deleteMut.isPending}>Delete</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={4000} onClose={() => setSnack('')} message={snack} />
    </Box>
  );
}
