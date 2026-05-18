import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { customers } from '@/lib/db/schema';
import { eq, or, isNull, asc } from 'drizzle-orm';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get('companyId');
  const q = searchParams.get('q')?.toLowerCase();

  const rows = await db
    .select()
    .from(customers)
    .where(
      companyId
        ? or(eq(customers.companyId, companyId), isNull(customers.companyId))
        : undefined
    )
    .orderBy(asc(customers.name));

  const results = q
    ? rows.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.cuit?.toLowerCase().includes(q) ||
          c.attention?.toLowerCase().includes(q)
      )
    : rows;

  return NextResponse.json(results);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, attention, email, phone, cuit, address, locality, province, notes, companyId } =
    body;

  const [customer] = await db
    .insert(customers)
    .values({ name, attention, email, phone, cuit, address, locality, province, notes, companyId })
    .returning();

  return NextResponse.json(customer, { status: 201 });
}
