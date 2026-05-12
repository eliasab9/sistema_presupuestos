import { NextRequest, NextResponse } from 'next/server';
import { db, equipmentTypes } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { createLogger } from '@/lib/logger';

const log = createLogger('equipment-types');

/** DELETE /api/equipment-types/[id] */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await db.delete(equipmentTypes).where(eq(equipmentTypes.id, id));
    log.info('Equipment type deleted', { id });
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error('Failed to delete equipment type', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
