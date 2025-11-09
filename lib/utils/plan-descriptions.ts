/**
 * Single source of truth for plan descriptions and features
 * Use this file to ensure consistency across the entire application
 */

export const PLAN_DESCRIPTIONS = {
  starter: {
    name: 'Starter',
    price: 29,
    period: 'month',
    maxCustomers: 15,
    features: [
      'Up to 15 customers',
      'Basic queue management',
      'Worker management',
      'Email support',
      'Basic reports',
    ],
    description: 'Perfect for small businesses',
  },
  professional: {
    name: 'Professional',
    price: 79,
    period: 'month',
    maxCustomers: 50,
    features: [
      'Up to 50 customers',
      'Advanced queue system',
      'Full worker management',
      'Inventory tracking',
      'Payment processing',
      'Priority support',
      'Advanced analytics',
    ],
    description: 'Perfect for growing businesses',
  },
  enterprise: {
    name: 'Enterprise',
    price: 199,
    period: 'month',
    maxCustomers: null, // Unlimited
    features: [
      'Unlimited customers',
      'Everything in Professional',
      'Multi-location support',
      'Custom integrations',
      'Dedicated account manager',
      '24/7 phone support',
      'Custom reporting',
      'API access',
      'White-label options',
    ],
    description: 'Perfect for large enterprises',
  },
} as const;

