/**
 * Enhanced analytics tracking
 */

import { trackEvent } from './tracker';

/**
 * Track page view
 */
export function trackPageView(path: string, userId?: string) {
  return trackEvent('page_view', {
    path,
    userId,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track user action
 */
export function trackUserAction(
  action: string,
  properties?: Record<string, any>
) {
  return trackEvent('user_action', {
    action,
    ...properties,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track subscription events
 */
export function trackSubscriptionEvent(
  event: 'subscription_created' | 'subscription_updated' | 'subscription_canceled' | 'subscription_renewed',
  planType: string,
  userId: string,
  properties?: Record<string, any>
) {
  return trackEvent('subscription_event', {
    event,
    planType,
    userId,
    ...properties,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track payment events
 */
export function trackPaymentEvent(
  event: 'payment_initiated' | 'payment_succeeded' | 'payment_failed',
  amount: number,
  currency: string = 'USD',
  properties?: Record<string, any>
) {
  return trackEvent('payment_event', {
    event,
    amount,
    currency,
    ...properties,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track feature usage
 */
export function trackFeatureUsage(
  feature: string,
  userId: string,
  properties?: Record<string, any>
) {
  return trackEvent('feature_usage', {
    feature,
    userId,
    ...properties,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track conversion events
 */
export function trackConversion(
  conversionType: 'trial_to_paid' | 'plan_upgrade' | 'plan_downgrade' | 'signup',
  userId: string,
  properties?: Record<string, any>
) {
  return trackEvent('conversion', {
    conversionType,
    userId,
    ...properties,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track error events
 */
export function trackError(
  error: Error,
  context?: Record<string, any>
) {
  return trackEvent('error', {
    errorMessage: error.message,
    errorName: error.name,
    errorStack: error.stack,
    ...context,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track performance metrics
 */
export function trackPerformance(
  metric: string,
  value: number,
  unit: string = 'ms',
  properties?: Record<string, any>
) {
  return trackEvent('performance', {
    metric,
    value,
    unit,
    ...properties,
    timestamp: new Date().toISOString(),
  });
}

