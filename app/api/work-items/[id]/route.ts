import { NextRequest, NextResponse } from 'next/server';
import { db, workItems } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { createLogger } from '@/lib/logger';

const log = createLogger('work-items');

/** DELETE /api/work-items/[id] — delete a custom work item */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await db.delete(workItems).where(eq(workItems.id, id));
    log.info('Work item deleted', { id });
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error('Failed to delete work item', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
