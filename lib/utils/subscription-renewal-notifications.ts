/**
 * Subscription renewal notification utilities
 */

import { createAdminClient } from '@/lib/supabase/server';
import { sendSubscriptionRenewalEmail } from '@/lib/emails/notification-emails';
import { getSubscriptionInfo } from './subscription-helpers';

/**
 * Check if subscription renewal notification should be sent
 * Sends notification on the same date as current_period_end (renewal date)
 */
export async function checkAndSendRenewalNotifications(): Promise<{
  checked: number;
  sent: number;
  errors: number;
}> {
  const supabase = createAdminClient();
  let checked = 0;
  let sent = 0;
  let errors = 0;

  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get all active subscriptions that:
    // 1. Have current_period_end matching today (renewal date)
    // 2. Haven't already had renewal notification sent
    // 3. Are not already pending renewal
    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select('*, profiles:user_id(email, first_name, last_name, full_name)')
      .eq('status', 'active')
      .not('current_period_end', 'is', null)
      .eq('pending_renewal', false)
      .gte('current_period_end', today.toISOString())
      .lt('current_period_end', tomorrow.toISOString());

    if (error) {
      console.error('Error fetching subscriptions for renewal:', error);
      return { checked: 0, sent: 0, errors: 1 };
    }

    if (!subscriptions || subscriptions.length === 0) {
      return { checked: 0, sent: 0, errors: 0 };
    }

    checked = subscriptions.length;

    // Process each subscription
    for (const subscription of subscriptions) {
      try {
        const currentPeriodEnd = new Date(subscription.current_period_end);
        const renewalDate = new Date(currentPeriodEnd); // Same date as period end

        // Check if notification was already sent today
        if (subscription.renewal_notification_sent_at) {
          const lastSentDate = new Date(subscription.renewal_notification_sent_at);
          const lastSentDay = new Date(lastSentDate.getFullYear(), lastSentDate.getMonth(), lastSentDate.getDate());
          
          // If notification was already sent today, skip
          if (lastSentDay.getTime() === today.getTime()) {
            continue;
          }
        }

        const profile = subscription.profiles as any;
        const adminEmail = profile?.email;
        const adminName = profile?.full_name || 
                        (profile?.first_name && profile?.last_name 
                          ? `${profile.first_name} ${profile.last_name}` 
                          : profile?.first_name || 'Admin');

        if (!adminEmail || adminEmail === subscription.user_id) {
          console.warn(`Skipping subscription ${subscription.id}: No valid email for user ${subscription.user_id}`);
          continue;
        }

        // Send renewal notification email
        const emailResult = await sendSubscriptionRenewalEmail(
          subscription.user_id,
          adminEmail,
          adminName,
          subscription.plan_type,
          renewalDate,
          currentPeriodEnd
        );

        if (emailResult.sent) {
          // Update subscription to mark notification as sent and set pending renewal
          await supabase
            .from('subscriptions')
            .update({
              renewal_notification_sent_at: new Date().toISOString(),
              pending_renewal: true,
            })
            .eq('id', subscription.id);

          sent++;
          console.log(`✅ Renewal notification sent for subscription ${subscription.id} (user: ${subscription.user_id})`);
        } else {
          errors++;
          console.error(`❌ Failed to send renewal notification for subscription ${subscription.id}:`, emailResult.reason);
        }
      } catch (err) {
        console.error(`Error processing renewal for subscription ${subscription.id}:`, err);
        errors++;
      }
    }

    return { checked, sent, errors };
  } catch (error) {
    console.error('Error in checkAndSendRenewalNotifications:', error);
    return { checked, sent, errors: errors + 1 };
  }
}

/**
 * Check and send renewal notification for a specific user (called on dashboard access)
 */
export async function checkRenewalForUser(userId: string): Promise<{
  sent: boolean;
  renewalDate?: Date;
}> {
  try {
    const subscription = await getSubscriptionInfo(userId);
    
    if (!subscription || subscription.status !== 'active' || !subscription.currentPeriodEnd) {
      return { sent: false };
    }

    const currentPeriodEnd = subscription.currentPeriodEnd;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const renewalDate = new Date(currentPeriodEnd.getFullYear(), currentPeriodEnd.getMonth(), currentPeriodEnd.getDate());

    // Check if today is the renewal date
    if (renewalDate.getTime() !== today.getTime()) {
      return { sent: false };
    }

    // Check if notification was already sent today
    const supabase = createAdminClient();
    const { data: subscriptionRecord } = await supabase
      .from('subscriptions')
      .select('renewal_notification_sent_at, pending_renewal, plan_type')
      .eq('user_id', userId)
      .single();

    if (!subscriptionRecord) {
      return { sent: false };
    }

    // If already pending renewal, don't send again
    if (subscriptionRecord.pending_renewal) {
      return { sent: false, renewalDate: currentPeriodEnd };
    }

    // Check if notification was sent today
    if (subscriptionRecord.renewal_notification_sent_at) {
      const lastSentDate = new Date(subscriptionRecord.renewal_notification_sent_at);
      const lastSentDay = new Date(lastSentDate.getFullYear(), lastSentDate.getMonth(), lastSentDate.getDate());
      
      if (lastSentDay.getTime() === today.getTime()) {
        return { sent: false, renewalDate: currentPeriodEnd };
      }
    }

    // Get user profile for email
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, first_name, last_name, full_name')
      .eq('id', userId)
      .single();

    if (!profile?.email) {
      return { sent: false };
    }

    const adminName = profile.full_name || 
                     (profile.first_name && profile.last_name 
                       ? `${profile.first_name} ${profile.last_name}` 
                       : profile.first_name || 'Admin');

    // Send renewal notification email
    const emailResult = await sendSubscriptionRenewalEmail(
      userId,
      profile.email,
      adminName,
      subscriptionRecord.plan_type,
      renewalDate,
      currentPeriodEnd
    );

    if (emailResult.sent) {
      // Update subscription to mark notification as sent and set pending renewal
      await supabase
        .from('subscriptions')
        .update({
          renewal_notification_sent_at: new Date().toISOString(),
          pending_renewal: true,
        })
        .eq('user_id', userId);

      return { sent: true, renewalDate: currentPeriodEnd };
    }

    return { sent: false, renewalDate: currentPeriodEnd };
  } catch (error) {
    console.error('Error checking renewal for user:', error);
    return { sent: false };
  }
}



