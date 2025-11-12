/**
 * Client-side Instrumentation
 * 
 * This file runs on the client side.
 * Currently used for initialization if needed in the future.
 * 
 * Client-side errors are automatically captured by Vercel when deployed.
 */

// Initialize client-side error tracking
if (typeof window !== 'undefined') {
  // Global error handler - logs automatically captured by Vercel
  window.addEventListener('error', (event) => {
    console.error('Client error:', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error,
    });
  });

  // Unhandled promise rejection handler
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', {
      reason: event.reason,
      error: event.reason instanceof Error ? {
        message: event.reason.message,
        stack: event.reason.stack,
      } : event.reason,
    });
  });
}