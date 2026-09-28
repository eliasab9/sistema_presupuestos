import { NextResponse } from 'next/server';
import { z } from 'zod';
import { env } from '@/lib/config';

const loginSchema = z.object({
  password: z.string().min(1, 'La contraseña no puede estar vacía'),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  // Si falta config no se puede autenticar a nadie. Sin este chequeo el login
  // respondería "contraseña incorrecta" (confuso) o emitiría una cookie vacía.
  if (!env.SITE_PASSWORD || !env.SESSION_SECRET) {
    return NextResponse.json(
      { error: 'Servidor mal configurado: faltan SITE_PASSWORD o SESSION_SECRET.' },
      { status: 500 }
    );
  }

  if (parsed.data.password !== env.SITE_PASSWORD) {
    return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set('auth_session', env.SESSION_SECRET, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 días
    path: '/',
  });

  return response;
}
