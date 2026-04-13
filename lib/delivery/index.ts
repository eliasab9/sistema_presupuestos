// Delivery module exports

// Types
export type {
  FileFormat,
  DeliveryStepStatus,
  DeliveryStep,
  GeneratedBudgetFile,
  DriveDestination,
  DriveUploadResult,
  EmailRecipient,
  EmailPayload,
  EmailSendResult,
  DeliverySettings,
  DeliveryWorkflowState,
  DeliveryWorkflowResult,
} from '@/types/delivery';

export {
  DEFAULT_DRIVE_DESTINATION,
  DEFAULT_EMAIL_SUBJECT,
  getDefaultDeliverySettings,
  createInitialWorkflowState,
} from '@/types/delivery';

// File building
export {
  sanitizeForFileName,
  buildBudgetFileName,
  buildDatePrefixedFileName,
  buildDrivePath,
  getFullDrivePath,
  validateFileName,
} from './file-builder';

// Email building
export {
  buildBudgetEmailSubject,
  buildBudgetEmailBody,
  buildEquipmentDescription,
  buildEmailPayloadData,
  validateEmail,
  parseEmailList,
  validateEmailRequirements,
} from './email-builder';

// Google Drive
export {
  uploadFileToDrive,
  checkDriveAuth,
  getDriveFileUrl,
  getDriveFolderUrl,
  startDriveAuth,
} from './google-drive';

// Email service
export {
  initializeEmailService,
  getEmailConfig,
  isEmailServiceReady,
  sendEmail,
  sendBudgetEmail,
  sendTestEmail,
  getEmailStatus,
} from './email-service';

// Workflow
export {
  validateDeliverySettings,
  runDeliveryWorkflow,
  retryWorkflowStep,
} from './workflow';
