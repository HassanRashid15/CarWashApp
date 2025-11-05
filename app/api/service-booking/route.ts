import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendEmailWithBrevo } from '@/lib/email/brevo';

export async function POST(request: NextRequest) {
  try {
    const { serviceName, servicePrice, serviceFeatures, customerName, contactNo, description } = await request.json();

    // Validate required fields
    if (!serviceName || !customerName || !contactNo) {
      return NextResponse.json(
        { error: 'Service name, customer name, and contact number are required' },
        { status: 400 }
      );
    }

    // Get admin email from profiles table
    const supabase = createAdminClient();
    const { data: adminProfiles, error: adminError } = await supabase
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('role', 'admin')
      .limit(1);

    // Save booking to database
    const { data: booking, error: bookingError } = await supabase
      .from('service_bookings')
      .insert({
        service_name: serviceName,
        service_price: servicePrice,
        service_features: serviceFeatures || [],
        customer_name: customerName,
        contact_no: contactNo,
        description: description || null,
        status: 'pending',
      })
      .select()
      .single();

    if (bookingError) {
      console.error('Error saving booking to database:', bookingError);
      // Continue with email even if database save fails
    }

    // Send email notification
    if (adminError || !adminProfiles || adminProfiles.length === 0) {
      console.error('Error fetching admin email:', adminError);
      const adminEmail = process.env.ADMIN_EMAIL || 'hassanrashid0018@gmail.com';
      await sendServiceBookingEmail(adminEmail, serviceName, servicePrice, serviceFeatures || [], customerName, contactNo, description);
    } else {
      const adminEmail = adminProfiles[0].email;
      if (!adminEmail) {
        return NextResponse.json(
          { error: 'Admin email not found' },
          { status: 500 }
        );
      }
      await sendServiceBookingEmail(adminEmail, serviceName, servicePrice, serviceFeatures || [], customerName, contactNo, description);
    }

    return NextResponse.json({
      success: true,
      message: 'Service booking request sent successfully',
      booking: booking || null,
    });
  } catch (error) {
    console.error('Error sending service booking email:', error);
    return NextResponse.json(
      { error: 'Failed to send service booking email', details: (error as Error).message },
      { status: 500 }
    );
  }
}

async function sendServiceBookingEmail(
  adminEmail: string,
  serviceName: string,
  servicePrice: string,
  serviceFeatures: string[],
  customerName: string,
  contactNo: string,
  description?: string
) {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Service Booking Request</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🚗 New Service Booking Request</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
          <h2 style="color: #1f2937; margin-top: 0;">Service Details</h2>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #4b5563; width: 40%;">Service:</td>
                <td style="padding: 10px 0; color: #1f2937;">${serviceName}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #4b5563;">Price:</td>
                <td style="padding: 10px 0; color: #1f2937; font-size: 18px; font-weight: bold; color: #667eea;">${servicePrice}</td>
              </tr>
            </table>
            ${serviceFeatures && serviceFeatures.length > 0 ? `
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <h3 style="color: #1f2937; font-size: 16px; font-weight: 600; margin-bottom: 12px;">Service Includes:</h3>
              <ul style="margin: 0; padding-left: 20px; list-style: none;">
                ${serviceFeatures.map((feature: string) => `
                  <li style="padding: 8px 0; color: #4b5563; position: relative; padding-left: 25px;">
                    <span style="position: absolute; left: 0; color: #10b981; font-weight: bold;">✓</span>
                    ${feature}
                  </li>
                `).join('')}
              </ul>
            </div>
            ` : ''}
          </div>

          <h2 style="color: #1f2937; margin-top: 30px;">Customer Information</h2>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #4b5563; width: 40%;">Name:</td>
                <td style="padding: 10px 0; color: #1f2937;">${customerName}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #4b5563;">Contact No:</td>
                <td style="padding: 10px 0; color: #1f2937;">
                  <a href="tel:${contactNo}" style="color: #667eea; text-decoration: none;">${contactNo}</a>
                </td>
              </tr>
              ${description ? `
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #4b5563; vertical-align: top;">Description:</td>
                <td style="padding: 10px 0; color: #1f2937;">${description}</td>
              </tr>
              ` : ''}
            </table>
          </div>

          <div style="background: #eff6ff; border-left: 4px solid #667eea; padding: 15px; border-radius: 4px; margin-top: 20px;">
            <p style="margin: 0; color: #1e40af; font-size: 14px;">
              <strong>📅 Booking Date:</strong> ${new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        </div>

        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
          <p>This is an automated email from CarWash App service booking system.</p>
        </div>
      </body>
    </html>
  `;

  await sendEmailWithBrevo({
    to: adminEmail,
    subject: `New Service Booking: ${serviceName} - ${customerName}`,
    html: htmlContent,
    from: {
      name: 'CarWash App',
      email: 'hassanrashid0018@gmail.com',
    },
  });
}

