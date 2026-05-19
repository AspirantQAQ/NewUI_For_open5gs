import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Accordion, AccordionSummary,
  AccordionDetails, TextField, Button, CircularProgress, Chip,
  Switch, FormControlLabel, IconButton, Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
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
        sx={{ minWidth: 200 }}
      />
    );
  }

  if (typeof value === 'boolean') {
    return <FormControlLabel control={<Switch checked={value} onChange={e => onChange((e.target as HTMLInputElement).checked)} />} label={value ? 'true' : 'false'} />;
  }

  if (typeof value === 'number') {
    return (
      <TextField
        size="small" type="number" value={value}
        onChange={e => onChange(Number(e.target.value))}
        sx={{ minWidth: 200 }}
        slotProps={{ htmlInput: { sx: { fontFamily: 'monospace' } } }}
      />
    );
  }

  if (typeof value === 'string') {
    return (
      <TextField
        size="small" value={value}
        onChange={e => onChange(e.target.value)}
        fullWidth
        slotProps={{ htmlInput: { sx: { fontFamily: 'monospace' } } }}
      />
    );
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" sx={{ color: 'text.disabled' }}>[] (empty)</Typography>
          <IconButton size="small" onClick={() => onChange([{}])}><AddIcon /></IconButton>
        </Box>
      );
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
          slotProps={{ htmlInput: { sx: { fontFamily: 'monospace' } } }}
        />
      );
    }
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {value.map((item, i) => (
          <Paper key={i} variant="outlined" sx={{ p: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="caption" color="text.secondary">[{i}]</Typography>
              <IconButton size="small" onClick={() => {
                const newArr = [...value];
                newArr.splice(i, 1);
                onChange(newArr);
              }}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
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
          </Paper>
        ))}
        <Button size="small" startIcon={<AddIcon />} onClick={() => onChange([...value, {}])}>
          添加项
        </Button>
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

  const removeKey = useCallback((key: string) => {
    const newObj = { ...obj };
    delete newObj[key];
    onChange(newObj);
  }, [obj, onChange]);

  const addKey = useCallback(() => {
    const newKey = `new_key_${Object.keys(obj).length}`;
    onChange({ ...obj, [newKey]: '' });
  }, [obj, onChange]);

  if (depth <= 1) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {entries.map(([key, val]) => (
          <Accordion key={key} defaultExpanded={depth === 0}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography sx={{ fontWeight: 'bold' }}>{key}</Typography>
              {!isObject(val) && !Array.isArray(val) && (
                <Typography variant="body2" sx={{ ml: 2, color: 'text.secondary' }}>
                  {val === null ? 'null' : String(val)}
                </Typography>
              )}
              {Array.isArray(val) && (
                <Typography variant="body2" sx={{ ml: 2, color: 'text.secondary' }}>
                  [{val.length} items]
                </Typography>
              )}
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                <IconButton size="small" onClick={() => removeKey(key)}><DeleteIcon fontSize="small" /></IconButton>
              </Box>
              <EditorValue value={val} onChange={newVal => updateKey(key, newVal)} depth={depth} />
            </AccordionDetails>
          </Accordion>
        ))}
        <Button size="small" startIcon={<AddIcon />} onClick={addKey}>添加字段</Button>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {entries.map(([key, val]) => (
        <Box key={key} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold', minWidth: 120, pt: 1, flexShrink: 0 }}>{key}</Typography>
          <Box sx={{ flex: 1 }}>
            <EditorValue value={val} onChange={newVal => updateKey(key, newVal)} depth={depth} />
          </Box>
          <IconButton size="small" onClick={() => removeKey(key)} sx={{ mt: 0.5 }}><DeleteIcon fontSize="small" /></IconButton>
        </Box>
      ))}
      <Button size="small" startIcon={<AddIcon />} onClick={addKey}>添加字段</Button>
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
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/')}>返回</Button>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
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
      </Box>

      {saved && <Alert severity="success" sx={{ mb: 2 }}>配置已保存到 MongoDB，点击「同步」写入 YAML 文件</Alert>}

      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={updateMut.isPending}>
          {updateMut.isPending ? '保存中...' : '保存'}
        </Button>
        <Button onClick={handleReset}>重置</Button>
        <Button onClick={() => navigate(`/config/nf/${nfType}`)}>查看模式</Button>
      </Box>

      <Paper sx={{ p: 2 }}>
        <EditorObject obj={editConfig} onChange={setEditConfig} depth={0} />
      </Paper>
    </Box>
  );
}
