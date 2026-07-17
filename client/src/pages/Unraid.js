import React, { useState, useEffect, Component } from 'react';
import {
  Container,
  Typography,
  Box,
  Chip,
  CircularProgress,
  Alert,
  LinearProgress,
  IconButton,
  Tooltip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  Refresh,
  Storage,
  Memory,
  CheckCircle,
  Error as ErrorIcon,
  Computer
} from '@mui/icons-material';
import api from '../services/api';

// Error Boundary to catch rendering errors and prevent app crash
class UnraidErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unraid page error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Container>
          <Alert 
            severity="error" 
            sx={{ mt: 2 }}
            action={
              <Button 
                color="inherit" 
                size="small" 
                onClick={() => this.setState({ hasError: false, error: null })}
              >
                Retry
              </Button>
            }
          >
            Something went wrong loading the Unraid page. 
            {this.state.error?.message && ` Error: ${this.state.error.message}`}
          </Alert>
        </Container>
      );
    }
    return this.props.children;
  }
}

// Safe number parser that handles BigInt strings and null/undefined
const safeNumber = (value, defaultValue = 0) => {
  if (value === null || value === undefined) return defaultValue;
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
};

function UnraidContent() {
  const [loading, setLoading] = useState(true);
  const [instances, setInstances] = useState([]);
  const [selectedInstance, setSelectedInstance] = useState(null);
  const [systemStats, setSystemStats] = useState(null);
  const [dockerContainers, setDockerContainers] = useState([]);
  const [arrayStatus, setArrayStatus] = useState(null);

  useEffect(() => {
    loadInstances();
  }, []);

  useEffect(() => {
    if (selectedInstance) {
      loadUnraidData();
      const interval = setInterval(loadUnraidData, 10000); // Refresh every 10s
      return () => {
        clearInterval(interval);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedInstance]);

  const loadInstances = async () => {
    try {
      const data = await api.getServiceInstances('unraid');
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

  const loadUnraidData = async () => {
    try {
      const [stats, docker, array] = await Promise.allSettled([
        api.getUnraidStatus(selectedInstance),
        api.getUnraidDocker(selectedInstance),
        api.getUnraidArray(selectedInstance)
      ]);

      if (stats.status === 'fulfilled') {
        const statsData = stats.value;
        
        // GraphQL response structure: { info: { cpu, memory, os, system }, metrics: { cpu, memory } }
        const info = statsData?.info || {};
        const metrics = statsData?.metrics || {};
        
        // Hardware info from info.memory.layout
        const memoryLayout = info?.memory?.layout || [];
        // Usage data from metrics.memory
        const memoryMetrics = metrics?.memory || {};
        
        const combinedStats = {
          cpu: {
            ...info?.cpu,
            // Add usage percentage from metrics
            usage: metrics?.cpu?.percentTotal
          },
          memory: {
            // Total from metrics, or calculate from layout
            total: memoryMetrics.total || memoryLayout.reduce((sum, module) => sum + (Number(module.size) || 0), 0),
            used: memoryMetrics.used,
            free: memoryMetrics.free,
            available: memoryMetrics.available,
            percentTotal: memoryMetrics.percentTotal,
            layout: memoryLayout
          },
          os: info?.os || {},
          system: info?.system || {},
          versions: info?.versions || {}
        };
        setSystemStats(combinedStats);
      }
      if (docker.status === 'fulfilled') {
        const containers = docker.value?.docker?.containers || docker.value?.dockerContainers || docker.value;
        const sortedContainers = Array.isArray(containers) 
          ? containers.sort((a, b) => {
              const nameA = (a.names?.[0] || a.name || a.Names?.[0] || '').replace(/^\//g, '').toLowerCase();
              const nameB = (b.names?.[0] || b.name || b.Names?.[0] || '').replace(/^\//g, '').toLowerCase();
              return nameA.localeCompare(nameB);
            })
          : [];
        setDockerContainers(sortedContainers);
      }
      if (array.status === 'fulfilled') setArrayStatus(array.value?.array || array.value);
    } catch (error) {
      console.error('Error loading Unraid data:', error);
    }
  };

  const handleDockerAction = async (containerId, action) => {
    try {
      console.log('Docker action:', { containerId, action });
      await api.unraidDockerAction(selectedInstance, containerId, action);
      loadUnraidData();
    } catch (error) {
      console.error('Error performing action:', error);
      console.error('Error details:', error.response?.data);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message;
      alert(`Failed to ${action} container: ${errorMessage}`);
    }
  };

  const formatBytes = (bytes) => {
    try {
      const numBytes = safeNumber(bytes);
      if (numBytes <= 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(numBytes) / Math.log(k));
      if (i < 0 || i >= sizes.length) return '0 B';
      return Math.round(numBytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    } catch (e) {
      console.error('formatBytes error:', e);
      return '0 B';
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
          No Unraid instances configured. Go to Settings to add one.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ overflowX: 'hidden', width: '100%' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Unraid Server
        </Typography>
        <IconButton onClick={loadUnraidData}>
          <Refresh />
        </IconButton>
      </Box>

      {/* System Stats List */}
      {systemStats && (
        <Paper sx={{ mb: 4, overflow: 'hidden' }}>
          {/* System Row */}
          <Box sx={{ p: 2, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { xs: 'flex-start', md: 'center' }, justifyContent: 'space-between', gap: 2 }}>
            <Box display="flex" alignItems="center" sx={{ minWidth: { md: 160 } }}>
              <Computer sx={{ mr: 1.5, color: 'info.main' }} />
              <Typography variant="body1" fontWeight={600}>System</Typography>
            </Box>
            <Box sx={{ flex: 1, wordBreak: 'break-word' }}>
              <Typography variant="body2" fontWeight={500}>
                {systemStats.os?.hostname || 'Unknown'}
              </Typography>
              {(systemStats.system?.manufacturer || systemStats.system?.model) && (
                <Typography variant="caption" color="text.secondary" display="block">
                  {[systemStats.system?.manufacturer, systemStats.system?.model].filter(Boolean).join(' ')}
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary" display="block">
                {systemStats.os?.distro || 'Unraid'} {systemStats.os?.release || ''} (Platform: {systemStats.os?.platform || 'N/A'})
              </Typography>
            </Box>
            <Box sx={{ minWidth: { md: 180 }, textAlign: { xs: 'left', md: 'right' } }}>
              <Typography variant="body2">
                <strong>Uptime:</strong> {(() => {
                  const uptimeData = systemStats.os?.uptime;
                  if (!uptimeData) return 'N/A';
                  let uptimeSeconds;
                  if (typeof uptimeData === 'string') {
                    const bootTime = new Date(uptimeData);
                    if (!isNaN(bootTime.getTime())) {
                      uptimeSeconds = Math.floor((Date.now() - bootTime.getTime()) / 1000);
                    } else {
                      return uptimeData;
                    }
                  } else if (typeof uptimeData === 'number') {
                    uptimeSeconds = uptimeData;
                  } else {
                    return 'N/A';
                  }
                  const days = Math.floor(uptimeSeconds / 86400);
                  const hours = Math.floor((uptimeSeconds % 86400) / 3600);
                  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
                  return `${days}d ${hours}h ${minutes}m`;
                })()}
              </Typography>
            </Box>
          </Box>
          <Divider />

          {/* CPU Row */}
          <Box sx={{ p: 2, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { xs: 'flex-start', md: 'center' }, justifyContent: 'space-between', gap: 2 }}>
            <Box display="flex" alignItems="center" sx={{ minWidth: { md: 160 } }}>
              <Memory sx={{ mr: 1.5, color: 'primary.main' }} />
              <Typography variant="body1" fontWeight={600}>CPU</Typography>
            </Box>
            <Box sx={{ flex: 1, wordBreak: 'break-word' }}>
              <Typography variant="body2" fontWeight={500}>
                {systemStats.cpu?.brand || systemStats.cpu?.manufacturer || 'N/A'}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                {safeNumber(systemStats.cpu?.cores)} cores, {safeNumber(systemStats.cpu?.threads)} threads
                {systemStats.cpu?.speed && ` @ ${safeNumber(systemStats.cpu.speed) >= 10 ? (safeNumber(systemStats.cpu.speed) / 1000).toFixed(2) : safeNumber(systemStats.cpu.speed).toFixed(2)} GHz`}
              </Typography>
            </Box>
            <Box sx={{ width: { xs: '100%', md: 220 } }}>
              {(systemStats.cpu?.usage !== undefined || systemStats.cpu?.currentLoad !== undefined) ? (
                <>
                  <Box display="flex" justifyContent="space-between" mb={0.5}>
                    <Typography variant="caption" color="text.secondary">Load</Typography>
                    <Typography variant="body2" fontWeight={600} color="primary">
                      {safeNumber(systemStats.cpu?.usage ?? systemStats.cpu?.currentLoad).toFixed(1)}%
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={Math.min(safeNumber(systemStats.cpu?.usage ?? systemStats.cpu?.currentLoad), 100)} 
                    sx={{ height: 6, borderRadius: 3 }}
                  />
                </>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  CPU usage data not available
                </Typography>
              )}
            </Box>
          </Box>
          <Divider />

          {/* Memory Row */}
          <Box sx={{ p: 2, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { xs: 'flex-start', md: 'center' }, justifyContent: 'space-between', gap: 2 }}>
            <Box display="flex" alignItems="center" sx={{ minWidth: { md: 160 } }}>
              <Storage sx={{ mr: 1.5, color: 'success.main' }} />
              <Typography variant="body1" fontWeight={600}>Memory</Typography>
            </Box>
            <Box sx={{ flex: 1, wordBreak: 'break-word' }}>
              {(() => {
                const total = safeNumber(systemStats.memory?.total) || (Array.isArray(systemStats.memory?.layout) ? systemStats.memory.layout.reduce((sum, m) => sum + safeNumber(m?.size), 0) : 0);
                const percent = systemStats.memory?.percentTotal !== undefined
                  ? safeNumber(systemStats.memory.percentTotal)
                  : (total > 0 && systemStats.memory?.free !== undefined ? ((total - safeNumber(systemStats.memory.free)) / total) * 100 : 0);
                const used = total * (percent / 100);
                return (
                  <>
                    <Typography variant="body2" fontWeight={500}>
                      {total > 0 ? `${formatBytes(used)} / ${formatBytes(total)} (${percent.toFixed(1)}%)` : 'N/A'}
                    </Typography>
                    {Array.isArray(systemStats.memory?.layout) && systemStats.memory.layout.length > 0 && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {systemStats.memory.layout.length} modules
                      </Typography>
                    )}
                  </>
                );
              })()}
            </Box>
            <Box sx={{ width: { xs: '100%', md: 220 } }}>
              {(() => {
                const total = safeNumber(systemStats.memory?.total) || 1;
                const percent = systemStats.memory?.percentTotal !== undefined
                  ? safeNumber(systemStats.memory.percentTotal)
                  : (total > 0 && systemStats.memory?.free !== undefined ? ((total - safeNumber(systemStats.memory.free)) / total) * 100 : 0);
                return (
                  <>
                    <Box display="flex" justifyContent="space-between" mb={0.5}>
                      <Typography variant="caption" color="text.secondary">Usage</Typography>
                      <Typography variant="body2" fontWeight={600} color="success.main">
                        {percent.toFixed(1)}%
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={Math.min(percent, 100)} 
                      color="success"
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                  </>
                );
              })()}
            </Box>
          </Box>
          <Divider />

          {/* Array Row */}
          <Box sx={{ p: 2, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { xs: 'flex-start', md: 'center' }, justifyContent: 'space-between', gap: 2 }}>
            <Box display="flex" alignItems="center" sx={{ minWidth: { md: 160 } }}>
              <Storage sx={{ mr: 1.5, color: 'info.main' }} />
              <Typography variant="body1" fontWeight={600}>Array</Typography>
            </Box>
            <Box sx={{ flex: 1, wordBreak: 'break-word' }}>
              <Typography variant="body2" fontWeight={500}>Unraid Storage Array</Typography>
            </Box>
            <Box sx={{ minWidth: { md: 180 }, textAlign: { xs: 'left', md: 'right' } }}>
              <Chip 
                label={arrayStatus?.state || 'Unknown'} 
                color={arrayStatus?.state === 'STARTED' ? 'success' : 'default'}
                size="small"
              />
            </Box>
          </Box>
        </Paper>
      )}

      {/* Docker Containers Table */}
      <Typography variant="h5" gutterBottom sx={{ mt: 2, mb: 2 }}>
        Docker Containers ({dockerContainers.length})
      </Typography>
      <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell sx={{ width: '40%', fontWeight: 'bold', py: 1.5 }}>Name</TableCell>
              <TableCell sx={{ width: '35%', fontWeight: 'bold', py: 1.5 }}>State / Status</TableCell>
              <TableCell sx={{ width: '15%', fontWeight: 'bold', py: 1.5 }}>Auto-Start</TableCell>
              <TableCell align="right" sx={{ width: '10%', fontWeight: 'bold', py: 1.5 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {dockerContainers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    No Docker containers found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              dockerContainers.map((container, index) => {
                const isRunning = (container.state || container.State)?.toLowerCase() === 'running';
                const containerId = container.id || container.Id || container.name;
                const containerName = (container.names?.[0] || container.name || container.Names?.[0] || 'Unknown').replace(/^\//g, '');

                return (
                  <TableRow key={containerId || index} hover>
                    <TableCell sx={{ wordBreak: 'break-word' }}>
                      <Typography variant="body2" fontWeight={600}>
                        {containerName}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" flexWrap="wrap" gap={2.5}>
                        <Chip
                          icon={isRunning ? <CheckCircle /> : <ErrorIcon />}
                          label={container.state || container.State || container.status || container.Status || 'unknown'}
                          color={isRunning ? 'success' : 'default'}
                          size="small"
                        />
                        {(container.status || container.Status) && (
                          <Typography variant="caption" color="text.secondary">
                            {container.status || container.Status}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {container.autoStart !== undefined ? (
                        <Chip 
                          label={container.autoStart ? 'Auto-start' : 'Manual start'} 
                          size="small" 
                          variant="outlined"
                          color={container.autoStart ? 'primary' : 'default'}
                        />
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          -
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {isRunning ? (
                        <Tooltip title="Stop">
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => handleDockerAction(containerId, 'stop')}
                          >
                            <Stop />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Tooltip title="Start">
                          <IconButton 
                            size="small" 
                            color="success"
                            onClick={() => handleDockerAction(containerId, 'start')}
                          >
                            <PlayArrow />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
}

// Wrap the component with Error Boundary to prevent crashes from affecting rest of app
function Unraid() {
  return (
    <UnraidErrorBoundary>
      <UnraidContent />
    </UnraidErrorBoundary>
  );
}

export default Unraid;
