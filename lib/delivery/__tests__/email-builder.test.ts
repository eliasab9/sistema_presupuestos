import { describe, it, expect } from 'vitest';
import {
  parseEmailList,
  validateEmail,
  validateEmailRequirements,
  buildEquipmentDescription,
  buildBudgetEmailBody,
  buildBudgetEmailSubject,
} from '../email-builder';
import type { Budget } from '@/types/budget';

// Minimal Budget fixture
function makeBudget(equipment: {
  type?: string;
  subtype?: string;
  brand?: string;
  model?: string;
} = {}): Budget {
  return {
    id: 'test-id',
    companyId: 'bemec',
    customer: { name: 'ACME', email: 'test@acme.com' },
    meta: { number: '1', date: '01/01/2026' },
    equipment: {
      type: equipment.type ?? 'motor_electrico',
      subtype: equipment.subtype,
      brand: equipment.brand,
      model: equipment.model,
      power: 10,
      quantity: 1,
    },
  } as unknown as Budget;
}

// ─── parseEmailList ────────────────────────────────────────────────────────

describe('parseEmailList', () => {
  it('returns empty array for empty string', () => {
    expect(parseEmailList('')).toEqual([]);
  });

  it('parses single email', () => {
    expect(parseEmailList('a@b.com')).toEqual(['a@b.com']);
  });

  it('parses comma-separated emails', () => {
    expect(parseEmailList('a@b.com,c@d.com')).toEqual(['a@b.com', 'c@d.com']);
  });

  it('parses semicolon-separated emails', () => {
    expect(parseEmailList('a@b.com;c@d.com')).toEqual(['a@b.com', 'c@d.com']);
  });

  it('trims whitespace around emails', () => {
    expect(parseEmailList(' a@b.com , c@d.com ')).toEqual(['a@b.com', 'c@d.com']);
  });

  it('filters out empty entries from extra separators', () => {
    expect(parseEmailList('a@b.com,,c@d.com')).toEqual(['a@b.com', 'c@d.com']);
  });
});

// ─── validateEmail ─────────────────────────────────────────────────────────

describe('validateEmail', () => {
  it('accepts a valid email', () => {
    expect(validateEmail('user@example.com')).toEqual({ valid: true });
  });

  it('rejects empty string', () => {
    const result = validateEmail('');
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('rejects email without @', () => {
    expect(validateEmail('notanemail').valid).toBe(false);
  });

  it('rejects email without domain', () => {
    expect(validateEmail('user@').valid).toBe(false);
  });

  it('rejects email without TLD', () => {
    expect(validateEmail('user@domain').valid).toBe(false);
  });

  it('accepts email with subdomains', () => {
    expect(validateEmail('user@mail.example.com')).toEqual({ valid: true });
  });
});

// ─── validateEmailRequirements ─────────────────────────────────────────────

describe('validateEmailRequirements', () => {
  it('returns valid when all fields are correct', () => {
    const result = validateEmailRequirements('a@b.com', 'Presupuesto', 'Estimados...');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('reports all errors when everything is missing', () => {
    const result = validateEmailRequirements('', '', '');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });

  it('reports invalid email error', () => {
    const result = validateEmailRequirements('bad-email', 'Asunto', 'Cuerpo');
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.toLowerCase().includes('email'))).toBe(true);
  });

  it('reports missing subject error', () => {
    const result = validateEmailRequirements('a@b.com', '', 'Cuerpo');
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.toLowerCase().includes('asunto'))).toBe(true);
  });

  it('reports missing body error', () => {
    const result = validateEmailRequirements('a@b.com', 'Asunto', '');
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.toLowerCase().includes('cuerpo'))).toBe(true);
  });
});

// ─── buildEquipmentDescription ─────────────────────────────────────────────

describe('buildEquipmentDescription', () => {
  it('returns fallback when no equipment info', () => {
    const budget = { ...makeBudget(), equipment: { type: '', power: 0, quantity: 1 } } as unknown as Budget;
    expect(buildEquipmentDescription(budget)).toBe('el equipo detallado en el presupuesto');
  });

  it('includes equipment type label', () => {
    const desc = buildEquipmentDescription(makeBudget({ type: 'motor_electrico' }));
    expect(desc).toContain('motor eléctrico');
  });

  it('uses feminine article for bomba types when details are present', () => {
    // Article is only computed when there are 2+ parts (type + brand/model)
    const desc = buildEquipmentDescription(makeBudget({ type: 'bomba_centrifuga', brand: 'Grundfos' }));
    expect(desc).toMatch(/^de la /);
  });

  it('uses masculine article for motor types when details are present', () => {
    const desc = buildEquipmentDescription(makeBudget({ type: 'motor_electrico', brand: 'Siemens' }));
    expect(desc).toMatch(/^del /);
  });

  it('uses "del" shorthand when only type is present', () => {
    const desc = buildEquipmentDescription(makeBudget({ type: 'bomba_centrifuga' }));
    expect(desc).toMatch(/^del /);
  });

  it('includes brand when provided', () => {
    const desc = buildEquipmentDescription(makeBudget({ type: 'motor_electrico', brand: 'Siemens' }));
    expect(desc).toContain('Siemens');
  });

  it('includes model when provided', () => {
    const desc = buildEquipmentDescription(makeBudget({ type: 'motor_electrico', model: 'XM200' }));
    expect(desc).toContain('XM200');
  });
});

// ─── buildBudgetEmailSubject ───────────────────────────────────────────────

describe('buildBudgetEmailSubject', () => {
  it('returns the expected subject string', () => {
    expect(buildBudgetEmailSubject(makeBudget())).toBe('Presupuesto reparación');
  });
});

// ─── buildBudgetEmailBody ──────────────────────────────────────────────────

describe('buildBudgetEmailBody', () => {
  it('starts with "Estimados"', () => {
    expect(buildBudgetEmailBody(makeBudget())).toMatch(/^Estimados/);
  });

  it('contains equipment description', () => {
    const body = buildBudgetEmailBody(makeBudget({ type: 'motor_electrico' }));
    expect(body).toContain('motor eléctrico');
  });

  it('contains "presupuesto por la reparación"', () => {
    const body = buildBudgetEmailBody(makeBudget());
    expect(body).toContain('presupuesto por la reparación');
  });
});
