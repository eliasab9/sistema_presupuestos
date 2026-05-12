import { NextRequest, NextResponse } from 'next/server';
import { db, equipmentTypes } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { createLogger } from '@/lib/logger';

const log = createLogger('equipment-types');

/** GET /api/equipment-types?companyId=bemec&budgetType=reparacion */
export async function GET(req: NextRequest) {
  const companyId  = req.nextUrl.searchParams.get('companyId');
  const budgetType = req.nextUrl.searchParams.get('budgetType');
  if (!companyId || !budgetType) {
    return NextResponse.json({ error: 'companyId and budgetType are required' }, { status: 400 });
  }

  try {
    const rows = await db
      .select()
      .from(equipmentTypes)
      .where(and(eq(equipmentTypes.companyId, companyId), eq(equipmentTypes.budgetType, budgetType)));
    return NextResponse.json(rows);
  } catch (error) {
    log.error('Failed to fetch equipment types', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** POST /api/equipment-types — create a custom equipment type */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { companyId, budgetType, label } = body;

    if (!companyId || !budgetType || !label?.trim()) {
      return NextResponse.json(
        { error: 'companyId, budgetType, and label are required' },
        { status: 400 }
      );
    }

    const [row] = await db
      .insert(equipmentTypes)
      .values({ companyId, budgetType, label: label.trim() })
      .returning();

    log.info('Equipment type created', { id: row.id, companyId, budgetType });
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    log.error('Failed to create equipment type', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
