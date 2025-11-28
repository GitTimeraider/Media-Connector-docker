const express = require('express');
const router = express.Router();
const ApiClient = require('../utils/apiClient');
const configManager = require('../config/services');

router.get('/instances', (req, res) => {
  const instances = configManager.getServices('overseerr');
  res.json(instances);
});

router.get('/status/:instanceId', async (req, res) => {
  try {
    const instances = configManager.getServices('overseerr');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const client = new ApiClient(instance.url, instance.apiKey);
    const status = await client.get('/api/v1/status');
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/requests/:instanceId', async (req, res) => {
  try {
    const instances = configManager.getServices('overseerr');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const client = new ApiClient(instance.url, instance.apiKey);
    const requests = await client.get('/api/v1/request');
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/request/:instanceId', async (req, res) => {
  try {
    const instances = configManager.getServices('overseerr');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const client = new ApiClient(instance.url, instance.apiKey);
    const result = await client.post('/api/v1/request', req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/search/:instanceId', async (req, res) => {
  try {
    const instances = configManager.getServices('overseerr');
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
