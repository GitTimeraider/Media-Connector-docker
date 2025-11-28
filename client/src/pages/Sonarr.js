import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  Chip,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { Search, Add } from '@mui/icons-material';
import api from '../services/api';

function Sonarr() {
  const [loading, setLoading] = useState(true);
  const [instances, setInstances] = useState([]);
  const [selectedInstance, setSelectedInstance] = useState(null);
  const [series, setSeries] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    loadInstances();
  }, []);

  useEffect(() => {
    if (selectedInstance) {
      loadSeries();
    }
  }, [selectedInstance]);

  const loadInstances = async () => {
    try {
      const data = await api.getServiceInstances('sonarr');
      setInstances(data);
      if (data.length > 0) {
        setSelectedInstance(data[0].id);
      }
    } catch (error) {
      console.error('Error loading instances:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSeries = async () => {
    try {
      setLoading(true);
      const data = await api.getSonarrSeries(selectedInstance);
      setSeries(data);
    } catch (error) {
      console.error('Error loading series:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery) return;
    try {
      const results = await api.searchSonarr(selectedInstance, searchQuery);
      setSearchResults(results);
      setSearchOpen(true);
    } catch (error) {
      console.error('Error searching:', error);
    }
  };

  if (loading && instances.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (instances.length === 0) {
    return (
      <Container>
        <Alert severity="info">
          No Sonarr instances configured. Go to Settings to add one.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          TV Shows
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setSearchOpen(true)}
        >
          Add Series
        </Button>
      </Box>

      <Box mb={3}>
        <TextField
          fullWidth
          placeholder="Search for series..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
            endAdornment: (
              <Button onClick={handleSearch}>Search</Button>
            )
          }}
        />
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {series.map((show) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={show.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                {show.images?.find(img => img.coverType === 'poster') && (
                  <CardMedia
                    component="img"
                    height="300"
                    image={show.images.find(img => img.coverType === 'poster').remoteUrl}
                    alt={show.title}
                    sx={{ objectFit: 'cover' }}
                  />
                )}
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" gutterBottom>
                    {show.title}
                  </Typography>
                  <Box display="flex" gap={1} flexWrap="wrap" mb={1}>
                    <Chip 
                      label={`${show.seasonCount} Seasons`} 
                      size="small" 
                      color="primary" 
                    />
                    {show.monitored && (
                      <Chip label="Monitored" size="small" color="success" />
                    )}
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {show.overview?.substring(0, 150)}...
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={searchOpen} onClose={() => setSearchOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Search TV Shows</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {searchResults.map((result) => (
              <Grid item xs={12} key={result.tvdbId}>
                <Card>
                  <CardContent>
                    <Typography variant="h6">{result.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {result.overview?.substring(0, 200)}...
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSearchOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default Sonarr;
