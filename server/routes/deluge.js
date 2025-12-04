const express = require('express');
const router = express.Router();
const ApiClient = require('../utils/apiClient');
const configManager = require('../config/services');

router.get('/instances', async (req, res) => {
  const instances = await configManager.getServices('deluge');
  res.json(instances);
});

router.get('/status/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('deluge');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const axios = require('axios');
    
    // Try to authenticate to check if service is online
    const authResponse = await axios.post(`${instance.url}/json`, {
      method: 'auth.check_session',
      params: [],
      id: 1
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000
    });

    res.json({ connected: true, authenticated: authResponse.data.result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/rpc/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('deluge');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const axios = require('axios');
    const result = await axios.post(`${instance.url}/json`, req.body, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': instance.password ? `_session_id=${instance.password}` : ''
      }
    });
    res.json(result.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Using GET to avoid reverse proxy POST blocking issues
router.get('/add/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('deluge');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    let { url } = req.query;
    
    const axios = require('axios');
    
    // Authenticate first to get session
    const authResponse = await axios.post(`${instance.url}/json`, {
      method: 'auth.login',
      params: [instance.password],
      id: 1
    }, {
      headers: { 'Content-Type': 'application/json' }
    });

    const cookies = authResponse.headers['set-cookie'];
    const sessionCookie = cookies ? cookies[0].split(';')[0] : '';

    // If URL is a proxied download path, fetch the torrent file first
    let torrentData = null;
    let filename = 'download.torrent';
    if (url && url.startsWith('/api/prowlarr/download/')) {
      // Extract the prowlarr instance ID and original URL using safer parsing
      const urlParts = url.split('?');
      if (urlParts.length === 2) {
        const pathPart = urlParts[0];
        const queryPart = urlParts[1];
        const prowlarrInstanceId = pathPart.split('/').pop();
        const urlParams = new URLSearchParams(queryPart);
        const originalUrl = urlParams.get('url');
        
        if (prowlarrInstanceId && originalUrl) {
          // Get Prowlarr instance config
          const prowlarrInstances = await configManager.getServices('prowlarr');
          const prowlarrInstance = prowlarrInstances.find(i => i.id === prowlarrInstanceId);
          
          if (prowlarrInstance) {
            // Validate that the URL belongs to the configured Prowlarr instance (SSRF protection)
            const urlValidator = require('../utils/urlValidator');
            const validation = urlValidator.validateServiceUrl(originalUrl);
            if (!validation.valid) {
              return res.status(400).json({ error: 'Invalid download URL: ' + validation.error });
            }
            
            // Ensure the URL is from the configured Prowlarr instance
            const prowlarrBaseUrl = new URL(prowlarrInstance.url);
            const downloadUrl = new URL(originalUrl);
            if (downloadUrl.origin !== prowlarrBaseUrl.origin) {
              return res.status(400).json({ error: 'Download URL does not match configured Prowlarr instance' });
            }
            
            // Fetch the torrent file content from Prowlarr
            const fileResponse = await axios.get(originalUrl, {
              headers: { 'X-Api-Key': prowlarrInstance.apiKey },
              responseType: 'arraybuffer'
            });
          
          // Extract filename from Content-Disposition header or URL
          const contentDisposition = fileResponse.headers['content-disposition'];
          if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
            if (filenameMatch) {
              filename = filenameMatch[1];
            }
          } else {
            // Try to extract from URL file parameter
            const urlMatch = originalUrl.match(/[?&]file=([^&]+)/);
            if (urlMatch) {
              filename = decodeURIComponent(urlMatch[1]);
              if (!filename.endsWith('.torrent')) {
                filename += '.torrent';
              }
            }
          }
          
          // Convert to base64 for Deluge
          torrentData = Buffer.from(fileResponse.data).toString('base64');
        }
      }
    }

    // Add torrent by file data or URL
    let addResponse;
    if (torrentData) {
      // Add by file data with proper filename
      addResponse = await axios.post(`${instance.url}/json`, {
        method: 'core.add_torrent_file',
        params: [filename, torrentData, {}],
        id: 2
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionCookie
        }
      });
    } else {
      // Add by URL (for magnet links)
      addResponse = await axios.post(`${instance.url}/json`, {
        method: 'web.add_torrents',
        params: [[{ path: url, options: {} }]],
        id: 2
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionCookie
        }
      });
    }

    res.json({ success: true, data: addResponse.data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
