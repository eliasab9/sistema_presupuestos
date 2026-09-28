import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { refreshAccessToken } from '@/lib/google-drive';
import { requireSheetsConfig } from '@/lib/config';
import { createLogger } from '@/lib/logger';
import {
  SHEETS_API,
  resolveSheetName,
  readColumnsAB,
  findNextBudgetSlot,
} from '@/lib/sheets/sheet-rows';

const log = createLogger('sheets/reserve-number');

const bodySchema = z.object({
  companyId: z.enum(['bemec', 'bamore']),
});

/**
 * POST /api/sheets/reserve-number
 *
 * Reclama el próximo slot escribiendo el número en la columna A. Como una fila
 * se considera tomada apenas A o B tienen valor, el pedido siguiente ve la fila
 * ocupada y avanza a la próxima.
 *
 * Sigue habiendo una ventana entre la lectura y la escritura (la API de Sheets
 * no ofrece escritura condicional), pero ahora es de milisegundos en lugar de
 * las horas que podía pasar un presupuesto abierto en pantalla.
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
    const rows = await readColumnsAB(access_token, sheetsConfig.SPREADSHEET_ID, sheetName);

    const slot = findNextBudgetSlot(rows);

    const writeRange = encodeURIComponent(`'${sheetName}'!A${slot.rowNumber}`);
    const writeRes = await fetch(
      `${SHEETS_API}/${sheetsConfig.SPREADSHEET_ID}/values/${writeRange}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: [[slot.number]] }),
      }
    );

    if (!writeRes.ok) {
      throw new Error(`Error al reservar fila ${slot.rowNumber}: ${await writeRes.text()}`);
    }

    log.info('Budget number reserved', { companyId, reservedNumber: slot.number, rowNumber: slot.rowNumber });
    return NextResponse.json({ success: true, reservedNumber: slot.number });
  } catch (error) {
    log.error('Failed to reserve budget number', { error: String(error) });
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
