import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { sendProductNotificationEmail } from '@/lib/emails/notification-emails';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 }
        );
      }
      throw error;
    }

    return NextResponse.json({ product });
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id } = await params;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Product name is required' },
        { status: 400 }
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

    const updateData: any = {
      name: name.trim(),
      price: price ? parseFloat(price.toString()) : 0,
      stock_quantity: stock_quantity ? parseInt(stock_quantity.toString()) : 0,
      min_stock_level: min_stock_level ? parseInt(min_stock_level.toString()) : 0,
      status: status || 'active',
      updated_at: new Date().toISOString(),
    };

    // Add optional fields
    if (description?.trim()) {
      updateData.description = description.trim();
    } else {
      updateData.description = null;
    }
    
    if (category?.trim()) {
      updateData.category = category.trim();
    } else {
      updateData.category = null;
    }
    
    if (cost !== undefined && cost !== null && cost !== '') {
      updateData.cost = parseFloat(cost.toString());
    } else {
      updateData.cost = null;
    }
    
    if (unit?.trim()) {
      updateData.unit = unit.trim();
    } else {
      updateData.unit = null;
    }
    
    if (supplier?.trim()) {
      updateData.supplier = supplier.trim();
    } else {
      updateData.supplier = null;
    }
    
    if (sku?.trim()) {
      updateData.sku = sku.trim();
    }
    
    if (barcode?.trim()) {
      updateData.barcode = barcode.trim();
    } else {
      updateData.barcode = null;
    }
    
    if (image_url?.trim()) {
      updateData.image_url = image_url.trim();
    } else {
      updateData.image_url = null;
    }

    const { data: product, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 }
        );
      }
      throw error;
    }

    // Send email notification for product update
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
            isLowStock ? 'low_stock' : 'updated',
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

    return NextResponse.json({ product });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { error: 'Failed to update product', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 }
        );
      }
      throw error;
    }

    return NextResponse.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: 'Failed to delete product', details: (error as Error).message },
      { status: 500 }
    );
  }
}

