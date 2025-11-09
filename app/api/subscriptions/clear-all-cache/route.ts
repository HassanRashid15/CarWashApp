import { NextRequest, NextResponse } from 'next/server';
import { cache } from '@/lib/cache/cache';

/**
 * POST - Clear ALL subscription cache
 * Useful for debugging when cache has stale data
 */
export async function POST(request: NextRequest) {
  try {
    // Clear all cache
    cache.clear();
    
    console.log('🗑️ All cache cleared');
    
    return NextResponse.json({
      success: true,
      message: 'All cache cleared successfully',
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    return NextResponse.json(
      { error: 'Failed to clear cache' },
      { status: 500 }
    );
  }
}

