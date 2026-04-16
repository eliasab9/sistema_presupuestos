import { NextRequest, NextResponse } from 'next/server';
import { refreshAccessToken } from '@/lib/google-drive';

const SPREADSHEET_ID = process.env.SPREADSHEET_ID!;
const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';

async function resolveSheetName(accessToken: string, gid: number): Promise<string> {
  const res = await fetch(`${SHEETS_API}/${SPREADSHEET_ID}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error('[resolveSheetName] Google API error:', res.status, errText);
    throw new Error(`No se pudo obtener metadata (${res.status}): ${errText}`);
  }
  const data = await res.json();
  const sheet = (data.sheets ?? []).find(
    (s: { properties: { sheetId: number; title: string } }) => s.properties?.sheetId === gid
  );
  if (!sheet) throw new Error(`No se encontró pestaña con gid=${gid}`);
  return sheet.properties.title as string;
}

/**
 * Encuentra la fila donde escribir para el número de presupuesto dado.
 *
 * Estrategia:
 *   1. Buscar la fila donde A = budgetNumber y B está vacía → ese es el slot correcto.
 *   2. Fallback: si no existe esa fila, escribir en la primera fila con B vacía
 *      inmediatamente después de la última fila con B llena.
 */
async function findTargetRow(
  accessToken: string,
  sheetName: string,
  budgetNumber: string
): Promise<number> {
  const range = encodeURIComponent(`'${sheetName}'!A:B`);
  const res = await fetch(`${SHEETS_API}/${SPREADSHEET_ID}/values/${range}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Error leyendo columnas A:B: ${await res.text()}`);

  const data = await res.json();
  const rows: string[][] = data.values ?? [];

  // Buscar exactamente la fila donde A = budgetNumber y B está vacía
  for (let i = 1; i < rows.length; i++) {
    const colA = rows[i]?.[0]?.trim() ?? '';
    const colB = rows[i]?.[1]?.trim() ?? '';
    if (colA === budgetNumber && colB === '') {
      return i + 1; // rowNumber 1-based para Sheets API
    }
  }

  // Fallback: fila siguiente a la última con B llena
  let lastFilledIndex = 0;
  for (let i = 1; i < rows.length; i++) {
    const colB = rows[i]?.[1]?.trim() ?? '';
    if (colB !== '') lastFilledIndex = i;
  }
  return lastFilledIndex + 2; // +1 por la siguiente fila, +1 por 1-based
}

/**
 * POST /api/sheets/register
 *
 * Registra un presupuesto en la fila correspondiente a su número.
 * Busca la fila donde A = budgetNumber y B está vacía, y completa las columnas B–I.
 *
 * Body JSON:
 *   companyId    : 'bemec' | 'bamore'
 *   budgetNumber : string
 *   clientName   : string
 *   budgetDate   : string
 *   pideNumber   : string
 *   merchandise  : string
 *   responsable  : string
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

    // Encontrar la fila donde A = budgetNumber y B está vacía
    const rowNumber = await findTargetRow(access_token, sheetName, budgetNumber);

    // Columnas A–I: A ya tiene el número pre-populado, completamos el resto
    const row = [
      budgetNumber   ?? '',  // A: Nº de Solicitud (confirma/completa)
      fechaSolicitud,        // B: Fecha de Solicitud ← esto es lo que "registra" la fila
      responsable    ?? 'Elías', // C: Responsable
      'Email',               // D: Medio
      clientName     ?? '',  // E: Cliente
      budgetDate     ?? '',  // F: Fecha de cotización
      '',                    // G: Fecha OC (vacío)
      pideNumber     ?? '',  // H: Nº PIDE
      merchandise    ?? '',  // I: Mercadería Cotizada
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

    return NextResponse.json({ success: true, rowNumber, budgetNumber });
  } catch (error) {
    console.error('[Sheets register] Error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
