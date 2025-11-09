import { sendEmailWithBrevo } from '@/lib/email/brevo';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * Send email notification when a contact query is submitted
 */
export async function sendContactQueryNotification(
  contactData: {
    name: string;
    email: string;
    phone?: string;
    message: string;
  }
) {
  try {
    const supabase = createAdminClient();
    
    // Get super admin email
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'hassanrashid001@icloud.com';
    
    // Also get all admin emails to notify them
    const { data: adminProfiles } = await supabase
      .from('profiles')
      .select('email, full_name, first_name, last_name, role')
      .in('role', ['admin', 'super_admin']);

    const adminEmails = adminProfiles?.map(p => p.email).filter(Boolean) || [];
    
    // Ensure super admin email is included
    if (superAdminEmail && !adminEmails.includes(superAdminEmail)) {
      adminEmails.push(superAdminEmail);
    }

    if (adminEmails.length === 0) {
      console.error('No admin emails found for contact query notification');
      return { sent: false, reason: 'No admin emails found' };
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Contact Query</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">📧 New Contact Query</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hello,</p>
            <p style="font-size: 16px; margin-bottom: 20px;">
              You have received a new contact query from the website.
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
              <h2 style="margin-top: 0; color: #3b82f6;">Contact Information</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; font-weight: bold; color: #4b5563;">Name:</td>
                  <td style="padding: 10px 0; color: #1f2937;">${contactData.name}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-weight: bold; color: #4b5563;">Email:</td>
                  <td style="padding: 10px 0; color: #1f2937;">
                    <a href="mailto:${contactData.email}" style="color: #3b82f6; text-decoration: none;">${contactData.email}</a>
                  </td>
                </tr>
                ${contactData.phone ? `
                <tr>
                  <td style="padding: 10px 0; font-weight: bold; color: #4b5563;">Phone:</td>
                  <td style="padding: 10px 0; color: #1f2937;">
                    <a href="tel:${contactData.phone}" style="color: #3b82f6; text-decoration: none;">${contactData.phone}</a>
                  </td>
                </tr>
                ` : ''}
              </table>
            </div>

            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
              <h2 style="margin-top: 0; color: #3b82f6;">Message</h2>
              <div style="background: #f9fafb; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb;">
                <p style="margin: 0; color: #1f2937; white-space: pre-wrap;">${contactData.message}</p>
              </div>
            </div>

            <div style="background: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
              <p style="margin: 0; color: #1e40af; font-size: 14px;">
                <strong>💡 Action Required:</strong> Please respond to this query as soon as possible. You can reply directly to ${contactData.email}.
              </p>
            </div>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 12px; margin: 0;">
                This is an automated email from CarWash App contact form.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send to all admins
    const sendPromises = adminEmails.map(email => 
      sendEmailWithBrevo({
        to: email,
        subject: `New Contact Query from ${contactData.name}`,
        html,
        from: {
          name: 'CarWash App',
          email: 'hassanrashid0018@gmail.com',
        },
      }).catch(error => {
        console.error(`Failed to send contact query notification to ${email}:`, error);
        return { sent: false, error };
      })
    );

    await Promise.all(sendPromises);

    return { sent: true, recipients: adminEmails.length };
  } catch (error) {
    console.error('Error sending contact query notification:', error);
    return { sent: false, reason: 'Email sending failed' };
  }
}

