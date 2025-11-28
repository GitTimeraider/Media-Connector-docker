const express = require('express');
const router = express.Router();
const axios = require('axios');
const configManager = require('../config/services');

router.get('/instances', (req, res) => {
  const instances = configManager.getServices('unraid');
  res.json(instances);
});

router.get('/status/:instanceId', async (req, res) => {
  try {
    const instances = configManager.getServices('unraid');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const headers = instance.apiKey 
      ? { 'X-API-Key': instance.apiKey }
      : {};

    // Get system stats via Unraid API
    const response = await axios.get(`${instance.url}/api/v1/system/stats`, {
      headers,
      timeout: 10000
    });

    res.json(response.data);
  } catch (error) {
    console.error('Unraid status error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.get('/docker/:instanceId', async (req, res) => {
  try {
    const instances = configManager.getServices('unraid');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const headers = instance.apiKey 
      ? { 'X-API-Key': instance.apiKey }
      : {};

    // Get Docker containers via Unraid API
    const response = await axios.get(`${instance.url}/api/v1/docker/containers`, {
      headers,
      timeout: 10000
    });

    res.json(response.data);
  } catch (error) {
    console.error('Unraid docker error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.get('/vms/:instanceId', async (req, res) => {
  try {
    const instances = configManager.getServices('unraid');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const headers = instance.apiKey 
      ? { 'X-API-Key': instance.apiKey }
      : {};

    // Get VMs via Unraid API
    const response = await axios.get(`${instance.url}/api/v1/vms`, {
      headers,
      timeout: 10000
    });

    res.json(response.data);
  } catch (error) {
    console.error('Unraid VMs error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.get('/array/:instanceId', async (req, res) => {
  try {
    const instances = configManager.getServices('unraid');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const headers = instance.apiKey 
      ? { 'X-API-Key': instance.apiKey }
      : {};

    // Get array status via Unraid API
    const response = await axios.get(`${instance.url}/api/v1/system/array`, {
      headers,
      timeout: 10000
    });

    res.json(response.data);
  } catch (error) {
    console.error('Unraid array error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.post('/docker/action/:instanceId', async (req, res) => {
  try {
    const instances = configManager.getServices('unraid');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const headers = instance.apiKey 
      ? { 'X-API-Key': instance.apiKey }
      : {};

    const { container, action } = req.body;
    const response = await axios.post(`${instance.url}/api/v1/docker/containers/${container}/${action}`, 
      {},
      { headers, timeout: 10000 }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Unraid docker action error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
