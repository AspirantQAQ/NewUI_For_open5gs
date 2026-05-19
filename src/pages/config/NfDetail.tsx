import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Accordion, AccordionSummary,
  AccordionDetails, Table, TableBody, TableCell, TableContainer,
  TableRow, Button, CircularProgress, Chip,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import { useNfConfig } from '../../hooks/useNfConfig';
import { useSyncStatus } from '../../hooks/useNfConfig';

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
      return <Typography variant="body2" sx={{ color: 'text.disabled' }}>[] (empty)</Typography>;
    }
    if (value.every(v => typeof v !== 'object')) {
      return (
        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
          [{value.join(', ')}]
        </Typography>
      );
    }
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {value.map((item, i) => (
          <Paper key={i} variant="outlined" sx={{ p: 1 }}>
            <Typography variant="caption" color="text.secondary">[{i}]</Typography>
            {isObject(item) ? <ConfigObject obj={item} depth={depth + 1} /> : <ConfigValue value={item} depth={depth + 1} />}
          </Paper>
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

  if (depth <= 1) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {entries.map(([key, val]) => (
          <Accordion key={key} defaultExpanded={depth === 0}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography sx={{ fontWeight: 'bold' }}>{key}</Typography>
              {!isObject(val) && !Array.isArray(val) && (
                <Typography variant="body2" sx={{ ml: 2, color: 'text.secondary' }}>
                  {val === null ? '—' : String(val)}
                </Typography>
              )}
              {Array.isArray(val) && (
                <Typography variant="body2" sx={{ ml: 2, color: 'text.secondary' }}>
                  [{val.length} items]
                </Typography>
              )}
            </AccordionSummary>
            <AccordionDetails>
              <ConfigValue value={val} depth={depth} />
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>
    );
  }

  return (
    <TableContainer>
      <Table size="small">
        <TableBody>
          {entries.map(([key, val]) => (
            <TableRow key={key}>
              <TableCell sx={{ fontWeight: 'bold', width: '30%', verticalAlign: 'top' }}>{key}</TableCell>
              <TableCell><ConfigValue value={val} depth={depth} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
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
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/')}>返回</Button>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
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
      </Box>

      <Paper sx={{ p: 2 }}>
        <ConfigObject obj={config.config as Record<string, unknown>} depth={0} />
      </Paper>
    </Box>
  );
}
