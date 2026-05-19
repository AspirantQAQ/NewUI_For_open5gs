import { useState } from 'react';
import { Paper, Typography, Grid, Chip, Box, CircularProgress, Button, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import SyncIcon from '@mui/icons-material/Sync';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import { useNavigate } from 'react-router-dom';
import { useSyncStatus, useSyncNf, useSyncAll, useRestartServices, useServiceStatus } from '../hooks/useNfConfig';

function SudoDialog({ open, title, hint, onConfirm, onCancel, loading }: {
  open: boolean;
  title: string;
  hint: string;
  onConfirm: (pwd: string) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [pwd, setPwd] = useState('');
  const handleClose = () => { setPwd(''); onCancel(); };
  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 320 }}>
        <Typography variant="body2">{hint}</Typography>
        <TextField
          size="small"
          type="password"
          label="sudo 密码"
          value={pwd}
          onChange={e => setPwd(e.target.value)}
          autoFocus
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>取消</Button>
        <Button variant="contained" color="warning" onClick={() => onConfirm(pwd)} disabled={!pwd || loading}>
          {loading ? '执行中...' : '确认'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function Dashboard() {
  const { data: statusList, isLoading } = useSyncStatus();
  const { data: svcStatus } = useServiceStatus();
  const navigate = useNavigate();
  const syncAllMut = useSyncAll();
  const restartMut = useRestartServices();
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [dialog, setDialog] = useState<'syncAll' | 'restart' | null>(null);

  if (isLoading) return <Box sx={{ p: 3 }}><CircularProgress /></Box>;

  const pendingCount = statusList?.filter(s => s.pendingSync).length || 0;

  const handleSyncAll = (pwd: string) => {
    syncAllMut.mutate(pwd, {
      onSuccess: (data) => {
        const failed = data.results?.filter((r: any) => !r.success).length || 0;
        if (failed > 0) {
          setMsg({ type: 'error', text: `${failed} 个 NF 同步失败` });
        } else {
          setMsg({ type: 'success', text: '所有 NF 配置已同步到 YAML 文件' });
        }
      },
      onError: (e: any) => setMsg({ type: 'error', text: e.response?.data?.error || e.message }),
      onSettled: () => setDialog(null),
    });
  };

  const handleRestart = (pwd: string) => {
    restartMut.mutate(pwd, {
      onSuccess: () => setMsg({ type: 'success', text: '所有 Open5GS 服务已重启' }),
      onError: (e: any) => setMsg({ type: 'error', text: e.response?.data?.error || e.message }),
      onSettled: () => setDialog(null),
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
            onClick={() => setDialog('syncAll')}
          >
            {syncAllMut.isPending ? '同步中...' : '一键同步'}
          </Button>
        )}
        <Button
          size="small"
          variant="outlined"
          startIcon={<RestartAltIcon />}
          disabled={restartMut.isPending}
          onClick={() => setDialog('restart')}
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
          <NfCard key={s.nfType} nfType={s.nfType} pendingSync={s.pendingSync} svcActive={svcStatus?.find(v => v.nfType === s.nfType)?.active} navigate={navigate} />
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

      <SudoDialog
        open={dialog === 'syncAll'}
        title="一键同步"
        hint="将所有未同步的 NF 配置写入 YAML 文件"
        onConfirm={handleSyncAll}
        onCancel={() => setDialog(null)}
        loading={syncAllMut.isPending}
      />

      <SudoDialog
        open={dialog === 'restart'}
        title="重启服务"
        hint="确定要重启所有 Open5GS 服务吗？这会中断当前所有连接。"
        onConfirm={handleRestart}
        onCancel={() => setDialog(null)}
        loading={restartMut.isPending}
      />
    </Paper>
  );
}

function NfCard({ nfType, pendingSync, svcActive, navigate }: {
  nfType: string;
  pendingSync: boolean;
  svcActive?: boolean;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const syncMut = useSyncNf(nfType);
  const [showSyncDialog, setShowSyncDialog] = useState(false);

  const handleSync = (pwd: string) => {
    syncMut.mutate(pwd, {
      onSuccess: () => setShowSyncDialog(false),
      onError: (e: any) => {
        alert(`${nfType.toUpperCase()} 同步失败: ${e.response?.data?.error || e.message}`);
        setShowSyncDialog(false);
      },
    });
  };

  return (
    <>
      <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography sx={{ fontWeight: 'bold' }}>{nfType.toUpperCase()}</Typography>
          <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
            <Chip
              size="small"
              icon={svcActive ? <CheckCircleIcon /> : <WarningIcon />}
              label={svcActive ? '运行中' : svcActive === false ? '已停止' : '检测中'}
              color={svcActive ? 'success' : svcActive === false ? 'error' : 'default'}
            />
            <Chip
              size="small"
              icon={pendingSync ? <WarningIcon /> : <CheckCircleIcon />}
              label={pendingSync ? '待同步' : '已同步'}
              color={pendingSync ? 'warning' : 'success'}
              variant="outlined"
            />
          </Box>
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
                onClick={() => setShowSyncDialog(true)}
              >
                {syncMut.isPending ? '同步中' : '同步'}
              </Button>
            )}
          </Box>
        </Paper>
      </Grid>
      <SudoDialog
        open={showSyncDialog}
        title={`同步 ${nfType.toUpperCase()}`}
        hint="将该 NF 配置写入 YAML 文件"
        onConfirm={handleSync}
        onCancel={() => setShowSyncDialog(false)}
        loading={syncMut.isPending}
      />
    </>
  );
}
