import { NextRequest, NextResponse } from 'next/server';
import { db, workItems } from '@/lib/db';
import { and, eq, asc, isNull } from 'drizzle-orm';
import { createLogger } from '@/lib/logger';
import { WORK_ITEMS_BY_EQUIPMENT_TYPE } from '@/types/budget';
import type { EquipmentType } from '@/types/budget';

const log = createLogger('work-items');

/**
 * GET /api/work-items?companyId=bemec&equipmentType=motor_electrico
 *
 * Returns chips for a specific equipment type. If none exist yet, seeds the
 * defaults from WORK_ITEMS_BY_EQUIPMENT_TYPE and returns them.
 *
 * Falls back to returning all items for the company when no equipmentType
 * is provided (legacy usage).
 */
export async function GET(req: NextRequest) {
  const companyId = req.nextUrl.searchParams.get('companyId');
  const equipmentType = req.nextUrl.searchParams.get('equipmentType') as EquipmentType | null;

  if (!companyId) {
    return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
  }

  try {
    if (!equipmentType) {
      // Legacy: return all items for company (no equipment-type filter)
      const rows = await db
        .select()
        .from(workItems)
        .where(eq(workItems.companyId, companyId))
        .orderBy(asc(workItems.sortOrder), asc(workItems.createdAt));
      return NextResponse.json(rows);
    }

    // Fetch items for this company + equipmentType
    let rows = await db
      .select()
      .from(workItems)
      .where(and(eq(workItems.companyId, companyId), eq(workItems.equipmentType, equipmentType)))
      .orderBy(asc(workItems.sortOrder), asc(workItems.createdAt));

    // Auto-seed defaults if this type has never been configured for this company
    if (rows.length === 0) {
      const defaults = WORK_ITEMS_BY_EQUIPMENT_TYPE[equipmentType] ?? [];
      if (defaults.length > 0) {
        const inserted = await db
          .insert(workItems)
          .values(defaults.map((description, i) => ({ companyId, equipmentType, description, sortOrder: i })))
          .returning();
        rows = inserted.sort((a, b) => a.sortOrder - b.sortOrder);
        log.info('Seeded default work items', { companyId, equipmentType, count: rows.length });
      }
    }

    // Deduplicate by description (guard against concurrent seeding creating duplicates)
    const seen = new Set<string>();
    rows = rows.filter(row => {
      if (seen.has(row.description)) return false;
      seen.add(row.description);
      return true;
    });

    return NextResponse.json(rows);
  } catch (error) {
    log.error('Failed to fetch work items', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/work-items — create a work item chip for a company + equipment type
 * Body: { companyId, equipmentType, description }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { companyId, equipmentType, description } = body;

    if (!companyId || !description?.trim()) {
      return NextResponse.json({ error: 'companyId and description are required' }, { status: 400 });
    }

    // Place new items at the end
    const existing = equipmentType
      ? await db.select().from(workItems).where(and(eq(workItems.companyId, companyId), eq(workItems.equipmentType, equipmentType)))
      : await db.select().from(workItems).where(and(eq(workItems.companyId, companyId), isNull(workItems.equipmentType)));

    const [row] = await db
      .insert(workItems)
      .values({ companyId, equipmentType: equipmentType ?? null, description: description.trim(), sortOrder: existing.length })
      .returning();

    log.info('Work item created', { id: row.id, companyId, equipmentType });
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    log.error('Failed to create work item', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
