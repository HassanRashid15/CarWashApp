/**
 * Basic analytics tracking system
 * 
 * This is a simple analytics tracker that can be extended
 * to integrate with Google Analytics, Mixpanel, PostHog, etc.
 */

interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  userId?: string;
  timestamp?: number;
}

class AnalyticsTracker {
  private enabled: boolean;
  private userId: string | null = null;

  constructor() {
    // Enable analytics in production or if explicitly enabled
    this.enabled = 
      process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === 'true' ||
      process.env.NODE_ENV === 'production';
  }

  /**
   * Set user ID for tracking
   */
  setUserId(userId: string) {
    this.userId = userId;
  }

  /**
   * Track a page view
   */
  trackPageView(path: string, title?: string) {
    if (!this.enabled) return;

    const event: AnalyticsEvent = {
      name: 'page_view',
      properties: {
        path,
        title: title || document.title,
      },
      userId: this.userId || undefined,
      timestamp: Date.now(),
    };

    this.sendEvent(event);
  }

  /**
   * Track a custom event
   */
  trackEvent(eventName: string, properties?: Record<string, any>) {
    if (!this.enabled) return;

    const event: AnalyticsEvent = {
      name: eventName,
      properties,
      userId: this.userId || undefined,
      timestamp: Date.now(),
    };

    this.sendEvent(event);
  }

  /**
   * Track subscription events
   */
  trackSubscription(action: 'upgraded' | 'downgraded' | 'cancelled' | 'renewed', planType: string) {
    this.trackEvent('subscription_' + action, {
      plan_type: planType,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track feature usage
   */
  trackFeatureUsage(featureName: string, action: string = 'accessed') {
    this.trackEvent('feature_used', {
      feature: featureName,
      action,
    });
  }

  /**
   * Track conversion events
   */
  trackConversion(type: 'trial_to_paid' | 'plan_upgrade' | 'plan_downgrade', value?: number) {
    this.trackEvent('conversion', {
      type,
      value,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track customer limit reached
   */
  trackLimitReached(limitType: 'customers' | 'workers' | 'products', currentCount: number, maxLimit: number) {
    this.trackEvent('limit_reached', {
      limit_type: limitType,
      current_count: currentCount,
      max_limit: maxLimit,
    });
  }

  /**
   * Send event to analytics service
   * This can be extended to send to Google Analytics, Mixpanel, etc.
   */
  private sendEvent(event: AnalyticsEvent) {
    // In development, log to console
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Analytics Event:', event);
    }

    // Send to your analytics API endpoint
    if (typeof window !== 'undefined') {
      // Client-side: Send to API route
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }).catch((error) => {
        // Silently fail - don't break the app if analytics fails
        if (process.env.NODE_ENV === 'development') {
          console.warn('Analytics tracking failed:', error);
        }
      });
    }
  }
}

// Export singleton instance
export const analytics = new AnalyticsTracker();

// Convenience functions
export const trackPageView = (path: string, title?: string) => {
  analytics.trackPageView(path, title);
};

export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  analytics.trackEvent(eventName, properties);
};

export const trackSubscription = (action: 'upgraded' | 'downgraded' | 'cancelled' | 'renewed', planType: string) => {
  analytics.trackSubscription(action, planType);
};

export const trackFeatureUsage = (featureName: string, action?: string) => {
  analytics.trackFeatureUsage(featureName, action);
};

export const trackConversion = (type: 'trial_to_paid' | 'plan_upgrade' | 'plan_downgrade', value?: number) => {
  analytics.trackConversion(type, value);
};

export const trackLimitReached = (limitType: 'customers' | 'workers' | 'products', currentCount: number, maxLimit: number) => {
  analytics.trackLimitReached(limitType, currentCount, maxLimit);
};

