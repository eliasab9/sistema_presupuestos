import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { budgets } from '@/lib/db/schema';
import { and, eq, ne, desc } from 'drizzle-orm';
import type { Budget } from '@/types/budget';

/**
 * GET /api/budgets?companyId=bemec|bamore[&onlySent=true]
 * Returns sent budgets (status != 'draft') reshaped to the client `Budget`
 * shape used by the history page, plus the Drive file metadata.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get('companyId');
  const onlySent = searchParams.get('onlySent') !== 'false';

  if (!companyId) {
    return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
  }

  const whereClause = onlySent
    ? and(eq(budgets.companyId, companyId), ne(budgets.status, 'draft'))
    : eq(budgets.companyId, companyId);

  const rows = await db
    .select()
    .from(budgets)
    .where(whereClause)
    .orderBy(desc(budgets.sentAt));

  const result = rows.map(rowToClientBudget);
  return NextResponse.json(result);
}

/**
 * POST /api/budgets
 * Upserts a budget. Used right after a successful send so the budget plus the
 * Drive file metadata become available from any device.
 *
 * Body: client-side Budget shape, augmented with:
 *   - budgetType: 'reparacion' | 'equipo_nuevo'
 *   - driveFileId?, driveWebViewLink?, fileName?, fileFormat?: drive metadata
 *   - items?, subtotalItems?: only for equipo_nuevo
 */
export async function POST(request: Request) {
  const body = await request.json();
  const row = clientBudgetToRow(body);

  // Upsert by id (the client controls the id)
  const [saved] = await db
    .insert(budgets)
    .values(row)
    .onConflictDoUpdate({
      target: budgets.id,
      set: { ...row, updatedAt: new Date() },
    })
    .returning();

  return NextResponse.json(rowToClientBudget(saved), { status: 201 });
}

// ── helpers ──────────────────────────────────────────────────────────────────

function toNumeric(n: unknown): string {
  const v = typeof n === 'number' ? n : Number(n ?? 0);
  return (Number.isFinite(v) ? v : 0).toString();
}

function clientBudgetToRow(b: Record<string, unknown>) {
  const meta = (b.meta ?? {}) as Record<string, unknown>;
  const customer = (b.customer ?? {}) as Record<string, unknown>;

  return {
    id: b.id as string,
    companyId: b.companyId as string,
    budgetType: (b.budgetType as string) || 'reparacion',

    status: (b.status as string) || 'pending',
    sentAt: b.sentAt ? new Date(b.sentAt as string) : new Date(),

    number: (meta.number as string) || '',
    date: (meta.date as string) || new Date().toISOString().slice(0, 10),
    validUntil: (meta.validUntil as string) || '',
    exchangeRate: toNumeric(meta.exchangeRate),
    currency: ((meta.currency as string) || 'ARS'),
    paymentTerms: (meta.paymentTerms as string) ?? null,
    commercialValidity: (meta.commercialValidity as string) ?? null,
    generalNotes: (meta.generalNotes as string) ?? null,
    ivaCondition: (meta.ivaCondition as string) ?? null,
    pideNumber: (meta.pideNumber as string) ?? null,
    responsable: (meta.responsable as string) ?? null,

    customerId: typeof customer.id === 'string' && customer.id ? (customer.id as string) : null,
    customerSnapshot: customer,

    sellerId: (meta.sellerId as string) ?? null,

    subtotalLabor: toNumeric(b.subtotalLabor),
    subtotalBearings: toNumeric(b.subtotalBearings),
    subtotalSpareParts: toNumeric(b.subtotalSpareParts),
    subtotalMachining: toNumeric(b.subtotalMachining),
    subtotalGeneral: toNumeric(b.subtotalGeneral),
    subtotalItems: toNumeric(b.subtotalItems),
    totalTax: toNumeric(b.totalTax),
    totalFinal: toNumeric(b.totalFinal),

    allSections: (b.allSections as unknown[]) ?? [],
    items: (b.items as unknown[]) ?? [],
    taxes: (b.taxes as unknown[]) ?? [],

    driveFileId: (b.driveFileId as string) ?? null,
    driveWebViewLink: (b.driveWebViewLink as string) ?? null,
    fileName: (b.fileName as string) ?? null,
    fileFormat: (b.fileFormat as string) ?? null,
  };
}

/**
 * Reconstruct a client-side `Budget`-like object from a DB row so the existing
 * history page can render it with minimal changes.
 */
function rowToClientBudget(r: typeof budgets.$inferSelect): Partial<Budget> & {
  driveFileId: string | null;
  driveWebViewLink: string | null;
  fileName: string | null;
  fileFormat: string | null;
  budgetType: string;
} {
  return {
    id: r.id,
    companyId: r.companyId as Budget['companyId'],
    meta: {
      number: r.number,
      date: r.date,
      validUntil: r.validUntil,
      exchangeRate: Number(r.exchangeRate ?? 0),
      currency: (r.currency as 'ARS' | 'USD') ?? 'ARS',
      paymentTerms: r.paymentTerms ?? undefined,
      commercialValidity: r.commercialValidity ?? undefined,
      generalNotes: r.generalNotes ?? undefined,
      ivaCondition: r.ivaCondition ?? undefined,
      pideNumber: r.pideNumber ?? undefined,
      responsable: r.responsable ?? undefined,
      sellerId: r.sellerId ?? undefined,
    },
    customer: (r.customerSnapshot as Budget['customer']) ?? {},
    allSections: (r.allSections as Budget['allSections']) ?? [],
    taxes: (r.taxes as Budget['taxes']) ?? [],
    subtotalLabor: Number(r.subtotalLabor ?? 0),
    subtotalBearings: Number(r.subtotalBearings ?? 0),
    subtotalSpareParts: Number(r.subtotalSpareParts ?? 0),
    subtotalMachining: Number(r.subtotalMachining ?? 0),
    subtotalGeneral: Number(r.subtotalGeneral ?? 0),
    totalTax: Number(r.totalTax ?? 0),
    totalFinal: Number(r.totalFinal ?? 0),
    status: (r.status as Budget['status']) ?? undefined,
    sentAt: r.sentAt?.toISOString(),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    driveFileId: r.driveFileId,
    driveWebViewLink: r.driveWebViewLink,
    fileName: r.fileName,
    fileFormat: r.fileFormat,
    budgetType: r.budgetType,
  };
}
