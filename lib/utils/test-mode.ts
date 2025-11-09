/**
 * Test mode utilities to ensure we're not accidentally using live/production mode
 */

/**
 * Check if we're in test mode
 */
export function isTestMode(): boolean {
  // Check if Stripe secret key is a test key
  const stripeKey = process.env.STRIPE_SECRET_KEY || '';
  const isStripeTest = stripeKey.startsWith('sk_test_');
  
  // Check if we're in development
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  return isStripeTest && isDevelopment;
}

/**
 * Validate that we're using test keys (throws error if live keys detected)
 */
export function validateTestMode(): void {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  
  if (!stripeKey || !publishableKey) {
    return; // Will be caught by other validation
  }
  
  // Check for live keys
  if (stripeKey.startsWith('sk_live_')) {
    throw new Error('LIVE Stripe key detected! This is a test environment. Please use test keys (sk_test_...)');
  }
  
  if (publishableKey.startsWith('pk_live_')) {
    throw new Error('LIVE Stripe publishable key detected! This is a test environment. Please use test keys (pk_test_...)');
  }
  
  // Warn if not test keys
  if (!stripeKey.startsWith('sk_test_')) {
    console.warn('⚠️ WARNING: Stripe secret key does not appear to be a test key!');
  }
  
  if (!publishableKey.startsWith('pk_test_')) {
    console.warn('⚠️ WARNING: Stripe publishable key does not appear to be a test key!');
  }
}

/**
 * Get test mode status for display
 */
export function getTestModeStatus(): {
  isTestMode: boolean;
  stripeMode: 'test' | 'live' | 'unknown';
  warnings: string[];
} {
  const stripeKey = process.env.STRIPE_SECRET_KEY || '';
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
  const warnings: string[] = [];
  
  let stripeMode: 'test' | 'live' | 'unknown' = 'unknown';
  
  if (stripeKey.startsWith('sk_test_') && publishableKey.startsWith('pk_test_')) {
    stripeMode = 'test';
  } else if (stripeKey.startsWith('sk_live_') || publishableKey.startsWith('pk_live_')) {
    stripeMode = 'live';
    warnings.push('⚠️ LIVE Stripe keys detected! This should only be used in production.');
  } else {
    warnings.push('⚠️ Stripe keys not properly configured or invalid format.');
  }
  
  const isTestMode = stripeMode === 'test' && process.env.NODE_ENV !== 'production';
  
  return {
    isTestMode,
    stripeMode,
    warnings,
  };
}


