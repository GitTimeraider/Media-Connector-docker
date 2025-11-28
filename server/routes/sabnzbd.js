const express = require('express');
const router = express.Router();
const axios = require('axios');
const configManager = require('../config/services');

router.get('/instances', (req, res) => {
  const instances = configManager.getServices('sabnzbd');
  res.json(instances);
});

router.get('/status/:instanceId', async (req, res) => {
  try {
    const instances = configManager.getServices('sabnzbd');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const response = await axios.get(`${instance.url}/api`, {
      params: { mode: 'queue', output: 'json', apikey: instance.apiKey }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/queue/:instanceId', async (req, res) => {
  try {
    const instances = configManager.getServices('sabnzbd');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const response = await axios.get(`${instance.url}/api`, {
      params: { mode: 'queue', output: 'json', apikey: instance.apiKey }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/history/:instanceId', async (req, res) => {
  try {
    const instances = configManager.getServices('sabnzbd');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const response = await axios.get(`${instance.url}/api`, {
      params: { mode: 'history', output: 'json', apikey: instance.apiKey }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/pause/:instanceId', async (req, res) => {
  try {
    const instances = configManager.getServices('sabnzbd');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const response = await axios.get(`${instance.url}/api`, {
      params: { mode: 'pause', output: 'json', apikey: instance.apiKey }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/resume/:instanceId', async (req, res) => {
  try {
    const instances = configManager.getServices('sabnzbd');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const response = await axios.get(`${instance.url}/api`, {
      params: { mode: 'resume', output: 'json', apikey: instance.apiKey }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
