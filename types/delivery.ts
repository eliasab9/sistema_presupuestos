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
  yearSubfolder: boolean;
  clientSubfolder: boolean;
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
  yearSubfolder: true,
  clientSubfolder: true,
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
