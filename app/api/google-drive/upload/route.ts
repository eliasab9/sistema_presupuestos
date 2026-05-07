import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { refreshAccessToken, findOrCreateFolder, uploadFileToDrive } from '@/lib/google-drive';
import { requireDriveConfig, requireGoogleOAuth } from '@/lib/config';
import { createLogger } from '@/lib/logger';

const log = createLogger('drive/upload');

export const maxDuration = 60;

const uploadFieldsSchema = z.object({
  fileName:     z.string().min(1, 'fileName es requerido'),
  rootFolderId: z.string().min(1, 'rootFolderId es requerido'),
  folderPath:   z.string().default(''),
  mimeType:     z.string().optional(),
});

/**
 * POST /api/google-drive/upload
 *
 * Sube un archivo a Google Drive usando OAuth2 con refresh token guardado.
 * El token se renueva automáticamente — sin interacción del usuario.
 *
 * Body (multipart/form-data):
 *   file          : Blob   — archivo a subir
 *   fileName      : string — nombre del archivo en Drive
 *   rootFolderId  : string — ID de la carpeta raíz de la empresa
 *   folderPath    : string — subcarpetas relativas, ej "2026/ClienteX" (opcional)
 *   mimeType      : string — tipo MIME (opcional)
 */
export async function POST(request: NextRequest) {
  try {
    requireGoogleOAuth();
    requireDriveConfig();
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 503 });
  }

  try {
    const formData = await request.formData();

    const file = formData.get('file') as Blob | null;
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Falta el campo "file"' },
        { status: 400 }
      );
    }

    const rawFields = {
      fileName:     formData.get('fileName'),
      rootFolderId: formData.get('rootFolderId'),
      folderPath:   formData.get('folderPath') ?? '',
      mimeType:     formData.get('mimeType') ?? undefined,
    };

    const parsed = uploadFieldsSchema.safeParse(rawFields);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors.map((e) => e.message).join(', ') },
        { status: 400 }
      );
    }
    const { fileName, rootFolderId, folderPath } = parsed.data;
    const mimeType = parsed.data.mimeType ??
      (fileName.endsWith('.pdf')
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

    // Obtener access token fresco
    const { GOOGLE_OAUTH_REFRESH_TOKEN } = requireDriveConfig();
    const tokens = await refreshAccessToken(GOOGLE_OAUTH_REFRESH_TOKEN);
    const accessToken = tokens.access_token;

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

    log.info('File uploaded to Drive', { fileName, fileId: result.fileId, folderPath });
    return NextResponse.json({
      success: true,
      fileId: result.fileId,
      webViewLink: result.webViewLink,
    });

  } catch (error) {
    log.error('Failed to upload file to Drive', { error: String(error) });
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
