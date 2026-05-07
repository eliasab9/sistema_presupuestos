import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { z } from 'zod';
import { env } from '@/lib/config';
import { createLogger } from '@/lib/logger';

const log = createLogger('email/send');

export const maxDuration = 30;

const sendEmailSchema = z.object({
  companyId:               z.enum(['bemec', 'bamore']).default('bemec'),
  to:                      z.string().email('El campo "to" debe ser un email válido'),
  toName:                  z.string().optional(),
  subject:                 z.string().min(1, 'El asunto no puede estar vacío'),
  body:                    z.string().min(1, 'El cuerpo no puede estar vacío'),
  cc:                      z.string().optional(),
  attachmentName:          z.string().optional(),
  signatureAttachmentName: z.string().optional(),
});

interface CompanyMailConfig {
  user: string;
  pass: string;
  fromName: string;
  replyTo: string;
}

function getCompanyConfig(companyId: 'bemec' | 'bamore'): CompanyMailConfig | null {
  if (companyId === 'bemec') {
    const user = env.GMAIL_USER_BEMEC;
    const pass = env.GMAIL_PASS_BEMEC;
    if (!user || !pass) return null;
    return {
      user,
      pass,
      fromName: 'BEMEC - Cotizaciones',
      replyTo: env.GMAIL_REPLY_BEMEC ?? 'eagustin@bemec.ar',
    };
  }
  const user = env.GMAIL_USER_BAMORE;
  const pass = env.GMAIL_PASS_BAMORE;
  if (!user || !pass) return null;
  return {
    user,
    pass,
    fromName: 'BAMORE S.R.L. - Cotizaciones',
    replyTo: env.GMAIL_REPLY_BAMORE ?? 'ventas@bamore.com.ar',
  };
}

/**
 * POST /api/email/send
 *
 * Body (multipart/form-data):
 *   companyId      : "bemec" | "bamore"
 *   to             : email del destinatario
 *   toName         : nombre del destinatario (opcional)
 *   subject        : asunto
 *   body           : cuerpo en texto plano
 *   cc             : emails CC separados por coma (opcional)
 *   attachment     : archivo PDF/DOCX (Blob)
 *   attachmentName : nombre del archivo adjunto
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const rawFields = {
      companyId:               formData.get('companyId') ?? 'bemec',
      to:                      formData.get('to'),
      toName:                  formData.get('toName') ?? undefined,
      subject:                 formData.get('subject'),
      body:                    formData.get('body'),
      cc:                      formData.get('cc') ?? undefined,
      attachmentName:          formData.get('attachmentName') ?? undefined,
      signatureAttachmentName: formData.get('signatureAttachmentName') ?? undefined,
    };

    const parsed = sendEmailSchema.safeParse(rawFields);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors.map((e) => e.message).join(', ') },
        { status: 400 }
      );
    }
    const { companyId, to, toName, subject, body, cc: ccRaw, attachmentName, signatureAttachmentName } = parsed.data;
    const attachment = formData.get('attachment') as Blob | null;
    const signatureAttachment = formData.get('signatureAttachment') as Blob | null;

    // Obtener config de la empresa
    const config = getCompanyConfig(companyId);
    if (!config) {
      return NextResponse.json(
        {
          success: false,
          error: `Email no configurado para "${companyId}". ` +
            `Agregá GMAIL_USER_${companyId.toUpperCase()} y GMAIL_PASS_${companyId.toUpperCase()} en .env.local`,
        },
        { status: 503 }
      );
    }

    // Crear transporter de Gmail
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // STARTTLS
      auth: {
        user: config.user,
        pass: config.pass, // Contraseña de aplicación
      },
    });

    // Construir lista de CC
    const ccList = ccRaw
      ? ccRaw.split(',').map((e) => e.trim()).filter(Boolean)
      : [];

    // Construir adjuntos
    const attachments: nodemailer.SendMailOptions['attachments'] = [];
    if (attachment && attachmentName) {
      const buffer = Buffer.from(await attachment.arrayBuffer());
      attachments.push({
        filename: attachmentName,
        content: buffer,
        contentType: attachmentName.endsWith('.pdf')
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
    }
    // Adjunto de firma (logo/imagen del vendedor)
    if (signatureAttachment && signatureAttachmentName) {
      const buffer = Buffer.from(await signatureAttachment.arrayBuffer());
      attachments.push({
        filename: signatureAttachmentName,
        content: buffer,
      });
    }

    // Armar destinatario y enviar
    const toFormatted = toName ? `${toName} <${to}>` : to;
    const info = await transporter.sendMail({
      from: `"${config.fromName}" <${config.user}>`,
      replyTo: config.replyTo,
      to: toFormatted,
      ...(ccList.length > 0 && { cc: ccList }),
      subject,
      text: body,
      attachments,
    });

    log.info('Email sent', { companyId, to, subject, messageId: info.messageId });
    return NextResponse.json({ success: true, messageId: info.messageId });

  } catch (error) {
    log.error('Failed to send email', { error: String(error) });

    const message = error instanceof Error ? error.message : 'Error interno';
    const isAuthError = message.includes('535') || message.includes('auth') || message.includes('credentials');

    return NextResponse.json(
      {
        success: false,
        error: isAuthError
          ? 'Error de autenticación con Gmail. Verificá que la Contraseña de Aplicación sea correcta y que esté habilitada la verificación en dos pasos.'
          : `Error al enviar: ${message}`,
      },
      { status: 500 }
    );
  }
}
