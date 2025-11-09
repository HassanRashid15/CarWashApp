/**
 * Analytics event definitions
 * Centralized event names for consistency
 */

export const AnalyticsEvents = {
  // Page views
  PAGE_VIEW: 'page_view',
  
  // Authentication
  USER_SIGNED_UP: 'user_signed_up',
  USER_LOGGED_IN: 'user_logged_in',
  USER_LOGGED_OUT: 'user_logged_out',
  
  // Subscription
  SUBSCRIPTION_UPGRADED: 'subscription_upgraded',
  SUBSCRIPTION_DOWNGRADED: 'subscription_downgraded',
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled',
  SUBSCRIPTION_RENEWED: 'subscription_renewed',
  PLAN_SELECTED: 'plan_selected',
  CHECKOUT_STARTED: 'checkout_started',
  CHECKOUT_COMPLETED: 'checkout_completed',
  
  // Features
  FEATURE_USED: 'feature_used',
  FEATURE_LOCKED: 'feature_locked',
  FEATURE_UNLOCKED: 'feature_unlocked',
  
  // Customers
  CUSTOMER_CREATED: 'customer_created',
  CUSTOMER_UPDATED: 'customer_updated',
  CUSTOMER_DELETED: 'customer_deleted',
  CUSTOMER_LIMIT_REACHED: 'customer_limit_reached',
  CUSTOMER_LIMIT_WARNING: 'customer_limit_warning',
  
  // Workers
  WORKER_CREATED: 'worker_created',
  WORKER_UPDATED: 'worker_updated',
  WORKER_DELETED: 'worker_deleted',
  
  // Queue
  QUEUE_ENTRY_CREATED: 'queue_entry_created',
  QUEUE_ENTRY_UPDATED: 'queue_entry_updated',
  QUEUE_ENTRY_COMPLETED: 'queue_entry_completed',
  
  // Payments
  PAYMENT_RECORDED: 'payment_recorded',
  PAYMENT_UPDATED: 'payment_updated',
  
  // Products
  PRODUCT_CREATED: 'product_created',
  PRODUCT_UPDATED: 'product_updated',
  PRODUCT_LOW_STOCK: 'product_low_stock',
  
  // Conversions
  CONVERSION_TRIAL_TO_PAID: 'conversion_trial_to_paid',
  CONVERSION_PLAN_UPGRADE: 'conversion_plan_upgrade',
  CONVERSION_PLAN_DOWNGRADE: 'conversion_plan_downgrade',
  
  // Errors
  ERROR_OCCURRED: 'error_occurred',
  API_ERROR: 'api_error',
  
  // User actions
  SETTINGS_UPDATED: 'settings_updated',
  PROFILE_UPDATED: 'profile_updated',
  EMAIL_NOTIFICATION_TOGGLED: 'email_notification_toggled',
} as const;

export type AnalyticsEventName = typeof AnalyticsEvents[keyof typeof AnalyticsEvents];

