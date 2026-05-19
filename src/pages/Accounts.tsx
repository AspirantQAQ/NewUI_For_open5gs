import { useState } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Dialog, DialogTitle, DialogContent,
  DialogActions, Button, IconButton, Fab, Tooltip, TextField,
  Chip, Stack, Snackbar, FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAccounts, useDeleteAccount } from '../hooks/useDb';
import api from '../services/api';
import type { Account } from '../types/db';

export default function Accounts() {
  const { data: accounts = [], isLoading } = useAccounts();
  const deleteMut = useDeleteAccount();

  const [editItem, setEditItem] = useState<{ username: string; password: string; roles: string[] } | null>(null);
  const [editMode, setEditMode] = useState<'create' | 'update'>('create');
  const [snack, setSnack] = useState('');

  const handleCreate = () => {
    setEditItem({ username: '', password: '', roles: ['user'] });
    setEditMode('create');
  };

  const handleEdit = (acc: Account) => {
    setEditItem({ username: acc.username, password: '', roles: [...acc.roles] });
    setEditMode('update');
  };

  const handleSave = async () => {
    if (!editItem) return;
    try {
      if (editMode === 'create') {
        await api.post('/db/accounts', {
          username: editItem.username,
          roles: editItem.roles,
          password: editItem.password,
        });
        setSnack(`Account "${editItem.username}" created`);
      } else {
        const updateData: any = { roles: editItem.roles };
        if (editItem.password) updateData.password = editItem.password;
        await api.put(`/db/accounts/${editItem.username}`, updateData);
        setSnack(`Account "${editItem.username}" updated`);
      }
      setEditItem(null);
      window.location.reload();
    } catch (e: any) {
      setSnack(`Error: ${e.response?.data?.message || e.message}`);
    }
  };

  const handleDelete = async (username: string) => {
    try {
      await deleteMut.mutateAsync(username);
      setSnack(`Account "${username}" deleted`);
    } catch (e: any) {
      setSnack(`Error: ${e.response?.data?.message || e.message}`);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>Accounts</Typography>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Username</TableCell>
              <TableCell>Roles</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={3} align="center">Loading...</TableCell></TableRow>}
            {accounts.map(acc => (
              <TableRow key={acc._id} hover>
                <TableCell sx={{ fontWeight: 'bold' }}>{acc.username}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5}>
                    {acc.roles?.map(role => <Chip key={role} label={role} size="small" color={role === 'admin' ? 'primary' : 'default'} />)}
                  </Stack>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Edit"><IconButton size="small" onClick={() => handleEdit(acc)}><EditIcon /></IconButton></Tooltip>
                  <Tooltip title="Delete"><IconButton size="small" onClick={() => handleDelete(acc.username)}><DeleteIcon /></IconButton></Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Fab color="primary" sx={{ position: 'fixed', bottom: 24, right: 24 }} onClick={handleCreate}><AddIcon /></Fab>

      <Dialog open={!!editItem} onClose={() => setEditItem(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{editMode === 'create' ? 'Create Account' : 'Edit Account'}</DialogTitle>
        <DialogContent dividers>
          {editItem && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField label="Username" required value={editItem.username}
                disabled={editMode === 'update'}
                onChange={e => setEditItem({ ...editItem, username: e.target.value })} />
              <TextField label={editMode === 'create' ? 'Password' : 'New Password (leave empty to keep)'}
                type="password" required={editMode === 'create'}
                value={editItem.password}
                onChange={e => setEditItem({ ...editItem, password: e.target.value })} />
              <FormControl>
                <InputLabel>Role</InputLabel>
                <Select value={editItem.roles[0] || 'user'}
                  onChange={e => setEditItem({ ...editItem, roles: [e.target.value] })}>
                  <MenuItem value="admin">admin</MenuItem>
                  <MenuItem value="user">user</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditItem(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>Save</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={4000} onClose={() => setSnack('')} message={snack} />
    </Box>
  );
}
