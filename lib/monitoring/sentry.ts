/**
 * Sentry error tracking configuration
 * 
 * To use Sentry:
 * 1. Install: npm install @sentry/nextjs
 * 2. Run: npx @sentry/wizard@latest -i nextjs
 * 3. Add SENTRY_DSN to .env.local
 * 4. Import and initialize in app/layout.tsx
 */

export function initSentry() {
  // Only initialize in production or if DSN is provided
  if (typeof window === 'undefined') {
    // Server-side initialization
    if (process.env.SENTRY_DSN && process.env.NODE_ENV === 'production') {
      try {
        // Dynamic import to avoid bundling in development
        const Sentry = require('@sentry/nextjs');
        Sentry.init({
          dsn: process.env.SENTRY_DSN,
          environment: process.env.NODE_ENV,
          tracesSampleRate: 0.1, // 10% of transactions
          debug: false,
        });
        console.log('✅ Sentry initialized (server)');
      } catch (error) {
        console.warn('⚠️ Sentry not available:', error);
      }
    }
  } else {
    // Client-side initialization
    if (process.env.NEXT_PUBLIC_SENTRY_DSN && process.env.NODE_ENV === 'production') {
      try {
        const Sentry = require('@sentry/nextjs');
        Sentry.init({
          dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
          environment: process.env.NODE_ENV,
          tracesSampleRate: 0.1,
          debug: false,
          beforeSend(event: any, hint: any) {
            // Filter out development errors
            if (process.env.NODE_ENV === 'development') {
              return null;
            }
            return event;
          },
        });
        console.log('✅ Sentry initialized (client)');
      } catch (error) {
        console.warn('⚠️ Sentry not available:', error);
      }
    }
  }
}

/**
 * Capture an exception manually
 */
export function captureException(error: Error, context?: Record<string, any>) {
  if (typeof window === 'undefined') {
    // Server-side
    if (process.env.SENTRY_DSN && process.env.NODE_ENV === 'production') {
      try {
        const Sentry = require('@sentry/nextjs');
        Sentry.captureException(error, {
          contexts: {
            custom: context || {},
          },
        });
      } catch (e) {
        console.error('Error capturing exception:', e);
      }
    }
  } else {
    // Client-side
    if (process.env.NEXT_PUBLIC_SENTRY_DSN && process.env.NODE_ENV === 'production') {
      try {
        const Sentry = require('@sentry/nextjs');
        Sentry.captureException(error, {
          contexts: {
            custom: context || {},
          },
        });
      } catch (e) {
        console.error('Error capturing exception:', e);
      }
    }
  }
}

/**
 * Capture a message manually
 */
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  if (typeof window === 'undefined') {
    if (process.env.SENTRY_DSN && process.env.NODE_ENV === 'production') {
      try {
        const Sentry = require('@sentry/nextjs');
        Sentry.captureMessage(message, level);
      } catch (e) {
        console.error('Error capturing message:', e);
      }
    }
  } else {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN && process.env.NODE_ENV === 'production') {
      try {
        const Sentry = require('@sentry/nextjs');
        Sentry.captureMessage(message, level);
      } catch (e) {
        console.error('Error capturing message:', e);
      }
    }
  }
}

