const { URL } = require('url');

/**
 * Validates URLs to prevent Server-Side Request Forgery (SSRF) attacks
 */
class UrlValidator {
  constructor() {
    // Blocked IP ranges (private networks, loopback, link-local, etc.)
    this.blockedCIDRs = [
      { start: this.ipToLong('10.0.0.0'), end: this.ipToLong('10.255.255.255') },
      { start: this.ipToLong('172.16.0.0'), end: this.ipToLong('172.31.255.255') },
      { start: this.ipToLong('192.168.0.0'), end: this.ipToLong('192.168.255.255') },
      { start: this.ipToLong('127.0.0.0'), end: this.ipToLong('127.255.255.255') },
      { start: this.ipToLong('169.254.0.0'), end: this.ipToLong('169.254.255.255') },
      { start: this.ipToLong('0.0.0.0'), end: this.ipToLong('0.255.255.255') },
    ];

    // Allowed protocols
    this.allowedProtocols = ['http:', 'https:'];
  }

  ipToLong(ip) {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
  }

  isPrivateIP(hostname) {
    // Check if it's an IP address
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(hostname)) {
      return false; // Not an IP, will be resolved by DNS
    }

    const ipLong = this.ipToLong(hostname);
    return this.blockedCIDRs.some(range => ipLong >= range.start && ipLong <= range.end);
  }

  /**
   * Validates a URL for SSRF prevention
   * @param {string} urlString - The URL to validate
   * @param {object} options - Validation options
   * @param {boolean} options.allowPrivateIPs - Allow private IPs (default: false for external, true for configured services)
   * @returns {object} { valid: boolean, url: URL|null, error: string|null }
   */
  validate(urlString, options = {}) {
    const { allowPrivateIPs = false } = options;

    try {
      const url = new URL(urlString);

      // Check protocol
      if (!this.allowedProtocols.includes(url.protocol)) {
        return {
          valid: false,
          url: null,
          error: `Protocol ${url.protocol} is not allowed. Only HTTP and HTTPS are permitted.`
        };
      }

      // Check for SSRF attacks using IP addresses
      if (!allowPrivateIPs && this.isPrivateIP(url.hostname)) {
        return {
          valid: false,
          url: null,
          error: 'Access to private IP addresses is not allowed.'
        };
      }

      // Check for suspicious hostnames
      const suspiciousPatterns = [
        /localhost/i,
        /127\.0\.0\.1/,
        /0\.0\.0\.0/,
        /\[::\]/,
        /\[::1\]/
      ];

      if (!allowPrivateIPs && suspiciousPatterns.some(pattern => pattern.test(url.hostname))) {
        return {
          valid: false,
          url: null,
          error: 'Access to localhost or loopback addresses is not allowed.'
        };
      }

      return {
        valid: true,
        url,
        error: null
      };
    } catch (error) {
      return {
        valid: false,
        url: null,
        error: `Invalid URL: ${error.message}`
      };
    }
  }

  /**
   * Validates URLs from user-configured services (more permissive)
   * Allows private IPs since services are typically on local networks
   */
  validateServiceUrl(urlString) {
    return this.validate(urlString, { allowPrivateIPs: true });
  }

  /**
   * Validates URLs from external user input (strict)
   * Does not allow private IPs
   */
  validateExternalUrl(urlString) {
    return this.validate(urlString, { allowPrivateIPs: false });
  }
}

module.exports = new UrlValidator();
