import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSubscriptionInfo, getUsageCounts } from '@/lib/utils/subscription-helpers';
import { getPlanLimits } from '@/lib/utils/plan-limits';
import { checkTrialForUser } from '@/lib/utils/trial-notifications';
import { checkRenewalForUser } from '@/lib/utils/subscription-renewal-notifications';
import { check29DayReminderForUser } from '@/lib/utils/subscription-29day-reminder';
import { withApiWrapper } from '@/lib/middleware/api-wrapper';
import { cache, CacheKeys } from '@/lib/cache/cache';
import { getUserFriendlyMessage } from '@/lib/utils/error-messages';
import { captureException } from '@/lib/monitoring/sentry';

/**
 * GET - Get current subscription info
 */
async function getSubscriptionHandler(request: NextRequest) {
  const supabase = await createClient();
  
  // Check authentication
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'You need to sign in to view your subscription.' },
      { status: 401 }
    );
  }
  
  try {

    const userId = session.user.id;
    
    // Try cache first (but skip cache if we're checking for pending status after purchase)
    const skipCache = request.headers.get('x-skip-cache') === 'true';
    const cacheKey = CacheKeys.subscription(userId);
    let cached = null;
    
    // IMPORTANT: Always clear cache if skipCache is requested
    if (skipCache) {
      cache.delete(cacheKey);
      console.log('🗑️ Cache cleared for fresh subscription data');
    } else {
      // Only use cache if not skipping
      cached = cache.get<any>(cacheKey);
      if (cached) {
        // CRITICAL: Verify cached data is still valid by checking if subscription exists in DB
        // If cache says "no subscription" but we want to be sure, we should still check
        // For now, trust cache but log it
        console.log('📦 Using cached subscription data:', {
          hasSubscription: !!cached.subscription,
          cacheKey,
        });
        return NextResponse.json(cached, {
          headers: { 'X-Cache': 'HIT' },
        });
      }
    }
    
    // Get subscription info directly from Supabase (bypassing cache)
    console.log('🔍 ========================================');
    console.log('🔍 API: Fetching fresh subscription from Supabase');
    console.log('🔍 ========================================');
    console.log('🔍 User ID:', userId);
    console.log('🔍 Skip Cache:', skipCache);
    console.log('🔍 ========================================');
    
    const subscription = await getSubscriptionInfo(userId);
    
    // Log for debugging
    console.log('📊 ========================================');
    console.log('📊 API: Subscription fetch result');
    console.log('📊 ========================================');
    console.log('📊 User ID:', userId);
    console.log('📊 Has Subscription:', !!subscription);
    console.log('📊 Subscription is Null:', subscription === null);
    console.log('📊 Subscription is Undefined:', subscription === undefined);
    console.log('📊 Status:', subscription?.status);
    console.log('📊 Plan Type:', subscription?.planType);
    console.log('📊 Is Pending:', subscription?.status === 'pending');
    console.log('📊 Full subscription object:', JSON.stringify(subscription, null, 2));
    console.log('📊 ========================================');
    
    // Get usage counts (always return this, even without subscription)
    const usage = await getUsageCounts(userId);
    
    // CRITICAL: Ensure subscription is truly null/undefined before returning
    // Double-check by verifying subscription has required fields
    if (!subscription || !subscription.status || !subscription.planType) {
      // Return usage data even without subscription for credits display
      const response = {
        subscription: null,
        usage,
        limits: {
          maxCustomers: 5, // Limit for users without plan
          maxWorkers: null,
          maxProducts: null,
        },
        message: 'No subscription found',
      };
      
      // Cache for 2 minutes - but only if we're sure there's no subscription
      cache.set(cacheKey, response, 2 * 60 * 1000);
      console.log('💾 Cached "no subscription" response for user:', userId);
      
      return NextResponse.json(response, {
        headers: { 'X-Cache': 'MISS' },
      });
    }

    // Check and send trial expiration warning email if needed
    if (subscription.status === 'trial' && subscription.trialEndsAt) {
      try {
        const trialCheck = await checkTrialForUser(userId);
        if (trialCheck.sent) {
          console.log(`📧 Trial expiration email sent to user ${userId}`);
        }
      } catch (error) {
        // Don't fail the request if email sending fails
        console.error('Error checking trial expiration:', error);
      }
    }

    // Check and send subscription renewal notification if needed
    if (subscription.status === 'active' && subscription.currentPeriodEnd) {
      try {
        const renewalCheck = await checkRenewalForUser(userId);
        if (renewalCheck.sent) {
          console.log(`📧 Subscription renewal email sent to user ${userId}`);
        }
      } catch (error) {
        // Don't fail the request if email sending fails
        console.error('Error checking subscription renewal:', error);
      }
    }

    // Check and send 29th day reminder if needed
    if (subscription.status === 'active') {
      try {
        const reminderCheck = await check29DayReminderForUser(userId);
        if (reminderCheck.sent) {
          console.log(`📧 29th day reminder email sent to user ${userId}`);
        }
      } catch (error) {
        // Don't fail the request if email sending fails
        console.error('Error checking 29th day reminder:', error);
      }
    }
    
    // Get plan limits
    const limits = getPlanLimits(subscription.planType);

    const response = {
      subscription,
      usage,
      limits,
    };
    
    // Cache for 2 minutes
    cache.set(CacheKeys.subscription(userId), response, 2 * 60 * 1000);
    
    return NextResponse.json(response, {
      headers: { 'X-Cache': 'MISS' },
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    captureException(error instanceof Error ? error : new Error(String(error)), {
      route: '/api/subscriptions',
      method: 'GET',
    });
    
    const userMessage = getUserFriendlyMessage(error);
    return NextResponse.json(
      { 
        error: userMessage,
        message: userMessage,
        ...(process.env.NODE_ENV === 'development' && {
          details: error instanceof Error ? error.message : String(error),
        }),
      },
      { status: 500 }
    );
  }
}

// Export with rate limiting and error handling
export const GET = withApiWrapper(getSubscriptionHandler, {
  rateLimit: 'SUBSCRIPTION',
  cacheKey: (req) => {
    // Cache key will be set inside handler using userId
    return '';
  },
  requireAuth: true,
});

