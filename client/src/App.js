import React, { useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { 
  Box, 
  AppBar, 
  Toolbar, 
  Typography, 
  Drawer, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText,
  ListItemButton,
  Divider,
  IconButton
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  LiveTv as TvIcon,
  Movie as MovieIcon,
  MusicNote as MusicIcon,
  Book as BookIcon,
  CloudDownload as DownloadIcon,
  Search as SearchIcon,
  Settings as SettingsIcon,
  Menu as MenuIcon,
  GridView as GridViewIcon,
  Dns as DnsIcon
} from '@mui/icons-material';

import Dashboard from './pages/Dashboard';
import Sonarr from './pages/Sonarr';
import Radarr from './pages/Radarr';
import Lidarr from './pages/Lidarr';
import Readarr from './pages/Readarr';
import Downloads from './pages/Downloads';
import Search from './pages/Search';
import Settings from './pages/Settings';
import Overview from './pages/Overview';
import Unraid from './pages/Unraid';

const drawerWidth = 240;

function App() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'Overview', icon: <GridViewIcon />, path: '/overview' },
    { divider: true },
    { text: 'TV Shows', icon: <TvIcon />, path: '/sonarr' },
    { text: 'Movies', icon: <MovieIcon />, path: '/radarr' },
    { text: 'Music', icon: <MusicIcon />, path: '/lidarr' },
    { text: 'Books', icon: <BookIcon />, path: '/readarr' },
    { divider: true },
    { text: 'Downloads', icon: <DownloadIcon />, path: '/downloads' },
    { text: 'Search', icon: <SearchIcon />, path: '/search' },
    { divider: true },
    { text: 'Unraid', icon: <DnsIcon />, path: '/unraid' },
    { divider: true },
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
  ];

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          Media Connector
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item, index) => 
          item.divider ? (
            <Divider key={`divider-${index}`} sx={{ my: 1 }} />
          ) : (
            <ListItem key={item.text} disablePadding>
              <ListItemButton 
                selected={location.pathname === item.path}
                onClick={() => {
                  navigate(item.path);
                  setMobileOpen(false);
                }}
              >
                <ListItemIcon sx={{ color: location.pathname === item.path ? 'primary.main' : 'inherit' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          )
        )}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            {menuItems.find(item => item.path === location.pathname)?.text || 'Media Connector'}
          </Typography>
        </Toolbar>
      </AppBar>
      
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: 8,
        }}
      >
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/overview" element={<Overview />} />
          <Route path="/sonarr" element={<Sonarr />} />
          <Route path="/radarr" element={<Radarr />} />
          <Route path="/lidarr" element={<Lidarr />} />
          <Route path="/readarr" element={<Readarr />} />
          <Route path="/downloads" element={<Downloads />} />
          <Route path="/search" element={<Search />} />
          <Route path="/unraid" element={<Unraid />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Box>
    </Box>
  );
}

export default App;
