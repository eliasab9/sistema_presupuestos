import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { refreshAccessToken } from '@/lib/google-drive';
import { requireSheetsConfig } from '@/lib/config';
import { createLogger } from '@/lib/logger';

const log = createLogger('sheets/reserve-number');

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';

const bodySchema = z.object({
  companyId: z.enum(['bemec', 'bamore']),
});

async function resolveSheetName(accessToken: string, spreadsheetId: string, gid: number): Promise<string> {
  const res = await fetch(`${SHEETS_API}/${spreadsheetId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`No se pudo obtener metadata: ${await res.text()}`);
  const data = await res.json();
  const sheet = (data.sheets ?? []).find(
    (s: { properties: { sheetId: number; title: string } }) => s.properties?.sheetId === gid
  );
  if (!sheet) throw new Error(`No se encontró pestaña con gid=${gid}`);
  return sheet.properties.title as string;
}

/**
 * POST /api/sheets/reserve-number
 *
 * Determina el siguiente número disponible y escribe el número en la columna A
 * de esa fila para reclamarla atomicamente (read + write en un solo handler).
 * Esto evita que dos presupuestos concurrentes obtengan el mismo número.
 *
 * Body: { companyId: "bemec" | "bamore" }
 * Response: { success: true, reservedNumber: string }
 */
export async function POST(request: NextRequest) {
  let sheetsConfig: ReturnType<typeof requireSheetsConfig>;
  try {
    sheetsConfig = requireSheetsConfig();
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Body JSON inválido' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors.map((e) => e.message).join(', ') },
      { status: 400 }
    );
  }
  const { companyId } = parsed.data;

  const gid = companyId === 'bamore' ? sheetsConfig.SHEET_GID_BAMORE : sheetsConfig.SHEET_GID_BEMEC;

  try {
    const { access_token } = await refreshAccessToken(sheetsConfig.GOOGLE_OAUTH_REFRESH_TOKEN);
    const sheetName = await resolveSheetName(access_token, sheetsConfig.SPREADSHEET_ID, gid);

    // Read columns A:B to find the next available slot
    const range = encodeURIComponent(`'${sheetName}'!A:B`);
    const readRes = await fetch(`${SHEETS_API}/${sheetsConfig.SPREADSHEET_ID}/values/${range}`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!readRes.ok) throw new Error(`Error leyendo hoja: ${await readRes.text()}`);

    const data = await readRes.json();
    const rows: string[][] = data.values ?? [];

    // Last row where B has a value = last registered budget
    let lastFilledIndex = 0;
    for (let i = 1; i < rows.length; i++) {
      const colB = rows[i]?.[1]?.trim() ?? '';
      if (colB !== '') lastFilledIndex = i;
    }

    // The next row (B empty) is the slot to claim
    const nextIndex = lastFilledIndex + 1;
    const nextColA = rows[nextIndex]?.[0]?.trim() ?? '';

    // Determine the number to reserve
    const reservedNumber = nextColA !== ''
      ? nextColA
      : String(isNaN(parseInt(rows[lastFilledIndex]?.[0]?.trim() ?? '0', 10))
          ? 1
          : parseInt(rows[lastFilledIndex]?.[0]?.trim() ?? '0', 10) + 1);

    const rowNumber = nextIndex + 1; // 1-based for Sheets API

    // Write the number to column A to claim the slot
    const writeRange = encodeURIComponent(`'${sheetName}'!A${rowNumber}`);
    const writeRes = await fetch(
      `${SHEETS_API}/${sheetsConfig.SPREADSHEET_ID}/values/${writeRange}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: [[reservedNumber]] }),
      }
    );

    if (!writeRes.ok) {
      throw new Error(`Error al reservar fila ${rowNumber}: ${await writeRes.text()}`);
    }

    log.info('Budget number reserved', { companyId, reservedNumber, rowNumber });
    return NextResponse.json({ success: true, reservedNumber });
  } catch (error) {
    log.error('Failed to reserve budget number', { error: String(error) });
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
