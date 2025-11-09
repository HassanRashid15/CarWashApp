import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET - Fetch all active washing packages with their features
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Fetch active washing packages
    const { data: packages, error: packagesError } = await supabase
      .from('Washing_packages')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (packagesError) {
      throw packagesError;
    }

    if (!packages || packages.length === 0) {
      return NextResponse.json({ packages: [] });
    }

    // Fetch features for each package
    const packageIds = packages.map(pkg => pkg.id);
    const { data: features, error: featuresError } = await supabase
      .from('package_features')
      .select('*')
      .in('package_id', packageIds)
      .order('sort_order', { ascending: true });

    if (featuresError) {
      throw featuresError;
    }

    // Group features by package_id
    const featuresByPackage = (features || []).reduce((acc, feature) => {
      if (!acc[feature.package_id]) {
        acc[feature.package_id] = [];
      }
      acc[feature.package_id].push(feature.feature_text);
      return acc;
    }, {} as Record<string, string[]>);

    // Combine packages with their features
    const packagesWithFeatures = packages.map(pkg => ({
      id: pkg.id,
      name: pkg.name,
      displayName: pkg.display_name,
      price: parseFloat(pkg.price.toString()),
      currency: pkg.currency,
      description: pkg.description,
      isPopular: pkg.is_popular,
      iconName: pkg.icon_name,
      iconColor: pkg.icon_color,
      features: featuresByPackage[pkg.id] || [],
    }));

    return NextResponse.json({ packages: packagesWithFeatures });
  } catch (error) {
    console.error('Error fetching washing packages:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch washing packages',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

