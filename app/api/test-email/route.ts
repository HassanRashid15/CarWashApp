import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

// Resend test email addresses that work without verification
const RESEND_TEST_ADDRESSES = {
  delivered: 'delivered@resend.dev',
  bounced: 'bounced@resend.dev',
  complained: 'complained@resend.dev',
};

export async function POST(request: NextRequest) {
  try {
    if (!resend) {
      return NextResponse.json(
        { error: 'Email service not configured. Please set RESEND_API_KEY in environment variables.' },
        { status: 500 }
      );
    }

    const { email, testType } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // If using a test type, use the corresponding Resend test address
    const recipientEmail = testType && RESEND_TEST_ADDRESSES[testType as keyof typeof RESEND_TEST_ADDRESSES]
      ? RESEND_TEST_ADDRESSES[testType as keyof typeof RESEND_TEST_ADDRESSES]
      : email;

    const data = await resend.emails.send({
      from: fromEmail,
      to: recipientEmail,
      subject: 'Test Email from CarWash App',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Test Email</h1>
          <p>This is a test email from your CarWash App!</p>
          ${testType ? `<p><strong>Test Type:</strong> ${testType} - ${recipientEmail}</p>` : ''}
          <p>If you received this, your Resend integration is working correctly.</p>
          <p style="color: #666; font-size: 14px;">Sent at: ${new Date().toLocaleString()}</p>
        </div>
      `,
    });

    return NextResponse.json({ 
      success: true, 
      messageId: data.data?.id,
      message: 'Test email sent successfully!',
      recipient: recipientEmail,
      testType: testType || null,
      note: testType 
        ? `Using Resend test address: ${recipientEmail}. Check Resend dashboard logs to see the simulated result.`
        : 'Email sent to regular address. Make sure the recipient is verified if using onboarding@resend.dev.',
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

// GET endpoint to show available test addresses
export async function GET() {
  return NextResponse.json({
    testAddresses: {
      delivered: {
        address: RESEND_TEST_ADDRESSES.delivered,
        description: 'Simulates successful email delivery',
      },
      bounced: {
        address: RESEND_TEST_ADDRESSES.bounced,
        description: 'Simulates bounced email (SMTP 550 error)',
      },
      complained: {
        address: RESEND_TEST_ADDRESSES.complained,
        description: 'Simulates email marked as spam',
      },
    },
    usage: {
      method: 'POST',
      endpoint: '/api/test-email',
      body: {
        email: 'delivered@resend.dev', // or bounced@resend.dev, complained@resend.dev
        testType: 'delivered', // optional: 'delivered', 'bounced', or 'complained'
      },
    },
    note: 'These test addresses work immediately without domain verification. Check Resend dashboard logs to see results.',
  });
}
