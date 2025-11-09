/**
 * Trial expiration notification utilities
 */

import { createAdminClient } from '@/lib/supabase/server';
import { sendTrialExpirationEmail } from '@/lib/emails/notification-emails';
import { getSubscriptionInfo } from './subscription-helpers';

/**
 * Format time remaining in a human-readable way
 */
export function formatTimeRemaining(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ${hours % 24} hour${(hours % 24) !== 1 ? 's' : ''}`;
  }
  if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ${minutes % 60} minute${(minutes % 60) !== 1 ? 's' : ''}`;
  }
  if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ${seconds % 60} second${(seconds % 60) !== 1 ? 's' : ''}`;
  }
  return `${seconds} second${seconds !== 1 ? 's' : ''}`;
}

/**
 * Check if trial expiration email should be sent
 * For 30-minute trials: Send at 25 minutes (5 min warning)
 * For 2-day trials: Send at 24 hours and 1 hour before
 */
export function shouldSendTrialWarning(trialEndsAt: Date, lastWarningSent?: Date | null): {
  shouldSend: boolean;
  warningType: 'final' | 'early' | null;
} {
  const now = new Date();
  const timeUntilEnd = trialEndsAt.getTime() - now.getTime();
  
  if (timeUntilEnd <= 0) {
    return { shouldSend: false, warningType: null };
  }

  const totalTrialDuration = trialEndsAt.getTime() - (trialEndsAt.getTime() - timeUntilEnd);
  const isShortTrial = totalTrialDuration < 2 * 60 * 60 * 1000; // Less than 2 hours = short trial

  if (isShortTrial) {
    // For short trials (30 min), send warning 5 minutes before
    const fiveMinutes = 5 * 60 * 1000;
    if (timeUntilEnd <= fiveMinutes && (!lastWarningSent || new Date(lastWarningSent).getTime() < now.getTime() - 2 * 60 * 1000)) {
      return { shouldSend: true, warningType: 'final' };
    }
  } else {
    // For long trials (2 days), send warnings at 24 hours and 1 hour
    const oneDay = 24 * 60 * 60 * 1000;
    const oneHour = 60 * 60 * 1000;

    // Early warning (24 hours before)
    if (timeUntilEnd <= oneDay && timeUntilEnd > oneHour) {
      if (!lastWarningSent || new Date(lastWarningSent).getTime() < now.getTime() - 12 * 60 * 60 * 1000) {
        return { shouldSend: true, warningType: 'early' };
      }
    }

    // Final warning (1 hour before)
    if (timeUntilEnd <= oneHour) {
      if (!lastWarningSent || new Date(lastWarningSent).getTime() < now.getTime() - 30 * 60 * 1000) {
        return { shouldSend: true, warningType: 'final' };
      }
    }
  }

  return { shouldSend: false, warningType: null };
}

/**
 * Check and send trial expiration emails for all admins with expiring trials
 */
export async function checkAndSendTrialWarnings(): Promise<{
  checked: number;
  sent: number;
  errors: number;
}> {
  const supabase = createAdminClient();
  let checked = 0;
  let sent = 0;
  let errors = 0;

  try {
    // Get all trial subscriptions that haven't expired yet
    const now = new Date().toISOString();
    const { data: trials, error } = await supabase
      .from('subscriptions')
      .select('*, profiles:user_id(email, first_name, last_name, full_name)')
      .eq('status', 'trial')
      .gt('trial_ends_at', now)
      .not('trial_ends_at', 'is', null);

    if (error) {
      console.error('Error fetching trial subscriptions:', error);
      return { checked: 0, sent: 0, errors: 1 };
    }

    if (!trials || trials.length === 0) {
      return { checked: 0, sent: 0, errors: 0 };
    }

    checked = trials.length;

    // Check each trial and send email if needed
    for (const trial of trials) {
      try {
        const trialEndsAt = new Date(trial.trial_ends_at);
        const subscription = await getSubscriptionInfo(trial.user_id);
        
        if (!subscription || !subscription.trialEndsAt) {
          continue;
        }

        // Check if we should send warning (we'll track last sent in a separate table or use metadata)
        // For now, we'll check on each dashboard access instead
        const timeRemaining = formatTimeRemaining(trialEndsAt.getTime() - Date.now());
        const { shouldSend, warningType } = shouldSendTrialWarning(trialEndsAt);

        if (shouldSend) {
          const profile = trial.profiles as any;
          const adminEmail = profile?.email || trial.user_id;
          const adminName = profile?.full_name || 
                          (profile?.first_name && profile?.last_name 
                            ? `${profile.first_name} ${profile.last_name}` 
                            : profile?.first_name || 'Admin');

          if (adminEmail && adminEmail !== trial.user_id) {
            await sendTrialExpirationEmail(
              trial.user_id,
              adminEmail,
              adminName,
              trialEndsAt,
              timeRemaining
            );
            sent++;
          }
        }
      } catch (err) {
        console.error(`Error processing trial for user ${trial.user_id}:`, err);
        errors++;
      }
    }

    return { checked, sent, errors };
  } catch (error) {
    console.error('Error in checkAndSendTrialWarnings:', error);
    return { checked, sent, errors: errors + 1 };
  }
}

/**
 * Check and send trial warning for a specific user (called on dashboard access)
 */
export async function checkTrialForUser(userId: string): Promise<{
  sent: boolean;
  timeRemaining?: string;
}> {
  try {
    const subscription = await getSubscriptionInfo(userId);
    
    if (!subscription || subscription.status !== 'trial' || !subscription.trialEndsAt) {
      return { sent: false };
    }

    const trialEndsAt = subscription.trialEndsAt;
    const { shouldSend } = shouldSendTrialWarning(trialEndsAt);

    if (!shouldSend) {
      return { sent: false };
    }

    // Get user profile for email
    const supabase = createAdminClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, first_name, last_name, full_name')
      .eq('id', userId)
      .single();

    if (!profile?.email) {
      return { sent: false };
    }

    const timeRemaining = formatTimeRemaining(trialEndsAt.getTime() - Date.now());
    const adminName = profile.full_name || 
                     (profile.first_name && profile.last_name 
                       ? `${profile.first_name} ${profile.last_name}` 
                       : profile.first_name || 'Admin');

    // Check if we've sent a warning recently by checking subscription metadata or a separate tracking
    // For now, we'll check the subscription's updated_at to see if we sent recently
    // In production, you might want to add a last_warning_sent_at field to subscriptions table
    const { data: subscriptionRecord } = await supabase
      .from('subscriptions')
      .select('updated_at, metadata')
      .eq('user_id', userId)
      .single();

    // Check if warning was sent in last 30 minutes (to avoid spam)
    if (subscriptionRecord) {
      const metadata = subscriptionRecord.metadata as any;
      const lastWarningSent = metadata?.last_trial_warning_sent;
      
      if (lastWarningSent) {
        const lastWarningTime = new Date(lastWarningSent).getTime();
        const timeSinceLastWarning = Date.now() - lastWarningTime;
        const minInterval = 30 * 60 * 1000; // 30 minutes

        if (timeSinceLastWarning < minInterval) {
          return { sent: false, timeRemaining };
        }
      }
    }

    await sendTrialExpirationEmail(
      userId,
      profile.email,
      adminName,
      trialEndsAt,
      timeRemaining
    );

    // Store last warning time in subscription metadata
    const metadata = subscriptionRecord?.metadata || {};
    await supabase
      .from('subscriptions')
      .update({
        metadata: {
          ...metadata,
          last_trial_warning_sent: new Date().toISOString(),
        },
      })
      .eq('user_id', userId);

    return { sent: true, timeRemaining };
  } catch (error) {
    console.error('Error checking trial for user:', error);
    return { sent: false };
  }
}

