import { z } from 'zod';

/**
 * Acceso centralizado y tipado a las variables de entorno del servidor.
 * Usar este módulo en lugar de leer process.env directamente en las rutas.
 *
 * Las variables se agrupan por feature. Cada grupo tiene un getter que lanza
 * un error descriptivo si faltan vars, en vez de fallar silenciosamente más adelante.
 */
export const env = {
  // Auth
  SITE_PASSWORD:              process.env.SITE_PASSWORD,
  SESSION_SECRET:             process.env.SESSION_SECRET,

  // App
  NEXT_PUBLIC_APP_URL:        process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  NODE_ENV:                   (process.env.NODE_ENV ?? 'development') as 'development' | 'production' | 'test',

  // Google OAuth (Drive + Sheets)
  GOOGLE_CLIENT_ID:           process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET:       process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_OAUTH_REFRESH_TOKEN: process.env.GOOGLE_OAUTH_REFRESH_TOKEN,

  // Google Sheets
  SPREADSHEET_ID:             process.env.SPREADSHEET_ID,
  SHEET_GID_BEMEC:            process.env.SHEET_GID_BEMEC,
  SHEET_GID_BAMORE:           process.env.SHEET_GID_BAMORE,

  // Gmail SMTP
  GMAIL_USER_BEMEC:           process.env.GMAIL_USER_BEMEC,
  GMAIL_PASS_BEMEC:           process.env.GMAIL_PASS_BEMEC,
  GMAIL_REPLY_BEMEC:          process.env.GMAIL_REPLY_BEMEC,
  GMAIL_USER_BAMORE:          process.env.GMAIL_USER_BAMORE,
  GMAIL_PASS_BAMORE:          process.env.GMAIL_PASS_BAMORE,
  GMAIL_REPLY_BAMORE:         process.env.GMAIL_REPLY_BAMORE,

  // Anthropic AI
  ANTHROPIC_API_KEY:          process.env.ANTHROPIC_API_KEY,

  // Database (Neon Postgres)
  DATABASE_URL:               process.env.DATABASE_URL,
  DATABASE_URL_UNPOOLED:      process.env.DATABASE_URL_UNPOOLED,
} as const;

// ── Schemas por feature ───────────────────────────────────────────────────────

const googleOAuthSchema = z.object({
  GOOGLE_CLIENT_ID:   z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
});

const driveSchema = z.object({
  GOOGLE_OAUTH_REFRESH_TOKEN: z.string().min(1),
});

const sheetsSchema = z.object({
  GOOGLE_OAUTH_REFRESH_TOKEN: z.string().min(1),
  SPREADSHEET_ID:             z.string().min(1),
  SHEET_GID_BEMEC:            z.coerce.number().int().positive(),
  SHEET_GID_BAMORE:           z.coerce.number().int().positive(),
});

// ── Getters validados ─────────────────────────────────────────────────────────

function assertFeature<T>(schema: z.ZodType<T>, feature: string): T {
  const result = schema.safeParse(env);
  if (!result.success) {
    const fields = result.error.errors.map((e) => String(e.path[0])).join(', ');
    throw new Error(
      `[config] Vars faltantes para "${feature}": ${fields}. Revisá .env.local.`
    );
  }
  return result.data;
}

/** Lanza si faltan GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET. */
export function requireGoogleOAuth() {
  return assertFeature(googleOAuthSchema, 'Google OAuth');
}

/** Lanza si falta GOOGLE_OAUTH_REFRESH_TOKEN (necesario para Drive). */
export function requireDriveConfig() {
  return assertFeature(driveSchema, 'Google Drive');
}

/** Lanza si faltan credenciales de Sheets (OAuth + refresh token + IDs de hoja). */
export function requireSheetsConfig() {
  return assertFeature(sheetsSchema, 'Google Sheets');
}
