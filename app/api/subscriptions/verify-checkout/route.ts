import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import Stripe from 'stripe';
import { updateSubscription, getSubscription } from '@/lib/utils/subscription-helpers';
import { sendPlanPurchaseNotification } from '@/lib/emails/subscription-emails';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
});

/**
 * POST - Verify checkout and create subscription if webhook didn't fire
 * This is a fallback mechanism in case the webhook doesn't work
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const body = await request.json();
    const { sessionId } = body;

    // If no sessionId, try to find the user's latest subscription from Stripe customer
    if (!sessionId) {
      console.log('⚠️ No session ID provided, checking user\'s Stripe customer for subscriptions');
      
      // Get user's existing subscription to find Stripe customer ID
      const existing = await getSubscription(userId);
      let customerId = existing?.stripe_customer_id;
      
      // If no customer ID, try to find customer by email
      if (!customerId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          const customers = await stripe.customers.list({
            email: user.email,
            limit: 1,
          });
          
          if (customers.data.length > 0) {
            customerId = customers.data[0].id;
            console.log('📧 Found customer by email:', customerId);
          }
        }
      }
      
      if (customerId) {
        // List customer's subscriptions (check all statuses, not just active)
        const subscriptions = await stripe.subscriptions.list({
          customer: customerId,
          limit: 1,
        });

        if (subscriptions.data.length > 0) {
          const latestSubscription = subscriptions.data[0];
          console.log('📋 Found latest subscription:', latestSubscription.id);
          
          // Check if we already have this subscription in database
          if (existing?.stripe_subscription_id === latestSubscription.id) {
            return NextResponse.json({
              success: true,
              message: 'Subscription already exists',
              subscription: existing,
            });
          }

          // Create subscription record
          const planType = latestSubscription.metadata?.planType || 'starter';
          const result = await updateSubscription(userId, {
            plan_type: planType as any,
            status: 'pending',
            stripe_subscription_id: latestSubscription.id,
            stripe_customer_id: customerId,
            stripe_price_id: latestSubscription.items.data[0]?.price.id || null,
            current_period_start: null,
            current_period_end: null,
            trial_ends_at: null,
          });

          if (result) {
            return NextResponse.json({
              success: true,
              message: 'Subscription created from customer lookup',
              subscription: result,
            });
          }
        }
      }

      return NextResponse.json(
        { error: 'Session ID is required or no subscription found' },
        { status: 400 }
      );
    }

    console.log('🔍 Verifying checkout session:', sessionId);

    // Retrieve the checkout session from Stripe
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });

    if (checkoutSession.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Payment not completed', paymentStatus: checkoutSession.payment_status },
        { status: 400 }
      );
    }

    // Get metadata - IMPORTANT: Use userId from metadata (the actual purchaser)
    // This handles cases where user might have logged out/in between purchase and verification
    const userIdFromMetadata = checkoutSession.metadata?.userId || 
                               (checkoutSession.subscription as any)?.metadata?.userId;
    const planType = checkoutSession.metadata?.planType || 
                     (checkoutSession.subscription as any)?.metadata?.planType;

    console.log('🔍 User ID check:', {
      loggedInUserId: userId,
      metadataUserId: userIdFromMetadata,
      match: userIdFromMetadata === userId,
    });

    // Use the userId from metadata (the actual purchaser) instead of logged-in user
    // This ensures the subscription is created for the correct user who made the purchase
    const actualUserId = userIdFromMetadata || userId;

    if (!planType) {
      return NextResponse.json(
        { error: 'Plan type not found in checkout session' },
        { status: 400 }
      );
    }

    // Warn if user ID doesn't match (user might have logged in as different account)
    if (userIdFromMetadata && userIdFromMetadata !== userId) {
      console.warn('⚠️ User ID mismatch detected:', {
        loggedInUserId: userId,
        purchaserUserId: userIdFromMetadata,
        message: 'Subscription will be created for the purchaser, not the currently logged-in user',
      });
    }

    // Check if subscription already exists for the actual purchaser
    const existing = await getSubscription(actualUserId);
    
    // If subscription exists and has the same stripe_subscription_id, return success
    if (existing?.stripe_subscription_id && checkoutSession.subscription) {
      if (existing.stripe_subscription_id === checkoutSession.subscription) {
        console.log('✅ Subscription already exists:', existing.id);
        return NextResponse.json({
          success: true,
          message: 'Subscription already exists',
          subscription: existing,
        });
      }
    }

    // Get subscription details from Stripe
    let stripeSubscription;
    if (checkoutSession.subscription) {
      if (typeof checkoutSession.subscription === 'string') {
        stripeSubscription = await stripe.subscriptions.retrieve(checkoutSession.subscription);
      } else {
        stripeSubscription = checkoutSession.subscription as Stripe.Subscription;
      }
    } else {
      return NextResponse.json(
        { error: 'No subscription found in checkout session' },
        { status: 400 }
      );
    }

    console.log('💾 Creating subscription record for user:', actualUserId, {
      loggedInUserId: userId,
      usingMetadataUserId: actualUserId !== userId,
    });

    // Create or update subscription in database with 'pending' status
    // Use actualUserId (from metadata) to ensure subscription is created for the purchaser
    const result = await updateSubscription(actualUserId, {
      plan_type: planType as any,
      status: 'pending', // Set as pending for super admin approval
      stripe_subscription_id: stripeSubscription.id,
      stripe_customer_id: stripeSubscription.customer as string,
      stripe_price_id: stripeSubscription.items.data[0]?.price.id || null,
      current_period_start: null, // Will be set when approved
      current_period_end: null, // Will be set when approved
      trial_ends_at: null, // Clear trial end date when upgrading to paid plan
    });

    if (result) {
      console.log('✅ Subscription created/updated successfully:', {
        subscriptionId: result.id,
        status: result.status,
        planType: result.plan_type,
        userId: result.user_id,
        stripeSubscriptionId: result.stripe_subscription_id,
      });

      // Send email notification for plan purchase
      try {
        const planPrices: Record<string, number> = {
          starter: 29,
          professional: 79,
          enterprise: 199,
        };
        const amount = planPrices[planType as string] || 0;
        
        // Only send email if this is a new purchase (not an update)
        if (!existing || existing.status !== 'pending') {
          await sendPlanPurchaseNotification(actualUserId, planType, amount);
          console.log(`📧 Plan purchase notification email sent to user ${actualUserId}`);
        }
      } catch (emailError) {
        console.error('Error sending plan purchase notification email:', emailError);
        // Don't fail the request if email fails
      }

      return NextResponse.json({
        success: true,
        message: 'Subscription created successfully',
        subscription: result,
      });
    } else {
      console.error('❌ Failed to create subscription - updateSubscription returned null', {
        actualUserId,
        loggedInUserId: userId,
        planType,
        stripeSubscriptionId: stripeSubscription.id,
        checkoutSessionId: sessionId,
      });
      
      // Try to get more details about why it failed
      const existingCheck = await getSubscription(actualUserId);
      console.error('Current subscription state for purchaser:', existingCheck);
      
      return NextResponse.json(
        { 
          error: 'Failed to create subscription',
          details: 'updateSubscription returned null. Check server logs for database errors.',
          userId,
          planType,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('❌ Error verifying checkout:', error);
    return NextResponse.json(
      { 
        error: 'Failed to verify checkout',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

