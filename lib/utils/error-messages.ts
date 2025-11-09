/**
 * User-friendly error messages
 * Maps technical errors to user-friendly messages
 */

export interface ErrorContext {
  action?: string;
  resource?: string;
  userId?: string;
  [key: string]: any;
}

export class UserFriendlyError extends Error {
  constructor(
    message: string,
    public userMessage: string,
    public code?: string,
    public statusCode: number = 500,
    public context?: ErrorContext
  ) {
    super(message);
    this.name = 'UserFriendlyError';
  }
}

/**
 * Get user-friendly error message from error
 */
export function getUserFriendlyMessage(error: unknown): string {
  if (error instanceof UserFriendlyError) {
    return error.userMessage;
  }

  if (error instanceof Error) {
    // Map common error messages to user-friendly versions
    const errorMessage = error.message.toLowerCase();

    // Database errors
    if (errorMessage.includes('duplicate key') || errorMessage.includes('unique constraint')) {
      return 'This record already exists. Please check for duplicates.';
    }

    if (errorMessage.includes('foreign key constraint') || errorMessage.includes('violates foreign key')) {
      return 'This action cannot be completed because it references data that no longer exists.';
    }

    if (errorMessage.includes('not null constraint') || errorMessage.includes('null value')) {
      return 'Please fill in all required fields.';
    }

    // Authentication errors
    if (errorMessage.includes('unauthorized') || errorMessage.includes('authentication')) {
      return 'You need to sign in to perform this action.';
    }

    if (errorMessage.includes('forbidden') || errorMessage.includes('permission denied')) {
      return 'You do not have permission to perform this action.';
    }

    if (errorMessage.includes('session') && errorMessage.includes('expired')) {
      return 'Your session has expired. Please sign in again.';
    }

    // Subscription errors
    if (errorMessage.includes('subscription') && errorMessage.includes('expired')) {
      return 'Your subscription has expired. Please renew to continue using this feature.';
    }

    if (errorMessage.includes('subscription') && errorMessage.includes('limit')) {
      return 'You have reached your plan limit. Please upgrade to continue.';
    }

    if (errorMessage.includes('subscription') && errorMessage.includes('required')) {
      return 'This feature requires an active subscription. Please upgrade your plan.';
    }

    // Payment errors
    if (errorMessage.includes('stripe') || errorMessage.includes('payment')) {
      if (errorMessage.includes('card')) {
        return 'There was an issue with your payment method. Please check your card details and try again.';
      }
      if (errorMessage.includes('insufficient')) {
        return 'Insufficient funds. Please use a different payment method.';
      }
      return 'Payment processing failed. Please try again or contact support.';
    }

    // Network errors
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return 'Network error. Please check your internet connection and try again.';
    }

    if (errorMessage.includes('timeout')) {
      return 'The request took too long. Please try again.';
    }

    // Validation errors
    if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
      return 'Please check your input and try again.';
    }

    // Rate limiting
    if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
      return 'Too many requests. Please wait a moment and try again.';
    }

    // Generic fallback
    return 'Something went wrong. Please try again or contact support if the problem persists.';
  }

  return 'An unexpected error occurred. Please try again.';
}

/**
 * Create a user-friendly error
 */
export function createUserFriendlyError(
  technicalMessage: string,
  userMessage: string,
  code?: string,
  statusCode: number = 500,
  context?: ErrorContext
): UserFriendlyError {
  return new UserFriendlyError(technicalMessage, userMessage, code, statusCode, context);
}

/**
 * Common error messages
 */
export const ErrorMessages = {
  // Authentication
  UNAUTHORIZED: 'You need to sign in to perform this action.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  SESSION_EXPIRED: 'Your session has expired. Please sign in again.',

  // Subscription
  SUBSCRIPTION_EXPIRED: 'Your subscription has expired. Please renew to continue.',
  SUBSCRIPTION_LIMIT_REACHED: 'You have reached your plan limit. Please upgrade to continue.',
  SUBSCRIPTION_REQUIRED: 'This feature requires an active subscription. Please upgrade your plan.',
  TRIAL_EXPIRED: 'Your trial has expired. Please subscribe to continue using the service.',

  // Payment
  PAYMENT_FAILED: 'Payment processing failed. Please try again or contact support.',
  PAYMENT_METHOD_INVALID: 'There was an issue with your payment method. Please check your card details.',
  INSUFFICIENT_FUNDS: 'Insufficient funds. Please use a different payment method.',

  // Resource
  NOT_FOUND: 'The requested resource was not found.',
  ALREADY_EXISTS: 'This record already exists.',
  INVALID_INPUT: 'Please check your input and try again.',

  // Network
  NETWORK_ERROR: 'Network error. Please check your internet connection and try again.',
  TIMEOUT: 'The request took too long. Please try again.',

  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please wait a moment and try again.',

  // Generic
  GENERIC_ERROR: 'Something went wrong. Please try again or contact support if the problem persists.',
  UNEXPECTED_ERROR: 'An unexpected error occurred. Please try again.',
};

