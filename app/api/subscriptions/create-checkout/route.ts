import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';
import { getSubscription } from '@/lib/utils/subscription-helpers';
import { validateTestMode } from '@/lib/utils/test-mode';

// Helper function to get Stripe instance
function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-10-29.clover',
  });
}

export async function POST(request: NextRequest) {
  try {
    // Check Stripe configuration first
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY is missing');
      return NextResponse.json(
        { error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables.' },
        { status: 500 }
      );
    }

    // Validate we're using test keys (prevent accidental live mode)
    try {
      validateTestMode();
    } catch (error) {
      console.error('Test mode validation failed:', error);
      return NextResponse.json(
        { 
          error: 'Test mode validation failed',
          details: error instanceof Error ? error.message : 'Please use Stripe test keys (sk_test_... and pk_test_...)',
          note: 'This application is currently in testing phase. Live keys are not allowed.'
        },
        { status: 500 }
      );
    }

    // Parse request body
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in to continue.' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const { planType } = requestBody;

    // Validate plan type
    if (!['starter', 'professional', 'enterprise'].includes(planType)) {
      return NextResponse.json(
        { error: 'Invalid plan type' },
        { status: 400 }
      );
    }

    // Get user email
    const userEmail = session.user.email;
    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email not found' },
        { status: 400 }
      );
    }

    // Initialize Stripe
    const stripe = getStripe();

    // Get existing subscription
    const existingSubscription = await getSubscription(userId);

    // Stripe Price IDs - Must be set in environment variables
    const priceIds: Record<string, string | undefined> = {
      starter: process.env.STRIPE_PRICE_ID_STARTER,
      professional: process.env.STRIPE_PRICE_ID_PROFESSIONAL,
      enterprise: process.env.STRIPE_PRICE_ID_ENTERPRISE,
    };

    const priceId = priceIds[planType];
    
    // Validate price ID
    if (!priceId) {
      console.error('Missing price ID for plan:', { planType, envVars: priceIds });
      return NextResponse.json(
        { 
          error: `Price ID not configured for ${planType} plan. Please set STRIPE_PRICE_ID_${planType.toUpperCase()} in your .env.local file.`,
          details: 'See SUBSCRIPTION_SETUP.md for instructions on setting up Stripe.'
        },
        { status: 500 }
      );
    }
    
    // Validate price ID format (should start with 'price_')
    if (!priceId.startsWith('price_')) {
      console.error('Invalid price ID format:', { planType, priceId });
      return NextResponse.json(
        { 
          error: `Invalid price ID format for ${planType} plan. Price ID should start with 'price_'.`,
          details: `Current value: ${priceId}`
        },
        { status: 500 }
      );
    }

    // Create or retrieve Stripe customer
    let customerId: string;
    
    if (existingSubscription?.stripe_customer_id) {
      customerId = existingSubscription.stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          userId: userId,
        },
      });
      customerId = customer.id;
    }

    // Create Stripe Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?purchase=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?purchase=cancelled`,
      metadata: {
        userId: userId,
        planType: planType,
      },
      subscription_data: {
        metadata: {
          userId: userId,
          planType: planType,
        },
      },
    });

    if (!checkoutSession.url) {
      console.error('Checkout session created but no URL returned:', checkoutSession);
      return NextResponse.json(
        { error: 'Failed to create checkout URL. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    
    // Provide more helpful error messages
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Check for common Stripe errors
    if (errorMessage.includes('No such price')) {
      return NextResponse.json(
        { 
          error: 'Invalid price ID. Please check your Stripe Price IDs in environment variables.',
          details: errorMessage
        },
        { status: 400 }
      );
    }
    
    if (errorMessage.includes('Invalid API Key')) {
      return NextResponse.json(
        { 
          error: 'Invalid Stripe API key. Please check your STRIPE_SECRET_KEY in environment variables.',
          details: 'Make sure you are using the correct key (test or live)'
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to create checkout session',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}

