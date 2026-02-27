const express = require('express');
const router = express.Router();
const ApiClient = require('../utils/apiClient');
const configManager = require('../config/services');

router.get('/instances', async (req, res) => {
  const instances = await configManager.getServices('prowlarr');
  res.json(instances);
});

router.get('/status/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('prowlarr');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const client = new ApiClient(instance.url, instance.apiKey);
    const system = await client.getV1SystemStatus();
    res.json({ system });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/indexers/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('prowlarr');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const client = new ApiClient(instance.url, instance.apiKey);
    const indexers = await client.getIndexers();
    res.json(indexers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/search/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('prowlarr');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const client = new ApiClient(instance.url, instance.apiKey);
    
    // Build query params with proper limits to get more results
    let queryString = `/api/v1/search?query=${encodeURIComponent(req.query.query)}&type=search`;
    
    // Add limit (default to 100 for more results, Prowlarr's max per request)
    const limit = req.query.limit || 100;
    queryString += `&limit=${limit}`;
    
    // Add offset for pagination if specified
    if (req.query.offset) {
      queryString += `&offset=${req.query.offset}`;
    }
    
    // Add categories if specified (comma-separated string)
    if (req.query.categories) {
      const categories = req.query.categories.split(',');
      categories.forEach(cat => {
        queryString += `&categories=${cat}`;
      });
    }
    
    // Make direct axios call with pre-formatted query string
    const axios = require('axios');
    const response = await axios.get(`${instance.url}${queryString}`, {
      headers: {
        'X-Api-Key': instance.apiKey
      },
      timeout: 60000
    });
    
    // Enrich results with category names
    const categoryMap = {
      1000: 'Console', 1010: 'Console/NDS', 1020: 'Console/PSP', 1030: 'Console/Wii',
      1040: 'Console/Xbox', 1050: 'Console/Xbox 360', 1060: 'Console/Wii U',
      1070: 'Console/Xbox One', 1080: 'Console/PS4',
      2000: 'Movies', 2010: 'Movies/Foreign', 2020: 'Movies/Other', 2030: 'Movies/SD',
      2040: 'Movies/HD', 2045: 'Movies/UHD', 2050: 'Movies/BluRay', 2060: 'Movies/3D',
      3000: 'Audio', 3010: 'Audio/MP3', 3020: 'Audio/Video', 3030: 'Audio/Audiobook',
      3040: 'Audio/Lossless', 3050: 'Audio/Other', 3060: 'Audio/Foreign',
      4000: 'PC', 4010: 'PC/0day', 4020: 'PC/ISO', 4030: 'PC/Mac',
      4040: 'PC/Mobile-Other', 4050: 'PC/Games', 4060: 'PC/Mobile-iOS', 4070: 'PC/Mobile-Android',
      5000: 'TV', 5010: 'TV/WEB-DL', 5020: 'TV/Foreign', 5030: 'TV/SD',
      5040: 'TV/HD', 5045: 'TV/UHD', 5050: 'TV/Other', 5060: 'TV/Sport',
      5070: 'TV/Anime', 5080: 'TV/Documentary',
      6000: 'XXX', 6010: 'XXX/DVD', 6020: 'XXX/WMV', 6030: 'XXX/XviD',
      6040: 'XXX/x264', 6050: 'XXX/Pack', 6060: 'XXX/ImgSet', 6070: 'XXX/Other',
      7000: 'Books', 7010: 'Books/Mags', 7020: 'Books/Ebook', 7030: 'Books/Comics',
      7040: 'Books/Technical', 7050: 'Books/Other', 7060: 'Books/Foreign',
      8000: 'Other', 8010: 'Other/Misc'
    };
    
    const enrichedResults = response.data.map(result => {
      // Handle both number and array of categories
      let categoryIds = [];
      if (Array.isArray(result.categories)) {
        // Extract numeric values from objects or convert directly
        categoryIds = result.categories.map(cat => {
          if (typeof cat === 'object' && cat !== null) {
            return Number(cat.id || cat.value || cat.categoryId || 0);
          }
          return Number(cat);
        }).filter(id => !isNaN(id) && id > 0);
      } else if (typeof result.categories === 'number') {
        categoryIds = [result.categories];
      } else if (typeof result.categories === 'object' && result.categories !== null) {
        const catId = Number(result.categories.id || result.categories.value || result.categories.categoryId || 0);
        if (!isNaN(catId) && catId > 0) {
          categoryIds = [catId];
        }
      }
      
      const categoryNames = categoryIds
        .map(catId => categoryMap[catId] || null)
        .filter(Boolean);
      
      // Ensure categoryDisplay is a string, not an object or array
      let categoryDisplay = 'Unknown';
      if (categoryNames.length > 0) {
        categoryDisplay = categoryNames.join(', ');
      } else if (categoryIds.length > 0) {
        // Fallback to showing IDs if no name found
        categoryDisplay = categoryIds.map(id => `Category ${id}`).join(', ');
      }
      
      // Replace internal Prowlarr URLs with proxied URLs that the backend can access
      let downloadUrl = result.downloadUrl;
      const originalDownloadUrl = result.downloadUrl;
      if (downloadUrl && !downloadUrl.startsWith('magnet:')) {
        // Encode the original download URL so it can be proxied through our backend
        downloadUrl = `/api/prowlarr/download/${req.params.instanceId}?url=${encodeURIComponent(originalDownloadUrl)}`;
      }
      
      // Helper: check if a URL belongs to the configured Prowlarr instance
      const isProwlarrInstanceUrl = (url) => {
        if (!url) return false;
        try {
          const parsedUrl = new URL(url);
          const baseUrl = new URL(instance.url);
          return (
            parsedUrl.protocol === baseUrl.protocol &&
            parsedUrl.hostname.toLowerCase() === baseUrl.hostname.toLowerCase() &&
            parsedUrl.port === baseUrl.port
          );
        } catch {
          return false;
        }
      };

      // Helper function to check if a URL is a safe public URL (for any image source,
      // including CDN/extensionless URLs from niche or adult indexers).
      // The browser's onError handler in Search.js hides images that fail to load.
      const isValidPublicImageUrl = (url) => {
        if (!url) return false;
        
        try {
          const parsedUrl = new URL(url);
          
          // Must be http/https
          if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') return false;
          
          const hostname = parsedUrl.hostname.toLowerCase();
          const path = parsedUrl.pathname;

          // Exclude clear download paths
          if (path.includes('/download')) return false;

          // Block loopback and private IP ranges (SSRF protection)
          const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];
          if (blockedHosts.includes(hostname)) return false;
          if (
            /^10\./.test(hostname) ||
            /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) ||
            /^192\.168\./.test(hostname)
          ) return false;

          // Accept any remaining public URL — covers extensionless CDN thumbnails,
          // adult/niche indexer artwork, etc. The frontend hides broken images via onError.
          return true;
        } catch (error) {
          return false;
        }
      };

      // Build a proxy URL for images that come from the Prowlarr instance itself
      const makeProxyImageUrl = (url) =>
        `/api/prowlarr/image/${req.params.instanceId}?url=${encodeURIComponent(url)}`;
      
      // Resolve cover URL: proxy Prowlarr-internal images, pass through public images
      const resolveImageUrl = (url) => {
        if (!url) return null;
        if (isProwlarrInstanceUrl(url)) return makeProxyImageUrl(url);
        if (isValidPublicImageUrl(url)) return url;
        return null;
      };

      let coverUrl =
        resolveImageUrl(result.posterUrl) ||
        resolveImageUrl(result.coverUrl) ||
        resolveImageUrl(result.cover) ||
        resolveImageUrl(result.bannerUrl) ||
        null;
      
      return {
        ...result,
        downloadUrl,
        categoryNames,
        categoryDisplay,
        coverUrl
      };
    });
    
    res.json(enrichedResults);
  } catch (error) {
    console.error('Prowlarr search error:', error.response?.data || error.message);
    res.status(500).json({ error: error.message, details: error.response?.data });
  }
});

// Download proxy endpoint - allows SABnzbd/Deluge to download from Prowlarr
router.get('/download/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('prowlarr');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL parameter required' });

    // Validate that the URL belongs to the configured Prowlarr instance (SSRF protection)
    const urlValidator = require('../utils/urlValidator');
    const validation = urlValidator.validateServiceUrl(url);
    if (!validation.valid) {
      return res.status(400).json({ error: 'Invalid download URL: ' + validation.error });
    }
    
    // Ensure the URL is from the configured Prowlarr instance to prevent SSRF
    // Use strict origin, hostname, and port comparison
    const prowlarrBaseUrl = new URL(instance.url);
    const downloadUrl = new URL(url);
    
    // Verify protocol matches
    if (downloadUrl.protocol !== prowlarrBaseUrl.protocol) {
      return res.status(400).json({ error: 'Download URL protocol does not match configured Prowlarr instance' });
    }
    
    // Verify hostname matches (case-insensitive)
    if (downloadUrl.hostname.toLowerCase() !== prowlarrBaseUrl.hostname.toLowerCase()) {
      return res.status(400).json({ error: 'Download URL hostname does not match configured Prowlarr instance' });
    }
    
    // Verify port matches
    if (downloadUrl.port !== prowlarrBaseUrl.port) {
      return res.status(400).json({ error: 'Download URL port does not match configured Prowlarr instance' });
    }

    const axios = require('axios');
    
    // Fetch the file from Prowlarr and stream it back
    // SSRF-safe: URL is validated to match configured Prowlarr instance origin above
    // lgtm[js/request-forgery]
    const response = await axios.get(url, {
      headers: {
        'X-Api-Key': instance.apiKey
      },
      responseType: 'stream',
      timeout: 30000
    });

    // Forward the content type and other relevant headers
    if (response.headers['content-type']) {
      res.setHeader('content-type', response.headers['content-type']);
    }
    if (response.headers['content-disposition']) {
      res.setHeader('content-disposition', response.headers['content-disposition']);
    }
    if (response.headers['content-length']) {
      res.setHeader('content-length', response.headers['content-length']);
    }

    // Stream the response
    response.data.pipe(res);
  } catch (error) {
    console.error('Prowlarr download proxy error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Image proxy endpoint - serves Prowlarr-internal cover/poster images to the browser
router.get('/image/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('prowlarr');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL parameter required' });

    // SSRF protection: only proxy URLs that belong to this Prowlarr instance
    let parsedUrl, baseUrl;
    try {
      parsedUrl = new URL(url);
      baseUrl = new URL(instance.url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL' });
    }

    if (
      parsedUrl.protocol !== baseUrl.protocol ||
      parsedUrl.hostname.toLowerCase() !== baseUrl.hostname.toLowerCase() ||
      parsedUrl.port !== baseUrl.port
    ) {
      return res.status(403).json({ error: 'URL does not belong to the configured Prowlarr instance' });
    }

    const axios = require('axios');
    const response = await axios.get(url, {
      headers: { 'X-Api-Key': instance.apiKey },
      responseType: 'stream',
      timeout: 15000
    });

    // Forward image content headers
    const contentType = response.headers['content-type'] || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    if (response.headers['content-length']) {
      res.setHeader('Content-Length', response.headers['content-length']);
    }

    response.data.pipe(res);
  } catch (error) {
    console.error('Prowlarr image proxy error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
