'use client';

import { useState } from 'react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { BudgetProvider, useBudget } from '@/lib/budget-context';
import { NewEquipmentProvider, useNewEquipment } from '@/lib/new-equipment-context';
import { BudgetForm } from '@/components/forms/budget-form';
import { BudgetPreview } from '@/components/preview/budget-preview';
import { NewEquipmentForm } from '@/components/forms/new-equipment-form';
import { NewEquipmentPreview } from '@/components/preview/new-equipment-preview';
import { CustomerManager } from '@/components/customers/customer-manager';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
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
  ClipboardList,
} from 'lucide-react';
import { toast } from 'sonner';
import { exportToPDF, exportToDOCX, exportToPDFBlob, exportNewEquipmentToPDF } from '@/lib/document/export-pdf';
import { buildNewEquipmentFileName } from '@/components/delivery/new-equipment-delivery-panel';
import { registerNewEquipmentBudgetInSheets, registerRepairBudgetInSheets } from '@/lib/delivery/sheets-service';
import { clearDraft, getBudgetById } from '@/lib/storage/budgets';
import { fetchBudgetById, syncSentBudgetToDb } from '@/lib/storage/budgets-api';
import { buildBudgetFileName } from '@/lib/delivery/file-builder';
import { GoogleDriveUploadButton } from '@/components/ui/google-drive-upload-button';
import { BudgetHistoryPage } from '@/components/budget-history/budget-history-page';
import { CompanySelector } from '@/components/wizard/company-selector';
import { BudgetTypeSelector } from '@/components/wizard/budget-type-selector';
import { useAppNavigation } from '@/hooks/use-app-navigation';
import { COMPANIES } from '@/types/budget';
import type { Budget, NewEquipmentBudget, RepairSection, Equipment } from '@/types/budget';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';

// ── Rehydration helpers ──────────────────────────────────────────────────────
// Turn a stored budget (DB row or localStorage Budget) into the shape the
// BudgetContext reducer expects when calling loadBudget: flat fields
// (equipment/workItems/...) populated from allSections[activeSectionIdx].

const DEFAULT_EQUIPMENT: Equipment = { type: 'electrobomba_centrifuga', power: 1, quantity: 1 };

function expandActiveSection(b: Budget): Budget {
  const sections = (b.allSections && b.allSections.length > 0) ? b.allSections : [];
  const activeIdx = Math.min(
    Math.max(0, b.activeSectionIdx ?? 0),
    Math.max(0, sections.length - 1)
  );
  const active: RepairSection | undefined = sections[activeIdx];
  return {
    ...b,
    equipment:  active?.equipment  ?? b.equipment  ?? { ...DEFAULT_EQUIPMENT },
    workItems:  active?.workItems  ?? b.workItems  ?? [],
    bearings:   active?.bearings   ?? b.bearings   ?? [],
    spareParts: active?.spareParts ?? b.spareParts ?? [],
    machining:  active?.machining  ?? b.machining  ?? [],
    labor:      active?.labor      ?? b.labor      ?? [],
    activeSectionIdx: activeIdx,
    allSections: sections,
  };
}

function rehydrateRepairBudgetFromRow(row: Record<string, unknown>): Budget {
  // Drizzle returns camelCase. Build a Budget shape from columns + JSONB.
  const stub: Budget = {
    id: row.id as string,
    companyId: row.companyId as Budget['companyId'],
    meta: {
      number: row.number as string,
      date: row.date as string,
      validUntil: row.validUntil as string,
      exchangeRate: Number(row.exchangeRate ?? 0),
      currency: (row.currency as Budget['meta']['currency']) ?? 'ARS',
      paymentTerms: (row.paymentTerms as string) ?? undefined,
      commercialValidity: (row.commercialValidity as string) ?? undefined,
      generalNotes: (row.generalNotes as string) ?? undefined,
      ivaCondition: (row.ivaCondition as string) ?? undefined,
      pideNumber: (row.pideNumber as string) ?? undefined,
      responsable: (row.responsable as string) ?? undefined,
      sellerId: (row.sellerId as string) ?? undefined,
    },
    customer: ((row.customerSnapshot as Budget['customer']) ?? {}),
    equipment: { ...DEFAULT_EQUIPMENT },
    workItems: [],
    bearings: [],
    spareParts: [],
    machining: [],
    labor: [],
    allSections: (row.allSections as Budget['allSections']) ?? [],
    activeSectionIdx: 0,
    taxes: (row.taxes as Budget['taxes']) ?? [],
    subtotalLabor: Number(row.subtotalLabor ?? 0),
    subtotalBearings: Number(row.subtotalBearings ?? 0),
    subtotalSpareParts: Number(row.subtotalSpareParts ?? 0),
    subtotalMachining: Number(row.subtotalMachining ?? 0),
    subtotalGeneral: Number(row.subtotalGeneral ?? 0),
    totalTax: Number(row.totalTax ?? 0),
    totalFinal: Number(row.totalFinal ?? 0),
    status: (row.status as Budget['status']) ?? undefined,
    sentAt: typeof row.sentAt === 'string' ? row.sentAt : (row.sentAt instanceof Date ? row.sentAt.toISOString() : undefined),
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : new Date().toISOString(),
    updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : new Date().toISOString(),
  };
  return expandActiveSection(stub);
}

function rehydrateNewEquipmentBudgetFromRow(row: Record<string, unknown>): NewEquipmentBudget {
  return {
    id: row.id as string,
    companyId: row.companyId as NewEquipmentBudget['companyId'],
    meta: {
      number: row.number as string,
      date: row.date as string,
      validUntil: row.validUntil as string,
      exchangeRate: Number(row.exchangeRate ?? 0),
      currency: (row.currency as NewEquipmentBudget['meta']['currency']) ?? 'ARS',
      paymentTerms: (row.paymentTerms as string) ?? undefined,
      commercialValidity: (row.commercialValidity as string) ?? undefined,
      generalNotes: (row.generalNotes as string) ?? undefined,
      ivaCondition: (row.ivaCondition as string) ?? undefined,
      pideNumber: (row.pideNumber as string) ?? undefined,
      responsable: (row.responsable as string) ?? undefined,
      sellerId: (row.sellerId as string) ?? undefined,
    },
    customer: ((row.customerSnapshot as NewEquipmentBudget['customer']) ?? {}),
    items: (row.items as NewEquipmentBudget['items']) ?? [],
    subtotalItems: Number(row.subtotalItems ?? 0),
    taxes: (row.taxes as NewEquipmentBudget['taxes']) ?? [],
    totalTax: Number(row.totalTax ?? 0),
    totalFinal: Number(row.totalFinal ?? 0),
    showTotal: true,
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : new Date().toISOString(),
    updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : new Date().toISOString(),
  };
}

function BudgetApp() {
  const { budget, resetBudget, refreshBudgetNumber, loadBudget, setCompany } = useBudget();
  const newEquipmentContext = useNewEquipment();
  const {
    currentView,
    setCurrentView,
    budgetType,
    setBudgetType,
    selectedCompanyId,
    setSelectedCompanyId,
    handleSelectCompany,
    handleSelectBudgetType,
    handleSelectCustomer,
    handleNewBudgetWithoutCustomer,
    handleBackToCustomers,
    handleBackToBudgetType,
    handleBackToCompany,
  } = useAppNavigation();

  const [isExporting, setIsExporting] = useState(false);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const [mobileEqPreviewOpen, setMobileEqPreviewOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<'new' | 'clear' | null>(null);

  const company = COMPANIES[currentView === 'new-equipment' ? newEquipmentContext.budget.companyId : budget.companyId];

  const handleNewBudget = () => {
    setPendingAction('new');
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
    setPendingAction('clear');
  };

  // Load a previously sent budget back into the editor for re-pricing / edits.
  // Tries the DB first (works across devices), falls back to localStorage for
  // legacy budgets that were sent before the DB-backed history existed.
  // The original budget id is preserved so the re-send upserts the same row.
  const handleEditBudget = async (
    budgetId: string,
    type: 'reparacion' | 'equipo_nuevo'
  ) => {
    try {
      let row: Record<string, unknown> | null = null;
      try {
        row = await fetchBudgetById(budgetId);
      } catch (e) {
        console.warn('fetchBudgetById failed, will try localStorage:', e);
      }

      if (type === 'reparacion') {
        const hydrated = row
          ? rehydrateRepairBudgetFromRow(row)
          : getBudgetById(budgetId)
          ? expandActiveSection(getBudgetById(budgetId)!)
          : null;
        if (!hydrated) {
          toast.error('No se encontraron los datos para editar este presupuesto');
          return;
        }
        setSelectedCompanyId(hydrated.companyId);
        setBudgetType('reparacion');
        loadBudget(hydrated);
        setCurrentView('budget');
        toast.success('Presupuesto cargado para editar');
      } else {
        if (!row) {
          toast.error(
            'Este presupuesto de equipo nuevo no está disponible para editar (no se encuentra en la DB).'
          );
          return;
        }
        const hydrated = rehydrateNewEquipmentBudgetFromRow(row);
        setSelectedCompanyId(hydrated.companyId);
        setBudgetType('equipo_nuevo');
        newEquipmentContext.loadBudget(hydrated);
        setCurrentView('new-equipment');
        toast.success('Presupuesto cargado para editar');
      }
    } catch (e) {
      console.error('handleEditBudget failed:', e);
      toast.error('No se pudo cargar el presupuesto para editar');
    }
  };

  const handleConfirmPendingAction = () => {
    if (pendingAction === 'new') {
      resetBudget();
      clearDraft();
      setCurrentView('company');
      toast.success('Selecciona una empresa para el nuevo presupuesto');
    } else if (pendingAction === 'clear') {
      const currentCompanyId = budget.companyId;
      resetBudget();
      setCompany(currentCompanyId);
      clearDraft();
      toast.success('Formulario limpiado');
    }
    setPendingAction(null);
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      await exportToPDF(budget);
      // Persistir en DB para que aparezca en el historial y sea editable, pero
      // SIN registrar en Sheets ni subir a Drive.
      syncSentBudgetToDb(budget, {
        budgetType: 'reparacion',
        status: 'pending',
        sentAt: new Date().toISOString(),
        fileName: buildBudgetFileName(budget, 'pdf'),
        fileFormat: 'pdf',
      })
        .then(() => refreshBudgetNumber())
        .catch((e) => console.error('Failed to sync exported PDF to DB:', e));
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
      // Persistir en DB para que aparezca en el historial y sea editable, pero
      // SIN registrar en Sheets ni subir a Drive.
      syncSentBudgetToDb(newEquipmentContext.budget, {
        budgetType: 'equipo_nuevo',
        status: 'pending',
        sentAt: new Date().toISOString(),
        fileName: buildNewEquipmentFileName(newEquipmentContext.budget),
        fileFormat: 'pdf',
      }).catch((e) => console.error('Failed to sync exported equipo_nuevo PDF to DB:', e));
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
    return <CompanySelector onSelect={handleSelectCompany} />;
  }

  // Budget type selection view
  if (currentView === 'budget-type') {
    return (
      <BudgetTypeSelector
        company={COMPANIES[selectedCompanyId]}
        onBack={handleBackToCompany}
        onSelect={handleSelectBudgetType}
        onHistory={() => setCurrentView('history')}
      />
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
            <button
              type="button"
              onClick={handleBackToCompany}
              className="flex items-center gap-3 rounded-xl px-1.5 py-1 -mx-1.5 -my-1 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1"
              style={{ ['--tw-ring-color' as string]: selectedCompany.primaryColor }}
              title="Volver al inicio"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${selectedCompany.primaryColor}15` }}
              >
                <img src={selectedCompany.logo} alt={selectedCompany.name} className="w-7 h-7 object-contain" />
              </div>
              <div className="text-left">
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
            </button>
          </div>
        </header>
        <div className="flex items-center justify-end px-4 py-2 border-b bg-slate-50/60">
          <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setCurrentView('history')}>
            <ClipboardList className="h-4 w-4 mr-1.5" />
            Estado de presupuestos
          </Button>
        </div>
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
              <button
                type="button"
                onClick={handleBackToCompany}
                className="flex items-center gap-3 rounded-xl px-1.5 py-1 -mx-1.5 -my-1 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1"
                style={{ ['--tw-ring-color' as string]: eqCompany.primaryColor }}
                title="Volver al inicio"
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${eqCompany.primaryColor}15` }}
                >
                  <img src={eqCompany.logo} alt={eqCompany.name} className="w-6 h-6 object-contain" />
                </div>
                <div className="text-left">
                  <h1 className="text-base font-bold leading-tight" style={{ color: eqCompany.primaryColor }}>
                    {eqCompany.name}
                  </h1>
                  <p className="text-xs text-muted-foreground">Presupuesto de Equipo Nuevo</p>
                </div>
              </button>
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
                    <Button variant="outline" className="w-full justify-start rounded-xl" onClick={() => setCurrentView('history')}>
                      <ClipboardList className="h-4 w-4 mr-2" />Estado de presupuestos
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

  // History view
  if (currentView === 'history') {
    return (
      <BudgetHistoryPage
        company={COMPANIES[selectedCompanyId]}
        onBack={() => setCurrentView('budget-type')}
        onEditBudget={handleEditBudget}
      />
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
            <button
              type="button"
              onClick={handleBackToCompany}
              className="flex items-center gap-3 rounded-xl px-1.5 py-1 -mx-1.5 -my-1 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1"
              style={{ ['--tw-ring-color' as string]: company.primaryColor }}
              title="Volver al inicio"
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${company.primaryColor}15` }}
              >
                <img src={company.logo} alt={company.name} className="w-6 h-6 object-contain" />
              </div>
              <div className="text-left">
                <h1 className="text-base font-bold leading-tight" style={{ color: company.primaryColor }}>
                  {company.name}
                </h1>
                <p className="text-xs text-muted-foreground hidden sm:block">{company.subtitle}</p>
              </div>
            </button>
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
            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setCurrentView('history')}>
              <ClipboardList className="h-4 w-4 mr-1.5" />
              Estado
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
                  <Button variant="outline" className="w-full justify-start rounded-xl" onClick={() => setCurrentView('history')}>
                    <ClipboardList className="h-4 w-4 mr-2" />Estado de presupuestos
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

      <ConfirmDialog
        open={pendingAction !== null}
        onOpenChange={(open) => { if (!open) setPendingAction(null); }}
        title={pendingAction === 'new' ? '¿Crear nuevo presupuesto?' : '¿Limpiar el formulario?'}
        description={
          pendingAction === 'new'
            ? 'Se perderán los cambios no guardados del presupuesto actual.'
            : 'Se perderán todos los datos del formulario. Esta acción no se puede deshacer.'
        }
        confirmLabel={pendingAction === 'new' ? 'Crear nuevo' : 'Limpiar'}
        destructive
        onConfirm={handleConfirmPendingAction}
      />
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
