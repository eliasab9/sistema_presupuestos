import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export const maxDuration = 30;

/**
 * Configuración por empresa.
 * Cada empresa tiene su propia cuenta de Gmail y su propio Reply-To.
 *
 * Variables de entorno requeridas:
 *   GMAIL_USER_BEMEC   = cotizacionesbemec@gmail.com
 *   GMAIL_PASS_BEMEC   = "xxxx xxxx xxxx xxxx"  ← contraseña de aplicación
 *   GMAIL_REPLY_BEMEC  = eagustin@bemec.ar
 *
 *   GMAIL_USER_BAMORE  = cotizacionesbamore@gmail.com
 *   GMAIL_PASS_BAMORE  = "xxxx xxxx xxxx xxxx"  ← contraseña de aplicación
 *   GMAIL_REPLY_BAMORE = ventas@bamore.com.ar
 */
interface CompanyMailConfig {
  user: string;
  pass: string;
  fromName: string;
  replyTo: string;
}

function getCompanyConfig(companyId: string): CompanyMailConfig | null {
  if (companyId === 'bemec') {
    const user = process.env.GMAIL_USER_BEMEC;
    const pass = process.env.GMAIL_PASS_BEMEC;
    if (!user || !pass) return null;
    return {
      user,
      pass,
      fromName: 'BEMEC - Cotizaciones',
      replyTo: process.env.GMAIL_REPLY_BEMEC || 'eagustin@bemec.ar',
    };
  }
  if (companyId === 'bamore') {
    const user = process.env.GMAIL_USER_BAMORE;
    const pass = process.env.GMAIL_PASS_BAMORE;
    if (!user || !pass) return null;
    return {
      user,
      pass,
      fromName: 'BAMORE S.R.L. - Cotizaciones',
      replyTo: process.env.GMAIL_REPLY_BAMORE || 'ventas@bamore.com.ar',
    };
  }
  return null;
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

    const companyId  = (formData.get('companyId') as string | null) || 'bemec';
    const to         = formData.get('to') as string | null;
    const toName     = formData.get('toName') as string | null;
    const subject    = formData.get('subject') as string | null;
    const body       = formData.get('body') as string | null;
    const ccRaw      = formData.get('cc') as string | null;
    const attachment = formData.get('attachment') as Blob | null;
    const attachmentName = formData.get('attachmentName') as string | null;

    // Validaciones básicas
    if (!to || !subject || !body) {
      return NextResponse.json(
        { success: false, error: 'Faltan campos requeridos: to, subject, body' },
        { status: 400 }
      );
    }

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
        pass: config.pass,   // Contraseña de aplicación (NO la contraseña normal)
      },
    });

    // Construir lista de CC
    const ccList = ccRaw
      ? ccRaw.split(',').map((e) => e.trim()).filter(Boolean)
      : [];

    // Construir adjunto si existe
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

    // Armar destinatario
    const toFormatted = toName ? `${toName} <${to}>` : to;

    // Enviar
    const info = await transporter.sendMail({
      from: `"${config.fromName}" <${config.user}>`,
      replyTo: config.replyTo,
      to: toFormatted,
      ...(ccList.length > 0 && { cc: ccList }),
      subject,
      text: body,
      attachments,
    });

    return NextResponse.json({ success: true, messageId: info.messageId });

  } catch (error) {
    console.error('[Email API] Error:', error);

    // Error legible para el usuario
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
