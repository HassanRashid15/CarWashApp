import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/server';
import { updateSubscription, getSubscription } from '@/lib/utils/subscription-helpers';
import { sendPlanPurchaseNotification } from '@/lib/emails/subscription-emails';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    console.log('🔔 Webhook received');
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('❌ No signature in webhook request');
      return NextResponse.json(
        { error: 'No signature' },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      console.log(`✅ Webhook verified: ${event.type} (ID: ${event.id})`);
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        console.log('📝 Processing checkout.session.completed event');
        const session = event.data.object as Stripe.Checkout.Session;
        
        console.log('Session details:', {
          id: session.id,
          mode: session.mode,
          subscription: session.subscription,
          metadata: session.metadata,
        });
        
        if (session.mode === 'subscription' && session.subscription) {
          console.log('Retrieving subscription details...');
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );
          
          console.log('Subscription details:', {
            id: subscription.id,
            status: subscription.status,
            customer: subscription.customer,
            metadata: subscription.metadata,
          });
          
          const userId = session.metadata?.userId || subscription.metadata?.userId;
          const planType = session.metadata?.planType || subscription.metadata?.planType;
          
          console.log('Extracted metadata:', { userId, planType });
          
          if (!userId || !planType) {
            console.error('❌ Missing userId or planType in metadata', {
              sessionMetadata: session.metadata,
              subscriptionMetadata: subscription.metadata,
            });
            return NextResponse.json(
              { error: 'Missing userId or planType in metadata', received: true },
              { status: 400 }
            );
          }

          console.log(`💾 Saving subscription to database for user ${userId}, plan: ${planType}`);
          
          // Check if subscription already exists (might be trial)
          const existing = await getSubscription(userId);
          console.log('Existing subscription check:', { 
            exists: !!existing, 
            existingStatus: existing?.status,
            existingId: existing?.id 
          });
          
          // Create or update subscription in database with 'pending' status
          // Super admin will need to approve it before it becomes active
          // If subscription exists, we need to update it to pending (replacing trial or previous status)
          try {
            const result = await updateSubscription(userId, {
              plan_type: planType as any,
              status: 'pending', // Set as pending for super admin approval
              stripe_subscription_id: subscription.id,
              stripe_customer_id: subscription.customer as string,
              stripe_price_id: subscription.items.data[0]?.price.id || null,
              current_period_start: null, // Will be set when approved
              current_period_end: null, // Will be set when approved
              trial_ends_at: null, // Clear trial end date when upgrading to paid plan
            });

            if (result) {
              console.log(`✅ Subscription ${existing ? 'updated' : 'created'} successfully for user ${userId}, plan: ${planType}`, {
                subscriptionId: result.id,
                status: result.status,
                previousStatus: existing?.status,
                wasExisting: !!existing,
                databaseRecord: {
                  id: result.id,
                  user_id: result.user_id,
                  plan_type: result.plan_type,
                  status: result.status,
                  stripe_subscription_id: result.stripe_subscription_id,
                  created_at: result.created_at,
                  updated_at: result.updated_at,
                },
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
                  await sendPlanPurchaseNotification(userId, planType, amount);
                  console.log(`📧 Plan purchase notification email sent to user ${userId}`);
                }
              } catch (emailError) {
                console.error('Error sending plan purchase notification email:', emailError);
                // Don't fail the webhook if email fails
              }
            } else {
              console.error(`❌ Failed to save subscription for user ${userId}, plan: ${planType}`, {
                userId,
                planType,
                stripeSubscriptionId: subscription.id,
                existingSubscription: existing,
                updatesAttempted: {
                  plan_type: planType,
                  status: 'pending',
                  stripe_subscription_id: subscription.id,
                  stripe_customer_id: subscription.customer as string,
                },
              });
              return NextResponse.json(
                { error: 'Failed to save subscription', received: true },
                { status: 500 }
              );
            }
          } catch (dbError) {
            console.error(`❌ Database error when saving subscription for user ${userId}:`, {
              error: dbError,
              userId,
              planType,
              stripeSubscriptionId: subscription.id,
              errorMessage: dbError instanceof Error ? dbError.message : 'Unknown error',
              errorStack: dbError instanceof Error ? dbError.stack : undefined,
            });
            return NextResponse.json(
              { error: 'Database error when saving subscription', received: true, details: dbError instanceof Error ? dbError.message : 'Unknown error' },
              { status: 500 }
            );
          }
        } else {
          console.log('⚠️ Session is not a subscription or missing subscription ID', {
            mode: session.mode,
            hasSubscription: !!session.subscription,
          });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        
        if (!userId) {
          console.error('Missing userId in subscription metadata');
          break;
        }

        // Check if subscription is already pending - don't override it
        const existing = await getSubscription(userId);
        if (existing?.status === 'pending') {
          console.log(`Subscription for user ${userId} is pending approval - not updating status`);
          break;
        }

        const planType = subscription.metadata?.planType || 'starter';
        let status: 'active' | 'canceled' | 'expired' | 'past_due' = 'active';

        if (subscription.status === 'canceled') {
          status = 'canceled';
        } else if (subscription.status === 'past_due') {
          status = 'past_due';
        } else if (subscription.status === 'unpaid' || subscription.status === 'incomplete_expired') {
          status = 'expired';
        }

        await updateSubscription(userId, {
          plan_type: planType as any,
          status: status,
          stripe_subscription_id: subscription.id,
          stripe_customer_id: subscription.customer as string,
          stripe_price_id: subscription.items.data[0]?.price.id || null,
          current_period_start: (subscription as any).current_period_start ? new Date((subscription as any).current_period_start * 1000).toISOString() : null,
          current_period_end: (subscription as any).current_period_end ? new Date((subscription as any).current_period_end * 1000).toISOString() : null,
          canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
        });

        console.log(`Subscription updated for user ${userId}, status: ${status}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        
        if (!userId) {
          console.error('Missing userId in subscription metadata');
          break;
        }

        await updateSubscription(userId, {
          status: 'expired',
          canceled_at: new Date().toISOString(),
        });

        console.log(`Subscription canceled for user ${userId}`);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = (invoice as any).subscription as string;
        
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const userId = subscription.metadata?.userId;
          
          if (userId) {
            // Check if subscription is pending - don't override it
            const existing = await getSubscription(userId);
            if (existing?.status === 'pending') {
              console.log(`Subscription for user ${userId} is pending approval - not activating on payment`);
              break;
            }
            
            await updateSubscription(userId, {
              status: 'active',
              current_period_start: (subscription as any).current_period_start ? new Date((subscription as any).current_period_start * 1000).toISOString() : null,
              current_period_end: (subscription as any).current_period_end ? new Date((subscription as any).current_period_end * 1000).toISOString() : null,
            });
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        console.log('📝 Processing invoice.payment_failed event');
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = (invoice as any).subscription as string;
        
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const userId = subscription.metadata?.userId;
          
          if (userId) {
            await updateSubscription(userId, {
              status: 'past_due',
            });
            console.log(`Subscription marked as past_due for user ${userId}`);
          }
        }
        break;
      }

      case 'invoice.paid':
      case 'invoice_payment.paid': {
        // These are aliases for invoice.payment_succeeded in some Stripe API versions
        console.log(`📝 Processing ${event.type} event (alias for invoice.payment_succeeded)`);
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = (invoice as any).subscription as string;
        
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const userId = subscription.metadata?.userId;
          
          if (userId) {
            // Check if subscription is pending - don't override it
            const existing = await getSubscription(userId);
            if (existing?.status === 'pending') {
              console.log(`Subscription for user ${userId} is pending approval - not activating on payment`);
              break;
            }
            
            await updateSubscription(userId, {
              status: 'active',
              current_period_start: (subscription as any).current_period_start ? new Date((subscription as any).current_period_start * 1000).toISOString() : null,
              current_period_end: (subscription as any).current_period_end ? new Date((subscription as any).current_period_end * 1000).toISOString() : null,
            });
            console.log(`Subscription updated for user ${userId} from ${event.type}`);
          }
        }
        break;
      }

      default:
        console.log(`⚠️ Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}

