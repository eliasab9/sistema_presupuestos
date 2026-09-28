import { describe, it, expect } from 'vitest';
import { withSyncedSections } from '../budget-context';
import type { Budget, RepairSection } from '@/types/budget';

const labor = (description: string, priceARS: number) => ({
  id: description, description, priceARS, isManual: true,
});

const budget = (over: Partial<Budget>): Budget => ({
  equipment: { type: 'motor_electrico', power: 5, quantity: 1 },
  workItems: [], bearings: [], spareParts: [], machining: [], labor: [],
  allSections: [], activeSectionIdx: 0,
  ...over,
} as unknown as Budget);

const section = (label: string, laborARS: number): RepairSection => ({
  id: label, label,
  equipment: { type: 'motor_electrico', power: 5, quantity: 1 },
  workItems: [], bearings: [], spareParts: [], machining: [],
  labor: [labor(`MO ${label}`, laborARS)],
});

describe('withSyncedSections', () => {
  it('materializa la sección de un presupuesto viejo con allSections vacío', () => {
    const synced = withSyncedSections(budget({ labor: [labor('MO vieja', 1000)] }));
    expect(synced.allSections).toHaveLength(1);
    expect(synced.allSections[0].label).toBe('Equipo 1');
    expect(synced.allSections[0].labor).toEqual([labor('MO vieja', 1000)]);
  });

  it('vuelca el equipo activo sin tocar los demás', () => {
    const synced = withSyncedSections(budget({
      allSections: [section('Equipo 1', 1000), section('Equipo 2', 3000)],
      activeSectionIdx: 1,
      labor: [labor('MO editada', 5000)],
    }));
    expect(synced.allSections[0].labor).toEqual([labor('MO Equipo 1', 1000)]);
    expect(synced.allSections[1].labor).toEqual([labor('MO editada', 5000)]);
  });

  it('con un índice fuera de rango vuelca sobre la última sección en vez de perder la edición', () => {
    const synced = withSyncedSections(budget({
      allSections: [section('Equipo 1', 1000)],
      activeSectionIdx: 3,
      labor: [labor('MO editada', 5000)],
    }));
    expect(synced.allSections).toHaveLength(1);
    expect(synced.allSections[0].labor).toEqual([labor('MO editada', 5000)]);
  });
});
