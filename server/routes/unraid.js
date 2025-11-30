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

    // Get system info via GraphQL API
    // Note: CPU usage and memory usage are NOT available in queries, only in subscriptions
    const query = `
      query {
        info {
          cpu {
            id
            manufacturer
            brand
            cores
            threads
            speed
            speedmax
            speedmin
          }
          memory {
            layout {
              size
              type
              bank
              clockSpeed
              manufacturer
            }
          }
          versions {
            core {
              unraid
              api
              kernel
            }
          }
          os {
            distro
            release
            platform
            uptime
          }
        }
      }
    `;

    console.log(`Attempting Unraid status request to: ${instance.url}/graphql`);
    
    const response = await axios.post(`${instance.url}/graphql`, 
      { query },
      { headers, timeout: 10000 }
    );

    console.log('Unraid status response:', JSON.stringify(response.data, null, 2));

    // GraphQL returns data in response.data.data
    if (response.data && response.data.data) {
      res.json(response.data.data);
    } else {
      res.json(response.data);
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

    // Get Docker containers via GraphQL API
    const query = `
      query {
        docker {
          containers {
            id
            names
            image
            state
            status
            autoStart
          }
        }
      }
    `;

    console.log(`Attempting Unraid docker request to: ${instance.url}/graphql`);

    const response = await axios.post(`${instance.url}/graphql`,
      { query },
      { headers, timeout: 10000 }
    );

    console.log('Unraid docker response:', JSON.stringify(response.data, null, 2));

    // GraphQL returns data in response.data.data
    if (response.data && response.data.data) {
      const containers = response.data.data.docker?.containers || [];
      console.log(`Found ${containers.length} Docker containers`);
      res.json(response.data.data);
    } else {
      res.json(response.data);
    }
  } catch (error) {
    console.error('Unraid docker error:', error.message);
    console.error('Error details:', error.response?.data);
    // Return empty data instead of 500 to prevent UI errors
    res.json({ docker: { containers: [] } });
  }
});

router.get('/vms/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('unraid');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (instance.apiKey) {
      headers['x-api-key'] = instance.apiKey;
      headers['Authorization'] = `Bearer ${instance.apiKey}`;
    }

    // Get VMs via GraphQL API
    const query = `
      query {
        vms {
          domains {
            id
            uuid
            name
            state
            autoStart
          }
        }
      }
    `;

    console.log(`Attempting Unraid VMs request to: ${instance.url}/graphql`);

    const response = await axios.post(`${instance.url}/graphql`,
      { query },
      { headers, timeout: 10000 }
    );

    // GraphQL returns data in response.data.data
    if (response.data && response.data.data) {
      res.json(response.data.data);
    } else {
      res.json(response.data);
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
      'Content-Type': 'application/json'
    };
    
    if (instance.apiKey) {
      headers['x-api-key'] = instance.apiKey;
      headers['Authorization'] = `Bearer ${instance.apiKey}`;
    }

    // Get array status via GraphQL API
    const query = `
      query {
        array {
          state
          capacity {
            disks {
              free
              used
              total
            }
          }
          disks {
            name
            device
            size
            status
            temp
            type
          }
        }
      }
    `;

    console.log(`Attempting Unraid array request to: ${instance.url}/graphql`);

    const response = await axios.post(`${instance.url}/graphql`,
      { query },
      { headers, timeout: 10000 }
    );

    // GraphQL returns data in response.data.data
    if (response.data && response.data.data) {
      res.json(response.data.data);
    } else {
      res.json(response.data);
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
    
    console.log('Docker action request:', { containerId, action, instanceId: req.params.instanceId });
    
    // First get the container to find its actual name
    const containerQuery = `
      query {
        docker {
          containers {
            id
            names
            state
          }
        }
      }
    `;
    
    const containerResponse = await axios.post(`${instance.url}/graphql`,
      { query: containerQuery },
      { headers, timeout: 10000 }
    );
    
    const containers = containerResponse.data?.data?.docker?.containers || [];
    const container = containers.find(c => c.id === containerId);
    
    if (!container) {
      console.error('Container not found:', containerId);
      return res.status(404).json({ error: 'Container not found', containerId });
    }
    
    // Get the container name (first name without leading slash)
    const containerName = (container.names[0] || '').replace(/^\//, '');
    console.log('Found container:', { id: container.id, name: containerName, state: container.state });
    
    // Use GraphQL mutation for docker actions
    const actionName = action.charAt(0).toUpperCase() + action.slice(1);
    
    // Try mutation with container name (Unraid API might expect name instead of id)
    const mutation = `
      mutation {
        dockerContainer${actionName}(name: "${containerName}")
      }
    `;

    console.log('[Unraid Docker] Sending mutation:', mutation);
    console.log('[Unraid Docker] Container ID:', containerId);
    console.log('[Unraid Docker] Container name:', containerName);
    console.log('[Unraid Docker] Action:', action, '-> mutation name:', actionName);

    let response;
    try {
      response = await axios.post(`${instance.url}/graphql`,
        { query: mutation },
        { headers, timeout: 10000 }
      );
    } catch (axiosError) {
      console.error('[Unraid Docker] Axios error:', axiosError.message);
      console.error('[Unraid Docker] Error response:', JSON.stringify(axiosError.response?.data, null, 2));
      
      // If the mutation with 'name' failed, try with lowercase action
      const lowerMutation = `
        mutation {
          dockerContainer${action}(name: "${containerName}")
        }
      `;
      console.log('[Unraid Docker] Retrying with lowercase action:', lowerMutation);
      
      try {
        response = await axios.post(`${instance.url}/graphql`,
          { query: lowerMutation },
          { headers, timeout: 10000 }
        );
      } catch (retryError) {
        console.error('[Unraid Docker] Retry also failed:', retryError.message);
        throw axiosError; // Throw original error
      }
    }

    console.log('[Unraid Docker] Response:', JSON.stringify(response.data, null, 2));
    
    // Check for GraphQL errors in response
    if (response.data.errors) {
      console.error('[Unraid Docker] GraphQL errors:', JSON.stringify(response.data.errors, null, 2));
      return res.status(400).json({
        error: 'GraphQL mutation failed',
        graphqlErrors: response.data.errors,
        mutation: mutation
      });
    }
    
    res.json(response.data.data || response.data);
  } catch (error) {
    console.error('[Unraid Docker] Action error:', error.message);
    if (error.response) {
      console.error('[Unraid Docker] Response status:', error.response.status);
      console.error('[Unraid Docker] Response data:', JSON.stringify(error.response.data, null, 2));
    }
    res.status(500).json({ 
      error: error.message, 
      details: error.response?.data,
      graphqlErrors: error.response?.data?.errors,
      container: { id: containerId, name: containerName },
      action: action
    });
  }
});

// Start real-time subscription for instance
router.post('/subscribe/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('unraid');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    // Get the UnraidSubscriptionManager from app locals (set in server/index.js)
    const unraidManager = req.app.locals.unraidManager;
    
    // Subscribe to real-time stats
    unraidManager.subscribe(req.params.instanceId, instance.url, instance.apiKey);
    
    res.json({ success: true, instanceId: req.params.instanceId });
  } catch (error) {
    console.error('Unraid subscription error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Stop real-time subscription for instance
router.delete('/subscribe/:instanceId', async (req, res) => {
  try {
    const unraidManager = req.app.locals.unraidManager;
    unraidManager.unsubscribe(req.params.instanceId);
    
    res.json({ success: true, instanceId: req.params.instanceId });
  } catch (error) {
    console.error('Unraid unsubscribe error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
