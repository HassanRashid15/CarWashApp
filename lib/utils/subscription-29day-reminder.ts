/**
 * Subscription 29th day reminder notification utilities
 */

import { createAdminClient } from '@/lib/supabase/server';
import { sendSubscription29DayReminderEmail } from '@/lib/emails/notification-emails';

/**
 * Check if subscription 29th day reminder should be sent
 * Sends reminder on the 29th day after purchase (current_period_start)
 */
export async function checkAndSend29DayReminders(): Promise<{
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
    
    // Calculate date range: subscriptions purchased 28-30 days ago (to catch exactly 29 days)
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);
    
    const twentyEightDaysAgo = new Date(today);
    twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28);
    twentyEightDaysAgo.setHours(23, 59, 59, 999);

    // Get all active subscriptions that:
    // 1. Have current_period_start between 28-30 days ago (to catch exactly 29 days)
    // 2. Are active (not expired, canceled, or pending)
    // 3. Haven't already had the 29th day reminder sent (we'll check this in the loop)
    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select('*, profiles:user_id(email, first_name, last_name, full_name)')
      .eq('status', 'active')
      .not('current_period_start', 'is', null)
      .gte('current_period_start', thirtyDaysAgo.toISOString())
      .lte('current_period_start', twentyEightDaysAgo.toISOString());

    if (error) {
      console.error('Error fetching subscriptions for 29th day reminder:', error);
      return { checked: 0, sent: 0, errors: 1 };
    }

    if (!subscriptions || subscriptions.length === 0) {
      return { checked: 0, sent: 0, errors: 0 };
    }

    checked = subscriptions.length;

    // Process each subscription
    for (const subscription of subscriptions) {
      try {
        const periodStart = new Date(subscription.current_period_start);
        const periodEnd = subscription.current_period_end 
          ? new Date(subscription.current_period_end)
          : null;
        
        // Calculate days since purchase
        const daysSincePurchase = Math.floor((now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
        
        // Only send if exactly 29 days (or 28-30 to handle timezone differences)
        if (daysSincePurchase < 28 || daysSincePurchase > 30) {
          continue;
        }

        // Check if reminder was already sent (we'll use a flag in the subscription record)
        // For now, we'll check if there's a renewal_notification_sent_at that's recent
        // In a production system, you might want to add a specific field like 'day29_reminder_sent_at'
        if (subscription.renewal_notification_sent_at) {
          const lastSentDate = new Date(subscription.renewal_notification_sent_at);
          const daysSinceLastSent = Math.floor((now.getTime() - lastSentDate.getTime()) / (1000 * 60 * 60 * 24));
          
          // If reminder was sent in the last 2 days, skip (to avoid duplicates)
          if (daysSinceLastSent < 2) {
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

        // Calculate renewal date (if period_end exists, use it; otherwise estimate 30 days from start)
        const renewalDate = periodEnd || new Date(periodStart);
        if (!periodEnd) {
          renewalDate.setDate(renewalDate.getDate() + 30);
        }

        // Send 29th day reminder email
        const emailResult = await sendSubscription29DayReminderEmail(
          subscription.user_id,
          adminEmail,
          adminName,
          subscription.plan_type,
          periodStart,
          renewalDate
        );

        if (emailResult.sent) {
          // Mark that reminder was sent (update renewal_notification_sent_at as a flag)
          // In production, you might want to add a dedicated field
          await supabase
            .from('subscriptions')
            .update({
              renewal_notification_sent_at: now.toISOString(),
            })
            .eq('id', subscription.id);
          
          sent++;
          console.log(`✅ 29th day reminder sent to ${adminEmail} for subscription ${subscription.id}`);
        } else {
          console.warn(`⚠️ Failed to send 29th day reminder to ${adminEmail}: ${emailResult.reason}`);
          errors++;
        }
      } catch (error) {
        console.error(`Error processing subscription ${subscription.id} for 29th day reminder:`, error);
        errors++;
      }
    }

    return { checked, sent, errors };
  } catch (error) {
    console.error('Error in checkAndSend29DayReminders:', error);
    return { checked, sent, errors: errors + 1 };
  }
}

/**
 * Check and send 29th day reminder for a specific user
 */
export async function check29DayReminderForUser(userId: string): Promise<{
  sent: boolean;
  daysSincePurchase?: number;
}> {
  try {
    const supabase = createAdminClient();
    
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*, profiles:user_id(email, first_name, last_name, full_name)')
      .eq('user_id', userId)
      .eq('status', 'active')
      .not('current_period_start', 'is', null)
      .single();

    if (error || !subscription) {
      return { sent: false };
    }

    const now = new Date();
    const periodStart = new Date(subscription.current_period_start);
    const daysSincePurchase = Math.floor((now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));

    // Only send if exactly 29 days (or 28-30 to handle timezone differences)
    if (daysSincePurchase < 28 || daysSincePurchase > 30) {
      return { sent: false, daysSincePurchase };
    }

    // Check if already sent recently
    if (subscription.renewal_notification_sent_at) {
      const lastSentDate = new Date(subscription.renewal_notification_sent_at);
      const daysSinceLastSent = Math.floor((now.getTime() - lastSentDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceLastSent < 2) {
        return { sent: false, daysSincePurchase };
      }
    }

    const profile = subscription.profiles as any;
    const adminEmail = profile?.email;
    const adminName = profile?.full_name || 
                    (profile?.first_name && profile?.last_name 
                      ? `${profile.first_name} ${profile.last_name}` 
                      : profile?.first_name || 'Admin');

    if (!adminEmail) {
      return { sent: false, daysSincePurchase };
    }

    const periodEnd = subscription.current_period_end 
      ? new Date(subscription.current_period_end)
      : new Date(periodStart);
    if (!subscription.current_period_end) {
      periodEnd.setDate(periodEnd.getDate() + 30);
    }

    const emailResult = await sendSubscription29DayReminderEmail(
      userId,
      adminEmail,
      adminName,
      subscription.plan_type,
      periodStart,
      periodEnd
    );

    if (emailResult.sent) {
      // Mark that reminder was sent
      await supabase
        .from('subscriptions')
        .update({
          renewal_notification_sent_at: now.toISOString(),
        })
        .eq('id', subscription.id);
      
      return { sent: true, daysSincePurchase };
    }

    return { sent: false, daysSincePurchase };
  } catch (error) {
    console.error('Error checking 29th day reminder for user:', error);
    return { sent: false };
  }
}

