import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Public endpoint to fetch queue entries (no authentication required)
// Using service role key to bypass RLS for public read access
export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing Supabase environment variables');
      return NextResponse.json({ queue: [] });
    }

    // Use service role client for public endpoint to bypass RLS
    // This is safe since we're only reading and filtering specific data
    const supabase = createSupabaseClient(supabaseUrl, serviceRoleKey);
    
    // Fetch only active queue entries (waiting or washing status) with customer and worker info
    const { data: queueEntries, error } = await supabase
      .from('Queue')
      .select(`
        id,
        queue_number,
        status,
        service_type,
        created_at,
        customer:Customers(id, name),
        worker:Workers(id, name)
      `)
      .in('status', ['waiting', 'washing'])
      .order('queue_number', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      // If table doesn't exist or RLS issue, return empty array
      if (error.code === '42P01' || error.message.includes('does not exist') || error.code === '42501') {
        return NextResponse.json({ queue: [], error: 'Queue table not accessible. Please check RLS policies.' });
      }
      // Return error details for debugging
      return NextResponse.json(
        { queue: [], error: error.message, code: error.code },
        { status: 200 } // Return 200 so frontend can handle gracefully
      );
    }

    const response = NextResponse.json({ queue: queueEntries || [] });
    
    // Prevent caching to ensure real-time updates
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    console.error('Error fetching public queue:', error);
    const response = NextResponse.json(
      { queue: [], error: 'Failed to fetch queue', details: (error as Error).message },
      { status: 200 } // Return 200 so frontend can handle gracefully
    );
    
    // Prevent caching even on errors
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  }
}

