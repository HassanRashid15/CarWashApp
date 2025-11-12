import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendEmailWithBrevo } from '@/lib/email/brevo';

/**
 * POST - Send plan change request email to administration
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

    const body = await request.json();
    const { userId, userEmail, userName, currentPlan, targetPlan, description } = body;

    // Validate required fields
    if (!userEmail || !currentPlan || !targetPlan || !description) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Admin email (you can make this configurable via env)
    const adminEmail = process.env.ADMIN_EMAIL || 'hassanrashid0018@gmail.com';

    // Create email HTML
    const emailHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Plan Change Request</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">📋 Plan Change Request</h1>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <p style="font-size: 16px; color: #1f2937; margin-top: 0;">
              A user has requested to change their subscription plan.
            </p>
            
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: #1f2937; margin-top: 0; font-size: 18px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Request Details</h2>
              
              <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                <tr>
                  <td style="padding: 10px 0; font-weight: bold; color: #4b5563; width: 40%;">User Name:</td>
                  <td style="padding: 10px 0; color: #1f2937;">${userName || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-weight: bold; color: #4b5563;">User Email:</td>
                  <td style="padding: 10px 0; color: #1f2937;">
                    <a href="mailto:${userEmail}" style="color: #667eea; text-decoration: none;">${userEmail}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-weight: bold; color: #4b5563;">User ID:</td>
                  <td style="padding: 10px 0; color: #1f2937; font-family: monospace; font-size: 12px;">${userId}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-weight: bold; color: #4b5563;">Current Plan:</td>
                  <td style="padding: 10px 0; color: #1f2937;">
                    <span style="background: #e5e7eb; padding: 4px 12px; border-radius: 4px; font-weight: 600;">${currentPlan}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-weight: bold; color: #4b5563;">Requested Plan:</td>
                  <td style="padding: 10px 0; color: #1f2937;">
                    <span style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 4px 12px; border-radius: 4px; font-weight: 600;">${targetPlan}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-weight: bold; color: #4b5563; vertical-align: top;">Reason:</td>
                  <td style="padding: 10px 0; color: #1f2937;">
                    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px; margin-top: 5px;">
                      ${description.replace(/\n/g, '<br>')}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-weight: bold; color: #4b5563;">Request Date:</td>
                  <td style="padding: 10px 0; color: #1f2937;">
                    ${new Date().toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                </tr>
              </table>
            </div>
            
            <div style="background: #eff6ff; border-left: 4px solid #667eea; padding: 15px; border-radius: 4px; margin-top: 20px;">
              <p style="margin: 0; color: #1e40af; font-size: 14px;">
                <strong>📧 Action Required:</strong> Please review this request and contact the user to process the plan change.
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard" 
                 style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                View Dashboard
              </a>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
            <p>This is an automated email from CarWash App subscription system.</p>
          </div>
        </body>
      </html>
    `;

    // Send email to administration
    await sendEmailWithBrevo({
      to: adminEmail,
      subject: `Plan Change Request: ${userName} wants to change from ${currentPlan} to ${targetPlan}`,
      html: emailHTML,
      from: {
        name: 'CarWash App',
        email: 'hassanrashid0018@gmail.com',
      },
    });

    console.log(`✅ Plan change request email sent to ${adminEmail} for user ${userId}`);

    return NextResponse.json({
      success: true,
      message: 'Plan change request sent successfully',
    });
  } catch (error) {
    console.error('Error sending plan change request:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send plan change request', 
        details: (error as Error).message 
      },
      { status: 500 }
    );
  }
}



