'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type {
  CompanyId,
  NewEquipmentBudget,
  NewEquipmentItem,
  NewEquipmentType,
  BudgetMeta,
  Customer,
  TaxLine,
} from '@/types/budget';
import { fetchNextBudgetNumber } from '@/lib/delivery/sheets-service';

interface NewEquipmentContextType {
  budget: NewEquipmentBudget;
  isLoadingNumber: boolean;
  setCompany: (companyId: CompanyId) => void;
  setMeta: (meta: Partial<BudgetMeta>) => void;
  setCustomer: (customer: Partial<Customer>) => void;
  addItem: (type: NewEquipmentType) => void;
  updateItem: (id: string, updates: Partial<NewEquipmentItem>) => void;
  removeItem: (id: string) => void;
  resetBudget: () => void;
  refreshBudgetNumber: () => void;
  loadBudget: (budget: NewEquipmentBudget) => void;
}

const NewEquipmentContext = createContext<NewEquipmentContextType | undefined>(undefined);

function createEmptyItem(type: NewEquipmentType): NewEquipmentItem {
  return {
    id: crypto.randomUUID(),
    type,
    brand: '',
    model: '',
    quantity: 1,
    unitPriceARS: 0,
    subtotalARS: 0,
  };
}

function createEmptyBudget(): NewEquipmentBudget {
  const today = new Date();
  const validUntil = new Date(today);
  validUntil.setDate(validUntil.getDate() + 7);

  return {
    id: crypto.randomUUID(),
    companyId: 'bemec',
    meta: {
      number: String(Math.floor(Math.random() * 9000) + 1000),
      date: today.toLocaleDateString('es-AR'),
      validUntil: validUntil.toLocaleDateString('es-AR'),
      exchangeRate: 1200,
      currency: 'ARS',
      paymentTerms: '',
      commercialValidity: '',
      generalNotes: '',
    },
    customer: {},
    items: [],
    subtotalItems: 0,
    taxes: [],
    totalTax: 0,
    totalFinal: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function NewEquipmentProvider({ children }: { children: React.ReactNode }) {
  const [budget, setBudget] = useState<NewEquipmentBudget>(createEmptyBudget);
  const [isLoadingNumber, setIsLoadingNumber] = useState(false);
  const didInitRef = useRef(false);

  // Al montar, traer el siguiente Nº de presupuesto desde Sheets
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    setIsLoadingNumber(true);
    fetchNextBudgetNumber('bemec')
      .then((next) => {
        if (next) setBudget(prev => ({ ...prev, meta: { ...prev.meta, number: next } }));
      })
      .finally(() => setIsLoadingNumber(false));
  }, []);

  // Recalculate totals when items change
  useEffect(() => {
    const subtotalItems = budget.items.reduce((sum, item) => sum + item.subtotalARS, 0);
    
    if (subtotalItems !== budget.subtotalItems) {
      setBudget(prev => ({
        ...prev,
        subtotalItems,
        totalFinal: subtotalItems + prev.totalTax,
        updatedAt: new Date().toISOString(),
      }));
    }
  }, [budget.items, budget.subtotalItems, budget.totalTax]);

  const refreshBudgetNumber = useCallback((companyId?: CompanyId) => {
    const id = companyId ?? budget.companyId;
    setIsLoadingNumber(true);
    fetchNextBudgetNumber(id)
      .then((next) => {
        if (next) setBudget(prev => ({ ...prev, meta: { ...prev.meta, number: next } }));
      })
      .finally(() => setIsLoadingNumber(false));
  }, [budget.companyId]);

  const setCompany = useCallback((companyId: CompanyId) => {
    setBudget(prev => ({ ...prev, companyId, updatedAt: new Date().toISOString() }));
    refreshBudgetNumber(companyId);
  }, [refreshBudgetNumber]);

  const setMeta = useCallback((meta: Partial<BudgetMeta>) => {
    setBudget(prev => ({
      ...prev,
      meta: { ...prev.meta, ...meta },
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const setCustomer = useCallback((customer: Partial<Customer>) => {
    setBudget(prev => ({
      ...prev,
      customer: { ...prev.customer, ...customer },
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const addItem = useCallback((type: NewEquipmentType) => {
    const newItem = createEmptyItem(type);
    setBudget(prev => ({
      ...prev,
      items: [...prev.items, newItem],
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const updateItem = useCallback((id: string, updates: Partial<NewEquipmentItem>) => {
    setBudget(prev => {
      const items = prev.items.map(item => {
        if (item.id !== id) return item;
        
        const updated = { ...item, ...updates };
        // Recalculate subtotal
        updated.subtotalARS = updated.quantity * updated.unitPriceARS;
        return updated;
      });
      
      return {
        ...prev,
        items,
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setBudget(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const resetBudget = useCallback(() => {
    const fresh = createEmptyBudget();
    setBudget(fresh);
    refreshBudgetNumber(budget.companyId);
  }, [budget.companyId, refreshBudgetNumber]);

  const loadBudget = useCallback((newBudget: NewEquipmentBudget) => {
    setBudget(newBudget);
  }, []);

  return (
    <NewEquipmentContext.Provider value={{
      budget,
      isLoadingNumber,
      setCompany,
      setMeta,
      setCustomer,
      addItem,
      updateItem,
      removeItem,
      resetBudget,
      refreshBudgetNumber,
      loadBudget,
    }}>
      {children}
    </NewEquipmentContext.Provider>
  );
}

export function useNewEquipment() {
  const context = useContext(NewEquipmentContext);
  if (!context) {
    throw new Error('useNewEquipment must be used within a NewEquipmentProvider');
  }
  return context;
}
