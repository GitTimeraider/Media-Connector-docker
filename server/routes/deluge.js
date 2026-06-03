const express = require('express');
const router = express.Router();
const ApiClient = require('../utils/apiClient');
const configManager = require('../config/services');
const axios = require('axios');

async function getDelugeSessionCookie(instance) {
  const authResponse = await axios.post(`${instance.url}/json`, {
    method: 'auth.login',
    params: [instance.password],
    id: 1
  }, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 10000
  });

  const cookies = authResponse.headers['set-cookie'];
  return cookies ? cookies[0].split(';')[0] : '';
}

async function callDelugeRpc(instance, sessionCookie, method, params = [], id = 2) {
  const response = await axios.post(`${instance.url}/json`, {
    method,
    params,
    id
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookie
    },
    timeout: 30000
  });

  return response.data;
}

router.get('/instances', async (req, res) => {
  const instances = await configManager.getServices('deluge');
  res.json(instances);
});

router.get('/status/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('deluge');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

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

router.get('/queue/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('deluge');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const sessionCookie = await getDelugeSessionCookie(instance);

    const response = await callDelugeRpc(instance, sessionCookie, 'core.get_torrents_status', [{}, [
      'name',
      'state',
      'progress',
      'total_size',
      'eta',
      'download_payload_rate'
    ]]);

    res.json({ torrents: response?.result || {} });
  } catch (error) {
    res.status(500).json({ error: error.message, detail: error.response?.data ?? null });
  }
});

router.post('/pause/:instanceId/:torrentId', async (req, res) => {
  try {
    const instances = await configManager.getServices('deluge');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const sessionCookie = await getDelugeSessionCookie(instance);
    const response = await callDelugeRpc(instance, sessionCookie, 'core.pause_torrent', [[req.params.torrentId]]);

    res.json({ success: true, data: response });
  } catch (error) {
    res.status(500).json({ error: error.message, detail: error.response?.data ?? null });
  }
});

router.post('/resume/:instanceId/:torrentId', async (req, res) => {
  try {
    const instances = await configManager.getServices('deluge');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const sessionCookie = await getDelugeSessionCookie(instance);
    const response = await callDelugeRpc(instance, sessionCookie, 'core.resume_torrent', [[req.params.torrentId]]);

    res.json({ success: true, data: response });
  } catch (error) {
    res.status(500).json({ error: error.message, detail: error.response?.data ?? null });
  }
});

router.delete('/torrent/:instanceId/:torrentId', async (req, res) => {
  try {
    const instances = await configManager.getServices('deluge');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const removeData = String(req.query.removeData || 'false').toLowerCase() === 'true';
    const sessionCookie = await getDelugeSessionCookie(instance);
    const response = await callDelugeRpc(
      instance,
      sessionCookie,
      'core.remove_torrent',
      [req.params.torrentId, removeData]
    );

    res.json({ success: true, data: response });
  } catch (error) {
    res.status(500).json({ error: error.message, detail: error.response?.data ?? null });
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
    
    // Authenticate first to get session
    const sessionCookie = await getDelugeSessionCookie(instance);

    // Fetch torrent data from whatever source the URL points to
    let torrentData = null;
    let magnetUrl = null;
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

      // Fetch the torrent file — disable auto-redirect so magnet: redirects can be caught
      const fileResponse = await axios.get(originalUrl, {
        headers: { 'X-Api-Key': prowlarrInstance.apiKey },
        responseType: 'arraybuffer',
        maxRedirects: 0,
        validateStatus: s => s < 400,
        timeout: 30000
      });

      if (fileResponse.status >= 300) {
        // Redirect — common when indexer only provides a magnet link
        const location = fileResponse.headers['location'] || '';
        if (location.startsWith('magnet:')) {
          magnetUrl = location;
        } else {
          return res.status(502).json({ error: 'Unexpected redirect from Prowlarr: ' + location });
        }
      } else {
        // Extract filename from Content-Disposition header or URL
        const contentDisposition = fileResponse.headers['content-disposition'];
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
          if (filenameMatch) filename = filenameMatch[1];
        } else {
          const urlMatch = originalUrl.match(/[?&]file=([^&]+)/);
          if (urlMatch) {
            filename = decodeURIComponent(urlMatch[1]);
            if (!filename.endsWith('.torrent')) filename += '.torrent';
          }
        }
        torrentData = Buffer.from(fileResponse.data).toString('base64');
      }
    } else if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      // Raw HTTP Prowlarr URL — validate and fetch directly
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
      const rawFileResponse = await axios.get(url, {
        headers: { 'X-Api-Key': matchedProwlarr.apiKey },
        responseType: 'arraybuffer',
        maxRedirects: 0,
        validateStatus: s => s < 400,
        timeout: 30000
      });
      if (rawFileResponse.status >= 300) {
        const location = rawFileResponse.headers['location'] || '';
        if (location.startsWith('magnet:')) {
          magnetUrl = location;
        } else {
          return res.status(502).json({ error: 'Unexpected redirect from Prowlarr: ' + location });
        }
      } else {
        const rawFilenameMatch = url.match(/[?&]file=([^&]+)/);
        const rawFilename = rawFilenameMatch ? decodeURIComponent(rawFilenameMatch[1]) : 'download.torrent';
        filename = rawFilename.endsWith('.torrent') ? rawFilename : rawFilename + '.torrent';
        torrentData = Buffer.from(rawFileResponse.data).toString('base64');
      }
    } else if (url && url.startsWith('magnet:')) {
      magnetUrl = url;
    }

    // Add torrent to Deluge
    let addResponse;
    if (torrentData) {
      addResponse = await axios.post(`${instance.url}/json`, {
        method: 'core.add_torrent_file',
        params: [filename, torrentData, {}],
        id: 2
      }, {
        headers: { 'Content-Type': 'application/json', 'Cookie': sessionCookie }
      });
    } else if (magnetUrl) {
      addResponse = await axios.post(`${instance.url}/json`, {
        method: 'core.add_torrent_magnet',
        params: [magnetUrl, {}],
        id: 2
      }, {
        headers: { 'Content-Type': 'application/json', 'Cookie': sessionCookie }
      });
    } else {
      return res.status(400).json({ error: 'No torrent data could be resolved from the provided URL' });
    }

    res.json({ success: true, data: addResponse.data });
  } catch (error) {
    console.error('[deluge /add] Error:', error.message, error.response?.data || '');
    res.status(500).json({ error: error.message, detail: error.response?.data ?? null });
  }
});

module.exports = router;
