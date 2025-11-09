import { sendEmailWithBrevo } from '@/lib/email/brevo';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * Send email notification when a plan is purchased
 */
export async function sendPlanPurchaseNotification(
  adminId: string,
  planType: string,
  amount: number
) {
  try {
    const supabase = createAdminClient();
    
    // Get admin details
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('email, full_name, first_name, last_name')
      .eq('id', adminId)
      .single();

    if (!adminProfile?.email) {
      console.error('Admin email not found for plan purchase notification');
      return { sent: false, reason: 'Admin email not found' };
    }

    const adminName = adminProfile.full_name || 
                     (adminProfile.first_name && adminProfile.last_name 
                       ? `${adminProfile.first_name} ${adminProfile.last_name}` 
                       : adminProfile.first_name || 'Admin');

    const planNames: Record<string, string> = {
      starter: 'Starter Plan',
      professional: 'Professional Plan',
      enterprise: 'Enterprise Plan',
    };

    const planName = planNames[planType as string] || planType;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Plan Purchase Confirmation</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">🎉 Plan Purchase Confirmed!</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hello ${adminName},</p>
            <p style="font-size: 16px; margin-bottom: 20px;">
              Thank you for purchasing the <strong>${planName}</strong>! Your subscription is now pending approval from our super admin.
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
              <h2 style="margin-top: 0; color: #667eea;">Purchase Details</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; font-weight: bold; color: #4b5563;">Plan:</td>
                  <td style="padding: 10px 0; color: #1f2937;">${planName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-weight: bold; color: #4b5563;">Amount:</td>
                  <td style="padding: 10px 0; color: #1f2937;">$${amount.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-weight: bold; color: #4b5563;">Status:</td>
                  <td style="padding: 10px 0; color: #f59e0b; font-weight: bold;">Pending Approval</td>
                </tr>
              </table>
            </div>

            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                <strong>⏳ Next Steps:</strong> Your subscription is currently pending approval. You will receive an email notification once it's approved by our super admin.
              </p>
            </div>

            <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
              If you have any questions, please don't hesitate to contact our support team.
            </p>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 12px; margin: 0;">
                This is an automated email from CarWash App.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    await sendEmailWithBrevo({
      to: adminProfile.email,
      subject: `Plan Purchase Confirmed - ${planName}`,
      html,
      from: {
        name: 'CarWash App',
        email: 'hassanrashid0018@gmail.com',
      },
    });

    // Also notify super admin
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'hassanrashid001@icloud.com';
    if (superAdminEmail && superAdminEmail !== adminProfile.email) {
      const superAdminHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>New Plan Purchase - Requires Approval</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0;">⚠️ New Plan Purchase - Approval Required</h1>
            </div>
            <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
              <p style="font-size: 16px; margin-bottom: 20px;">Hello Super Admin,</p>
              <p style="font-size: 16px; margin-bottom: 20px;">
                A new plan purchase requires your approval.
              </p>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                <h2 style="margin-top: 0; color: #f59e0b;">Purchase Details</h2>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 10px 0; font-weight: bold; color: #4b5563;">Admin:</td>
                    <td style="padding: 10px 0; color: #1f2937;">${adminName} (${adminProfile.email})</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; font-weight: bold; color: #4b5563;">Plan:</td>
                    <td style="padding: 10px 0; color: #1f2937;">${planName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; font-weight: bold; color: #4b5563;">Amount:</td>
                    <td style="padding: 10px 0; color: #1f2937;">$${amount.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; font-weight: bold; color: #4b5563;">Status:</td>
                    <td style="padding: 10px 0; color: #f59e0b; font-weight: bold;">Pending Approval</td>
                  </tr>
                </table>
              </div>

              <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">
                  <strong>Action Required:</strong> Please review and approve or reject this subscription in the admin dashboard.
                </p>
              </div>
            </div>
          </body>
        </html>
      `;

      await sendEmailWithBrevo({
        to: superAdminEmail,
        subject: `New Plan Purchase - ${planName} - Approval Required`,
        html: superAdminHtml,
        from: {
          name: 'CarWash App',
          email: 'hassanrashid0018@gmail.com',
        },
      });
    }

    return { sent: true };
  } catch (error) {
    console.error('Error sending plan purchase notification:', error);
    return { sent: false, reason: 'Email sending failed' };
  }
}

/**
 * Send email notification when subscription status changes
 */
export async function sendSubscriptionStatusChangeNotification(
  adminId: string,
  planType: string,
  status: 'active' | 'canceled' | 'trial',
  previousStatus?: string
) {
  try {
    const supabase = createAdminClient();
    
    // Get admin details
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('email, full_name, first_name, last_name')
      .eq('id', adminId)
      .single();

    if (!adminProfile?.email) {
      console.error('Admin email not found for subscription status change notification');
      return { sent: false, reason: 'Admin email not found' };
    }

    const adminName = adminProfile.full_name || 
                     (adminProfile.first_name && adminProfile.last_name 
                       ? `${adminProfile.first_name} ${adminProfile.last_name}` 
                       : adminProfile.first_name || 'Admin');

    const planNames: Record<string, string> = {
      starter: 'Starter Plan',
      professional: 'Professional Plan',
      enterprise: 'Enterprise Plan',
      trial: 'Trial Plan',
    };

    const planName = planNames[planType as string] || planType;

    let subject = '';
    let title = '';
    let message = '';
    let statusColor = '';
    let statusBg = '';

    if (status === 'active') {
      subject = `Subscription Approved - ${planName} is Now Active`;
      title = '✅ Subscription Approved!';
      message = `Great news! Your ${planName} subscription has been approved and is now active. You can now enjoy all the features of your plan.`;
      statusColor = '#10b981';
      statusBg = '#d1fae5';
    } else if (status === 'canceled') {
      subject = `Subscription Rejected - ${planName}`;
      title = '❌ Subscription Rejected';
      message = `Your ${planName} subscription request has been rejected. If you have any questions, please contact our support team.`;
      statusColor = '#ef4444';
      statusBg = '#fee2e2';
    } else if (status === 'trial') {
      subject = `Subscription Cancelled - Reverted to Trial Plan`;
      title = '🔄 Subscription Cancelled - Trial Plan Active';
      message = `Your subscription has been cancelled and your account has been reverted to a trial plan. You can continue using the system with trial plan features.`;
      statusColor = '#3b82f6';
      statusBg = '#dbeafe';
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, ${statusColor} 0%, ${statusColor}dd 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">${title}</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hello ${adminName},</p>
            <p style="font-size: 16px; margin-bottom: 20px;">${message}</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${statusColor};">
              <h2 style="margin-top: 0; color: ${statusColor};">Subscription Details</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; font-weight: bold; color: #4b5563;">Plan:</td>
                  <td style="padding: 10px 0; color: #1f2937;">${planName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-weight: bold; color: #4b5563;">Status:</td>
                  <td style="padding: 10px 0; color: ${statusColor}; font-weight: bold; text-transform: capitalize;">${status}</td>
                </tr>
                ${previousStatus ? `
                <tr>
                  <td style="padding: 10px 0; font-weight: bold; color: #4b5563;">Previous Status:</td>
                  <td style="padding: 10px 0; color: #1f2937; text-transform: capitalize;">${previousStatus}</td>
                </tr>
                ` : ''}
              </table>
            </div>

            <div style="background: ${statusBg}; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${statusColor};">
              <p style="margin: 0; color: ${statusColor}; font-size: 14px;">
                ${status === 'active' 
                  ? '<strong>🎉 You\'re all set!</strong> Log in to your dashboard to start using your plan features.' 
                  : status === 'trial'
                  ? '<strong>ℹ️ Trial Active:</strong> You can continue using the system with trial plan features. Upgrade anytime to unlock more features.'
                  : '<strong>Need Help?</strong> If you have any questions about this decision, please contact our support team.'}
              </p>
            </div>

            <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
              If you have any questions, please don't hesitate to contact our support team.
            </p>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 12px; margin: 0;">
                This is an automated email from CarWash App.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    await sendEmailWithBrevo({
      to: adminProfile.email,
      subject,
      html,
      from: {
        name: 'CarWash App',
        email: 'hassanrashid0018@gmail.com',
      },
    });

    return { sent: true };
  } catch (error) {
    console.error('Error sending subscription status change notification:', error);
    return { sent: false, reason: 'Email sending failed' };
  }
}

