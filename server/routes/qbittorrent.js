const express = require('express');
const router = express.Router();
const axios = require('axios');
const configManager = require('../config/services');

router.get('/instances', (req, res) => {
  const instances = configManager.getServices('qbittorrent');
  res.json(instances);
});

router.post('/login/:instanceId', async (req, res) => {
  try {
    const instances = configManager.getServices('qbittorrent');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const response = await axios.post(`${instance.url}/api/v2/auth/login`, 
      `username=${instance.username}&password=${instance.password}`,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    
    res.json({ cookie: response.headers['set-cookie'] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/torrents/:instanceId', async (req, res) => {
  try {
    const instances = configManager.getServices('qbittorrent');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const response = await axios.get(`${instance.url}/api/v2/torrents/info`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/torrents/pause/:instanceId', async (req, res) => {
  try {
    const instances = configManager.getServices('qbittorrent');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const response = await axios.post(`${instance.url}/api/v2/torrents/pause`, 
      `hashes=${req.body.hashes}`,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/torrents/resume/:instanceId', async (req, res) => {
  try {
    const instances = configManager.getServices('qbittorrent');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const response = await axios.post(`${instance.url}/api/v2/torrents/resume`, 
      `hashes=${req.body.hashes}`,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/add/:instanceId', async (req, res) => {
  try {
    const instances = configManager.getServices('qbittorrent');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const { url } = req.body;
    
    // Login first to get cookie
    const loginResponse = await axios.post(`${instance.url}/api/v2/auth/login`, 
      `username=${instance.username}&password=${instance.password}`,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    
    const cookie = loginResponse.headers['set-cookie'];
    
    // Add torrent
    const response = await axios.post(`${instance.url}/api/v2/torrents/add`,
      `urls=${encodeURIComponent(url)}`,
      { 
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': cookie
        } 
      }
    );
    
    res.json({ success: true, data: response.data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
