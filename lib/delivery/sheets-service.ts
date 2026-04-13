/**
 * Sheets Service — integración con Google Sheets
 *
 * fetchNextBudgetNumber : obtiene el siguiente Nº de presupuesto desde la hoja
 * registerBudgetInSheets: registra una fila cuando se genera un presupuesto
 */

import type { Budget } from '@/types/budget';
import { EQUIPMENT_TYPE_LABELS } from '@/types/budget';
import type { NewEquipmentBudget, NewEquipmentItem } from '@/types/budget';

/**
 * Obtiene el siguiente número de presupuesto para una empresa.
 * Devuelve null si el servicio no está disponible (no bloquea la UI).
 */
export async function fetchNextBudgetNumber(
  companyId: string
): Promise<string | null> {
  try {
    const res = await fetch(`/api/sheets/next-number?companyId=${companyId}`);
    const data = (await res.json()) as { success: boolean; nextNumber?: string; error?: string };
    if (data.success && data.nextNumber) return data.nextNumber;
    console.warn('[Sheets] fetchNextBudgetNumber falló:', data.error);
    return null;
  } catch (e) {
    console.warn('[Sheets] fetchNextBudgetNumber error de red:', e);
    return null;
  }
}

/**
 * Construye el texto de "Mercadería Cotizada" para un presupuesto de reparación.
 */
function buildRepairMerchandise(budget: Budget): string {
  const label = EQUIPMENT_TYPE_LABELS[budget.equipment.type] ?? budget.equipment.type;
  return `Reparación de ${label}`;
}

/**
 * Construye el texto de "Mercadería Cotizada" para un presupuesto de equipo nuevo.
 */
function buildNewEquipmentMerchandise(budget: NewEquipmentBudget): string {
  if (!budget.items.length) return 'Equipo nuevo';
  return budget.items
    .map((item: NewEquipmentItem) => {
      const parts: string[] = [];
      if (item.brand) parts.push(item.brand);
      if (item.model) parts.push(item.model);
      const detail = parts.join(' ');
      const label = item.type.replace(/_/g, ' ');
      return item.quantity > 1
        ? `${item.quantity}x ${label}${detail ? ' - ' + detail : ''}`
        : `${label}${detail ? ' - ' + detail : ''}`;
    })
    .join(' / ');
}

/**
 * Registra un presupuesto de REPARACIÓN en la hoja de cálculo.
 * No lanza excepción — fallo no bloquea el workflow.
 */
export async function registerRepairBudgetInSheets(budget: Budget): Promise<void> {
  try {
    await fetch('/api/sheets/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyId:    budget.companyId,
        budgetNumber: budget.meta.number,
        clientName:   budget.customer.name ?? '',
        budgetDate:   budget.meta.date ?? '',
        pideNumber:   budget.meta.pideNumber ?? '',
        merchandise:  buildRepairMerchandise(budget),
        responsable:  budget.meta.responsable ?? 'Elías',
      }),
    });
  } catch (e) {
    console.warn('[Sheets] registerRepairBudgetInSheets error:', e);
  }
}

/**
 * Registra un presupuesto de EQUIPO NUEVO en la hoja de cálculo.
 * No lanza excepción — fallo no bloquea el workflow.
 */
export async function registerNewEquipmentBudgetInSheets(
  budget: NewEquipmentBudget
): Promise<void> {
  try {
    await fetch('/api/sheets/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyId:    budget.companyId,
        budgetNumber: budget.meta.number,
        clientName:   budget.customer.name ?? '',
        budgetDate:   budget.meta.date ?? '',
        pideNumber:   budget.meta.pideNumber ?? '',
        merchandise:  buildNewEquipmentMerchandise(budget),
        responsable:  budget.meta.responsable ?? 'Elías',
      }),
    });
  } catch (e) {
    console.warn('[Sheets] registerNewEquipmentBudgetInSheets error:', e);
  }
}
