const express = require('express');
const router = express.Router();
const ApiClient = require('../utils/apiClient');
const configManager = require('../config/services');

router.get('/instances', (req, res) => {
  const instances = configManager.getServices('lidarr');
  res.json(instances);
});

router.get('/status/:instanceId', async (req, res) => {
  try {
    const instances = configManager.getServices('lidarr');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const client = new ApiClient(instance.url, instance.apiKey);
    const system = await client.get('/api/v1/system/status');
    res.json({ system });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/artist/:instanceId', async (req, res) => {
  try {
    const instances = configManager.getServices('lidarr');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const client = new ApiClient(instance.url, instance.apiKey);
    const artists = await client.get('/api/v1/artist');
    res.json(artists);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/search/:instanceId', async (req, res) => {
  try {
    const instances = configManager.getServices('lidarr');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const client = new ApiClient(instance.url, instance.apiKey);
    const results = await client.get('/api/v1/artist/lookup', { term: req.query.term });
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/artist/:instanceId', async (req, res) => {
  try {
    const instances = configManager.getServices('lidarr');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const client = new ApiClient(instance.url, instance.apiKey);
    const result = await client.post('/api/v1/artist', req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
