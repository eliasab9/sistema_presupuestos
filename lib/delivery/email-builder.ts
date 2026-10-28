// Email content building utilities

import type { Budget, Customer, Equipment, NewEquipmentBudget, NewEquipmentItem } from '@/types/budget';
import { EQUIPMENT_TYPE_LABELS, newEquipmentLabel } from '@/types/budget';

/**
 * Build the email subject for a budget
 */
export function buildBudgetEmailSubject(budget: Budget): string {
  // Default subject as requested
  return 'Presupuesto reparación';
}

/**
 * Saludo del correo a partir del contacto de "Atención".
 *
 * El tratamiento lo elige el vendedor con el selector Sr./Sra.: no se deduce
 * del nombre. Sin contacto cargado el saludo sale en plural neutro.
 */
export function buildGreeting(
  customer: Pick<Customer, 'attention' | 'attentionTitle'> | undefined
): string {
  const name = customer?.attention?.trim();
  if (!name) return 'Estimados/as,';

  const title =
    customer?.attentionTitle === 'sr' ? 'Estimado'
    : customer?.attentionTitle === 'sra' ? 'Estimada'
    : 'Estimado/a';

  return `${title} ${name},`;
}

/** Arma "Etiqueta — Detalle · Detalle", omitiendo lo que esté vacío. */
function joinEquipmentLine(label: string, details: string[], quantity: number): string | null {
  const clean = details.map(d => d.trim()).filter(Boolean);
  if (!label && clean.length === 0) return null;

  const prefix = quantity > 1 ? `${quantity}x ` : '';
  const head = label || 'Equipo';
  return clean.length > 0 ? `${prefix}${head} — ${clean.join(' · ')}` : `${prefix}${head}`;
}

/**
 * Equipos del presupuesto de reparación. Los multi-equipo viven en
 * `allSections`; los viejos (y los que nunca cambiaron de sección) sólo tienen
 * el equipo plano. El llamador debería pasar el presupuesto ya sincronizado
 * con `withSyncedSections`.
 */
function resolveRepairEquipment(budget: Budget): Equipment[] {
  if (budget.allSections?.length) return budget.allSections.map(s => s.equipment);
  return [budget.equipment];
}

/**
 * Una línea por equipo a reparar. Se listan todos los datos cargados menos el
 * motivo de la falla y las notas internas, que no van al cliente.
 */
export function buildRepairEquipmentLines(budget: Budget): string[] {
  return resolveRepairEquipment(budget)
    .map(eq => {
      const label = eq.customTypeLabel?.trim() || (eq.type ? EQUIPMENT_TYPE_LABELS[eq.type] : '');
      const details: string[] = [];
      if (eq.brand) details.push(`Marca ${eq.brand}`);
      if (eq.model) details.push(`Modelo ${eq.model}`);
      if (eq.subtype) details.push(eq.subtype);
      if (eq.power > 0) details.push(`${eq.power} HP`);
      if (eq.rpm) details.push(`${eq.rpm} RPM`);
      if (eq.serial) details.push(`Serie ${eq.serial}`);
      return joinEquipmentLine(label, details, eq.quantity);
    })
    .filter((line): line is string => line !== null);
}

/**
 * Una línea por equipo nuevo cotizado. Igual que en reparación, las notas
 * internas quedan afuera.
 */
export function buildNewEquipmentLines(items: NewEquipmentItem[]): string[] {
  return items
    .map(item => {
      const details: string[] = [];
      if (item.brand) details.push(`Marca ${item.brand}`);
      if (item.model) details.push(`Modelo ${item.model}`);
      if (item.potencia) details.push(item.potencia);
      if (item.potenciaKW) details.push(item.potenciaKW);
      if (item.rpm) details.push(`${item.rpm} RPM`);
      if (item.voltaje) details.push(item.voltaje);
      if (item.voltajeEntrada) details.push(`Entrada ${item.voltajeEntrada}`);
      if (item.formaConstructiva) details.push(`FC ${item.formaConstructiva}`);
      if (item.relacionTransmision) details.push(`i=${item.relacionTransmision}`);
      if (item.customSpecs) details.push(item.customSpecs);
      return joinEquipmentLine(newEquipmentLabel(item), details, item.quantity);
    })
    .filter((line): line is string => line !== null);
}

/** Ensambla saludo + listado + cierre + firma del vendedor. */
function composeEmailBody(
  greeting: string,
  leadIn: string,
  lines: string[],
  signature: string | undefined
): string {
  const blocks = lines.length > 0
    ? [greeting, `${leadIn}:`, lines.map(l => `• ${l}`).join('\n'), 'Quedo a disposición.']
    : [greeting, 'Adjunto aquí el presupuesto solicitado.', 'Quedo a disposición.'];

  const trimmedSignature = signature?.trim();
  if (trimmedSignature) blocks.push(trimmedSignature);

  return blocks.join('\n\n');
}

/**
 * Cuerpo del correo de un presupuesto de reparación.
 */
export function buildBudgetEmailBody(budget: Budget): string {
  return composeEmailBody(
    buildGreeting(budget.customer),
    'Adjunto aquí el presupuesto por la reparación de',
    buildRepairEquipmentLines(budget),
    budget.meta.sellerSignature
  );
}

/**
 * Cuerpo del correo de un presupuesto de equipo nuevo.
 */
export function buildNewEquipmentEmailBody(budget: NewEquipmentBudget): string {
  return composeEmailBody(
    buildGreeting(budget.customer),
    'Adjunto aquí el presupuesto por',
    buildNewEquipmentLines(budget.items),
    budget.meta.sellerSignature
  );
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
