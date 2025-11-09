import { sendEmailWithBrevo } from '@/lib/email/brevo';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * Send email notification when a customer submits feedback
 */
export async function sendFeedbackNotification(
  adminId: string,
  feedbackData: {
    customerName: string;
    customerId: string;
    serviceRating: number;
    serviceQuality: string;
    workerRating?: number;
    workerFeedback?: string;
    overallExperience: string;
    wouldRecommend?: boolean;
    additionalComments?: string;
    vehicleType?: string;
    vehicleNumber?: string;
  }
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
      console.error('Admin email not found for feedback notification');
      return { sent: false, reason: 'Admin email not found' };
    }

    const adminName = adminProfile.full_name || 
                     (adminProfile.first_name && adminProfile.last_name 
                       ? `${adminProfile.first_name} ${adminProfile.last_name}` 
                       : adminProfile.first_name || 'Admin');

    // Generate star rating display
    const generateStars = (rating: number) => {
      return '⭐'.repeat(rating) + '☆'.repeat(5 - rating);
    };

    const recommendationText = feedbackData.wouldRecommend === true 
      ? 'Yes, would recommend' 
      : feedbackData.wouldRecommend === false 
      ? 'No, would not recommend' 
      : 'Not specified';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Customer Feedback</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">💬 New Customer Feedback</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hello ${adminName},</p>
            <p style="font-size: 16px; margin-bottom: 20px;">
              You have received new feedback from a customer.
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
              <h2 style="margin-top: 0; color: #10b981;">Customer Information</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; font-weight: bold; color: #4b5563;">Customer Name:</td>
                  <td style="padding: 10px 0; color: #1f2937;">${feedbackData.customerName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-weight: bold; color: #4b5563;">Customer ID:</td>
                  <td style="padding: 10px 0; color: #1f2937;">${feedbackData.customerId}</td>
                </tr>
                ${feedbackData.vehicleType ? `
                <tr>
                  <td style="padding: 10px 0; font-weight: bold; color: #4b5563;">Vehicle Type:</td>
                  <td style="padding: 10px 0; color: #1f2937;">${feedbackData.vehicleType}</td>
                </tr>
                ` : ''}
                ${feedbackData.vehicleNumber ? `
                <tr>
                  <td style="padding: 10px 0; font-weight: bold; color: #4b5563;">Vehicle Number:</td>
                  <td style="padding: 10px 0; color: #1f2937;">${feedbackData.vehicleNumber}</td>
                </tr>
                ` : ''}
              </table>
            </div>

            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
              <h2 style="margin-top: 0; color: #10b981;">Feedback Details</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; font-weight: bold; color: #4b5563;">Service Rating:</td>
                  <td style="padding: 10px 0; color: #1f2937; font-size: 18px;">${generateStars(feedbackData.serviceRating)} (${feedbackData.serviceRating}/5)</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-weight: bold; color: #4b5563;">Service Quality:</td>
                  <td style="padding: 10px 0; color: #1f2937;">${feedbackData.serviceQuality}</td>
                </tr>
                ${feedbackData.workerRating ? `
                <tr>
                  <td style="padding: 10px 0; font-weight: bold; color: #4b5563;">Worker Rating:</td>
                  <td style="padding: 10px 0; color: #1f2937; font-size: 18px;">${generateStars(feedbackData.workerRating)} (${feedbackData.workerRating}/5)</td>
                </tr>
                ` : ''}
                ${feedbackData.workerFeedback ? `
                <tr>
                  <td style="padding: 10px 0; font-weight: bold; color: #4b5563;">Worker Feedback:</td>
                  <td style="padding: 10px 0; color: #1f2937;">${feedbackData.workerFeedback}</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 10px 0; font-weight: bold; color: #4b5563;">Overall Experience:</td>
                  <td style="padding: 10px 0; color: #1f2937;">${feedbackData.overallExperience}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-weight: bold; color: #4b5563;">Would Recommend:</td>
                  <td style="padding: 10px 0; color: #1f2937;">${recommendationText}</td>
                </tr>
                ${feedbackData.additionalComments ? `
                <tr>
                  <td style="padding: 10px 0; font-weight: bold; color: #4b5563;">Additional Comments:</td>
                  <td style="padding: 10px 0; color: #1f2937;">${feedbackData.additionalComments}</td>
                </tr>
                ` : ''}
              </table>
            </div>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 12px; margin: 0;">
                This is an automated email from CarWash App feedback system.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    await sendEmailWithBrevo({
      to: adminProfile.email,
      subject: `New Customer Feedback - ${feedbackData.customerName}`,
      html,
      from: {
        name: 'CarWash App',
        email: 'hassanrashid0018@gmail.com',
      },
    });

    return { sent: true };
  } catch (error) {
    console.error('Error sending feedback notification:', error);
    return { sent: false, reason: 'Email sending failed' };
  }
}

