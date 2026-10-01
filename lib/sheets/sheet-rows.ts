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
 *
 * La fecha es el marcador de "fila usada": sin ella la fila vuelve al pozo.
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

const NUMERIC = /^\d+$/;

function cell(rows: string[][], row: number, col: number): string {
  return rows[row]?.[col]?.trim() ?? '';
}

/**
 * Índice de la primera fila de datos: la primera cuyo A es un número.
 *
 * El encabezado ocupa varias filas (logo, subtítulo, títulos de columna) y no
 * siempre las mismas, así que anclarse en "la fila 2" no sirve.
 */
function firstDataIndex(rows: string[][]): number {
  for (let i = 0; i < rows.length; i++) {
    if (NUMERIC.test(cell(rows, i, 0))) return i;
  }
  return rows.length;
}

/**
 * Encuentra el próximo slot libre.
 *
 * Una fila cuenta como usada cuando tiene FECHA (columna B): es lo que escribe
 * el registro al enviar. Una fila con número en A pero sin fecha es una reserva
 * que nunca llegó a enviarse (falló la generación del archivo, se cerró la
 * pestaña, etc.) y hay que reutilizarla: tratarla como ocupada quemaba el número
 * para siempre y empujaba los presupuestos nuevos abajo del hueco.
 *
 * El número del slot es el que ya está en A si lo hay, así se respeta la reserva
 * previa en vez de inventar uno nuevo.
 *
 * La reserva sigue escribiendo A para acortar la ventana entre leer y registrar,
 * pero ya no la bloquea: el margen de colisión es el que va de la lectura a la
 * escritura dentro del mismo pedido.
 */
export function findNextBudgetSlot(rows: string[][]): BudgetSlot {
  const start = firstDataIndex(rows);

  let highest = 0;
  let index = -1;

  for (let i = start; i < rows.length; i++) {
    const colA = cell(rows, i, 0);
    if (NUMERIC.test(colA)) highest = Math.max(highest, parseInt(colA, 10));
    if (index === -1 && cell(rows, i, 1) === '') index = i;
  }

  // Sin huecos: se agrega al final. El mínimo de 1 evita pisar el encabezado
  // cuando la API devuelve la hoja vacía.
  if (index === -1) index = Math.max(rows.length, 1);

  const reserved = cell(rows, index, 0);

  return {
    index,
    rowNumber: index + 1,
    number: NUMERIC.test(reserved) ? reserved : String(highest + 1),
  };
}
