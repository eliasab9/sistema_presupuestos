/**
 * HTML template for repair budget documents (DOCX / DOC export).
 *
 * Separated from the export machinery so the template can be edited,
 * previewed and tested independently of html2canvas / jsPDF.
 */

import type { Budget, RepairSection } from '@/types/budget';
import { COMPANIES } from '@/types/budget';
import { calculateIvaBreakdown } from '@/lib/pricing/calculations';

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
 * Equipos del presupuesto. Los presupuestos multi-equipo viven en `allSections`;
 * los viejos (y los que nunca cambiaron de sección) sólo tienen los arrays planos.
 * El llamador debería pasar el presupuesto ya sincronizado con `withSyncedSections`.
 */
function resolveSections(budget: Budget): RepairSection[] {
  if (budget.allSections?.length) return budget.allSections;
  return [{
    id: 'flat',
    label: 'Equipo 1',
    equipment: budget.equipment,
    workItems: budget.workItems,
    bearings: budget.bearings,
    spareParts: budget.spareParts,
    machining: budget.machining,
    labor: budget.labor,
  }];
}

const sectionTotal = (s: RepairSection) =>
  s.labor.reduce((sum, i) => sum + i.priceARS, 0) +
  s.bearings.reduce((sum, i) => sum + i.subtotalARS, 0) +
  s.spareParts.reduce((sum, i) => sum + i.subtotalARS, 0) +
  s.machining.reduce((sum, i) => sum + i.subtotalARS, 0);

const equipmentDisplayOf = (equipment: RepairSection['equipment']) => [
  equipment.customTypeLabel ?? EQUIPMENT_TYPE_LABELS[equipment.type] ?? equipment.type,
  equipment.subtype,
  equipment.power ? `${equipment.power} HP` : null,
].filter(Boolean).join(' · ');

/**
 * Detalle de un equipo: datos, trabajos y desglose económico.
 * Con un solo equipo se omiten el título y el subtotal por equipo.
 */
function buildSectionHtml(section: RepairSection, isOnly: boolean, primaryColor: string): string {
  const { equipment, workItems, labor, bearings, spareParts, machining } = section;
  return `
  <h3>${isOnly ? 'Equipo' : section.label}</h3>
  <p style="font-weight: bold; margin: 5px 0;">${equipmentDisplayOf(equipment)}</p>
  ${equipment.brand  ? `<p style="margin: 3px 0;">Marca: ${equipment.brand}</p>`  : ''}
  ${equipment.model  ? `<p style="margin: 3px 0;">Modelo: ${equipment.model}</p>` : ''}
  ${equipment.serial ? `<p style="margin: 3px 0;">Serie: ${equipment.serial}</p>` : ''}

  ${workItems.length > 0 ? `
  <p class="section-title">TRABAJO A REALIZAR</p>
  <ul>${workItems.map(i => `<li>${i.description}</li>`).join('')}</ul>
  ` : ''}

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

  ${isOnly ? '' : `
  <table style="border-top: 1px solid ${primaryColor};">
    <tr><td style="font-weight: bold; color: #555;">Subtotal ${section.label}</td><td class="amount" style="color: ${primaryColor};">${formatCurrency(sectionTotal(section))}</td></tr>
  </table>
  `}
  `;
}

/**
 * Bloque de discriminación de IVA, igual al de la vista previa / PDF.
 * El presupuesto se cotiza neto: esto es informativo, no cambia el SUBTOTAL.
 * Devuelve '' si no hay nada cotizado.
 */
function buildIvaBreakdownHtml(sections: RepairSection[], primaryColor: string): string {
  const iva = calculateIvaBreakdown(sections);
  if (iva.net <= 0) return '';

  return `
  <p class="section-title">DISCRIMINACIÓN DE IVA</p>
  <table style="font-size: 9pt;">
    <tr style="color: #555;">
      <td>Concepto</td>
      <td class="amount">Neto</td>
      <td class="amount">IVA</td>
    </tr>
    <tr>
      <td>Fabricación de bobinado — 10,5%</td>
      <td class="amount">${formatCurrency(iva.baseWinding)}</td>
      <td class="amount">${formatCurrency(iva.ivaWinding)}</td>
    </tr>
    <tr>
      <td>Materiales y mantenimiento — 21%</td>
      <td class="amount">${formatCurrency(iva.baseGeneral)}</td>
      <td class="amount">${formatCurrency(iva.ivaGeneral)}</td>
    </tr>
    <tr>
      <td><b>Total con IVA</b></td>
      <td class="amount">${formatCurrency(iva.net)}</td>
      <td class="amount" style="color: ${primaryColor};">${formatCurrency(iva.gross)}</td>
    </tr>
  </table>
  `;
}

/**
 * Build the HTML string for the "save / download" DOCX variant.
 * Includes a two-column header with logo and budget meta block.
 */
export function buildRepairDocxDownloadHtml(budget: Budget, logoBase64: string): string {
  const { meta, customer } = budget;
  const company = COMPANIES[budget.companyId];
  const primaryColor = company.primaryColor;

  const sections = resolveSections(budget);
  const isOnly = sections.length === 1;
  const grandTotal = sections.reduce((sum, s) => sum + sectionTotal(s), 0);

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

  ${sections.map(s => buildSectionHtml(s, isOnly, primaryColor)).join('')}

  <div class="total-row">
    <table><tr><td class="total-label">SUBTOTAL</td><td class="total-amount">${formatCurrency(grandTotal)}</td></tr></table>
  </div>

  ${buildIvaBreakdownHtml(sections, primaryColor)}

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
  const { meta, customer } = budget;
  const company = COMPANIES[budget.companyId];
  const primaryColor = company.primaryColor;

  const sections = resolveSections(budget);
  const isOnly = sections.length === 1;
  const grandTotal = sections.reduce((sum, s) => sum + sectionTotal(s), 0);

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

  ${sections.map(s => buildSectionHtml(s, isOnly, primaryColor)).join('')}

  <div class="total-row"><table><tr><td class="total-label">SUBTOTAL</td><td class="total-amount">${formatCurrency(grandTotal)}</td></tr></table></div>

  ${buildIvaBreakdownHtml(sections, primaryColor)}

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
