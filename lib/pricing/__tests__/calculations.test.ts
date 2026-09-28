import { describe, it, expect } from 'vitest';
import {
  detectLaborType,
  generateSuggestedLabor,
  mergeSuggestedLabor,
  calculateIvaBreakdown,
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

  it('agrega bobinado y mantenimiento sólo si ambos están seleccionados', () => {
    const items = generateSuggestedLabor(
      [work('Desarme general del motor eléctrico.'), work('Fabricación de bobinado nuevo del motor.')],
      'motor_electrico',
      5
    );
    expect(items.map(i => i.laborType).sort()).toEqual(['motor_maintenance', 'winding']);
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

describe('calculateIvaBreakdown', () => {
  it('manda el bobinado al 10,5% y el resto al 21%', () => {
    const iva = calculateIvaBreakdown([
      {
        labor: [
          { id: 'a', description: 'Bobinado', priceARS: 1000, isManual: false, laborType: 'winding' },
          { id: 'b', description: 'Mantenimiento', priceARS: 500, isManual: false, laborType: 'motor_maintenance' },
        ],
        bearings: [{ subtotalARS: 300 } as never],
        spareParts: [{ subtotalARS: 200 } as never],
        machining: [],
      },
    ]);

    expect(iva.baseWinding).toBe(1000);
    expect(iva.baseGeneral).toBe(1000);
    expect(iva.ivaWinding).toBe(105);
    expect(iva.ivaGeneral).toBe(210);
    expect(iva.net).toBe(2000);
    expect(iva.gross).toBe(2315);
  });

  it('devuelve todo en cero con un presupuesto vacío', () => {
    const iva = calculateIvaBreakdown([]);
    expect(iva.net).toBe(0);
    expect(iva.gross).toBe(0);
  });
});
