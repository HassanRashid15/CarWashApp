"use client";

import NextError from "next/error";
import { useEffect } from "react";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    // Log error to Vercel Logs (automatically captured in production)
    if (typeof window !== 'undefined') {
      try {
        const { captureException } = require('@/lib/monitoring/vercel-logs');
        captureException(error, {
          globalError: true,
          digest: error.digest,
        });
      } catch (e) {
        // Fallback to console if logger not available
        console.error('Global error:', error);
      }
    }
  }, [error]);

  return (
    <html>
      <body>
        {/* `NextError` is the default Next.js error page component. Its type
        definition requires a `statusCode` prop. However, since the App Router
        does not expose status codes for errors, we simply pass 0 to render a
        generic error message. */}
        <NextError statusCode={0} />
      </body>
    </html>
  );
}