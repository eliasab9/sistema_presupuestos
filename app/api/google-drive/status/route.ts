import { NextResponse } from 'next/server';
import { refreshAccessToken } from '@/lib/google-drive';

/**
 * GET /api/google-drive/status
 * Verifica que GOOGLE_OAUTH_REFRESH_TOKEN esté configurado y sea válido.
 */
export async function GET() {
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;

  if (!refreshToken) {
    return NextResponse.json({
      isAuthenticated: false,
      error: 'No configurado. Visitá /setup-drive para autorizar Google Drive.',
    });
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.json({
      isAuthenticated: false,
      error: 'Faltan GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET.',
    });
  }

  try {
    // Intentar renovar el token para verificar que es válido
    const tokens = await refreshAccessToken(refreshToken);
    return NextResponse.json({
      isAuthenticated: !!tokens.access_token,
      method: 'oauth2_refresh_token',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({
      isAuthenticated: false,
      error: `Token inválido o expirado: ${message}. Re-autorizá en /setup-drive`,
    });
  }
}
