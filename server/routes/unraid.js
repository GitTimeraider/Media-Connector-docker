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

    const headers = {
      'Authorization': `Basic ${Buffer.from(':' + instance.apiKey).toString('base64')}`
    };

    // Get system stats via Unraid webGUI
    const response = await axios.get(`${instance.url}/plugins/dynamix/include/SystemStats.php`, {
      headers,
      timeout: 10000
    });

    res.json(response.data);
  } catch (error) {
    console.error('Unraid status error:', error.message);
    res.status(500).json({ error: error.message, details: error.response?.data });
  }
});

router.get('/docker/:instanceId', async (req, res) => {
  try {
    const instances = configManager.getServices('unraid');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const headers = {
      'Authorization': `Basic ${Buffer.from(':' + instance.apiKey).toString('base64')}`
    };

    // Get Docker containers via Unraid webGUI
    const response = await axios.get(`${instance.url}/plugins/dynamix.docker.manager/include/UserPrefs.php`, {
      headers,
      timeout: 10000
    });

    res.json(response.data);
  } catch (error) {
    console.error('Unraid docker error:', error.message);
    res.status(500).json({ error: error.message, details: error.response?.data });
  }
});

router.get('/vms/:instanceId', async (req, res) => {
  try {
    const instances = configManager.getServices('unraid');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const headers = {
      'Authorization': `Basic ${Buffer.from(':' + instance.apiKey).toString('base64')}`
    };

    // Get VMs via Unraid webGUI
    const response = await axios.get(`${instance.url}/plugins/dynamix.vm.manager/include/VMMachines.php`, {
      headers,
      timeout: 10000
    });

    res.json(response.data);
  } catch (error) {
    console.error('Unraid VMs error:', error.message);
    res.status(500).json({ error: error.message, details: error.response?.data });
  }
});

router.get('/array/:instanceId', async (req, res) => {
  try {
    const instances = configManager.getServices('unraid');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const headers = {
      'Authorization': `Basic ${Buffer.from(':' + instance.apiKey).toString('base64')}`
    };

    // Get array status via Unraid webGUI
    const response = await axios.get(`${instance.url}/plugins/dynamix/include/DeviceList.php`, {
      headers,
      timeout: 10000
    });

    res.json(response.data);
  } catch (error) {
    console.error('Unraid array error:', error.message);
    res.status(500).json({ error: error.message, details: error.response?.data });
  }
});

router.post('/docker/action/:instanceId', async (req, res) => {
  try {
    const instances = configManager.getServices('unraid');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const headers = {
      'Authorization': `Basic ${Buffer.from(':' + instance.apiKey).toString('base64')}`
    };

    const { container, action } = req.body;
    const response = await axios.post(`${instance.url}/plugins/dynamix.docker.manager/include/Events.php`, 
      `action=${action}&container=${container}`,
      { headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 10000 }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Unraid docker action error:', error.message);
    res.status(500).json({ error: error.message, details: error.response?.data });
  }
});

module.exports = router;
