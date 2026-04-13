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
 * Estrategia:
 *   1. Leer columnas A y B.
 *   2. Encontrar la ÚLTIMA fila donde B tiene un valor (= último presupuesto real).
 *   3. La fila siguiente es el próximo slot libre.
 *   4. El valor en columna A de esa fila siguiente es el próximo número.
 *
 * Esto evita confundirse con huecos anteriores que tengan A con número pero B vacía.
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

    // Encontrar la ÚLTIMA fila con B no vacía (último presupuesto real ingresado)
    let lastFilledRowIndex = 0; // índice 0-based en el array
    for (let i = 1; i < rows.length; i++) {
      const colB = rows[i]?.[1]?.trim() ?? '';
      if (colB !== '') {
        lastFilledRowIndex = i;
      }
    }

    // La siguiente fila al último registro real
    const nextRowIndex = lastFilledRowIndex + 1;
    const nextColA = rows[nextRowIndex]?.[0]?.trim() ?? '';

    // Si la siguiente fila tiene número pre-populado en A, usarlo
    // Si no, tomar el último número encontrado e incrementarlo
    let nextNumber: string;
    if (nextColA !== '') {
      nextNumber = nextColA;
    } else {
      const lastColA = rows[lastFilledRowIndex]?.[0]?.trim() ?? '0';
      const lastNum = parseInt(lastColA, 10);
      nextNumber = String(isNaN(lastNum) ? 1 : lastNum + 1);
    }

    // rowNumber es 1-based para la API de Sheets (nextRowIndex + 1 porque el array es 0-based)
    const rowNumber = nextRowIndex + 1;

    return NextResponse.json({ success: true, nextNumber, rowNumber });
  } catch (error) {
    console.error('[Sheets next-number] Error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
