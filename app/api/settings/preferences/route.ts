import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get user from session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const adminSupabase = createAdminClient();

    // Fetch user preferences
    const { data: preferences, error } = await adminSupabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Error fetching preferences:', error);
      return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
    }

    // If no preferences exist, return defaults
    if (!preferences) {
      return NextResponse.json({
        email_notifications_enabled: true,
        security_alerts_enabled: true,
        marketing_emails_enabled: false,
        queue_notifications: true,
        payment_notifications: true,
        worker_assignments: true,
      });
    }

    return NextResponse.json(preferences);
  } catch (error) {
    console.error('Preferences GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get user from session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const adminSupabase = createAdminClient();
    const body = await request.json();
    const { ...preferences } = body;

    // Check if preferences exist
    const { data: existing } = await adminSupabase
      .from('user_preferences')
      .select('user_id')
      .eq('user_id', userId)
      .single();

    if (existing) {
      // Update existing preferences
      const { data, error } = await adminSupabase
        .from('user_preferences')
        .update({
          ...preferences,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating preferences:', error);
        return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
      }

      return NextResponse.json({ success: true, preferences: data });
    } else {
      // Create new preferences
      const { data, error } = await adminSupabase
        .from('user_preferences')
        .insert({
          user_id: userId,
          ...preferences,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating preferences:', error);
        return NextResponse.json({ error: 'Failed to create preferences' }, { status: 500 });
      }

      return NextResponse.json({ success: true, preferences: data });
    }
  } catch (error) {
    console.error('Preferences POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

