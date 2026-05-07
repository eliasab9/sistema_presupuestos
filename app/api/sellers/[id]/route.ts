import { NextRequest, NextResponse } from 'next/server';
import { db, sellers } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { createLogger } from '@/lib/logger';

const log = createLogger('sellers/[id]');

/** PUT /api/sellers/:id — update a seller (name, email, phone, active, signature) */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, email, phone, active, signature, signatureFileName, signatureFileBase64 } = body;

    const [updated] = await db
      .update(sellers)
      .set({
        ...(name                !== undefined && { name }),
        ...(email               !== undefined && { email }),
        ...(phone               !== undefined && { phone }),
        ...(active              !== undefined && { active }),
        ...(signature           !== undefined && { signature }),
        ...(signatureFileName   !== undefined && { signatureFileName }),
        ...(signatureFileBase64 !== undefined && { signatureFileBase64 }),
        updatedAt: new Date(),
      })
      .where(eq(sellers.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 });
    }

    log.info('Seller updated', { id });
    return NextResponse.json(updated);
  } catch (error) {
    log.error('Failed to update seller', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
