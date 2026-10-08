import { describe, it, expect } from 'vitest';
import { findNextBudgetSlot } from '../sheet-rows';

const HEADER = ['Nº Solicitud', 'Fecha Solicitud'];

/** Fila registrada: número, fecha y el resto de los datos que escribe register. */
const registrada = (n: string, fecha: string): string[] => [
  n, fecha, 'Pablo', 'Email', 'Cliente SA', fecha, '', '11650', 'Reparación',
];

/** Reserva huérfana: sólo el número, es la huella que deja reserve-number. */
const huerfana = (n: string): string[] => [n];

describe('findNextBudgetSlot', () => {
  it('toma la fila siguiente al último presupuesto registrado', () => {
    const rows = [HEADER, registrada('7141', '01/08/2026'), registrada('7142', '02/08/2026')];
    expect(findNextBudgetSlot(rows)).toEqual({ index: 3, rowNumber: 4, number: '7143' });
  });

  it('reutiliza una fila con número pero sin fecha (reserva que nunca se envió)', () => {
    const rows = [HEADER, registrada('7141', '01/08/2026'), huerfana('7142')];
    expect(findNextBudgetSlot(rows)).toEqual({ index: 2, rowNumber: 3, number: '7142' });
  });

  it('toma la primera de varias reservas sin registrar, no la última', () => {
    const rows = [HEADER, registrada('7141', '01/08/2026'), huerfana('7142'), huerfana('7143')];
    expect(findNextBudgetSlot(rows)).toEqual({ index: 2, rowNumber: 3, number: '7142' });
  });

  it('rellena el hueco aunque haya presupuestos registrados más abajo', () => {
    // El caso real de las dos planillas: un bloque de números quemados y los
    // envíos nuevos empujados abajo del hueco.
    const rows = [
      HEADER,
      registrada('11291', '28/09/2026'),
      huerfana('11292'),
      huerfana('11293'),
      registrada('11301', '29/09/2026'),
      registrada('11302', '30/09/2026'),
    ];
    expect(findNextBudgetSlot(rows)).toEqual({ index: 2, rowNumber: 3, number: '11292' });
  });

  it('sigue por el último registrado cuando ya no quedan huecos', () => {
    const rows = [HEADER, registrada('11291', '28/09/2026'), registrada('11301', '29/09/2026')];
    expect(findNextBudgetSlot(rows)).toEqual({ index: 3, rowNumber: 4, number: '11302' });
  });

  it('saltea el encabezado de varias filas de la planilla real', () => {
    const rows = [
      [],                              // fila del logo
      ['', ''],                        // subtítulo
      ['SOLICITUD Nº', 'FECHA SOLICITUD'],
      registrada('11291', '28/09/2026'),
    ];
    expect(findNextBudgetSlot(rows)).toEqual({ index: 4, rowNumber: 5, number: '11292' });
  });

  it('ignora celdas con sólo espacios en blanco', () => {
    const rows = [HEADER, registrada('7141', '01/08/2026'), ['  ', '  ']];
    expect(findNextBudgetSlot(rows).number).toBe('7142');
  });

  it('tolera filas cortas sin columna B', () => {
    const rows = [HEADER, registrada('7141', '01/08/2026'), ['7142']];
    expect(findNextBudgetSlot(rows)).toEqual({ index: 2, rowNumber: 3, number: '7142' });
  });

  it('arranca en 1 cuando la hoja sólo tiene encabezado', () => {
    expect(findNextBudgetSlot([HEADER])).toEqual({ index: 1, rowNumber: 2, number: '1' });
  });

  it('arranca en 1 cuando la hoja está completamente vacía', () => {
    expect(findNextBudgetSlot([])).toEqual({ index: 1, rowNumber: 2, number: '1' });
  });

  it('arranca en 1 si el último número no es numérico', () => {
    const rows = [HEADER, ['s/n', '01/08/2026']];
    expect(findNextBudgetSlot(rows).number).toBe('1');
  });

  // --- Casos tomados de la planilla real --------------------------------

  it('no pisa un registro viejo al que le falta la fecha', () => {
    // BAMORE fila 9: número 10294, sin fecha, pero con cliente FECOVITA cargado.
    const rows = [
      HEADER,
      ['10294', '', 'PABLO', 'EMAIL', 'FECOVITA', '', '9-ene', '11088', 'REPARACION'],
      registrada('10295', '10/01/2026'),
    ];
    expect(findNextBudgetSlot(rows)).toEqual({ index: 3, rowNumber: 4, number: '10296' });
  });

  it('no pisa un separador de mes', () => {
    const rows = [HEADER, registrada('7141', '01/08/2026'), ['oct-25']];
    expect(findNextBudgetSlot(rows)).toEqual({ index: 3, rowNumber: 4, number: '7142' });
  });

  it('no pisa una fila en blanco intercalada', () => {
    // BEMEC 579: fila vacía entre dos presupuestos. Tiene que quedar donde está.
    const rows = [
      HEADER,
      registrada('1224', '01/10/2026'),
      ['', ''],
      registrada('1225', '01/10/2026'),
    ];
    expect(findNextBudgetSlot(rows)).toEqual({ index: 4, rowNumber: 5, number: '1226' });
  });

  it('ignora las huérfanas anteriores al último separador de mes', () => {
    // BEMEC: las huérfanas de 2025 (767, 832…) se dan por perdidas; sólo se
    // reutilizan las del bloque vigente.
    const rows = [
      HEADER,
      registrada('766', '10/09/2025'),
      huerfana('767'),
      ['abril 2026'],
      registrada('1206', '28/09/2026'),
      huerfana('1207'),
      registrada('1212', '28/09/2026'),
    ];
    expect(findNextBudgetSlot(rows)).toEqual({ index: 5, rowNumber: 6, number: '1207' });
  });

  it('usa el último registrado y no el máximo de la columna A', () => {
    // BEMEC fila 330 tiene un 11149 cargado por error (es un número de BAMORE).
    // Con "máximo + 1" el próximo presupuesto salía 11150 en vez de 1297.
    const rows = [
      HEADER,
      registrada('1295', '07/10/2026'),
      registrada('11149', '15/05/2026'), // cargado en la pestaña equivocada
      registrada('1296', '07/10/2026'),
    ];
    expect(findNextBudgetSlot(rows).number).toBe('1297');
  });

  it('consume el hueco entero y después sigue por el correlativo', () => {
    const rows: string[][] = [
      HEADER,
      registrada('11291', '28/09/2026'),
      huerfana('11292'),
      huerfana('11293'),
      registrada('11301', '29/09/2026'),
      registrada('11302', '30/09/2026'),
    ];
    const asignados: string[] = [];
    for (let i = 0; i < 4; i++) {
      const slot = findNextBudgetSlot(rows);
      asignados.push(slot.number);
      while (rows.length <= slot.index) rows.push([]);
      rows[slot.index] = registrada(slot.number, '07/10/2026');
    }
    expect(asignados).toEqual(['11292', '11293', '11303', '11304']);
  });
});
