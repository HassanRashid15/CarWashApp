import { NextRequest, NextResponse } from 'next/server';
import { checkAndSendRenewalNotifications } from '@/lib/utils/subscription-renewal-notifications';
import { checkAndSend29DayReminders } from '@/lib/utils/subscription-29day-reminder';

/**
 * POST - Scheduled task to check and send renewal notifications
 * This endpoint should be called daily via a cron job or scheduled task
 * 
 * To set up:
 * 1. Use Vercel Cron Jobs: https://vercel.com/docs/cron-jobs
 * 2. Or use external cron service (cron-job.org, etc.)
 * 3. Call this endpoint daily at a specific time (e.g., 9:00 AM UTC)
 * 
 * Example Vercel cron config (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/check-renewals",
 *     "schedule": "0 9 * * *"
 *   }]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Optional: Add authentication for cron endpoint
    // You can use a secret token in headers or query params
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // Also allow Vercel Cron header
      const vercelCron = request.headers.get('x-vercel-cron');
      if (!vercelCron) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    console.log('🔄 Starting subscription renewal check...');
    
    const renewalResult = await checkAndSendRenewalNotifications();
    
    console.log('✅ Renewal check completed:', renewalResult);

    console.log('🔄 Starting 29th day reminder check...');
    
    const reminderResult = await checkAndSend29DayReminders();
    
    console.log('✅ 29th day reminder check completed:', reminderResult);

    return NextResponse.json({
      success: true,
      message: 'Subscription checks completed',
      renewals: renewalResult,
      reminders: reminderResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error in renewal check cron job:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to check renewals', 
        details: (error as Error).message 
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Manual trigger for testing (remove in production or add auth)
 */
export async function GET(request: NextRequest) {
  try {
    // In production, you might want to restrict this
    // For now, allow manual triggering for testing
    
    console.log('🔄 Manual subscription check triggered...');
    
    const renewalResult = await checkAndSendRenewalNotifications();
    const reminderResult = await checkAndSend29DayReminders();
    
    return NextResponse.json({
      success: true,
      message: 'Subscription checks completed (manual trigger)',
      renewals: renewalResult,
      reminders: reminderResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error in manual renewal check:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to check renewals', 
        details: (error as Error).message 
      },
      { status: 500 }
    );
  }
}

