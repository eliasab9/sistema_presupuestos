import { 
  LABOR_PRICING, 
  BEARING_PRICING, 
  CAPACITOR_PRICING, 
  CERAMIC_SEAL_COMPACT_PRICE_USD,
  USD_FACTOR,
} from './data';
import type { EquipmentType, LaborItem, BearingItem, SparePartItem } from '@/types/budget';

/**
 * Find the closest labor pricing for a given HP
 */
export function findLaborPricing(powerHP: number) {
  // Find exact match or closest lower value
  const sorted = [...LABOR_PRICING].sort((a, b) => a.powerHP - b.powerHP);
  
  let closest = sorted[0];
  for (const pricing of sorted) {
    if (pricing.powerHP <= powerHP) {
      closest = pricing;
    } else {
      break;
    }
  }
  
  return closest;
}

/**
 * Calculate labor price based on equipment type and power
 */
export function calculateLaborPrice(
  equipmentType: EquipmentType,
  powerHP: number,
  workType: 'winding' | 'motor_maintenance' | 'pump_maintenance' | 'reducer_maintenance' | 'balancing' | 'oil_change'
): { priceARS: number; formula: string } {
  const pricing = findLaborPricing(powerHP);
  
  let priceARS = 0;
  let formula = '';
  
  switch (workType) {
    case 'winding':
      priceARS = pricing.windingARS;
      formula = `Bobinado según potencia ${pricing.powerHP} HP`;
      break;
    case 'motor_maintenance':
      priceARS = pricing.motorMaintenanceARS;
      formula = `Mantenimiento motor según potencia ${pricing.powerHP} HP`;
      break;
    case 'pump_maintenance':
      priceARS = pricing.pumpMaintenanceARS;
      formula = `Mantenimiento bomba según potencia ${pricing.powerHP} HP`;
      break;
    case 'reducer_maintenance':
      priceARS = pricing.reducerMaintenanceARS;
      formula = `Mantenimiento reductor según potencia ${pricing.powerHP} HP`;
      break;
    case 'balancing':
      priceARS = pricing.balancingARS;
      formula = `Balanceo según potencia ${pricing.powerHP} HP`;
      break;
    case 'oil_change':
      priceARS = pricing.oilChangeARS;
      formula = `Cambio de aceite`;
      break;
  }
  
  return { priceARS, formula };
}

/**
 * Get bearing price in USD
 */
export function getBearingPriceUSD(code: string): number {
  const bearing = BEARING_PRICING.find(b => b.code.toLowerCase() === code.toLowerCase());
  return bearing?.priceUSD || 0;
}

/**
 * Calculate bearing price in ARS
 * Formula: (priceUSD / 0.65) * exchangeRate * quantity
 */
export function calculateBearingPrice(
  code: string,
  quantity: number,
  exchangeRate: number
): { unitCostUSD: number; subtotalARS: number; formula: string } {
  const unitCostUSD = getBearingPriceUSD(code);
  const subtotalARS = Math.round((unitCostUSD / USD_FACTOR) * exchangeRate * quantity);
  const formula = `U$S ${unitCostUSD.toFixed(2)} / ${USD_FACTOR} × TC ${exchangeRate} × ${quantity}`;
  
  return { unitCostUSD, subtotalARS, formula };
}

/**
 * Calculate seal price in ARS
 * Formula: (priceUSD / 0.65) * exchangeRate * quantity
 */
export function calculateSealPrice(
  diameterMM: number,
  sealType: string,
  quantity: number,
  exchangeRate: number
): { unitPriceUSD: number; subtotalARS: number; formula: string } {
  // For now, all ceramic compact seals have the same price
  const unitPriceUSD = CERAMIC_SEAL_COMPACT_PRICE_USD;
  const subtotalARS = Math.round((unitPriceUSD / USD_FACTOR) * exchangeRate * quantity);
  const formula = `U$S ${unitPriceUSD.toFixed(2)} / ${USD_FACTOR} × TC ${exchangeRate} × ${quantity}`;
  
  return { unitPriceUSD, subtotalARS, formula };
}

/**
 * Calculate capacitor price in ARS
 */
export function calculateCapacitorPrice(
  microfarads: number,
  quantity: number,
  exchangeRate: number
): { unitPriceUSD: number; subtotalARS: number; formula: string } {
  const capacitor = CAPACITOR_PRICING.find(c => c.microfarads === microfarads);
  const unitPriceUSD = capacitor?.priceUSD || 10; // Default to $10 USD
  const subtotalARS = Math.round((unitPriceUSD / USD_FACTOR) * exchangeRate * quantity);
  const formula = `U$S ${unitPriceUSD.toFixed(2)} / ${USD_FACTOR} × TC ${exchangeRate} × ${quantity}`;
  
  return { unitPriceUSD, subtotalARS, formula };
}

/**
 * Format currency in ARS
 */
export function formatARS(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format currency in USD
 */
export function formatUSD(amount: number): string {
  return `U$S ${amount.toFixed(2)}`;
}

/**
 * Calculate subtotals for a budget
 */
export function calculateSubtotals(
  labor: LaborItem[],
  bearings: BearingItem[],
  spareParts: SparePartItem[],
  machining: { subtotalARS: number }[]
): {
  subtotalLabor: number;
  subtotalBearings: number;
  subtotalSpareParts: number;
  subtotalMachining: number;
  subtotalGeneral: number;
} {
  const subtotalLabor = labor.reduce((sum, item) => sum + item.priceARS, 0);
  const subtotalBearings = bearings.reduce((sum, item) => sum + item.subtotalARS, 0);
  const subtotalSpareParts = spareParts.reduce((sum, item) => sum + item.subtotalARS, 0);
  const subtotalMachining = machining.reduce((sum, item) => sum + item.subtotalARS, 0);
  const subtotalGeneral = subtotalLabor + subtotalBearings + subtotalSpareParts + subtotalMachining;
  
  return {
    subtotalLabor,
    subtotalBearings,
    subtotalSpareParts,
    subtotalMachining,
    subtotalGeneral,
  };
}

/**
 * Generate suggested labor items based on work items and equipment
 */
export function generateSuggestedLabor(
  workItems: { description: string; affectsCalculation: boolean }[],
  equipmentType: EquipmentType,
  powerHP: number
): LaborItem[] {
  const labor: LaborItem[] = [];
  const addedTypes = new Set<string>();
  
  for (const item of workItems) {
    if (!item.affectsCalculation) continue;
    
    const desc = item.description.toLowerCase();
    
    // Detect winding/bobinado work - only add once
    if ((desc.includes('bobinado') || desc.includes('fabricación de bobinado')) && !addedTypes.has('winding')) {
      const { priceARS, formula } = calculateLaborPrice(equipmentType, powerHP, 'winding');
      labor.push({
        id: crypto.randomUUID(),
        description: `Fabricación de bobinado — motor ${powerHP} HP`,
        priceARS,
        formula,
        isManual: false,
      });
      addedTypes.add('winding');
    }
    
    // Detect balancing work
    if (desc.includes('balanceo') && !addedTypes.has('balancing')) {
      const { priceARS, formula } = calculateLaborPrice(equipmentType, powerHP, 'balancing');
      labor.push({
        id: crypto.randomUUID(),
        description: 'Balanceo dinámico',
        priceARS,
        formula,
        isManual: false,
      });
      addedTypes.add('balancing');
    }
    
    // Detect oil change work
    if (desc.includes('cambio de aceite') && !addedTypes.has('oil_change')) {
      const { priceARS, formula } = calculateLaborPrice(equipmentType, powerHP, 'oil_change');
      labor.push({
        id: crypto.randomUUID(),
        description: 'Cambio de aceite',
        priceARS,
        formula,
        isManual: false,
      });
      addedTypes.add('oil_change');
    }
    
    // Detect motor maintenance (desarme/armado motor)
    if ((desc.includes('desarme') && desc.includes('motor')) || 
        (desc.includes('armado') && desc.includes('motor'))) {
      if (!addedTypes.has('motor_maintenance')) {
        const { priceARS, formula } = calculateLaborPrice(equipmentType, powerHP, 'motor_maintenance');
        labor.push({
          id: crypto.randomUUID(),
          description: `Mantenimiento motor — ${powerHP} HP`,
          priceARS,
          formula,
          isManual: false,
        });
        addedTypes.add('motor_maintenance');
      }
    }
    
    // Detect pump maintenance (desarme/armado bomba)
    if ((desc.includes('desarme') && desc.includes('bomba')) || 
        (desc.includes('armado') && desc.includes('bomba'))) {
      if (!addedTypes.has('pump_maintenance')) {
        const { priceARS, formula } = calculateLaborPrice(equipmentType, powerHP, 'pump_maintenance');
        labor.push({
          id: crypto.randomUUID(),
          description: `Mantenimiento bomba — ${powerHP} HP`,
          priceARS,
          formula,
          isManual: false,
        });
        addedTypes.add('pump_maintenance');
      }
    }
  }
  
  return labor;
}

/**
 * Generate next budget number
 */
export function generateBudgetNumber(lastNumber?: string): string {
  if (!lastNumber) {
    return '7143'; // Starting from the example
  }
  
  const num = parseInt(lastNumber, 10);
  if (isNaN(num)) {
    return '7143';
  }
  
  return String(num + 1);
}

/**
 * Calculate date + days
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Format date to DD/MM/YYYY
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
