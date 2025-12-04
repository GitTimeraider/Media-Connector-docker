const rateLimit = require('express-rate-limit');

// Common rate limiter config for apps behind reverse proxy
const commonConfig = {
  standardHeaders: true,
  legacyHeaders: false,
  // Validate that we're using the correct IP from X-Forwarded-For when behind proxy
  validate: { trustProxy: false }, // Disable validation warnings since we've explicitly configured trust proxy
};

// General API rate limiter - 1000 requests per minute (allows bulk requests and rapid SPA navigation)
const apiLimiter = rateLimit({
  ...commonConfig,
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000,
  message: 'Too many requests from this IP, please try again later.',
});

// Health check rate limiter - 60 requests per minute
const healthLimiter = rateLimit({
  ...commonConfig,
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60,
  message: 'Too many health check requests.',
});

// Strict rate limiter for auth endpoints - 5 requests per 15 minutes
const authLimiter = rateLimit({
  ...commonConfig,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: 'Too many authentication attempts, please try again later.',
  skipSuccessfulRequests: true, // Don't count successful logins
});

// Moderate rate limiter for registration - 3 per hour
const registrationLimiter = rateLimit({
  ...commonConfig,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: 'Too many accounts created from this IP, please try again later.',
});

// Export all rate limiters
module.exports = {
  apiLimiter,
  authLimiter,
  registrationLimiter,
  healthLimiter
};
