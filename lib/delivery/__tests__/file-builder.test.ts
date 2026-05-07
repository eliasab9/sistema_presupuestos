import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  sanitizeForFileName,
  buildBudgetFileName,
  validateFileName,
  buildDrivePath,
} from '../file-builder';
import type { Budget } from '@/types/budget';
import type { DriveDestination } from '@/types/delivery';

// Minimal Budget fixture — only fields used by file-builder
function makeBudget(overrides: { customerName?: string; number?: string } = {}): Budget {
  return {
    id: 'test-id',
    companyId: 'bemec',
    customer: { name: overrides.customerName ?? 'ACME Corp', email: '' },
    meta: { number: overrides.number ?? '123', date: '01/01/2026' },
    equipment: { type: 'motor_electrico', power: 10, quantity: 1 },
  } as unknown as Budget;
}

function makeDestination(overrides: Partial<DriveDestination> = {}): DriveDestination {
  return {
    rootFolder: '',
    rootFolderName: '',
    yearSubfolder: false,
    clientSubfolder: false,
    customPath: '',
    createIfNotExists: true,
    ...overrides,
  };
}

// ─── sanitizeForFileName ────────────────────────────────────────────────────

describe('sanitizeForFileName', () => {
  it('removes accents', () => {
    expect(sanitizeForFileName('Córdoba')).toBe('Cordoba');
  });

  it('removes special characters', () => {
    expect(sanitizeForFileName('file@name!')).toBe('filename');
  });

  it('replaces spaces with underscores', () => {
    expect(sanitizeForFileName('hello world')).toBe('hello_world');
  });

  it('collapses multiple spaces into one underscore', () => {
    expect(sanitizeForFileName('a  b   c')).toBe('a_b_c');
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeForFileName('')).toBe('');
  });

  it('handles mixed accented and special chars', () => {
    expect(sanitizeForFileName('Señor García & Cía')).toBe('Senor_Garcia_Cia');
  });
});

// ─── buildBudgetFileName ───────────────────────────────────────────────────

describe('buildBudgetFileName', () => {
  beforeEach(() => {
    // Fix "today" to 2026-03-15 so the date part is deterministic
    vi.setSystemTime(new Date('2026-03-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('builds correct PDF file name', () => {
    const budget = makeBudget({ customerName: 'ACME Corp', number: '945' });
    expect(buildBudgetFileName(budget, 'pdf')).toBe('ACME_cot 945_15-03-26.pdf');
  });

  it('builds correct DOCX file name', () => {
    const budget = makeBudget({ customerName: 'ACME Corp', number: '945' });
    expect(buildBudgetFileName(budget, 'docx')).toBe('ACME_cot 945_15-03-26.docx');
  });

  it('uses first word of customer name only', () => {
    const budget = makeBudget({ customerName: 'Empresa Larga de Argentina', number: '1' });
    expect(buildBudgetFileName(budget, 'pdf')).toMatch(/^EMPRESA_/);
  });

  it('falls back to CLIENTE when customer name is empty', () => {
    const budget = makeBudget({ customerName: '', number: '1' });
    expect(buildBudgetFileName(budget, 'pdf')).toMatch(/^CLIENTE_/);
  });

  it('truncates client part to 20 chars', () => {
    const budget = makeBudget({ customerName: 'Averylongnamethatexceedstwentycharacters', number: '1' });
    const fileName = buildBudgetFileName(budget, 'pdf');
    const clientPart = fileName.split('_')[0];
    expect(clientPart.length).toBeLessThanOrEqual(20);
  });

  it('uses cot 0 when budget number is empty', () => {
    const budget = makeBudget({ number: '' });
    expect(buildBudgetFileName(budget, 'pdf')).toContain('cot 0');
  });

  it('removes accents from customer name', () => {
    const budget = makeBudget({ customerName: 'Córdoba Motores', number: '10' });
    expect(buildBudgetFileName(budget, 'pdf')).toMatch(/^CORDOBA_/);
  });
});

// ─── validateFileName ──────────────────────────────────────────────────────

describe('validateFileName', () => {
  it('accepts a valid file name', () => {
    expect(validateFileName('ACME_cot 945_15-03-26.pdf')).toEqual({ valid: true });
  });

  it('rejects empty string', () => {
    const result = validateFileName('');
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('rejects names longer than 200 characters', () => {
    const result = validateFileName('a'.repeat(201));
    expect(result.valid).toBe(false);
  });

  it('rejects names with invalid characters', () => {
    expect(validateFileName('file<name>').valid).toBe(false);
    expect(validateFileName('path/name').valid).toBe(false);
    expect(validateFileName('name:ext').valid).toBe(false);
  });

  it('accepts names with dashes, underscores and dots', () => {
    expect(validateFileName('file_name-v2.pdf')).toEqual({ valid: true });
  });
});

// ─── buildDrivePath ────────────────────────────────────────────────────────

describe('buildDrivePath', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2026-03-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns root folder name when no subfolders', () => {
    const budget = makeBudget();
    const dest = makeDestination({ rootFolder: 'Presupuestos BEMEC' });
    expect(buildDrivePath(budget, dest)).toBe('Presupuestos BEMEC');
  });

  it('appends year subfolder when enabled', () => {
    const budget = makeBudget();
    const dest = makeDestination({ rootFolder: 'Root', yearSubfolder: true });
    expect(buildDrivePath(budget, dest)).toBe('Root/2026');
  });

  it('appends client subfolder when enabled', () => {
    const budget = makeBudget({ customerName: 'ACME Corp' });
    const dest = makeDestination({ rootFolder: 'Root', clientSubfolder: true });
    expect(buildDrivePath(budget, dest)).toBe('Root/ACME_Corp');
  });

  it('appends both year and client subfolders in order', () => {
    const budget = makeBudget({ customerName: 'ACME Corp' });
    const dest = makeDestination({ rootFolder: 'Root', yearSubfolder: true, clientSubfolder: true });
    expect(buildDrivePath(budget, dest)).toBe('Root/2026/ACME_Corp');
  });

  it('uses customPath when provided', () => {
    const budget = makeBudget();
    const dest = makeDestination({ customPath: 'custom/override/path' });
    expect(buildDrivePath(budget, dest)).toBe('custom/override/path');
  });
});
