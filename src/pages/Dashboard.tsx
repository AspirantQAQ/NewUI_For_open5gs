import { useState } from 'react';
import { Paper, Typography, Grid, Chip, Box, CircularProgress, Button, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import SyncIcon from '@mui/icons-material/Sync';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import { useNavigate } from 'react-router-dom';
import { useSyncStatus, useSyncNf, useSyncAll, useRestartServices } from '../hooks/useNfConfig';

export default function Dashboard() {
  const { data: statusList, isLoading } = useSyncStatus();
  const navigate = useNavigate();
  const syncAllMut = useSyncAll();
  const restartMut = useRestartServices();
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmRestart, setConfirmRestart] = useState(false);

  if (isLoading) return <Box sx={{ p: 3 }}><CircularProgress /></Box>;

  const pendingCount = statusList?.filter(s => s.pendingSync).length || 0;

  const handleSyncAll = () => {
    syncAllMut.mutate(undefined, {
      onSuccess: (data) => {
        const failed = data.results?.filter((r: any) => !r.success).length || 0;
        if (failed > 0) {
          setMsg({ type: 'error', text: `${failed} 个 NF 同步失败` });
        } else {
          setMsg({ type: 'success', text: '所有 NF 配置已同步到 YAML 文件' });
        }
      },
      onError: (e: any) => setMsg({ type: 'error', text: e.response?.data?.error || e.message }),
    });
  };

  const handleRestart = () => {
    setConfirmRestart(false);
    restartMut.mutate(undefined, {
      onSuccess: () => setMsg({ type: 'success', text: '所有 Open5GS 服务已重启' }),
      onError: (e: any) => setMsg({ type: 'error', text: e.response?.data?.error || e.message }),
    });
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>总览</Typography>
        <Box sx={{ flex: 1 }} />
        {pendingCount > 0 && (
          <Button
            size="small"
            variant="outlined"
            color="warning"
            startIcon={<SyncIcon />}
            disabled={syncAllMut.isPending}
            onClick={handleSyncAll}
          >
            {syncAllMut.isPending ? '同步中...' : '一键同步'}
          </Button>
        )}
        <Button
          size="small"
          variant="outlined"
          startIcon={<RestartAltIcon />}
          disabled={restartMut.isPending}
          onClick={() => setConfirmRestart(true)}
        >
          {restartMut.isPending ? '重启中...' : '重启服务'}
        </Button>
      </Box>

      {pendingCount > 0 ? (
        <Chip icon={<WarningIcon />} label={`${pendingCount} 个 NF 有未应用的配置修改`} color="warning" sx={{ mb: 2 }} />
      ) : (
        <Chip icon={<CheckCircleIcon />} label="所有 NF 配置已同步" color="success" sx={{ mb: 2 }} />
      )}

      <Grid container spacing={2}>
        {statusList?.map(s => (
          <NfCard key={s.nfType} nfType={s.nfType} pendingSync={s.pendingSync} navigate={navigate} />
        ))}
      </Grid>

      <Snackbar
        open={!!msg}
        autoHideDuration={4000}
        onClose={() => setMsg(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {msg ? <Alert severity={msg.type} onClose={() => setMsg(null)}>{msg.text}</Alert> : undefined}
      </Snackbar>

      <Dialog open={confirmRestart} onClose={() => setConfirmRestart(false)}>
        <DialogTitle>确认重启</DialogTitle>
        <DialogContent>
          <Typography>确定要重启所有 Open5GS 服务吗？这会中断当前所有连接。</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmRestart(false)}>取消</Button>
          <Button variant="contained" color="warning" onClick={handleRestart}>确认重启</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}

function NfCard({ nfType, pendingSync, navigate }: {
  nfType: string;
  pendingSync: boolean;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const syncMut = useSyncNf(nfType);
  const [error, setError] = useState('');

  const handleSync = () => {
    setError('');
    syncMut.mutate(undefined, {
      onSuccess: () => setError(''),
      onError: (e: any) => setError(e.response?.data?.error || e.message || '同步失败'),
    });
  };

  return (
    <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography sx={{ fontWeight: 'bold' }}>{nfType.toUpperCase()}</Typography>
        <Chip
          size="small"
          icon={pendingSync ? <WarningIcon /> : <CheckCircleIcon />}
          label={pendingSync ? '待同步' : '已同步'}
          color={pendingSync ? 'warning' : 'success'}
          sx={{ mt: 1 }}
        />
        <Box sx={{ mt: 1, display: 'flex', gap: 0.5 }}>
          <Button
            size="small"
            startIcon={<VisibilityIcon />}
            onClick={() => navigate(`/config/nf/${nfType}`)}
          >
            查看
          </Button>
          <Button
            size="small"
            startIcon={<EditIcon />}
            onClick={() => navigate(`/config/nf/${nfType}/edit`)}
          >
            编辑
          </Button>
          {pendingSync && (
            <Button
              size="small"
              color="warning"
              startIcon={<SyncIcon />}
              disabled={syncMut.isPending}
              onClick={handleSync}
            >
              {syncMut.isPending ? '同步中' : '同步'}
            </Button>
          )}
        </Box>
      </Paper>
      <Snackbar
        open={!!error}
        autoHideDuration={5000}
        onClose={() => setError('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setError('')}>
          {nfType.toUpperCase()} 同步失败: {error}
        </Alert>
      </Snackbar>
    </Grid>
  );
}
