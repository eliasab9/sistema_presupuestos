/**
 * HTML template for repair budget documents (DOCX / DOC export).
 *
 * Separated from the export machinery so the template can be edited,
 * previewed and tested independently of html2canvas / jsPDF.
 */

import type { Budget } from '@/types/budget';
import { COMPANIES } from '@/types/budget';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

const EQUIPMENT_TYPE_LABELS: Record<string, string> = {
  motor_electrico: 'Motor eléctrico',
  electrobomba_centrifuga: 'Electrobomba centrífuga',
  bomba_centrifuga: 'Bomba centrífuga',
  reductor: 'Reductor',
  otro: 'Otro',
};

/**
 * Build the HTML string for the "save / download" DOCX variant.
 * Includes a two-column header with logo and budget meta block.
 */
export function buildRepairDocxDownloadHtml(budget: Budget, logoBase64: string): string {
  const { meta, customer, equipment, workItems, labor, bearings, spareParts, machining } = budget;
  const company = COMPANIES[budget.companyId];
  const primaryColor = company.primaryColor;

  const equipmentDisplay = [
    equipment.customTypeLabel ?? EQUIPMENT_TYPE_LABELS[equipment.type] ?? equipment.type,
    equipment.subtype,
    equipment.power ? `${equipment.power} HP` : null,
  ].filter(Boolean).join(' · ');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page { margin: 15mm 20mm; size: A4; }
    body { font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.5; color: #333; margin: 0; padding: 0; }
    h1 { color: ${primaryColor}; font-size: 28pt; margin: 0 0 5px 0; font-weight: bold; }
    h2 { font-size: 16pt; color: #333; margin: 0 0 10px 0; }
    h3 { font-size: 11pt; color: ${primaryColor}; text-transform: uppercase; margin: 20px 0 10px 0; border-bottom: 1px solid ${primaryColor}; padding-bottom: 5px; }
    .header { display: flex; justify-content: space-between; border-bottom: 3px solid ${primaryColor}; padding-bottom: 15px; margin-bottom: 20px; }
    .header-left { display: flex; align-items: center; }
    .header-right { text-align: right; }
    .logo { width: 60pt; height: 60pt; margin-right: 12pt; object-fit: contain; }
    .subtitle { color: #666; font-size: 10pt; margin: 0; }
    .meta-info { font-size: 10pt; color: #666; margin: 3px 0; }
    .client-grid { background-color: #f8f8f8; padding: 15px; margin: 10px 0; border-radius: 5px; }
    .client-row { margin-bottom: 8px; }
    .client-label { font-weight: bold; color: #555; font-size: 9pt; text-transform: uppercase; }
    .client-value { color: #333; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th { text-align: left; font-size: 9pt; color: #666; text-transform: uppercase; padding: 5px 0; }
    td { padding: 8px 0; border-bottom: 1px solid #eee; }
    .amount { text-align: right; font-weight: bold; }
    .section-title { font-size: 10pt; color: #555; font-weight: bold; margin: 15px 0 5px 0; }
    .total-row { border-top: 3px solid ${primaryColor}; margin-top: 15px; padding-top: 10px; }
    .total-label { font-size: 14pt; font-weight: bold; }
    .total-amount { font-size: 18pt; font-weight: bold; color: ${primaryColor}; text-align: right; }
    ul { padding-left: 20px; margin: 10px 0; }
    li { margin: 5px 0; }
    .observations { font-size: 10pt; color: #555; }
    .footer { border-top: 1px solid #ccc; margin-top: 40px; padding-top: 15px; text-align: center; }
    .footer-brand { font-weight: bold; color: ${primaryColor}; font-size: 12pt; }
    .footer-info { font-size: 9pt; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      ${logoBase64 ? `<img src="${logoBase64}" alt="${company.name}" class="logo" width="60" height="60" />` : ''}
      <div>
        <h1>${company.name}</h1>
        <p class="subtitle">${company.subtitle}</p>
      </div>
    </div>
    <div class="header-right">
      <h2>PRESUPUESTO N° ${meta.number}</h2>
      <p class="meta-info">Fecha: ${meta.date}</p>
      <p class="meta-info">Válido hasta: ${meta.validUntil}</p>
      <p class="meta-info">TC referencial: $${meta.exchangeRate.toLocaleString('es-AR')} / U$S</p>
    </div>
  </div>

  <h3>Datos del Cliente</h3>
  <div class="client-grid">
    <div class="client-row"><span class="client-label">Cliente:</span> <span class="client-value">${customer.name || '—'}</span></div>
    <div class="client-row"><span class="client-label">Atención:</span> <span class="client-value">${customer.attention || '—'}</span></div>
    <div class="client-row"><span class="client-label">Email:</span> <span class="client-value">${customer.email || '—'}</span></div>
    <div class="client-row"><span class="client-label">Teléfono:</span> <span class="client-value">${customer.phone || '—'}</span></div>
    ${customer.cuit ? `<div class="client-row"><span class="client-label">CUIT:</span> <span class="client-value">${customer.cuit}</span></div>` : ''}
    ${customer.address ? `<div class="client-row"><span class="client-label">Dirección:</span> <span class="client-value">${[customer.address, customer.locality, customer.province].filter(Boolean).join(', ')}</span></div>` : ''}
  </div>

  <h3>Equipo</h3>
  <p style="font-weight: bold; margin: 5px 0;">${equipmentDisplay}</p>
  ${equipment.brand  ? `<p style="margin: 3px 0;">Marca: ${equipment.brand}</p>`  : ''}
  ${equipment.model  ? `<p style="margin: 3px 0;">Modelo: ${equipment.model}</p>` : ''}
  ${equipment.serial ? `<p style="margin: 3px 0;">Serie: ${equipment.serial}</p>` : ''}

  ${workItems.length > 0 ? `
  <h3>Detalle del Trabajo a Realizar</h3>
  <ul>${workItems.map(i => `<li>${i.description}</li>`).join('')}</ul>
  ` : ''}

  <h3>Desglose Económico</h3>

  ${labor.length > 0 ? `
  <p class="section-title">MANO DE OBRA</p>
  <table><tbody>${labor.map(i => `<tr><td>${i.description}</td><td class="amount">${formatCurrency(i.priceARS)}</td></tr>`).join('')}</tbody></table>
  ` : ''}

  ${bearings.length > 0 ? `
  <p class="section-title">RODAMIENTOS</p>
  <table><tbody>${bearings.map(i => `<tr><td>Rod. ${i.code} × ${i.quantity}</td><td class="amount">${formatCurrency(i.subtotalARS)}</td></tr>`).join('')}</tbody></table>
  ` : ''}

  ${spareParts.length > 0 ? `
  <p class="section-title">REPUESTOS</p>
  <table><tbody>${spareParts.map(i => `<tr><td>${i.description} × ${i.quantity}</td><td class="amount">${formatCurrency(i.subtotalARS)}</td></tr>`).join('')}</tbody></table>
  ` : ''}

  ${machining.length > 0 ? `
  <p class="section-title">MECANIZADOS</p>
  <table><tbody>${machining.map(i => `<tr><td>${i.description} × ${i.quantity}</td><td class="amount">${formatCurrency(i.subtotalARS)}</td></tr>`).join('')}</tbody></table>
  ` : ''}

  <div class="total-row">
    <table><tr><td class="total-label">SUBTOTAL</td><td class="total-amount">${formatCurrency(budget.subtotalGeneral)}</td></tr></table>
  </div>

  <h3>Observaciones</h3>
  <div class="observations">
    <ul>
      <li>IVA: ${meta.ivaCondition || '21% materiales y mantenimiento — 10,5% fabricación de bobinado'}.</li>
      <li>Tipo de cambio utilizado: $${meta.exchangeRate.toLocaleString('es-AR')} / U$S (referencial a la fecha).</li>
      <li>Validez del presupuesto: ${meta.commercialValidity || '7 días hábiles'}.</li>
      <li>Forma de pago: ${meta.paymentTerms || 'A convenir'}.</li>
    </ul>
    ${meta.generalNotes ? `<p style="margin-top: 10px;">${meta.generalNotes}</p>` : ''}
  </div>

  <div class="footer">
    <p class="footer-brand">${company.name} — ${company.subtitle}</p>
    <p class="footer-info">Mendoza, Argentina</p>
    <p class="footer-info">N° ${meta.number} · ${meta.date}</p>
  </div>
</body>
</html>`;
}

/**
 * Build the HTML string for the workflow blob variant (simpler inline header).
 */
export function buildRepairDocxBlobHtml(budget: Budget, logoBase64: string): string {
  const { meta, customer, equipment, workItems, labor, bearings, spareParts, machining } = budget;
  const company = COMPANIES[budget.companyId];
  const primaryColor = company.primaryColor;

  const equipmentDisplay = [
    equipment.customTypeLabel ?? EQUIPMENT_TYPE_LABELS[equipment.type] ?? equipment.type,
    equipment.subtype,
    equipment.power ? `${equipment.power} HP` : null,
  ].filter(Boolean).join(' · ');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page { margin: 15mm 20mm; size: A4; }
    body { font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.5; color: #333; margin: 0; padding: 0; }
    h1 { color: ${primaryColor}; font-size: 28pt; margin: 0 0 5px 0; font-weight: bold; }
    h2 { font-size: 16pt; color: #333; margin: 0 0 10px 0; }
    h3 { font-size: 11pt; color: ${primaryColor}; text-transform: uppercase; margin: 20px 0 10px 0; border-bottom: 1px solid ${primaryColor}; padding-bottom: 5px; }
    .header { border-bottom: 3px solid ${primaryColor}; padding-bottom: 15px; margin-bottom: 20px; }
    .subtitle { color: #666; font-size: 10pt; margin: 0; }
    .meta-info { font-size: 10pt; color: #666; margin: 3px 0; }
    .client-grid { background-color: #f8f8f8; padding: 15px; margin: 10px 0; }
    .client-row { margin-bottom: 8px; }
    .client-label { font-weight: bold; color: #555; font-size: 9pt; text-transform: uppercase; }
    .client-value { color: #333; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th { text-align: left; font-size: 9pt; color: #666; text-transform: uppercase; padding: 5px 0; }
    td { padding: 8px 0; border-bottom: 1px solid #eee; }
    .amount { text-align: right; font-weight: bold; }
    .section-title { font-size: 10pt; color: #555; font-weight: bold; margin: 15px 0 5px 0; }
    .total-row { border-top: 3px solid ${primaryColor}; margin-top: 15px; padding-top: 10px; }
    .total-label { font-size: 14pt; font-weight: bold; }
    .total-amount { font-size: 18pt; font-weight: bold; color: ${primaryColor}; text-align: right; }
    ul { padding-left: 20px; margin: 10px 0; }
    li { margin: 5px 0; }
    .observations { font-size: 10pt; color: #555; }
    .footer { border-top: 1px solid #ccc; margin-top: 40px; padding-top: 15px; text-align: center; }
    .footer-brand { font-weight: bold; color: ${primaryColor}; font-size: 12pt; }
    .footer-info { font-size: 9pt; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    ${logoBase64 ? `<img src="${logoBase64}" alt="${company.name}" width="60" height="60" />` : ''}
    <h1>${company.name}</h1>
    <p class="subtitle">${company.subtitle}</p>
    <h2>PRESUPUESTO N° ${meta.number}</h2>
    <p class="meta-info">Fecha: ${meta.date} | Válido hasta: ${meta.validUntil} | TC: $${meta.exchangeRate.toLocaleString('es-AR')} / U$S</p>
  </div>

  <h3>Datos del Cliente</h3>
  <div class="client-grid">
    <div class="client-row"><span class="client-label">Cliente:</span> <span class="client-value">${customer.name || '—'}</span></div>
    <div class="client-row"><span class="client-label">Atención:</span> <span class="client-value">${customer.attention || '—'}</span></div>
    <div class="client-row"><span class="client-label">Email:</span> <span class="client-value">${customer.email || '—'}</span></div>
    <div class="client-row"><span class="client-label">Teléfono:</span> <span class="client-value">${customer.phone || '—'}</span></div>
  </div>

  <h3>Equipo</h3>
  <p><strong>${equipmentDisplay}</strong></p>
  ${equipment.brand ? `<p>Marca: ${equipment.brand}</p>` : ''}
  ${equipment.model ? `<p>Modelo: ${equipment.model}</p>` : ''}

  ${workItems.length > 0 ? `<h3>Detalle del Trabajo</h3><ul>${workItems.map(i => `<li>${i.description}</li>`).join('')}</ul>` : ''}

  <h3>Desglose Económico</h3>
  ${labor.length > 0     ? `<p class="section-title">MANO DE OBRA</p><table>${labor.map(i => `<tr><td>${i.description}</td><td class="amount">${formatCurrency(i.priceARS)}</td></tr>`).join('')}</table>` : ''}
  ${bearings.length > 0  ? `<p class="section-title">RODAMIENTOS</p><table>${bearings.map(i => `<tr><td>Rod. ${i.code} × ${i.quantity}</td><td class="amount">${formatCurrency(i.subtotalARS)}</td></tr>`).join('')}</table>` : ''}
  ${spareParts.length > 0 ? `<p class="section-title">REPUESTOS</p><table>${spareParts.map(i => `<tr><td>${i.description} × ${i.quantity}</td><td class="amount">${formatCurrency(i.subtotalARS)}</td></tr>`).join('')}</table>` : ''}
  ${machining.length > 0 ? `<p class="section-title">MECANIZADOS</p><table>${machining.map(i => `<tr><td>${i.description} × ${i.quantity}</td><td class="amount">${formatCurrency(i.subtotalARS)}</td></tr>`).join('')}</table>` : ''}

  <div class="total-row"><table><tr><td class="total-label">SUBTOTAL</td><td class="total-amount">${formatCurrency(budget.subtotalGeneral)}</td></tr></table></div>

  <h3>Observaciones</h3>
  <div class="observations">
    <ul>
      <li>IVA: ${meta.ivaCondition || '21% materiales y mantenimiento — 10,5% fabricación de bobinado'}.</li>
      <li>Tipo de cambio utilizado: $${meta.exchangeRate.toLocaleString('es-AR')} / U$S.</li>
      <li>Validez: ${meta.commercialValidity || '7 días hábiles'}.</li>
      <li>Forma de pago: ${meta.paymentTerms || 'A convenir'}.</li>
    </ul>
    ${meta.generalNotes ? `<p style="margin-top: 10px;">${meta.generalNotes}</p>` : ''}
  </div>

  <div class="footer">
    <p class="footer-brand">${company.name} — ${company.subtitle}</p>
    <p class="footer-info">N° ${meta.number} · ${meta.date}</p>
  </div>
</body>
</html>`;
}
