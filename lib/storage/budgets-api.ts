// Client-side helpers for the /api/budgets endpoints. Used in tandem with the
// localStorage helpers in `./budgets.ts`: localStorage is the local cache, the
// API is the source of truth shared across devices.

import type { Budget, BudgetStatus, CompanyId } from '@/types/budget';

/** Shape returned by GET /api/budgets — Budget plus Drive file metadata. */
export type SentBudgetDTO = Budget & {
  driveFileId: string | null;
  driveWebViewLink: string | null;
  fileName: string | null;
  fileFormat: 'pdf' | 'docx' | null;
  budgetType: 'reparacion' | 'equipo_nuevo';
};

export async function fetchSentBudgets(companyId: CompanyId): Promise<SentBudgetDTO[]> {
  const res = await fetch(`/api/budgets?companyId=${encodeURIComponent(companyId)}&onlySent=true`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`fetchSentBudgets ${res.status}`);
  return res.json();
}

/**
 * Fetch a single budget by id. Returns the raw DB row (snake_case column names
 * mapped by Drizzle to camelCase), which carries everything needed to rehydrate
 * either a reparación or equipo_nuevo budget for editing.
 */
export async function fetchBudgetById(id: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(`/api/budgets/${encodeURIComponent(id)}`, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`fetchBudgetById ${res.status}`);
  return res.json();
}

interface SyncOptions {
  budgetType: 'reparacion' | 'equipo_nuevo';
  status?: BudgetStatus;
  sentAt?: string;
  driveFileId?: string;
  driveWebViewLink?: string;
  fileName?: string;
  fileFormat?: 'pdf' | 'docx';
}

/**
 * Upsert a sent budget into the DB. Fire-and-forget friendly — callers can
 * await but the UI should not block on this.
 */
export async function syncSentBudgetToDb(
  budget: Budget | Record<string, unknown>,
  opts: SyncOptions
): Promise<void> {
  const payload = {
    ...budget,
    budgetType: opts.budgetType,
    status: opts.status ?? 'pending',
    sentAt: opts.sentAt ?? new Date().toISOString(),
    driveFileId: opts.driveFileId,
    driveWebViewLink: opts.driveWebViewLink,
    fileName: opts.fileName,
    fileFormat: opts.fileFormat,
  };
  const res = await fetch('/api/budgets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`syncSentBudgetToDb ${res.status}`);
}

export async function updateBudgetStatusInDb(id: string, status: BudgetStatus): Promise<void> {
  const res = await fetch(`/api/budgets/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error(`updateBudgetStatusInDb ${res.status}`);
}

export async function deleteBudgetFromDb(id: string): Promise<void> {
  const res = await fetch(`/api/budgets/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`deleteBudgetFromDb ${res.status}`);
}
