import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Button, CircularProgress, Chip, Divider,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import EditIcon from '@mui/icons-material/Edit';
import { useNfConfig, useSyncStatus } from '../../hooks/useNfConfig';

function isObject(val: unknown): val is Record<string, unknown> {
  return val !== null && typeof val === 'object' && !Array.isArray(val);
}

function ConfigValue({ value, depth = 0 }: { value: unknown; depth?: number }) {
  if (value === null || value === undefined) {
    return <Typography variant="body2" sx={{ color: 'text.disabled' }}>—</Typography>;
  }

  if (typeof value === 'boolean') {
    return <Chip label={value ? 'true' : 'false'} size="small" color={value ? 'success' : 'default'} />;
  }

  if (typeof value === 'number') {
    return <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{value}</Typography>;
  }

  if (typeof value === 'string') {
    return <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{value}</Typography>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <Typography variant="body2" sx={{ color: 'text.disabled' }}>[]</Typography>;
    }
    if (value.every(v => typeof v !== 'object')) {
      return (
        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
          [{value.join(', ')}]
        </Typography>
      );
    }
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {value.map((item, i) => (
          <Box key={i} sx={{ pl: 1, borderLeft: '2px solid', borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>[{i}]</Typography>
            {isObject(item) ? <ConfigObject obj={item} depth={depth + 1} /> : <ConfigValue value={item} depth={depth + 1} />}
          </Box>
        ))}
      </Box>
    );
  }

  if (isObject(value)) {
    return <ConfigObject obj={value} depth={depth + 1} />;
  }

  return <Typography variant="body2">{String(value)}</Typography>;
}

function ConfigObject({ obj, depth = 0 }: { obj: Record<string, unknown>; depth?: number }) {
  const entries = Object.entries(obj);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      {entries.map(([key, val], i) => {
        const nested = isObject(val) || Array.isArray(val);
        return (
          <Box key={key}>
            {i > 0 && <Divider sx={{ my: nested ? 1 : 0.25 }} />}
            <Box sx={{ display: 'flex', gap: 1, alignItems: nested ? 'flex-start' : 'center', py: 0.25 }}>
              <Typography variant="body2" sx={{
                fontWeight: depth === 0 ? 'bold' : 500,
                minWidth: depth === 0 ? 140 : 100,
                pt: nested ? 0.75 : 0,
                flexShrink: 0,
                fontSize: depth === 0 ? 13 : 12,
                color: depth === 0 ? 'text.primary' : 'text.secondary',
              }}>
                {key}
              </Typography>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <ConfigValue value={val} depth={depth} />
              </Box>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

export default function NfDetail() {
  const { nfType } = useParams<{ nfType: string }>();
  const navigate = useNavigate();
  const { data: config, isLoading, error } = useNfConfig(nfType!);
  const { data: statusList } = useSyncStatus();

  const syncStatus = statusList?.find(s => s.nfType === nfType);

  if (!nfType) return <Typography>Invalid NF type</Typography>;
  if (isLoading) return <Box sx={{ p: 3 }}><CircularProgress /></Box>;
  if (error) return <Typography color="error">Failed to load config for {nfType}</Typography>;
  if (!config) return <Typography>No config found for {nfType}</Typography>;

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Button size="small" startIcon={<ArrowBackIcon />} onClick={() => navigate('/')}>返回</Button>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          {nfType.toUpperCase()} 配置
        </Typography>
        {syncStatus && (
          <Chip
            size="small"
            icon={syncStatus.pendingSync ? <WarningIcon /> : <CheckCircleIcon />}
            label={syncStatus.pendingSync ? '待同步' : '已同步'}
            color={syncStatus.pendingSync ? 'warning' : 'success'}
          />
        )}
        <Box sx={{ flex: 1 }} />
        <Button
          size="small"
          variant="contained"
          startIcon={<EditIcon />}
          onClick={() => navigate(`/config/nf/${nfType}/edit`)}
        >
          编辑
        </Button>
      </Box>

      <Paper sx={{ p: 1.5 }}>
        <ConfigObject obj={config.config as Record<string, unknown>} depth={0} />
      </Paper>
    </Box>
  );
}
