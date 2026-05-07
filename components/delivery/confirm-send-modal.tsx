'use client';

import { Send, FileText, HardDrive, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { BudgetPreview } from '@/components/preview/budget-preview';
import type { DeliverySettings } from '@/types/delivery';
import type { Company } from '@/types/budget';

interface ConfirmSendModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingAction: 'full' | 'drive' | 'email';
  effectiveSettings: DeliverySettings;
  drivePath: string;
  company: Company;
  isRunning: boolean;
  onConfirm: () => void;
}

export function ConfirmSendModal({
  open,
  onOpenChange,
  pendingAction,
  effectiveSettings: eff,
  drivePath,
  company,
  isRunning,
  onConfirm,
}: ConfirmSendModalProps) {
  const willDrive = eff.saveToDrive;
  const willEmail = eff.sendEmail;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={true}
        className="max-w-[96vw] w-full sm:max-w-[92vw] lg:max-w-6xl h-[92vh] p-0 gap-0 overflow-hidden flex flex-col"
      >
        <DialogTitle className="sr-only">Confirmar envío del presupuesto</DialogTitle>

        {/* Header */}
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

        {/* Body: two columns */}
        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">

          {/* LEFT — live document preview */}
          <div className="flex-1 min-h-0 border-b lg:border-b-0 lg:border-r overflow-hidden bg-slate-100">
            <div className="h-full overflow-y-auto">
              <div className="py-4 px-2 sm:px-4 flex justify-center">
                <div className="w-full max-w-[640px] origin-top">
                  <BudgetPreview />
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT — delivery details + actions */}
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
                onClick={onConfirm}
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
                onClick={() => onOpenChange(false)}
                disabled={isRunning}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
