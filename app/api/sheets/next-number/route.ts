import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { refreshAccessToken } from '@/lib/google-drive';
import { requireSheetsConfig } from '@/lib/config';
import { resolveSheetName, readColumnsAB, findNextBudgetSlot } from '@/lib/sheets/sheet-rows';

const querySchema = z.object({
  companyId: z.enum(['bemec', 'bamore']).default('bemec'),
});

/**
 * GET /api/sheets/next-number?companyId=bemec
 *
 * Devuelve el próximo número SIN reservarlo. Es sólo para mostrar un número
 * tentativo mientras se arma el presupuesto; el definitivo se reserva al enviar
 * vía POST /api/sheets/reserve-number.
 */
export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams)
  );
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }
  const { companyId } = parsed.data;

  let sheetsConfig: ReturnType<typeof requireSheetsConfig>;
  try {
    sheetsConfig = requireSheetsConfig();
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 503 });
  }

  const gid = companyId === 'bamore' ? sheetsConfig.SHEET_GID_BAMORE : sheetsConfig.SHEET_GID_BEMEC;

  try {
    const { access_token } = await refreshAccessToken(sheetsConfig.GOOGLE_OAUTH_REFRESH_TOKEN);
    const sheetName = await resolveSheetName(access_token, sheetsConfig.SPREADSHEET_ID, gid);
    const rows = await readColumnsAB(access_token, sheetsConfig.SPREADSHEET_ID, sheetName);

    return NextResponse.json({ success: true, nextNumber: findNextBudgetSlot(rows).number });
  } catch (error) {
    console.error('[Sheets next-number] Error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
