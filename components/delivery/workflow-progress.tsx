'use client';

import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DeliveryWorkflowState, DeliveryWorkflowResult } from '@/types/delivery';

type Step = DeliveryWorkflowState['steps']['generate'];

function stepDisplay(step: Step) {
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

interface WorkflowProgressProps {
  workflowState: DeliveryWorkflowState;
  workflowResult: DeliveryWorkflowResult | null;
  onRetry: (stepId: 'drive' | 'email') => void;
}

export function WorkflowProgress({ workflowState, workflowResult, onRetry }: WorkflowProgressProps) {
  return (
    <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
      <div className="text-sm font-medium">Estado del proceso</div>
      <div className="space-y-2">
        {(['generate', 'drive', 'email'] as const).map((key) => {
          const step = workflowState.steps[key];
          const { icon, color } = stepDisplay(step);
          const canRetry = (key === 'drive' || key === 'email') && step.status === 'error' && workflowResult?.generatedFile;
          return (
            <div key={key} className="flex items-center gap-3">
              <span className={color}>{icon}</span>
              <span className="text-sm flex-1">{step.name}</span>
              {canRetry && (
                <Button variant="ghost" size="sm" onClick={() => onRetry(key)} className="text-xs">
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Reintentar
                </Button>
              )}
              {step.message && (
                <span className="text-xs text-muted-foreground">{step.message}</span>
              )}
            </div>
          );
        })}
      </div>

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
  );
}
