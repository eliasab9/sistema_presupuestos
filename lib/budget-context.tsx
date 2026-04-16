'use client';

import { createContext, useContext, useReducer, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type {
  Budget,
  BudgetMeta,
  Customer,
  Equipment,
  WorkItem,
  BearingItem,
  SparePartItem,
  MachiningItem,
  LaborItem,
  TaxLine,
  EquipmentType,
  CompanyId,
  RepairSection,
} from '@/types/budget';
import { generateBudgetNumber, formatDate, addDays, calculateSubtotals } from '@/lib/pricing/calculations';
import { getLastBudgetNumber, saveDraft, loadDraft } from '@/lib/storage/budgets';
import { fetchNextBudgetNumber } from '@/lib/delivery/sheets-service';

// Helper: save active flat arrays into allSections[activeSectionIdx]
function syncActiveSection(state: Budget): RepairSection[] {
  return state.allSections.map((s, i) =>
    i === state.activeSectionIdx
      ? { ...s, equipment: state.equipment, workItems: state.workItems, bearings: state.bearings, spareParts: state.spareParts, machining: state.machining, labor: state.labor }
      : s
  );
}

const DEFAULT_EQUIPMENT: Equipment = { type: 'electrobomba_centrifuga', power: 1, quantity: 1 };

function makeSection(label: string, equipment?: Equipment): RepairSection {
  return { id: crypto.randomUUID(), label, equipment: equipment ?? { ...DEFAULT_EQUIPMENT }, workItems: [], bearings: [], spareParts: [], machining: [], labor: [] };
}

// Initial empty budget state
function createInitialBudget(): Budget {
  const today = new Date();
  const lastNumber = typeof window !== 'undefined' ? getLastBudgetNumber() : '7142';
  const initialEquipment: Equipment = { ...DEFAULT_EQUIPMENT };
  const initialSection = makeSection('Equipo 1', initialEquipment);

  return {
    id: crypto.randomUUID(),
    companyId: 'bemec' as CompanyId,
    meta: {
      number: generateBudgetNumber(lastNumber),
      date: formatDate(today),
      validUntil: formatDate(addDays(today, 7)),
      exchangeRate: 1400,
      currency: 'ARS',
      paymentTerms: 'A convenir',
      commercialValidity: '7 días hábiles',
      generalNotes: '',
      responsable: 'Elías',
    },
    customer: {},
    equipment: initialEquipment,
    workItems: [],
    bearings: [],
    spareParts: [],
    machining: [],
    labor: [],
    allSections: [initialSection],
    activeSectionIdx: 0,
    taxes: [],
    subtotalLabor: 0,
    subtotalBearings: 0,
    subtotalSpareParts: 0,
    subtotalMachining: 0,
    subtotalGeneral: 0,
    totalTax: 0,
    totalFinal: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// Action types
type BudgetAction =
  | { type: 'SET_COMPANY'; payload: CompanyId }
  | { type: 'SET_META'; payload: Partial<BudgetMeta> }
  | { type: 'SET_CUSTOMER'; payload: Partial<Customer> }
  | { type: 'SET_EQUIPMENT'; payload: Partial<Equipment> }
  | { type: 'ADD_WORK_ITEM'; payload: WorkItem }
  | { type: 'UPDATE_WORK_ITEM'; payload: { id: string; updates: Partial<WorkItem> } }
  | { type: 'REMOVE_WORK_ITEM'; payload: string }
  | { type: 'REORDER_WORK_ITEMS'; payload: WorkItem[] }
  | { type: 'ADD_BEARING'; payload: BearingItem }
  | { type: 'UPDATE_BEARING'; payload: { id: string; updates: Partial<BearingItem> } }
  | { type: 'REMOVE_BEARING'; payload: string }
  | { type: 'ADD_SPARE_PART'; payload: SparePartItem }
  | { type: 'UPDATE_SPARE_PART'; payload: { id: string; updates: Partial<SparePartItem> } }
  | { type: 'REMOVE_SPARE_PART'; payload: string }
  | { type: 'ADD_MACHINING'; payload: MachiningItem }
  | { type: 'UPDATE_MACHINING'; payload: { id: string; updates: Partial<MachiningItem> } }
  | { type: 'REMOVE_MACHINING'; payload: string }
  | { type: 'ADD_LABOR'; payload: LaborItem }
  | { type: 'UPDATE_LABOR'; payload: { id: string; updates: Partial<LaborItem> } }
  | { type: 'REMOVE_LABOR'; payload: string }
  | { type: 'SET_LABOR'; payload: LaborItem[] }
  | { type: 'RECALCULATE_TOTALS' }
  | { type: 'SET_SUBTOTALS'; payload: { subtotalLabor: number; subtotalBearings: number; subtotalSpareParts: number; subtotalMachining: number; subtotalGeneral: number } }
  | { type: 'SET_BUDGET'; payload: Budget }
  | { type: 'RESET' }
  // Section management
  | { type: 'ADD_SECTION' }
  | { type: 'SWITCH_SECTION'; payload: number }
  | { type: 'REMOVE_SECTION'; payload: number }
  | { type: 'UPDATE_SECTION_LABEL'; payload: { idx: number; label: string } };

// Reducer
function budgetReducer(state: Budget, action: BudgetAction): Budget {
  switch (action.type) {
    case 'SET_COMPANY':
      return {
        ...state,
        companyId: action.payload,
        updatedAt: new Date().toISOString(),
      };
    
    case 'SET_META':
      return {
        ...state,
        meta: { ...state.meta, ...action.payload },
        updatedAt: new Date().toISOString(),
      };
    
    case 'SET_CUSTOMER':
      return {
        ...state,
        customer: { ...state.customer, ...action.payload },
        updatedAt: new Date().toISOString(),
      };
    
    case 'SET_EQUIPMENT':
      return {
        ...state,
        equipment: { ...state.equipment, ...action.payload },
        updatedAt: new Date().toISOString(),
      };
    
    case 'ADD_WORK_ITEM':
      return {
        ...state,
        workItems: [...state.workItems, action.payload],
        updatedAt: new Date().toISOString(),
      };
    
    case 'UPDATE_WORK_ITEM':
      return {
        ...state,
        workItems: state.workItems.map(item =>
          item.id === action.payload.id
            ? { ...item, ...action.payload.updates }
            : item
        ),
        updatedAt: new Date().toISOString(),
      };
    
    case 'REMOVE_WORK_ITEM':
      return {
        ...state,
        workItems: state.workItems.filter(item => item.id !== action.payload),
        updatedAt: new Date().toISOString(),
      };
    
    case 'REORDER_WORK_ITEMS':
      return {
        ...state,
        workItems: action.payload,
        updatedAt: new Date().toISOString(),
      };
    
    case 'ADD_BEARING':
      return {
        ...state,
        bearings: [...state.bearings, action.payload],
        updatedAt: new Date().toISOString(),
      };
    
    case 'UPDATE_BEARING':
      return {
        ...state,
        bearings: state.bearings.map(item =>
          item.id === action.payload.id
            ? { ...item, ...action.payload.updates }
            : item
        ),
        updatedAt: new Date().toISOString(),
      };
    
    case 'REMOVE_BEARING':
      return {
        ...state,
        bearings: state.bearings.filter(item => item.id !== action.payload),
        updatedAt: new Date().toISOString(),
      };
    
    case 'ADD_SPARE_PART':
      return {
        ...state,
        spareParts: [...state.spareParts, action.payload],
        updatedAt: new Date().toISOString(),
      };
    
    case 'UPDATE_SPARE_PART':
      return {
        ...state,
        spareParts: state.spareParts.map(item =>
          item.id === action.payload.id
            ? { ...item, ...action.payload.updates }
            : item
        ),
        updatedAt: new Date().toISOString(),
      };
    
    case 'REMOVE_SPARE_PART':
      return {
        ...state,
        spareParts: state.spareParts.filter(item => item.id !== action.payload),
        updatedAt: new Date().toISOString(),
      };
    
    case 'ADD_MACHINING':
      return {
        ...state,
        machining: [...state.machining, action.payload],
        updatedAt: new Date().toISOString(),
      };
    
    case 'UPDATE_MACHINING':
      return {
        ...state,
        machining: state.machining.map(item =>
          item.id === action.payload.id
            ? { ...item, ...action.payload.updates }
            : item
        ),
        updatedAt: new Date().toISOString(),
      };
    
    case 'REMOVE_MACHINING':
      return {
        ...state,
        machining: state.machining.filter(item => item.id !== action.payload),
        updatedAt: new Date().toISOString(),
      };
    
    case 'ADD_LABOR':
      return {
        ...state,
        labor: [...state.labor, action.payload],
        updatedAt: new Date().toISOString(),
      };
    
    case 'UPDATE_LABOR':
      return {
        ...state,
        labor: state.labor.map(item =>
          item.id === action.payload.id
            ? { ...item, ...action.payload.updates }
            : item
        ),
        updatedAt: new Date().toISOString(),
      };
    
    case 'REMOVE_LABOR':
      return {
        ...state,
        labor: state.labor.filter(item => item.id !== action.payload),
        updatedAt: new Date().toISOString(),
      };
    
    case 'SET_LABOR':
      return {
        ...state,
        labor: action.payload,
        updatedAt: new Date().toISOString(),
      };
    
    case 'SET_SUBTOTALS':
      return {
        ...state,
        ...action.payload,
        totalFinal: action.payload.subtotalGeneral,
        updatedAt: new Date().toISOString(),
      };
    
    case 'SET_BUDGET': {
      const incoming = action.payload;
      // Migrate old budgets that don't have sections
      if (!incoming.allSections || incoming.allSections.length === 0) {
        const migrated = makeSection('Equipo 1', incoming.equipment);
        migrated.workItems = incoming.workItems ?? [];
        migrated.bearings = incoming.bearings ?? [];
        migrated.spareParts = incoming.spareParts ?? [];
        migrated.machining = incoming.machining ?? [];
        migrated.labor = incoming.labor ?? [];
        return { ...incoming, allSections: [migrated], activeSectionIdx: 0 };
      }
      return incoming;
    }

    case 'RESET':
      return createInitialBudget();

    case 'ADD_SECTION': {
      const savedSections = syncActiveSection(state);
      const newSection = makeSection(`Equipo ${savedSections.length + 1}`);
      return {
        ...state,
        equipment: { ...DEFAULT_EQUIPMENT },
        workItems: [],
        bearings: [],
        spareParts: [],
        machining: [],
        labor: [],
        subtotalLabor: 0,
        subtotalBearings: 0,
        subtotalSpareParts: 0,
        subtotalMachining: 0,
        subtotalGeneral: 0,
        allSections: [...savedSections, newSection],
        activeSectionIdx: savedSections.length,
        updatedAt: new Date().toISOString(),
      };
    }

    case 'SWITCH_SECTION': {
      const newIdx = action.payload;
      if (newIdx === state.activeSectionIdx) return state;
      const savedSections = syncActiveSection(state);
      const target = savedSections[newIdx];
      return {
        ...state,
        equipment: target.equipment,
        workItems: target.workItems,
        bearings: target.bearings,
        spareParts: target.spareParts,
        machining: target.machining,
        labor: target.labor,
        allSections: savedSections,
        activeSectionIdx: newIdx,
        updatedAt: new Date().toISOString(),
      };
    }

    case 'REMOVE_SECTION': {
      if (state.allSections.length <= 1) return state;
      const idxToRemove = action.payload;
      const savedSections = syncActiveSection(state);
      const newSections = savedSections.filter((_, i) => i !== idxToRemove);
      const newIdx = Math.min(
        idxToRemove === state.activeSectionIdx
          ? Math.max(0, idxToRemove - 1)
          : idxToRemove < state.activeSectionIdx
          ? state.activeSectionIdx - 1
          : state.activeSectionIdx,
        newSections.length - 1
      );
      const target = newSections[newIdx];
      return {
        ...state,
        equipment: target.equipment,
        workItems: target.workItems,
        bearings: target.bearings,
        spareParts: target.spareParts,
        machining: target.machining,
        labor: target.labor,
        allSections: newSections,
        activeSectionIdx: newIdx,
        updatedAt: new Date().toISOString(),
      };
    }

    case 'UPDATE_SECTION_LABEL': {
      return {
        ...state,
        allSections: state.allSections.map((s, i) =>
          i === action.payload.idx ? { ...s, label: action.payload.label } : s
        ),
        updatedAt: new Date().toISOString(),
      };
    }

    default:
      return state;
  }
}

// Context type
interface BudgetContextType {
  budget: Budget;
  isLoadingNumber: boolean;
  setCompany: (companyId: CompanyId) => void;
  setMeta: (meta: Partial<BudgetMeta>) => void;
  setCustomer: (customer: Partial<Customer>) => void;
  setEquipment: (equipment: Partial<Equipment>) => void;
  addWorkItem: (item: WorkItem) => void;
  updateWorkItem: (id: string, updates: Partial<WorkItem>) => void;
  removeWorkItem: (id: string) => void;
  reorderWorkItems: (items: WorkItem[]) => void;
  addBearing: (item: BearingItem) => void;
  updateBearing: (id: string, updates: Partial<BearingItem>) => void;
  removeBearing: (id: string) => void;
  addSparePart: (item: SparePartItem) => void;
  updateSparePart: (id: string, updates: Partial<SparePartItem>) => void;
  removeSparePart: (id: string) => void;
  addMachining: (item: MachiningItem) => void;
  updateMachining: (id: string, updates: Partial<MachiningItem>) => void;
  removeMachining: (id: string) => void;
  addLabor: (item: LaborItem) => void;
  updateLabor: (id: string, updates: Partial<LaborItem>) => void;
  removeLabor: (id: string) => void;
  setLabor: (items: LaborItem[]) => void;
  recalculateTotals: () => void;
  resetBudget: () => void;
  refreshBudgetNumber: () => void;
  loadBudget: (budget: Budget) => void;
  // Section management
  addSection: () => void;
  switchSection: (idx: number) => void;
  removeSection: (idx: number) => void;
  updateSectionLabel: (idx: number, label: string) => void;
  effectiveSections: RepairSection[];
}

const BudgetContext = createContext<BudgetContextType | null>(null);

export function BudgetProvider({ children }: { children: ReactNode }) {
  const [budget, dispatch] = useReducer(budgetReducer, null, createInitialBudget);
  const [isLoadingNumber, setIsLoadingNumber] = useState(false);
  // Prevents double-invocation in React StrictMode (dev)
  const fetchedOnMount = useRef(false);

  // Sync company font on body (BEMEC → Changa, BAMORE → system font)
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.dataset.company = budget.companyId;
    }
  }, [budget.companyId]);

  // Auto-save draft — sync allSections before saving so multi-section data is never stale
  useEffect(() => {
    const timeout = setTimeout(() => {
      const syncedSections = syncActiveSection(budget);
      saveDraft({ ...budget, allSections: syncedSections });
    }, 1000);
    return () => clearTimeout(timeout);
  }, [budget]);

  // Load draft on mount; always refresh number + date from Sheets (run once, StrictMode-safe)
  useEffect(() => {
    if (fetchedOnMount.current) return;
    fetchedOnMount.current = true;

    const draft = loadDraft();
    const companyId = draft?.companyId ?? 'bemec';
    if (draft && draft.id) {
      dispatch({ type: 'SET_BUDGET', payload: draft as Budget });
    }

    // Reset date to today and fetch current budget number from spreadsheet
    const today = new Date();
    dispatch({ type: 'SET_META', payload: { date: formatDate(today), validUntil: formatDate(addDays(today, 7)) } });
    setIsLoadingNumber(true);
    fetchNextBudgetNumber(companyId)
      .then((next) => {
        if (next) dispatch({ type: 'SET_META', payload: { number: next } });
      })
      .finally(() => setIsLoadingNumber(false));
  }, []);

  const recalculateTotals = useCallback(() => {
    const totals = calculateSubtotals(
      budget.labor,
      budget.bearings,
      budget.spareParts,
      budget.machining
    );
    dispatch({ type: 'SET_SUBTOTALS', payload: totals });
  }, [budget.labor, budget.bearings, budget.spareParts, budget.machining]);

  // Recalculate totals when items change
  useEffect(() => {
    recalculateTotals();
  }, [budget.labor, budget.bearings, budget.spareParts, budget.machining, recalculateTotals]);

  const setCompany = useCallback((companyId: CompanyId) => {
    dispatch({ type: 'SET_COMPANY', payload: companyId });
    const today = new Date();
    dispatch({ type: 'SET_META', payload: { date: formatDate(today), validUntil: formatDate(addDays(today, 7)) } });
    setIsLoadingNumber(true);
    fetchNextBudgetNumber(companyId)
      .then((next) => {
        if (next) dispatch({ type: 'SET_META', payload: { number: next } });
      })
      .finally(() => setIsLoadingNumber(false));
  }, []);

  const refreshBudgetNumber = useCallback((companyId?: string) => {
    const id = companyId ?? budget.companyId;
    setIsLoadingNumber(true);
    fetchNextBudgetNumber(id)
      .then((next) => {
        if (next) dispatch({ type: 'SET_META', payload: { number: next } });
      })
      .finally(() => setIsLoadingNumber(false));
  }, [budget.companyId]);

  const resetBudget = useCallback(() => {
    dispatch({ type: 'RESET' });
    const today = new Date();
    dispatch({ type: 'SET_META', payload: { date: formatDate(today), validUntil: formatDate(addDays(today, 7)) } });
    refreshBudgetNumber(budget.companyId);
  }, [budget.companyId, refreshBudgetNumber]);

  // Effective sections: active section always uses the current flat arrays (in case of unsaved edits)
  const effectiveSections: RepairSection[] = budget.allSections.map((s, i) =>
    i === budget.activeSectionIdx
      ? { ...s, equipment: budget.equipment, workItems: budget.workItems, bearings: budget.bearings, spareParts: budget.spareParts, machining: budget.machining, labor: budget.labor }
      : s
  );

  const contextValue: BudgetContextType = {
    budget,
    isLoadingNumber,
    setCompany,
    setMeta: (meta) => dispatch({ type: 'SET_META', payload: meta }),
    setCustomer: (customer) => dispatch({ type: 'SET_CUSTOMER', payload: customer }),
    setEquipment: (equipment) => dispatch({ type: 'SET_EQUIPMENT', payload: equipment }),
    addWorkItem: (item) => dispatch({ type: 'ADD_WORK_ITEM', payload: item }),
    updateWorkItem: (id, updates) => dispatch({ type: 'UPDATE_WORK_ITEM', payload: { id, updates } }),
    removeWorkItem: (id) => dispatch({ type: 'REMOVE_WORK_ITEM', payload: id }),
    reorderWorkItems: (items) => dispatch({ type: 'REORDER_WORK_ITEMS', payload: items }),
    addBearing: (item) => dispatch({ type: 'ADD_BEARING', payload: item }),
    updateBearing: (id, updates) => dispatch({ type: 'UPDATE_BEARING', payload: { id, updates } }),
    removeBearing: (id) => dispatch({ type: 'REMOVE_BEARING', payload: id }),
    addSparePart: (item) => dispatch({ type: 'ADD_SPARE_PART', payload: item }),
    updateSparePart: (id, updates) => dispatch({ type: 'UPDATE_SPARE_PART', payload: { id, updates } }),
    removeSparePart: (id) => dispatch({ type: 'REMOVE_SPARE_PART', payload: id }),
    addMachining: (item) => dispatch({ type: 'ADD_MACHINING', payload: item }),
    updateMachining: (id, updates) => dispatch({ type: 'UPDATE_MACHINING', payload: { id, updates } }),
    removeMachining: (id) => dispatch({ type: 'REMOVE_MACHINING', payload: id }),
    addLabor: (item) => dispatch({ type: 'ADD_LABOR', payload: item }),
    updateLabor: (id, updates) => dispatch({ type: 'UPDATE_LABOR', payload: { id, updates } }),
    removeLabor: (id) => dispatch({ type: 'REMOVE_LABOR', payload: id }),
    setLabor: (items) => dispatch({ type: 'SET_LABOR', payload: items }),
    recalculateTotals,
    resetBudget,
    refreshBudgetNumber,
    loadBudget: (newBudget) => dispatch({ type: 'SET_BUDGET', payload: newBudget }),
    addSection: () => dispatch({ type: 'ADD_SECTION' }),
    switchSection: (idx) => dispatch({ type: 'SWITCH_SECTION', payload: idx }),
    removeSection: (idx) => dispatch({ type: 'REMOVE_SECTION', payload: idx }),
    updateSectionLabel: (idx, label) => dispatch({ type: 'UPDATE_SECTION_LABEL', payload: { idx, label } }),
    effectiveSections,
  };

  return (
    <BudgetContext.Provider value={contextValue}>
      {children}
    </BudgetContext.Provider>
  );
}

export function useBudget() {
  const context = useContext(BudgetContext);
  if (!context) {
    throw new Error('useBudget must be used within a BudgetProvider');
  }
  return context;
}
