import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

/**
 * Rate limiting configuration options
 */
export interface RateLimiterOptions {
  /** Maximum number of requests allowed within the time window */
  max: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Custom message for rate limit exceeded responses */
  message?: string;
  /** Custom key generator function for identifying unique clients */
  keyGenerator?: (req: Request) => string;
  /** IP addresses to whitelist (bypass rate limiting) */
  whitelist?: string[];
  /** Skip rate limiting function */
  skip?: (req: Request) => boolean;
  /** Custom handler for rate limit exceeded */
  onLimitReached?: (req: Request, res: Response) => void;
}

/**
 * Rate limit store entry
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstRequestTime: number;
}

/**
 * Default rate limiter options
 */
const defaultOptions: Required<RateLimiterOptions> = {
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '3600000', 10), // 1 hour
  message: 'Too many requests from this IP, please try again later.',
  keyGenerator: (req: Request) => req.ip || req.connection.remoteAddress || 'unknown',
  whitelist: process.env.RATE_LIMIT_WHITELIST ? process.env.RATE_LIMIT_WHITELIST.split(',').map(ip => ip.trim()) : [],
  skip: () => false,
  onLimitReached: () => {}
};

/**
 * In-memory store for rate limiting data
 * Uses sliding window approach for accurate rate limiting
 */
class RateLimitStore {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor(private windowMs: number) {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Get current count for a key
   */
  get(key: string): RateLimitEntry | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    const now = Date.now();
    
    // If the reset time has passed, reset the counter
    if (now >= entry.resetTime) {
      this.store.delete(key);
      return undefined;
    }

    return entry;
  }

  /**
   * Increment count for a key
   */
  increment(key: string): RateLimitEntry {
    const now = Date.now();
    const existing = this.get(key);

    if (existing) {
      existing.count++;
      return existing;
    }

    // Create new entry
    const entry: RateLimitEntry = {
      count: 1,
      resetTime: now + this.windowMs,
      firstRequestTime: now
    };

    this.store.set(key, entry);
    return entry;
  }

  /**
   * Reset count for a key
   */
  reset(key: string): void {
    this.store.delete(key);
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now >= entry.resetTime) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Get current store statistics
   */
  getStats(): { totalKeys: number; activeKeys: number } {
    const now = Date.now();
    let activeKeys = 0;
    
    for (const entry of this.store.values()) {
      if (now < entry.resetTime) {
        activeKeys++;
      }
    }

    return {
      totalKeys: this.store.size,
      activeKeys
    };
  }

  /**
   * Cleanup and destroy the store
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

/**
 * Create a rate limiting middleware
 */
export function createRateLimiter(options: Partial<RateLimiterOptions> = {}) {
  const config = { ...defaultOptions, ...options };
  const store = new RateLimitStore(config.windowMs);

  // Validate configuration
  if (config.max <= 0) {
    throw new Error('Rate limiter max must be greater than 0');
  }
  if (config.windowMs <= 0) {
    throw new Error('Rate limiter windowMs must be greater than 0');
  }

  const middleware = (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Skip if skip function returns true
      if (config.skip(req)) {
        return next();
      }

      const key = config.keyGenerator(req);
      
      // Check if IP is whitelisted
      if (config.whitelist.includes(key)) {
        return next();
      }

      const entry = store.increment(key);
      const now = Date.now();
      
      // Calculate remaining time and requests
      const remaining = Math.max(0, config.max - entry.count);
      const resetTime = Math.ceil(entry.resetTime / 1000); // Convert to seconds
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);

      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': config.max.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': resetTime.toString(),
        'X-RateLimit-Window': config.windowMs.toString()
      });

      // Check if limit is exceeded
      if (entry.count > config.max) {
        // Log rate limit violation
        console.warn(`Rate limit exceeded for ${key}. Count: ${entry.count}, Max: ${config.max}, Window: ${config.windowMs}ms`);
        
        // Set retry-after header
        res.set('Retry-After', retryAfter.toString());

        // Call custom handler if provided
        config.onLimitReached(req, res);

        // Create rate limit error
        const error = new AppError(config.message, 429);
        return next(error);
      }

      next();
    } catch (error) {
      // Graceful degradation - if rate limiter fails, continue without rate limiting
      console.error('Rate limiter error:', error);
      next();
    }
  };

  // Attach store and config to middleware for testing/debugging
  (middleware as any).store = store;
  (middleware as any).config = config;

  return middleware;
}

/**
 * Default rate limiter with standard configuration
 */
export const rateLimiter = createRateLimiter();

/**
 * Strict rate limiter for sensitive endpoints
 */
export const strictRateLimiter = createRateLimiter({
  max: 10,
  windowMs: 900000, // 15 minutes
  message: 'Too many requests to this sensitive endpoint, please try again later.'
});

/**
 * Lenient rate limiter for public endpoints
 */
export const lenientRateLimiter = createRateLimiter({
  max: 1000,
  windowMs: 3600000, // 1 hour
  message: 'Rate limit exceeded for public endpoint.'
});

export default rateLimiter;