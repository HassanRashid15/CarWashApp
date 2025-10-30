import { createAdminClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    
    // Check if we can connect to Supabase
    const healthCheck = await supabase.from('_health').select('*').limit(1);
    
    // Get auth users count
    const { data: usersResponse, error: usersError } = await supabase.auth.admin.listUsers();
    const users = usersResponse?.users ?? [];
    
    // Check if profiles table exists
    let profilesExists = false;
    let profilesCount = 0;
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);
      
      if (!profilesError) {
        profilesExists = true;
        const { count } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });
        profilesCount = count || 0;
      }
    } catch (e) {
      // Table doesn't exist
    }
    
    return NextResponse.json({
      success: true,
      supabase: {
        connected: true,
        usersCount: users.length,
        recentUsers: users.slice(0, 5).map(u => ({
          id: u.id,
          email: u.email,
          createdAt: u.created_at,
          emailConfirmed: u.email_confirmed_at ? true : false,
        })),
      },
      profiles: {
        tableExists: profilesExists,
        count: profilesCount,
      },
      message: profilesExists 
        ? 'Profiles table exists and is accessible'
        : 'Profiles table does not exist - you need to create it',
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
      stack: (error as Error).stack,
    }, { status: 500 });
  }
}
