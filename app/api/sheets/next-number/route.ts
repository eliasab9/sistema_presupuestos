import { NextRequest, NextResponse } from 'next/server';
import { refreshAccessToken } from '@/lib/google-drive';

const SPREADSHEET_ID = process.env.SPREADSHEET_ID!;
const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';

async function resolveSheetName(accessToken: string, gid: number): Promise<string> {
  const res = await fetch(`${SHEETS_API}/${SPREADSHEET_ID}`, {
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
 * GET /api/sheets/next-number?companyId=bemec
 *
 * Lógica exacta:
 *   1. Recorrer las filas buscando la ÚLTIMA donde columna B tenga un valor.
 *   2. La fila inmediatamente siguiente tiene B vacía → esa es el próximo slot.
 *   3. Devolver el valor de columna A de esa fila siguiente.
 *   4. Si no hay valor pre-populado en A, incrementar el último número encontrado.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get('companyId') || 'bemec';
  const gid = companyId === 'bamore'
    ? Number(process.env.SHEET_GID_BAMORE)
    : Number(process.env.SHEET_GID_BEMEC);

  if (!SPREADSHEET_ID) {
    return NextResponse.json({ success: false, error: 'SPREADSHEET_ID no configurado' }, { status: 503 });
  }
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
  if (!refreshToken) {
    return NextResponse.json({ success: false, error: 'GOOGLE_OAUTH_REFRESH_TOKEN no configurado' }, { status: 503 });
  }

  try {
    const { access_token } = await refreshAccessToken(refreshToken);
    const sheetName = await resolveSheetName(access_token, gid);

    const range = encodeURIComponent(`'${sheetName}'!A:B`);
    const res = await fetch(`${SHEETS_API}/${SPREADSHEET_ID}/values/${range}`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!res.ok) throw new Error(`Error leyendo hoja: ${await res.text()}`);

    const data = await res.json();
    const rows: string[][] = data.values ?? [];

    // Última fila donde B tiene valor = último presupuesto registrado
    let lastFilledIndex = 0;
    for (let i = 1; i < rows.length; i++) {
      const colB = rows[i]?.[1]?.trim() ?? '';
      if (colB !== '') lastFilledIndex = i;
    }

    // La fila siguiente tiene B vacía → ese es el próximo slot
    const nextIndex = lastFilledIndex + 1;
    const nextColA = rows[nextIndex]?.[0]?.trim() ?? '';

    // Si hay número pre-populado en A, usarlo; si no, incrementar el último
    let nextNumber: string;
    if (nextColA !== '') {
      nextNumber = nextColA;
    } else {
      const lastNum = parseInt(rows[lastFilledIndex]?.[0]?.trim() ?? '0', 10);
      nextNumber = String(isNaN(lastNum) ? 1 : lastNum + 1);
    }

    return NextResponse.json({ success: true, nextNumber });
  } catch (error) {
    console.error('[Sheets next-number] Error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
