import { describe, it, expect } from 'vitest';
import { findNextBudgetSlot } from '../sheet-rows';

const HEADER = ['Nº Solicitud', 'Fecha Solicitud'];

describe('findNextBudgetSlot', () => {
  it('toma la fila siguiente al último presupuesto registrado', () => {
    const rows = [
      HEADER,
      ['7141', '01/08/2026'],
      ['7142', '02/08/2026'],
    ];
    expect(findNextBudgetSlot(rows)).toEqual({ index: 3, rowNumber: 4, number: '7143' });
  });

  it('reutiliza una fila con número pero sin fecha (reserva que nunca se envió)', () => {
    const rows = [
      HEADER,
      ['7141', '01/08/2026'],
      ['7142', ''], // se reservó y falló el envío: el número sigue disponible
    ];
    expect(findNextBudgetSlot(rows)).toEqual({ index: 2, rowNumber: 3, number: '7142' });
  });

  it('toma la primera de varias reservas sin registrar, no la última', () => {
    const rows = [
      HEADER,
      ['7141', '01/08/2026'],
      ['7142', ''],
      ['7143', ''],
    ];
    expect(findNextBudgetSlot(rows)).toEqual({ index: 2, rowNumber: 3, number: '7142' });
  });

  it('rellena el hueco aunque haya presupuestos registrados más abajo', () => {
    // El caso real de las dos planillas: un bloque de números quemados y los
    // envíos nuevos empujados abajo del hueco.
    const rows = [
      HEADER,
      ['11291', '28/09/2026'],
      ['11292', ''],
      ['11293', ''],
      ['11301', '29/09/2026'],
      ['11302', '30/09/2026'],
    ];
    expect(findNextBudgetSlot(rows)).toEqual({ index: 2, rowNumber: 3, number: '11292' });
  });

  it('sigue por el número más alto cuando ya no quedan huecos', () => {
    const rows = [
      HEADER,
      ['11291', '28/09/2026'],
      ['11301', '29/09/2026'],
    ];
    expect(findNextBudgetSlot(rows)).toEqual({ index: 3, rowNumber: 4, number: '11302' });
  });

  it('saltea el encabezado de varias filas de la planilla real', () => {
    const rows = [
      [],                              // fila del logo
      ['', ''],                        // subtítulo
      ['SOLICITUD Nº', 'FECHA SOLICITUD'],
      ['11291', '28/09/2026'],
      ['', ''],
    ];
    expect(findNextBudgetSlot(rows)).toEqual({ index: 4, rowNumber: 5, number: '11292' });
  });

  it('ignora celdas con sólo espacios en blanco', () => {
    const rows = [
      HEADER,
      ['7141', '01/08/2026'],
      ['  ', '  '],
    ];
    expect(findNextBudgetSlot(rows).number).toBe('7142');
  });

  it('tolera filas cortas sin columna B', () => {
    const rows = [HEADER, ['7141', '01/08/2026'], ['7142']];
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
});
