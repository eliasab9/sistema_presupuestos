'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Send, 
  HardDrive, 
  Mail, 
  FileText, 
  Settings, 
  ChevronDown, 
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ExternalLink,
  Edit3,
  FolderOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBudget } from '@/lib/budget-context';
import { COMPANIES } from '@/types/budget';
import { BudgetPreview } from '@/components/preview/budget-preview';
import { saveBudget } from '@/lib/storage/budgets';
import { toast } from 'sonner';
import type { 
  DeliverySettings, 
  DeliveryWorkflowState, 
  DeliveryWorkflowResult,
  FileFormat,
} from '@/types/delivery';
import { 
  getDefaultDeliverySettings, 
  createInitialWorkflowState,
  DEFAULT_DRIVE_DESTINATION,
} from '@/types/delivery';
import { buildBudgetFileName } from '@/lib/delivery/file-builder';
import { buildBudgetEmailSubject, buildBudgetEmailBody } from '@/lib/delivery/email-builder';
import { runDeliveryWorkflow, validateDeliverySettings, retryWorkflowStep } from '@/lib/delivery/workflow';

export function DeliveryPanel() {
  const { budget, refreshBudgetNumber, resetBudget } = useBudget();
  const company = COMPANIES[budget.companyId];
  
  // Settings state
  const [settings, setSettings] = useState<DeliverySettings>(() => getDefaultDeliverySettings());
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  
  // Workflow state
  const [workflowState, setWorkflowState] = useState<DeliveryWorkflowState>(() => createInitialWorkflowState());
  const [workflowResult, setWorkflowResult] = useState<DeliveryWorkflowResult | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Preview/confirmation modal state
  const [pendingAction, setPendingAction] = useState<null | 'full' | 'drive' | 'email'>(null);
  
  // Auto-fill settings based on budget data
  useEffect(() => {
    const fileName = buildBudgetFileName(budget, settings.fileFormat);
    const emailSubject = buildBudgetEmailSubject(budget);
    const emailBody = buildBudgetEmailBody(budget);
    const emailTo = budget.customer.email || '';
    
    // Use real Google Drive folder ID from company config
    const rootFolder = company.driveFolderId;
    const rootFolderName = `Presupuestos ${company.name}`;
    
    setSettings(prev => ({
      ...prev,
      fileName,
      emailSubject,
      emailBody,
      emailTo,
      driveDestination: {
        ...prev.driveDestination,
        rootFolder,
        rootFolderName,
      },
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [budget.id, budget.customer.email, budget.companyId, settings.fileFormat]);
  
  // Update file name when format changes
  const handleFormatChange = (format: FileFormat) => {
    const fileName = buildBudgetFileName(budget, format);
    setSettings(prev => ({
      ...prev,
      fileFormat: format,
      fileName,
    }));
  };
  
  // Validate before running
  const validate = useCallback(() => {
    const result = validateDeliverySettings(budget, settings);
    setValidationErrors(result.errors);
    return result.valid;
  }, [budget, settings]);
  
  // Build effective settings for a given action (used by modal preview + execute)
  const settingsForAction = useCallback((action: 'full' | 'drive' | 'email'): DeliverySettings => {
    if (action === 'drive') return { ...settings, saveToDrive: true, sendEmail: false };
    if (action === 'email') return { ...settings, saveToDrive: false, sendEmail: true };
    return settings;
  }, [settings]);

  // Open preview modal after validation
  const handleRunWorkflow = () => {
    if (!validate()) return;
    setPendingAction('full');
  };

  const handleSaveToDrive = () => {
    const driveOnly = settingsForAction('drive');
    const validation = validateDeliverySettings(budget, driveOnly);
    if (!validation.valid) {
      setValidationErrors(validation.errors);
      return;
    }
    setValidationErrors([]);
    setPendingAction('drive');
  };

  const handleSendEmail = () => {
    const emailOnly = settingsForAction('email');
    const validation = validateDeliverySettings(budget, emailOnly);
    if (!validation.valid) {
      setValidationErrors(validation.errors);
      return;
    }
    setValidationErrors([]);
    setPendingAction('email');
  };

  // Execute the workflow after user confirms in the preview modal
  const handleConfirmSend = async () => {
    if (!pendingAction) return;
    const effective = settingsForAction(pendingAction);
    setPendingAction(null);

    setWorkflowResult(null);
    setWorkflowState(createInitialWorkflowState());

    const result = await runDeliveryWorkflow(
      budget,
      effective,
      (state) => setWorkflowState(state)
    );

    setWorkflowResult(result);

    if (pendingAction === 'full' && result.success) {
      // Archive sent budget as "pending" and clear form for next budget
      try {
        saveBudget({
          ...budget,
          status: 'pending',
          sentAt: new Date().toISOString(),
        });
      } catch (e) {
        console.error('Failed to archive sent budget:', e);
      }
      toast.success('Presupuesto enviado y archivado como pendiente');
      // Slight delay so the user sees the success state before the form clears
      setTimeout(() => {
        resetBudget();
        setWorkflowResult(null);
        setWorkflowState(createInitialWorkflowState());
      }, 1500);
    } else if (pendingAction === 'full' && result.steps.generate.success) {
      // Partial success: file generated but a step failed. Refresh number so retries don't reuse it.
      refreshBudgetNumber();
    }
  };
  
  // Retry a failed step
  const handleRetry = async (stepId: 'drive' | 'email') => {
    if (!workflowResult?.generatedFile) return;
    
    const result = await retryWorkflowStep(
      stepId,
      budget,
      settings,
      workflowResult.generatedFile,
      (state) => setWorkflowState(state)
    );
    
    if (result.success) {
      // Update the result to reflect success
      setWorkflowResult(prev => prev ? {
        ...prev,
        steps: {
          ...prev.steps,
          [stepId]: { success: true, skipped: false },
        },
        partialSuccess: false,
        success: true,
        summary: 'Proceso completado exitosamente',
      } : null);
    }
  };
  
  // Get step icon and color
  const getStepDisplay = (step: DeliveryWorkflowState['steps']['generate']) => {
    switch (step.status) {
      case 'pending':
        return { icon: <div className="w-4 h-4 rounded-full border-2 border-muted-foreground" />, color: 'text-muted-foreground' };
      case 'running':
        return { icon: <Loader2 className="w-4 h-4 animate-spin" />, color: 'text-primary' };
      case 'success':
        return { icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-green-600' };
      case 'error':
        return { icon: <AlertCircle className="w-4 h-4" />, color: 'text-red-600' };
      case 'skipped':
        return { icon: <div className="w-4 h-4 rounded-full bg-muted" />, color: 'text-muted-foreground' };
      default:
        return { icon: null, color: '' };
    }
  };
  
  const isRunning = workflowState.isRunning;
  
  // Build display path for Drive
  const buildDisplayPath = () => {
    const parts = [settings.driveDestination.rootFolderName || `Presupuestos ${company.name}`];
    if (settings.driveDestination.yearSubfolder) {
      parts.push(new Date().getFullYear().toString());
    }
    if (settings.driveDestination.clientSubfolder && budget.customer.name) {
      parts.push(budget.customer.name);
    }
    return parts.join('/');
  };
  
  const drivePath = buildDisplayPath();
  
  return (
    <Card className="border-2">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Send className="w-5 h-5" style={{ color: company.primaryColor }} />
          Entrega del Presupuesto
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Format and File Name */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Formato del archivo</Label>
            <Select 
              value={settings.fileFormat} 
              onValueChange={(v) => handleFormatChange(v as FileFormat)}
              disabled={isRunning}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="docx">DOCX (Word)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Nombre del archivo</Label>
            <div className="flex gap-2">
              <Input
                value={settings.fileName}
                onChange={(e) => setSettings(prev => ({ ...prev, fileName: e.target.value }))}
                disabled={isRunning}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  const fileName = buildBudgetFileName(budget, settings.fileFormat);
                  setSettings(prev => ({ ...prev, fileName }));
                }}
                disabled={isRunning}
                title="Regenerar nombre"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
        
        {/* Actions Toggles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-blue-600" />
              <Label htmlFor="saveToDrive" className="cursor-pointer">Guardar en Google Drive</Label>
            </div>
            <Switch
              id="saveToDrive"
              checked={settings.saveToDrive}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, saveToDrive: checked }))}
              disabled={isRunning}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-green-600" />
              <Label htmlFor="sendEmail" className="cursor-pointer">Enviar por email al cliente</Label>
            </div>
            <Switch
              id="sendEmail"
              checked={settings.sendEmail}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, sendEmail: checked }))}
              disabled={isRunning}
            />
          </div>
        </div>
        
        {/* Drive Settings */}
        {settings.saveToDrive && (
          <div className="space-y-3 p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
                <FolderOpen className="w-4 h-4" />
                Configuración de Google Drive
              </div>
              <a 
                href={`https://drive.google.com/drive/folders/${company.driveFolderId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
              >
                Ver carpeta
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Carpeta raíz: {settings.driveDestination.rootFolderName || `Presupuestos ${company.name}`}</Label>
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="yearSubfolder"
                  checked={settings.driveDestination.yearSubfolder}
                  onCheckedChange={(checked) => setSettings(prev => ({
                    ...prev,
                    driveDestination: { ...prev.driveDestination, yearSubfolder: checked }
                  }))}
                  disabled={isRunning}
                />
                <Label htmlFor="yearSubfolder" className="text-sm cursor-pointer">Subcarpeta por año</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="clientSubfolder"
                  checked={settings.driveDestination.clientSubfolder}
                  onCheckedChange={(checked) => setSettings(prev => ({
                    ...prev,
                    driveDestination: { ...prev.driveDestination, clientSubfolder: checked }
                  }))}
                  disabled={isRunning}
                />
                <Label htmlFor="clientSubfolder" className="text-sm cursor-pointer">Subcarpeta por cliente</Label>
              </div>
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <span>Ruta:</span>
              <code className="bg-muted px-1 py-0.5 rounded">{drivePath}/{settings.fileName}</code>
            </div>
          </div>
        )}
        
        {/* Email Settings */}
        {settings.sendEmail && (
          <div className="space-y-4 p-4 border rounded-lg">
            <div className="flex items-center gap-2 text-sm font-medium text-green-600">
              <Mail className="w-4 h-4" />
              Configuración del Email
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Destinatario</Label>
                <Input
                  type="email"
                  value={settings.emailTo}
                  onChange={(e) => setSettings(prev => ({ ...prev, emailTo: e.target.value }))}
                  disabled={isRunning}
                  placeholder="cliente@empresa.com"
                />
              </div>
              <div className="space-y-2">
                <Label>CC (opcional)</Label>
                <Input
                  type="text"
                  value={settings.emailCc || ''}
                  onChange={(e) => setSettings(prev => ({ ...prev, emailCc: e.target.value }))}
                  disabled={isRunning}
                  placeholder="copia@empresa.com, otro@empresa.com"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Asunto</Label>
              <Input
                value={settings.emailSubject}
                onChange={(e) => setSettings(prev => ({ ...prev, emailSubject: e.target.value }))}
                disabled={isRunning}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Cuerpo del mensaje</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const body = buildBudgetEmailBody(budget);
                    setSettings(prev => ({ ...prev, emailBody: body }));
                  }}
                  disabled={isRunning}
                  className="text-xs"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Regenerar
                </Button>
              </div>
              <Textarea
                value={settings.emailBody}
                onChange={(e) => setSettings(prev => ({ ...prev, emailBody: e.target.value }))}
                disabled={isRunning}
                rows={3}
              />
            </div>
          </div>
        )}
        
        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-700 font-medium mb-1">
              <AlertCircle className="w-4 h-4" />
              Errores de validación
            </div>
            <ul className="list-disc list-inside text-sm text-red-600 space-y-1">
              {validationErrors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Workflow Progress */}
        {(workflowState.isRunning || workflowResult) && (
          <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
            <div className="text-sm font-medium">Estado del proceso</div>
            <div className="space-y-2">
              {/* Generate step */}
              <div className="flex items-center gap-3">
                <span className={getStepDisplay(workflowState.steps.generate).color}>
                  {getStepDisplay(workflowState.steps.generate).icon}
                </span>
                <span className="text-sm flex-1">{workflowState.steps.generate.name}</span>
                {workflowState.steps.generate.message && (
                  <span className="text-xs text-muted-foreground">{workflowState.steps.generate.message}</span>
                )}
              </div>
              
              {/* Drive step */}
              <div className="flex items-center gap-3">
                <span className={getStepDisplay(workflowState.steps.drive).color}>
                  {getStepDisplay(workflowState.steps.drive).icon}
                </span>
                <span className="text-sm flex-1">{workflowState.steps.drive.name}</span>
                {workflowState.steps.drive.status === 'error' && workflowResult?.generatedFile && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRetry('drive')}
                    className="text-xs"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Reintentar
                  </Button>
                )}
                {workflowState.steps.drive.message && (
                  <span className="text-xs text-muted-foreground">{workflowState.steps.drive.message}</span>
                )}
              </div>
              
              {/* Email step */}
              <div className="flex items-center gap-3">
                <span className={getStepDisplay(workflowState.steps.email).color}>
                  {getStepDisplay(workflowState.steps.email).icon}
                </span>
                <span className="text-sm flex-1">{workflowState.steps.email.name}</span>
                {workflowState.steps.email.status === 'error' && workflowResult?.generatedFile && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRetry('email')}
                    className="text-xs"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Reintentar
                  </Button>
                )}
                {workflowState.steps.email.message && (
                  <span className="text-xs text-muted-foreground">{workflowState.steps.email.message}</span>
                )}
              </div>
            </div>
            
            {/* Result summary */}
            {workflowResult && (
              <div className={`mt-3 p-2 rounded text-sm ${
                workflowResult.success 
                  ? 'bg-green-100 text-green-800' 
                  : workflowResult.partialSuccess 
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
              }`}>
                {workflowResult.summary}
              </div>
            )}
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 pt-2">
          <Button
            onClick={handleRunWorkflow}
            disabled={isRunning || (!settings.saveToDrive && !settings.sendEmail)}
            className="flex-1 text-white"
            style={{ backgroundColor: company.primaryColor }}
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                {settings.saveToDrive && settings.sendEmail 
                  ? 'Guardar y enviar presupuesto'
                  : settings.saveToDrive 
                    ? 'Guardar en Drive'
                    : 'Enviar por email'}
              </>
            )}
          </Button>
        </div>
        
        {/* Secondary Actions */}
        <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full text-muted-foreground">
              {isAdvancedOpen ? <ChevronUp className="w-4 h-4 mr-2" /> : <ChevronDown className="w-4 h-4 mr-2" />}
              Acciones individuales
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveToDrive}
                disabled={isRunning}
              >
                <HardDrive className="w-4 h-4 mr-2" />
                Solo guardar en Drive
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSendEmail}
                disabled={isRunning}
              >
                <Mail className="w-4 h-4 mr-2" />
                Solo enviar email
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>

      {/* Preview / confirmation modal — wide two-column layout */}
      <Dialog open={pendingAction !== null} onOpenChange={(open) => { if (!open) setPendingAction(null); }}>
        <DialogContent
          showCloseButton={true}
          className="max-w-[96vw] w-full sm:max-w-[92vw] lg:max-w-6xl h-[92vh] p-0 gap-0 overflow-hidden flex flex-col"
        >
          {/* Hidden title for screen readers */}
          <DialogTitle className="sr-only">Confirmar envío del presupuesto</DialogTitle>

          {/* ── Header strip ── */}
          <div
            className="flex items-center justify-between px-5 py-3 border-b shrink-0"
            style={{ borderTopLeftRadius: 'inherit', borderTopRightRadius: 'inherit' }}
          >
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4" style={{ color: company.primaryColor }} />
              <span className="font-semibold text-sm">Confirmar envío</span>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                — Revisá el documento y los datos antes de confirmar
              </span>
            </div>
          </div>

          {/* ── Body: two columns ── */}
          <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">

            {/* LEFT — live document preview */}
            <div className="flex-1 min-h-0 border-b lg:border-b-0 lg:border-r overflow-hidden bg-slate-100">
              <div className="h-full overflow-y-auto">
                <div className="py-4 px-2 sm:px-4 flex justify-center">
                  {/* Scale-down wrapper so the A4 preview fits neatly */}
                  <div className="w-full max-w-[640px] origin-top">
                    <BudgetPreview />
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT — delivery details + actions */}
            {pendingAction && (() => {
              const eff = settingsForAction(pendingAction);
              const willDrive = eff.saveToDrive;
              const willEmail = eff.sendEmail;
              return (
                <div className="w-full lg:w-80 xl:w-96 shrink-0 flex flex-col">
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 text-sm">

                    {/* File */}
                    <div className="rounded-xl border bg-muted/30 p-3 space-y-1">
                      <div className="font-medium flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground mb-2">
                        <FileText className="w-3.5 h-3.5" />
                        Archivo a generar
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Formato</span>
                        <span className="font-mono font-medium">{eff.fileFormat.toUpperCase()}</span>
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-muted-foreground shrink-0">Nombre</span>
                        <span className="font-mono text-xs text-right break-all">{eff.fileName}</span>
                      </div>
                    </div>

                    {/* Drive */}
                    {willDrive && (
                      <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 space-y-1">
                        <div className="font-medium flex items-center gap-2 text-xs uppercase tracking-wide text-blue-600 mb-2">
                          <HardDrive className="w-3.5 h-3.5" />
                          Google Drive
                        </div>
                        <div className="text-xs text-muted-foreground break-all">
                          <code className="bg-white/80 px-1.5 py-0.5 rounded border border-blue-100">
                            {drivePath}/{eff.fileName}
                          </code>
                        </div>
                      </div>
                    )}

                    {/* Email */}
                    {willEmail && (
                      <div className="rounded-xl border border-green-100 bg-green-50/60 p-3 space-y-2">
                        <div className="font-medium flex items-center gap-2 text-xs uppercase tracking-wide text-green-700 mb-2">
                          <Mail className="w-3.5 h-3.5" />
                          Email
                        </div>
                        <div className="space-y-1 text-xs">
                          <div className="flex gap-2">
                            <span className="text-muted-foreground w-10 shrink-0">Para</span>
                            <span className="font-mono break-all">{eff.emailTo}</span>
                          </div>
                          {eff.emailCc && (
                            <div className="flex gap-2">
                              <span className="text-muted-foreground w-10 shrink-0">CC</span>
                              <span className="font-mono break-all">{eff.emailCc}</span>
                            </div>
                          )}
                          <div className="flex gap-2">
                            <span className="text-muted-foreground w-10 shrink-0">Asunto</span>
                            <span className="break-words">{eff.emailSubject}</span>
                          </div>
                        </div>
                        <div className="pt-1">
                          <div className="text-xs text-muted-foreground mb-1">Mensaje</div>
                          <pre className="text-xs whitespace-pre-wrap bg-white/80 border border-green-100 rounded-lg p-2 max-h-32 overflow-y-auto font-sans leading-relaxed">
{eff.emailBody}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Sticky action buttons */}
                  <div className="border-t p-4 space-y-2 shrink-0 bg-background">
                    <Button
                      onClick={handleConfirmSend}
                      disabled={isRunning}
                      className="w-full text-white shadow-sm"
                      style={{ backgroundColor: company.primaryColor }}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Confirmar y enviar
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setPendingAction(null)}
                      disabled={isRunning}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
