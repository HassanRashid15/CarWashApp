/**
 * Customer limit warning email template
 */

export function getCustomerLimitWarningEmailHTML(
  adminName: string,
  currentCount: number,
  maxLimit: number,
  planType: string | null
): string {
  const planNames: Record<string, string> = {
    starter: 'Starter',
    professional: 'Professional',
    enterprise: 'Enterprise',
  };

  const planName = planType ? planNames[planType] || planType : 'Free';
  const remaining = maxLimit - currentCount;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Customer Limit Warning</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">⚠️ Customer Limit Warning</h1>
        </div>
        
        <div style="background: white; padding: 40px 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <p style="font-size: 16px; color: #1f2937; margin-top: 0;">
            Hi ${adminName || 'there'},
          </p>
          
          <p style="font-size: 16px; color: #1f2937;">
            You're approaching your customer limit! You currently have <strong>${currentCount} out of ${maxLimit} customers</strong> on your ${planName} plan.
          </p>
          
          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 30px 0;">
            <div style="display: flex; align-items: center; gap: 15px;">
              <div style="font-size: 32px;">📊</div>
              <div>
                <p style="margin: 0; font-size: 14px; color: #92400e; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Current Usage</p>
                <p style="margin: 5px 0 0 0; font-size: 24px; color: #78350f; font-weight: bold;">
                  ${currentCount} / ${maxLimit} customers
                </p>
                <p style="margin: 10px 0 0 0; font-size: 14px; color: #92400e;">
                  Only ${remaining} customer${remaining !== 1 ? 's' : ''} remaining!
                </p>
              </div>
            </div>
          </div>

          <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; border-radius: 8px; margin: 30px 0;">
            <p style="margin: 0; color: #991b1b; font-size: 16px; font-weight: 600;">
              ⚠️ Important Notice
            </p>
            <p style="margin: 10px 0 0 0; font-size: 14px; color: #991b1b;">
              Once you reach ${maxLimit} customers, you will no longer be able to add new customers or access advanced features like Queue System and Payment Processing. Upgrade your plan to continue growing your business.
            </p>
          </div>

          <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; border-radius: 8px; margin: 30px 0;">
            <p style="margin: 0; font-size: 16px; color: #065f46; font-weight: 600;">
              💡 Upgrade Now to Unlock More
            </p>
            <p style="margin: 10px 0 0 0; font-size: 14px; color: #047857;">
              Upgrade to a higher plan to increase your customer limit and unlock advanced features:
            </p>
            <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #047857; font-size: 14px;">
              <li><strong>Starter Plan:</strong> Up to 15 customers</li>
              <li><strong>Professional Plan:</strong> Up to 50 customers</li>
              <li><strong>Enterprise Plan:</strong> Unlimited customers</li>
            </ul>
          </div>

          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/settings?tab=billing" 
               style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
              View Plans & Upgrade
            </a>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
          <p>This is an automated warning email from CarWash App subscription system.</p>
          <p style="margin: 5px 0 0 0;">© ${new Date().getFullYear()} CarWash App. All rights reserved.</p>
        </div>
      </body>
    </html>
  `.trim();
}


