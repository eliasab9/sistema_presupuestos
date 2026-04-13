// Budget delivery workflow orchestrator
// Coordinates workflow: 1) File generation -> 2) Drive upload -> 3) Email send

import type { Budget } from '@/types/budget';
import { COMPANIES } from '@/types/budget';
import type {
  DeliverySettings,
  DeliveryWorkflowState,
  DeliveryWorkflowResult,
  GeneratedBudgetFile,
  DeliveryStep,
} from '@/types/delivery';
import { createInitialWorkflowState } from '@/types/delivery';
import { exportToPDFBlob, exportToDocxBlob } from '@/lib/document/export-pdf';
import { uploadFileToDrive } from './google-drive';
import { sendBudgetEmail } from './email-service';
import { parseEmailList } from './email-builder';
import { registerRepairBudgetInSheets } from './sheets-service';

// Type for workflow progress callback
export type WorkflowProgressCallback = (state: DeliveryWorkflowState) => void;

/**
 * Validate delivery settings before running workflow
 */
export function validateDeliverySettings(
  budget: Budget,
  settings: DeliverySettings
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Validate file name
  if (!settings.fileName) {
    errors.push('El nombre del archivo es requerido');
  }
  
  // Validate email settings if sending email
  if (settings.sendEmail) {
    if (!settings.emailTo) {
      errors.push('El email del destinatario es requerido para enviar');
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(settings.emailTo)) {
        errors.push('El formato del email no es válido');
      }
    }
    
    if (!settings.emailSubject) {
      errors.push('El asunto del email es requerido');
    }
    
    if (!settings.emailBody) {
      errors.push('El cuerpo del email es requerido');
    }
  }
  
  // Validate drive settings if saving to drive
  if (settings.saveToDrive) {
    if (!settings.driveDestination.rootFolder) {
      errors.push('La carpeta destino de Drive es requerida');
    }
  }
  
  // At least one action must be selected
  if (!settings.saveToDrive && !settings.sendEmail) {
    errors.push('Debe seleccionar al menos una acción (guardar en Drive o enviar por email)');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Update a step in the workflow state
 */
function updateStep(
  state: DeliveryWorkflowState,
  stepId: 'generate' | 'drive' | 'email',
  updates: Partial<DeliveryStep>
): DeliveryWorkflowState {
  return {
    ...state,
    steps: {
      ...state.steps,
      [stepId]: {
        ...state.steps[stepId],
        ...updates,
      },
    },
  };
}

/**
 * Run the complete delivery workflow
 * Order: 1) Generate file -> 2) Save to Drive -> 3) Send email
 */
export async function runDeliveryWorkflow(
  budget: Budget,
  settings: DeliverySettings,
  onProgress?: WorkflowProgressCallback
): Promise<DeliveryWorkflowResult> {
  let state = createInitialWorkflowState();
  state.isRunning = true;
  
  const notify = (newState: DeliveryWorkflowState) => {
    state = newState;
    onProgress?.(state);
  };
  
  // Initialize result
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
  
  try {
    // ========================================
    // STEP 1: Generate file
    // ========================================
    state = updateStep(state, 'generate', {
      status: 'running',
      startedAt: new Date().toISOString(),
    });
    state.currentStep = 'generate';
    notify(state);
    
    let fileBlob: Blob;
    try {
      if (settings.fileFormat === 'pdf') {
        fileBlob = await exportToPDFBlob(budget);
      } else {
        fileBlob = await exportToDocxBlob(budget);
      }
      
      const generatedFile: GeneratedBudgetFile = {
        id: `file_${Date.now()}`,
        name: settings.fileName,
        format: settings.fileFormat,
        blob: fileBlob,
        size: fileBlob.size,
        createdAt: new Date().toISOString(),
        budgetId: budget.id,
        budgetNumber: budget.meta.number,
      };
      
      state.generatedFile = generatedFile;
      result.generatedFile = generatedFile;
      result.steps.generate.success = true;

      state = updateStep(state, 'generate', {
        status: 'success',
        completedAt: new Date().toISOString(),
        message: `Archivo generado: ${settings.fileName}`,
      });
      notify(state);

      // Registrar en Google Sheets (no bloquea si falla)
      await registerRepairBudgetInSheets(budget);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al generar el archivo';
      result.steps.generate.error = errorMessage;
      
      state = updateStep(state, 'generate', {
        status: 'error',
        completedAt: new Date().toISOString(),
        error: errorMessage,
      });
      notify(state);
      
      // Cannot continue without file
      result.summary = `Error en generación de archivo: ${errorMessage}`;
      state.isRunning = false;
      notify(state);
      return result;
    }
    
    // ========================================
    // STEP 2: Save to Google Drive
    // ========================================
    if (settings.saveToDrive) {
      state = updateStep(state, 'drive', {
        status: 'running',
        startedAt: new Date().toISOString(),
      });
      state.currentStep = 'drive';
      notify(state);
      
      try {
        // Get the company's root Drive folder ID
        const company = COMPANIES[budget.companyId];
        const rootFolderId = company.driveFolderId;
        
        // Build subfolder path
        const subfolders: string[] = [];
        if (settings.driveDestination.yearSubfolder) {
          subfolders.push(new Date().getFullYear().toString());
        }
        if (settings.driveDestination.clientSubfolder && budget.customer.name) {
          subfolders.push(budget.customer.name);
        }
        const folderPath = subfolders.join('/');
        
        // Upload file via API route (handles folder creation internally)
        const uploadResult = await uploadFileToDrive(
          state.generatedFile!.blob,
          settings.fileName,
          rootFolderId,
          folderPath
        );
        
        state.driveResult = uploadResult;
        
        // Build display path for user
        const displayPath = [
          settings.driveDestination.rootFolderName || `Presupuestos ${company.name}`,
          ...subfolders,
          settings.fileName,
        ].join('/');
        
        if (uploadResult.success) {
          result.steps.drive.success = true;
          result.steps.drive.fileId = uploadResult.fileId;
          result.steps.drive.webViewLink = uploadResult.webViewLink;
          
          state = updateStep(state, 'drive', {
            status: 'success',
            completedAt: new Date().toISOString(),
            message: `Guardado en: ${displayPath}`,
          });
        } else {
          result.steps.drive.error = uploadResult.error;
          
          state = updateStep(state, 'drive', {
            status: 'error',
            completedAt: new Date().toISOString(),
            error: uploadResult.error,
          });
        }
        notify(state);
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error al guardar en Drive';
        result.steps.drive.error = errorMessage;
        
        state = updateStep(state, 'drive', {
          status: 'error',
          completedAt: new Date().toISOString(),
          error: errorMessage,
        });
        notify(state);
      }
    } else {
      state = updateStep(state, 'drive', {
        status: 'skipped',
        message: 'Omitido por configuración',
      });
      notify(state);
    }
    
    // ========================================
    // STEP 3: Send email
    // ========================================
    if (settings.sendEmail) {
      state = updateStep(state, 'email', {
        status: 'running',
        startedAt: new Date().toISOString(),
      });
      state.currentStep = 'email';
      notify(state);
      
      try {
        const ccEmails = settings.emailCc ? parseEmailList(settings.emailCc) : undefined;
        
        const emailResult = await sendBudgetEmail(
          settings.emailTo,
          budget.customer.attention || budget.customer.name,
          settings.emailSubject,
          settings.emailBody,
          {
            name: settings.fileName,
            content: state.generatedFile!.blob,
          },
          ccEmails,
          budget.companyId   // ← empresa → elige la cuenta Gmail correcta
        );
        
        state.emailResult = emailResult;
        
        if (emailResult.success) {
          result.steps.email.success = true;
          result.steps.email.messageId = emailResult.messageId;
          
          state = updateStep(state, 'email', {
            status: 'success',
            completedAt: new Date().toISOString(),
            message: `Email enviado a: ${settings.emailTo}`,
          });
        } else {
          result.steps.email.error = emailResult.error;
          
          state = updateStep(state, 'email', {
            status: 'error',
            completedAt: new Date().toISOString(),
            error: emailResult.error,
          });
        }
        notify(state);
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error al enviar email';
        result.steps.email.error = errorMessage;
        
        state = updateStep(state, 'email', {
          status: 'error',
          completedAt: new Date().toISOString(),
          error: errorMessage,
        });
        notify(state);
      }
    } else {
      state = updateStep(state, 'email', {
        status: 'skipped',
        message: 'Omitido por configuración',
      });
      notify(state);
    }
    
    // ========================================
    // Build summary
    // ========================================
    const successCount = [
      result.steps.generate.success,
      result.steps.drive.success || result.steps.drive.skipped,
      result.steps.email.success || result.steps.email.skipped,
    ].filter(Boolean).length;
    
    const totalSteps = 3;
    const activeSteps = [
      true, // generate always runs
      settings.saveToDrive,
      settings.sendEmail,
    ].filter(Boolean).length;
    
    result.success = successCount === totalSteps;
    result.partialSuccess = successCount > 0 && successCount < totalSteps;
    
    if (result.success) {
      result.summary = 'Proceso completado exitosamente';
    } else if (result.partialSuccess) {
      const failedSteps: string[] = [];
      if (!result.steps.generate.success) failedSteps.push('generación');
      if (!result.steps.drive.success && !result.steps.drive.skipped) failedSteps.push('guardado en Drive');
      if (!result.steps.email.success && !result.steps.email.skipped) failedSteps.push('envío de email');
      result.summary = `Proceso parcial. Falló: ${failedSteps.join(', ')}`;
    } else {
      result.summary = 'El proceso falló';
    }
    
  } finally {
    state.isRunning = false;
    state.currentStep = null;
    notify(state);
  }
  
  return result;
}

/**
 * Retry a failed step in the workflow
 */
export async function retryWorkflowStep(
  stepId: 'drive' | 'email',
  budget: Budget,
  settings: DeliverySettings,
  generatedFile: GeneratedBudgetFile,
  onProgress?: WorkflowProgressCallback
): Promise<{ success: boolean; error?: string }> {
  if (stepId === 'drive') {
    const company = COMPANIES[budget.companyId];
    const rootFolderId = company.driveFolderId;
    
    // Build subfolder path
    const subfolders: string[] = [];
    if (settings.driveDestination.yearSubfolder) {
      subfolders.push(new Date().getFullYear().toString());
    }
    if (settings.driveDestination.clientSubfolder && budget.customer.name) {
      subfolders.push(budget.customer.name);
    }
    const folderPath = subfolders.join('/');
    
    const result = await uploadFileToDrive(
      generatedFile.blob,
      settings.fileName,
      rootFolderId,
      folderPath
    );
    return { success: result.success, error: result.error };
  }
  
  if (stepId === 'email') {
    const ccEmails = settings.emailCc ? parseEmailList(settings.emailCc) : undefined;
    const result = await sendBudgetEmail(
      settings.emailTo,
      budget.customer.attention || budget.customer.name,
      settings.emailSubject,
      settings.emailBody,
      { name: settings.fileName, content: generatedFile.blob },
      ccEmails,
      budget.companyId
    );
    return { success: result.success, error: result.error };
  }
  
  return { success: false, error: 'Paso no válido para reintentar' };
}
