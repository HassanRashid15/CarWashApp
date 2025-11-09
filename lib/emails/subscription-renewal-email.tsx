/**
 * Subscription renewal notification email template
 */

export function getSubscriptionRenewalEmailHTML(
  adminName: string,
  planType: string,
  renewalDate: Date,
  currentPeriodEnd: Date
): string {
  const formattedRenewalDate = renewalDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formattedPeriodEnd = currentPeriodEnd.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const planNames: Record<string, string> = {
    starter: 'Starter Plan',
    professional: 'Professional Plan',
    enterprise: 'Enterprise Plan',
  };

  const planName = planNames[planType.toLowerCase()] || planType;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Subscription Renewal Required</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">🔄 Subscription Renewal Required</h1>
        </div>
        
        <div style="background: white; padding: 40px 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <p style="font-size: 16px; color: #1f2937; margin-top: 0;">
            Hi ${adminName || 'there'},
          </p>
          
          <p style="font-size: 16px; color: #1f2937;">
            Your <strong>${planName}</strong> subscription period is ending soon. To continue enjoying uninterrupted access to all features, please renew your subscription.
          </p>
          
          <div style="background: #eff6ff; border-left: 4px solid #667eea; padding: 20px; border-radius: 8px; margin: 30px 0;">
            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
              <div style="font-size: 32px;">📅</div>
              <div>
                <p style="margin: 0; font-size: 14px; color: #1e40af; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Current Period Ends</p>
                <p style="margin: 5px 0 0 0; font-size: 24px; color: #1e3a8a; font-weight: bold;">
                  ${formattedPeriodEnd}
                </p>
              </div>
            </div>
          </div>

          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 30px 0;">
            <div style="display: flex; align-items: center; gap: 15px;">
              <div style="font-size: 32px;">⏰</div>
              <div>
                <p style="margin: 0; font-size: 14px; color: #92400e; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Renewal Date</p>
                <p style="margin: 5px 0 0 0; font-size: 20px; color: #78350f; font-weight: bold;">
                  ${formattedRenewalDate}
                </p>
              </div>
            </div>
          </div>

          <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; border-radius: 8px; margin: 30px 0;">
            <p style="margin: 0; font-size: 16px; color: #065f46; font-weight: 600;">
              ✅ Your subscription will be automatically renewed after super admin approval.
            </p>
            <p style="margin: 10px 0 0 0; font-size: 14px; color: #047857;">
              You will receive a confirmation email once your renewal is approved and activated.
            </p>
          </div>

          <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 30px 0; border: 1px solid #e5e7eb;">
            <h3 style="margin-top: 0; color: #1f2937; font-size: 18px;">📋 Subscription Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #4b5563; width: 40%;">Plan:</td>
                <td style="padding: 10px 0; color: #1f2937;">${planName}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #4b5563;">Status:</td>
                <td style="padding: 10px 0; color: #1f2937;">Active (Renewal Pending)</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #4b5563;">Renewal Date:</td>
                <td style="padding: 10px 0; color: #1f2937;">${formattedRenewalDate}</td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px; margin: 0;">
              If you have any questions or need assistance, please don't hesitate to contact our support team.
            </p>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
          <p>This is an automated email from CarWash App subscription system.</p>
          <p style="margin: 5px 0 0 0;">© ${new Date().getFullYear()} CarWash App. All rights reserved.</p>
        </div>
      </body>
    </html>
  `.trim();
}


