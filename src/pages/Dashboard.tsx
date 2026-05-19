import { useState } from 'react';
import { Paper, Typography, Grid, Chip, Box, CircularProgress, Button, Snackbar, Alert } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import SyncIcon from '@mui/icons-material/Sync';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import { useNavigate } from 'react-router-dom';
import { useSyncStatus, useSyncNf } from '../hooks/useNfConfig';

export default function Dashboard() {
  const { data: statusList, isLoading } = useSyncStatus();
  const navigate = useNavigate();

  if (isLoading) return <Box sx={{ p: 3 }}><CircularProgress /></Box>;

  const pendingCount = statusList?.filter(s => s.pendingSync).length || 0;

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>总览</Typography>
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
