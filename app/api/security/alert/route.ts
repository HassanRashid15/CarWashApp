import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { sendSecurityAlertEmail } from '@/lib/emails/notification-emails';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check if user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { type, ipAddress, userAgent, location } = body;

    if (!type) {
      return NextResponse.json(
        { error: 'Alert type is required' },
        { status: 400 }
      );
    }

    // Get user profile
    const adminSupabase = createAdminClient();
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('id, email')
      .eq('id', session.user.id)
      .single();

    if (!profile?.email || !profile?.id) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    const ipAddr = ipAddress || request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'Unknown';
    const ua = userAgent || request.headers.get('user-agent') || 'Unknown';
    const loc = location || 'Unknown';
    const timestamp = new Date().toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });

    // Log activity to database
    try {
      await adminSupabase
        .from('activity_logs')
        .insert({
          user_id: profile.id,
          activity_type: type,
          description: type === 'login' 
            ? 'User logged into account'
            : type === 'password_change'
            ? 'User changed password'
            : 'Account activity detected',
          ip_address: ipAddr,
          user_agent: ua,
          metadata: {
            location: loc,
            timestamp,
          },
        });
    } catch (logError) {
      // Don't fail if logging fails
      console.error('Error logging activity:', logError);
    }

    // Send security alert email
    const result = await sendSecurityAlertEmail(
      profile.id,
      profile.email,
      type,
      {
        ipAddress: ipAddr,
        userAgent: ua,
        location: loc,
        timestamp,
      }
    );

    return NextResponse.json({ 
      success: true, 
      sent: result.sent,
      reason: result.reason 
    });
  } catch (error) {
    console.error('Error sending security alert:', error);
    return NextResponse.json(
      { error: 'Failed to send security alert', details: (error as Error).message },
      { status: 500 }
    );
  }
}

