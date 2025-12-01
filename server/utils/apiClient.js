const axios = require('axios');
const urlValidator = require('./urlValidator');

/**
 * Allowlist of valid API endpoints.
 * All endpoints must be defined here - no dynamic paths allowed.
 * This prevents SSRF by ensuring only known, safe paths can be requested.
 */
const ALLOWED_ENDPOINTS = {
  // Radarr/Sonarr v3 API endpoints
  'v3/system/status': '/api/v3/system/status',
  'v3/queue': '/api/v3/queue',
  'v3/calendar': '/api/v3/calendar',
  'v3/movie': '/api/v3/movie',
  'v3/movie/lookup': '/api/v3/movie/lookup',
  'v3/series': '/api/v3/series',
  'v3/series/lookup': '/api/v3/series/lookup',
  'v3/history': '/api/v3/history',
  'v3/command': '/api/v3/command',
  'v3/qualityprofile': '/api/v3/qualityprofile',
  'v3/rootfolder': '/api/v3/rootfolder',
  'v3/tag': '/api/v3/tag',
  
  // Prowlarr v1 API endpoints
  'v1/system/status': '/api/v1/system/status',
  'v1/indexer': '/api/v1/indexer',
  'v1/search': '/api/v1/search'
};

/**
 * Gets a safe endpoint path from the allowlist.
 * @param {string} key - The endpoint key (e.g., 'v3/movie')
 * @returns {string} The safe endpoint path
 * @throws {Error} If the endpoint is not in the allowlist
 */
function getSafeEndpoint(key) {
  const endpoint = ALLOWED_ENDPOINTS[key];
  if (!endpoint) {
    throw new Error('Endpoint not in allowlist: ' + key);
  }
  return endpoint;
}

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

/**
 * Gets the base URL without trailing slash.
 * @param {string} baseUrlString - The base URL
 * @returns {string} Base URL without trailing slash
 */
function getBaseUrl(baseUrlString) {
  return baseUrlString.endsWith('/') 
    ? baseUrlString.slice(0, -1) 
    : baseUrlString;
}

class ApiClient {
  constructor(baseURL, apiKey, options = {}) {
    // Validate baseURL for SSRF protection
    const validation = urlValidator.validateServiceUrl(baseURL);
    if (!validation.valid) {
      throw new Error('Invalid baseURL: ' + validation.error);
    }

    // Store the validated base as a sanitized string
    this.baseUrlString = sanitizeUrl(validation.url);
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

  /**
   * Makes a GET request using an allowlisted endpoint key.
   * @param {string} endpointKey - Key from ALLOWED_ENDPOINTS (e.g., 'v3/movie')
   * @param {Object} params - Query parameters
   */
  async get(endpointKey, params = {}) {
    const safePath = getSafeEndpoint(endpointKey);
    const baseUrl = getBaseUrl(this.baseUrlString);
    const config = this.buildRequestConfig(params);
    const response = await axios.get(baseUrl + safePath, config);
    return response.data;
  }

  /**
   * Makes a GET request with an ID appended to an allowlisted endpoint.
   * @param {string} endpointKey - Key from ALLOWED_ENDPOINTS
   * @param {string|number} id - The resource ID (validated to be numeric)
   * @param {Object} params - Query parameters
   */
  async getById(endpointKey, id, params = {}) {
    const safePath = getSafeEndpoint(endpointKey);
    const safeId = validateId(id);
    const baseUrl = getBaseUrl(this.baseUrlString);
    const config = this.buildRequestConfig(params);
    const response = await axios.get(baseUrl + safePath + '/' + safeId, config);
    return response.data;
  }

  /**
   * Makes a POST request using an allowlisted endpoint key.
   * @param {string} endpointKey - Key from ALLOWED_ENDPOINTS
   * @param {Object} data - Request body
   */
  async post(endpointKey, data = {}) {
    const safePath = getSafeEndpoint(endpointKey);
    const baseUrl = getBaseUrl(this.baseUrlString);
    const config = this.buildRequestConfig();
    const response = await axios.post(baseUrl + safePath, data, config);
    return response.data;
  }

  /**
   * Makes a PUT request with an ID appended to an allowlisted endpoint.
   * @param {string} endpointKey - Key from ALLOWED_ENDPOINTS
   * @param {string|number} id - The resource ID (validated to be numeric)
   * @param {Object} data - Request body
   */
  async putById(endpointKey, id, data = {}) {
    const safePath = getSafeEndpoint(endpointKey);
    const safeId = validateId(id);
    const baseUrl = getBaseUrl(this.baseUrlString);
    const config = this.buildRequestConfig();
    const response = await axios.put(baseUrl + safePath + '/' + safeId, data, config);
    return response.data;
  }

  /**
   * Makes a DELETE request with an ID appended to an allowlisted endpoint.
   * @param {string} endpointKey - Key from ALLOWED_ENDPOINTS
   * @param {string|number} id - The resource ID (validated to be numeric)
   * @param {Object} params - Query parameters
   */
  async deleteById(endpointKey, id, params = {}) {
    const safePath = getSafeEndpoint(endpointKey);
    const safeId = validateId(id);
    const baseUrl = getBaseUrl(this.baseUrlString);
    const config = this.buildRequestConfig(params);
    const response = await axios.delete(baseUrl + safePath + '/' + safeId, config);
    return response.data;
  }
}

module.exports = ApiClient;
