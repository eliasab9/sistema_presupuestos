// Observation templates stored in the database (synced across all machines).
// companyId is passed in at the call site from the active company context.

export interface ObservationTemplate {
  id: string;
  name: string;
  content: string;
  companyId?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export async function getAllTemplates(companyId?: string): Promise<ObservationTemplate[]> {
  const params = new URLSearchParams();
  if (companyId) params.set('companyId', companyId);
  const res = await fetch(`/api/templates?${params}`);
  if (!res.ok) return [];
  return res.json();
}

export async function saveTemplate(
  name: string,
  content: string,
  companyId?: string
): Promise<ObservationTemplate> {
  const res = await fetch('/api/templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, content, companyId }),
  });
  return res.json();
}

export async function deleteTemplate(id: string): Promise<boolean> {
  const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' });
  return res.ok;
}
