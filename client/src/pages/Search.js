import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Alert,
  TextField,
  InputAdornment,
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { Search as SearchIcon, Download } from '@mui/icons-material';
import api from '../services/api';

function Search() {
  const [hasIndexers, setHasIndexers] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [prowlarrInstance, setProwlarrInstance] = useState(null);

  const categories = [
    { value: 'all', label: 'All' },
    { value: '2000', label: 'Movies' },
    { value: '5000', label: 'TV' },
    { value: '3000', label: 'Audio' },
    { value: '7000', label: 'Books' },
    { value: '1000', label: 'Console' },
    { value: '4000', label: 'PC' },
    { value: '6000', label: 'XXX' },
    { value: '8000', label: 'Other' }
  ];

  useEffect(() => {
    checkIndexers();
  }, []);

  const checkIndexers = async () => {
    try {
      const services = await api.getServices();
      const hasProwlarr = services.prowlarr && services.prowlarr.length > 0;
      const hasJackett = services.jackett && services.jackett.length > 0;
      setHasIndexers(hasProwlarr || hasJackett);
      
      if (hasProwlarr) {
        setProwlarrInstance(services.prowlarr[0].id);
      }
    } catch (error) {
      console.error('Error checking indexers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim() || !prowlarrInstance) return;

    setSearching(true);
    try {
      const params = {
        query: searchQuery
      };
      
      // Add categories as comma-separated string if not 'all'
      if (selectedCategory !== 'all') {
        params.categories = selectedCategory;
      }
      
      const results = await api.searchProwlarr(prowlarrInstance, params);
      setSearchResults(Array.isArray(results) ? results : []);
    } catch (error) {
      console.error('Error searching:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleDownload = async (result) => {
    try {
      const services = await api.getServices();
      const protocol = result.protocol || (result.downloadUrl?.includes('magnet:') ? 'torrent' : 'usenet');
      
      if (protocol === 'usenet' && services.sabnzbd?.length > 0) {
        // Download via SABnzbd
        await api.addToSabnzbd(services.sabnzbd[0].id, result.downloadUrl);
        alert('Added to SABnzbd!');
      } else if (protocol === 'torrent') {
        // Try qBittorrent first, then Deluge
        if (services.qbittorrent?.length > 0) {
          await api.addToQbittorrent(services.qbittorrent[0].id, result.downloadUrl);
          alert('Added to qBittorrent!');
        } else if (services.deluge?.length > 0) {
          await api.addToDeluge(services.deluge[0].id, result.downloadUrl);
          alert('Added to Deluge!');
        } else {
          alert('No torrent client configured!');
        }
      } else if (protocol === 'usenet') {
        alert('No Usenet client configured!');
      }
    } catch (error) {
      console.error('Error downloading:', error);
      alert('Failed to add download: ' + error.message);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return 'Unknown';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <Container>
        <Typography variant="h4" gutterBottom>Search</Typography>
        <Alert severity="info">Loading...</Alert>
      </Container>
    );
  }

  if (!hasIndexers) {
    return (
      <Container>
        <Typography variant="h4" gutterBottom>Search</Typography>
        <Alert severity="info">
          Configure Prowlarr or Jackett in Settings to search across indexers.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Typography variant="h4" gutterBottom>Search Indexers</Typography>

      <Box component="form" onSubmit={handleSearch} sx={{ mb: 4 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Search for movies, TV shows, music..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={selectedCategory}
                label="Category"
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                {categories.map(cat => (
                  <MenuItem key={cat.value} value={cat.value}>{cat.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <Button
              fullWidth
              variant="contained"
              type="submit"
              disabled={searching || !searchQuery.trim()}
              startIcon={searching ? <CircularProgress size={20} /> : <SearchIcon />}
            >
              {searching ? 'Searching...' : 'Search'}
            </Button>
          </Grid>
        </Grid>
      </Box>

      {searchResults.length > 0 && (
        <Grid container spacing={2}>
          {searchResults.map((result, index) => (
            <Grid item xs={12} key={index}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {result.title}
                  </Typography>
                  <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                    <Chip label={result.indexer} size="small" color="primary" />
                    <Chip 
                      label={result.protocol === 'torrent' ? 'Torrent' : 'Usenet'} 
                      size="small" 
                      color={result.protocol === 'torrent' ? 'success' : 'info'}
                    />
                    <Chip label={formatBytes(result.size)} size="small" />
                    {result.seeders !== undefined && result.seeders > 0 && (
                      <Chip label={`↑ ${result.seeders}`} size="small" color="success" />
                    )}
                    {result.leechers !== undefined && (
                      <Chip label={`↓ ${result.leechers}`} size="small" />
                    )}
                    {result.publishDate && (
                      <Chip label={new Date(result.publishDate).toLocaleDateString()} size="small" />
                    )}
                  </Box>
                  {result.infoUrl && (
                    <Typography variant="body2" color="text.secondary" noWrap>
                      Source: {result.infoUrl}
                    </Typography>
                  )}
                </CardContent>
                <CardActions>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<Download />}
                    onClick={() => handleDownload(result)}
                    disabled={!result.downloadUrl}
                  >
                    Add to Client
                  </Button>
                  <Button
                    size="small"
                    href={result.downloadUrl}
                    target="_blank"
                    disabled={!result.downloadUrl}
                  >
                    Manual Download
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {searchResults.length === 0 && searchQuery && !searching && (
        <Alert severity="info">
          No results found. Try adjusting your search query or category.
        </Alert>
      )}
    </Container>
  );
}

export default Search;
