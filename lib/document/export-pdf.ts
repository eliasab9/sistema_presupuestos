import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { Budget, NewEquipmentBudget } from '@/types/budget';
import { COMPANIES } from '@/types/budget';
import { buildRepairDocxDownloadHtml, buildRepairDocxBlobHtml } from './templates/repair';

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
      scale: 1.5,
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
    const imgData = canvas.toDataURL('image/jpeg', 0.85);

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
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
  const company = COMPANIES[budget.companyId];
  const logoBase64 = await imageToBase64(company.logo);
  const htmlContent = buildRepairDocxDownloadHtml(budget, logoBase64);

  const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Presupuesto_${company.name.replace(/\s+/g, '_')}_${budget.meta.number}_${budget.meta.date.replace(/\//g, '-')}.doc`;
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
      scale: 1.5,
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
    const imgData = canvas.toDataURL('image/jpeg', 0.85);

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
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
  const company = COMPANIES[budget.companyId];
  const logoBase64 = await imageToBase64(company.logo);
  const htmlContent = buildRepairDocxBlobHtml(budget, logoBase64);

  return new Blob(['\ufeff' + htmlContent], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
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
      scale: 1.5,
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
    const imgData = canvas.toDataURL('image/jpeg', 0.85);

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
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
      scale: 1.5,
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
    const imgData = canvas.toDataURL('image/jpeg', 0.85);

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    return pdf.output('blob');
  } finally {
    document.body.removeChild(clone);
  }
}
