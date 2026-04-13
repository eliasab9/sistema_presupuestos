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
 * Encuentra la fila donde escribir: la inmediatamente siguiente
 * a la ÚLTIMA fila que tenga un valor en columna B.
 */
async function findNextRow(
  accessToken: string,
  sheetName: string
): Promise<{ rowNumber: number; colAValue: string }> {
  const range = encodeURIComponent(`'${sheetName}'!A:B`);
  const res = await fetch(`${SHEETS_API}/${SPREADSHEET_ID}/values/${range}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Error leyendo columnas A:B: ${await res.text()}`);

  const data = await res.json();
  const rows: string[][] = data.values ?? [];

  // Encontrar la ÚLTIMA fila con B no vacía
  let lastFilledIndex = 0;
  for (let i = 1; i < rows.length; i++) {
    if ((rows[i]?.[1]?.trim() ?? '') !== '') {
      lastFilledIndex = i;
    }
  }

  const nextIndex = lastFilledIndex + 1;
  const colAValue = rows[nextIndex]?.[0]?.trim() ?? '';

  return {
    rowNumber: nextIndex + 1, // 1-based para Sheets API
    colAValue,
  };
}

/**
 * POST /api/sheets/register
 *
 * Escribe en la fila inmediatamente posterior al último registro real
 * usando PUT (values.update) sobre el rango exacto — no append.
 *
 * Body JSON:
 *   companyId    : 'bemec' | 'bamore'
 *   budgetNumber : string
 *   clientName   : string
 *   budgetDate   : string
 *   pideNumber   : string
 *   merchandise  : string
 */
export async function POST(request: NextRequest) {
  if (!SPREADSHEET_ID) {
    return NextResponse.json({ success: false, error: 'SPREADSHEET_ID no configurado' }, { status: 503 });
  }
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
  if (!refreshToken) {
    return NextResponse.json({ success: false, error: 'GOOGLE_OAUTH_REFRESH_TOKEN no configurado' }, { status: 503 });
  }

  try {
    const body = await request.json() as {
      companyId: string;
      budgetNumber: string;
      clientName?: string;
      budgetDate?: string;
      pideNumber?: string;
      merchandise?: string;
      responsable?: string;
    };
    const { companyId, budgetNumber, clientName, budgetDate, pideNumber, merchandise, responsable } = body;

    const gid = companyId === 'bamore'
      ? Number(process.env.SHEET_GID_BAMORE)
      : Number(process.env.SHEET_GID_BEMEC);

    // Fecha de hoy DD/MM/YYYY
    const now = new Date();
    const fechaSolicitud = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

    const { access_token } = await refreshAccessToken(refreshToken);
    const sheetName = await resolveSheetName(access_token, gid);

    // Fila donde escribir: justo después del último registro real
    const { rowNumber } = await findNextRow(access_token, sheetName);

    // Columnas A–I
    const row = [
      budgetNumber ?? '',          // A: Nº de Solicitud
      fechaSolicitud,              // B: Fecha de Solicitud
      responsable ?? 'Elías',      // C: Responsable
      'Email',                     // D: Medio
      clientName   ?? '',  // E: Cliente
      budgetDate   ?? '',  // F: Fecha de cotización
      '',                  // G: Fecha OC (vacío)
      pideNumber   ?? '',  // H: Nº PIDE
      merchandise  ?? '',  // I: Mercadería Cotizada
    ];

    const updateRange = encodeURIComponent(`'${sheetName}'!A${rowNumber}:I${rowNumber}`);
    const updateRes = await fetch(
      `${SHEETS_API}/${SPREADSHEET_ID}/values/${updateRange}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: [row] }),
      }
    );

    if (!updateRes.ok) {
      throw new Error(`Error al escribir en fila ${rowNumber}: ${await updateRes.text()}`);
    }

    return NextResponse.json({ success: true, rowNumber });
  } catch (error) {
    console.error('[Sheets register] Error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
