/**
 * Vercel Logs Integration
 * 
 * Vercel automatically captures console.log, console.error, etc. in production.
 * This utility provides structured logging that works in both dev and production.
 * 
 * In development: Logs to browser/server console
 * In production: Logs automatically captured by Vercel Logs (free, built-in)
 * 
 * View logs: https://vercel.com/dashboard -> Your Project -> Logs
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogContext {
  [key: string]: any;
}

/**
 * Structured logging utility for Vercel
 */
class VercelLogger {
  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  /**
   * Log an error with context
   * Automatically captured by Vercel in production
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorContext: LogContext = {
      ...context,
      ...(error instanceof Error && {
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack,
      }),
      ...(typeof error === 'object' && error !== null && {
        error: String(error),
      }),
    };

    console.error(this.formatMessage('error', message, errorContext));
  }

  /**
   * Log a warning
   */
  warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage('warn', message, context));
  }

  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void {
    console.log(this.formatMessage('info', message, context));
  }

  /**
   * Log debug message (only in development)
   */
  debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  /**
   * Capture an exception (similar to Sentry's captureException)
   * This will be visible in Vercel Logs dashboard
   */
  captureException(error: Error | unknown, context?: LogContext): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    this.error('Exception captured', error, {
      ...context,
      severity: 'error',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log API request/response
   */
  api(method: string, url: string, statusCode: number, duration?: number, context?: LogContext): void {
    const apiContext: LogContext = {
      method,
      url,
      statusCode,
      ...(duration && { duration: `${duration}ms` }),
      ...context,
    };

    if (statusCode >= 500) {
      this.error(`API Error: ${method} ${url}`, undefined, apiContext);
    } else if (statusCode >= 400) {
      this.warn(`API Warning: ${method} ${url}`, apiContext);
    } else {
      this.info(`API: ${method} ${url}`, apiContext);
    }
  }
}

// Export singleton instance
export const logger = new VercelLogger();

// Export convenience functions
export function logError(message: string, error?: Error | unknown, context?: LogContext): void {
  logger.error(message, error, context);
}

export function captureException(error: Error | unknown, context?: LogContext): void {
  logger.captureException(error, context);
}

export function logInfo(message: string, context?: LogContext): void {
  logger.info(message, context);
}

export function logWarn(message: string, context?: LogContext): void {
  logger.warn(message, context);
}

export function logApi(method: string, url: string, statusCode: number, duration?: number, context?: LogContext): void {
  logger.api(method, url, statusCode, duration, context);
}

