const express = require('express');
const router = express.Router();
const axios = require('axios');
const configManager = require('../config/services');

router.get('/instances', async (req, res) => {
  const instances = await configManager.getServices('unraid');
  res.json(instances);
});

router.get('/status/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('unraid');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Add API key to headers if available
    if (instance.apiKey) {
      headers['x-api-key'] = instance.apiKey;
      headers['Authorization'] = `Bearer ${instance.apiKey}`;
    }

    // Get system info via REST API (v4.27.0+)
    // Try multiple endpoint patterns
    const endpoints = [
      `${instance.url}/system`,
      `${instance.url}/api/system`,
      `${instance.url}/info`,
      `${instance.url}/api/info`
    ];

    let response = null;
    let lastError = null;

    for (const endpoint of endpoints) {
      try {
        console.log(`Attempting Unraid status request to: ${endpoint}`);
        response = await axios.get(endpoint, { headers, timeout: 5000 });
        console.log(`Success! Unraid responded from: ${endpoint}`);
        break;
      } catch (error) {
        lastError = error;
        console.log(`Failed ${endpoint}: ${error.message}`);
      }
    }

    if (response) {
      res.json(response.data);
    } else {
      console.error('All Unraid status endpoints failed:', lastError?.message);
      res.json({ info: null, error: 'No valid endpoint found' });
    }
  } catch (error) {
    console.error('Unraid status error:', error.message);
    // Return empty data instead of 500 to prevent UI errors
    res.json({ info: null });
  }
});

router.get('/docker/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('unraid');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Add API key to headers if available
    if (instance.apiKey) {
      headers['x-api-key'] = instance.apiKey;
      headers['Authorization'] = `Bearer ${instance.apiKey}`;
    }

    // Get Docker containers via REST API (v4.27.0+)
    // Try multiple endpoint patterns
    const endpoints = [
      `${instance.url}/docker`,
      `${instance.url}/api/docker`,
      `${instance.url}/containers`,
      `${instance.url}/api/containers`,
      `${instance.url}/docker/containers`
    ];

    let response = null;
    let lastError = null;

    for (const endpoint of endpoints) {
      try {
        console.log(`Attempting Unraid docker request to: ${endpoint}`);
        response = await axios.get(endpoint, { headers, timeout: 5000 });
        console.log(`Success! Unraid responded from: ${endpoint}`);
        break;
      } catch (error) {
        lastError = error;
        console.log(`Failed ${endpoint}: ${error.message}`);
      }
    }

    if (response) {
      res.json(response.data);
    } else {
      console.error('All Unraid docker endpoints failed:', lastError?.message);
      res.json({ dockerContainers: [], error: 'No valid endpoint found' });
    }
  } catch (error) {
    console.error('Unraid docker error:', error.message);
    // Return empty data instead of 500 to prevent UI errors
    res.json({ dockerContainers: [] });
  }
});

router.get('/vms/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('unraid');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const headers = {
      'x-api-key': instance.apiKey,
      'Content-Type': 'application/json'
    };

    // Get VMs via REST API (v4.27.0+)
    const endpoints = [
      `${instance.url}/vms`,
      `${instance.url}/api/vms`,
      `${instance.url}/vm`,
      `${instance.url}/api/vm`
    ];

    let response = null;
    for (const endpoint of endpoints) {
      try {
        response = await axios.get(endpoint, { headers, timeout: 5000 });
        console.log(`Success! Unraid VMs from: ${endpoint}`);
        break;
      } catch (error) {
        console.log(`Failed ${endpoint}: ${error.message}`);
      }
    }

    if (response) {
      res.json(response.data);
    } else {
      res.json({ vms: [], error: 'No valid endpoint found' });
    }
  } catch (error) {
    console.error('Unraid VMs error:', error.message);
    res.status(500).json({ error: error.message, details: error.response?.data });
  }
});

router.get('/array/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('unraid');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const headers = {
      'x-api-key': instance.apiKey,
      'Content-Type': 'application/json'
    };

    // Get array status via REST API (v4.27.0+)
    const endpoints = [
      `${instance.url}/array`,
      `${instance.url}/api/array`,
      `${instance.url}/disks`,
      `${instance.url}/api/disks`
    ];

    let response = null;
    for (const endpoint of endpoints) {
      try {
        response = await axios.get(endpoint, { headers, timeout: 5000 });
        console.log(`Success! Unraid array from: ${endpoint}`);
        break;
      } catch (error) {
        console.log(`Failed ${endpoint}: ${error.message}`);
      }
    }

    if (response) {
      res.json(response.data);
    } else {
      res.json({ array: null, error: 'No valid endpoint found' });
    }
  } catch (error) {
    console.error('Unraid array error:', error.message);
    res.status(500).json({ error: error.message, details: error.response?.data });
  }
});

router.post('/docker/action/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('unraid');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const headers = {
      'x-api-key': instance.apiKey,
      'Content-Type': 'application/json'
    };

    const { containerId, action } = req.body;
    
    // Use GraphQL mutation for docker actions
    const mutation = `
      mutation {
        dockerContainer${action.charAt(0).toUpperCase() + action.slice(1)}(id: "${containerId}") {
          id
          state
        }
      }
    `;

    const response = await axios.post(`${instance.url}/graphql`,
      { query: mutation },
      { headers, timeout: 10000 }
    );

    res.json(response.data.data);
  } catch (error) {
    console.error('Unraid docker action error:', error.message);
    res.status(500).json({ error: error.message, details: error.response?.data });
  }
});

module.exports = router;
