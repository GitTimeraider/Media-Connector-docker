const axios = require('axios');
const urlValidator = require('./urlValidator');

class ApiClient {
  constructor(baseURL, apiKey, options = {}) {
    // Validate baseURL for SSRF protection
    const validation = urlValidator.validateServiceUrl(baseURL);
    if (!validation.valid) {
      throw new Error(`Invalid baseURL: ${validation.error}`);
    }

    // Use the validated URL object's href to ensure it's safe
    // This converts the URL object back to a string that axios can use
    // SAFE: This URL has been validated by urlValidator.validateServiceUrl()
    // which checks for: valid protocol (http/https), no suspicious patterns,
    // and optionally blocks private IPs (configurable for internal services)
    const safeBaseURL = validation.url.href;
    
    this.baseURL = safeBaseURL;
    // Create axios instance with validated baseURL
    // All requests will be made to: <safeBaseURL><validated-relative-endpoint>
    this.client = axios.create({
      baseURL: safeBaseURL,
      timeout: options.timeout || 30000,
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      config => {
        console.log(`API Request: ${config.method.toUpperCase()} ${config.url}`);
        return config;
      },
      error => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      response => response,
      error => {
        if (error.response) {
          console.error(`API Error: ${error.response.status} - ${error.response.statusText}`);
        } else if (error.request) {
          console.error('API Error: No response received');
        } else {
          console.error('API Error:', error.message);
        }
        return Promise.reject(error);
      }
    );
  }

  // Validate endpoint to prevent SSRF - must be relative path
  validateEndpoint(endpoint) {
    if (!endpoint.startsWith('/')) {
      throw new Error('Endpoint must be a relative path starting with /');
    }
    // Prevent absolute URLs or protocol-relative URLs
    if (endpoint.includes('://') || endpoint.startsWith('//')) {
      throw new Error('Endpoint cannot contain absolute URLs');
    }
    return endpoint;
  }

  // Build safe URL by combining validated base and validated endpoint
  buildSafeUrl(endpoint) {
    const validatedEndpoint = this.validateEndpoint(endpoint);
    // Use URL constructor to safely combine base and endpoint
    // This prevents SSRF by ensuring the endpoint can't override the base
    const safeUrl = new URL(validatedEndpoint, this.baseURL);
    return safeUrl.toString();
  }

  async get(endpoint, params = {}) {
    // Build complete URL using URL constructor for safety
    const fullUrl = this.buildSafeUrl(endpoint);
    const response = await this.client.get(fullUrl, { params });
    return response.data;
  }

  async post(endpoint, data = {}) {
    // Build complete URL using URL constructor for safety
    const fullUrl = this.buildSafeUrl(endpoint);
    const response = await this.client.post(fullUrl, data);
    return response.data;
  }

  async put(endpoint, data = {}) {
    // Build complete URL using URL constructor for safety
    const fullUrl = this.buildSafeUrl(endpoint);
    const response = await this.client.put(fullUrl, data);
    return response.data;
  }

  async delete(endpoint) {
    // Build complete URL using URL constructor for safety
    const fullUrl = this.buildSafeUrl(endpoint);
    const response = await this.client.delete(fullUrl);
    return response.data;
  }
}

module.exports = ApiClient;
