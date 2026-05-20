'use client';

import { useState, useRef, useEffect } from 'react';
import { useNewEquipment } from '@/lib/new-equipment-context';
import { COMPANIES, NEW_EQUIPMENT_TYPE_LABELS } from '@/types/budget';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

export function NewEquipmentPreview() {
  const { budget } = useNewEquipment();
  const { meta, customer, items, subtotalItems, showTotal } = budget;

  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.75);
  const [fitZoom, setFitZoom] = useState(0.75);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width - 24;
      const docPx = 794;
      const computed = Math.min(0.95, Math.max(0.25, w / docPx));
      setFitZoom(computed);
      setZoom(computed);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const company = COMPANIES[budget.companyId];
  const primaryColor = company.primaryColor;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getEquipmentDescription = (item: typeof items[0]) => {
    const parts: string[] = [];
    
    if (item.type === 'otro' && item.customDescription) {
      parts.push(item.customDescription);
    } else {
      parts.push(NEW_EQUIPMENT_TYPE_LABELS[item.type]);
    }
    
    if (item.brand) parts.push(item.brand);
    if (item.model) parts.push(`Mod. ${item.model}`);
    if (item.potencia) parts.push(item.potencia);
    if (item.rpm) parts.push(`${item.rpm} RPM`);
    if (item.voltaje) parts.push(item.voltaje);
    if (item.formaConstructiva) parts.push(`FC: ${item.formaConstructiva}`);
    if (item.relacionTransmision) parts.push(`i=${item.relacionTransmision}`);
    if (item.voltajeEntrada) parts.push(`Entrada: ${item.voltajeEntrada}`);
    if (item.potenciaKW) parts.push(item.potenciaKW);
    
    return parts.join(' · ');
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Zoom controls */}
      <div className="flex items-center justify-end gap-1 px-3 py-1.5 bg-neutral-100 border-b border-neutral-300 shrink-0">
        <button
          onClick={() => setZoom(z => Math.max(0.25, +(z - 0.1).toFixed(2)))}
          className="p-1 rounded hover:bg-neutral-200 text-neutral-600 transition-colors"
          title="Reducir zoom"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <span className="text-[11px] text-neutral-500 tabular-nums w-10 text-center select-none">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom(z => Math.min(2, +(z + 0.1).toFixed(2)))}
          className="p-1 rounded hover:bg-neutral-200 text-neutral-600 transition-colors"
          title="Aumentar zoom"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setZoom(fitZoom)}
          className="p-1 rounded hover:bg-neutral-200 text-neutral-500 transition-colors"
          title="Ajustar a ventana"
        >
          <Maximize2 className="h-3 w-3" />
        </button>
      </div>

      <ScrollArea className="flex-1 bg-neutral-200">
        <div ref={containerRef} className="p-3">
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div
              id="new-equipment-preview"
              data-company-id={budget.companyId}
              style={{
                zoom,
                width: '210mm',
                minHeight: '297mm',
                padding: '15mm 20mm',
                backgroundColor: '#ffffff',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
                fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
                position: 'relative',
              }}
            >
            {/* Header */}
            <header style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'flex-start',
              borderBottom: `3px solid ${primaryColor}`,
              paddingBottom: '10px',
              marginBottom: '15px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img 
                  src={company.logo} 
                  alt={company.name}
                  style={{ width: '60px', height: '60px', objectFit: 'contain' }}
                  crossOrigin="anonymous"
                />
                <div>
                  <h1 style={{ 
                    fontSize: '24px', 
                    fontWeight: 'bold', 
                    color: primaryColor,
                    margin: 0,
                  }}>
                    {company.name}
                  </h1>
                  <p style={{ fontSize: '10px', color: '#666', margin: 0 }}>
                    {company.subtitle}
                  </p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h2 style={{ 
                  fontSize: '14px', 
                  fontWeight: 'bold', 
                  margin: 0,
                  marginBottom: '4px',
                }}>
                  PRESUPUESTO N° {meta.number}
                </h2>
                <p style={{ fontSize: '9px', color: '#666', margin: '2px 0' }}>
                  Fecha: {meta.date}
                </p>
                <p style={{ fontSize: '9px', color: '#666', margin: '2px 0' }}>
                  Válido hasta: {meta.validUntil}
                </p>
                <p style={{ fontSize: '9px', color: '#666', margin: '2px 0' }}>
                  TC: ${meta.exchangeRate.toLocaleString('es-AR')} / U$S
                </p>
              </div>
            </header>

            {/* Customer Section */}
            <section style={{ marginBottom: '15px' }}>
              <h3 style={{ 
                fontSize: '10px', 
                fontWeight: 'bold', 
                color: primaryColor,
                textTransform: 'uppercase',
                marginBottom: '8px',
                borderBottom: `1px solid ${primaryColor}`,
                paddingBottom: '3px',
              }}>
                Datos del Cliente
              </h3>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr',
                gap: '4px 20px',
                fontSize: '10px',
                backgroundColor: '#f9f9f9',
                padding: '8px',
              }}>
                <div>
                  <span style={{ color: '#666', fontSize: '8px', textTransform: 'uppercase' }}>Cliente</span>
                  <p style={{ margin: 0, fontWeight: 500 }}>{customer.name || '—'}</p>
                </div>
                <div>
                  <span style={{ color: '#666', fontSize: '8px', textTransform: 'uppercase' }}>Atención</span>
                  <p style={{ margin: 0 }}>{customer.attention || '—'}</p>
                </div>
                <div>
                  <span style={{ color: '#666', fontSize: '8px', textTransform: 'uppercase' }}>Email</span>
                  <p style={{ margin: 0 }}>{customer.email || '—'}</p>
                </div>
                <div>
                  <span style={{ color: '#666', fontSize: '8px', textTransform: 'uppercase' }}>Teléfono</span>
                  <p style={{ margin: 0 }}>{customer.phone || '—'}</p>
                </div>
              </div>
            </section>

            {/* Equipment List */}
            <section style={{ marginBottom: '15px' }}>
              <h3 style={{ 
                fontSize: '10px', 
                fontWeight: 'bold', 
                color: primaryColor,
                textTransform: 'uppercase',
                marginBottom: '8px',
                borderBottom: `1px solid ${primaryColor}`,
                paddingBottom: '3px',
              }}>
                Equipos Cotizados
              </h3>
              
              {items.length === 0 ? (
                <p style={{ fontSize: '10px', color: '#999', fontStyle: 'italic' }}>
                  No hay equipos agregados
                </p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #ddd' }}>
                      <th style={{ textAlign: 'left', padding: '4px 0', color: '#666', fontWeight: 600 }}>Descripción</th>
                      <th style={{ textAlign: 'center', padding: '4px 0', color: '#666', fontWeight: 600, width: '40px' }}>Cant.</th>
                      <th style={{ textAlign: 'right', padding: '4px 0', color: '#666', fontWeight: 600, width: '80px' }}>P. Unit.</th>
                      <th style={{ textAlign: 'right', padding: '4px 0', color: '#666', fontWeight: 600, width: '80px' }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '6px 0' }}>
                          <div style={{ fontWeight: 500 }}>{getEquipmentDescription(item)}</div>
                          {item.type === 'otro' && item.customSpecs && (
                            <div style={{ fontSize: '8px', color: '#666', marginTop: '2px' }}>
                              {item.customSpecs}
                            </div>
                          )}
                          {item.notes && (
                            <div style={{ fontSize: '8px', color: '#666', marginTop: '2px' }}>
                              Nota: {item.notes}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'center', padding: '6px 0' }}>{item.quantity}</td>
                        <td style={{ textAlign: 'right', padding: '6px 0' }}>{formatCurrency(item.unitPriceARS)}</td>
                        <td style={{ textAlign: 'right', padding: '6px 0', fontWeight: 600 }}>{formatCurrency(item.subtotalARS)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            {/* Subtotal — only rendered when showTotal is enabled */}
            {showTotal !== false && (
              <section style={{
                borderTop: `3px solid ${primaryColor}`,
                paddingTop: '10px',
                marginBottom: '15px',
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '14px',
                  fontWeight: 'bold',
                }}>
                  <span>SUBTOTAL</span>
                  <span style={{ color: primaryColor }}>{formatCurrency(subtotalItems)}</span>
                </div>
              </section>
            )}

            {/* Observations */}
            <section style={{ marginBottom: '15px' }}>
              <h3 style={{ 
                fontSize: '10px', 
                fontWeight: 'bold', 
                color: primaryColor,
                textTransform: 'uppercase',
                marginBottom: '8px',
                borderBottom: `1px solid ${primaryColor}`,
                paddingBottom: '3px',
              }}>
                Observaciones
              </h3>
              <ul style={{ fontSize: '9px', color: '#555', margin: 0, paddingLeft: '15px' }}>
                {meta.commercialValidity && (
                  <li style={{ marginBottom: '3px' }}>Validez: {meta.commercialValidity}.</li>
                )}
                {meta.paymentTerms && (
                  <li style={{ marginBottom: '3px' }}>Forma de pago: {meta.paymentTerms}.</li>
                )}
                {meta.generalNotes && meta.generalNotes.split('\n').map((line, idx) => (
                  <li key={idx} style={{ marginBottom: '3px' }}>{line}</li>
                ))}
                {!meta.commercialValidity && !meta.paymentTerms && !meta.generalNotes && (
                  <li style={{ marginBottom: '3px', color: '#999', fontStyle: 'italic' }}>Sin observaciones</li>
                )}
              </ul>
            </section>

            {/* Footer */}
            <footer style={{
              position: 'absolute',
              bottom: '15mm',
              left: '20mm',
              right: '20mm',
              borderTop: '1px solid #ccc',
              paddingTop: '10px',
              textAlign: 'center',
            }}>
              <p style={{ 
                fontSize: '10px', 
                fontWeight: 'bold', 
                color: primaryColor,
                margin: 0,
              }}>
                {company.name} — {company.subtitle}
              </p>
              <p style={{ fontSize: '8px', marginTop: '2px' }}>
                N° {meta.number} · {meta.date}
              </p>
            </footer>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
