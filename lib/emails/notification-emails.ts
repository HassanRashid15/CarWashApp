import { sendEmailWithBrevo } from '@/lib/email/brevo';
import { shouldSendEmailNotification } from '@/lib/utils/email-helpers';
import { getTrialExpirationEmailHTML } from './trial-expiration-email';
import { getSubscriptionRenewalEmailHTML } from './subscription-renewal-email';
import { getSubscription29DayReminderEmailHTML } from './subscription-29day-reminder-email';
import { getCustomerLimitWarningEmailHTML } from './customer-limit-warning-email';

/**
 * Send queue notification email
 */
export async function sendQueueNotificationEmail(
  adminId: string,
  adminEmail: string,
  type: 'new_entry' | 'status_change' | 'worker_assigned',
  data: {
    queueNumber: number;
    customerName: string;
    serviceType: string;
    price: number;
    status?: string;
    oldStatus?: string;
    workerName?: string;
  }
) {
  // Check if queue notifications are enabled
  const shouldSend = await shouldSendEmailNotification(adminId, 'queue_notifications');
  if (!shouldSend) {
    return { sent: false, reason: 'Queue notifications disabled' };
  }

  let subject = '';
  let htmlContent = '';

  switch (type) {
    case 'new_entry':
      subject = `New Queue Entry #${data.queueNumber} - ${data.customerName}`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>New Queue Entry</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">📋 New Queue Entry</h1>
            </div>
            <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
              <h2 style="color: #1f2937; margin-top: 0;">Queue Entry Details</h2>
              <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 10px 0; font-weight: bold; color: #4b5563; width: 40%;">Queue Number:</td>
                    <td style="padding: 10px 0; color: #1f2937; font-size: 18px; font-weight: bold; color: #667eea;">#${data.queueNumber}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; font-weight: bold; color: #4b5563;">Customer:</td>
                    <td style="padding: 10px 0; color: #1f2937;">${data.customerName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; font-weight: bold; color: #4b5563;">Service Type:</td>
                    <td style="padding: 10px 0; color: #1f2937;">${data.serviceType}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; font-weight: bold; color: #4b5563;">Price:</td>
                    <td style="padding: 10px 0; color: #1f2937; font-weight: bold;">Rs. ${data.price}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; font-weight: bold; color: #4b5563;">Status:</td>
                    <td style="padding: 10px 0; color: #1f2937;">
                      <span style="background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; text-transform: capitalize;">
                        ${data.status || 'waiting'}
                      </span>
                    </td>
                  </tr>
                </table>
              </div>
              <div style="background: #eff6ff; border-left: 4px solid #667eea; padding: 15px; border-radius: 4px;">
                <p style="margin: 0; color: #1e40af; font-size: 14px;">
                  <strong>📅 Created:</strong> ${new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
              <p>This is an automated email from CarWash App queue system.</p>
            </div>
          </body>
        </html>
      `;
      break;

    case 'status_change':
      subject = `Queue Entry #${data.queueNumber} Status Changed - ${data.customerName}`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Queue Status Changed</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">🔄 Queue Status Updated</h1>
            </div>
            <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
              <h2 style="color: #1f2937; margin-top: 0;">Status Change Details</h2>
              <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 10px 0; font-weight: bold; color: #4b5563; width: 40%;">Queue Number:</td>
                    <td style="padding: 10px 0; color: #1f2937; font-size: 18px; font-weight: bold; color: #667eea;">#${data.queueNumber}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; font-weight: bold; color: #4b5563;">Customer:</td>
                    <td style="padding: 10px 0; color: #1f2937;">${data.customerName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; font-weight: bold; color: #4b5563;">Previous Status:</td>
                    <td style="padding: 10px 0; color: #1f2937; text-transform: capitalize;">${data.oldStatus || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; font-weight: bold; color: #4b5563;">New Status:</td>
                    <td style="padding: 10px 0; color: #1f2937;">
                      <span style="background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; text-transform: capitalize;">
                        ${data.status}
                      </span>
                    </td>
                  </tr>
                </table>
              </div>
            </div>
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
              <p>This is an automated email from CarWash App queue system.</p>
            </div>
          </body>
        </html>
      `;
      break;

    case 'worker_assigned':
      subject = `Worker Assigned to Queue #${data.queueNumber} - ${data.customerName}`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Worker Assigned</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">👷 Worker Assigned</h1>
            </div>
            <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
              <h2 style="color: #1f2937; margin-top: 0;">Assignment Details</h2>
              <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 10px 0; font-weight: bold; color: #4b5563; width: 40%;">Queue Number:</td>
                    <td style="padding: 10px 0; color: #1f2937; font-size: 18px; font-weight: bold; color: #667eea;">#${data.queueNumber}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; font-weight: bold; color: #4b5563;">Customer:</td>
                    <td style="padding: 10px 0; color: #1f2937;">${data.customerName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; font-weight: bold; color: #4b5563;">Service:</td>
                    <td style="padding: 10px 0; color: #1f2937;">${data.serviceType}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; font-weight: bold; color: #4b5563;">Assigned Worker:</td>
                    <td style="padding: 10px 0; color: #1f2937; font-weight: bold; color: #10b981;">${data.workerName}</td>
                  </tr>
                </table>
              </div>
            </div>
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
              <p>This is an automated email from CarWash App queue system.</p>
            </div>
          </body>
        </html>
      `;
      break;
  }

  try {
    await sendEmailWithBrevo({
      to: adminEmail,
      subject,
      html: htmlContent,
      from: {
        name: 'CarWash App',
        email: 'hassanrashid0018@gmail.com',
      },
    });
    return { sent: true };
  } catch (error) {
    console.error('Error sending queue notification email:', error);
    return { sent: false, reason: 'Email sending failed' };
  }
}

/**
 * Send payment notification email
 */
export async function sendPaymentNotificationEmail(
  adminId: string,
  adminEmail: string,
  type: 'payment_received' | 'payment_pending',
  data: {
    queueNumber: number;
    customerName: string;
    amount: number;
    paymentMethod: string;
    bankName?: string;
  }
) {
  // Check if payment notifications are enabled
  const shouldSend = await shouldSendEmailNotification(adminId, 'payment_notifications');
  if (!shouldSend) {
    return { sent: false, reason: 'Payment notifications disabled' };
  }

  const paymentMethodLabels: Record<string, string> = {
    cash: 'Cash',
    easypaisa: 'Easypaisa',
    jazzcash: 'JazzCash',
    bank_transfer: 'Bank Transfer',
  };

  const subject = type === 'payment_received' 
    ? `Payment Received - Queue #${data.queueNumber} - Rs. ${data.amount}`
    : `Payment Pending - Queue #${data.queueNumber}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Notification</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">${type === 'payment_received' ? '💰 Payment Received' : '⏳ Payment Pending'}</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
          <h2 style="color: #1f2937; margin-top: 0;">Payment Details</h2>
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #4b5563; width: 40%;">Queue Number:</td>
                <td style="padding: 10px 0; color: #1f2937; font-size: 18px; font-weight: bold; color: #667eea;">#${data.queueNumber}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #4b5563;">Customer:</td>
                <td style="padding: 10px 0; color: #1f2937;">${data.customerName}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #4b5563;">Amount:</td>
                <td style="padding: 10px 0; color: #1f2937; font-size: 20px; font-weight: bold; color: #10b981;">Rs. ${data.amount}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #4b5563;">Payment Method:</td>
                <td style="padding: 10px 0; color: #1f2937;">${paymentMethodLabels[data.paymentMethod] || data.paymentMethod}</td>
              </tr>
              ${data.bankName ? `
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #4b5563;">Bank:</td>
                <td style="padding: 10px 0; color: #1f2937;">${data.bankName}</td>
              </tr>
              ` : ''}
            </table>
          </div>
          <div style="background: ${type === 'payment_received' ? '#d1fae5' : '#fef3c7'}; border-left: 4px solid ${type === 'payment_received' ? '#10b981' : '#f59e0b'}; padding: 15px; border-radius: 4px;">
            <p style="margin: 0; color: ${type === 'payment_received' ? '#065f46' : '#92400e'}; font-size: 14px;">
              <strong>📅 ${type === 'payment_received' ? 'Paid' : 'Pending'} Date:</strong> ${new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        </div>
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
          <p>This is an automated email from CarWash App payment system.</p>
        </div>
      </body>
    </html>
  `;

  try {
    await sendEmailWithBrevo({
      to: adminEmail,
      subject,
      html: htmlContent,
      from: {
        name: 'CarWash App',
        email: 'hassanrashid0018@gmail.com',
      },
    });
    return { sent: true };
  } catch (error) {
    console.error('Error sending payment notification email:', error);
    return { sent: false, reason: 'Email sending failed' };
  }
}

/**
 * Send service booking notification email
 */
export async function sendServiceBookingNotificationEmail(
  adminId: string,
  adminEmail: string,
  data: {
    serviceName: string;
    servicePrice: string;
    serviceFeatures: string[];
    customerName: string;
    contactNo: string;
    description?: string;
  }
) {
  // Check if email notifications are enabled
  const shouldSend = await shouldSendEmailNotification(adminId, 'email_notifications_enabled');
  if (!shouldSend) {
    return { sent: false, reason: 'Email notifications disabled' };
  }

  const subject = `New Service Booking: ${data.serviceName} - ${data.customerName}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Service Booking Request</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🚗 New Service Booking Request</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
          <h2 style="color: #1f2937; margin-top: 0;">Service Details</h2>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #4b5563; width: 40%;">Service:</td>
                <td style="padding: 10px 0; color: #1f2937;">${data.serviceName}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #4b5563;">Price:</td>
                <td style="padding: 10px 0; color: #1f2937; font-size: 18px; font-weight: bold; color: #667eea;">${data.servicePrice}</td>
              </tr>
            </table>
            ${data.serviceFeatures && data.serviceFeatures.length > 0 ? `
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <h3 style="color: #1f2937; font-size: 16px; font-weight: 600; margin-bottom: 12px;">Service Includes:</h3>
              <ul style="margin: 0; padding-left: 20px; list-style: none;">
                ${data.serviceFeatures.map((feature: string) => `
                  <li style="padding: 8px 0; color: #4b5563; position: relative; padding-left: 25px;">
                    <span style="position: absolute; left: 0; color: #10b981; font-weight: bold;">✓</span>
                    ${feature}
                  </li>
                `).join('')}
              </ul>
            </div>
            ` : ''}
          </div>

          <h2 style="color: #1f2937; margin-top: 30px;">Customer Information</h2>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #4b5563; width: 40%;">Name:</td>
                <td style="padding: 10px 0; color: #1f2937;">${data.customerName}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #4b5563;">Contact No:</td>
                <td style="padding: 10px 0; color: #1f2937;">
                  <a href="tel:${data.contactNo}" style="color: #667eea; text-decoration: none;">${data.contactNo}</a>
                </td>
              </tr>
              ${data.description ? `
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #4b5563; vertical-align: top;">Description:</td>
                <td style="padding: 10px 0; color: #1f2937;">${data.description}</td>
              </tr>
              ` : ''}
            </table>
          </div>

          <div style="background: #eff6ff; border-left: 4px solid #667eea; padding: 15px; border-radius: 4px; margin-top: 20px;">
            <p style="margin: 0; color: #1e40af; font-size: 14px;">
              <strong>📅 Booking Date:</strong> ${new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        </div>

        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
          <p>This is an automated email from CarWash App service booking system.</p>
        </div>
      </body>
    </html>
  `;

  try {
    await sendEmailWithBrevo({
      to: adminEmail,
      subject,
      html: htmlContent,
      from: {
        name: 'CarWash App',
        email: 'hassanrashid0018@gmail.com',
      },
    });
    return { sent: true };
  } catch (error) {
    console.error('Error sending service booking notification email:', error);
    return { sent: false, reason: 'Email sending failed' };
  }
}

/**
 * Send customer notification email
 */
export async function sendCustomerNotificationEmail(
  adminId: string,
  adminEmail: string,
  type: 'created' | 'updated',
  data: {
    customerName: string;
    customerId: string;
    phone?: string;
    vehicleType: string;
    vehicleNumber?: string;
    status?: string;
  }
) {
  // Check if email notifications are enabled
  const shouldSend = await shouldSendEmailNotification(adminId, 'email_notifications_enabled');
  if (!shouldSend) {
    return { sent: false, reason: 'Email notifications disabled' };
  }

  const subject = type === 'created' 
    ? `New Customer Added: ${data.customerName}`
    : `Customer Updated: ${data.customerName}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${type === 'created' ? 'New Customer' : 'Customer Updated'}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">${type === 'created' ? '👤 New Customer Added' : '✏️ Customer Updated'}</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
          <h2 style="color: #1f2937; margin-top: 0;">Customer Details</h2>
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #4b5563; width: 40%;">Customer ID:</td>
                <td style="padding: 10px 0; color: #1f2937; font-family: monospace;">${data.customerId}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #4b5563;">Name:</td>
                <td style="padding: 10px 0; color: #1f2937; font-weight: bold;">${data.customerName}</td>
              </tr>
              ${data.phone ? `
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #4b5563;">Phone:</td>
                <td style="padding: 10px 0; color: #1f2937;">
                  <a href="tel:${data.phone}" style="color: #667eea; text-decoration: none;">${data.phone}</a>
                </td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #4b5563;">Vehicle Type:</td>
                <td style="padding: 10px 0; color: #1f2937; text-transform: capitalize;">${data.vehicleType}</td>
              </tr>
              ${data.vehicleNumber ? `
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #4b5563;">Vehicle Number:</td>
                <td style="padding: 10px 0; color: #1f2937; font-family: monospace;">${data.vehicleNumber}</td>
              </tr>
              ` : ''}
              ${data.status ? `
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #4b5563;">Status:</td>
                <td style="padding: 10px 0; color: #1f2937;">
                  <span style="background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; text-transform: capitalize;">
                    ${data.status}
                  </span>
                </td>
              </tr>
              ` : ''}
            </table>
          </div>
          <div style="background: #eff6ff; border-left: 4px solid #667eea; padding: 15px; border-radius: 4px;">
            <p style="margin: 0; color: #1e40af; font-size: 14px;">
              <strong>📅 ${type === 'created' ? 'Added' : 'Updated'} Date:</strong> ${new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        </div>
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
          <p>This is an automated email from CarWash App customer management system.</p>
        </div>
      </body>
    </html>
  `;

  try {
    await sendEmailWithBrevo({
      to: adminEmail,
      subject,
      html: htmlContent,
      from: {
        name: 'CarWash App',
        email: 'hassanrashid0018@gmail.com',
      },
    });
    return { sent: true };
  } catch (error) {
    console.error('Error sending customer notification email:', error);
    return { sent: false, reason: 'Email sending failed' };
  }
}

/**
 * Send product notification email
 */
export async function sendProductNotificationEmail(
  adminId: string,
  adminEmail: string,
  type: 'created' | 'updated' | 'low_stock',
  data: {
    productName: string;
    productSku: string;
    category?: string;
    price: number;
    stockQuantity: number;
    minStockLevel?: number;
    status?: string;
  }
) {
  // Check if email notifications are enabled
  const shouldSend = await shouldSendEmailNotification(adminId, 'email_notifications_enabled');
  if (!shouldSend) {
    return { sent: false, reason: 'Email notifications disabled' };
  }

  const subject = type === 'created' 
    ? `New Product Added: ${data.productName}`
    : type === 'updated'
    ? `Product Updated: ${data.productName}`
    : `⚠️ Low Stock Alert: ${data.productName}`;

  const isLowStock = type === 'low_stock' || (data.minStockLevel && data.stockQuantity <= data.minStockLevel);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${type === 'created' ? 'New Product' : type === 'updated' ? 'Product Updated' : 'Low Stock Alert'}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, ${isLowStock ? '#ef4444' : '#667eea'} 0%, ${isLowStock ? '#dc2626' : '#764ba2'} 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">${type === 'created' ? '📦 New Product Added' : type === 'updated' ? '✏️ Product Updated' : '⚠️ Low Stock Alert'}</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
          <h2 style="color: #1f2937; margin-top: 0;">Product Details</h2>
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #4b5563; width: 40%;">Product Name:</td>
                <td style="padding: 10px 0; color: #1f2937; font-weight: bold;">${data.productName}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #4b5563;">SKU:</td>
                <td style="padding: 10px 0; color: #1f2937; font-family: monospace;">${data.productSku}</td>
              </tr>
              ${data.category ? `
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #4b5563;">Category:</td>
                <td style="padding: 10px 0; color: #1f2937;">${data.category}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #4b5563;">Price:</td>
                <td style="padding: 10px 0; color: #1f2937; font-size: 18px; font-weight: bold; color: #667eea;">Rs. ${data.price}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #4b5563;">Stock Quantity:</td>
                <td style="padding: 10px 0; color: ${isLowStock ? '#ef4444' : '#1f2937'}; font-weight: bold; font-size: 16px;">
                  ${data.stockQuantity} ${data.stockQuantity <= (data.minStockLevel || 0) ? '⚠️' : ''}
                </td>
              </tr>
              ${data.minStockLevel !== undefined ? `
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #4b5563;">Min Stock Level:</td>
                <td style="padding: 10px 0; color: #1f2937;">${data.minStockLevel}</td>
              </tr>
              ` : ''}
              ${data.status ? `
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #4b5563;">Status:</td>
                <td style="padding: 10px 0; color: #1f2937;">
                  <span style="background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; text-transform: capitalize;">
                    ${data.status}
                  </span>
                </td>
              </tr>
              ` : ''}
            </table>
          </div>
          ${isLowStock ? `
          <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; border-radius: 4px; margin-top: 20px;">
            <p style="margin: 0; color: #991b1b; font-size: 14px;">
              <strong>⚠️ Warning:</strong> Stock quantity is at or below minimum stock level. Please restock soon.
            </p>
          </div>
          ` : ''}
          <div style="background: #eff6ff; border-left: 4px solid #667eea; padding: 15px; border-radius: 4px; margin-top: 20px;">
            <p style="margin: 0; color: #1e40af; font-size: 14px;">
              <strong>📅 ${type === 'created' ? 'Added' : type === 'updated' ? 'Updated' : 'Alert'} Date:</strong> ${new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        </div>
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
          <p>This is an automated email from CarWash App product management system.</p>
        </div>
      </body>
    </html>
  `;

  try {
    await sendEmailWithBrevo({
      to: adminEmail,
      subject,
      html: htmlContent,
      from: {
        name: 'CarWash App',
        email: 'hassanrashid0018@gmail.com',
      },
    });
    return { sent: true };
  } catch (error) {
    console.error('Error sending product notification email:', error);
    return { sent: false, reason: 'Email sending failed' };
  }
}

/**
 * Send security alert email
 */
export async function sendSecurityAlertEmail(
  adminId: string,
  adminEmail: string,
  type: 'login' | 'password_change' | 'account_activity',
  data: {
    ipAddress?: string;
    userAgent?: string;
    location?: string;
    timestamp: string;
  }
) {
  // Check if security alerts are enabled
  const shouldSend = await shouldSendEmailNotification(adminId, 'security_alerts');
  if (!shouldSend) {
    return { sent: false, reason: 'Security alerts disabled' };
  }

  const subject = `Security Alert: ${type === 'login' ? 'New Login Detected' : type === 'password_change' ? 'Password Changed' : 'Account Activity'}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Security Alert</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🔒 Security Alert</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
          <h2 style="color: #1f2937; margin-top: 0;">${type === 'login' ? 'New Login Detected' : type === 'password_change' ? 'Password Changed' : 'Account Activity'}</h2>
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <p style="color: #1f2937; margin: 0 0 15px 0;">
              ${type === 'login' 
                ? 'A new login was detected on your account. If this was not you, please secure your account immediately.'
                : type === 'password_change'
                ? 'Your password has been changed. If you did not make this change, please secure your account immediately.'
                : 'Unusual activity was detected on your account. Please review the details below.'}
            </p>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #4b5563; width: 40%;">Time:</td>
                <td style="padding: 10px 0; color: #1f2937;">${data.timestamp}</td>
              </tr>
              ${data.ipAddress ? `
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #4b5563;">IP Address:</td>
                <td style="padding: 10px 0; color: #1f2937; font-family: monospace;">${data.ipAddress}</td>
              </tr>
              ` : ''}
              ${data.location ? `
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #4b5563;">Location:</td>
                <td style="padding: 10px 0; color: #1f2937;">${data.location}</td>
              </tr>
              ` : ''}
            </table>
          </div>
          <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; border-radius: 4px;">
            <p style="margin: 0; color: #991b1b; font-size: 14px;">
              <strong>⚠️ Important:</strong> If you did not perform this action, please change your password immediately and contact support.
            </p>
          </div>
        </div>
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
          <p>This is an automated security alert from CarWash App.</p>
        </div>
      </body>
    </html>
  `;

  try {
    await sendEmailWithBrevo({
      to: adminEmail,
      subject,
      html: htmlContent,
      from: {
        name: 'CarWash App',
        email: 'hassanrashid0018@gmail.com',
      },
    });
    return { sent: true };
  } catch (error) {
    console.error('Error sending security alert email:', error);
    return { sent: false, reason: 'Email sending failed' };
  }
}

/**
 * Send trial expiration warning email
 */
export async function sendTrialExpirationEmail(
  adminId: string,
  adminEmail: string,
  adminName: string,
  trialEndsAt: Date,
  timeRemaining: string
) {
  try {
    const subject = `⏰ Your Trial is Ending Soon - ${timeRemaining} Remaining`;
    
    const htmlContent = getTrialExpirationEmailHTML(
      adminName,
      trialEndsAt,
      timeRemaining
    );

    await sendEmailWithBrevo({
      to: adminEmail,
      subject,
      html: htmlContent,
      from: {
        name: 'CarWash App',
        email: 'hassanrashid0018@gmail.com',
      },
    });

    console.log(`✅ Trial expiration email sent to ${adminEmail} for admin ${adminId}`);
    return { sent: true };
  } catch (error) {
    console.error('Error sending trial expiration email:', error);
    return { sent: false, reason: 'Email sending failed' };
  }
}

/**
 * Send subscription renewal notification email
 */
export async function sendSubscriptionRenewalEmail(
  adminId: string,
  adminEmail: string,
  adminName: string,
  planType: string,
  renewalDate: Date,
  currentPeriodEnd: Date
) {
  try {
    const subject = `🔄 Subscription Renewal Required - ${planType.charAt(0).toUpperCase() + planType.slice(1)} Plan`;
    
    const htmlContent = getSubscriptionRenewalEmailHTML(
      adminName,
      planType,
      renewalDate,
      currentPeriodEnd
    );

    await sendEmailWithBrevo({
      to: adminEmail,
      subject,
      html: htmlContent,
      from: {
        name: 'CarWash App',
        email: 'hassanrashid0018@gmail.com',
      },
    });

    console.log(`✅ Subscription renewal email sent to ${adminEmail} for admin ${adminId}`);
    return { sent: true };
  } catch (error) {
    console.error('Error sending subscription renewal email:', error);
    return { sent: false, reason: 'Email sending failed' };
  }
}

/**
 * Send subscription 29th day reminder email
 */
export async function sendSubscription29DayReminderEmail(
  adminId: string,
  adminEmail: string,
  adminName: string,
  planType: string,
  purchaseDate: Date,
  renewalDate: Date
) {
  try {
    const subject = `⏰ Subscription Renewal Reminder - ${planType.charAt(0).toUpperCase() + planType.slice(1)} Plan`;
    
    const htmlContent = getSubscription29DayReminderEmailHTML(
      adminName,
      planType,
      purchaseDate,
      renewalDate
    );

    await sendEmailWithBrevo({
      to: adminEmail,
      subject,
      html: htmlContent,
      from: {
        name: 'CarWash App',
        email: 'hassanrashid0018@gmail.com',
      },
    });

    console.log(`✅ 29th day reminder email sent to ${adminEmail} for admin ${adminId}`);
    return { sent: true };
  } catch (error) {
    console.error('Error sending 29th day reminder email:', error);
    return { sent: false, reason: 'Email sending failed' };
  }
}

/**
 * Send customer limit warning email (when approaching limit - second last customer)
 */
export async function sendCustomerLimitWarningEmail(
  adminId: string,
  adminEmail: string,
  adminName: string,
  currentCount: number,
  maxLimit: number,
  planType: string | null
) {
  try {
    const subject = `⚠️ Customer Limit Warning - ${currentCount}/${maxLimit} customers used`;
    
    const htmlContent = getCustomerLimitWarningEmailHTML(
      adminName,
      currentCount,
      maxLimit,
      planType
    );

    await sendEmailWithBrevo({
      to: adminEmail,
      subject,
      html: htmlContent,
      from: {
        name: 'CarWash App',
        email: 'hassanrashid0018@gmail.com',
      },
    });

    console.log(`✅ Customer limit warning email sent to ${adminEmail} for admin ${adminId}`);
    return { sent: true };
  } catch (error) {
    console.error('Error sending customer limit warning email:', error);
    return { sent: false, reason: 'Email sending failed' };
  }
}

