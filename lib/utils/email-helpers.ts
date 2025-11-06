import { createAdminClient } from '@/lib/supabase/server';

/**
 * Check if user has email notifications enabled
 * @param userId - User ID to check preferences for
 * @param notificationType - Type of notification to check (email_notifications_enabled, queue_notifications, etc.)
 * @returns boolean - true if notifications are enabled, false otherwise
 */
export async function shouldSendEmailNotification(
  userId: string,
  notificationType: 'email_notifications_enabled' | 'queue_notifications' | 'payment_notifications' | 'worker_assignments' | 'security_alerts' = 'email_notifications_enabled'
): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    
    // Get user preferences
    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    // If no preferences exist, default to true (send emails)
    if (!preferences) {
      return true;
    }

    // Check the specific notification type
    // First check general email_notifications_enabled
    if (!preferences.email_notifications_enabled) {
      return false;
    }

    // Then check the specific notification type
    switch (notificationType) {
      case 'queue_notifications':
        return preferences.queue_notifications ?? true;
      case 'payment_notifications':
        return preferences.payment_notifications ?? true;
      case 'worker_assignments':
        return preferences.worker_assignments ?? true;
      case 'security_alerts':
        return preferences.security_alerts_enabled ?? true;
      case 'email_notifications_enabled':
      default:
        return preferences.email_notifications_enabled ?? true;
    }
  } catch (error) {
    console.error('Error checking email preferences:', error);
    // Default to true if there's an error (send emails)
    return true;
  }
}

/**
 * Get user email from profile
 * @param userId - User ID
 * @returns email address or null
 */
export async function getUserEmail(userId: string): Promise<string | null> {
  try {
    const supabase = createAdminClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();
    
    return profile?.email || null;
  } catch (error) {
    console.error('Error getting user email:', error);
    return null;
  }
}

