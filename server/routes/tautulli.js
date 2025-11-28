const express = require('express');
const router = express.Router();
const ApiClient = require('../utils/apiClient');
const configManager = require('../config/services');

router.get('/instances', (req, res) => {
  const instances = configManager.getServices('tautulli');
  res.json(instances);
});

router.get('/activity/:instanceId', async (req, res) => {
  try {
    const instances = configManager.getServices('tautulli');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const client = new ApiClient(instance.url, instance.apiKey);
    const activity = await client.get('/api/v2', { 
      params: { cmd: 'get_activity', apikey: instance.apiKey }
    });
    res.json(activity);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/history/:instanceId', async (req, res) => {
  try {
    const instances = configManager.getServices('tautulli');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const client = new ApiClient(instance.url, instance.apiKey);
    const history = await client.get('/api/v2', { 
      params: { cmd: 'get_history', apikey: instance.apiKey }
    });
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/libraries/:instanceId', async (req, res) => {
  try {
    const instances = configManager.getServices('tautulli');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const client = new ApiClient(instance.url, instance.apiKey);
    const libraries = await client.get('/api/v2', { 
      params: { cmd: 'get_libraries', apikey: instance.apiKey }
    });
    res.json(libraries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
