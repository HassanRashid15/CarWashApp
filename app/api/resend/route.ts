import PasswordResetConfirmationEmail from '@/lib/emails/password-reset-confirmation-email';
import VerificationEmail from '@/lib/emails/verification-email';
import WelcomeEmail from '@/lib/emails/welcome-email';
import { createAdminClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

export async function POST(request: NextRequest) {
  try {
    if (!resend) {
      return NextResponse.json(
        { error: 'Email service not configured. Please set RESEND_API_KEY in environment variables.' },
        { status: 500 }
      );
    }

    const { type, email, password, isPasswordReset, origin, firstName, lastName, contactNo, profileImageUrl } =
      await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    let data;

    switch (type) {
      case 'verification':
        const supabase = createAdminClient();
        const res = await supabase.auth.admin.generateLink({
          type: isPasswordReset ? 'recovery' : 'signup',
          email,
          password: isPasswordReset ? undefined : password,
        });

        if (res.data.properties?.email_otp) {
          // Store profile data temporarily if provided (for signup)
          if (!isPasswordReset && (firstName || lastName || contactNo || profileImageUrl)) {
            // Store in a temporary storage or pass through response
            // We'll handle this in the verify form after OTP verification
          }

          data = await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: email,
            subject: isPasswordReset
              ? 'Reset your password'
              : 'Verify your email',
            react: VerificationEmail({
              otp: res.data.properties?.email_otp,
              isPasswordReset: !!isPasswordReset,
            }),
          });
        } else {
          return NextResponse.json({ data: null, error: res.error });
        }

        break;

      case 'welcome':
        const dashboardUrl = origin
          ? `${origin}/dashboard`
          : `${new URL(request.url).origin}/dashboard`;

        data = await resend.emails.send({
          from: 'onboarding@resend.dev',
          to: email,
          subject: 'Welcome to our platform!',
          react: WelcomeEmail({
            userEmail: email,
            dashboardUrl,
          }),
        });
        break;

      case 'password-reset-confirmation':
        const loginUrl = origin
          ? `${origin}/auth/login`
          : `${new URL(request.url).origin}/auth/login`;

        data = await resend.emails.send({
          from: 'onboarding@resend.dev',
          to: email,
          subject: 'Your password has been reset',
          react: PasswordResetConfirmationEmail({
            userEmail: email,
            loginUrl,
          }),
        });
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid email type' },
          { status: 400 }
        );
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
