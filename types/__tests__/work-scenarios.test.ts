import { describe, it, expect } from 'vitest';
import {
  WORK_SCENARIOS_BY_EQUIPMENT_TYPE,
  WORK_ITEMS_BY_EQUIPMENT_TYPE,
  EQUIPMENT_TYPE_LABELS,
} from '../budget';
import type { EquipmentType } from '../budget';

const types = Object.keys(EQUIPMENT_TYPE_LABELS) as EquipmentType[];

describe('WORK_SCENARIOS_BY_EQUIPMENT_TYPE', () => {
  it.each(types)('los escenarios de %s sólo usan trabajos de su catálogo', (type) => {
    const catalog = new Set(WORK_ITEMS_BY_EQUIPMENT_TYPE[type]);
    for (const scenario of WORK_SCENARIOS_BY_EQUIPMENT_TYPE[type]) {
      const desconocidos = scenario.items.filter(d => !catalog.has(d));
      expect(desconocidos, `${type} / ${scenario.label}`).toEqual([]);
    }
  });

  it.each(types)('%s tiene al menos un escenario, sin ids ni trabajos repetidos', (type) => {
    const scenarios = WORK_SCENARIOS_BY_EQUIPMENT_TYPE[type];
    expect(scenarios.length).toBeGreaterThan(0);
    expect(new Set(scenarios.map(s => s.id)).size).toBe(scenarios.length);
    for (const s of scenarios) {
      expect(new Set(s.items).size, `${type} / ${s.label}`).toBe(s.items.length);
    }
  });

  it('no propone limpiar el bobinado viejo en los escenarios que lo rebobinan', () => {
    const limpieza = 'Limpieza de bobinado con solvente dieléctrico.';
    const bobinado = 'Fabricación de bobinado nuevo del motor.';
    for (const type of types) {
      for (const s of WORK_SCENARIOS_BY_EQUIPMENT_TYPE[type]) {
        if (s.items.includes(bobinado)) {
          expect(s.items, `${type} / ${s.label}`).not.toContain(limpieza);
        }
      }
    }
  });
});
