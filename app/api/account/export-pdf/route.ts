import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

// Force Node.js runtime for PDF generation
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check if user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const adminSupabase = createAdminClient();

    // Collect all user data (with error handling for missing tables)
    const [
      profile,
      preferences,
      activityLogs,
      queueEntries,
      customers,
      products,
      serviceBookings,
    ] = await Promise.allSettled([
      adminSupabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single(),
      
      adminSupabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single(),
      
      adminSupabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100),
      
      adminSupabase
        .from('Queue')
        .select('*')
        .eq('customer_id', userId),
      
      adminSupabase
        .from('Customers')
        .select('*')
        .order('created_at', { ascending: false }),
      
      adminSupabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false }),
      
      adminSupabase
        .from('service_bookings')
        .select('*')
        .order('created_at', { ascending: false }),
    ]);

    // Extract data from Promise.allSettled results
    const profileData = profile.status === 'fulfilled' ? profile.value : { data: null, error: null };
    const preferencesData = preferences.status === 'fulfilled' ? preferences.value : { data: null, error: null };
    const activityLogsData = activityLogs.status === 'fulfilled' ? activityLogs.value : { data: [], error: null };
    const queueEntriesData = queueEntries.status === 'fulfilled' ? queueEntries.value : { data: [], error: null };
    const customersData = customers.status === 'fulfilled' ? customers.value : { data: [], error: null };
    const productsData = products.status === 'fulfilled' ? products.value : { data: [], error: null };
    const serviceBookingsData = serviceBookings.status === 'fulfilled' ? serviceBookings.value : { data: [], error: null };

    // Dynamic import for jsPDF (works better in Node.js)
    const { jsPDF } = await import('jspdf');
    
    // Create PDF with jsPDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    let yPosition = 20;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;
    const lineHeight = 7;
    const sectionSpacing = 10;

    // Helper function to check if new page is needed
    const checkNewPage = (requiredSpace: number = lineHeight) => {
      if (yPosition + requiredSpace > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
        return true;
      }
      return false;
    };

    // Helper function to add text with word wrap
    const addText = (text: string, fontSize: number = 11, isBold: boolean = false, color: string = '#000000') => {
      checkNewPage(fontSize / 2);
      doc.setFontSize(fontSize);
      doc.setTextColor(color);
      if (isBold) {
        doc.setFont('helvetica', 'bold');
      } else {
        doc.setFont('helvetica', 'normal');
      }
      
      const maxWidth = doc.internal.pageSize.width - (margin * 2);
      const lines = doc.splitTextToSize(text, maxWidth);
      doc.text(lines, margin, yPosition);
      yPosition += lines.length * (fontSize * 0.4) + 2;
    };

    // Header
    addText('Account Data Export', 20, true);
    yPosition += 2;
    addText(`Generated on: ${new Date().toLocaleString()}`, 12);
    yPosition += sectionSpacing;

    // Account Information
    addText('Account Information', 16, true);
    yPosition += 2;
    
    if (profileData.data) {
      const fullName = `${profileData.data.first_name || ''} ${profileData.data.last_name || ''}`.trim() || 'N/A';
      addText(`Name: ${fullName}`, 11);
      addText(`Email: ${profileData.data.email || 'N/A'}`, 11);
      addText(`Role: ${profileData.data.role || 'N/A'}`, 11);
      addText(`Contact: ${profileData.data.contact_no || 'N/A'}`, 11);
      addText(`Account Created: ${profileData.data.created_at ? new Date(profileData.data.created_at).toLocaleString() : 'N/A'}`, 11);
    }
    yPosition += sectionSpacing;

    // Email Preferences
    if (preferencesData.data) {
      addText('Email Preferences', 16, true);
      yPosition += 2;
      addText(`Email Notifications: ${preferencesData.data.email_notifications_enabled ? 'Enabled' : 'Disabled'}`, 11);
      addText(`Security Alerts: ${preferencesData.data.security_alerts_enabled ? 'Enabled' : 'Disabled'}`, 11);
      addText(`Queue Notifications: ${preferencesData.data.queue_notifications ? 'Enabled' : 'Disabled'}`, 11);
      addText(`Payment Notifications: ${preferencesData.data.payment_notifications ? 'Enabled' : 'Disabled'}`, 11);
      yPosition += sectionSpacing;
    }

    // Activity Logs
    addText('Activity Logs', 16, true);
    yPosition += 2;
    
    if (activityLogsData.data && activityLogsData.data.length > 0) {
      activityLogsData.data.slice(0, 20).forEach((log: any, index: number) => {
        try {
          const activityType = String(log.activity_type || 'Activity');
          const description = String(log.description || 'No description');
          addText(`${index + 1}. ${activityType} - ${description}`, 11);
          const dateStr = log.created_at ? new Date(log.created_at).toLocaleString() : 'N/A';
          const ipStr = log.ip_address ? ` | IP: ${String(log.ip_address)}` : '';
          addText(`   Date: ${dateStr}${ipStr}`, 9, false, '#666666');
          yPosition += 1;
        } catch (err) {
          console.error('Error processing log entry:', err);
        }
      });
      if (activityLogsData.data.length > 20) {
        addText(`... and ${activityLogsData.data.length - 20} more activities`, 11);
      }
    } else {
      addText('No activity logs found.', 11);
    }
    yPosition += sectionSpacing;

    // Queue Entries
    if (queueEntriesData.data && queueEntriesData.data.length > 0) {
      checkNewPage(20);
      addText('Queue Entries', 16, true);
      yPosition += 2;
      addText(`Total Queue Entries: ${queueEntriesData.data.length}`, 11);
      yPosition += 2;
      
      queueEntriesData.data.slice(0, 10).forEach((entry: any, index: number) => {
        addText(`${index + 1}. Queue #${entry.queue_number || 'N/A'}`, 11);
        addText(`   Service: ${entry.service_type || 'N/A'} | Status: ${entry.status || 'N/A'} | Price: Rs. ${entry.price || 0}`, 9, false, '#666666');
        addText(`   Date: ${entry.created_at ? new Date(entry.created_at).toLocaleString() : 'N/A'}`, 9, false, '#666666');
        yPosition += 1;
      });
      if (queueEntriesData.data.length > 10) {
        addText(`... and ${queueEntriesData.data.length - 10} more entries`, 11);
      }
      yPosition += sectionSpacing;
    }

    // Customers
    if (customersData.data && customersData.data.length > 0) {
      checkNewPage(20);
      addText('Customers', 16, true);
      yPosition += 2;
      addText(`Total Customers: ${customersData.data.length}`, 11);
      yPosition += 2;
      
      customersData.data.slice(0, 10).forEach((customer: any, index: number) => {
        addText(`${index + 1}. ${customer.name || 'N/A'}`, 11);
        addText(`   Phone: ${customer.phone || 'N/A'} | Vehicle: ${customer.vehicle_type || 'N/A'} | Status: ${customer.status || 'N/A'}`, 9, false, '#666666');
        addText(`   Created: ${customer.created_at ? new Date(customer.created_at).toLocaleString() : 'N/A'}`, 9, false, '#666666');
        yPosition += 1;
      });
      if (customersData.data.length > 10) {
        addText(`... and ${customersData.data.length - 10} more customers`, 11);
      }
      yPosition += sectionSpacing;
    }

    // Products
    if (productsData.data && productsData.data.length > 0) {
      checkNewPage(20);
      addText('Products', 16, true);
      yPosition += 2;
      addText(`Total Products: ${productsData.data.length}`, 11);
      yPosition += 2;
      
      productsData.data.slice(0, 10).forEach((product: any, index: number) => {
        addText(`${index + 1}. ${product.name || 'N/A'}`, 11);
        addText(`   SKU: ${product.sku || 'N/A'} | Price: Rs. ${product.price || 0} | Stock: ${product.stock_quantity || 0}`, 9, false, '#666666');
        addText(`   Status: ${product.status || 'N/A'}`, 9, false, '#666666');
        yPosition += 1;
      });
      if (productsData.data.length > 10) {
        addText(`... and ${productsData.data.length - 10} more products`, 11);
      }
      yPosition += sectionSpacing;
    }

    // Service Bookings
    if (serviceBookingsData.data && serviceBookingsData.data.length > 0) {
      checkNewPage(20);
      addText('Service Bookings', 16, true);
      yPosition += 2;
      addText(`Total Bookings: ${serviceBookingsData.data.length}`, 11);
      yPosition += 2;
      
      serviceBookingsData.data.slice(0, 10).forEach((booking: any, index: number) => {
        addText(`${index + 1}. ${booking.service_name || 'N/A'}`, 11);
        addText(`   Customer: ${booking.customer_name || 'N/A'} | Price: ${booking.service_price || 'N/A'}`, 9, false, '#666666');
        addText(`   Status: ${booking.status || 'N/A'} | Date: ${booking.created_at ? new Date(booking.created_at).toLocaleString() : 'N/A'}`, 9, false, '#666666');
        yPosition += 1;
      });
      if (serviceBookingsData.data.length > 10) {
        addText(`... and ${serviceBookingsData.data.length - 10} more bookings`, 11);
      }
    }

    // Summary
    checkNewPage(30);
    addText('Summary', 16, true);
    yPosition += 2;
    addText(`Total Activity Logs: ${activityLogsData.data?.length || 0}`, 11);
    addText(`Total Queue Entries: ${queueEntriesData.data?.length || 0}`, 11);
    addText(`Total Customers: ${customersData.data?.length || 0}`, 11);
    addText(`Total Products: ${productsData.data?.length || 0}`, 11);
    addText(`Total Service Bookings: ${serviceBookingsData.data?.length || 0}`, 11);

    // Footer on last page
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.setTextColor('#666666');
      doc.text(
        'This document contains your personal data exported from CarWash App.',
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }

    // Generate PDF buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="account-data-${new Date().toISOString().split('T')[0]}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error exporting PDF:', error);
    return NextResponse.json(
      { error: 'Failed to export PDF', details: (error as Error).message },
      { status: 500 }
    );
  }
}
