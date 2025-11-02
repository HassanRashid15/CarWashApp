import * as brevo from '@getbrevo/brevo';

const apiInstance = new brevo.TransactionalEmailsApi();
const apiKey = process.env.BREVO_API_KEY;

if (apiKey) {
  apiInstance.setApiKey(
    brevo.TransactionalEmailsApiApiKeys.apiKey,
    apiKey
  );
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: {
    name?: string;
    email: string;
  };
}

export async function sendEmailWithBrevo(options: SendEmailOptions) {
  if (!apiKey) {
    throw new Error('BREVO_API_KEY is not set');
  }

  try {
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    
    sendSmtpEmail.sender = {
      name: options.from?.name || 'CarWash App',
      email: options.from?.email || 'hassanrashid0018@gmail.com',
    };
    
    sendSmtpEmail.to = [{ email: options.to }];
    sendSmtpEmail.subject = options.subject;
    sendSmtpEmail.htmlContent = options.html;

    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);

    // Brevo API response structure - messageId is in body property
    const messageId = (data as any).body?.messageId || (data as any).messageId || 'unknown';

    return {
      success: true,
      messageId: messageId,
      id: messageId, // Also provide as 'id' for compatibility
    };
  } catch (error: any) {
    console.error('Brevo email error:', error);
    throw new Error(error.message || 'Failed to send email with Brevo');
  }
}

