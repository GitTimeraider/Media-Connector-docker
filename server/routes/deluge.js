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
      if (urlParts.length < 2) {
        return res.status(400).json({ error: 'Malformed proxied download URL' });
      }
      const pathPart = urlParts[0];
      const queryPart = urlParts.slice(1).join('?');
      const prowlarrInstanceId = pathPart.split('/').pop();
      const urlParams = new URLSearchParams(queryPart);
      const originalUrl = urlParams.get('url');

      if (!prowlarrInstanceId || !originalUrl) {
        return res.status(400).json({ error: 'Missing Prowlarr instance ID or download URL' });
      }

      // Get Prowlarr instance config
      const prowlarrInstances = await configManager.getServices('prowlarr');
      const prowlarrInstance = prowlarrInstances.find(i => i.id === prowlarrInstanceId);
      if (!prowlarrInstance) {
        return res.status(404).json({ error: 'Prowlarr instance not found' });
      }

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
        responseType: 'arraybuffer',
        timeout: 30000
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

    // Add torrent by file data, magnet link, or error
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
    } else if (url && url.startsWith('magnet:')) {
      // Add magnet link directly — core.add_torrent_magnet accepts a URI string
      addResponse = await axios.post(`${instance.url}/json`, {
        method: 'core.add_torrent_magnet',
        params: [url, {}],
        id: 2
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionCookie
        }
      });
    } else if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      // Raw HTTP URL — find the matching Prowlarr instance by origin for SSRF protection
      const urlValidator = require('../utils/urlValidator');
      const validation = urlValidator.validateServiceUrl(url);
      if (!validation.valid) {
        return res.status(400).json({ error: 'Invalid download URL: ' + validation.error });
      }
      const prowlarrInstances = await configManager.getServices('prowlarr');
      const incomingOrigin = new URL(url).origin;
      const matchedProwlarr = prowlarrInstances.find(i => {
        try { return new URL(i.url).origin === incomingOrigin; } catch (e) { return false; }
      });
      if (!matchedProwlarr) {
        return res.status(400).json({ error: 'Download URL does not match any configured Prowlarr instance' });
      }
      const fileResponse = await axios.get(url, {
        headers: { 'X-Api-Key': matchedProwlarr.apiKey },
        responseType: 'arraybuffer',
        timeout: 30000
      });
      const rawFilenameMatch = url.match(/[?&]file=([^&]+)/);
      const rawFilename = rawFilenameMatch ? decodeURIComponent(rawFilenameMatch[1]) : 'download.torrent';
      filename = rawFilename.endsWith('.torrent') ? rawFilename : rawFilename + '.torrent';
      torrentData = Buffer.from(fileResponse.data).toString('base64');
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
      return res.status(400).json({ error: 'No torrent data could be resolved from the provided URL' });
    }

    res.json({ success: true, data: addResponse.data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
