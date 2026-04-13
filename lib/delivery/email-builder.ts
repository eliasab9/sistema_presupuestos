// Email content building utilities

import type { Budget } from '@/types/budget';
import { EQUIPMENT_TYPE_LABELS } from '@/types/budget';

/**
 * Build the email subject for a budget
 */
export function buildBudgetEmailSubject(budget: Budget): string {
  // Default subject as requested
  return 'Presupuesto reparación';
}

/**
 * Build the equipment description for the email body
 * Handles missing data gracefully with fallbacks
 */
export function buildEquipmentDescription(budget: Budget): string {
  const parts: string[] = [];
  
  // Equipment type
  if (budget.equipment.type) {
    const typeLabel = EQUIPMENT_TYPE_LABELS[budget.equipment.type] || budget.equipment.type;
    parts.push(typeLabel.toLowerCase());
  }
  
  // Subtype (if exists)
  if (budget.equipment.subtype) {
    parts.push(budget.equipment.subtype);
  }
  
  // Model
  if (budget.equipment.model) {
    parts.push(`modelo ${budget.equipment.model}`);
  }
  
  // Brand
  if (budget.equipment.brand) {
    parts.push(`marca ${budget.equipment.brand}`);
  }
  
  // Fallback if no equipment info
  if (parts.length === 0) {
    return 'el equipo detallado en el presupuesto';
  }
  
  // Build description based on available parts
  if (parts.length === 1) {
    return `del ${parts[0]}`;
  }
  
  // Join with proper grammar
  // e.g., "de la bomba centrífuga modelo X, marca Y"
  const equipmentType = parts[0];
  const details = parts.slice(1).join(', ');
  
  // Use "del" for masculine, "de la" for feminine equipment types
  const feminineTypes = ['bomba', 'electrobomba'];
  const article = feminineTypes.some(t => equipmentType.includes(t)) ? 'de la' : 'del';
  
  return `${article} ${equipmentType} ${details}`;
}

/**
 * Build the email body for a budget
 * Returns a professional, short message with equipment details
 */
export function buildBudgetEmailBody(budget: Budget): string {
  const equipmentDesc = buildEquipmentDescription(budget);
  return `Estimados, adjunto aquí el presupuesto por la reparación ${equipmentDesc}.`;
}

/**
 * Build complete email payload data
 */
export function buildEmailPayloadData(budget: Budget): {
  subject: string;
  body: string;
  recipientEmail: string;
  recipientName: string;
} {
  return {
    subject: buildBudgetEmailSubject(budget),
    body: buildBudgetEmailBody(budget),
    recipientEmail: budget.customer.email || '',
    recipientName: budget.customer.attention || budget.customer.name || '',
  };
}

/**
 * Validate email address format
 */
export function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email) {
    return { valid: false, error: 'El email es requerido' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'El formato del email no es válido' };
  }
  
  return { valid: true };
}

/**
 * Parse multiple emails from a comma-separated string
 */
export function parseEmailList(emailString: string): string[] {
  if (!emailString) return [];
  
  return emailString
    .split(/[,;]/)
    .map(e => e.trim())
    .filter(e => e.length > 0);
}

/**
 * Validate that we have minimum data to send an email
 */
export function validateEmailRequirements(
  recipientEmail: string,
  subject: string,
  body: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  const emailValidation = validateEmail(recipientEmail);
  if (!emailValidation.valid) {
    errors.push(emailValidation.error || 'Email inválido');
  }
  
  if (!subject.trim()) {
    errors.push('El asunto es requerido');
  }
  
  if (!body.trim()) {
    errors.push('El cuerpo del mensaje es requerido');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
