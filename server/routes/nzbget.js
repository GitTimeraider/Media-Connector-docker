const express = require('express');
const router = express.Router();
const ApiClient = require('../utils/apiClient');
const configManager = require('../config/services');

router.get('/instances', (req, res) => {
  const instances = configManager.getServices('nzbget');
  res.json(instances);
});

router.post('/rpc/:instanceId', async (req, res) => {
  try {
    const instances = configManager.getServices('nzbget');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const auth = Buffer.from(`${instance.username}:${instance.password}`).toString('base64');
    const client = new ApiClient(instance.url, '', {
      headers: { 'Authorization': `Basic ${auth}` }
    });

    const result = await client.post('/jsonrpc', req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/status/:instanceId', async (req, res) => {
  try {
    const instances = configManager.getServices('nzbget');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const auth = Buffer.from(`${instance.username}:${instance.password}`).toString('base64');
    const client = new ApiClient(instance.url, '', {
      headers: { 'Authorization': `Basic ${auth}` }
    });

    const result = await client.post('/jsonrpc', {
      method: 'status',
      params: []
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
