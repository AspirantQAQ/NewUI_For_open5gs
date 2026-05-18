import React, { useState } from 'react';
import { Box, Card, CardContent, TextField, Button, Typography, Alert } from '@mui/material';
import { useAuthStore } from '../stores/authStore';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const login = useAuthStore(state => state.login);
  const loading = useAuthStore(state => state.loading);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(username, password);
      navigate('/');
    } catch {
      setError('登录失败，请检查用户名和密码');
    }
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <Card sx={{ minWidth: 350 }}>
        <CardContent>
          <Typography variant="h5" align="center" gutterBottom>Open5GS</Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <form onSubmit={handleSubmit}>
            <TextField fullWidth label="用户名" margin="normal" value={username}
              onChange={e => setUsername(e.target.value)} required />
            <TextField fullWidth label="密码" type="password" margin="normal"
              value={password} onChange={e => setPassword(e.target.value)} required />
            <Button fullWidth type="submit" variant="contained" size="large"
              sx={{ mt: 2 }} disabled={loading}>登录</Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
