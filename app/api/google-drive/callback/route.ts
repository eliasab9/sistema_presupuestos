import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/google-drive';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code  = searchParams.get('code');
  const error = searchParams.get('error');
  const state = searchParams.get('state');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (error) {
    return NextResponse.redirect(`${appUrl}/setup-drive?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${appUrl}/setup-drive?error=no_code`);
  }

  // CSRF check
  const storedState = request.cookies.get('google_oauth_state')?.value;
  if (state && storedState && state !== storedState) {
    return NextResponse.redirect(`${appUrl}/setup-drive?error=invalid_state`);
  }

  try {
    const redirectUri = `${appUrl}/api/google-drive/callback`;
    const tokens = await exchangeCodeForTokens(code, redirectUri);

    if (!tokens.refresh_token) {
      return NextResponse.redirect(
        `${appUrl}/setup-drive?error=${encodeURIComponent(
          'Google no devolvió un refresh_token. Revocá el acceso en myaccount.google.com/permissions y volvé a autorizar.'
        )}`
      );
    }

    // Redirigir a setup-drive mostrando el refresh token para copiarlo a .env.local
    const response = NextResponse.redirect(
      `${appUrl}/setup-drive?refresh_token=${encodeURIComponent(tokens.refresh_token)}&success=true`
    );
    response.cookies.delete('google_oauth_state');
    return response;

  } catch (err) {
    console.error('[Drive Callback] Error:', err);
    const msg = err instanceof Error ? err.message : 'error_desconocido';
    return NextResponse.redirect(`${appUrl}/setup-drive?error=${encodeURIComponent(msg)}`);
  }
}
