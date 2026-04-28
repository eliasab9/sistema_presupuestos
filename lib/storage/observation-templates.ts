// Storage for reusable observation templates (notas frecuentes)
const STORAGE_KEY = 'bemec_observation_templates';

export interface ObservationTemplate {
  id: string;
  name: string;
  content: string;
  createdAt: string;
}

export function getAllTemplates(): ObservationTemplate[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data) as ObservationTemplate[];
  } catch {
    return [];
  }
}

export function saveTemplate(name: string, content: string): ObservationTemplate {
  const templates = getAllTemplates();
  const newTemplate: ObservationTemplate = {
    id: crypto.randomUUID(),
    name: name.trim(),
    content,
    createdAt: new Date().toISOString(),
  };
  templates.push(newTemplate);
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  }
  return newTemplate;
}

export function deleteTemplate(id: string): boolean {
  const templates = getAllTemplates();
  const filtered = templates.filter(t => t.id !== id);
  if (filtered.length === templates.length) return false;
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  }
  return true;
}
