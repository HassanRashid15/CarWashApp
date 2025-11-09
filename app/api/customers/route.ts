import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { sendCustomerNotificationEmail, sendCustomerLimitWarningEmail } from '@/lib/emails/notification-emails';
import { checkSubscriptionAccess, getUsageCounts } from '@/lib/utils/subscription-helpers';
import { isWithinLimit, getPlanLimits, type PlanType } from '@/lib/utils/plan-limits';

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

    const { data: customers, error } = await supabase
      .from('Customers')
      .select('*')
      .order('entry_time', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ customers: customers || [] });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customers', details: (error as Error).message },
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
      phone, 
      vehicle_type,
      vehicle_number,
      car_type,
      car_name,
      car_year,
      car_color,
      bike_type,
      bike_name,
      bike_year,
      bike_color,
      other_details,
      status,
      remarks
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Customer name is required' },
        { status: 400 }
      );
    }

    // Check subscription access
    let subscriptionCheck;
    try {
      subscriptionCheck = await checkSubscriptionAccess(session.user.id);
    } catch (subError) {
      console.error('Error checking subscription access:', subError);
      return NextResponse.json(
        { 
          error: 'Failed to verify subscription. Please check your configuration.',
          details: subError instanceof Error ? subError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

    if (!subscriptionCheck.allowed) {
      return NextResponse.json(
        { error: subscriptionCheck.error || 'Subscription required' },
        { status: 403 }
      );
    }

    // Check customer limit
    let usage;
    try {
      usage = await getUsageCounts(session.user.id);
    } catch (usageError) {
      console.error('Error getting usage counts:', usageError);
      return NextResponse.json(
        { 
          error: 'Failed to check usage limits. Please try again.',
          details: usageError instanceof Error ? usageError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

    // If no subscription found, restrict to 5 customers only
    if (!subscriptionCheck.subscription) {
      const maxCustomersNoPlan = 5;
      if (usage.customers >= maxCustomersNoPlan) {
        return NextResponse.json(
          { 
            error: `You've reached the customer limit (${maxCustomersNoPlan}) for your current plan. Please select a subscription plan to add more customers.`,
            limitReached: true,
            showUpgradeModal: true,
            currentCount: usage.customers,
            maxLimit: maxCustomersNoPlan,
            planType: null,
          },
          { status: 403 }
        );
      }
    } else {
      // Check limits for users with subscription
      const planType = subscriptionCheck.subscription.planType;
    const limits = getPlanLimits(planType);

    if (!isWithinLimit(planType, 'maxCustomers', usage.customers)) {
      const maxCustomers = limits.maxCustomers;
      return NextResponse.json(
        { 
          error: maxCustomers 
            ? `You've reached the customer limit (${maxCustomers}) for your plan. Upgrade to continue adding customers.`
            : 'Unable to create customer. Please upgrade your plan.',
          limitReached: true,
          showUpgradeModal: true,
          currentCount: usage.customers,
          maxLimit: maxCustomers,
          planType: planType,
        },
        { status: 403 }
      );
      }
    }

    // Validate vehicle_type if provided
    const validVehicleTypes = ['car', 'bike', 'other'];
    if (vehicle_type && !validVehicleTypes.includes(vehicle_type)) {
      return NextResponse.json(
        { error: 'Invalid vehicle type. Must be: car, bike, or other' },
        { status: 400 }
      );
    }

    // Validate status if provided
    const validStatuses = ['waiting', 'washing', 'completed', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be: waiting, washing, completed, or cancelled' },
        { status: 400 }
      );
    }

    // Generate unique_id (format: CST_XXXX where XXXX is 4 dynamic digits)
    const randomSuffix = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
    const uniqueId = `CST_${randomSuffix}`;

    // Build insert data
    const insertData: any = {
      name: name.trim(),
      unique_id: uniqueId,
      vehicle_type: vehicle_type || 'car',
      status: status || 'waiting',
      entry_time: new Date().toISOString(),
      admin_id: session.user.id, // Link customer to admin
    };

    // Add optional fields only if they have values
    if (phone?.trim()) {
      insertData.phone = phone.trim();
    }
    
    if (vehicle_number?.trim()) {
      insertData.vehicle_number = vehicle_number.trim();
    }
    
    // Add car-specific fields if vehicle type is car
    if (vehicle_type === 'car') {
      if (car_type?.trim()) {
        insertData.car_type = car_type.trim();
      }
      if (car_name?.trim()) {
        insertData.car_name = car_name.trim();
      }
      if (car_year && !isNaN(parseInt(car_year.toString()))) {
        insertData.car_year = parseInt(car_year.toString());
      }
      if (car_color?.trim()) {
        insertData.car_color = car_color.trim();
      }
    }
    
    // Add bike-specific fields if vehicle type is bike
    if (vehicle_type === 'bike') {
      if (bike_type?.trim()) {
        insertData.bike_type = bike_type.trim();
      }
      if (bike_name?.trim()) {
        insertData.bike_name = bike_name.trim();
      }
      if (bike_year && !isNaN(parseInt(bike_year.toString()))) {
        insertData.bike_year = parseInt(bike_year.toString());
      }
      if (bike_color?.trim()) {
        insertData.bike_color = bike_color.trim();
      }
    }
    
    // Add other_details if vehicle type is other
    if (vehicle_type === 'other' && other_details?.trim()) {
      insertData.other_details = other_details.trim();
    }
    
    if (remarks?.trim()) {
      insertData.remarks = remarks.trim();
    }

    // If status is completed or cancelled, set exit_time
    if (status === 'completed' || status === 'cancelled') {
      insertData.exit_time = new Date().toISOString();
    }

    console.log('Inserting customer data:', JSON.stringify(insertData, null, 2));

    const { data: customer, error } = await supabase
      .from('Customers')
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
            error: 'Customers table does not exist. Please create it in Supabase.',
            details: 'See the SQL schema in supabase-customers-table.sql to create the table.',
            supabaseError: error.message
          },
          { status: 500 }
        );
      }

      // Handle column not found errors (PGRST204 is PostgREST error for missing column)
      if (error.code === 'PGRST204' || error.code === '42703' || error.message.includes('column') || error.message.includes('does not exist')) {
        const missingColumn = error.message.includes('admin_id') 
          ? 'admin_id (required for subscription system)'
          : error.message.includes('car_type') || error.message.includes('bike_type')
          ? 'vehicle-specific columns (car_type, car_name, car_year, car_color, bike_type, bike_name, bike_year, bike_color, other_details)'
          : 'one or more required columns';
        
        return NextResponse.json(
          { 
            error: 'Database schema mismatch. Missing required columns.',
            details: `The Customers table is missing: ${missingColumn}`,
            solution: 'Run the migration file: supabase/migrations/add_admin_id_to_customers.sql in your Supabase SQL Editor',
            supabaseError: error.message,
            hint: 'Go to Supabase Dashboard → SQL Editor → Run the migration file to add missing columns.'
          },
          { status: 500 }
        );
      }

      throw error;
    }

    // Send email notification for new customer
    if (customer && session.user) {
      try {
        const adminSupabase = createAdminClient();
        const { data: adminProfile } = await adminSupabase
          .from('profiles')
          .select('id, email, first_name, last_name, full_name')
          .eq('id', session.user.id)
          .single();

        if (adminProfile?.email && adminProfile?.id) {
          // Send customer creation notification
          await sendCustomerNotificationEmail(
            adminProfile.id,
            adminProfile.email,
            'created',
            {
              customerName: customer.name,
              customerId: customer.unique_id || customer.id,
              phone: customer.phone || undefined,
              vehicleType: customer.vehicle_type || 'car',
              vehicleNumber: customer.vehicle_number || undefined,
              status: customer.status || undefined,
            }
          );

          // Check if we need to send limit warning email (second last customer)
          const newCustomerCount = usage.customers + 1; // After adding this customer
          let maxLimit: number;
          let planType: string | null = null;

          if (!subscriptionCheck.subscription) {
            maxLimit = 5; // No plan limit
          } else {
            planType = subscriptionCheck.subscription.planType;
            const limits = getPlanLimits(planType as PlanType);
            maxLimit = limits.maxCustomers || Infinity;
          }

          // Send warning if at second last customer (one before limit)
          if (maxLimit !== Infinity && newCustomerCount === maxLimit - 1) {
            const adminName = adminProfile.full_name || 
                            (adminProfile.first_name && adminProfile.last_name 
                              ? `${adminProfile.first_name} ${adminProfile.last_name}` 
                              : adminProfile.first_name || 'Admin');
            
            try {
              await sendCustomerLimitWarningEmail(
                adminProfile.id,
                adminProfile.email,
                adminName,
                newCustomerCount,
                maxLimit,
                planType
              );
              console.log(`📧 Customer limit warning email sent to ${adminProfile.email}`);
            } catch (warningError) {
              console.error('Error sending customer limit warning email:', warningError);
              // Don't fail the request if warning email fails
            }
          }
        }
      } catch (emailError) {
        console.error('Error sending customer notification email:', emailError);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({ customer }, { status: 201 });
  } catch (error) {
    console.error('Error creating customer:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { 
        error: 'Failed to create customer',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}

