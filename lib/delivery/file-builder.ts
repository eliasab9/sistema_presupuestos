// File name and path building utilities

import type { Budget } from '@/types/budget';
import type { DriveDestination, FileFormat } from '@/types/delivery';
import { COMPANIES } from '@/types/budget';

/**
 * Sanitize a string for use in file names
 * Removes special characters and replaces spaces with underscores
 */
export function sanitizeForFileName(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/_+/g, '_') // Remove multiple underscores
    .trim();
}

/**
 * Build the budget file name.
 * Format: CLIENTE_cot NNN_DD-MM-YY.[format]
 * Example: ELIAS_cot 945_12-04-26.pdf
 */
export function buildBudgetFileName(budget: Budget, format: FileFormat): string {
  // Client: first word of name, uppercased, accents removed
  const rawName = budget.customer.name || 'CLIENTE';
  const clientPart = rawName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, ' ')
    .trim()
    .split(/\s+/)[0]
    .toUpperCase()
    .substring(0, 20);

  // Budget number
  const numPart = budget.meta.number ? `cot ${budget.meta.number}` : 'cot 0';

  // Date: today in DD-MM-YY
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yy = String(now.getFullYear()).slice(-2);
  const datePart = `${dd}-${mm}-${yy}`;

  return `${clientPart}_${numPart}_${datePart}.${format}`;
}

/**
 * Alias that uses the same standard format as buildBudgetFileName.
 * Kept for backwards compatibility with any callers.
 */
export function buildDatePrefixedFileName(budget: Budget, format: FileFormat): string {
  return buildBudgetFileName(budget, format);
}

/**
 * Build the Google Drive folder path for the budget
 */
export function buildDrivePath(
  budget: Budget,
  destination: DriveDestination
): string {
  const pathParts: string[] = [];
  
  // Root folder (use company-specific folder)
  const company = COMPANIES[budget.companyId];
  const rootFolder = destination.rootFolder || `Presupuestos ${company.name}`;
  pathParts.push(rootFolder);
  
  // Year subfolder
  if (destination.yearSubfolder) {
    const year = budget.meta.date 
      ? new Date(budget.meta.date).getFullYear().toString()
      : new Date().getFullYear().toString();
    pathParts.push(year);
  }
  
  // Client subfolder
  if (destination.clientSubfolder && budget.customer.name) {
    const clientFolder = sanitizeForFileName(budget.customer.name);
    pathParts.push(clientFolder);
  }
  
  // Custom path override
  if (destination.customPath) {
    return destination.customPath;
  }
  
  return pathParts.join('/');
}

/**
 * Get the full file path in Drive
 */
export function getFullDrivePath(
  budget: Budget,
  destination: DriveDestination,
  fileName: string
): string {
  const folderPath = buildDrivePath(budget, destination);
  return `${folderPath}/${fileName}`;
}

/**
 * Validate file name
 */
export function validateFileName(fileName: string): { valid: boolean; error?: string } {
  if (!fileName) {
    return { valid: false, error: 'El nombre del archivo es requerido' };
  }
  
  if (fileName.length > 200) {
    return { valid: false, error: 'El nombre del archivo es demasiado largo (máx. 200 caracteres)' };
  }
  
  const invalidChars = /[<>:"/\\|?*]/;
  if (invalidChars.test(fileName)) {
    return { valid: false, error: 'El nombre contiene caracteres no válidos' };
  }
  
  return { valid: true };
}
