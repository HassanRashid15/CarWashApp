import PasswordResetConfirmationEmail from '@/lib/emails/password-reset-confirmation-email';
import VerificationEmail from '@/lib/emails/verification-email';
import WelcomeEmail from '@/lib/emails/welcome-email';
import { createAdminClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { sendEmailWithBrevo } from '@/lib/email/brevo';
import { getVerificationEmailHTML, getWelcomeEmailHTML, getPasswordResetConfirmationHTML } from '@/lib/email/email-html';

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
// Use Brevo if API key is set AND not explicitly disabled
const useBrevo = !!process.env.BREVO_API_KEY && process.env.USE_BREVO !== 'false';

export async function POST(request: NextRequest) {
  try {
    // Check if at least one email service is configured
    if (!resend && !useBrevo) {
      return NextResponse.json(
        { error: 'Email service not configured. Please set RESEND_API_KEY or BREVO_API_KEY in environment variables.' },
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
        
        // Check for duplicates before signup (only for new signups, not password resets)
        // Skip duplicate check if password is not provided (likely a resend OTP scenario)
        if (!isPasswordReset && password) {
          // Check if email already exists in auth.users
          const { data: existingUsers } = await supabase.auth.admin.listUsers();
          const emailExists = existingUsers?.users?.some(user => 
            user.email?.toLowerCase() === email.toLowerCase()
          );
          
          if (emailExists) {
            return NextResponse.json(
              { error: 'An account with this email already exists. Please use a different email or sign in instead.' },
              { status: 409 }
            );
          }
          
          // Check if contact number already exists in profiles table
          if (contactNo) {
            const { data: existingProfile } = await supabase
              .from('profiles')
              .select('id, contact_no, email')
              .eq('contact_no', contactNo)
              .maybeSingle();
            
            // If contact number exists for another user
            if (existingProfile) {
              return NextResponse.json(
                { error: 'An account with this contact number already exists. Please use a different contact number.' },
                { status: 409 }
              );
            }
          }
        }
        
        // Generate OTP link - password is optional for resend scenarios
        const res = await supabase.auth.admin.generateLink({
          type: isPasswordReset ? 'recovery' : 'signup',
          email,
          password: isPasswordReset ? undefined : (password || undefined),
        });

        if (res.error) {
          // If password is required but missing for signup, provide helpful error
          if (res.error.message?.includes('password') || res.error.message?.includes('Password')) {
            return NextResponse.json(
              { error: 'Password is required for new signups. If resending OTP, please use the resend button on the verification page.' },
              { status: 400 }
            );
          }
          return NextResponse.json(
            { error: res.error.message || 'Failed to generate verification code' },
            { status: 500 }
          );
        }

        if (res.data.properties?.email_otp) {
          // Store profile data temporarily if provided (for signup)
          if (!isPasswordReset && (firstName || lastName || contactNo || profileImageUrl)) {
            // Store in a temporary storage or pass through response
            // We'll handle this in the verify form after OTP verification
          }

          try {
            // Try Brevo first if configured (sends to any email)
            if (useBrevo) {
              try {
                const html = getVerificationEmailHTML(res.data.properties?.email_otp, !!isPasswordReset);
                data = await sendEmailWithBrevo({
                  to: email,
                  subject: isPasswordReset ? 'Reset your password' : 'Verify your email',
                  html,
                  from: {
                    name: 'CarWash App',
                    email: 'hassanrashid0018@gmail.com',
                  },
                });
                
                console.log(`Email sent successfully to ${email} via Brevo`);
              } catch (brevoError: any) {
                console.warn('Brevo failed, falling back to Resend:', brevoError.message);
                // Fallback to Resend if Brevo fails
                if (resend) {
                  data = await resend.emails.send({
                    from: fromEmail,
                    to: email,
                    subject: isPasswordReset
                      ? 'Reset your password'
                      : 'Verify your email',
                    react: VerificationEmail({
                      otp: res.data.properties?.email_otp,
                      isPasswordReset: !!isPasswordReset,
                    }),
                  });
                  console.log(`Email sent successfully to ${email} via Resend (fallback)`);
                } else {
                  throw brevoError; // Re-throw if Resend not available
                }
              }
            } else {
              // Use Resend if Brevo not configured
              if (!resend) {
                throw new Error('No email service configured. Please set RESEND_API_KEY or BREVO_API_KEY');
              }
              data = await resend.emails.send({
                from: fromEmail,
                to: email,
                subject: isPasswordReset
                  ? 'Reset your password'
                  : 'Verify your email',
                react: VerificationEmail({
                  otp: res.data.properties?.email_otp,
                  isPasswordReset: !!isPasswordReset,
                }),
              });
              
              console.log(`Email sent successfully to ${email} from ${fromEmail}`);
            }
          } catch (emailError: any) {
            console.error('Email sending error:', {
              error: emailError.message,
              from: useBrevo ? 'hassanrashid0018@gmail.com' : fromEmail,
              to: email,
              provider: useBrevo ? 'Brevo (failed)' : 'Resend',
              details: emailError,
            });
            throw emailError;
          }
        } else {
          return NextResponse.json({ data: null, error: res.error });
        }

        break;

      case 'welcome':
        const dashboardUrl = origin
          ? `${origin}/dashboard`
          : `${new URL(request.url).origin}/dashboard`;

        if (useBrevo) {
          try {
            const html = getWelcomeEmailHTML(email, dashboardUrl);
            data = await sendEmailWithBrevo({
              to: email,
              subject: 'Welcome to our platform!',
              html,
              from: {
                name: 'CarWash App',
                email: 'hassanrashid0018@gmail.com',
              },
            });
          } catch (brevoError: any) {
            console.warn('Brevo failed for welcome email, falling back to Resend:', brevoError.message);
            if (resend) {
              data = await resend.emails.send({
                from: fromEmail,
                to: email,
                subject: 'Welcome to our platform!',
                react: WelcomeEmail({
                  userEmail: email,
                  dashboardUrl,
                }),
              });
            } else {
              throw brevoError;
            }
          }
        } else {
          if (!resend) {
            throw new Error('No email service configured');
          }
          data = await resend.emails.send({
            from: fromEmail,
            to: email,
            subject: 'Welcome to our platform!',
            react: WelcomeEmail({
              userEmail: email,
              dashboardUrl,
            }),
          });
        }
        break;

      case 'password-reset-confirmation':
        const loginUrl = origin
          ? `${origin}/auth/login`
          : `${new URL(request.url).origin}/auth/login`;

        if (useBrevo) {
          try {
            const html = getPasswordResetConfirmationHTML(email, loginUrl);
            data = await sendEmailWithBrevo({
              to: email,
              subject: 'Your password has been reset',
              html,
              from: {
                name: 'CarWash App',
                email: 'hassanrashid0018@gmail.com',
              },
            });
          } catch (brevoError: any) {
            console.warn('Brevo failed for password reset confirmation, falling back to Resend:', brevoError.message);
            if (resend) {
              data = await resend.emails.send({
                from: fromEmail,
                to: email,
                subject: 'Your password has been reset',
                react: PasswordResetConfirmationEmail({
                  userEmail: email,
                  loginUrl,
                }),
              });
            } else {
              throw brevoError;
            }
          }
        } else {
          if (!resend) {
            throw new Error('No email service configured');
          }
          data = await resend.emails.send({
            from: fromEmail,
            to: email,
            subject: 'Your password has been reset',
            react: PasswordResetConfirmationEmail({
              userEmail: email,
              loginUrl,
            }),
          });
        }
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid email type' },
          { status: 400 }
        );
    }

    return NextResponse.json({ data });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Resend API error:', {
      error: errorMessage,
      fromEmail: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      hasResendKey: !!process.env.RESEND_API_KEY,
    });
    
    // Provide helpful error messages
    if (errorMessage.includes('domain') || errorMessage.includes('sender')) {
      return NextResponse.json(
        { 
          error: 'Email sending failed. Please verify your domain in Resend and set RESEND_FROM_EMAIL to a verified email address.',
          details: errorMessage 
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
