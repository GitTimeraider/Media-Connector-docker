const axios = require('axios');

class ApiClient {
  constructor(baseURL, apiKey, options = {}) {
    this.client = axios.create({
      baseURL,
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

  async get(endpoint, params = {}) {
    const response = await this.client.get(endpoint, { params });
    return response.data;
  }

  async post(endpoint, data = {}) {
    const response = await this.client.post(endpoint, data);
    return response.data;
  }

  async put(endpoint, data = {}) {
    const response = await this.client.put(endpoint, data);
    return response.data;
  }

  async delete(endpoint) {
    const response = await this.client.delete(endpoint);
    return response.data;
  }
}

module.exports = ApiClient;
