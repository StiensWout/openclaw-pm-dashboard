import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { createTooManyRequestsError } from './errorHandler';

// Create rate limiters for different endpoints
const apiLimiter = new RateLimiterMemory({
  points: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // Number of requests
  duration: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900') / 1000, // Per 15 minutes (900 seconds)
  blockDuration: 60, // Block for 60 seconds
});

const authLimiter = new RateLimiterMemory({
  points: 5, // 5 attempts
  duration: 900, // Per 15 minutes
  blockDuration: 900, // Block for 15 minutes
});

const websocketLimiter = new RateLimiterMemory({
  points: 1000, // 1000 events
  duration: 60, // Per minute
  blockDuration: 60, // Block for 1 minute
});

/**
 * General API rate limiter middleware
 */
export const rateLimiter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const key = req.ip || 'unknown';
    await apiLimiter.consume(key);
    next();
  } catch (rejRes: any) {
    const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
    res.set('Retry-After', String(secs));
    
    console.warn(`Rate limit exceeded for IP: ${req.ip}, retry after ${secs}s`);
    next(createTooManyRequestsError(`Rate limit exceeded. Try again in ${secs} seconds.`));
  }
};

/**
 * Authentication rate limiter (stricter limits)
 */
export const authRateLimiter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const key = req.ip || 'unknown';
    await authLimiter.consume(key);
    next();
  } catch (rejRes: any) {
    const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
    res.set('Retry-After', String(secs));
    
    console.warn(`Auth rate limit exceeded for IP: ${req.ip}, retry after ${secs}s`);
    next(createTooManyRequestsError(`Too many authentication attempts. Try again in ${Math.ceil(secs / 60)} minutes.`));
  }
};

/**
 * WebSocket rate limiter
 */
export const websocketRateLimiter = async (socketId: string, ip?: string): Promise<boolean> => {
  try {
    const key = ip || socketId;
    await websocketLimiter.consume(key);
    return true;
  } catch (rejRes: any) {
    console.warn(`WebSocket rate limit exceeded for ${key}`);
    return false;
  }
};

/**
 * Create a custom rate limiter
 */
export const createRateLimiter = (options: {
  points: number;
  duration: number;
  blockDuration?: number;
  keyGenerator?: (req: Request) => string;
}) => {
  const limiter = new RateLimiterMemory({
    points: options.points,
    duration: options.duration,
    blockDuration: options.blockDuration || options.duration,
  });

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const key = options.keyGenerator ? options.keyGenerator(req) : (req.ip || 'unknown');
      await limiter.consume(key);
      next();
    } catch (rejRes: any) {
      const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
      res.set('Retry-After', String(secs));
      
      console.warn(`Custom rate limit exceeded for ${key}, retry after ${secs}s`);
      next(createTooManyRequestsError(`Rate limit exceeded. Try again in ${secs} seconds.`));
    }
  };
};

/**
 * Rate limiter for project operations
 */
export const projectRateLimiter = createRateLimiter({
  points: 10, // 10 project operations
  duration: 300, // Per 5 minutes
  keyGenerator: (req) => `project-${req.ip}`
});

/**
 * Rate limiter for task operations
 */
export const taskRateLimiter = createRateLimiter({
  points: 50, // 50 task operations
  duration: 300, // Per 5 minutes
  keyGenerator: (req) => `task-${req.ip}`
});

/**
 * Rate limiter for agent operations
 */
export const agentRateLimiter = createRateLimiter({
  points: 100, // 100 agent status updates
  duration: 60, // Per minute
  keyGenerator: (req) => `agent-${req.ip}`
});