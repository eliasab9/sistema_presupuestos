'use client';

import { useState } from 'react';
import { BudgetProvider, useBudget } from '@/lib/budget-context';
import { NewEquipmentProvider, useNewEquipment } from '@/lib/new-equipment-context';
import { BudgetForm } from '@/components/forms/budget-form';
import { BudgetPreview } from '@/components/preview/budget-preview';
import { NewEquipmentForm } from '@/components/forms/new-equipment-form';
import { NewEquipmentPreview } from '@/components/preview/new-equipment-preview';
import { CustomerManager } from '@/components/customers/customer-manager';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { 
  FilePlus, 
  Copy, 
  Trash2, 
  FileDown, 
  FileText,
  Menu,
  X,
  ArrowLeft,
  Users,
  Building2,
  Wrench,
  Package,
} from 'lucide-react';
import { toast } from 'sonner';
import { exportToPDF, exportToDOCX, exportToPDFBlob, exportNewEquipmentToPDF } from '@/lib/document/export-pdf';
import { registerNewEquipmentBudgetInSheets, registerRepairBudgetInSheets } from '@/lib/delivery/sheets-service';
import { clearDraft } from '@/lib/storage/budgets';
import { GoogleDriveUploadButton } from '@/components/ui/google-drive-upload-button';
import type { Customer, CompanyId, BudgetType } from '@/types/budget';
import { COMPANIES } from '@/types/budget';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';

type AppView = 'company' | 'budget-type' | 'customers' | 'budget' | 'new-equipment';

function BudgetApp() {
  const { budget, resetBudget, refreshBudgetNumber, loadBudget, setCustomer, setCompany } = useBudget();
  const newEquipmentContext = useNewEquipment();
  const [isExporting, setIsExporting] = useState(false);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const [mobileEqPreviewOpen, setMobileEqPreviewOpen] = useState(false);
  const [currentView, setCurrentView] = useState<AppView>('company');
  const [budgetType, setBudgetType] = useState<BudgetType>('reparacion');
  const [selectedCompanyId, setSelectedCompanyId] = useState<CompanyId>('bemec');

  const company = COMPANIES[currentView === 'new-equipment' ? newEquipmentContext.budget.companyId : budget.companyId];

  const handleSelectCompany = (companyId: CompanyId) => {
    setSelectedCompanyId(companyId);
    setCompany(companyId);
    newEquipmentContext.setCompany(companyId);
    setCurrentView('budget-type');
    toast.success(`Empresa "${COMPANIES[companyId].name}" seleccionada`);
  };

  const handleSelectBudgetType = (type: BudgetType) => {
    setBudgetType(type);
    if (type === 'reparacion') {
      setCurrentView('customers');
    } else {
      setCurrentView('customers');
    }
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
      newEquipmentContext.setCustomer(customerData);
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
      newEquipmentContext.resetBudget();
      newEquipmentContext.setCompany(selectedCompanyId);
      setCurrentView('new-equipment');
    }
  };

  const handleBackToCustomers = () => {
    setCurrentView('customers');
  };

  const handleBackToBudgetType = () => {
    setCurrentView('budget-type');
  };

  const handleBackToCompany = () => {
    setCurrentView('company');
  };

  const handleNewBudget = () => {
    if (confirm('¿Crear un nuevo presupuesto? Se perderán los cambios no guardados.')) {
      resetBudget();
      clearDraft();
      setCurrentView('company');
      toast.success('Selecciona una empresa para el nuevo presupuesto');
    }
  };

  const handleDuplicate = () => {
    const duplicated = {
      ...budget,
      id: crypto.randomUUID(),
      meta: {
        ...budget.meta,
        number: String(parseInt(budget.meta.number) + 1),
        date: new Date().toLocaleDateString('es-AR'),
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    loadBudget(duplicated);
    toast.success('Presupuesto duplicado');
  };

  const handleClear = () => {
    if (confirm('¿Limpiar el formulario? Se perderán todos los datos.')) {
      const currentCompanyId = budget.companyId;
      resetBudget();
      setCompany(currentCompanyId);
      clearDraft();
      toast.success('Formulario limpiado');
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      await exportToPDF(budget);
      // Registrar en Sheets y refrescar número para el próximo presupuesto
      registerRepairBudgetInSheets(budget).then(() => refreshBudgetNumber());
      toast.success('PDF exportado correctamente');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Error al exportar PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportDOCX = async () => {
    setIsExporting(true);
    try {
      await exportToDOCX(budget);
      // Registrar en Sheets y refrescar número para el próximo presupuesto
      registerRepairBudgetInSheets(budget).then(() => refreshBudgetNumber());
      toast.success('Documento exportado correctamente');
    } catch (error) {
      console.error('Error exporting DOCX:', error);
      toast.error('Error al exportar documento');
    } finally {
      setIsExporting(false);
    }
  };

  // Get PDF as blob for Google Drive upload
  const getPdfBlob = async (): Promise<Blob> => {
    return await exportToPDFBlob(budget);
  };

  // Export new equipment to PDF
  const handleExportNewEquipmentPDF = async () => {
    setIsExporting(true);
    try {
      await exportNewEquipmentToPDF(newEquipmentContext.budget);
      // Registrar en Sheets (no bloquea si falla)
      registerNewEquipmentBudgetInSheets(newEquipmentContext.budget);
      toast.success('PDF exportado correctamente');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Error al exportar PDF');
    } finally {
      setIsExporting(false);
    }
  };

  // Company selection view
  if (currentView === 'company') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full animate-fade-in">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white shadow-md mb-5">
              <Building2 className="h-7 w-7 text-slate-500" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-2 text-slate-800">Sistema de Presupuestos</h1>
            <p className="text-slate-500">Seleccioná la empresa para generar el presupuesto</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {Object.values(COMPANIES).map((comp) => (
              <button
                key={comp.id}
                className="group relative overflow-hidden rounded-2xl border-2 border-transparent bg-white shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-offset-2 text-left"
                style={{ ['--tw-ring-color' as string]: comp.primaryColor }}
                onClick={() => handleSelectCompany(comp.id)}
              >
                {/* Color accent bar */}
                <div
                  className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
                  style={{ background: `linear-gradient(90deg, ${comp.primaryColor}, ${comp.secondaryColor})` }}
                />
                <div className="p-8 flex flex-col items-center text-center">
                  <div
                    className="w-20 h-20 rounded-xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
                    style={{ backgroundColor: `${comp.primaryColor}12` }}
                  >
                    <img
                      src={comp.logo}
                      alt={comp.name}
                      className="w-14 h-14 object-contain"
                    />
                  </div>
                  <h2
                    className="text-xl font-bold mb-1"
                    style={{ color: comp.primaryColor }}
                  >
                    {comp.name}
                  </h2>
                  <p className="text-sm text-slate-500">{comp.subtitle}</p>
                  <div
                    className="mt-5 px-4 py-1.5 rounded-full text-xs font-semibold text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    style={{ backgroundColor: comp.primaryColor }}
                  >
                    Seleccionar →
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Budget type selection view
  if (currentView === 'budget-type') {
    const selectedCompany = COMPANIES[selectedCompanyId];
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        {/* Header with company accent */}
        <header className="bg-white border-b shadow-sm">
          <div
            className="h-1"
            style={{ background: `linear-gradient(90deg, ${selectedCompany.primaryColor}, ${selectedCompany.secondaryColor})` }}
          />
          <div className="px-4 py-3 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleBackToCompany} className="rounded-xl">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${selectedCompany.primaryColor}15` }}
            >
              <img src={selectedCompany.logo} alt={selectedCompany.name} className="w-7 h-7 object-contain" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight" style={{ color: selectedCompany.primaryColor }}>
                {selectedCompany.name}
              </h1>
              <p className="text-xs text-muted-foreground">{selectedCompany.subtitle}</p>
            </div>
          </div>
        </header>

        <div className="flex items-center justify-center p-4 animate-fade-in" style={{ minHeight: 'calc(100vh - 74px)' }}>
          <div className="max-w-2xl w-full">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold tracking-tight mb-2 text-slate-800">Tipo de Presupuesto</h2>
              <p className="text-slate-500">¿Qué tipo de presupuesto querés crear?</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              {[
                {
                  type: 'reparacion' as const,
                  icon: Wrench,
                  title: 'Reparación',
                  desc: 'Presupuestar reparación de motores, bombas, reductores y otros equipos',
                },
                {
                  type: 'equipo_nuevo' as const,
                  icon: Package,
                  title: 'Equipo Nuevo',
                  desc: 'Cotizar venta de equipos nuevos: motores, bombas, reductores, variadores',
                },
              ].map(({ type, icon: Icon, title, desc }) => (
                <button
                  key={type}
                  onClick={() => handleSelectBudgetType(type)}
                  className="group relative overflow-hidden rounded-2xl border-2 border-transparent bg-white shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 text-left focus:outline-none"
                >
                  <div
                    className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
                    style={{ background: `linear-gradient(90deg, ${selectedCompany.primaryColor}, ${selectedCompany.secondaryColor})` }}
                  />
                  <div className="p-8 flex flex-col items-center text-center">
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
                      style={{ backgroundColor: `${selectedCompany.primaryColor}15` }}
                    >
                      <Icon className="h-8 w-8" style={{ color: selectedCompany.primaryColor }} />
                    </div>
                    <h3 className="text-lg font-bold mb-2 text-slate-800">{title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                    <div
                      className="mt-5 px-4 py-1.5 rounded-full text-xs font-semibold text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      style={{ backgroundColor: selectedCompany.primaryColor }}
                    >
                      Seleccionar →
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Customer manager view
  if (currentView === 'customers') {
    const selectedCompany = COMPANIES[selectedCompanyId];
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-white border-b shadow-sm">
          <div
            className="h-1"
            style={{ background: `linear-gradient(90deg, ${selectedCompany.primaryColor}, ${selectedCompany.secondaryColor})` }}
          />
          <div className="px-4 py-3 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleBackToBudgetType} className="rounded-xl">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${selectedCompany.primaryColor}15` }}
            >
              <img src={selectedCompany.logo} alt={selectedCompany.name} className="w-7 h-7 object-contain" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight" style={{ color: selectedCompany.primaryColor }}>
                {selectedCompany.name}
              </h1>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">{selectedCompany.subtitle}</p>
                <span className="text-xs text-muted-foreground">·</span>
                <p className="text-xs font-medium" style={{ color: selectedCompany.primaryColor }}>
                  {budgetType === 'reparacion' ? 'Reparación' : 'Equipo Nuevo'}
                </p>
              </div>
            </div>
          </div>
        </header>
        <CustomerManager
          company={selectedCompany}
          onSelectCustomer={handleSelectCustomer}
          onNewBudgetWithoutCustomer={handleNewBudgetWithoutCustomer}
        />
      </div>
    );
  }

  // New Equipment editor view
  if (currentView === 'new-equipment') {
    const eqBudget = newEquipmentContext.budget;
    const eqCompany = COMPANIES[eqBudget.companyId];

    return (
      <div className="h-screen flex flex-col bg-background">
        {/* Header */}
        <header className="bg-white border-b shadow-sm">
          <div
            className="h-1"
            style={{ background: `linear-gradient(90deg, ${eqCompany.primaryColor}, ${eqCompany.secondaryColor})` }}
          />
          <div className="px-4 py-2.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={handleBackToCustomers} className="rounded-xl">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${eqCompany.primaryColor}15` }}
              >
                <img src={eqCompany.logo} alt={eqCompany.name} className="w-6 h-6 object-contain" />
              </div>
              <div>
                <h1 className="text-base font-bold leading-tight" style={{ color: eqCompany.primaryColor }}>
                  {eqCompany.name}
                </h1>
                <p className="text-xs text-muted-foreground">Presupuesto de Equipo Nuevo</p>
              </div>
            </div>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-2">
              <Button variant="outline" size="sm" className="rounded-xl" onClick={handleBackToCompany}>
                <Building2 className="h-4 w-4 mr-2" />
                Empresa
              </Button>
              <Button variant="outline" size="sm" className="rounded-xl" onClick={() => {
                newEquipmentContext.resetBudget();
                newEquipmentContext.setCompany(selectedCompanyId);
                toast.success('Formulario limpiado');
              }}>
                <Trash2 className="h-4 w-4 mr-2" />
                Limpiar
              </Button>

              <Separator orientation="vertical" className="h-6" />

              <Button
                size="sm"
                style={{ backgroundColor: eqCompany.primaryColor }}
                className="rounded-xl text-white hover:opacity-90 shadow-sm"
                onClick={handleExportNewEquipmentPDF}
                disabled={isExporting}
              >
                <FileDown className="h-4 w-4 mr-2" />
                PDF
              </Button>
            </div>

            {/* Mobile Menu */}
            <div className="flex md:hidden items-center gap-2">
              <Button
                size="sm"
                onClick={handleExportNewEquipmentPDF}
                disabled={isExporting}
                style={{ backgroundColor: eqCompany.primaryColor }}
                className="rounded-xl text-white hover:opacity-90"
              >
                <FileDown className="h-4 w-4" />
              </Button>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="rounded-xl">
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-64">
                  <div className="space-y-3 mt-6">
                    <Button variant="outline" className="w-full justify-start rounded-xl" onClick={handleBackToCompany}>
                      <Building2 className="h-4 w-4 mr-2" />Cambiar Empresa
                    </Button>
                    <Button variant="outline" className="w-full justify-start rounded-xl" onClick={handleBackToCustomers}>
                      <Users className="h-4 w-4 mr-2" />Ver Clientes
                    </Button>
                    <Button variant="outline" className="w-full justify-start rounded-xl" onClick={() => {
                      newEquipmentContext.resetBudget();
                      newEquipmentContext.setCompany(selectedCompanyId);
                      toast.success('Formulario limpiado');
                    }}>
                      <Trash2 className="h-4 w-4 mr-2" />Limpiar formulario
                    </Button>
                    <Separator />
                    <Button className="w-full justify-start rounded-xl text-white" onClick={handleExportNewEquipmentPDF} disabled={isExporting} style={{ backgroundColor: eqCompany.primaryColor }}>
                      <FileDown className="h-4 w-4 mr-2" />Exportar PDF
                    </Button>
                    <Separator />
                    <Button variant="outline" className="w-full justify-start rounded-xl" onClick={() => setMobileEqPreviewOpen(true)}>
                      <FileText className="h-4 w-4 mr-2" />Ver vista previa
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Form Panel */}
          <div className="w-full lg:flex-[3] min-w-0 overflow-hidden">
            <NewEquipmentForm />
          </div>

          {/* Preview Panel */}
          <div className="hidden lg:block lg:flex-[2] flex-shrink-0 border-l overflow-hidden">
            <NewEquipmentPreview />
          </div>
        </div>

        {/* Mobile Preview Sheet */}
        <Sheet open={mobileEqPreviewOpen} onOpenChange={setMobileEqPreviewOpen}>
          <SheetContent side="bottom" className="h-[90vh] p-0">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-semibold">Vista Previa</h2>
              <Button variant="ghost" size="icon" onClick={() => setMobileEqPreviewOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <NewEquipmentPreview />
          </SheetContent>
        </Sheet>

        {/* Footer */}
        <footer className="border-t bg-card px-4 py-2 text-xs text-muted-foreground flex items-center justify-between">
          <span>Presupuesto N° {eqBudget.meta.number} {eqBudget.customer.name && `· ${eqBudget.customer.name}`}</span>
          <span>Equipo Nuevo</span>
        </footer>
      </div>
    );
  }

  // Budget editor view (Reparación)
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div
          className="h-1"
          style={{ background: `linear-gradient(90deg, ${company.primaryColor}, ${company.secondaryColor})` }}
        />
        <div className="px-4 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleBackToCustomers} className="rounded-xl">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${company.primaryColor}15` }}
            >
              <img src={company.logo} alt={company.name} className="w-6 h-6 object-contain" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight" style={{ color: company.primaryColor }}>
                {company.name}
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block">{company.subtitle}</p>
            </div>
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-1.5">
            <Button variant="outline" size="sm" className="rounded-xl" onClick={handleBackToCompany}>
              <Building2 className="h-4 w-4 mr-1.5" />
              Empresa
            </Button>
            <Button variant="outline" size="sm" className="rounded-xl" onClick={handleBackToCustomers}>
              <Users className="h-4 w-4 mr-1.5" />
              Clientes
            </Button>
            <Button variant="outline" size="sm" className="rounded-xl" onClick={handleNewBudget}>
              <FilePlus className="h-4 w-4 mr-1.5" />
              Nuevo
            </Button>
            <Button variant="outline" size="sm" className="rounded-xl" onClick={handleDuplicate}>
              <Copy className="h-4 w-4 mr-1.5" />
              Duplicar
            </Button>
            <Button variant="outline" size="sm" className="rounded-xl" onClick={handleClear}>
              <Trash2 className="h-4 w-4 mr-1.5" />
              Limpiar
            </Button>

            <Separator orientation="vertical" className="h-6 mx-1" />

            <Button
              size="sm"
              onClick={handleExportPDF}
              disabled={isExporting}
              style={{ backgroundColor: company.primaryColor }}
              className="rounded-xl text-white hover:opacity-90 shadow-sm"
            >
              <FileDown className="h-4 w-4 mr-1.5" />
              PDF
            </Button>
            <Button variant="secondary" size="sm" className="rounded-xl" onClick={handleExportDOCX} disabled={isExporting}>
              <FileText className="h-4 w-4 mr-1.5" />
              DOCX
            </Button>

            <GoogleDriveUploadButton budget={budget} getPdfBlob={getPdfBlob} variant="outline" />
          </div>

          {/* Mobile Menu */}
          <div className="flex md:hidden items-center gap-2">
            <Button
              size="sm"
              onClick={handleExportPDF}
              disabled={isExporting}
              style={{ backgroundColor: company.primaryColor }}
              className="rounded-xl text-white hover:opacity-90"
            >
              <FileDown className="h-4 w-4" />
            </Button>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-xl">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64">
                <div className="space-y-3 mt-6">
                  <Button variant="outline" className="w-full justify-start rounded-xl" onClick={handleBackToCompany}>
                    <Building2 className="h-4 w-4 mr-2" />Cambiar Empresa
                  </Button>
                  <Button variant="outline" className="w-full justify-start rounded-xl" onClick={handleBackToCustomers}>
                    <Users className="h-4 w-4 mr-2" />Ver Clientes
                  </Button>
                  <Button variant="outline" className="w-full justify-start rounded-xl" onClick={handleNewBudget}>
                    <FilePlus className="h-4 w-4 mr-2" />Nuevo presupuesto
                  </Button>
                  <Button variant="outline" className="w-full justify-start rounded-xl" onClick={handleDuplicate}>
                    <Copy className="h-4 w-4 mr-2" />Duplicar
                  </Button>
                  <Button variant="outline" className="w-full justify-start rounded-xl" onClick={handleClear}>
                    <Trash2 className="h-4 w-4 mr-2" />Limpiar formulario
                  </Button>
                  <Separator />
                  <Button className="w-full justify-start rounded-xl text-white" onClick={handleExportPDF} disabled={isExporting} style={{ backgroundColor: company.primaryColor }}>
                    <FileDown className="h-4 w-4 mr-2" />Exportar PDF
                  </Button>
                  <Button variant="secondary" className="w-full justify-start rounded-xl" onClick={handleExportDOCX} disabled={isExporting}>
                    <FileText className="h-4 w-4 mr-2" />Exportar DOCX
                  </Button>
                  <GoogleDriveUploadButton budget={budget} getPdfBlob={getPdfBlob} variant="outline" className="w-full justify-start" />
                  <Separator />
                  <Button variant="outline" className="w-full justify-start rounded-xl" onClick={() => setMobilePreviewOpen(true)}>
                    <FileText className="h-4 w-4 mr-2" />Ver vista previa
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Form Panel */}
        <div className="w-full md:flex-[3] lg:flex-[2] min-w-0 overflow-hidden">
          <BudgetForm />
        </div>

        {/* Preview Panel - shown from md+ */}
        <div className="hidden md:block md:w-[300px] lg:w-[340px] xl:w-[380px] flex-shrink-0 border-l overflow-hidden">
          <BudgetPreview />
        </div>
      </div>

      {/* Mobile Preview Sheet */}
      <Sheet open={mobilePreviewOpen} onOpenChange={setMobilePreviewOpen}>
        <SheetContent side="bottom" className="h-[90vh] p-0">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="font-semibold">Vista Previa</h2>
            <Button variant="ghost" size="icon" onClick={() => setMobilePreviewOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <BudgetPreview />
        </SheetContent>
      </Sheet>

      {/* Footer */}
      <footer className="border-t bg-card px-4 py-2 text-xs text-muted-foreground flex items-center justify-between">
        <span>Presupuesto N° {budget.meta.number} {budget.customer.name && `· ${budget.customer.name}`}</span>
        <span>Guardado automático activo</span>
      </footer>
    </div>
  );
}

export default function Page() {
  return (
    <BudgetProvider>
      <NewEquipmentProvider>
        <BudgetApp />
      </NewEquipmentProvider>
    </BudgetProvider>
  );
}
