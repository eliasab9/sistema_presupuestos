import type { Customer, CompanyId } from '@/types/budget';

// Migration flag — prevents re-migrating existing localStorage data on every load
const LS_MIGRATED_KEY = 'bemec_customers_migrated_v1';
const LS_LEGACY_KEY = 'bemec_customers';

// UUIDs of the original mock customers that should NOT be migrated
const MOCK_IDS = new Set(['1', '2', '3']);

async function migrateFromLocalStorage(companyId?: CompanyId): Promise<void> {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem(LS_MIGRATED_KEY)) return;

  localStorage.setItem(LS_MIGRATED_KEY, '1'); // mark before async ops to avoid races

  const raw = localStorage.getItem(LS_LEGACY_KEY);
  if (!raw) return;

  try {
    const all: Customer[] = JSON.parse(raw);
    const real = all.filter((c) => !MOCK_IDS.has(c.id));
    await Promise.all(
      real.map((c) =>
        fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...c, companyId: c.companyId ?? companyId ?? null }),
        })
      )
    );
  } catch {
    // Non-fatal: migration best-effort only
  }
}

export async function getAllCustomers(companyId?: CompanyId): Promise<Customer[]> {
  const params = new URLSearchParams();
  if (companyId) params.set('companyId', companyId);

  const res = await fetch(`/api/customers?${params}`);
  if (!res.ok) return [];
  const data: Customer[] = await res.json();

  // One-time migration: if DB is empty for this company and localStorage has real customers
  if (data.length === 0) {
    await migrateFromLocalStorage(companyId);
    const res2 = await fetch(`/api/customers?${params}`);
    if (res2.ok) return res2.json();
  }

  return data;
}

export async function searchCustomers(query: string, companyId?: CompanyId): Promise<Customer[]> {
  if (!query.trim()) return getAllCustomers(companyId);
  const params = new URLSearchParams();
  if (companyId) params.set('companyId', companyId);
  params.set('q', query);
  const res = await fetch(`/api/customers?${params}`);
  if (!res.ok) return [];
  return res.json();
}

export async function saveCustomer(
  customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Customer> {
  const res = await fetch('/api/customers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(customer),
  });
  return res.json();
}

export async function updateCustomer(
  id: string,
  updates: Partial<Customer>
): Promise<Customer | undefined> {
  const res = await fetch(`/api/customers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) return undefined;
  return res.json();
}

export async function deleteCustomer(id: string): Promise<boolean> {
  const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
  return res.ok;
}

export async function getCustomerById(id: string): Promise<Customer | undefined> {
  const res = await fetch(`/api/customers/${id}`);
  if (!res.ok) return undefined;
  return res.json();
}
