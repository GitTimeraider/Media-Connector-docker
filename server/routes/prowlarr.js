const express = require('express');
const router = express.Router();
const ApiClient = require('../utils/apiClient');
const configManager = require('../config/services');

router.get('/instances', (req, res) => {
  const instances = configManager.getServices('prowlarr');
  res.json(instances);
});

router.get('/status/:instanceId', async (req, res) => {
  try {
    const instances = configManager.getServices('prowlarr');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const client = new ApiClient(instance.url, instance.apiKey);
    const system = await client.get('/api/v1/system/status');
    res.json({ system });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/indexers/:instanceId', async (req, res) => {
  try {
    const instances = configManager.getServices('prowlarr');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const client = new ApiClient(instance.url, instance.apiKey);
    const indexers = await client.get('/api/v1/indexer');
    res.json(indexers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/search/:instanceId', async (req, res) => {
  try {
    const instances = configManager.getServices('prowlarr');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const client = new ApiClient(instance.url, instance.apiKey);
    const results = await client.get('/api/v1/search', { query: req.query.query });
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
