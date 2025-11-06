import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
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

    const userId = session.user.id;
    const adminSupabase = createAdminClient();

    // Get activity logs for the user
    const { data: logs, error } = await adminSupabase
      .from('activity_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100); // Limit to last 100 activities

    if (error) {
      console.error('Error fetching activity logs:', error);
      // If table doesn't exist, return empty array
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        return NextResponse.json({ logs: [] });
      }
      throw error;
    }

    // Also get account-related activities from other tables
    const [profileData, preferencesData, queueData, customerData, productData, bookingData] = await Promise.all([
      // Profile updates
      adminSupabase
        .from('profiles')
        .select('updated_at')
        .eq('id', userId)
        .single(),
      
      // Preferences updates
      adminSupabase
        .from('user_preferences')
        .select('updated_at')
        .eq('user_id', userId)
        .single(),
      
      // Queue entries created
      adminSupabase
        .from('Queue')
        .select('created_at, service_type, status')
        .eq('customer_id', userId)
        .order('created_at', { ascending: false })
        .limit(10),
      
      // Customers created
      adminSupabase
        .from('Customers')
        .select('created_at, name, status')
        .order('created_at', { ascending: false })
        .limit(10),
      
      // Products created
      adminSupabase
        .from('products')
        .select('created_at, name, status')
        .order('created_at', { ascending: false })
        .limit(10),
      
      // Service bookings
      adminSupabase
        .from('service_bookings')
        .select('created_at, service_name, status')
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    // Combine all activities
    const allActivities: any[] = [];

    // Add logs from activity_logs table
    if (logs) {
      logs.forEach(log => {
        allActivities.push({
          id: log.id,
          type: log.activity_type,
          description: log.description,
          timestamp: log.created_at,
          ipAddress: log.ip_address,
          metadata: log.metadata,
        });
      });
    }

    // Add profile update
    if (profileData.data?.updated_at) {
      allActivities.push({
        id: `profile-${userId}`,
        type: 'profile_updated',
        description: 'Profile information updated',
        timestamp: profileData.data.updated_at,
      });
    }

    // Add preferences update
    if (preferencesData.data?.updated_at) {
      allActivities.push({
        id: `preferences-${userId}`,
        type: 'preferences_updated',
        description: 'Email preferences updated',
        timestamp: preferencesData.data.updated_at,
      });
    }

    // Sort by timestamp (most recent first)
    allActivities.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return NextResponse.json({ 
      logs: allActivities.slice(0, 100) // Limit to 100 most recent
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity logs', details: (error as Error).message },
      { status: 500 }
    );
  }
}

