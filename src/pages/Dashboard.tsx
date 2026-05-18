import { Typography, Paper } from '@mui/material';

export default function Dashboard() {
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>总览</Typography>
      <Typography color="text.secondary">NF 配置状态一览（待实现）</Typography>
    </Paper>
  );
}
