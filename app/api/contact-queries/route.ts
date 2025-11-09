import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

/**
 * GET - Fetch all contact queries (Super Admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is super admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden: Super admin access required' },
        { status: 403 }
      );
    }

    // Use admin client to bypass RLS for fetching all queries
    const adminSupabase = createAdminClient();

    // Fetch all contact queries
    const { data: queries, error } = await adminSupabase
      .from('Contact_us')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching contact queries:', error);
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return NextResponse.json(
        { 
          error: 'Failed to fetch contact queries',
          details: error.message || 'Unknown error',
          code: error.code,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ queries: queries || [] });
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

