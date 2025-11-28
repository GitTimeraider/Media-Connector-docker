const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const { runMigrations } = require('./utils/migrate');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  hsts: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
  crossOriginEmbedderPolicy: false,
  originAgentCluster: false
}));
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Import routes
const sonarrRoutes = require('./routes/sonarr');
const radarrRoutes = require('./routes/radarr');
const lidarrRoutes = require('./routes/lidarr');
const readarrRoutes = require('./routes/readarr');
const sabnzbdRoutes = require('./routes/sabnzbd');
const nzbgetRoutes = require('./routes/nzbget');
const qbittorrentRoutes = require('./routes/qbittorrent');
const transmissionRoutes = require('./routes/transmission');
const delugeRoutes = require('./routes/deluge');
const overseerrRoutes = require('./routes/overseerr');
const tautulliRoutes = require('./routes/tautulli');
const prowlarrRoutes = require('./routes/prowlarr');
const jackettRoutes = require('./routes/jackett');
const unraidRoutes = require('./routes/unraid');
const configRoutes = require('./routes/config');
const systemRoutes = require('./routes/system');
const tmdbRoutes = require('./routes/tmdb');
const authRoutes = require('./routes/auth');
const { authenticateToken, requireAdmin } = require('./middleware/auth');

// Public API Routes (no auth required)
app.use('/api/auth', authRoutes);

// Protected API Routes (authentication required)
app.use('/api/sonarr', authenticateToken, sonarrRoutes);
app.use('/api/radarr', authenticateToken, radarrRoutes);
app.use('/api/lidarr', authenticateToken, lidarrRoutes);
app.use('/api/readarr', authenticateToken, readarrRoutes);
app.use('/api/sabnzbd', authenticateToken, sabnzbdRoutes);
app.use('/api/nzbget', authenticateToken, nzbgetRoutes);
app.use('/api/qbittorrent', authenticateToken, qbittorrentRoutes);
app.use('/api/transmission', authenticateToken, transmissionRoutes);
app.use('/api/deluge', authenticateToken, delugeRoutes);
app.use('/api/overseerr', authenticateToken, overseerrRoutes);
app.use('/api/tautulli', authenticateToken, tautulliRoutes);
app.use('/api/prowlarr', authenticateToken, prowlarrRoutes);
app.use('/api/jackett', authenticateToken, jackettRoutes);
app.use('/api/unraid', authenticateToken, unraidRoutes);
app.use('/api/config', authenticateToken, configRoutes);
app.use('/api/system', authenticateToken, systemRoutes);
app.use('/api/tmdb', authenticateToken, tmdbRoutes);

// Health check endpoint (before wildcard route)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files from React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Initialize database and run migrations before starting server
async function startServer() {
  try {
    await runMigrations();
    
    app.listen(PORT, () => {
      console.log(`Media Connector server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
