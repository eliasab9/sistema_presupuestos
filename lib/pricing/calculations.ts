import { 
  LABOR_PRICING, 
  BEARING_PRICING, 
  CAPACITOR_PRICING, 
  CERAMIC_SEAL_COMPACT_PRICE_USD,
  USD_FACTOR,
} from './data';
import type { EquipmentType, LaborItem, LaborWorkType, BearingItem, SparePartItem } from '@/types/budget';

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
  equipmentType: EquipmentType | '',
  powerHP: number,
  workType: LaborWorkType
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

/** Minúsculas y sin acentos, para que el matching no dependa de la tilde. */
function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * ¿Qué mano de obra tarifada implica este trabajo?
 *
 * El matching es por intención, no por palabra suelta. Antes alcanzaba con que
 * la descripción dijera "bobinado" para cobrar una fabricación completa: eso
 * hacía que "Limpieza de bobinado con solvente" o "Barnizado estator" cotizaran
 * como bobinado nuevo. La fabricación sólo entra si el trabajo la nombra.
 */
export function detectLaborType(description: string): LaborWorkType | null {
  const desc = normalize(description);

  if (/fabricacion de bobinado|fabricar bobinado|bobinado nuevo|rebobinad/.test(desc)) {
    return 'winding';
  }
  if (desc.includes('balanceo')) return 'balancing';
  if (desc.includes('cambio de aceite')) return 'oil_change';

  // Desarme/armado: el mantenimiento se cobra según el equipo que se abre.
  const isDisassembly = desc.includes('desarme') || desc.includes('armado');
  if (isDisassembly) {
    if (desc.includes('reductor')) return 'reducer_maintenance';
    if (desc.includes('bomba')) return 'pump_maintenance';
    if (desc.includes('motor')) return 'motor_maintenance';
  }

  return null;
}

const LABOR_TYPE_DESCRIPTIONS: Record<LaborWorkType, (powerHP: number) => string> = {
  winding:             (hp) => `Fabricación de bobinado — motor ${hp} HP`,
  motor_maintenance:   (hp) => `Mantenimiento motor — ${hp} HP`,
  pump_maintenance:    (hp) => `Mantenimiento bomba — ${hp} HP`,
  reducer_maintenance: (hp) => `Mantenimiento reductor — ${hp} HP`,
  balancing:           ()   => 'Balanceo dinámico',
  oil_change:          ()   => 'Cambio de aceite',
};

/**
 * Generate suggested labor items based on work items and equipment
 */
export function generateSuggestedLabor(
  workItems: { description: string; affectsCalculation: boolean }[],
  equipmentType: EquipmentType | '',
  powerHP: number
): LaborItem[] {
  const labor: LaborItem[] = [];
  const addedTypes = new Set<LaborWorkType>();

  for (const item of workItems) {
    if (!item.affectsCalculation) continue;

    const laborType = detectLaborType(item.description);
    if (!laborType || addedTypes.has(laborType)) continue;
    addedTypes.add(laborType);

    const { priceARS, formula } = calculateLaborPrice(equipmentType, powerHP, laborType);
    labor.push({
      id: crypto.randomUUID(),
      description: LABOR_TYPE_DESCRIPTIONS[laborType](powerHP),
      priceARS,
      formula,
      isManual: false,
      laborType,
    });
  }

  return labor;
}

/**
 * Funde las sugerencias nuevas con la mano de obra que ya está cargada.
 *
 * Cada sugerido se identifica por `laborType`, no por su posición ni por el
 * flag `isManual`. Antes el recálculo concatenaba sugerencias + ítems manuales,
 * y como editar un precio marcaba el ítem como manual, el mismo trabajo quedaba
 * dos veces y el total se inflaba.
 *
 * Reglas: se conservan los ítems manuales, los precios retocados a mano no se
 * pisan, y un sugerido cuyo trabajo ya no está seleccionado desaparece.
 */
export function mergeSuggestedLabor(
  existing: LaborItem[],
  suggestions: LaborItem[]
): LaborItem[] {
  const previousByType = new Map<LaborWorkType, LaborItem>();
  for (const item of existing) {
    if (item.isManual) continue;
    // Los presupuestos guardados antes de que existiera `laborType` sólo tienen
    // la descripción. Se deduce de ahí para no duplicar el ítem al recalcular,
    // y se respeta el precio con el que se cotizaron.
    const type = item.laborType ?? inferLaborTypeFromLabel(item.description);
    if (!type) continue;
    previousByType.set(type, item.laborType ? item : { ...item, priceOverridden: true });
  }

  const merged = suggestions.map((suggestion) => {
    const previous = previousByType.get(suggestion.laborType!);
    if (!previous) return suggestion;
    return {
      ...suggestion,
      id: previous.id,
      description: previous.description,
      ...(previous.priceOverridden
        ? { priceARS: previous.priceARS, priceOverridden: true }
        : {}),
    };
  });

  return [...merged, ...existing.filter((item) => item.isManual)];
}

/** Deduce el tipo desde la descripción que generó una versión anterior. */
function inferLaborTypeFromLabel(description: string): LaborWorkType | null {
  const desc = normalize(description);
  if (desc.startsWith('fabricacion de bobinado')) return 'winding';
  if (desc.startsWith('mantenimiento motor')) return 'motor_maintenance';
  if (desc.startsWith('mantenimiento bomba')) return 'pump_maintenance';
  if (desc.startsWith('mantenimiento reductor')) return 'reducer_maintenance';
  if (desc.startsWith('balanceo dinamico')) return 'balancing';
  if (desc.startsWith('cambio de aceite')) return 'oil_change';
  return null;
}

// ── Discriminación de IVA ────────────────────────────────────────────────────
// La fabricación de bobinado tributa al 10,5 % (trabajo sobre bien mueble);
// materiales, repuestos, mecanizado y el resto de la mano de obra, al 21 %.

export const IVA_RATE_WINDING = 0.105;
export const IVA_RATE_GENERAL = 0.21;

export interface IvaBreakdown {
  /** Neto que tributa al 10,5 % (fabricación de bobinado). */
  baseWinding: number;
  /** Neto que tributa al 21 % (materiales y mantenimiento). */
  baseGeneral: number;
  ivaWinding: number;
  ivaGeneral: number;
  net: number;
  ivaTotal: number;
  gross: number;
}

/** ¿Este ítem de mano de obra es fabricación de bobinado? */
export function isWindingLabor(item: LaborItem): boolean {
  const type = item.laborType ?? inferLaborTypeFromLabel(item.description);
  return type === 'winding';
}

/**
 * Reparte el neto del presupuesto entre las dos alícuotas de IVA.
 * Recorre todas las secciones: el desglose es del presupuesto completo.
 */
export function calculateIvaBreakdown(
  sections: { labor: LaborItem[]; bearings: BearingItem[]; spareParts: SparePartItem[]; machining: { subtotalARS: number }[] }[]
): IvaBreakdown {
  let baseWinding = 0;
  let baseGeneral = 0;

  for (const section of sections) {
    for (const item of section.labor) {
      if (isWindingLabor(item)) baseWinding += item.priceARS;
      else baseGeneral += item.priceARS;
    }
    baseGeneral += section.bearings.reduce((sum, i) => sum + i.subtotalARS, 0);
    baseGeneral += section.spareParts.reduce((sum, i) => sum + i.subtotalARS, 0);
    baseGeneral += section.machining.reduce((sum, i) => sum + i.subtotalARS, 0);
  }

  const ivaWinding = Math.round(baseWinding * IVA_RATE_WINDING);
  const ivaGeneral = Math.round(baseGeneral * IVA_RATE_GENERAL);
  const net = baseWinding + baseGeneral;

  return {
    baseWinding,
    baseGeneral,
    ivaWinding,
    ivaGeneral,
    net,
    ivaTotal: ivaWinding + ivaGeneral,
    gross: net + ivaWinding + ivaGeneral,
  };
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
