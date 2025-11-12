# Error Logging with Vercel Logs

This app uses **Vercel Logs** for error tracking and monitoring. It's free, built-in, and automatically captures all console logs when deployed on Vercel.

## How It Works

- **Development**: Logs appear in your terminal/browser console
- **Production**: All `console.log`, `console.error`, etc. are automatically captured by Vercel
- **View Logs**: Go to [Vercel Dashboard](https://vercel.com/dashboard) → Your Project → **Logs** tab

## Usage

### Basic Error Logging

```typescript
import { captureException } from '@/lib/monitoring/vercel-logs';

try {
  // your code
} catch (error) {
  captureException(error, {
    context: 'user-action',
    userId: user.id,
  });
}
```

### Logging Levels

```typescript
import { logError, logInfo, logWarn } from '@/lib/monitoring/vercel-logs';

logError('Something went wrong', error, { userId: '123' });
logWarn('Rate limit approaching', { userId: '123' });
logInfo('User logged in', { userId: '123' });
```

### API Request Logging

```typescript
import { logApi } from '@/lib/monitoring/vercel-logs';

const startTime = Date.now();
// ... make API call
const duration = Date.now() - startTime;

logApi('GET', '/api/users', 200, duration, { userId: '123' });
```

## Viewing Logs

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Click **Logs** tab
4. Filter by:
   - Log level (error, warn, info)
   - Time range
   - Search terms

## Benefits

✅ **Free** - No cost, built into Vercel  
✅ **Zero Configuration** - Works automatically  
✅ **No Performance Impact** - Just console.log under the hood  
✅ **Real-time** - See logs as they happen  
✅ **Searchable** - Filter and search through logs  

## Migration from Sentry

All error handlers have been updated to use Vercel logs:
- ✅ API routes (`lib/middleware/api-wrapper.ts`)
- ✅ Error pages (`app/error.tsx`)
- ✅ Error boundaries (`components/error-boundary.tsx`)
- ✅ Global errors (`app/global-error.tsx`)

## Tips

- Use structured logging with context objects for better searchability
- Include user IDs, request IDs, or other identifiers in context
- Use appropriate log levels (error, warn, info, debug)
- Don't log sensitive information (passwords, tokens, etc.)

