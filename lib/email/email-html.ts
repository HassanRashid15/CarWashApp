/**
 * Converts verification email props to HTML
 * Since Brevo doesn't support React Email, we render as HTML
 */
export function getVerificationEmailHTML(otp: string, isPasswordReset: boolean = false) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f6f9fc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;">
  <div style="max-width: 580px; margin: 0 auto; padding: 20px 0 48px; background-color: #ffffff;">
    <div style="padding: 20px;">
      <h1 style="color: #333; font-size: 24px; font-weight: 600; line-height: 1.25; margin-bottom: 24px; text-align: center;">
        ${isPasswordReset ? 'Reset your password' : 'Verify your email address'}
      </h1>
      
      <p style="color: #555; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
        ${isPasswordReset
          ? 'You requested to reset your password. Please use the following code to verify your identity:'
          : 'Thank you for signing up! Please use the following code to verify your account:'}
      </p>
      
      <div style="background: #f4f4f4; border-radius: 4px; padding: 16px; margin-bottom: 24px; text-align: center;">
        <p style="color: #333; font-size: 24px; font-weight: bold; letter-spacing: 4px; margin: 0;">
          ${otp}
        </p>
      </div>
      
      <p style="color: #555; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
        If you didn't request this email, you can safely ignore it.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export function getWelcomeEmailHTML(userEmail: string, dashboardUrl: string) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f6f9fc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;">
  <div style="max-width: 580px; margin: 0 auto; padding: 20px 0 48px; background-color: #ffffff;">
    <div style="padding: 20px;">
      <h1 style="color: #333; font-size: 24px; font-weight: 600; line-height: 1.25; margin-bottom: 24px; text-align: center;">
        Welcome to our platform!
      </h1>
      
      <p style="color: #555; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
        Thank you for joining us, ${userEmail}! We're excited to have you on board.
      </p>
      
      <p style="color: #555; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
        You can now access all features of our platform. If you have any questions or need assistance, feel free to reach out to our support team.
      </p>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${dashboardUrl}" style="background-color: #0066cc; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: 600;">
          Go to Dashboard
        </a>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export function getPasswordResetConfirmationHTML(userEmail: string, loginUrl: string) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f6f9fc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;">
  <div style="max-width: 580px; margin: 0 auto; padding: 20px 0 48px; background-color: #ffffff;">
    <div style="padding: 20px;">
      <h1 style="color: #333; font-size: 24px; font-weight: 600; line-height: 1.25; margin-bottom: 24px; text-align: center;">
        Your password has been reset
      </h1>
      
      <p style="color: #555; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
        Hello ${userEmail},
      </p>
      
      <p style="color: #555; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
        Your password has been successfully reset. You can now log in with your new password.
      </p>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${loginUrl}" style="background-color: #0066cc; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: 600;">
          Log In
        </a>
      </div>
      
      <p style="color: #555; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
        If you didn't request this password reset, please contact support immediately.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

