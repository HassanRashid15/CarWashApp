/**
 * Plan limits and subscription management utilities
 */

export type PlanType = 'starter' | 'professional' | 'enterprise' | 'trial';
export type SubscriptionStatus = 'trial' | 'active' | 'canceled' | 'expired' | 'past_due' | 'pending';

export interface PlanLimits {
  maxCustomers: number | null; // null means unlimited
  maxWorkers: number | null;
  maxProducts: number | null;
  maxLocations: number | null;
  features: {
    basicQueueManagement: boolean;
    advancedQueueSystem: boolean;
    workerManagement: boolean;
    inventoryTracking: boolean;
    paymentProcessing: boolean;
    basicReports: boolean;
    advancedAnalytics: boolean;
    monitoring: boolean;
    customerFeedback: boolean;
    multiLocationSupport: boolean;
    customIntegrations: boolean;
    apiAccess: boolean;
    whiteLabelOptions: boolean;
  };
}

export interface SubscriptionInfo {
  planType: PlanType;
  status: SubscriptionStatus;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  isActive: boolean;
  isTrial: boolean;
  isExpired: boolean;
}

/**
 * Plan limits configuration
 */
export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  trial: {
    maxCustomers: 2, // Free trial - 2 customers only
    maxWorkers: null, // Unlimited during trial
    maxProducts: null,
    maxLocations: 1,
    features: {
      basicQueueManagement: true,
      advancedQueueSystem: false,
      workerManagement: true,
      inventoryTracking: false,
      paymentProcessing: false,
      basicReports: true,
      advancedAnalytics: false,
      monitoring: false,
      customerFeedback: false,
      multiLocationSupport: false,
      customIntegrations: false,
      apiAccess: false,
      whiteLabelOptions: false,
    },
  },
  starter: {
    maxCustomers: 15, // Basic/Test plan - up to 15 customers
    maxWorkers: null, // Unlimited
    maxProducts: null,
    maxLocations: 1,
    features: {
      basicQueueManagement: true,
      advancedQueueSystem: false,
      workerManagement: true,
      inventoryTracking: false,
      paymentProcessing: false,
      basicReports: true,
      advancedAnalytics: false,
      monitoring: false,
      customerFeedback: false,
      multiLocationSupport: false,
      customIntegrations: false,
      apiAccess: false,
      whiteLabelOptions: false,
    },
  },
  professional: {
    maxCustomers: 50, // Professional plan - up to 50 customers
    maxWorkers: null,
    maxProducts: null,
    maxLocations: null,
    features: {
      basicQueueManagement: true,
      advancedQueueSystem: true,
      workerManagement: true,
      inventoryTracking: true,
      paymentProcessing: true,
      basicReports: true,
      advancedAnalytics: true,
      monitoring: true,
      customerFeedback: true,
      multiLocationSupport: true,
      customIntegrations: false,
      apiAccess: false,
      whiteLabelOptions: false,
    },
  },
  enterprise: {
    maxCustomers: null, // Unlimited
    maxWorkers: null,
    maxProducts: null,
    maxLocations: null,
    features: {
      basicQueueManagement: true,
      advancedQueueSystem: true,
      workerManagement: true,
      inventoryTracking: true,
      paymentProcessing: true,
      basicReports: true,
      advancedAnalytics: true,
      monitoring: true,
      customerFeedback: true,
      multiLocationSupport: true,
      customIntegrations: true,
      apiAccess: true,
      whiteLabelOptions: true,
    },
  },
};

/**
 * Get plan limits for a given plan type
 */
export function getPlanLimits(planType: PlanType): PlanLimits {
  return PLAN_LIMITS[planType] || PLAN_LIMITS.starter;
}

/**
 * Check if a feature is available in a plan
 */
export function hasFeature(planType: PlanType, feature: keyof PlanLimits['features']): boolean {
  const limits = getPlanLimits(planType);
  return limits.features[feature] || false;
}

/**
 * Check if count is within plan limit
 */
export function isWithinLimit(
  planType: PlanType,
  limitType: 'maxCustomers' | 'maxWorkers' | 'maxProducts' | 'maxLocations',
  currentCount: number
): boolean {
  const limits = getPlanLimits(planType);
  const limit = limits[limitType];
  
  // null means unlimited
  if (limit === null) {
    return true;
  }
  
  return currentCount < limit;
}

/**
 * Get the limit value for a plan
 */
export function getLimit(
  planType: PlanType,
  limitType: 'maxCustomers' | 'maxWorkers' | 'maxProducts' | 'maxLocations'
): number | null {
  const limits = getPlanLimits(planType);
  return limits[limitType];
}

/**
 * Check if subscription is active (not expired or canceled)
 */
export function isSubscriptionActive(subscription: SubscriptionInfo): boolean {
  if (subscription.status === 'active') {
    return true;
  }
  
  if (subscription.status === 'trial' && subscription.trialEndsAt) {
    return new Date() < subscription.trialEndsAt;
  }
  
  return false;
}

/**
 * Get days remaining in trial
 */
export function getTrialDaysRemaining(trialEndsAt: Date | null): number | null {
  if (!trialEndsAt) {
    return null;
  }
  
  const now = new Date();
  const end = new Date(trialEndsAt);
  const diff = end.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  
  return days > 0 ? days : 0;
}

/**
 * Plan pricing (for display)
 */
export const PLAN_PRICING = {
  starter: {
    price: 29,
    currency: 'USD',
    period: 'month',
  },
  professional: {
    price: 79,
    currency: 'USD',
    period: 'month',
  },
  enterprise: {
    price: 199,
    currency: 'USD',
    period: 'month',
  },
} as const;

