import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { customers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [customer] = await db.select().from(customers).where(eq(customers.id, id));
  if (!customer) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(customer);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { name, attention, email, phone, cuit, address, locality, province, notes, companyId } =
    await request.json();

  const [customer] = await db
    .update(customers)
    .set({ name, attention, email, phone, cuit, address, locality, province, notes, companyId, updatedAt: new Date() })
    .where(eq(customers.id, id))
    .returning();

  if (!customer) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(customer);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.delete(customers).where(eq(customers.id, id));
  return NextResponse.json({ success: true });
}
