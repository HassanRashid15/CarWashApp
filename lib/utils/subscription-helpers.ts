/**
 * Subscription helper functions for database operations
 */

import { createAdminClient } from '@/lib/supabase/server';
import type { PlanType, SubscriptionStatus, SubscriptionInfo } from './plan-limits';

export interface SubscriptionRecord {
  id: string;
  user_id: string;
  plan_type: PlanType;
  status: SubscriptionStatus;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  stripe_price_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_ends_at: string | null;
  canceled_at: string | null;
  pending_renewal?: boolean | null;
  renewal_notification_sent_at?: string | null;
  renewal_approved_at?: string | null;
  renewal_approved_by?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Get subscription for a user
 */
export async function getSubscription(userId: string): Promise<SubscriptionRecord | null> {
  try {
    console.log('🔍 Querying Supabase subscriptions table for user:', userId);
    const supabase = createAdminClient();
    
    // First, let's check ALL subscriptions to see what's in the table
    const { data: allSubs, error: allSubsError } = await supabase
      .from('subscriptions')
      .select('*')
      .order('created_at', { ascending: false });
    
    console.log('📋 ========================================');
    console.log('📋 SUPABASE SUBSCRIPTIONS TABLE - ALL RECORDS:');
    console.log('📋 ========================================');
    console.log('📋 Total records in table:', allSubs?.length || 0);
    if (allSubsError) {
      console.error('❌ Error fetching all subscriptions:', allSubsError);
    }
    if (allSubs && allSubs.length > 0) {
      console.table(allSubs.map(sub => ({
        id: sub.id,
        user_id: sub.user_id,
        plan_type: sub.plan_type,
        status: sub.status,
        stripe_subscription_id: sub.stripe_subscription_id,
        created_at: sub.created_at,
        updated_at: sub.updated_at,
      })));
      console.log('📋 Full subscription data:', JSON.stringify(allSubs, null, 2));
    } else {
      console.log('📋 ⚠️ TABLE IS EMPTY - No subscriptions found in database');
    }
    console.log('📋 ========================================');
    
    // Now query for this specific user
    console.log('🔍 Querying for specific user_id:', userId);
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) {
      console.error('❌ Supabase query error:', {
        errorCode: error.code,
        errorMessage: error.message,
        errorDetails: error.details,
        errorHint: error.hint,
        userId,
        table: 'subscriptions',
        queryUserId: userId,
        allSubscriptions: allSubs,
      });
      return null;
    }
    
    if (data) {
      console.log('✅ ========================================');
      console.log('✅ SUBSCRIPTION FOUND FOR USER:');
      console.log('✅ ========================================');
      console.log('✅ Full subscription record:', JSON.stringify(data, null, 2));
      console.log('✅ Summary:', {
        id: data.id,
        user_id: data.user_id,
        queryUserId: userId,
        userIdsMatch: data.user_id === userId,
        plan_type: data.plan_type,
        status: data.status,
        stripe_subscription_id: data.stripe_subscription_id,
        created_at: data.created_at,
        updated_at: data.updated_at,
      });
      console.log('✅ ========================================');
      
      // Warn if user_id doesn't match
      if (data.user_id !== userId) {
        console.warn('⚠️ WARNING: user_id mismatch!', {
          subscriptionUserId: data.user_id,
          queryUserId: userId,
        });
      }
    } else {
      console.log('ℹ️ ========================================');
      console.log('ℹ️ NO SUBSCRIPTION FOUND FOR USER:', userId);
      console.log('ℹ️ ========================================');
      console.log('ℹ️ Searched user_id:', userId);
      console.log('ℹ️ All subscriptions in table:', allSubs?.map(s => ({
        user_id: s.user_id,
        plan_type: s.plan_type,
        status: s.status,
      })));
      if (allSubs && allSubs.length > 0) {
        console.log('ℹ️ ⚠️ There are subscriptions in the table, but none match your user_id');
        console.log('ℹ️ Available user_ids:', allSubs.map(s => s.user_id));
      } else {
        console.log('ℹ️ ⚠️ The subscriptions table is completely empty');
      }
      console.log('ℹ️ ========================================');
    }
    
    return data;
  } catch (error) {
    console.error('❌ Exception when fetching subscription:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId,
    });
    return null;
  }
}

/**
 * Create a trial subscription for a new admin
 * For testing: 30 minutes, for production: 2 days
 */
export async function createTrialSubscription(userId: string): Promise<SubscriptionRecord | null> {
  try {
    const supabase = createAdminClient();
    
    // Check if subscription already exists
    const existing = await getSubscription(userId);
    if (existing) {
      console.log('Subscription already exists for user, skipping trial creation');
      return existing;
    }
  
  // Trial period: 30 minutes for testing (change to 2 days for production)
  // Set TEST_MODE_TRIAL=true in .env for 30 min, otherwise 2 days
  const isTestMode = process.env.TEST_MODE_TRIAL === 'true';
  const trialEndsAt = new Date();
  
  if (isTestMode) {
    // 30 minutes for testing
    trialEndsAt.setMinutes(trialEndsAt.getMinutes() + 30);
    console.log('🧪 TEST MODE: Creating 30-minute trial subscription');
  } else {
    // 2 days for production
    trialEndsAt.setDate(trialEndsAt.getDate() + 2);
    console.log('📅 PRODUCTION MODE: Creating 2-day trial subscription');
  }
  
  const { data, error } = await supabase
    .from('subscriptions')
    .insert({
      user_id: userId,
      plan_type: 'trial', // Trial plan with 2 customer limit
      status: 'trial',
      trial_ends_at: trialEndsAt.toISOString(),
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating trial subscription:', error);
    return null;
  }
  
  console.log('✅ Trial subscription created:', {
    userId,
    planType: 'trial',
    trialEndsAt: trialEndsAt.toISOString(),
    isTestMode,
  });
  
  return data;
  } catch (error) {
    console.error('Error creating admin client or trial subscription:', error);
    return null;
  }
}

/**
 * Update subscription status
 */
export async function updateSubscription(
  userId: string,
  updates: Partial<SubscriptionRecord>
): Promise<SubscriptionRecord | null> {
  const supabase = createAdminClient();
  
  // First check if subscription exists
  const existing = await getSubscription(userId);
  
  if (!existing) {
    // Check if subscription with same stripe_subscription_id exists (duplicate key scenario)
    if (updates.stripe_subscription_id) {
      const { data: existingByStripeId } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('stripe_subscription_id', updates.stripe_subscription_id)
        .maybeSingle();
      
      if (existingByStripeId) {
        console.log('Subscription with same stripe_subscription_id exists, updating instead:', {
          existingUserId: existingByStripeId.user_id,
          newUserId: userId,
          stripeSubscriptionId: updates.stripe_subscription_id,
        });
        
        // Update the existing subscription
        const { data, error } = await supabase
          .from('subscriptions')
          .update({
            user_id: userId, // Update user_id in case it changed
            ...updates,
          })
          .eq('stripe_subscription_id', updates.stripe_subscription_id)
          .select()
          .single();
        
        if (error) {
          console.error('❌ Error updating existing subscription:', {
            error,
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
            userId,
            updates,
          });
          return null;
        }
        
        console.log('✅ Subscription updated successfully (duplicate key handled):', data);
        return data;
      }
    }
    
    // Create new subscription if it doesn't exist
    const statusToSet = updates.status || 'active';
    console.log('Creating new subscription record:', { userId, updates, statusToSet });
    
    const insertData = {
      user_id: userId,
      plan_type: updates.plan_type || 'starter',
      status: statusToSet, // Use the provided status (could be 'pending')
      stripe_subscription_id: updates.stripe_subscription_id || null,
      stripe_customer_id: updates.stripe_customer_id || null,
      stripe_price_id: updates.stripe_price_id || null,
      current_period_start: updates.current_period_start || null,
      current_period_end: updates.current_period_end || null,
      trial_ends_at: updates.trial_ends_at || null,
      canceled_at: updates.canceled_at || null,
    };
    
    console.log('📝 Attempting to insert subscription into database:', {
      table: 'subscriptions',
      data: insertData,
      userId,
    });
    
    const { data, error } = await supabase
      .from('subscriptions')
      .insert(insertData)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Database error when inserting subscription:', {
        errorCode: error.code,
        errorMessage: error.message,
        errorDetails: error.details,
        errorHint: error.hint,
        table: 'subscriptions',
        attemptedData: insertData,
      });
      // If duplicate key error, try to fetch and update instead
      if (error.code === '23505' && updates.stripe_subscription_id) {
        console.log('Duplicate key detected, fetching existing subscription...');
        const { data: existingSub } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('stripe_subscription_id', updates.stripe_subscription_id)
          .maybeSingle();
        
        if (existingSub) {
          // Update the existing subscription
          const { data: updatedData, error: updateError } = await supabase
            .from('subscriptions')
            .update({
              user_id: userId,
              ...updates,
            })
            .eq('stripe_subscription_id', updates.stripe_subscription_id)
            .select()
            .single();
          
          if (updateError) {
            console.error('❌ Error updating subscription after duplicate key:', updateError);
            return null;
          }
          
          console.log('✅ Subscription updated successfully (duplicate key recovered):', updatedData);
          return updatedData;
        }
      }
      
      console.error('❌ Error creating subscription:', {
        error,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        userId,
        updates,
      });
      return null;
    }
    
    console.log('✅ Subscription created successfully in database:', {
      subscriptionId: data.id,
      userId: data.user_id,
      planType: data.plan_type,
      status: data.status,
      stripeSubscriptionId: data.stripe_subscription_id,
      table: 'subscriptions',
    });
    return data;
  }
  
  // Update existing subscription
  // IMPORTANT: If status is 'pending', preserve it unless explicitly changing
  const updatesToApply = { ...updates };
  
  // If we're trying to set status to 'pending' and subscription exists, 
  // make sure we're not overriding an existing pending status incorrectly
  if (updates.status === 'pending' && existing.status !== 'pending') {
    console.log('Setting subscription to pending status:', { userId, previousStatus: existing.status });
  }
  
  console.log('Updating existing subscription:', { userId, updates: updatesToApply, currentStatus: existing.status });
  const { data, error } = await supabase
    .from('subscriptions')
    .update(updatesToApply)
    .eq('user_id', userId)
    .select()
    .single();
  
  if (error) {
    console.error('❌ Error updating subscription:', {
      error,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      userId,
      updates,
    });
    return null;
  }
  
  console.log('✅ Subscription updated successfully:', data);
  return data;
}

/**
 * Get subscription info with computed fields
 */
export async function getSubscriptionInfo(userId: string): Promise<SubscriptionInfo | null> {
  console.log('📋 Getting subscription info for user:', userId);
  const subscription = await getSubscription(userId);
  
  if (!subscription) {
    console.log('ℹ️ No subscription record found, returning null');
    return null;
  }
  
  console.log('📋 Processing subscription info:', {
    status: subscription.status,
    plan_type: subscription.plan_type,
    isPending: subscription.status === 'pending',
  });
  
  const now = new Date();
  const trialEndsAt = subscription.trial_ends_at ? new Date(subscription.trial_ends_at) : null;
  const currentPeriodEnd = subscription.current_period_end ? new Date(subscription.current_period_end) : null;
  const canceledAt = subscription.canceled_at ? new Date(subscription.canceled_at) : null;
  const updatedAt = subscription.updated_at ? new Date(subscription.updated_at) : null;
  
  // Check if subscription has been expired/cancelled for more than 1 month
  // If so, treat as no subscription (refresh state after 1 month)
  if (subscription.status === 'expired' || subscription.status === 'canceled') {
    // Use the most recent date: current_period_end, canceled_at, or updated_at
    const expirationDate = currentPeriodEnd || canceledAt || updatedAt || new Date(subscription.created_at);
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    // If expired/cancelled more than 1 month ago (expiration date is more than 1 month in the past), treat as no subscription
    if (expirationDate < oneMonthAgo) {
      console.log(`Subscription for user ${subscription.user_id} expired/cancelled more than 1 month ago (${expirationDate.toISOString()}) - treating as no subscription`);
      return null;
    }
  }
  
  // Determine if subscription is active
  let isActive = false;
  let isExpired = false;
  
  if (subscription.status === 'active') {
    if (currentPeriodEnd && now < currentPeriodEnd) {
      isActive = true;
    } else {
      isExpired = true;
    }
  } else if (subscription.status === 'trial') {
    if (trialEndsAt && now < trialEndsAt) {
      isActive = true;
    } else {
      isExpired = true;
    }
  } else if (subscription.status === 'pending') {
    // Pending subscriptions are not active yet, but also not expired
    isActive = false;
    isExpired = false;
  } else if (subscription.status === 'expired' || subscription.status === 'canceled') {
    isExpired = true;
  }
  
  return {
    planType: subscription.plan_type,
    status: subscription.status,
    trialEndsAt,
    currentPeriodEnd,
    isActive,
    isTrial: subscription.status === 'trial',
    isExpired,
  };
}

/**
 * Check if user can perform an action based on their subscription
 * Auto-creates trial subscription for admins without subscription
 * Super admins bypass all subscription checks
 */
export async function checkSubscriptionAccess(userId: string): Promise<{
  allowed: boolean;
  subscription: SubscriptionInfo | null;
  error?: string;
  showUpgradeModal?: boolean;
}> {
  // Check if user is super admin - bypass all subscription checks
  const supabase = createAdminClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, email')
    .eq('id', userId)
    .single();
  
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'hassanrashid001@icloud.com';
  const isSuperAdmin = profile?.role === 'super_admin' || 
                      profile?.email === superAdminEmail;
  
  if (isSuperAdmin) {
    // Super admin has full access, no subscription required
    return {
      allowed: true,
      subscription: null,
    };
  }
  
  let subscription = await getSubscriptionInfo(userId);
  
  if (!subscription) {
    // No subscription found - auto-create trial for admins
    console.log('No subscription found, attempting to create trial...');
    const trialSub = await createTrialSubscription(userId);
    
    if (trialSub) {
      subscription = await getSubscriptionInfo(userId);
      if (subscription) {
        console.log('✅ Trial subscription auto-created for admin');
      }
    }
    
    // If still no subscription, allow access but show upgrade prompt
    if (!subscription) {
      return {
        allowed: true, // Allow access but with restrictions
        subscription: null,
        error: 'No subscription found. You are on a free trial with limited features.',
        showUpgradeModal: true,
      };
    }
  }
  
  // For trial subscriptions, allow access even if expired (but show upgrade prompts)
  if (subscription.status === 'trial') {
    if (subscription.isExpired) {
      return {
        allowed: true, // Still allow access but show upgrade modal
        subscription,
        error: 'Your trial has expired. Upgrade to continue with full access.',
        showUpgradeModal: true,
      };
    }
    // Trial is active
    return {
      allowed: true,
      subscription,
    };
  }
  
  // For paid subscriptions
  if (subscription.isExpired) {
    return {
      allowed: false,
      subscription,
      error: 'Your subscription has expired. Please upgrade to continue using the service.',
      showUpgradeModal: true,
    };
  }
  
  // Check if subscription is not active and not in trial or pending state
  const isTrialOrPending = subscription.isTrial || subscription.status === 'pending';
  if (!subscription.isActive && !isTrialOrPending) {
    return {
      allowed: false,
      subscription,
      error: 'Your subscription is not active. Please update your payment method.',
      showUpgradeModal: true,
    };
  }
  
  return {
    allowed: true,
    subscription,
  };
}

/**
 * Get current usage counts for a user
 * Note: This assumes tables have admin_id column. If not, you'll need to add it.
 */
export async function getUsageCounts(userId: string): Promise<{
  customers: number;
  workers: number;
  products: number;
}> {
  try {
    const supabase = createAdminClient();
    
    // Helper function to safely get count
    const getCount = async (table: string, column: string = 'admin_id'): Promise<number> => {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('id', { count: 'exact', head: true })
          .eq(column, userId);
        
        if (error) {
          console.warn(`Error counting ${table}:`, error.message);
          return 0;
        }
        
        return count || 0;
      } catch (error) {
        console.warn(`Exception counting ${table}:`, error);
        return 0;
      }
    };
    
    // Get counts for all tables
    const [customers, workers, products] = await Promise.all([
      getCount('Customers', 'admin_id'),
      getCount('Workers', 'admin_id'),
      getCount('products', 'admin_id'),
    ]);
    
    return {
      customers,
      workers,
      products,
    };
  } catch (error) {
    console.error('Error creating admin client for usage counts:', error);
    throw error; // Re-throw to be caught by API route
  }
}

