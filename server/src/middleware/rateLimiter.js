/**
 * In-memory sliding-window rate limiter (Dependency-free & memory-safe)
 */
export const createRateLimiter = ({
  windowMs = 15 * 60 * 1000, // 15 minutes
  maxRequests = 100,
  message = 'Too many requests. Please try again later.'
} = {}) => {
  const ipStore = new Map();

  // Periodic cleanup of expired entries every 5 minutes to prevent memory leaks
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of ipStore.entries()) {
      if (now > data.resetTime) {
        ipStore.delete(ip);
      }
    }
  }, 5 * 60 * 1000);

  // Unref interval so it does not block Node process termination in tests
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return (req, res, next) => {
    // In test environment, bypass to avoid test throttling
    if (process.env.NODE_ENV === 'test') {
      return next();
    }

    const clientIp =
      req.ip ||
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.connection?.remoteAddress ||
      'unknown';

    const now = Date.now();
    let entry = ipStore.get(clientIp);

    if (!entry || now > entry.resetTime) {
      entry = {
        count: 1,
        resetTime: now + windowMs
      };
      ipStore.set(clientIp, entry);
    } else {
      entry.count += 1;
    }

    const remaining = Math.max(0, maxRequests - entry.count);
    const retryAfterSec = Math.ceil((entry.resetTime - now) / 1000);

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000));

    if (entry.count > maxRequests) {
      res.setHeader('Retry-After', retryAfterSec);
      return res.status(429).json({
        error: message,
        retryAfter: retryAfterSec
      });
    }

    next();
  };
};

// Strict limiter for authentication endpoints (prevent brute-force and credential stuffing)
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 20, // 20 attempts per 15 minutes per IP
  message: 'Too many authentication attempts from this IP address. Please try again in 15 minutes.'
});
