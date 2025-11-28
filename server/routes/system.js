const express = require('express');
const router = express.Router();
const os = require('os');

router.get('/info', (req, res) => {
  res.json({
    platform: os.platform(),
    arch: os.arch(),
    hostname: os.hostname(),
    uptime: os.uptime(),
    memory: {
      total: os.totalmem(),
      free: os.freemem()
    },
    cpus: os.cpus().length,
    nodeVersion: process.version,
    appVersion: require('../../package.json').version
  });
});

router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

module.exports = router;
