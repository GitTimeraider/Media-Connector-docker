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
      // Debug: log image fields for the first result to help diagnose
      if (response.data.indexOf(result) === 0) {
        console.log('[Prowlarr search] First result image fields:', {
          posterUrl: result.posterUrl,
          cover: result.cover,
          coverUrl: result.coverUrl,
          bannerUrl: result.bannerUrl,
          tmdbId: result.tmdbId,
          imdbId: result.imdbId
        });
      }
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
      
      // Always proxy cover images through the backend:
      // - Prowlarr-internal URLs (Docker service names, private IPs) can only be
      //   reached by the server, not the browser.
      // - External CDN URLs are proxied too so the browser only ever talks to us.
      const makeProxyImageUrl = (url) =>
        `/api/prowlarr/image/${req.params.instanceId}?url=${encodeURIComponent(url)}`;

      const resolveImageUrl = (url) => {
        if (!url) return null;
        // Handle relative URLs (e.g. /api/v1/mediacover/123/poster.jpg) by
        // prepending the configured Prowlarr instance base URL.
        let absoluteUrl = url;
        if (url.startsWith('/') || (!url.startsWith('http://') && !url.startsWith('https://'))) {
          try {
            absoluteUrl = new URL(url, instance.url).toString();
          } catch {
            return null;
          }
        } else {
          try { new URL(url); } catch { return null; }
        }
        return makeProxyImageUrl(absoluteUrl);
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

    // -----------------------------------------------------------------------
    // TMDB fallback: for results still missing a cover image, attempt to fetch
    // a poster via TMDB using tmdbId, imdbId, or tvdbId.
    // Movie categories: 2000–2999. TV categories: 5000–5999. Everything else
    // tries movie first, then TV.
    // We cap at 30 lookups (prioritising results that already have an ID) to
    // keep the response time acceptable.
    // -----------------------------------------------------------------------
    const TMDB_API_KEY = process.env.TMDB_API_KEY;
    const TMDB_BASE = 'https://api.themoviedb.org/3';

    if (TMDB_API_KEY) {
      const needsImage = enrichedResults
        .map((r, i) => ({ r, i }))
        .filter(({ r }) => !r.coverUrl && (r.tmdbId || r.imdbId || r.tvdbId))
        .slice(0, 30); // cap concurrent lookups

      const getPosterPath = async ({ r }) => {
        const firstCatId = Array.isArray(r.categories)
          ? Number(r.categories[0]?.id ?? r.categories[0] ?? 0)
          : Number(r.categories ?? 0);
        const isMovie = firstCatId >= 2000 && firstCatId < 3000;
        const isTV    = firstCatId >= 5000 && firstCatId < 6000;

        try {
          // 1. Direct TMDB ID lookup
          if (r.tmdbId) {
            const type = isTV ? 'tv' : 'movie';
            const res1 = await axios.get(`${TMDB_BASE}/${type}/${r.tmdbId}`, {
              params: { api_key: TMDB_API_KEY },
              timeout: 8000
            });
            if (res1.data.poster_path) return res1.data.poster_path;
            // If the type guess was wrong, try the other
            if (!isMovie && !isTV) {
              const alt = type === 'movie' ? 'tv' : 'movie';
              const res2 = await axios.get(`${TMDB_BASE}/${alt}/${r.tmdbId}`, {
                params: { api_key: TMDB_API_KEY },
                timeout: 8000
              });
              if (res2.data.poster_path) return res2.data.poster_path;
            }
          }

          // 2. IMDB ID lookup via /find
          if (r.imdbId) {
            const imdbStr = String(r.imdbId).startsWith('tt') ? r.imdbId : `tt${String(r.imdbId).padStart(7, '0')}`;
            const res3 = await axios.get(`${TMDB_BASE}/find/${imdbStr}`, {
              params: { api_key: TMDB_API_KEY, external_source: 'imdb_id' },
              timeout: 8000
            });
            const hit =
              res3.data.movie_results?.[0] ||
              res3.data.tv_results?.[0] ||
              res3.data.tv_episode_results?.[0];
            if (hit?.poster_path) return hit.poster_path;
          }

          // 3. TVDB ID lookup via /find
          if (r.tvdbId) {
            const res4 = await axios.get(`${TMDB_BASE}/find/${r.tvdbId}`, {
              params: { api_key: TMDB_API_KEY, external_source: 'tvdb_id' },
              timeout: 8000
            });
            const hit2 = res4.data.tv_results?.[0] || res4.data.movie_results?.[0];
            if (hit2?.poster_path) return hit2.poster_path;
          }
        } catch {
          // Silently ignore TMDB errors — images are best-effort
        }
        return null;
      };

      const lookupResults = await Promise.allSettled(needsImage.map(getPosterPath));

      lookupResults.forEach((outcome, idx) => {
        if (outcome.status === 'fulfilled' && outcome.value) {
          const posterPath = outcome.value;
          const imageUrl = `https://image.tmdb.org/t/p/w300${posterPath}`;
          enrichedResults[needsImage[idx].i].coverUrl = imageUrl;
        }
      });
    }
    // -----------------------------------------------------------------------

    // -----------------------------------------------------------------------
    // Indexer page scrape fallback: for results still missing a cover, fetch
    // the infoUrl page and extract og:image / twitter:image / first <img>.
    // This catches thumbnails on adult/niche indexer pages that have no
    // TMDB/IMDB/TVDB IDs.
    // -----------------------------------------------------------------------
    const stillNeedsImage = enrichedResults
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => !r.coverUrl && r.infoUrl)
      .slice(0, 30);

    if (stillNeedsImage.length > 0) {
      const scrapeImage = async (url) => {
        try {
          const pageRes = await axios.get(url, {
            timeout: 8000,
            maxContentLength: 512 * 1024, // 512 KB — enough for any <head>
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml',
            },
            // Only follow a small number of redirects
            maxRedirects: 3,
          });

          const html = typeof pageRes.data === 'string' ? pageRes.data : '';

          // 1. og:image
          const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
                       || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
          if (ogMatch?.[1]) return ogMatch[1];

          // 2. twitter:image
          const twMatch = html.match(/<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i)
                       || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/i);
          if (twMatch?.[1]) return twMatch[1];

          // 3. First <img> with a reasonable src (skip tiny icons / tracking pixels)
          const imgMatches = [...html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)];
          for (const m of imgMatches) {
            const src = m[1];
            // Skip data URIs, very short paths (icons), and common tracker patterns
            if (src.startsWith('data:')) continue;
            if (src.length < 10) continue;
            if (/\/(icon|logo|favicon|pixel|tracker|spacer|blank|clear|1x1)/i.test(src)) continue;
            // Prefer paths that look like images
            return src;
          }
        } catch {
          // Silently skip failed scrapes
        }
        return null;
      };

      const scrapeResults = await Promise.allSettled(
        stillNeedsImage.map(({ r }) => scrapeImage(r.infoUrl))
      );

      scrapeResults.forEach((outcome, idx) => {
        if (outcome.status === 'fulfilled' && outcome.value) {
          let imageUrl = outcome.value;
          // Resolve relative URLs against the infoUrl origin
          if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
            try {
              imageUrl = new URL(imageUrl, stillNeedsImage[idx].r.infoUrl).toString();
            } catch {
              return;
            }
          }
          enrichedResults[stillNeedsImage[idx].i].coverUrl = imageUrl;
        }
      });
    }
    // -----------------------------------------------------------------------

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

    // SSRF protection: allow URLs that either belong to the configured Prowlarr
    // instance (including Docker-internal hostnames / private IPs) or are on
    // publicly-routable addresses. Hard-block loopback and RFC-1918 ranges that
    // are NOT the configured instance.
    let parsedUrl, baseUrl;
    try {
      parsedUrl = new URL(url);
      baseUrl = new URL(instance.url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL' });
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return res.status(400).json({ error: 'Only http/https URLs are supported' });
    }

    const isInstanceUrl =
      parsedUrl.hostname.toLowerCase() === baseUrl.hostname.toLowerCase() &&
      parsedUrl.port === baseUrl.port;

    if (!isInstanceUrl) {
      // Block loopback and private IP ranges to prevent SSRF on non-instance URLs
      const h = parsedUrl.hostname.toLowerCase();
      const blocked = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];
      if (
        blocked.includes(h) ||
        /^10\./.test(h) ||
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(h) ||
        /^192\.168\./.test(h)
      ) {
        return res.status(403).json({ error: 'Private/loopback URLs are not allowed for non-instance images' });
      }
    }

    const axios = require('axios');
    const headers = {};
    // Only send the API key when fetching from the configured Prowlarr instance
    if (isInstanceUrl) headers['X-Api-Key'] = instance.apiKey;

    const response = await axios.get(url, {
      headers,
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
