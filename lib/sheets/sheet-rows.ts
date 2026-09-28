/**
 * Utilidades compartidas para leer la planilla de presupuestos.
 *
 * Las rutas next-number, reserve-number y register deben coincidir exactamente
 * en qué fila consideran "libre"; si divergen, se duplican o se saltean números.
 * Por eso esa regla vive acá y no copiada en cada handler.
 *
 * Layout de la planilla:
 *   A = Nº de solicitud  → se escribe al RESERVAR
 *   B = Fecha de solicitud → se escribe al REGISTRAR (envío efectivo)
 */

export const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';

export async function resolveSheetName(
  accessToken: string,
  spreadsheetId: string,
  gid: number
): Promise<string> {
  const res = await fetch(`${SHEETS_API}/${spreadsheetId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`No se pudo obtener metadata (${res.status}): ${await res.text()}`);
  const data = await res.json();
  const sheet = (data.sheets ?? []).find(
    (s: { properties: { sheetId: number; title: string } }) => s.properties?.sheetId === gid
  );
  if (!sheet) throw new Error(`No se encontró pestaña con gid=${gid}`);
  return sheet.properties.title as string;
}

/** Lee las columnas A:B completas de la pestaña. */
export async function readColumnsAB(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string
): Promise<string[][]> {
  const range = encodeURIComponent(`'${sheetName}'!A:B`);
  const res = await fetch(`${SHEETS_API}/${spreadsheetId}/values/${range}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Error leyendo columnas A:B: ${await res.text()}`);
  const data = await res.json();
  return (data.values ?? []) as string[][];
}

export interface BudgetSlot {
  /** Índice 0-based dentro del array de filas. */
  index: number;
  /** Número de fila 1-based, que es lo que espera la API de Sheets. */
  rowNumber: number;
  /** Número de presupuesto que corresponde a este slot. */
  number: string;
}

/**
 * Encuentra el próximo slot libre.
 *
 * Una fila está tomada apenas A o B tienen algo. Mirar sólo B (como se hacía
 * antes) hacía que la reserva no reservara nada: escribía en A pero seguía
 * buscando por B, así que dos pedidos concurrentes recibían el mismo número.
 */
export function findNextBudgetSlot(rows: string[][]): BudgetSlot {
  let lastTakenIndex = 0;
  for (let i = 1; i < rows.length; i++) {
    const colA = rows[i]?.[0]?.trim() ?? '';
    const colB = rows[i]?.[1]?.trim() ?? '';
    if (colA !== '' || colB !== '') lastTakenIndex = i;
  }

  const index = lastTakenIndex + 1;
  const lastNumber = parseInt(rows[lastTakenIndex]?.[0]?.trim() ?? '', 10);

  return {
    index,
    rowNumber: index + 1,
    number: String(Number.isNaN(lastNumber) ? 1 : lastNumber + 1),
  };
}
