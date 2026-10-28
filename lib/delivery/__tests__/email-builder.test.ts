import { describe, it, expect } from 'vitest';
import {
  parseEmailList,
  validateEmail,
  validateEmailRequirements,
  buildGreeting,
  buildBudgetEmailBody,
  buildNewEquipmentEmailBody,
  buildBudgetEmailSubject,
} from '../email-builder';
import type { Budget, Customer, Equipment, NewEquipmentBudget, NewEquipmentItem } from '@/types/budget';

// Minimal Budget fixture
function makeBudget(
  equipment: Partial<Equipment> = {},
  extra: { customer?: Partial<Customer>; allSections?: { equipment: Partial<Equipment> }[] } = {}
): Budget {
  return {
    id: 'test-id',
    companyId: 'bemec',
    customer: { name: 'ACME', email: 'test@acme.com', ...extra.customer },
    meta: { number: '1', date: '01/01/2026' },
    equipment: { type: 'motor_electrico', power: 10, quantity: 1, ...equipment },
    allSections: extra.allSections?.map((s, i) => ({
      id: `s${i}`,
      label: `Equipo ${i + 1}`,
      equipment: { type: 'motor_electrico', power: 10, quantity: 1, ...s.equipment },
      workItems: [], bearings: [], spareParts: [], machining: [], labor: [],
    })),
  } as unknown as Budget;
}

function makeNewEquipmentBudget(items: Partial<NewEquipmentItem>[], customer: Partial<Customer> = {}): NewEquipmentBudget {
  return {
    id: 'ne-id',
    companyId: 'bemec',
    customer: { name: 'ACME', email: 'test@acme.com', ...customer },
    meta: { number: '1', date: '01/01/2026' },
    items: items.map((it, i) => ({
      id: `i${i}`, type: 'motor_electrico', brand: '', model: '', quantity: 1,
      unitPriceARS: 0, subtotalARS: 0, ...it,
    })),
  } as unknown as NewEquipmentBudget;
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

// ─── buildGreeting ─────────────────────────────────────────────────────────

describe('buildGreeting', () => {
  it('usa el plural neutro sin contacto cargado', () => {
    expect(buildGreeting({})).toBe('Estimados/as,');
    expect(buildGreeting({ attention: '   ' })).toBe('Estimados/as,');
    expect(buildGreeting(undefined)).toBe('Estimados/as,');
  });

  it('sin tratamiento elegido usa el neutro con nombre', () => {
    expect(buildGreeting({ attention: 'Juan Pérez' })).toBe('Estimado/a Juan Pérez,');
  });

  it('respeta el selector Sr./Sra.', () => {
    expect(buildGreeting({ attention: 'Juan', attentionTitle: 'sr' })).toBe('Estimado Juan,');
    expect(buildGreeting({ attention: 'Ana', attentionTitle: 'sra' })).toBe('Estimada Ana,');
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
  it('arma saludo, listado y cierre', () => {
    const body = buildBudgetEmailBody(makeBudget(
      { type: 'motor_electrico', brand: 'WEG', model: 'W22', power: 10, rpm: 1500, serial: '123456' },
      { customer: { attention: 'Juan Pérez', attentionTitle: 'sr' } }
    ));

    expect(body).toBe(
      'Estimado Juan Pérez,\n\n' +
      'Adjunto aquí el presupuesto por la reparación de:\n\n' +
      '• Motor eléctrico — Marca WEG · Modelo W22 · 10 HP · 1500 RPM · Serie 123456\n\n' +
      'Quedo a disposición.'
    );
  });

  it('lista todos los equipos de las pestañas, no sólo el activo', () => {
    const body = buildBudgetEmailBody(makeBudget({}, {
      allSections: [
        { equipment: { type: 'motor_electrico', brand: 'WEG', power: 10 } },
        { equipment: { type: 'bomba_centrifuga', brand: 'Grundfos', power: 5, quantity: 2 } },
      ],
    }));

    expect(body).toContain('• Motor eléctrico — Marca WEG · 10 HP');
    expect(body).toContain('• 2x Bomba centrífuga — Marca Grundfos · 5 HP');
  });

  it('prefiere la etiqueta del tipo propio de la empresa', () => {
    const body = buildBudgetEmailBody(makeBudget({ type: 'otro', customTypeLabel: 'Tablero eléctrico', power: 0 }));
    expect(body).toContain('• Tablero eléctrico');
    expect(body).not.toContain('Otro');
  });

  it('no filtra el motivo de falla ni las notas internas', () => {
    const body = buildBudgetEmailBody(makeBudget({
      failureReason: 'Bobinado quemado', notes: 'Cliente moroso',
    }));
    expect(body).not.toContain('Bobinado quemado');
    expect(body).not.toContain('Cliente moroso');
  });

  it('sin equipo cargado no imprime una lista vacía', () => {
    const body = buildBudgetEmailBody(makeBudget({ type: '', power: 0 }));
    expect(body).toBe('Estimados/as,\n\nAdjunto aquí el presupuesto solicitado.\n\nQuedo a disposición.');
  });

  it('agrega la firma del vendedor al final', () => {
    const budget = makeBudget();
    budget.meta.sellerSignature = 'Saludos,\nPedro';
    expect(buildBudgetEmailBody(budget)).toMatch(/Quedo a disposición\.\n\nSaludos,\nPedro$/);
  });
});

// ─── buildNewEquipmentEmailBody ────────────────────────────────────────────

describe('buildNewEquipmentEmailBody', () => {
  it('lista los equipos nuevos con todos sus datos', () => {
    const body = buildNewEquipmentEmailBody(makeNewEquipmentBudget(
      [{ type: 'motor_electrico', brand: 'WEG', model: 'W22', potencia: '10 HP', rpm: 1500, voltaje: '380 V' }],
      { attention: 'Ana', attentionTitle: 'sra' }
    ));

    expect(body).toBe(
      'Estimada Ana,\n\n' +
      'Adjunto aquí el presupuesto por:\n\n' +
      '• Motor Eléctrico — Marca WEG · Modelo W22 · 10 HP · 1500 RPM · 380 V\n\n' +
      'Quedo a disposición.'
    );
  });

  it('usa la descripción personalizada en vez de "Otro"', () => {
    const body = buildNewEquipmentEmailBody(makeNewEquipmentBudget([
      { type: 'otro', customDescription: 'Tablero eléctrico', customSpecs: 'IP65' },
    ]));
    expect(body).toContain('• Tablero eléctrico — IP65');
  });

  it('deja afuera las notas internas', () => {
    const body = buildNewEquipmentEmailBody(makeNewEquipmentBudget([
      { type: 'motor_electrico', notes: 'Margen al 40%' },
    ]));
    expect(body).not.toContain('Margen al 40%');
  });

  it('sin ítems no imprime una lista vacía', () => {
    const body = buildNewEquipmentEmailBody(makeNewEquipmentBudget([]));
    expect(body).toBe('Estimados/as,\n\nAdjunto aquí el presupuesto solicitado.\n\nQuedo a disposición.');
  });
});
