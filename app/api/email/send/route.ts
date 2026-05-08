import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { z } from 'zod';
import { env } from '@/lib/config';
import { createLogger } from '@/lib/logger';

const log = createLogger('email/send');

export const maxDuration = 30;

const sendEmailSchema = z.object({
  companyId:          z.enum(['bemec', 'bamore']).default('bemec'),
  to:                 z.string().email('El campo "to" debe ser un email válido'),
  toName:             z.string().optional(),
  subject:            z.string().min(1, 'El asunto no puede estar vacío'),
  body:               z.string().min(1, 'El cuerpo no puede estar vacío'),
  cc:                 z.string().optional(),
  attachmentName:     z.string().optional(),
  // Inline signature image embedded in the HTML body
  signatureBase64:    z.string().optional(),
  signatureImageMime: z.string().optional(),
});

/** Convert plain text to safe HTML (preserves line breaks, escapes special chars). */
function textToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped
    .split('\n\n')
    .map(para => `<p style="margin:0 0 1em 0">${para.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

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
      companyId:          formData.get('companyId') ?? 'bemec',
      to:                 formData.get('to'),
      toName:             formData.get('toName') ?? undefined,
      subject:            formData.get('subject'),
      body:               formData.get('body'),
      cc:                 formData.get('cc') ?? undefined,
      attachmentName:     formData.get('attachmentName') ?? undefined,
      signatureBase64:    formData.get('signatureBase64') ?? undefined,
      signatureImageMime: formData.get('signatureImageMime') ?? undefined,
    };

    const parsed = sendEmailSchema.safeParse(rawFields);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors.map((e) => e.message).join(', ') },
        { status: 400 }
      );
    }
    const { companyId, to, toName, subject, body, cc: ccRaw, attachmentName, signatureBase64, signatureImageMime } = parsed.data;
    const attachment = formData.get('attachment') as Blob | null;

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

    // Construir HTML del cuerpo con firma inline (CID para compatibilidad con Gmail)
    const sigCid = 'seller-signature@bemec';
    let htmlBody = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#333">${textToHtml(body)}`;
    if (signatureBase64 && signatureBase64.length > 0) {
      htmlBody += `<br><img src="cid:${sigCid}" alt="Firma" style="max-width:480px;height:auto;display:block;margin-top:8px">`;
    }
    htmlBody += '</div>';

    // Construir adjunto principal (presupuesto PDF/DOCX)
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

    // Adjunto inline de firma (imagen embebida en el cuerpo via CID)
    if (signatureBase64 && signatureBase64.length > 0) {
      attachments.push({
        filename: 'firma',
        content: Buffer.from(signatureBase64, 'base64'),
        contentType: signatureImageMime || 'image/jpeg',
        cid: sigCid,
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
      text: body,   // fallback para clientes que no soportan HTML
      html: htmlBody,
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
