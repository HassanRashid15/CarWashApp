/**
 * Trial expiration warning email template
 */

export function getTrialExpirationEmailHTML(
  adminName: string,
  trialEndsAt: Date,
  timeRemaining: string
): string {
  const formattedDate = trialEndsAt.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Trial Ending Soon</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">⏰ Your Trial is Ending Soon!</h1>
        </div>
        
        <div style="background: white; padding: 40px 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <p style="font-size: 16px; color: #1f2937; margin-top: 0;">
            Hi ${adminName || 'there'},
          </p>
          
          <p style="font-size: 16px; color: #1f2937;">
            We wanted to let you know that your <strong>free trial</strong> is coming to an end soon.
          </p>
          
          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 30px 0;">
            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
              <div style="font-size: 32px;">⏱️</div>
              <div>
                <p style="margin: 0; font-size: 14px; color: #92400e; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Time Remaining</p>
                <p style="margin: 5px 0 0 0; font-size: 24px; color: #78350f; font-weight: bold;">${timeRemaining}</p>
              </div>
            </div>
            <p style="margin: 10px 0 0 0; font-size: 14px; color: #92400e;">
              <strong>Trial ends:</strong> ${formattedDate}
            </p>
          </div>
          
          <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 20px; border-radius: 8px; margin: 30px 0;">
            <h2 style="color: #1e40af; margin-top: 0; font-size: 20px;">What happens when your trial ends?</h2>
            <ul style="color: #1e3a8a; padding-left: 20px; margin: 15px 0;">
              <li style="margin-bottom: 10px;">You'll lose access to premium features</li>
              <li style="margin-bottom: 10px;">Customer limit will be restricted</li>
              <li style="margin-bottom: 10px;">Some features will be disabled</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 40px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/settings" 
               style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3); transition: transform 0.2s;">
              Upgrade Your Plan Now
            </a>
          </div>
          
          <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-top: 30px;">
            <h3 style="color: #1f2937; margin-top: 0; font-size: 18px;">Choose a Plan That Works for You:</h3>
            <div style="margin-top: 15px;">
              <div style="margin-bottom: 15px; padding: 15px; background: white; border-radius: 6px; border: 1px solid #e5e7eb;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <strong style="color: #1f2937; font-size: 16px;">Starter Plan</strong>
                    <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">Up to 5 customers • Basic features</p>
                  </div>
                  <div style="text-align: right;">
                    <strong style="color: #667eea; font-size: 20px;">$29</strong>
                    <span style="color: #6b7280; font-size: 12px;">/month</span>
                  </div>
                </div>
              </div>
              
              <div style="margin-bottom: 15px; padding: 15px; background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%); border-radius: 6px; border: 2px solid #667eea;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <strong style="color: #1f2937; font-size: 16px;">Professional Plan ⭐ Recommended</strong>
                    <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">Unlimited customers • All features</p>
                  </div>
                  <div style="text-align: right;">
                    <strong style="color: #667eea; font-size: 20px;">$79</strong>
                    <span style="color: #6b7280; font-size: 12px;">/month</span>
                  </div>
                </div>
              </div>
              
              <div style="padding: 15px; background: white; border-radius: 6px; border: 1px solid #e5e7eb;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <strong style="color: #1f2937; font-size: 16px;">Enterprise Plan</strong>
                    <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">Everything + API access • White-label</p>
                  </div>
                  <div style="text-align: right;">
                    <strong style="color: #667eea; font-size: 20px;">$199</strong>
                    <span style="color: #6b7280; font-size: 12px;">/month</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <p style="font-size: 14px; color: #6b7280; margin-top: 30px; text-align: center;">
            Don't lose access to your data! Upgrade now to continue enjoying all features.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
          <p>This is an automated email from CarWash App. If you have any questions, please contact our support team.</p>
          <p style="margin-top: 10px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard" style="color: #667eea; text-decoration: none;">Go to Dashboard</a> | 
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/settings" style="color: #667eea; text-decoration: none;">Manage Subscription</a>
          </p>
        </div>
      </body>
    </html>
  `;
}



