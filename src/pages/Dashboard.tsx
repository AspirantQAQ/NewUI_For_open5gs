import { Paper, Typography, Grid, Chip, Box, CircularProgress, Button } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useNavigate } from 'react-router-dom';
import { useSyncStatus } from '../hooks/useNfConfig';

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
          <Grid key={s.nfType} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography sx={{ fontWeight: 'bold' }}>{s.nfType.toUpperCase()}</Typography>
              <Chip
                size="small"
                icon={s.pendingSync ? <WarningIcon /> : <CheckCircleIcon />}
                label={s.pendingSync ? '待同步' : '已同步'}
                color={s.pendingSync ? 'warning' : 'success'}
                sx={{ mt: 1 }}
              />
              <Box sx={{ mt: 1 }}>
                <Button
                  size="small"
                  startIcon={<VisibilityIcon />}
                  onClick={() => navigate(`/config/nf/${s.nfType}`)}
                >
                  查看配置
                </Button>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Paper>
  );
}
