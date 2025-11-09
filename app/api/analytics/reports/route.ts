import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

/**
 * GET - Fetch analytics and reports (Super Admin only)
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

    // Get time range from query params
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '30';
    const days = range === 'all' ? null : parseInt(range);

    // Calculate date filter
    const dateFilter = days 
      ? new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
      : null;

    // Use admin client to bypass RLS
    const adminSupabase = createAdminClient();

    // Fetch all analytics data
    const [
      { count: totalUsers },
      { count: totalCustomers },
      { data: subscriptions },
      { data: contactQueries },
      { count: totalFeedback },
    ] = await Promise.all([
      adminSupabase.from('profiles').select('*', { count: 'exact', head: true }),
      adminSupabase.from('Customers').select('*', { count: 'exact', head: true }),
      adminSupabase.from('subscriptions').select('*'),
      adminSupabase.from('Contact_us').select('*'),
      adminSupabase.from('feedback').select('*', { count: 'exact', head: true }),
    ]);

    // Calculate subscription metrics
    const activeSubscriptions = subscriptions?.filter(
      (sub: any) => sub.status === 'active'
    ).length || 0;
    
    const pendingSubscriptions = subscriptions?.filter(
      (sub: any) => sub.status === 'pending'
    ).length || 0;

    const totalSubscriptions = subscriptions?.length || 0;

    // Calculate revenue
    const planPrices: Record<string, number> = {
      starter: 29,
      professional: 79,
      enterprise: 199,
    };

    let totalRevenue = 0;
    const revenueByPlan: Record<string, { revenue: number; count: number }> = {};

    subscriptions?.forEach((sub: any) => {
      if (sub.status === 'active' && sub.plan_type) {
        const price = planPrices[sub.plan_type] || 0;
        totalRevenue += price;
        
        if (!revenueByPlan[sub.plan_type]) {
          revenueByPlan[sub.plan_type] = { revenue: 0, count: 0 };
        }
        revenueByPlan[sub.plan_type].revenue += price;
        revenueByPlan[sub.plan_type].count += 1;
      }
    });

    // Contact queries metrics
    const totalContactQueries = contactQueries?.length || 0;
    const pendingContactQueries = contactQueries?.filter(
      (q: any) => q.status === 'pending'
    ).length || 0;

    // User growth (simplified - by month)
    // For now, return empty array - can be enhanced to group by month
    const userGrowth: Array<{ month: string; count: number }> = [];

    return NextResponse.json({
      totalUsers: totalUsers || 0,
      totalCustomers: totalCustomers || 0,
      totalRevenue,
      totalSubscriptions,
      activeSubscriptions,
      pendingSubscriptions,
      totalContactQueries,
      pendingContactQueries,
      totalFeedback: totalFeedback || 0,
      revenueByPlan: Object.entries(revenueByPlan).map(([plan, data]) => ({
        plan,
        revenue: data.revenue,
        count: data.count,
      })),
      userGrowth,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch analytics',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

