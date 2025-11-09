import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

/**
 * GET - Get all users (super admin only)
 * Returns: admins, super admins, customers, workers
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is super admin
    const adminSupabase = createAdminClient();
    const { data: currentUserProfile } = await adminSupabase
      .from('profiles')
      .select('role, email')
      .eq('id', session.user.id)
      .single();

    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'hassanrashid001@icloud.com';
    const isSuperAdmin = currentUserProfile?.role === 'super_admin' ||
                        currentUserProfile?.email === superAdminEmail;

    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Super admin access required' },
        { status: 403 }
      );
    }

    // Get all profiles (admins, super admins, regular users)
    const { data: profiles, error: profilesError } = await adminSupabase
      .from('profiles')
      .select('id, email, first_name, last_name, full_name, role, admin_code, created_at, updated_at, avatar_url, contact_no')
      .order('created_at', { ascending: false });

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return NextResponse.json(
        { error: 'Failed to fetch profiles', details: profilesError.message },
        { status: 500 }
      );
    }

    // Get all customers
    const { data: customers, error: customersError } = await adminSupabase
      .from('Customers')
      .select('id, name, phone, created_at, admin_id, unique_id')
      .order('created_at', { ascending: false });

    if (customersError) {
      console.error('Error fetching customers:', customersError);
      // Log the error but don't fail - customers might not exist
    }

    // Get all workers
    const { data: workers, error: workersError } = await adminSupabase
      .from('Workers')
      .select('id, name, phone, created_at, admin_id, employee_id')
      .order('created_at', { ascending: false });

    if (workersError) {
      console.error('Error fetching workers:', workersError);
      // Log the error but don't fail - workers might not exist
    }

    // Get auth users for email verification status
    const { data: authUsers } = await adminSupabase.auth.admin.listUsers();
    const authUsersMap = new Map(
      authUsers?.users?.map(u => [u.id, u]) || []
    );

    // Combine all users with their types
    const allUsers = [
      // Profiles (admins, super admins, regular users)
      ...(profiles || []).map(profile => {
        const authUser = authUsersMap.get(profile.id);
        return {
          id: profile.id,
          email: profile.email,
          first_name: profile.first_name || null,
          last_name: profile.last_name || null,
          name: profile.full_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'N/A',
          contact_no: profile.contact_no || null,
          type: profile.role === 'super_admin' ? 'Super Admin' : 
                profile.role === 'admin' ? 'Admin' : 'User',
          role: profile.role,
          admin_code: profile.admin_code,
          email_verified: !!authUser?.email_confirmed_at,
          created_at: profile.created_at,
          avatar_url: profile.avatar_url,
          admin_id: null,
        };
      }),
      // Customers
      ...(customers || []).map(customer => ({
        id: customer.id,
        email: null, // Customers don't have email field
        first_name: null,
        last_name: null,
        name: customer.name || 'N/A',
        contact_no: customer.phone || null, // Use phone field
        type: 'Customer',
        role: 'customer', // Set role for customers
        admin_code: customer.unique_id || null,
        email_verified: false,
        created_at: customer.created_at,
        avatar_url: null,
        admin_id: customer.admin_id,
      })),
      // Workers
      ...(workers || []).map(worker => ({
        id: worker.id,
        email: null, // Workers don't have email field
        first_name: null,
        last_name: null,
        name: worker.name || 'N/A',
        contact_no: worker.phone || null, // Use phone field
        type: 'Worker',
        role: 'worker', // Set role for workers
        admin_code: worker.employee_id || null,
        email_verified: false,
        created_at: worker.created_at,
        avatar_url: null,
        admin_id: worker.admin_id,
      })),
    ];

    // Sort by created_at (newest first)
    allUsers.sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA;
    });

    // Get counts by type
    const counts = {
      total: allUsers.length,
      superAdmin: allUsers.filter(u => u.type === 'Super Admin').length,
      admin: allUsers.filter(u => u.type === 'Admin').length,
      user: allUsers.filter(u => u.type === 'User').length,
      customer: allUsers.filter(u => u.type === 'Customer').length,
      worker: allUsers.filter(u => u.type === 'Worker').length,
    };

    return NextResponse.json({
      success: true,
      users: allUsers,
      counts,
    });
  } catch (error) {
    console.error('Error fetching all users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users', details: (error as Error).message },
      { status: 500 }
    );
  }
}

