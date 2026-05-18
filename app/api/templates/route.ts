import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { templates } from '@/lib/db/schema';
import { eq, or, isNull, asc } from 'drizzle-orm';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get('companyId');

  const rows = await db
    .select()
    .from(templates)
    .where(
      companyId
        ? or(eq(templates.companyId, companyId), isNull(templates.companyId))
        : undefined
    )
    .orderBy(asc(templates.name));

  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const { name, content, companyId } = await request.json();

  const [template] = await db
    .insert(templates)
    .values({ name, content, companyId })
    .returning();

  return NextResponse.json(template, { status: 201 });
}
