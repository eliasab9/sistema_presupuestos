/**
 * Utilidades compartidas para leer la planilla de presupuestos.
 *
 * Las rutas next-number, reserve-number y register deben coincidir exactamente
 * en qué fila consideran "libre"; si divergen, se duplican o se saltean números.
 * Por eso esa regla vive acá y no copiada en cada handler.
 *
 * Layout real de la planilla (pestañas BEMEC y BAMORE):
 *   A = Nº de solicitud     → lo escribe RESERVAR
 *   B = Fecha de solicitud  → lo escribe REGISTRAR (envío efectivo)
 *   C..I = responsable, medio, cliente, fechas, Nº PIDE, mercadería → REGISTRAR
 *   J = fecha acordada      → lo completa la gente a mano
 *
 * La planilla NO es una tabla homogénea. Tiene, mezclado con los presupuestos:
 *   - un encabezado de 8 filas (logo, título, subtítulo, títulos de columna);
 *   - separadores de mes con texto en A y nada más ("oct-25", "SETIEMBRE 2025");
 *   - filas en blanco usadas como espaciadores (BEMEC 451, 509, 579);
 *   - registros viejos sin fecha pero con cliente cargado (BAMORE 9 = FECOVITA,
 *     BAMORE 39 = CENCOSUD);
 *   - algún número cargado en la pestaña equivocada (BEMEC fila 330 = 11149).
 *
 * Todo eso tiene que quedar intacto, así que el criterio de "fila libre" es
 * estrecho a propósito. Ver findNextBudgetSlot.
 */

export const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';

/** Columnas que se leen. Hace falta hasta J para distinguir una reserva
 *  huérfana (sólo A) de un registro viejo al que le falta la fecha. */
const READ_RANGE = 'A:J';

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

/** Lee las columnas A:J completas de la pestaña. */
export async function readBudgetRows(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string
): Promise<string[][]> {
  const range = encodeURIComponent(`'${sheetName}'!${READ_RANGE}`);
  const res = await fetch(`${SHEETS_API}/${spreadsheetId}/values/${range}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Error leyendo ${READ_RANGE}: ${await res.text()}`);
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

/** La fila no tiene nada más que la columna A. */
function emptyAfterA(rows: string[][], row: number): boolean {
  const cells = rows[row] ?? [];
  for (let c = 1; c < cells.length; c++) {
    if ((cells[c] ?? '').trim() !== '') return false;
  }
  return true;
}

/**
 * Reserva huérfana: número en A y el resto de la fila vacío.
 *
 * Es exactamente la huella que deja reserve-number, que escribe sólo A. Si el
 * presupuesto se hubiera enviado, register habría completado B..I; si es un
 * registro viejo al que le falta la fecha, tiene cliente o mercadería cargados.
 */
function isOrphanReservation(rows: string[][], row: number): boolean {
  return NUMERIC.test(cell(rows, row, 0)) && emptyAfterA(rows, row);
}

/** Separador de mes: texto no numérico en A y nada más ("oct-25", "abril 2026"). */
function isMonthSeparator(rows: string[][], row: number): boolean {
  const a = cell(rows, row, 0);
  return a !== '' && !NUMERIC.test(a) && emptyAfterA(rows, row);
}

/**
 * Encuentra la fila donde va el próximo presupuesto.
 *
 * 1. Reutiliza la primera reserva huérfana del bloque de mes vigente.
 *
 *    Una reserva huérfana es un número que se reservó y nunca se envió (falló
 *    la generación del archivo, se cerró la pestaña). Antes se las daba por
 *    ocupadas: el número quedaba quemado para siempre y los envíos nuevos se
 *    iban abajo del hueco. Pasó en las dos planillas (BAMORE 11292-11300,
 *    BEMEC 1207-1211 y 1226-1273).
 *
 *    Sólo se miran las que están debajo del último separador de mes, para no
 *    salir con un número de hace un año: BEMEC tiene huérfanas de 2025 (767,
 *    832, 875, 922) que el usuario decidió dar por perdidas.
 *
 * 2. Si no quedan huecos, agrega al final con el número de la última fila
 *    registrada + 1.
 *
 *    Se usa la última registrada y no el máximo de la columna A porque alcanza
 *    un número cargado en la pestaña equivocada para romperlo: BEMEC tiene un
 *    11149 en la fila 330 y "máximo + 1" proponía 11150 en vez de 1297.
 *
 * Nunca se escribe en una fila en blanco ni en un separador de mes, así que los
 * espaciadores de la planilla quedan donde están.
 */
export function findNextBudgetSlot(rows: string[][]): BudgetSlot {
  // Bloque vigente: todo lo que está debajo del último separador de mes.
  let blockStart = 0;
  for (let i = 0; i < rows.length; i++) {
    if (isMonthSeparator(rows, i)) blockStart = i + 1;
  }

  // Correlativo: el número de la última fila que tiene fecha.
  let lastRegistered = 0;
  for (let i = 0; i < rows.length; i++) {
    const a = cell(rows, i, 0);
    if (NUMERIC.test(a) && cell(rows, i, 1) !== '') lastRegistered = parseInt(a, 10);
  }

  for (let i = blockStart; i < rows.length; i++) {
    if (isOrphanReservation(rows, i)) {
      // Hereda el número ya reservado en vez de inventar uno nuevo.
      return { index: i, rowNumber: i + 1, number: cell(rows, i, 0) };
    }
  }

  // El mínimo de 1 evita pisar el encabezado cuando la hoja viene vacía.
  const index = Math.max(rows.length, 1);
  return { index, rowNumber: index + 1, number: String(lastRegistered + 1) };
}
