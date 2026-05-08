import { NextRequest, NextResponse } from 'next/server';
import { db, workItems } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { createLogger } from '@/lib/logger';

const log = createLogger('work-items');

/** GET /api/work-items?companyId=bemec — list custom work items for a company */
export async function GET(req: NextRequest) {
  const companyId = req.nextUrl.searchParams.get('companyId');
  if (!companyId) {
    return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
  }

  try {
    const rows = await db
      .select()
      .from(workItems)
      .where(eq(workItems.companyId, companyId));

    return NextResponse.json(rows);
  } catch (error) {
    log.error('Failed to fetch work items', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** POST /api/work-items — create a new custom work item */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { companyId, description } = body;

    if (!companyId || !description?.trim()) {
      return NextResponse.json({ error: 'companyId and description are required' }, { status: 400 });
    }

    const [row] = await db
      .insert(workItems)
      .values({ companyId, description: description.trim() })
      .returning();

    log.info('Work item created', { id: row.id, companyId });
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    log.error('Failed to create work item', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
