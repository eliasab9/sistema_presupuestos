import { NextRequest, NextResponse } from 'next/server';
import { db, sellers } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { createLogger } from '@/lib/logger';

const log = createLogger('sellers');

// Default sellers to seed per company if none exist
const DEFAULT_SELLERS: { name: string; companyId: string }[] = [
  { name: 'Elías',   companyId: 'bemec' },
  { name: 'Pablo',   companyId: 'bemec' },
  { name: 'Natalia', companyId: 'bemec' },
  { name: 'Elías',   companyId: 'bamore' },
  { name: 'Pablo',   companyId: 'bamore' },
  { name: 'Natalia', companyId: 'bamore' },
];

/** GET /api/sellers?companyId=bemec — list active sellers for a company */
export async function GET(req: NextRequest) {
  const companyId = req.nextUrl.searchParams.get('companyId');
  if (!companyId) {
    return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
  }

  try {
    let rows = await db
      .select()
      .from(sellers)
      .where(eq(sellers.companyId, companyId));

    // Auto-seed if empty
    if (rows.length === 0) {
      const defaults = DEFAULT_SELLERS.filter(s => s.companyId === companyId);
      if (defaults.length > 0) {
        rows = await db
          .insert(sellers)
          .values(defaults)
          .returning();
        log.info('Seeded default sellers', { companyId, count: rows.length });
      }
    }

    return NextResponse.json(rows);
  } catch (error) {
    log.error('Failed to fetch sellers', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** POST /api/sellers — create a new seller */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { companyId, name, email, phone, signature } = body;

    if (!companyId || !name) {
      return NextResponse.json({ error: 'companyId and name are required' }, { status: 400 });
    }

    const [row] = await db
      .insert(sellers)
      .values({ companyId, name, email, phone, signature })
      .returning();

    log.info('Seller created', { id: row.id, companyId, name });
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    log.error('Failed to create seller', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
