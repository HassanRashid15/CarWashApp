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

    // Collect all user data
    const [
      profile,
      preferences,
      activityLogs,
      queueEntries,
      customers,
      products,
      serviceBookings,
    ] = await Promise.all([
      // Profile data
      adminSupabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single(),
      
      // Preferences
      adminSupabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single(),
      
      // Activity logs
      adminSupabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      
      // Queue entries (if user is customer)
      adminSupabase
        .from('Queue')
        .select('*')
        .eq('customer_id', userId),
      
      // Customers created by admin
      adminSupabase
        .from('Customers')
        .select('*')
        .order('created_at', { ascending: false }),
      
      // Products created by admin
      adminSupabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false }),
      
      // Service bookings
      adminSupabase
        .from('service_bookings')
        .select('*')
        .order('created_at', { ascending: false }),
    ]);

    // Compile export data
    const exportData = {
      exportDate: new Date().toISOString(),
      account: {
        profile: profile.data || null,
        preferences: preferences.data || null,
      },
      activity: {
        logs: activityLogs.data || [],
        totalLogs: activityLogs.data?.length || 0,
      },
      data: {
        queueEntries: queueEntries.data || [],
        customers: customers.data || [],
        products: products.data || [],
        serviceBookings: serviceBookings.data || [],
      },
      summary: {
        totalQueueEntries: queueEntries.data?.length || 0,
        totalCustomers: customers.data?.length || 0,
        totalProducts: products.data?.length || 0,
        totalServiceBookings: serviceBookings.data?.length || 0,
        totalActivityLogs: activityLogs.data?.length || 0,
      },
    };

    // Return as JSON (can be downloaded as file)
    return NextResponse.json(exportData, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="account-data-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error('Error exporting account data:', error);
    return NextResponse.json(
      { error: 'Failed to export account data', details: (error as Error).message },
      { status: 500 }
    );
  }
}

