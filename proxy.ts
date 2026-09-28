import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/api/auth/login'];

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/fonts') ||
    pathname.startsWith('/icon')
  ) {
    return NextResponse.next();
  }

  // Sin SESSION_SECRET la comparación de abajo sería `undefined !== undefined`,
  // o sea falsa, y dejaría entrar a cualquiera sin cookie: el sitio quedaría
  // público en silencio. Ante config faltante hay que cerrar, no abrir.
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    return new NextResponse('Servidor mal configurado: falta SESSION_SECRET.', {
      status: 500,
    });
  }

  const auth = request.cookies.get('auth_session');
  if (auth?.value !== sessionSecret) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
