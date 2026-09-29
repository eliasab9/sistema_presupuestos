// Delivery workflow types

export type FileFormat = 'pdf' | 'docx';

export type DeliveryStepStatus = 'pending' | 'running' | 'success' | 'error' | 'skipped';

export interface DeliveryStep {
  id: string;
  name: string;
  status: DeliveryStepStatus;
  message?: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  retryCount: number;
}

export interface GeneratedBudgetFile {
  id: string;
  name: string;
  format: FileFormat;
  blob: Blob;
  size: number;
  createdAt: string;
  budgetId: string;
  budgetNumber: string;
}

export interface DriveDestination {
  rootFolder: string; // Google Drive folder ID
  rootFolderName?: string; // Display name for the folder
  customPath?: string;
  createIfNotExists: boolean;
}

export interface DriveUploadResult {
  success: boolean;
  fileId?: string;
  webViewLink?: string;
  fullPath?: string;
  error?: string;
}

export interface EmailRecipient {
  email: string;
  name?: string;
}

/**
 * Ancla al hilo donde el cliente pidió el presupuesto. Es opcional: cuando el
 * pedido llega por teléfono o WhatsApp el mail sale como una conversación nueva
 * y no se manda ninguno de estos encabezados.
 */
export interface EmailThreadRef {
  /** Message-ID RFC 5322 del mail al que se responde, con los `<>`. */
  messageId: string;
  /** Cadena `References` del padre: los IDs de sus ancestros, separados por espacio. */
  references?: string;
  /** Asunto original, ya sin el `Re:`, para rearmarlo al responder. */
  subject?: string;
  /** threadId de Gmail / conversationId de Outlook. Opaco, se guarda para la fase 2. */
  threadId?: string;
}

export interface EmailPayload {
  to: EmailRecipient[];
  cc?: EmailRecipient[];
  bcc?: EmailRecipient[];
  subject: string;
  body: string;
  attachments: {
    name: string;
    content: Blob;
    contentType: string;
  }[];
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface DeliverySettings {
  // File settings
  fileFormat: FileFormat;
  fileName: string;
  
  // Drive settings
  saveToDrive: boolean;
  driveDestination: DriveDestination;
  
  // Email settings
  sendEmail: boolean;
  emailTo: string;
  emailCc?: string;
  emailSubject: string;
  emailBody: string;
  // Optional file attached alongside the email signature (e.g. logo/banner).
  // Blob used at send time; fileName for display.
  emailSignatureAttachment?: { fileName: string; file: Blob };
  // Mail del cliente al que se responde. Sin esto el envío es una conversación nueva.
  emailThread?: EmailThreadRef;
}

export interface DeliveryWorkflowState {
  isRunning: boolean;
  currentStep: string | null;
  steps: {
    generate: DeliveryStep;
    drive: DeliveryStep;
    email: DeliveryStep;
  };
  generatedFile: GeneratedBudgetFile | null;
  driveResult: DriveUploadResult | null;
  emailResult: EmailSendResult | null;
}

export interface DeliveryWorkflowResult {
  success: boolean;
  partialSuccess: boolean;
  steps: {
    generate: { success: boolean; error?: string };
    drive: { success: boolean; skipped: boolean; error?: string; fileId?: string; webViewLink?: string };
    email: { success: boolean; skipped: boolean; error?: string; messageId?: string };
  };
  generatedFile: GeneratedBudgetFile | null;
  summary: string;
}

// Default settings
export const DEFAULT_DRIVE_DESTINATION: DriveDestination = {
  rootFolder: 'Presupuestos BEMEC',
  createIfNotExists: true,
};

export const DEFAULT_EMAIL_SUBJECT = 'Presupuesto reparación';

export function getDefaultDeliverySettings(): DeliverySettings {
  return {
    fileFormat: 'pdf',
    fileName: '',
    saveToDrive: true,
    driveDestination: { ...DEFAULT_DRIVE_DESTINATION },
    sendEmail: true,
    emailTo: '',
    emailCc: '',
    emailSubject: DEFAULT_EMAIL_SUBJECT,
    emailBody: '',
  };
}

export function createInitialWorkflowState(): DeliveryWorkflowState {
  return {
    isRunning: false,
    currentStep: null,
    steps: {
      generate: { id: 'generate', name: 'Generando archivo', status: 'pending', retryCount: 0 },
      drive: { id: 'drive', name: 'Guardando en Drive', status: 'pending', retryCount: 0 },
      email: { id: 'email', name: 'Enviando email', status: 'pending', retryCount: 0 },
    },
    generatedFile: null,
    driveResult: null,
    emailResult: null,
  };
}
