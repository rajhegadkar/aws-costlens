import { Request, Response, NextFunction } from 'express';

export interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
  message?: string;
}

interface ClientRateRecord {
  count: number;
  resetAt: number;
}

const activeStores: Map<string, ClientRateRecord>[] = [];

export function resetAllRateLimiters() {
  for (const store of activeStores) {
    store.clear();
  }
}

export function createRateLimiter(options: RateLimiterOptions) {
  const {
    windowMs,
    maxRequests,
    message = 'Too many requests, please try again later.'
  } = options;

  const store = new Map<string, ClientRateRecord>();
  activeStores.push(store);

  // Periodically prune expired IP records so memory never grows unbounded
  const pruneInterval = setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of store.entries()) {
      if (now >= record.resetAt) {
        store.delete(ip);
      }
    }
  }, Math.max(windowMs, 60_000));

  if (typeof pruneInterval.unref === 'function') {
    pruneInterval.unref();
  }

  return function rateLimiterMiddleware(req: Request, res: Response, next: NextFunction) {
    const forwarded = req.headers['x-forwarded-for'];
    const clientIp =
      (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : '') ||
      req.ip ||
      req.socket?.remoteAddress ||
      'unknown';

    const now = Date.now();
    let record = store.get(clientIp);

    if (!record || now >= record.resetAt) {
      record = {
        count: 1,
        resetAt: now + windowMs
      };
      store.set(clientIp, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, maxRequests - record.count);
    const resetSeconds = Math.ceil((record.resetAt - now) / 1000);

    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(resetSeconds));

    if (record.count > maxRequests) {
      res.setHeader('Retry-After', String(resetSeconds));
      return res.status(429).json({
        error: message,
        retryAfterSeconds: resetSeconds
      });
    }

    next();
  };
}

/**
 * Strict brute-force protection for /api/auth/login (max 15 login attempts per 15 minutes per IP)
 */
export const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 15,
  message: 'Too many login attempts from this IP address. Please wait a few minutes and try again.'
});

/**
 * General API rate limiter (max 300 requests per minute per IP)
 */
export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 300,
  message: 'API rate limit exceeded. Please slow down requests.'
});
