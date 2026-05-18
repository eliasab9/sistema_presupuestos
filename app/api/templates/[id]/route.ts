import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { templates } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.delete(templates).where(eq(templates.id, id));
  return NextResponse.json({ success: true });
}
