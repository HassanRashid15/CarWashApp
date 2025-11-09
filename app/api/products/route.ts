import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { sendProductNotificationEmail } from '@/lib/emails/notification-emails';
import { checkSubscriptionAccess, getUsageCounts } from '@/lib/utils/subscription-helpers';
import { isWithinLimit, getPlanLimits, hasFeature } from '@/lib/utils/plan-limits';

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

    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });

      if (error.code === '42P01' || error.message.includes('does not exist')) {
        return NextResponse.json(
          { 
            error: 'Products table does not exist. Please create it in Supabase.',
            details: 'Run the SQL migration file: supabase/migrations/create_products_table.sql',
            supabaseError: error.message
          },
          { status: 500 }
        );
      }

      throw error;
    }

    return NextResponse.json({ products: products || [] });
  } catch (error) {
    console.error('Error fetching products:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorCode = (error as any)?.code;
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch products', 
        details: errorMessage,
        code: errorCode
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { 
      name, 
      description,
      category,
      price,
      cost,
      stock_quantity,
      min_stock_level,
      unit,
      supplier,
      sku,
      barcode,
      image_url,
      status
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Product name is required' },
        { status: 400 }
      );
    }

    // Check subscription access
    const subscriptionCheck = await checkSubscriptionAccess(session.user.id);
    if (!subscriptionCheck.allowed) {
      return NextResponse.json(
        { error: subscriptionCheck.error || 'Subscription required' },
        { status: 403 }
      );
    }

    // Check if inventory tracking feature is available
    const planType = subscriptionCheck.subscription?.planType || 'starter';
    if (!hasFeature(planType, 'inventoryTracking')) {
      return NextResponse.json(
        { 
          error: 'Inventory tracking is not available in your plan. Upgrade to Professional or Enterprise to track products.',
          featureRequired: 'inventoryTracking',
        },
        { status: 403 }
      );
    }

    // Check product limit (if applicable)
    const usage = await getUsageCounts(session.user.id);
    const limits = getPlanLimits(planType);

    if (!isWithinLimit(planType, 'maxProducts', usage.products)) {
      const maxProducts = limits.maxProducts;
      return NextResponse.json(
        { 
          error: maxProducts 
            ? `You've reached the product limit (${maxProducts}) for your plan. Please upgrade.`
            : 'Unable to create product. Please upgrade your plan.',
          limitReached: true,
          currentCount: usage.products,
          maxLimit: maxProducts,
        },
        { status: 403 }
      );
    }

    // Validate status if provided
    const validStatuses = ['active', 'inactive', 'discontinued'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be: active, inactive, or discontinued' },
        { status: 400 }
      );
    }

    // Generate SKU if not provided
    let productSku = sku?.trim();
    if (!productSku) {
      const datePrefix = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      productSku = `PROD-${datePrefix}-${randomSuffix}`;
    }

    // Build insert data
    const insertData: any = {
      name: name.trim(),
      sku: productSku,
      status: status || 'active',
      price: price ? parseFloat(price.toString()) : 0,
      stock_quantity: stock_quantity ? parseInt(stock_quantity.toString()) : 0,
      min_stock_level: min_stock_level ? parseInt(min_stock_level.toString()) : 0,
      admin_id: session.user.id, // Link product to admin
    };

    // Add optional fields only if they have values
    if (description?.trim()) {
      insertData.description = description.trim();
    }
    
    if (category?.trim()) {
      insertData.category = category.trim();
    }
    
    if (cost !== undefined && cost !== null && cost !== '') {
      insertData.cost = parseFloat(cost.toString());
    }
    
    if (unit?.trim()) {
      insertData.unit = unit.trim();
    }
    
    if (supplier?.trim()) {
      insertData.supplier = supplier.trim();
    }
    
    if (barcode?.trim()) {
      insertData.barcode = barcode.trim();
    }
    
    if (image_url?.trim()) {
      insertData.image_url = image_url.trim();
    }

    console.log('Inserting product data:', JSON.stringify(insertData, null, 2));

    const { data: product, error } = await supabase
      .from('products')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('Supabase error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });

      if (error.code === '42P01' || error.message.includes('does not exist')) {
        return NextResponse.json(
          { 
            error: 'Products table does not exist. Please create it in Supabase.',
            details: 'See the SQL schema to create the products table.',
            supabaseError: error.message
          },
          { status: 500 }
        );
      }

      throw error;
    }

    // Send email notification for new product
    if (product && session.user) {
      try {
        const adminSupabase = createAdminClient();
        const { data: adminProfile } = await adminSupabase
          .from('profiles')
          .select('id, email')
          .eq('id', session.user.id)
          .single();

        if (adminProfile?.email && adminProfile?.id) {
          // Check if low stock
          const isLowStock = product.min_stock_level && product.stock_quantity <= product.min_stock_level;
          
          await sendProductNotificationEmail(
            adminProfile.id,
            adminProfile.email,
            isLowStock ? 'low_stock' : 'created',
            {
              productName: product.name,
              productSku: product.sku,
              category: product.category || undefined,
              price: product.price || 0,
              stockQuantity: product.stock_quantity || 0,
              minStockLevel: product.min_stock_level || undefined,
              status: product.status || undefined,
            }
          );
        }
      } catch (emailError) {
        console.error('Error sending product notification email:', emailError);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { 
        error: 'Failed to create product',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}

