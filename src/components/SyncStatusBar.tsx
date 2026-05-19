import { useState } from 'react';
import { Box, Chip, Button, Dialog, DialogTitle, DialogContent, DialogActions, Typography, Alert, TextField } from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import { useSyncStatus, useSyncNf, useSyncAll } from '../hooks/useNfConfig';

interface SyncStatusBarProps {
  nfType?: string;
}

export default function SyncStatusBar({ nfType }: SyncStatusBarProps) {
  const { data: statusList } = useSyncStatus();
  const syncNf = useSyncNf(nfType || '');
  const syncAll = useSyncAll();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pwd, setPwd] = useState('');

  const pendingCount = statusList?.filter(s => s.pendingSync).length || 0;

  if (nfType) {
    const status = statusList?.find(s => s.nfType === nfType);
    const pending = status?.pendingSync;
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        {pending ? (
          <Chip icon={<WarningIcon />} label="有未应用的修改" color="warning" size="small" />
        ) : (
          <Chip icon={<CheckCircleIcon />} label="已同步" color="success" size="small" />
        )}
        {pending && (
          <>
            <Button size="small" variant="outlined" startIcon={<SyncIcon />}
              onClick={() => setDialogOpen(true)} disabled={syncNf.isPending}>
              应用到文件
            </Button>
            <Dialog open={dialogOpen} onClose={() => { setDialogOpen(false); setPwd(''); }}>
              <DialogTitle>同步 {nfType.toUpperCase()}</DialogTitle>
              <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 300 }}>
                <Typography variant="body2">将该 NF 配置写入 YAML 文件</Typography>
                <TextField size="small" type="password" label="sudo 密码" value={pwd} onChange={e => setPwd(e.target.value)} autoFocus />
              </DialogContent>
              <DialogActions>
                <Button onClick={() => { setDialogOpen(false); setPwd(''); }}>取消</Button>
                <Button variant="contained" disabled={!pwd || syncNf.isPending}
                  onClick={() => { syncNf.mutate(pwd); setDialogOpen(false); setPwd(''); }}>
                  确认
                </Button>
              </DialogActions>
            </Dialog>
          </>
        )}
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        {pendingCount > 0 ? (
          <Chip icon={<WarningIcon />} label={`${pendingCount} 个 NF 有未应用的修改`} color="warning" size="small" />
        ) : (
          <Chip icon={<CheckCircleIcon />} label="所有配置已同步" color="success" size="small" />
        )}
        {pendingCount > 0 && (
          <Button size="small" variant="outlined" startIcon={<SyncIcon />}
            onClick={() => setDialogOpen(true)}>
            应用所有配置
          </Button>
        )}
      </Box>
      <Dialog open={dialogOpen} onClose={() => { setDialogOpen(false); setPwd(''); }}>
        <DialogTitle>确认应用配置</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 300 }}>
          <Typography variant="body2">将 {pendingCount} 个 NF 的配置写入 YAML 文件。原文件将备份为 .bak。</Typography>
          <TextField size="small" type="password" label="sudo 密码" value={pwd} onChange={e => setPwd(e.target.value)} autoFocus />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDialogOpen(false); setPwd(''); }}>取消</Button>
          <Button variant="contained" disabled={!pwd || syncAll.isPending}
            onClick={() => { syncAll.mutate(pwd); setDialogOpen(false); setPwd(''); }}>
            确认应用
          </Button>
        </DialogActions>
      </Dialog>
      {(syncNf.isError || syncAll.isError) && (
        <Alert severity="error" sx={{ mt: 1 }}>同步失败，请检查服务器日志</Alert>
      )}
      {(syncNf.isSuccess || syncAll.isSuccess) && (
        <Alert severity="success" sx={{ mt: 1 }}>同步成功</Alert>
      )}
    </>
  );
}
