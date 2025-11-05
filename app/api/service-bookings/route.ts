import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check if user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = supabase
      .from('service_bookings')
      .select('*')
      .order('created_at', { ascending: false });

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status);
    }

    const { data: bookings, error } = await query;

    if (error) {
      console.error('Error fetching service bookings:', error);
      
      // If table doesn't exist, return empty array
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        return NextResponse.json({ 
          bookings: [],
          error: 'Service bookings table does not exist. Please run the migration SQL.' 
        });
      }

      throw error;
    }

    return NextResponse.json({ bookings: bookings || [] });
  } catch (error) {
    console.error('Error fetching service bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service bookings', details: (error as Error).message },
      { status: 500 }
    );
  }
}

