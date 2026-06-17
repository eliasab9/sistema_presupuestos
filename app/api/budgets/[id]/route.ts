import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { budgets } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [row] = await db.select().from(budgets).where(eq(budgets.id, id));
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(row);
}

/**
 * PATCH: partial update. Currently used for status changes (pending/approved)
 * and to attach Drive metadata when those become available.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();

  const allowed: (keyof typeof budgets.$inferInsert)[] = [
    'status',
    'sentAt',
    'driveFileId',
    'driveWebViewLink',
    'fileName',
    'fileFormat',
  ];
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  for (const k of allowed) {
    if (k in body) {
      updates[k] = k === 'sentAt' && body[k] ? new Date(body[k] as string) : body[k];
    }
  }

  const [row] = await db
    .update(budgets)
    .set(updates as Partial<typeof budgets.$inferInsert>)
    .where(eq(budgets.id, id))
    .returning();

  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(row);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.delete(budgets).where(eq(budgets.id, id));
  return NextResponse.json({ success: true });
}
