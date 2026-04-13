import type { Budget } from '@/types/budget';

const STORAGE_KEY = 'bemec_budgets';
const DRAFT_KEY = 'bemec_budget_draft';
const LAST_NUMBER_KEY = 'bemec_last_budget_number';

/**
 * Get the last used budget number
 */
export function getLastBudgetNumber(): string {
  if (typeof window === 'undefined') return '7142';
  
  const lastNumber = localStorage.getItem(LAST_NUMBER_KEY);
  return lastNumber || '7142';
}

/**
 * Set the last used budget number
 */
export function setLastBudgetNumber(number: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LAST_NUMBER_KEY, number);
  }
}

/**
 * Save current draft
 */
export function saveDraft(budget: Partial<Budget>): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
      ...budget,
      updatedAt: new Date().toISOString(),
    }));
  }
}

/**
 * Load draft
 */
export function loadDraft(): Partial<Budget> | null {
  if (typeof window === 'undefined') return null;
  
  const data = localStorage.getItem(DRAFT_KEY);
  if (!data) return null;
  
  try {
    return JSON.parse(data) as Partial<Budget>;
  } catch {
    return null;
  }
}

/**
 * Clear draft
 */
export function clearDraft(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(DRAFT_KEY);
  }
}

/**
 * Get all saved budgets
 */
export function getAllBudgets(): Budget[] {
  if (typeof window === 'undefined') return [];
  
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return [];
  
  try {
    return JSON.parse(data) as Budget[];
  } catch {
    return [];
  }
}

/**
 * Save a budget
 */
export function saveBudget(budget: Budget): void {
  const budgets = getAllBudgets();
  const index = budgets.findIndex(b => b.id === budget.id);
  
  if (index === -1) {
    budgets.push(budget);
  } else {
    budgets[index] = budget;
  }
  
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(budgets));
    setLastBudgetNumber(budget.meta.number);
  }
}

/**
 * Get budget by ID
 */
export function getBudgetById(id: string): Budget | undefined {
  const budgets = getAllBudgets();
  return budgets.find(b => b.id === id);
}

/**
 * Delete a budget
 */
export function deleteBudget(id: string): boolean {
  const budgets = getAllBudgets();
  const filtered = budgets.filter(b => b.id !== id);
  
  if (filtered.length === budgets.length) return false;
  
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  }
  
  return true;
}
