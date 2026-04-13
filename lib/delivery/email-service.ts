/**
 * Email Service — Gmail SMTP via /api/email/send
 *
 * Envía desde:
 *   BEMEC  → cotizacionesbemec@gmail.com  (Reply-To: eagustin@bemec.ar)
 *   BAMORE → cotizacionesbamore@gmail.com (Reply-To: ventas@bamore.com.ar)
 *
 * No requiere verificación de dominio ni servicios de pago.
 */

import type { EmailPayload, EmailSendResult } from '@/types/delivery';

export interface EmailConfig {
  companyId?: string;
}

let emailConfig: EmailConfig = {};

export function initializeEmailService(config: EmailConfig): void {
  emailConfig = { ...emailConfig, ...config };
}

export function getEmailConfig() {
  return { provider: 'gmail-smtp', companyId: emailConfig.companyId };
}

export function isEmailServiceReady(): boolean {
  return true; // El API route valida la configuración
}

/**
 * Envía un email vía el server route /api/email/send (Gmail SMTP).
 * Se ejecuta desde el cliente — ningún secreto queda expuesto.
 */
export async function sendEmail(
  payload: EmailPayload,
  companyId?: string
): Promise<EmailSendResult> {
  if (!payload.to || payload.to.length === 0) {
    return { success: false, error: 'No se especificó ningún destinatario' };
  }
  if (!payload.subject) {
    return { success: false, error: 'El asunto es requerido' };
  }

  try {
    const form = new FormData();

    // Empresa → determina qué cuenta Gmail se usa
    form.append('companyId', companyId || emailConfig.companyId || 'bemec');

    // Destinatario
    form.append('to', payload.to[0].email);
    if (payload.to[0].name) form.append('toName', payload.to[0].name);

    // Contenido
    form.append('subject', payload.subject);
    form.append('body', payload.body);

    // CC
    if (payload.cc && payload.cc.length > 0) {
      form.append('cc', payload.cc.map((r) => r.email).join(','));
    }

    // Adjunto (primer archivo = el presupuesto)
    if (payload.attachments.length > 0) {
      const att = payload.attachments[0];
      form.append('attachment', att.content, att.name);
      form.append('attachmentName', att.name);
    }

    const res = await fetch('/api/email/send', { method: 'POST', body: form });
    const data = (await res.json()) as {
      success: boolean;
      messageId?: string;
      error?: string;
    };

    return data.success
      ? { success: true, messageId: data.messageId }
      : { success: false, error: data.error || 'Error al enviar el email' };

  } catch (error) {
    console.error('[EmailService] fetch error:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Error de red al intentar enviar el email',
    };
  }
}

/**
 * Wrapper usado por el workflow de entrega.
 */
export async function sendBudgetEmail(
  recipientEmail: string,
  recipientName: string | undefined,
  subject: string,
  body: string,
  attachment: { name: string; content: Blob },
  ccEmails?: string[],
  companyId?: string
): Promise<EmailSendResult> {
  return sendEmail(
    {
      to: [{ email: recipientEmail, name: recipientName }],
      cc: ccEmails?.map((email) => ({ email })),
      subject,
      body,
      attachments: [
        {
          name: attachment.name,
          content: attachment.content,
          contentType: attachment.name.endsWith('.pdf')
            ? 'application/pdf'
            : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        },
      ],
    },
    companyId
  );
}

export async function sendTestEmail(
  toEmail: string,
  companyId = 'bemec'
): Promise<EmailSendResult> {
  return sendEmail(
    {
      to: [{ email: toEmail }],
      subject: `Prueba de configuración - ${companyId === 'bamore' ? 'BAMORE S.R.L.' : 'BEMEC'}`,
      body: 'Este es un email de prueba para verificar la configuración del sistema de presupuestos.',
      attachments: [],
    },
    companyId
  );
}

export async function getEmailStatus(_messageId: string): Promise<{
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'unknown';
  deliveredAt?: string;
  error?: string;
}> {
  return { status: 'sent' };
}
