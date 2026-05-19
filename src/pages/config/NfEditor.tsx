import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, TextField, Button, CircularProgress, Chip,
  Switch, FormControlLabel, Alert, Divider,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import SaveIcon from '@mui/icons-material/Save';
import { useNfConfig, useUpdateNfConfig, useSyncStatus } from '../../hooks/useNfConfig';

function isObject(val: unknown): val is Record<string, unknown> {
  return val !== null && typeof val === 'object' && !Array.isArray(val);
}

function cloneDeep(val: unknown): unknown {
  return JSON.parse(JSON.stringify(val));
}

function EditorValue({
  value,
  onChange,
  depth = 0,
}: {
  value: unknown;
  onChange: (newVal: unknown) => void;
  depth?: number;
}) {
  if (value === null || value === undefined) {
    return (
      <TextField
        size="small" placeholder="null"
        onChange={e => onChange(e.target.value || null)}
        sx={{ minWidth: 180 }}
      />
    );
  }

  if (typeof value === 'boolean') {
    return <FormControlLabel
      label={value ? 'true' : 'false'}
      control={<Switch checked={value} size="small" onChange={e => onChange((e.target as HTMLInputElement).checked)} />}
      sx={{ m: 0 }}
    />;
  }

  if (typeof value === 'number') {
    return (
      <TextField
        size="small" type="number" value={value}
        onChange={e => onChange(Number(e.target.value))}
        sx={{ minWidth: 180 }}
        slotProps={{ htmlInput: { sx: { fontFamily: 'monospace', py: 0.5 } } }}
      />
    );
  }

  if (typeof value === 'string') {
    return (
      <TextField
        size="small" value={value}
        onChange={e => onChange(e.target.value)}
        fullWidth
        slotProps={{ htmlInput: { sx: { fontFamily: 'monospace', py: 0.5 } } }}
      />
    );
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <Typography variant="body2" sx={{ color: 'text.disabled', fontSize: 12 }}>[]</Typography>;
    }
    if (value.every(v => typeof v !== 'object' || v === null)) {
      return (
        <TextField
          size="small" value={value.join(', ')}
          onChange={e => onChange(e.target.value.split(',').map((s: string) => {
            const trimmed = s.trim();
            const num = Number(trimmed);
            return trimmed !== '' && !isNaN(num) ? num : trimmed;
          }))}
          fullWidth
          helperText="逗号分隔"
          slotProps={{ htmlInput: { sx: { fontFamily: 'monospace', py: 0.5 } } }}
        />
      );
    }
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {value.map((item, i) => (
          <Box key={i} sx={{ pl: 1, borderLeft: '2px solid', borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>[{i}]</Typography>
            {isObject(item) ? (
              <EditorObject obj={item} onChange={newObj => {
                const newArr = [...value];
                newArr[i] = newObj;
                onChange(newArr);
              }} depth={depth + 1} />
            ) : (
              <EditorValue value={item} onChange={newVal => {
                const newArr = [...value];
                newArr[i] = newVal;
                onChange(newArr);
              }} depth={depth + 1} />
            )}
          </Box>
        ))}
      </Box>
    );
  }

  if (isObject(value)) {
    return <EditorObject obj={value} onChange={onChange as (v: Record<string, unknown>) => void} depth={depth + 1} />;
  }

  return <TextField size="small" value={String(value)} onChange={e => onChange(e.target.value)} />;
}

function EditorObject({
  obj,
  onChange,
  depth = 0,
}: {
  obj: Record<string, unknown>;
  onChange: (newObj: Record<string, unknown>) => void;
  depth?: number;
}) {
  const entries = Object.entries(obj);

  const updateKey = useCallback((key: string, val: unknown) => {
    onChange({ ...obj, [key]: val });
  }, [obj, onChange]);

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
                <EditorValue value={val} onChange={newVal => updateKey(key, newVal)} depth={depth} />
              </Box>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

export default function NfEditor() {
  const { nfType } = useParams<{ nfType: string }>();
  const navigate = useNavigate();
  const { data: config, isLoading, error } = useNfConfig(nfType!);
  const updateMut = useUpdateNfConfig(nfType!);
  const { data: statusList } = useSyncStatus();

  const [editConfig, setEditConfig] = useState<Record<string, unknown> | null>(null);
  const [saved, setSaved] = useState(false);

  const syncStatus = statusList?.find(s => s.nfType === nfType);

  useEffect(() => {
    if (config?.config) {
      setEditConfig(cloneDeep(config.config) as Record<string, unknown>);
    }
  }, [config]);

  if (!nfType) return <Typography>Invalid NF type</Typography>;
  if (isLoading) return <Box sx={{ p: 3 }}><CircularProgress /></Box>;
  if (error) return <Typography color="error">Failed to load config for {nfType}</Typography>;
  if (!editConfig) return <Typography>No config found for {nfType}</Typography>;

  const handleSave = async () => {
    try {
      await updateMut.mutateAsync(editConfig);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      alert(`保存失败: ${e.response?.data?.error || e.message}`);
    }
  };

  const handleReset = () => {
    if (config?.config) {
      setEditConfig(cloneDeep(config.config) as Record<string, unknown>);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Button size="small" startIcon={<ArrowBackIcon />} onClick={() => navigate('/')}>返回</Button>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          编辑 {nfType.toUpperCase()} 配置
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
        <Button size="small" onClick={() => navigate(`/config/nf/${nfType}`)}>查看模式</Button>
        <Button size="small" onClick={handleReset}>重置</Button>
        <Button size="small" variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={updateMut.isPending}>
          {updateMut.isPending ? '保存中...' : '保存'}
        </Button>
      </Box>

      {saved && <Alert severity="success" sx={{ mb: 1, py: 0 }}>配置已保存到 MongoDB，点击「同步」写入 YAML 文件</Alert>}

      <Paper sx={{ p: 1.5 }}>
        <EditorObject obj={editConfig} onChange={setEditConfig} depth={0} />
      </Paper>
    </Box>
  );
}
