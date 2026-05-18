import { AppBar, Toolbar, Typography, IconButton, Button } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuthStore } from '../stores/authStore';

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const logout = useAuthStore(state => state.logout);
  const session = useAuthStore(state => state.session);

  return (
    <AppBar position="fixed">
      <Toolbar>
        <IconButton edge="start" color="inherit" onClick={onMenuClick} sx={{ mr: 2 }}>
          <MenuIcon />
        </IconButton>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>Open5GS</Typography>
        {session?.user && (
          <Typography variant="body2" sx={{ mr: 2 }}>{session.user.username}</Typography>
        )}
        <Button color="inherit" startIcon={<LogoutIcon />} onClick={logout}>退出</Button>
      </Toolbar>
    </AppBar>
  );
}
