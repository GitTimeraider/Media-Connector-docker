const express = require('express');
const router = express.Router();
const axios = require('axios');
const configManager = require('../config/services');

router.get('/instances', async (req, res) => {
  const instances = await configManager.getServices('sabnzbd');
  res.json(instances);
});

router.get('/status/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('sabnzbd');
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
    const instances = await configManager.getServices('sabnzbd');
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
    const instances = await configManager.getServices('sabnzbd');
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
    const instances = await configManager.getServices('sabnzbd');
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
    const instances = await configManager.getServices('sabnzbd');
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

// Using GET to avoid reverse proxy POST blocking issues
router.get('/add/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('sabnzbd');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    let { url } = req.query;
    
    // If URL is a relative path (proxied download), convert to absolute URL
    if (url && url.startsWith('/api/prowlarr/download/')) {
      const protocol = req.protocol;
      const host = req.get('host');
      url = `${protocol}://${host}${url}`;
      console.log(`SABnzbd: Converting relative URL to absolute: ${url}`);
    }
    
    console.log(`SABnzbd: Adding URL to instance ${req.params.instanceId}: ${url}`);
    const response = await axios.get(`${instance.url}/api`, {
      params: { mode: 'addurl', name: url, output: 'json', apikey: instance.apiKey }
    });
    console.log(`SABnzbd: Response:`, response.data);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/queue/:instanceId/:nzoId', async (req, res) => {
  try {
    const instances = await configManager.getServices('sabnzbd');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const response = await axios.get(`${instance.url}/api`, {
      params: { mode: 'queue', name: 'delete', value: req.params.nzoId, output: 'json', apikey: instance.apiKey }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
