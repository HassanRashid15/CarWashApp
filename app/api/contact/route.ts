import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendContactQueryNotification } from '@/lib/emails/contact-emails';

/**
 * POST - Submit a contact form message
 * Uses admin client to bypass RLS for public form submissions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, message } = body;

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Use admin client to bypass RLS for public form submissions
    const supabase = createAdminClient();

    // Insert contact query
    const { data, error } = await supabase
      .from('Contact_us')
      .insert({
        name: name.trim(),
        email: email.trim(),
        phone: phone?.trim() || null,
        message: message.trim(),
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting contact query:', error);
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return NextResponse.json(
        { 
          error: 'Failed to submit contact form',
          details: error.message || 'Unknown error',
          code: error.code,
        },
        { status: 500 }
      );
    }

    // Send email notification to admins
    try {
      await sendContactQueryNotification({
        name: name.trim(),
        email: email.trim(),
        phone: phone?.trim() || undefined,
        message: message.trim(),
      });
      console.log(`📧 Contact query notification email sent to admins`);
    } catch (emailError) {
      console.error('Error sending contact query notification email:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json(
      { 
        success: true, 
        message: 'Your message has been sent successfully!',
        id: data.id
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error processing contact form:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process contact form',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

