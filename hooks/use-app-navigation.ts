'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useBudget } from '@/lib/budget-context';
import { useNewEquipment } from '@/lib/new-equipment-context';
import { COMPANIES } from '@/types/budget';
import type { Customer, CompanyId, BudgetType } from '@/types/budget';

export type AppView =
  | 'company'
  | 'budget-type'
  | 'customers'
  | 'budget'
  | 'new-equipment'
  | 'history';

export interface AppNavigation {
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  budgetType: BudgetType;
  selectedCompanyId: CompanyId;
  handleSelectCompany: (companyId: CompanyId) => void;
  handleSelectBudgetType: (type: BudgetType) => void;
  handleSelectCustomer: (customer: Customer) => void;
  handleNewBudgetWithoutCustomer: () => void;
  handleBackToCustomers: () => void;
  handleBackToBudgetType: () => void;
  handleBackToCompany: () => void;
}

export function useAppNavigation(): AppNavigation {
  const { resetBudget, setCompany, setCustomer } = useBudget();
  const newEquipmentCtx = useNewEquipment();

  const [currentView, setCurrentView] = useState<AppView>('company');
  const [budgetType, setBudgetType] = useState<BudgetType>('reparacion');
  const [selectedCompanyId, setSelectedCompanyId] = useState<CompanyId>('bemec');

  const handleSelectCompany = (companyId: CompanyId) => {
    setSelectedCompanyId(companyId);
    setCompany(companyId);
    newEquipmentCtx.setCompany(companyId);
    setCurrentView('budget-type');
    toast.success(`Empresa "${COMPANIES[companyId].name}" seleccionada`);
  };

  const handleSelectBudgetType = (type: BudgetType) => {
    setBudgetType(type);
    setCurrentView('customers');
  };

  const handleSelectCustomer = (customer: Customer) => {
    const customerData = {
      name: customer.name,
      attention: customer.attention || '',
      email: customer.email || '',
      phone: customer.phone || '',
      cuit: customer.cuit || '',
      address: customer.address || '',
      locality: customer.locality || '',
      province: customer.province || '',
    };

    if (budgetType === 'reparacion') {
      setCustomer(customerData);
      setCurrentView('budget');
    } else {
      newEquipmentCtx.setCustomer(customerData);
      setCurrentView('new-equipment');
    }
    toast.success(`Cliente "${customer.name}" seleccionado`);
  };

  const handleNewBudgetWithoutCustomer = () => {
    if (budgetType === 'reparacion') {
      resetBudget();
      setCompany(selectedCompanyId);
      setCurrentView('budget');
    } else {
      newEquipmentCtx.resetBudget();
      newEquipmentCtx.setCompany(selectedCompanyId);
      setCurrentView('new-equipment');
    }
  };

  return {
    currentView,
    setCurrentView,
    budgetType,
    selectedCompanyId,
    handleSelectCompany,
    handleSelectBudgetType,
    handleSelectCustomer,
    handleNewBudgetWithoutCustomer,
    handleBackToCustomers: () => setCurrentView('customers'),
    handleBackToBudgetType: () => setCurrentView('budget-type'),
    handleBackToCompany: () => setCurrentView('company'),
  };
}
