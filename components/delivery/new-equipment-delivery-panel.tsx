'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Send,
  HardDrive,
  Mail,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ExternalLink,
  FolderOpen,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useNewEquipment } from '@/lib/new-equipment-context';
import { COMPANIES } from '@/types/budget';
import type { DeliverySettings, DeliveryWorkflowState, DeliveryWorkflowResult, DeliveryStep } from '@/types/delivery';
import { getDefaultDeliverySettings, createInitialWorkflowState } from '@/types/delivery';
import { exportNewEquipmentToPDFBlob } from '@/lib/document/export-pdf';
import { uploadFileToDrive } from '@/lib/delivery/google-drive';
import { sendBudgetEmail } from '@/lib/delivery/email-service';
import type { EmailSendResult } from '@/types/delivery';
import { parseEmailList } from '@/lib/delivery/email-builder';
import { registerNewEquipmentBudgetInSheets } from '@/lib/delivery/sheets-service';
import type { NewEquipmentBudget } from '@/types/budget';

// Build file name for new equipment budget
function buildNewEquipmentFileName(budget: NewEquipmentBudget): string {
  const rawName = budget.customer.name || 'CLIENTE';
  const clientPart = rawName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, ' ')
    .trim()
    .split(/\s+/)[0]
    .toUpperCase()
    .substring(0, 20);
  const numPart = budget.meta.number ? `cot ${budget.meta.number}` : 'cot 0';
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yy = String(now.getFullYear()).slice(-2);
  return `${clientPart}_${numPart}_${dd}-${mm}-${yy}.pdf`;
}

function buildNewEquipmentEmailSubject(): string {
  return 'Presupuesto equipo nuevo';
}

function buildNewEquipmentEmailBody(budget: NewEquipmentBudget): string {
  const itemSummary = budget.items.length > 0
    ? budget.items.map(i => `${i.quantity > 1 ? `${i.quantity}x ` : ''}${i.type.replace(/_/g, ' ')}${i.brand ? ` ${i.brand}` : ''}${i.model ? ` ${i.model}` : ''}`).join(', ')
    : 'los equipos detallados en el presupuesto';
  return `Estimados, adjunto aquí el presupuesto por ${itemSummary}.`;
}

function getStepDisplay(step: DeliveryStep) {
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
}

export function NewEquipmentDeliveryPanel() {
  const { budget, refreshBudgetNumber } = useNewEquipment();
  const company = COMPANIES[budget.companyId];

  const [settings, setSettings] = useState<DeliverySettings>(() => getDefaultDeliverySettings());
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [workflowState, setWorkflowState] = useState<DeliveryWorkflowState>(() => createInitialWorkflowState());
  const [workflowResult, setWorkflowResult] = useState<DeliveryWorkflowResult | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Auto-fill settings from budget data
  useEffect(() => {
    setSettings(prev => ({
      ...prev,
      fileName: buildNewEquipmentFileName(budget),
      emailSubject: buildNewEquipmentEmailSubject(),
      emailBody: buildNewEquipmentEmailBody(budget),
      emailTo: budget.customer.email || '',
      driveDestination: {
        ...prev.driveDestination,
        rootFolder: company.driveNewEquipmentFolderId ?? company.driveFolderId,
        rootFolderName: `Presupuestos ${company.name}`,
      },
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [budget.id, budget.customer.email, budget.companyId]);

  const validate = useCallback(() => {
    const errors: string[] = [];
    if (!settings.fileName) errors.push('El nombre del archivo es requerido');
    if (settings.sendEmail) {
      if (!settings.emailTo) errors.push('El email del destinatario es requerido');
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.emailTo)) errors.push('El formato del email no es válido');
      if (!settings.emailSubject) errors.push('El asunto del email es requerido');
      if (!settings.emailBody) errors.push('El cuerpo del email es requerido');
    }
    if (settings.saveToDrive && !settings.driveDestination.rootFolder) {
      errors.push('La carpeta destino de Drive es requerida');
    }
    if (!settings.saveToDrive && !settings.sendEmail) {
      errors.push('Debe seleccionar al menos una acción');
    }
    setValidationErrors(errors);
    return errors.length === 0;
  }, [settings]);

  const runWorkflow = async () => {
    if (!validate()) return;

    setWorkflowResult(null);
    const initState = createInitialWorkflowState();
    initState.isRunning = true;
    setWorkflowState({ ...initState });

    const result: DeliveryWorkflowResult = {
      success: false,
      partialSuccess: false,
      steps: {
        generate: { success: false },
        drive: { success: false, skipped: !settings.saveToDrive },
        email: { success: false, skipped: !settings.sendEmail },
      },
      generatedFile: null,
      summary: '',
    };

    let fileBlob: Blob | null = null;

    // Step 1: Generate PDF
    setWorkflowState(prev => ({ ...prev, currentStep: 'generate', steps: { ...prev.steps, generate: { ...prev.steps.generate, status: 'running', startedAt: new Date().toISOString() } } }));
    try {
      fileBlob = await exportNewEquipmentToPDFBlob(budget);
      result.generatedFile = { id: `file_${Date.now()}`, name: settings.fileName, format: 'pdf', blob: fileBlob, size: fileBlob.size, createdAt: new Date().toISOString(), budgetId: budget.id, budgetNumber: budget.meta.number };
      result.steps.generate.success = true;
      setWorkflowState(prev => ({ ...prev, generatedFile: result.generatedFile, steps: { ...prev.steps, generate: { ...prev.steps.generate, status: 'success', completedAt: new Date().toISOString(), message: `Archivo generado: ${settings.fileName}` } } }));
      // Registrar en Sheets
      await registerNewEquipmentBudgetInSheets(budget);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al generar el archivo';
      result.steps.generate.error = msg;
      setWorkflowState(prev => ({ ...prev, isRunning: false, steps: { ...prev.steps, generate: { ...prev.steps.generate, status: 'error', completedAt: new Date().toISOString(), error: msg } } }));
      result.summary = `Error en generación: ${msg}`;
      setWorkflowResult(result);
      return;
    }

    // Step 2: Save to Drive
    if (settings.saveToDrive && fileBlob) {
      setWorkflowState(prev => ({ ...prev, currentStep: 'drive', steps: { ...prev.steps, drive: { ...prev.steps.drive, status: 'running', startedAt: new Date().toISOString() } } }));
      try {
        const subfolders: string[] = [];
        if (settings.driveDestination.yearSubfolder) subfolders.push(new Date().getFullYear().toString());
        if (settings.driveDestination.clientSubfolder && budget.customer.name) subfolders.push(budget.customer.name);
        const uploadResult = await uploadFileToDrive(fileBlob, settings.fileName, company.driveNewEquipmentFolderId ?? company.driveFolderId, subfolders.join('/'));
        if (uploadResult.success) {
          result.steps.drive.success = true;
          const displayPath = [`Presupuestos ${company.name}`, ...subfolders, settings.fileName].join('/');
          setWorkflowState(prev => ({ ...prev, steps: { ...prev.steps, drive: { ...prev.steps.drive, status: 'success', completedAt: new Date().toISOString(), message: `Guardado en: ${displayPath}` } } }));
        } else {
          result.steps.drive.error = uploadResult.error;
          setWorkflowState(prev => ({ ...prev, steps: { ...prev.steps, drive: { ...prev.steps.drive, status: 'error', completedAt: new Date().toISOString(), error: uploadResult.error } } }));
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error al guardar en Drive';
        result.steps.drive.error = msg;
        setWorkflowState(prev => ({ ...prev, steps: { ...prev.steps, drive: { ...prev.steps.drive, status: 'error', completedAt: new Date().toISOString(), error: msg } } }));
      }
    } else {
      setWorkflowState(prev => ({ ...prev, steps: { ...prev.steps, drive: { ...prev.steps.drive, status: 'skipped', message: 'Omitido por configuración' } } }));
    }

    // Step 3: Send email
    if (settings.sendEmail && fileBlob) {
      setWorkflowState(prev => ({ ...prev, currentStep: 'email', steps: { ...prev.steps, email: { ...prev.steps.email, status: 'running', startedAt: new Date().toISOString() } } }));
      try {
        const ccEmails = settings.emailCc ? parseEmailList(settings.emailCc) : undefined;
        const emailResult: EmailSendResult = await sendBudgetEmail(
          settings.emailTo,
          budget.customer.attention || budget.customer.name,
          settings.emailSubject,
          settings.emailBody,
          { name: settings.fileName, content: fileBlob },
          ccEmails,
          budget.companyId
        );
        if (emailResult.success) {
          result.steps.email.success = true;
          setWorkflowState(prev => ({ ...prev, steps: { ...prev.steps, email: { ...prev.steps.email, status: 'success', completedAt: new Date().toISOString(), message: `Email enviado a: ${settings.emailTo}` } } }));
        } else {
          result.steps.email.error = emailResult.error;
          setWorkflowState(prev => ({ ...prev, steps: { ...prev.steps, email: { ...prev.steps.email, status: 'error', completedAt: new Date().toISOString(), error: emailResult.error } } }));
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error al enviar email';
        result.steps.email.error = msg;
        setWorkflowState(prev => ({ ...prev, steps: { ...prev.steps, email: { ...prev.steps.email, status: 'error', completedAt: new Date().toISOString(), error: msg } } }));
      }
    } else {
      setWorkflowState(prev => ({ ...prev, steps: { ...prev.steps, email: { ...prev.steps.email, status: 'skipped', message: 'Omitido por configuración' } } }));
    }

    // Summary
    const allOk = result.steps.generate.success &&
      (result.steps.drive.success || !settings.saveToDrive) &&
      (result.steps.email.success || !settings.sendEmail);
    const anyOk = result.steps.generate.success || result.steps.drive.success || result.steps.email.success;
    result.success = allOk;
    result.partialSuccess = !allOk && anyOk;
    result.summary = allOk ? 'Proceso completado exitosamente' : result.partialSuccess ? 'Proceso parcialmente completado' : 'El proceso falló';

    setWorkflowResult(result);
    setWorkflowState(prev => ({ ...prev, isRunning: false, currentStep: null }));

    // Refresh number for next budget
    if (result.steps.generate.success) refreshBudgetNumber();
  };

  const isRunning = workflowState.isRunning;
  const drivePath = [
    settings.driveDestination.rootFolderName || `Presupuestos ${company.name}`,
    ...(settings.driveDestination.yearSubfolder ? [new Date().getFullYear().toString()] : []),
    ...(settings.driveDestination.clientSubfolder && budget.customer.name ? [budget.customer.name] : []),
  ].join('/');

  return (
    <Card className="border-2">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Send className="w-5 h-5" style={{ color: company.primaryColor }} />
          Entrega del Presupuesto
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File name */}
        <div className="space-y-2">
          <Label>Nombre del archivo</Label>
          <div className="flex gap-2">
            <Input
              value={settings.fileName}
              onChange={(e) => setSettings(prev => ({ ...prev, fileName: e.target.value }))}
              disabled={isRunning}
              className="flex-1"
            />
            <Button variant="outline" size="icon" disabled={isRunning} onClick={() => setSettings(prev => ({ ...prev, fileName: buildNewEquipmentFileName(budget) }))} title="Regenerar nombre">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Actions toggles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-blue-600" />
              <Label htmlFor="ne-saveToDrive" className="cursor-pointer">Guardar en Google Drive</Label>
            </div>
            <Switch id="ne-saveToDrive" checked={settings.saveToDrive} onCheckedChange={(v) => setSettings(prev => ({ ...prev, saveToDrive: v }))} disabled={isRunning} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-green-600" />
              <Label htmlFor="ne-sendEmail" className="cursor-pointer">Enviar por email al cliente</Label>
            </div>
            <Switch id="ne-sendEmail" checked={settings.sendEmail} onCheckedChange={(v) => setSettings(prev => ({ ...prev, sendEmail: v }))} disabled={isRunning} />
          </div>
        </div>

        {/* Drive settings */}
        {settings.saveToDrive && (
          <div className="space-y-3 p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
                <FolderOpen className="w-4 h-4" />
                Configuración de Google Drive
              </div>
              <a href={`https://drive.google.com/drive/folders/${company.driveNewEquipmentFolderId ?? company.driveFolderId}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                Ver carpeta <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <Label className="text-xs text-muted-foreground">Carpeta raíz: {settings.driveDestination.rootFolderName || `Presupuestos ${company.name}`}</Label>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Switch id="ne-yearSubfolder" checked={settings.driveDestination.yearSubfolder} onCheckedChange={(v) => setSettings(prev => ({ ...prev, driveDestination: { ...prev.driveDestination, yearSubfolder: v } }))} disabled={isRunning} />
                <Label htmlFor="ne-yearSubfolder" className="text-sm cursor-pointer">Subcarpeta por año</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="ne-clientSubfolder" checked={settings.driveDestination.clientSubfolder} onCheckedChange={(v) => setSettings(prev => ({ ...prev, driveDestination: { ...prev.driveDestination, clientSubfolder: v } }))} disabled={isRunning} />
                <Label htmlFor="ne-clientSubfolder" className="text-sm cursor-pointer">Subcarpeta por cliente</Label>
              </div>
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <span>Ruta:</span>
              <code className="bg-muted px-1 py-0.5 rounded">{drivePath}/{settings.fileName}</code>
            </div>
          </div>
        )}

        {/* Email settings */}
        {settings.sendEmail && (
          <div className="space-y-4 p-4 border rounded-lg">
            <div className="flex items-center gap-2 text-sm font-medium text-green-600">
              <Mail className="w-4 h-4" />
              Configuración del Email
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Destinatario</Label>
                <Input type="email" value={settings.emailTo} onChange={(e) => setSettings(prev => ({ ...prev, emailTo: e.target.value }))} disabled={isRunning} placeholder="cliente@empresa.com" />
              </div>
              <div className="space-y-2">
                <Label>CC (opcional)</Label>
                <Input value={settings.emailCc || ''} onChange={(e) => setSettings(prev => ({ ...prev, emailCc: e.target.value }))} disabled={isRunning} placeholder="copia@empresa.com" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Asunto</Label>
              <Input value={settings.emailSubject} onChange={(e) => setSettings(prev => ({ ...prev, emailSubject: e.target.value }))} disabled={isRunning} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Cuerpo del mensaje</Label>
                <Button variant="ghost" size="sm" onClick={() => setSettings(prev => ({ ...prev, emailBody: buildNewEquipmentEmailBody(budget) }))} disabled={isRunning} className="text-xs">
                  <RefreshCw className="w-3 h-3 mr-1" />Regenerar
                </Button>
              </div>
              <Textarea value={settings.emailBody} onChange={(e) => setSettings(prev => ({ ...prev, emailBody: e.target.value }))} disabled={isRunning} rows={3} />
            </div>
          </div>
        )}

        {/* Validation errors */}
        {validationErrors.length > 0 && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-700 font-medium mb-1">
              <AlertCircle className="w-4 h-4" />Errores de validación
            </div>
            <ul className="list-disc list-inside text-sm text-red-600 space-y-1">
              {validationErrors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        )}

        {/* Workflow progress */}
        {(isRunning || workflowResult) && (
          <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
            <div className="text-sm font-medium">Estado del proceso</div>
            <div className="space-y-2">
              {(['generate', 'drive', 'email'] as const).map((step) => (
                <div key={step} className="flex items-center gap-3">
                  <span className={getStepDisplay(workflowState.steps[step]).color}>
                    {getStepDisplay(workflowState.steps[step]).icon}
                  </span>
                  <span className="text-sm flex-1">{workflowState.steps[step].name}</span>
                  {workflowState.steps[step].message && (
                    <span className="text-xs text-muted-foreground">{workflowState.steps[step].message}</span>
                  )}
                </div>
              ))}
            </div>
            {workflowResult && (
              <div className={`mt-3 p-2 rounded text-sm ${workflowResult.success ? 'bg-green-100 text-green-800' : workflowResult.partialSuccess ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                {workflowResult.summary}
              </div>
            )}
          </div>
        )}

        {/* Main action button */}
        <Button
          onClick={runWorkflow}
          disabled={isRunning || (!settings.saveToDrive && !settings.sendEmail)}
          className="w-full text-white"
          style={{ backgroundColor: company.primaryColor }}
        >
          {isRunning ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Procesando...</>
          ) : (
            <><Send className="w-4 h-4 mr-2" />
              {settings.saveToDrive && settings.sendEmail ? 'Guardar y enviar presupuesto' : settings.saveToDrive ? 'Guardar en Drive' : 'Enviar por email'}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
