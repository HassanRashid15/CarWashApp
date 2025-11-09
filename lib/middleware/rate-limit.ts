/**
 * Rate limiting middleware
 * Simple in-memory rate limiter (for production, consider Redis-based solution)
 */

import { NextResponse } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();

  /**
   * Check if request should be rate limited
   * @param identifier - Unique identifier (IP, user ID, etc.)
   * @param limit - Maximum number of requests
   * @param windowMs - Time window in milliseconds
   * @returns Object with allowed status and remaining requests
   */
  check(
    identifier: string,
    limit: number,
    windowMs: number
  ): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const key = identifier;
    const entry = this.limits.get(key);

    // If no entry or window expired, create new entry
    if (!entry || now > entry.resetAt) {
      const resetAt = now + windowMs;
      this.limits.set(key, {
        count: 1,
        resetAt,
      });

      return {
        allowed: true,
        remaining: limit - 1,
        resetAt,
      };
    }

    // Check if limit exceeded
    if (entry.count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetAt,
      };
    }

    // Increment count
    entry.count++;
    this.limits.set(key, entry);

    return {
      allowed: true,
      remaining: limit - entry.count,
      resetAt: entry.resetAt,
    };
  }

  /**
   * Clean expired entries
   */
  cleanExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetAt) {
        this.limits.delete(key);
      }
    }
  }

  /**
   * Reset rate limit for identifier
   */
  reset(identifier: string): void {
    this.limits.delete(identifier);
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();

// Clean expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    rateLimiter.cleanExpired();
  }, 5 * 60 * 1000);
}

/**
 * Rate limit configurations
 */
export const RateLimitConfig = {
  // API routes
  API: {
    limit: 100, // requests
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  
  // Authentication routes
  AUTH: {
    limit: 5, // requests
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  
  // Payment routes
  PAYMENT: {
    limit: 10, // requests
    windowMs: 60 * 1000, // 1 minute
  },
  
  // Subscription routes
  SUBSCRIPTION: {
    limit: 30, // requests (increased to handle polling)
    windowMs: 60 * 1000, // 1 minute
  },
  
  // General routes
  GENERAL: {
    limit: 200, // requests
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
};

/**
 * Get identifier for rate limiting
 */
export function getRateLimitIdentifier(request: Request): string {
  // Try to get user ID from headers or session
  const userId = request.headers.get('x-user-id');
  if (userId) {
    return `user:${userId}`;
  }

  // Fallback to IP address
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';
  return `ip:${ip}`;
}

/**
 * Create rate limit response
 */
export function createRateLimitResponse(
  remaining: number,
  resetAt: number
) {
  const resetSeconds = Math.ceil((resetAt - Date.now()) / 1000);
  
  return NextResponse.json(
    {
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: resetSeconds,
    },
    {
      status: 429,
      headers: {
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': resetAt.toString(),
        'Retry-After': resetSeconds.toString(),
      },
    }
  );
}

