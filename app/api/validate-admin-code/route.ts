import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { valid: false, error: 'Admin code is required' },
        { status: 400 }
      );
    }

    // Use admin client to bypass RLS for validation
    const supabase = createAdminClient();
    const normalized = code.trim().toUpperCase();

    if (!/^ACW_\d{3,}$/.test(normalized)) {
      return NextResponse.json(
        { valid: false, error: 'Invalid admin code format' },
        { status: 400 }
      );
    }

    // 1) Check admin_codes table (separate table for admin codes)
    const { data: codeRow, error: codeErr } = await supabase
      .from('admin_codes')
      .select('id, code, user_id, is_active, is_screen_code, expires_at, usage_count')
      .eq('code', normalized)
      .eq('is_active', true)
      .maybeSingle();

    if (codeErr) {
      // If table doesn't exist, that's okay - fall through to other checks
      if (codeErr.code === '42P01' || codeErr.message?.includes('does not exist')) {
        console.log('admin_codes table does not exist, checking other sources...');
      } else {
        console.error('Error checking admin_codes:', codeErr);
        // Don't fail, fall through to other checks
      }
    } else if (codeRow) {
      // Check if code is expired
      if (codeRow.expires_at && new Date(codeRow.expires_at) < new Date()) {
        return NextResponse.json(
          { valid: false, error: 'This admin code has expired' },
          { status: 400 }
        );
      }
      
      // Code is valid, increment usage
      await supabase
        .from('admin_codes')
        .update({ 
          usage_count: (codeRow.usage_count || 0) + 1,
          used_at: (codeRow as any).used_at || new Date().toISOString()
        })
        .eq('id', codeRow.id);
      
      return NextResponse.json({ 
        valid: true,
        isScreenCode: codeRow.is_screen_code || false,
        codeId: codeRow.id
      });
    }

    // 2) Fallback: Check admin_screencode table (legacy support)
    const { data: screenRow, error: screenErr } = await supabase
      .from('admin_screencode')
      .select('user_id')
      .eq('code', normalized)
      .eq('is_active', true)
      .maybeSingle();

    if (!screenErr && screenRow) {
      return NextResponse.json({ valid: true, isScreenCode: true });
    }

    // 3) Fallback: check profiles.admin_code (for sequential profile-linked codes)
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('admin_code', normalized)
      .eq('role', 'admin')
      .maybeSingle();

    if (error) {
      console.error('Error checking profiles:', error);
      return NextResponse.json(
        { valid: false, error: 'Database error validating code', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ valid: Boolean(data) });
  } catch (err) {
    console.error('Validate admin code error:', err);
    return NextResponse.json(
      { valid: false, error: 'Server error', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


