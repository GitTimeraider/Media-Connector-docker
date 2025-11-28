import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  LiveTv,
  Movie,
  MusicNote,
  Book,
  CloudDownload,
  Warning
} from '@mui/icons-material';
import api from '../services/api';

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState({});
  const [stats, setStats] = useState({
    sonarr: { total: 0, monitored: 0 },
    radarr: { total: 0, monitored: 0 },
    lidarr: { total: 0, monitored: 0 },
    readarr: { total: 0, monitored: 0 },
    downloads: { active: 0, queued: 0 }
  });

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const servicesData = await api.getServices();
      setServices(servicesData);

      // Load stats for each service type
      const statsPromises = [];
      
      if (servicesData.sonarr?.length > 0) {
        statsPromises.push(
          api.getSonarrSeries(servicesData.sonarr[0].id)
            .then(series => ({
              type: 'sonarr',
              total: series.length,
              monitored: series.filter(s => s.monitored).length
            }))
            .catch(() => ({ type: 'sonarr', total: 0, monitored: 0 }))
        );
      }

      if (servicesData.radarr?.length > 0) {
        statsPromises.push(
          api.getRadarrMovies(servicesData.radarr[0].id)
            .then(movies => ({
              type: 'radarr',
              total: movies.length,
              monitored: movies.filter(m => m.monitored).length
            }))
            .catch(() => ({ type: 'radarr', total: 0, monitored: 0 }))
        );
      }

      const results = await Promise.all(statsPromises);
      const newStats = { ...stats };
      results.forEach(result => {
        if (result.type) {
          newStats[result.type] = { total: result.total, monitored: result.monitored };
        }
      });
      setStats(newStats);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, icon, value, subtitle, color }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" alignItems="center" mb={2}>
          <Box
            sx={{
              backgroundColor: color,
              borderRadius: 2,
              p: 1,
              mr: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {icon}
          </Box>
          <Typography variant="h6" component="div">
            {title}
          </Typography>
        </Box>
        <Typography variant="h3" component="div" mb={1}>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {subtitle}
        </Typography>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  const hasServices = Object.values(services).some(arr => arr.length > 0);

  if (!hasServices) {
    return (
      <Container>
        <Alert severity="info" icon={<Warning />}>
          No services configured. Go to Settings to add your media services.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="TV Shows"
            icon={<LiveTv sx={{ color: 'white' }} />}
            value={stats.sonarr.total}
            subtitle={`${stats.sonarr.monitored} monitored`}
            color="#1976d2"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Movies"
            icon={<Movie sx={{ color: 'white' }} />}
            value={stats.radarr.total}
            subtitle={`${stats.radarr.monitored} monitored`}
            color="#dc004e"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Music"
            icon={<MusicNote sx={{ color: 'white' }} />}
            value={stats.lidarr.total}
            subtitle={`${stats.lidarr.monitored} monitored`}
            color="#f57c00"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Books"
            icon={<Book sx={{ color: 'white' }} />}
            value={stats.readarr.total}
            subtitle={`${stats.readarr.monitored} monitored`}
            color="#388e3c"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Active Services
              </Typography>
              <Box sx={{ mt: 2 }}>
                {Object.entries(services).map(([type, instances]) => 
                  instances.length > 0 && (
                    <Box key={type} sx={{ mb: 1 }}>
                      <Typography variant="body1">
                        {type.charAt(0).toUpperCase() + type.slice(1)}: {instances.length} instance(s)
                      </Typography>
                    </Box>
                  )
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}

export default Dashboard;
