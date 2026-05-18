import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer, List, ListItemButton, ListItemIcon, ListItemText,
  Divider, Collapse
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PersonIcon from '@mui/icons-material/Person';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import SettingsIcon from '@mui/icons-material/Settings';
import PublicIcon from '@mui/icons-material/Public';
import DeviceHubIcon from '@mui/icons-material/DeviceHub';
import RouterIcon from '@mui/icons-material/Router';
import CellTowerIcon from '@mui/icons-material/CellTower';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const DRAWER_WIDTH = 240;

const mainNav = [
  { path: '/', label: '总览', icon: <DashboardIcon /> },
  { path: '/subscribers', label: '订阅者', icon: <PersonIcon /> },
  { path: '/profiles', label: 'Profile', icon: <ContentCopyIcon /> },
  { path: '/accounts', label: '账户', icon: <VpnKeyIcon /> },
];

const configNav = [
  { path: '/config/global', label: '全局设置', icon: <SettingsIcon /> },
  { path: '/config/plmn', label: 'PLMN/网络', icon: <PublicIcon /> },
  { path: '/config/sbi', label: '5GC SBI', icon: <DeviceHubIcon /> },
  { path: '/config/session', label: '会话/UPF', icon: <RouterIcon /> },
  { path: '/config/epc', label: '4G EPC', icon: <CellTowerIcon /> },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [configOpen, setConfigOpen] = React.useState(
    location.pathname.startsWith('/config')
  );

  const handleNav = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <Drawer
      variant="temporary" open={open} onClose={onClose}
      sx={{ '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}
    >
      <List sx={{ width: DRAWER_WIDTH }} component="nav">
        {mainNav.map(item => (
          <ListItemButton
            key={item.path} selected={location.pathname === item.path}
            onClick={() => handleNav(item.path)}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
        <Divider />
        <ListItemButton onClick={() => setConfigOpen(!configOpen)}>
          <ListItemIcon><SettingsIcon /></ListItemIcon>
          <ListItemText primary="NF 配置" />
          {configOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </ListItemButton>
        <Collapse in={configOpen} timeout="auto" unmountOnExit>
          {configNav.map(item => (
            <ListItemButton
              key={item.path} selected={location.pathname === item.path}
              onClick={() => handleNav(item.path)} sx={{ pl: 4 }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </Collapse>
      </List>
    </Drawer>
  );
}
