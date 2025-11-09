/**
 * API route wrapper with rate limiting, error handling, and caching
 */

import { NextRequest, NextResponse } from 'next/server';
import { rateLimiter, getRateLimitIdentifier, createRateLimitResponse, RateLimitConfig } from './rate-limit';
import { cache, CacheKeys } from '@/lib/cache/cache';
import { getUserFriendlyMessage, ErrorMessages } from '@/lib/utils/error-messages';
import { captureException } from '@/lib/monitoring/sentry';

interface ApiHandlerOptions {
  rateLimit?: keyof typeof RateLimitConfig;
  cacheKey?: string | ((req: NextRequest) => string);
  cacheTTL?: number;
  requireAuth?: boolean;
}

/**
 * Wrap API route handler with rate limiting, caching, and error handling
 */
export function withApiWrapper<T = any>(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse<T>>,
  options: ApiHandlerOptions = {}
) {
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    try {
      // Rate limiting
      if (options.rateLimit) {
        const config = RateLimitConfig[options.rateLimit];
        const identifier = getRateLimitIdentifier(req);
        const rateLimitResult = rateLimiter.check(
          identifier,
          config.limit,
          config.windowMs
        );

        if (!rateLimitResult.allowed) {
          return createRateLimitResponse(
            rateLimitResult.remaining,
            rateLimitResult.resetAt
          );
        }
      }

      // Caching (only for GET requests)
      if (req.method === 'GET' && options.cacheKey) {
        const cacheKey =
          typeof options.cacheKey === 'function'
            ? options.cacheKey(req)
            : options.cacheKey;

        const cached = cache.get<any>(cacheKey);
        if (cached !== null) {
          return NextResponse.json(cached, {
            headers: {
              'X-Cache': 'HIT',
            },
          });
        }

        // Execute handler and cache result
        const response = await handler(req, context);
        const data = await response.json();

        if (response.ok) {
          cache.set(cacheKey, data, options.cacheTTL);
        }

        return NextResponse.json(data, {
          status: response.status,
          headers: {
            ...response.headers,
            'X-Cache': 'MISS',
          },
        });
      }

      // Execute handler
      return await handler(req, context);
    } catch (error: any) {
      // Log to Sentry
      captureException(error instanceof Error ? error : new Error(String(error)), {
        url: req.url,
        method: req.method,
        ...options,
      });

      // Return user-friendly error
      const userMessage = getUserFriendlyMessage(error);
      const statusCode = error?.statusCode || 500;

      return NextResponse.json(
        {
          error: userMessage,
          message: userMessage,
          ...(process.env.NODE_ENV === 'development' && {
            details: error instanceof Error ? error.message : String(error),
          }),
        },
        { status: statusCode }
      );
    }
  };
}

