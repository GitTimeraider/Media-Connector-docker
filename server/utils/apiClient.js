const axios = require('axios');
const urlValidator = require('./urlValidator');

/**
 * Sanitizes a URL by reconstructing it from a validated URL object.
 * @param {URL} urlObject - A validated URL object
 * @returns {string} A sanitized URL string
 */
function sanitizeUrl(urlObject) {
  const safeProtocol = String(urlObject.protocol);
  const safeHostname = String(urlObject.hostname);
  const safePort = urlObject.port ? String(urlObject.port) : '';
  const safePathname = String(urlObject.pathname);
  const safeSearch = String(urlObject.search);
  
  const portPart = safePort ? ':' + safePort : '';
  return safeProtocol + '//' + safeHostname + portPart + safePathname + safeSearch;
}

/**
 * Validates that a value is a safe ID (numeric only for Radarr/Sonarr IDs).
 * @param {string|number} id - The ID to validate
 * @returns {string} The validated ID as a string
 */
function validateId(id) {
  const idStr = String(id);
  // Only allow numeric IDs for maximum safety
  if (!/^\d+$/.test(idStr)) {
    throw new Error('Invalid ID format - must be numeric');
  }
  return idStr;
}

/**
 * Validates query parameter values.
 * @param {string} value - The value to validate
 * @returns {string} The validated value
 */
function validateQueryValue(value) {
  const str = String(value);
  if (/[<>"'`;\\]/.test(str)) {
    throw new Error('Invalid query parameter value');
  }
  return str;
}

class ApiClient {
  constructor(baseURL, apiKey, options = {}) {
    // Validate baseURL for SSRF protection
    const validation = urlValidator.validateServiceUrl(baseURL);
    if (!validation.valid) {
      throw new Error('Invalid baseURL: ' + validation.error);
    }

    // Store the validated base as a sanitized string (without trailing slash)
    let sanitized = sanitizeUrl(validation.url);
    this.baseUrlString = sanitized.endsWith('/') ? sanitized.slice(0, -1) : sanitized;
    this.apiKey = apiKey;
    this.timeout = options.timeout || 30000;
    this.customHeaders = options.headers || {};
  }

  // Build request config with all necessary options
  buildRequestConfig(params = {}) {
    const safeParams = {};
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        safeParams[key] = validateQueryValue(value);
      }
    }
    return {
      timeout: this.timeout,
      headers: {
        'X-Api-Key': this.apiKey,
        'Content-Type': 'application/json',
        ...this.customHeaders
      },
      params: safeParams
    };
  }

  // ============================================
  // V3 API Methods (Radarr/Sonarr)
  // Each method uses a hardcoded path - no user input in URL
  // ============================================

  async getSystemStatus(params = {}) {
    const config = this.buildRequestConfig(params);
    const response = await axios.get(this.baseUrlString + '/api/v3/system/status', config);
    return response.data;
  }

  async getQueue(params = {}) {
    const config = this.buildRequestConfig(params);
    const response = await axios.get(this.baseUrlString + '/api/v3/queue', config);
    return response.data;
  }

  async getCalendar(params = {}) {
    const config = this.buildRequestConfig(params);
    const response = await axios.get(this.baseUrlString + '/api/v3/calendar', config);
    return response.data;
  }

  async getMovies(params = {}) {
    const config = this.buildRequestConfig(params);
    const response = await axios.get(this.baseUrlString + '/api/v3/movie', config);
    return response.data;
  }

  async getMovieById(id, params = {}) {
    const safeId = validateId(id);
    const config = this.buildRequestConfig(params);
    const response = await axios.get(this.baseUrlString + '/api/v3/movie/' + safeId, config);
    return response.data;
  }

  async searchMovies(params = {}) {
    const config = this.buildRequestConfig(params);
    const response = await axios.get(this.baseUrlString + '/api/v3/movie/lookup', config);
    return response.data;
  }

  async addMovie(data) {
    const config = this.buildRequestConfig();
    const response = await axios.post(this.baseUrlString + '/api/v3/movie', data, config);
    return response.data;
  }

  async updateMovie(id, data) {
    const safeId = validateId(id);
    const config = this.buildRequestConfig();
    const response = await axios.put(this.baseUrlString + '/api/v3/movie/' + safeId, data, config);
    return response.data;
  }

  async deleteMovie(id, params = {}) {
    const safeId = validateId(id);
    const config = this.buildRequestConfig(params);
    const response = await axios.delete(this.baseUrlString + '/api/v3/movie/' + safeId, config);
    return response.data;
  }

  async getSeries(params = {}) {
    const config = this.buildRequestConfig(params);
    const response = await axios.get(this.baseUrlString + '/api/v3/series', config);
    return response.data;
  }

  async getSeriesById(id, params = {}) {
    const safeId = validateId(id);
    const config = this.buildRequestConfig(params);
    const response = await axios.get(this.baseUrlString + '/api/v3/series/' + safeId, config);
    return response.data;
  }

  async searchSeries(params = {}) {
    const config = this.buildRequestConfig(params);
    const response = await axios.get(this.baseUrlString + '/api/v3/series/lookup', config);
    return response.data;
  }

  async addSeries(data) {
    const config = this.buildRequestConfig();
    const response = await axios.post(this.baseUrlString + '/api/v3/series', data, config);
    return response.data;
  }

  async updateSeries(id, data) {
    const safeId = validateId(id);
    const config = this.buildRequestConfig();
    const response = await axios.put(this.baseUrlString + '/api/v3/series/' + safeId, data, config);
    return response.data;
  }

  async deleteSeries(id, params = {}) {
    const safeId = validateId(id);
    const config = this.buildRequestConfig(params);
    const response = await axios.delete(this.baseUrlString + '/api/v3/series/' + safeId, config);
    return response.data;
  }

  async getHistory(params = {}) {
    const config = this.buildRequestConfig(params);
    const response = await axios.get(this.baseUrlString + '/api/v3/history', config);
    return response.data;
  }

  async postCommand(data) {
    const config = this.buildRequestConfig();
    const response = await axios.post(this.baseUrlString + '/api/v3/command', data, config);
    return response.data;
  }

  async getQualityProfiles(params = {}) {
    const config = this.buildRequestConfig(params);
    const response = await axios.get(this.baseUrlString + '/api/v3/qualityprofile', config);
    return response.data;
  }

  async getRootFolders(params = {}) {
    const config = this.buildRequestConfig(params);
    const response = await axios.get(this.baseUrlString + '/api/v3/rootfolder', config);
    return response.data;
  }

  async getTags(params = {}) {
    const config = this.buildRequestConfig(params);
    const response = await axios.get(this.baseUrlString + '/api/v3/tag', config);
    return response.data;
  }

  // ============================================
  // V1 API Methods (Prowlarr)
  // ============================================

  async getV1SystemStatus(params = {}) {
    const config = this.buildRequestConfig(params);
    const response = await axios.get(this.baseUrlString + '/api/v1/system/status', config);
    return response.data;
  }

  async getIndexers(params = {}) {
    const config = this.buildRequestConfig(params);
    const response = await axios.get(this.baseUrlString + '/api/v1/indexer', config);
    return response.data;
  }
}

module.exports = ApiClient;
