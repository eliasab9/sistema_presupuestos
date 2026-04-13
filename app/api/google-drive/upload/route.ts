import { NextRequest, NextResponse } from 'next/server';
import { refreshAccessToken, findOrCreateFolder, uploadFileToDrive } from '@/lib/google-drive';

export const maxDuration = 60;

/**
 * POST /api/google-drive/upload
 *
 * Sube un archivo a Google Drive usando OAuth2 con refresh token guardado.
 * El token se renueva automáticamente — sin interacción del usuario.
 *
 * Env vars requeridas:
 *   GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 *   GOOGLE_OAUTH_REFRESH_TOKEN   ← obtenido una vez desde /setup-drive
 *
 * Body (multipart/form-data):
 *   file          : Blob   — archivo a subir
 *   fileName      : string — nombre del archivo en Drive
 *   rootFolderId  : string — ID de la carpeta raíz de la empresa
 *   folderPath    : string — subcarpetas relativas, ej "2026/ClienteX" (opcional)
 *   mimeType      : string — tipo MIME (opcional)
 */
export async function POST(request: NextRequest) {
  // Verificar credenciales
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
  if (!refreshToken) {
    return NextResponse.json(
      {
        success: false,
        error:
          'Google Drive no configurado. Visitá /setup-drive para autorizar el acceso.',
      },
      { status: 503 }
    );
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.json(
      {
        success: false,
        error: 'Faltan GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET en .env.local',
      },
      { status: 503 }
    );
  }

  try {
    // Obtener access token fresco
    const tokens = await refreshAccessToken(refreshToken);
    const accessToken = tokens.access_token;

    // Parsear form data
    const formData    = await request.formData();
    const file        = formData.get('file') as Blob | null;
    const fileName    = formData.get('fileName') as string | null;
    const rootFolderId = formData.get('rootFolderId') as string | null;
    const folderPath  = (formData.get('folderPath') as string | null) || '';
    const mimeType    = (formData.get('mimeType') as string | null) ||
      (fileName?.endsWith('.pdf') ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

    if (!file || !fileName || !rootFolderId) {
      return NextResponse.json(
        { success: false, error: 'Faltan campos: file, fileName, rootFolderId' },
        { status: 400 }
      );
    }

    // Construir ruta de carpetas
    let targetFolderId = rootFolderId;
    if (folderPath.trim()) {
      const parts = folderPath.split('/').filter(Boolean);
      let currentId = rootFolderId;
      for (const part of parts) {
        currentId = await findOrCreateFolder(accessToken, part, currentId);
      }
      targetFolderId = currentId;
    }

    // Subir archivo
    const result = await uploadFileToDrive(
      accessToken,
      fileName,
      file,
      targetFolderId,
      mimeType
    );

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      fileId: result.fileId,
      webViewLink: result.webViewLink,
    });

  } catch (error) {
    console.error('[Drive Upload] Error:', error);
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
