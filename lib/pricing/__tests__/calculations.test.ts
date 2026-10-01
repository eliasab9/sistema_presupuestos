import { describe, it, expect } from 'vitest';
import {
  detectLaborType,
  generateSuggestedLabor,
  mergeSuggestedLabor,
  calculateIvaBreakdown,
  resolveIvaMode,
  IVA_CONDITION_REDUCED,
  IVA_CONDITION_GENERAL,
  IVA_CONDITION_SPLIT,
} from '../calculations';
import type { LaborItem } from '@/types/budget';

const work = (description: string) => ({ description, affectsCalculation: true });

describe('detectLaborType', () => {
  it('cobra fabricación sólo cuando el trabajo la nombra', () => {
    expect(detectLaborType('Fabricación de bobinado nuevo del motor.')).toBe('winding');
    expect(detectLaborType('Rebobinado del estator.')).toBe('winding');
  });

  it('no cobra fabricación por trabajos que apenas mencionan el bobinado', () => {
    expect(detectLaborType('Limpieza de bobinado con solvente dieléctrico.')).toBeNull();
    expect(detectLaborType('Barnizado estator (aislación clase F).')).toBeNull();
  });

  it('asigna el mantenimiento según el equipo que se desarma', () => {
    expect(detectLaborType('Desarme general del motor eléctrico.')).toBe('motor_maintenance');
    expect(detectLaborType('Desarme general de la bomba centrífuga.')).toBe('pump_maintenance');
    expect(detectLaborType('Desarme general del reductor.')).toBe('reducer_maintenance');
  });
});

describe('generateSuggestedLabor', () => {
  it('no agrega bobinado al desarmar un motor', () => {
    const items = generateSuggestedLabor(
      [work('Desarme general del motor eléctrico.'), work('Limpieza de bobinado con solvente dieléctrico.')],
      'motor_electrico',
      5
    );
    expect(items.map(i => i.laborType)).toEqual(['motor_maintenance']);
  });

  it('no cobra mantenimiento aparte cuando hay fabricación de bobinado', () => {
    const items = generateSuggestedLabor(
      [work('Desarme general del motor eléctrico.'), work('Fabricación de bobinado nuevo del motor.')],
      'motor_electrico',
      5
    );
    expect(items.map(i => i.laborType)).toEqual(['winding']);
  });

  it('escribe la potencia del equipo en la descripción', () => {
    const items = generateSuggestedLabor([work('Desarme general del motor eléctrico.')], 'motor_electrico', 5.5);
    expect(items[0].description).toBe('Mantenimiento motor — 5.5 HP');
  });
});

describe('mergeSuggestedLabor', () => {
  const suggestion = (laborType: LaborItem['laborType'], priceARS: number): LaborItem => ({
    id: `new-${laborType}`, description: String(laborType), priceARS, isManual: false, laborType,
  });

  it('no duplica al recalcular', () => {
    const first = [suggestion('winding', 100)];
    const merged = mergeSuggestedLabor(first, [suggestion('winding', 100)]);
    expect(merged).toHaveLength(1);
  });

  it('respeta el precio editado a mano', () => {
    const edited: LaborItem = { ...suggestion('winding', 999), priceOverridden: true };
    const merged = mergeSuggestedLabor([edited], [suggestion('winding', 100)]);
    expect(merged).toHaveLength(1);
    expect(merged[0].priceARS).toBe(999);
  });

  it('reescribe la descripción al cambiar de potencia', () => {
    const previous: LaborItem = {
      id: 'x', description: 'Mantenimiento motor — 1 HP', priceARS: 100,
      isManual: false, laborType: 'motor_maintenance',
    };
    const nueva = { ...previous, id: 'new', description: 'Mantenimiento motor — 5.5 HP', priceARS: 200 };
    const merged = mergeSuggestedLabor([previous], [nueva]);
    expect(merged[0].description).toBe('Mantenimiento motor — 5.5 HP');
    expect(merged[0].priceARS).toBe(200);
  });

  it('respeta la descripción que el vendedor editó a mano', () => {
    const previous: LaborItem = {
      id: 'x', description: 'Mantenimiento a convenir', priceARS: 100,
      isManual: false, laborType: 'motor_maintenance', descriptionOverridden: true,
    };
    const nueva = { ...previous, id: 'new', description: 'Mantenimiento motor — 5.5 HP', priceARS: 200 };
    const merged = mergeSuggestedLabor([previous], [nueva]);
    expect(merged[0].description).toBe('Mantenimiento a convenir');
    expect(merged[0].priceARS).toBe(200);
  });

  it('conserva los ítems manuales y saca los sugeridos que ya no aplican', () => {
    const manual: LaborItem = { id: 'm1', description: 'Flete', priceARS: 50, isManual: true };
    const merged = mergeSuggestedLabor([suggestion('winding', 100), manual], []);
    expect(merged).toEqual([manual]);
  });

  it('no duplica ítems viejos que no tienen laborType', () => {
    const legacy: LaborItem = {
      id: 'old', description: 'Fabricación de bobinado — motor 5 HP', priceARS: 777, isManual: false,
    };
    const merged = mergeSuggestedLabor([legacy], [suggestion('winding', 100)]);
    expect(merged).toHaveLength(1);
    expect(merged[0].priceARS).toBe(777);
  });
});

describe('resolveIvaMode', () => {
  it('mapea cada chip a su modo', () => {
    expect(resolveIvaMode(IVA_CONDITION_REDUCED)).toBe('reduced');
    expect(resolveIvaMode(IVA_CONDITION_GENERAL)).toBe('general');
    expect(resolveIvaMode(IVA_CONDITION_SPLIT)).toBe('split');
  });

  it('devuelve null sin chip elegido', () => {
    expect(resolveIvaMode(undefined)).toBeNull();
    expect(resolveIvaMode('')).toBeNull();
  });

  it('devuelve null con una condición escrita a mano', () => {
    expect(resolveIvaMode('exento')).toBeNull();
    expect(resolveIvaMode('10,5% sobre todo menos repuestos')).toBeNull();
  });
});

describe('calculateIvaBreakdown', () => {
  // 1000 de bobinado + 500 de mantenimiento + 300 + 200 = 2000 netos
  const sections = [
    {
      labor: [
        { id: 'a', description: 'Bobinado', priceARS: 1000, isManual: false, laborType: 'winding' as const },
        { id: 'b', description: 'Mantenimiento', priceARS: 500, isManual: false, laborType: 'motor_maintenance' as const },
      ],
      bearings: [{ subtotalARS: 300 } as never],
      spareParts: [{ subtotalARS: 200 } as never],
      machining: [],
    },
  ];

  it('con "Ambos" manda el bobinado al 10,5% y el resto al 21%', () => {
    const iva = calculateIvaBreakdown(sections, IVA_CONDITION_SPLIT)!;

    expect(iva.lines).toHaveLength(2);
    expect(iva.lines[0]).toMatchObject({ base: 1000, iva: 105 });
    expect(iva.lines[1]).toMatchObject({ base: 1000, iva: 210 });
    expect(iva.net).toBe(2000);
    expect(iva.ivaTotal).toBe(315);
    expect(iva.gross).toBe(2315);
  });

  it('con "21%" grava todo al 21% en una sola fila', () => {
    const iva = calculateIvaBreakdown(sections, IVA_CONDITION_GENERAL)!;

    expect(iva.lines).toHaveLength(1);
    expect(iva.lines[0]).toMatchObject({ base: 2000, iva: 420 });
    expect(iva.gross).toBe(2420);
  });

  it('con "10,5%" grava todo al 10,5% en una sola fila', () => {
    const iva = calculateIvaBreakdown(sections, IVA_CONDITION_REDUCED)!;

    expect(iva.lines).toHaveLength(1);
    expect(iva.lines[0]).toMatchObject({ base: 2000, iva: 210 });
    expect(iva.gross).toBe(2210);
  });

  it('devuelve null sin condición elegida: no se inventa una alícuota', () => {
    expect(calculateIvaBreakdown(sections, undefined)).toBeNull();
    expect(calculateIvaBreakdown(sections, '')).toBeNull();
    expect(calculateIvaBreakdown(sections, 'exento')).toBeNull();
  });

  it('devuelve todo en cero con un presupuesto vacío', () => {
    const iva = calculateIvaBreakdown([], IVA_CONDITION_SPLIT)!;
    expect(iva.net).toBe(0);
    expect(iva.gross).toBe(0);
  });
});

describe('detectLaborType — bobinado', () => {
  it('reconoce "fabricación de bobina" igual que "de bobinado"', () => {
    expect(detectLaborType('Fabricación de bobina')).toBe('winding');
    expect(detectLaborType('Fabricación de bobinado')).toBe('winding');
  });

  it('no cobra bobinado por sólo nombrarlo', () => {
    expect(detectLaborType('Limpieza de bobinado')).not.toBe('winding');
  });
});
