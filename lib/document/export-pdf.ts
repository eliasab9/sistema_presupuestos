import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { Budget, NewEquipmentBudget } from '@/types/budget';
import { COMPANIES } from '@/types/budget';

// Convert any color to hex format for html2canvas compatibility
function convertToHex(color: string): string {
  if (!color) return '#000000';
  if (color.startsWith('#')) return color;
  if (color === 'transparent' || color === 'none' || color === 'rgba(0, 0, 0, 0)') return 'transparent';
  
  // Handle lab(), oklch(), oklab() colors - return fallback
  if (color.includes('lab(') || color.includes('oklch(') || color.includes('oklab(')) {
    return '#333333'; // fallback gray
  }
  
  // Handle rgb/rgba
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    const toHex = (n: string) => parseInt(n).toString(16).padStart(2, '0');
    return `#${toHex(rgbMatch[1])}${toHex(rgbMatch[2])}${toHex(rgbMatch[3])}`;
  }
  
  // Try canvas method for other formats
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '#333333';
    
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
    const data = ctx.getImageData(0, 0, 1, 1).data;
    
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    return `#${toHex(data[0])}${toHex(data[1])}${toHex(data[2])}`;
  } catch {
    return '#333333';
  }
}

// Convert all colors in an element tree to hex
function convertColorsToHex(element: HTMLElement): void {
  const colorProperties = ['color', 'backgroundColor', 'borderColor', 'borderTopColor', 'borderBottomColor', 'borderLeftColor', 'borderRightColor'];
  
  // Also convert the root element
  const allElements = [element, ...Array.from(element.querySelectorAll('*'))];
  
  allElements.forEach((el) => {
    if (el instanceof HTMLElement) {
      const computed = window.getComputedStyle(el);
      colorProperties.forEach((prop) => {
        const cssProperty = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
        const value = computed.getPropertyValue(cssProperty);
        if (value && value !== 'transparent' && value !== 'rgba(0, 0, 0, 0)') {
          try {
            const hex = convertToHex(value);
            if (hex !== 'transparent') {
              el.style.setProperty(cssProperty, hex, 'important');
            }
          } catch {
            // Ignore conversion errors
          }
        }
      });
    }
  });
}

export async function exportToPDF(budget: Budget): Promise<void> {
  const element = document.getElementById('budget-preview');
  if (!element) {
    throw new Error('Preview element not found');
  }

  const company = COMPANIES[budget.companyId];

  // Clone the element to avoid modifying the original
  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.transform = 'none';
  clone.style.width = '210mm';
  clone.style.position = 'absolute';
  clone.style.left = '-9999px';
  clone.style.top = '0';
  document.body.appendChild(clone);
  
  // Convert all colors to hex format for html2canvas compatibility
  convertColorsToHex(clone);

  try {
    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: 794,
      windowWidth: 794,
    });

    const imgWidth = 210;
    const pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgData = canvas.toDataURL('image/png');

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    const fileName = `Presupuesto_${company.name.replace(/\s+/g, '_')}_${budget.meta.number}_${budget.meta.date.replace(/\//g, '-')}.pdf`;
    pdf.save(fileName);
  } finally {
    document.body.removeChild(clone);
  }
}

// Convert image to base64 for embedding in DOCX
async function imageToBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return '';
  }
}

export async function exportToDOCX(budget: Budget): Promise<void> {
  const { meta, customer, equipment, workItems, labor, bearings, spareParts, machining } = budget;
  
  const company = COMPANIES[budget.companyId];
  const primaryColor = company.primaryColor;
  
  // Load logo as base64
  const logoBase64 = await imageToBase64(company.logo);
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const equipmentTypeLabels: Record<string, string> = {
    motor_electrico: 'Motor eléctrico',
    electrobomba_centrifuga: 'Electrobomba centrífuga',
    bomba_centrifuga: 'Bomba centrífuga',
    reductor: 'Reductor',
    otro: 'Otro',
  };

  const equipmentDisplay = [
    equipmentTypeLabels[equipment.type],
    equipment.subtype,
    equipment.power ? `${equipment.power} HP` : null,
  ].filter(Boolean).join(' · ');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page { margin: 15mm 20mm; size: A4; }
        body { 
          font-family: Arial, sans-serif; 
          font-size: 11pt; 
          line-height: 1.5; 
          color: #333;
          margin: 0;
          padding: 0;
        }
        h1 { color: ${primaryColor}; font-size: 28pt; margin: 0 0 5px 0; font-weight: bold; }
        h2 { font-size: 16pt; color: #333; margin: 0 0 10px 0; }
        h3 { 
          font-size: 11pt; 
          color: ${primaryColor}; 
          text-transform: uppercase; 
          margin: 20px 0 10px 0;
          border-bottom: 1px solid ${primaryColor};
          padding-bottom: 5px;
        }
        .header { 
          display: flex;
          justify-content: space-between;
          border-bottom: 3px solid ${primaryColor}; 
          padding-bottom: 15px; 
          margin-bottom: 20px; 
        }
        .header-left { display: flex; align-items: center; }
        .header-right { text-align: right; }
        .logo { width: 60pt; height: 60pt; margin-right: 12pt; object-fit: contain; }
        .subtitle { color: #666; font-size: 10pt; margin: 0; }
        .meta-info { font-size: 10pt; color: #666; margin: 3px 0; }
        .client-grid { 
          background-color: #f8f8f8; 
          padding: 15px; 
          margin: 10px 0;
          border-radius: 5px;
        }
        .client-row { margin-bottom: 8px; }
        .client-label { font-weight: bold; color: #555; font-size: 9pt; text-transform: uppercase; }
        .client-value { color: #333; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th { text-align: left; font-size: 9pt; color: #666; text-transform: uppercase; padding: 5px 0; }
        td { padding: 8px 0; border-bottom: 1px solid #eee; }
        .amount { text-align: right; font-weight: bold; }
        .section-title { font-size: 10pt; color: #555; font-weight: bold; margin: 15px 0 5px 0; }
        .total-row { 
          border-top: 3px solid ${primaryColor}; 
          margin-top: 15px;
          padding-top: 10px;
        }
        .total-label { font-size: 14pt; font-weight: bold; }
        .total-amount { font-size: 18pt; font-weight: bold; color: ${primaryColor}; text-align: right; }
        ul { padding-left: 20px; margin: 10px 0; }
        li { margin: 5px 0; }
        .observations { font-size: 10pt; color: #555; }
        .footer { 
          border-top: 1px solid #ccc; 
          margin-top: 40px; 
          padding-top: 15px; 
          text-align: center; 
        }
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
        <div class="client-row">
          <span class="client-label">Cliente:</span>
          <span class="client-value">${customer.name || '—'}</span>
        </div>
        <div class="client-row">
          <span class="client-label">Atención:</span>
          <span class="client-value">${customer.attention || '—'}</span>
        </div>
        <div class="client-row">
          <span class="client-label">Email:</span>
          <span class="client-value">${customer.email || '—'}</span>
        </div>
        <div class="client-row">
          <span class="client-label">Teléfono:</span>
          <span class="client-value">${customer.phone || '—'}</span>
        </div>
        ${customer.cuit ? `
        <div class="client-row">
          <span class="client-label">CUIT:</span>
          <span class="client-value">${customer.cuit}</span>
        </div>
        ` : ''}
        ${customer.address ? `
        <div class="client-row">
          <span class="client-label">Dirección:</span>
          <span class="client-value">${[customer.address, customer.locality, customer.province].filter(Boolean).join(', ')}</span>
        </div>
        ` : ''}
      </div>

      <h3>Equipo</h3>
      <p style="font-weight: bold; margin: 5px 0;">${equipmentDisplay}</p>
      ${equipment.brand ? `<p style="margin: 3px 0;">Marca: ${equipment.brand}</p>` : ''}
      ${equipment.model ? `<p style="margin: 3px 0;">Modelo: ${equipment.model}</p>` : ''}
      ${equipment.serial ? `<p style="margin: 3px 0;">Serie: ${equipment.serial}</p>` : ''}

      ${workItems.length > 0 ? `
        <h3>Detalle del Trabajo a Realizar</h3>
        <ul>
          ${workItems.map(item => `<li>${item.description}</li>`).join('')}
        </ul>
      ` : ''}

      <h3>Desglose Económico</h3>
      
      ${labor.length > 0 ? `
        <p class="section-title">MANO DE OBRA</p>
        <table>
          <tbody>
            ${labor.map(item => `
              <tr>
                <td>${item.description}</td>
                <td class="amount">${formatCurrency(item.priceARS)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}

      ${bearings.length > 0 ? `
        <p class="section-title">RODAMIENTOS</p>
        <table>
          <tbody>
            ${bearings.map(item => `
              <tr>
                <td>Rod. ${item.code} × ${item.quantity}</td>
                <td class="amount">${formatCurrency(item.subtotalARS)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}

      ${spareParts.length > 0 ? `
        <p class="section-title">REPUESTOS</p>
        <table>
          <tbody>
            ${spareParts.map(item => `
              <tr>
                <td>${item.description} × ${item.quantity}</td>
                <td class="amount">${formatCurrency(item.subtotalARS)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}

      ${machining.length > 0 ? `
        <p class="section-title">MECANIZADOS</p>
        <table>
          <tbody>
            ${machining.map(item => `
              <tr>
                <td>${item.description} × ${item.quantity}</td>
                <td class="amount">${formatCurrency(item.subtotalARS)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}

      <div class="total-row">
        <table>
          <tr>
            <td class="total-label">SUBTOTAL</td>
            <td class="total-amount">${formatCurrency(budget.subtotalGeneral)}</td>
          </tr>
        </table>
      </div>

      <h3>Observaciones</h3>
      <div class="observations">
        <ul>
          <li>IVA: 21% materiales y mantenimiento — 10,5% fabricación de bobinado.</li>
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
    </html>
  `;

  // Create blob and download
  const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Presupuesto_${company.name.replace(/\s+/g, '_')}_${meta.number}_${meta.date.replace(/\//g, '-')}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export budget to PDF and return as Blob (for workflow use)
 */
export async function exportToPDFBlob(budget: Budget): Promise<Blob> {
  const element = document.getElementById('budget-preview');
  if (!element) {
    throw new Error('Preview element not found');
  }

  // Clone the element to avoid modifying the original
  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.transform = 'none';
  clone.style.width = '210mm';
  clone.style.position = 'absolute';
  clone.style.left = '-9999px';
  clone.style.top = '0';
  document.body.appendChild(clone);
  
  // Convert all colors to hex format for html2canvas compatibility
  convertColorsToHex(clone);

  try {
    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: 794,
      windowWidth: 794,
    });

    const imgWidth = 210;
    const pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgData = canvas.toDataURL('image/png');

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // Return as blob instead of downloading
    return pdf.output('blob');
  } finally {
    document.body.removeChild(clone);
  }
}

/**
 * Export budget to DOCX and return as Blob (for workflow use)
 */
export async function exportToDocxBlob(budget: Budget): Promise<Blob> {
  const { meta, customer, equipment, workItems, labor, bearings, spareParts, machining } = budget;
  
  const company = COMPANIES[budget.companyId];
  const primaryColor = company.primaryColor;
  
  // Load logo as base64
  const logoBase64 = await imageToBase64(company.logo);
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const equipmentTypeLabels: Record<string, string> = {
    motor_electrico: 'Motor eléctrico',
    electrobomba_centrifuga: 'Electrobomba centrífuga',
    bomba_centrifuga: 'Bomba centrífuga',
    reductor: 'Reductor',
    otro: 'Otro',
  };

  const equipmentDisplay = [
    equipmentTypeLabels[equipment.type],
    equipment.subtype,
    equipment.power ? `${equipment.power} HP` : null,
  ].filter(Boolean).join(' · ');

  // Same HTML as exportToDOCX but return blob instead of downloading
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page { margin: 15mm 20mm; size: A4; }
        body { 
          font-family: Arial, sans-serif; 
          font-size: 11pt; 
          line-height: 1.5; 
          color: #333;
          margin: 0;
          padding: 0;
        }
        h1 { color: ${primaryColor}; font-size: 28pt; margin: 0 0 5px 0; font-weight: bold; }
        h2 { font-size: 16pt; color: #333; margin: 0 0 10px 0; }
        h3 { 
          font-size: 11pt; 
          color: ${primaryColor}; 
          text-transform: uppercase; 
          margin: 20px 0 10px 0;
          border-bottom: 1px solid ${primaryColor};
          padding-bottom: 5px;
        }
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

      ${workItems.length > 0 ? `<h3>Detalle del Trabajo</h3><ul>${workItems.map(item => `<li>${item.description}</li>`).join('')}</ul>` : ''}

      <h3>Desglose Económico</h3>
      ${labor.length > 0 ? `<p class="section-title">MANO DE OBRA</p><table>${labor.map(item => `<tr><td>${item.description}</td><td class="amount">${formatCurrency(item.priceARS)}</td></tr>`).join('')}</table>` : ''}
      ${bearings.length > 0 ? `<p class="section-title">RODAMIENTOS</p><table>${bearings.map(item => `<tr><td>Rod. ${item.code} × ${item.quantity}</td><td class="amount">${formatCurrency(item.subtotalARS)}</td></tr>`).join('')}</table>` : ''}
      ${spareParts.length > 0 ? `<p class="section-title">REPUESTOS</p><table>${spareParts.map(item => `<tr><td>${item.description} × ${item.quantity}</td><td class="amount">${formatCurrency(item.subtotalARS)}</td></tr>`).join('')}</table>` : ''}
      ${machining.length > 0 ? `<p class="section-title">MECANIZADOS</p><table>${machining.map(item => `<tr><td>${item.description} × ${item.quantity}</td><td class="amount">${formatCurrency(item.subtotalARS)}</td></tr>`).join('')}</table>` : ''}

      <div class="total-row"><table><tr><td class="total-label">SUBTOTAL</td><td class="total-amount">${formatCurrency(budget.subtotalGeneral)}</td></tr></table></div>

      <h3>Observaciones</h3>
      <div class="observations">
        <ul>
          <li>IVA: 21% materiales y mantenimiento — 10,5% fabricación de bobinado.</li>
          <li>Tipo de cambio utilizado: $${meta.exchangeRate.toLocaleString('es-AR')} / U$S.</li>
          <li>Validez: ${meta.commercialValidity || '7 días hábiles'}.</li>
          <li>Forma de pago: ${meta.paymentTerms || 'A convenir'}.</li>
        </ul>
      </div>

      <div class="footer">
        <p class="footer-brand">${company.name} — ${company.subtitle}</p>
        <p class="footer-info">N° ${meta.number} · ${meta.date}</p>
      </div>
    </body>
    </html>
  `;

  return new Blob(['\ufeff' + htmlContent], { 
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
  });
}

/**
 * Export new equipment budget to PDF
 */
export async function exportNewEquipmentToPDF(budget: NewEquipmentBudget): Promise<void> {
  const element = document.getElementById('new-equipment-preview');
  if (!element) {
    throw new Error('Preview element not found');
  }

  const company = COMPANIES[budget.companyId];

  // Clone the element to avoid modifying the original
  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.transform = 'none';
  clone.style.width = '210mm';
  clone.style.position = 'absolute';
  clone.style.left = '-9999px';
  clone.style.top = '0';
  document.body.appendChild(clone);
  
  // Convert all colors to hex format for html2canvas compatibility
  convertColorsToHex(clone);

  try {
    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: 794,
      windowWidth: 794,
    });

    const imgWidth = 210;
    const pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgData = canvas.toDataURL('image/png');

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    const fileName = `Cotizacion_${company.name.replace(/\s+/g, '_')}_${budget.meta.number}_${budget.meta.date.replace(/\//g, '-')}.pdf`;
    pdf.save(fileName);
  } finally {
    document.body.removeChild(clone);
  }
}

/**
 * Export new equipment budget to PDF and return as Blob
 */
export async function exportNewEquipmentToPDFBlob(budget: NewEquipmentBudget): Promise<Blob> {
  const element = document.getElementById('new-equipment-preview');
  if (!element) {
    throw new Error('Preview element not found');
  }

  // Clone the element to avoid modifying the original
  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.transform = 'none';
  clone.style.width = '210mm';
  clone.style.position = 'absolute';
  clone.style.left = '-9999px';
  clone.style.top = '0';
  document.body.appendChild(clone);
  
  // Convert all colors to hex format for html2canvas compatibility
  convertColorsToHex(clone);

  try {
    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: 794,
      windowWidth: 794,
    });

    const imgWidth = 210;
    const pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgData = canvas.toDataURL('image/png');

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    return pdf.output('blob');
  } finally {
    document.body.removeChild(clone);
  }
}
