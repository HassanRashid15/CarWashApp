/**
 * Next.js Instrumentation
 * 
 * This file runs once when the server starts.
 * Currently used for initialization if needed in the future.
 */

export async function register() {
  // Add any server initialization code here if needed
  if (process.env.NODE_ENV === 'production') {
    console.log('✅ Server initialized');
  }
}

// Handle request errors - logs automatically captured by Vercel
export function onRequestError(error: Error, request: Request) {
  console.error('Request error:', {
    url: request.url,
    method: request.method,
    error: error.message,
    stack: error.stack,
  });
}
