import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cache, CacheKeys } from '@/lib/cache/cache';

/**
 * POST - Clear subscription cache for the current user
 * Useful for debugging and forcing fresh data fetch
 */
export async function POST(request: NextRequest) {
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
    
    const userId = session.user.id;
    const cacheKey = CacheKeys.subscription(userId);
    
    // Clear the cache
    cache.delete(cacheKey);
    
    console.log('🗑️ Cache cleared for user:', userId);
    
    return NextResponse.json({
      success: true,
      message: 'Cache cleared successfully',
      userId,
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    return NextResponse.json(
      { error: 'Failed to clear cache' },
      { status: 500 }
    );
  }
}

