// Storage for custom (user-defined) work items — persisted in localStorage
const STORAGE_KEY = 'bemec_custom_work_items';

export function getCustomWorkItems(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? (JSON.parse(data) as string[]) : [];
  } catch {
    return [];
  }
}

/** Saves a custom work item if it's not already in the list. */
export function saveCustomWorkItem(description: string): void {
  if (typeof window === 'undefined') return;
  const items = getCustomWorkItems();
  const trimmed = description.trim();
  if (!trimmed || items.includes(trimmed)) return;
  items.push(trimmed);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function deleteCustomWorkItem(description: string): void {
  if (typeof window === 'undefined') return;
  const items = getCustomWorkItems().filter(i => i !== description);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}
