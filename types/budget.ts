// Company types
export type CompanyId = 'bemec' | 'bamore';

export interface Company {
  id: CompanyId;
  name: string;
  subtitle: string;
  logo: string;
  primaryColor: string;
  secondaryColor: string;
  driveFolderId: string; // Google Drive root folder ID for repair budgets
  driveNewEquipmentFolderId?: string; // Google Drive root folder ID for new equipment budgets (optional, falls back to driveFolderId)
}

export const COMPANIES: Record<CompanyId, Company> = {
  bemec: {
    id: 'bemec',
    name: 'BEMEC',
    subtitle: 'Servicios Electromecánicos',
    logo: '/images/bemec-logo.jpg',
    primaryColor: '#1a9a8a',
    secondaryColor: '#147a6d',
    driveFolderId: '18PU28MW37lIQNJBSPRxEBIzO2EgOi5oP',
  },
  bamore: {
    id: 'bamore',
    name: 'BAMORE S.R.L.',
    subtitle: 'Motores y Reductores',
    logo: '/images/bamore-logo.jpg',
    primaryColor: '#1e3a5f',
    secondaryColor: '#2c5282',
    driveFolderId: '1PtfMbCySFAIVNI9QIw790AN_sJkcp6E6',
    driveNewEquipmentFolderId: '1TPlACqvDMS8aobGaCjKIvGhhMMzbHd57',
  },
};

// Customer types
export interface Customer {
  id: string;
  name: string;
  attention?: string;
  email?: string;
  phone?: string;
  cuit?: string;
  address?: string;
  locality?: string;
  province?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Equipment types
export type EquipmentType =
  | 'motor_electrico'
  | 'electrobomba_centrifuga'
  | 'electrobomba_sumergible'
  | 'bomba_centrifuga'
  | 'motovibrador'
  | 'reductor'
  | 'estator'
  | 'eje_balancear'
  | 'bowl_balancear'
  | 'otro';

export interface Equipment {
  type: EquipmentType;
  subtype?: string;
  power: number; // HP
  rpm?: number;
  quantity: number;
  brand?: string;
  model?: string;
  serial?: string;
  failureReason?: string; // Motivo de la falla
  notes?: string;
}

// Work items
export interface WorkItem {
  id: string;
  description: string;
  affectsCalculation: boolean;
  order: number;
}

// Bearing items
export interface BearingItem {
  id: string;
  code: string;
  description?: string;
  quantity: number;
  unitCostUSD: number;
  formula?: string;
  subtotalARS: number;
  notes?: string;
}

// Spare part items
export interface SparePartItem {
  id: string;
  description: string;
  quantity: number;
  unitPriceUSD: number;
  formula?: string;
  subtotalARS: number;
  notes?: string;
}

// Machining items
export interface MachiningItem {
  id: string;
  description: string;
  quantity: number;
  unitPriceARS: number;
  subtotalARS: number;
  notes?: string;
}

// Labor items
export interface LaborItem {
  id: string;
  description: string;
  priceARS: number;
  formula?: string;
  isManual: boolean;
  notes?: string;
}

// Tax line
export interface TaxLine {
  id: string;
  description: string;
  percentage: number;
  baseAmount: number;
  amount: number;
}

// Budget metadata
export interface BudgetMeta {
  number: string;
  date: string;
  validUntil: string;
  exchangeRate: number;
  currency: 'ARS' | 'USD';
  paymentTerms?: string;
  commercialValidity?: string;
  generalNotes?: string;
  pideNumber?: string; // Nº PIDE del equipo a presupuestar
  responsable?: string; // Quien realiza el presupuesto
}

// Repair section — one per equipment item in a multi-equipment budget
export interface RepairSection {
  id: string;
  label: string;
  equipment: Equipment;
  workItems: WorkItem[];
  bearings: BearingItem[];
  spareParts: SparePartItem[];
  machining: MachiningItem[];
  labor: LaborItem[];
}

// Complete budget
export interface Budget {
  id: string;
  companyId: CompanyId;
  meta: BudgetMeta;
  customer: Partial<Customer>;
  // Active section data (flat, for form binding)
  equipment: Equipment;
  workItems: WorkItem[];
  bearings: BearingItem[];
  spareParts: SparePartItem[];
  machining: MachiningItem[];
  labor: LaborItem[];
  // Multi-section support
  allSections: RepairSection[];
  activeSectionIdx: number;
  taxes: TaxLine[];
  subtotalLabor: number;
  subtotalBearings: number;
  subtotalSpareParts: number;
  subtotalMachining: number;
  subtotalGeneral: number;
  totalTax: number;
  totalFinal: number;
  createdAt: string;
  updatedAt: string;
}

// Pricing types
export interface LaborPricing {
  powerHP: number;
  motorNewUSD: number;
  windingARS: number;
  motorMaintenanceARS: number;
  pumpMaintenanceARS: number;
  reducerMaintenanceARS: number;
  balancingARS: number;
  oilChangeARS: number;
}

export interface BearingPricing {
  code: string;
  priceUSD: number;
}

export interface SealPricing {
  diameter: number;
  type: 'ceramic_compact' | 'ceramic_straight' | 'ceramic_conical' | 'ceramic_double' |
        'silicon_compact' | 'silicon_straight' | 'silicon_conical' | 'silicon_double';
  priceUSD: number;
}

export interface CapacitorPricing {
  microfarads: number;
  priceUSD: number;
}

export interface ShaftFillingPricing {
  diameter: number;
  bearing: string;
  priceARS: number;
  priceUSD: number;
}

export interface CoverSleevePricing {
  diameter: number;
  bearing: string;
  priceARS: number;
  priceUSD: number;
}

export interface MotorPartPricing {
  description: string;
  carcasa: string;
  priceUSD: number;
}

// Common work items for checklist
export const COMMON_WORK_ITEMS = [
  'Recepción e inspección inicial del equipo.',
  'Desarme general de la bomba centrífuga.',
  'Desarme general del motor eléctrico.',
  'Fabricación de bobinado nuevo del motor.',
  'Barnizado estator (aislación clase F).',
  'Limpieza de bobinado con solvente dieléctrico.',
  'Aplicación de barniz rojo de terminación.',
  'Reemplazo de rodamientos.',
  'Reemplazo de sello mecánico.',
  'Mecanizado de eje.',
  'Rellenado de eje.',
  'Encamisado de tapas.',
  'Cambio de capacitor.',
  'Balanceo dinámico.',
  'Cambio de aceite.',
  'Armado, verificación y ensayo final de funcionamiento.',
];

export const EQUIPMENT_TYPE_LABELS: Record<EquipmentType, string> = {
  motor_electrico: 'Motor eléctrico',
  electrobomba_centrifuga: 'Electrobomba centrífuga',
  electrobomba_sumergible: 'Electrobomba sumergible',
  bomba_centrifuga: 'Bomba centrífuga',
  motovibrador: 'Motovibrador',
  reductor: 'Reductor',
  estator: 'Estator',
  eje_balancear: 'Eje para balancear',
  bowl_balancear: 'Bowl para balancear',
  otro: 'Otro',
};

// Budget type (repair or new equipment sale)
export type BudgetType = 'reparacion' | 'equipo_nuevo';

// New Equipment types for sales
export type NewEquipmentType = 
  | 'motor_electrico'
  | 'bomba_centrifuga'
  | 'reductor_velocidad'
  | 'variador_frecuencia'
  | 'otro';

export const NEW_EQUIPMENT_TYPE_LABELS: Record<NewEquipmentType, string> = {
  motor_electrico: 'Motor Eléctrico',
  bomba_centrifuga: 'Bomba Centrífuga',
  reductor_velocidad: 'Reductor de Velocidad',
  variador_frecuencia: 'Variador de Frecuencia',
  otro: 'Otro',
};

// New Equipment item for sales budgets
export interface NewEquipmentItem {
  id: string;
  type: NewEquipmentType;
  // Common fields
  brand: string;
  model: string;
  quantity: number;
  unitPriceARS: number;
  subtotalARS: number;
  notes?: string;
  
  // Motor eléctrico / Bomba centrífuga fields
  rpm?: number;
  formaConstructiva?: string; // IEC frame, NEMA, etc.
  voltaje?: string; // 220V, 380V, 440V, etc.
  potencia?: string; // HP or kW
  
  // Reductor de velocidad fields
  relacionTransmision?: string; // e.g. "10:1", "20:1"
  
  // Variador de frecuencia fields
  voltajeEntrada?: string;
  potenciaKW?: string;
  
  // Otro - custom fields
  customDescription?: string;
  customSpecs?: string;
}

// New Equipment Budget (for sales)
export interface NewEquipmentBudget {
  id: string;
  companyId: CompanyId;
  meta: BudgetMeta;
  customer: Partial<Customer>;
  items: NewEquipmentItem[];
  subtotalItems: number;
  taxes: TaxLine[];
  totalTax: number;
  totalFinal: number;
  createdAt: string;
  updatedAt: string;
}
