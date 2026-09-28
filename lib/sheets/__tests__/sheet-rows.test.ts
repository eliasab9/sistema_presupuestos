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

  it('considera ocupada una fila que sólo tiene la columna A (reservada, sin registrar)', () => {
    const rows = [
      HEADER,
      ['7141', '01/08/2026'],
      ['7142', ''], // reservada por otra sesión, todavía sin enviar
    ];
    // Sin esto dos sesiones concurrentes recibirían ambas el 7142.
    expect(findNextBudgetSlot(rows).number).toBe('7143');
  });

  it('salta varias filas reservadas consecutivas', () => {
    const rows = [
      HEADER,
      ['7141', '01/08/2026'],
      ['7142', ''],
      ['7143', ''],
    ];
    expect(findNextBudgetSlot(rows)).toEqual({ index: 4, rowNumber: 5, number: '7144' });
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
    expect(findNextBudgetSlot(rows).number).toBe('7143');
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
