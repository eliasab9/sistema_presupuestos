'use client';

import { useBudget } from '@/lib/budget-context';
import { formatARS } from '@/lib/pricing/calculations';
import { EQUIPMENT_TYPE_LABELS, COMPANIES } from '@/types/budget';
import { ScrollArea } from '@/components/ui/scroll-area';

export function BudgetPreview() {
  const { budget } = useBudget();
  const { meta, customer, equipment, workItems, labor, bearings, spareParts, machining } = budget;

  // Get company data
  const company = COMPANIES[budget.companyId];
  const primaryColor = company.primaryColor;

  // Build equipment display string
  const equipmentDisplay = [
    EQUIPMENT_TYPE_LABELS[equipment.type],
    equipment.subtype,
    equipment.power ? `${equipment.power} HP` : null,
  ].filter(Boolean).join(' · ');

  return (
    <ScrollArea className="h-full bg-neutral-200">
      <div className="p-3">
        {/* A4 Page Container - Miniature Preview */}
        <div 
          style={{
            width: '100%',
            maxWidth: '400px',
            margin: '0 auto',
          }}
        >
          <div 
            id="budget-preview"
            data-company-id={budget.companyId}
            style={{
              width: '210mm',
              minHeight: '297mm',
              padding: '15mm 20mm',
              backgroundColor: '#ffffff',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
              fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
              transform: 'scale(0.5)',
              transformOrigin: 'top left',
              position: 'relative',
            }}
          >
          {/* Header */}
          <header style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '16px',
            paddingBottom: '10px',
            borderBottom: `2px solid ${primaryColor}`,
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
                  fontSize: '26px', 
                  fontWeight: 800, 
                  color: primaryColor, 
                  margin: 0,
                  letterSpacing: '-0.5px',
                }}>
                  {company.name}
                </h1>
                <p style={{ fontSize: '10px', color: '#666666', margin: '2px 0 0 0' }}>
                  {company.subtitle}
                </p>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#333333', margin: 0 }}>
                PRESUPUESTO N° {meta.number}
              </h2>
              {meta.pideNumber && (
                <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#333333', margin: '2px 0 0 0' }}>
                  N° PIDE {meta.pideNumber}
                </h2>
              )}
              <p style={{ fontSize: '10px', color: '#666666', margin: '2px 0' }}>Fecha: {meta.date}</p>
              <p style={{ fontSize: '10px', color: '#666666', margin: '2px 0' }}>Válido hasta: {meta.validUntil}</p>
              <p style={{ fontSize: '9px', color: '#888888', margin: '2px 0' }}>
                TC: ${meta.exchangeRate.toLocaleString('es-AR')} / U$S
              </p>
            </div>
          </header>

          {/* Customer Data */}
          <section style={{ marginBottom: '12px' }}>
            <h3 style={{ 
              fontSize: '10px', 
              fontWeight: 700, 
              color: primaryColor, 
              textTransform: 'uppercase', 
              letterSpacing: '0.5px',
              marginBottom: '4px',
            }}>
              Datos del Cliente
            </h3>
            <div style={{ 
              backgroundColor: '#f8f8f8', 
              borderRadius: '4px', 
              padding: '8px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '4px 16px',
              fontSize: '10px',
            }}>
              <div>
                <span style={{ fontWeight: 600, color: '#555555', fontSize: '8px', textTransform: 'uppercase' }}>CLIENTE</span>
                <p style={{ color: '#333333', margin: '1px 0 0 0' }}>{customer.name || '—'}</p>
              </div>
              <div>
                <span style={{ fontWeight: 600, color: '#555555', fontSize: '8px', textTransform: 'uppercase' }}>ATENCIÓN</span>
                <p style={{ color: '#333333', margin: '1px 0 0 0' }}>{customer.attention || '—'}</p>
              </div>
              <div>
                <span style={{ fontWeight: 600, color: '#555555', fontSize: '8px', textTransform: 'uppercase' }}>EMAIL</span>
                <p style={{ color: '#333333', margin: '1px 0 0 0' }}>{customer.email || '—'}</p>
              </div>
              <div>
                <span style={{ fontWeight: 600, color: '#555555', fontSize: '8px', textTransform: 'uppercase' }}>TELÉFONO</span>
                <p style={{ color: '#333333', margin: '1px 0 0 0' }}>{customer.phone || '—'}</p>
              </div>
              {customer.cuit && (
                <div>
                  <span style={{ fontWeight: 600, color: '#555555', fontSize: '8px', textTransform: 'uppercase' }}>CUIT</span>
                  <p style={{ color: '#333333', margin: '1px 0 0 0' }}>{customer.cuit}</p>
                </div>
              )}
              {customer.address && (
                <div>
                  <span style={{ fontWeight: 600, color: '#555555', fontSize: '8px', textTransform: 'uppercase' }}>DIRECCIÓN</span>
                  <p style={{ color: '#333333', margin: '1px 0 0 0' }}>
                    {[customer.address, customer.locality, customer.province].filter(Boolean).join(', ')}
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Equipment */}
          <section style={{ marginBottom: '12px' }}>
            <h3 style={{ 
              fontSize: '10px', 
              fontWeight: 700, 
              color: primaryColor, 
              textTransform: 'uppercase', 
              letterSpacing: '0.5px',
              marginBottom: '4px',
            }}>
              Equipo
            </h3>
            <p style={{ fontSize: '11px', fontWeight: 500, color: '#333333', margin: '0 0 2px 0' }}>
              {equipmentDisplay || '—'}
              {equipment.brand && ` — Marca: ${equipment.brand}`}
              {equipment.model && ` — Modelo: ${equipment.model}`}
              {equipment.serial && ` — Serie: ${equipment.serial}`}
            </p>
            {equipment.failureReason && (
              <div style={{ marginTop: '4px', padding: '4px 6px', backgroundColor: '#fff5f5', borderRadius: '3px', borderLeft: '2px solid #dc2626' }}>
                <span style={{ fontWeight: 600, color: '#dc2626', fontSize: '8px', textTransform: 'uppercase' }}>Motivo de la falla: </span>
                <span style={{ fontSize: '10px', color: '#333333' }}>{equipment.failureReason}</span>
              </div>
            )}
          </section>

          {/* Work Details */}
          {workItems.length > 0 && (
            <section style={{ marginBottom: '16px' }}>
              <h3 style={{ 
                fontSize: '11px', 
                fontWeight: 700, 
                color: primaryColor, 
                textTransform: 'uppercase', 
                letterSpacing: '0.5px',
                marginBottom: '6px',
              }}>
                Detalle del Trabajo a Realizar
              </h3>
              <p style={{ fontSize: '11px', color: '#333333', margin: 0, lineHeight: 1.5 }}>
                {workItems.map((item) => item.description).join(' • ')}
              </p>
            </section>
          )}

          {/* Economic Breakdown */}
          {(() => {
            const windingItems = labor.filter(i => i.description.toLowerCase().includes('bobinado'));
            const otherLabor   = labor.filter(i => !i.description.toLowerCase().includes('bobinado'));
            const hasWinding   = windingItems.length > 0;

            // Si hay bobinado → excluir mano de obra de mantenimiento del bloque de materiales
            // Si no hay bobinado → incluir mano de obra de mantenimiento en materiales
            const materialesLaborItems = hasWinding ? [] : otherLabor;

            // Descripción detallada de los ítems (sin precios individuales)
            const materialesDescLines: string[] = [
              ...materialesLaborItems.map(i => i.description),
              ...bearings.map(i => `Rod. ${i.code}${i.quantity > 1 ? ` × ${i.quantity}` : ''}`),
              ...spareParts.map(i => `${i.description}${i.quantity > 1 ? ` × ${i.quantity}` : ''}`),
              ...machining.map(i => `${i.description}${i.quantity > 1 ? ` × ${i.quantity}` : ''}`),
            ];

            const materialesTotal =
              materialesLaborItems.reduce((s, i) => s + i.priceARS, 0) +
              bearings.reduce((s, i) => s + i.subtotalARS, 0) +
              spareParts.reduce((s, i) => s + i.subtotalARS, 0) +
              machining.reduce((s, i) => s + i.subtotalARS, 0);

            const hasMateriales = materialesTotal > 0 || materialesDescLines.length > 0;

            return (
              <section style={{ marginBottom: '12px' }}>
                <h3 style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: primaryColor,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '6px',
                }}>
                  Desglose Económico
                </h3>

                <div>
                  {/* Categoría 1: Fabricación de Bobinado (solo si hay bobinado) */}
                  {hasWinding && (
                    <div style={{ marginBottom: '8px' }}>
                      <h4 style={{
                        fontSize: '9px', fontWeight: 700, color: '#444444',
                        textTransform: 'uppercase', marginBottom: '3px',
                        borderBottom: '1px solid #e5e5e5', paddingBottom: '2px',
                      }}>
                        Fabricación de Bobinado
                      </h4>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                        <tbody>
                          {windingItems.map((item) => (
                            <tr key={item.id}>
                              <td style={{ padding: '3px 0', color: '#333333' }}>{item.description}</td>
                              <td style={{ padding: '3px 0', textAlign: 'right', fontWeight: 500, color: '#333333', width: '100px' }}>
                                {formatARS(item.priceARS)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Categoría 2: Materiales y Mantenimiento — lista de ítems + total unificado */}
                  {hasMateriales && (
                    <div style={{ marginBottom: '8px' }}>
                      <h4 style={{
                        fontSize: '9px', fontWeight: 700, color: '#444444',
                        textTransform: 'uppercase', marginBottom: '3px',
                        borderBottom: '1px solid #e5e5e5', paddingBottom: '2px',
                      }}>
                        Materiales y Mantenimiento
                      </h4>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                        <tbody>
                          <tr>
                            <td style={{ padding: '3px 0', color: '#555555', fontStyle: 'italic', lineHeight: '1.4' }}>
                              {materialesDescLines.length > 0
                                ? materialesDescLines.join(' · ')
                                : 'Materiales y mantenimiento'}
                            </td>
                            <td style={{ padding: '3px 0', textAlign: 'right', fontWeight: 500, color: '#333333', width: '100px', verticalAlign: 'top' }}>
                              {formatARS(materialesTotal)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Subtotal — suma exacta de lo que se muestra */}
                  {(() => {
                    const windingTotal = windingItems.reduce((s, i) => s + i.priceARS, 0);
                    const displayedTotal = windingTotal + materialesTotal;
                    return (
                      <div style={{ borderTop: `2px solid ${primaryColor}`, paddingTop: '8px', marginTop: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, color: '#333333', fontSize: '12px' }}>SUBTOTAL</span>
                          <span style={{ fontSize: '16px', fontWeight: 700, color: primaryColor }}>
                            {formatARS(displayedTotal)}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </section>
            );
          })()}

          {/* Observations */}
          <section style={{ marginBottom: '16px' }}>
            <h3 style={{ 
              fontSize: '10px', 
              fontWeight: 700, 
              color: primaryColor, 
              textTransform: 'uppercase', 
              letterSpacing: '0.5px',
              marginBottom: '4px',
            }}>
              Observaciones
            </h3>
            <div style={{ fontSize: '9px', color: '#555555', lineHeight: 1.4 }}>
              <p style={{ margin: '2px 0' }}>• IVA: 21% materiales y mantenimiento — 10,5% fabricación de bobinado.</p>
              <p style={{ margin: '2px 0' }}>• TC utilizado: ${meta.exchangeRate.toLocaleString('es-AR')} / U$S (referencial). Validez: {meta.commercialValidity || '7 días hábiles'}. Pago: {meta.paymentTerms || 'A convenir'}.</p>
              {meta.generalNotes && (
                <p style={{ marginTop: '4px', whiteSpace: 'pre-line' }}>{meta.generalNotes}</p>
              )}
            </div>
          </section>

          {/* Footer */}
          <footer style={{ 
            position: 'absolute',
            bottom: '12px',
            left: '20mm',
            right: '20mm',
            textAlign: 'center',
            paddingTop: '8px',
            borderTop: '1px solid #cccccc',
            fontSize: '9px',
            color: '#888888',
          }}>
            <p style={{ fontWeight: 600, color: primaryColor, margin: '0' }}>{company.name} — {company.subtitle} · Mendoza, Argentina</p>
            <p style={{ fontSize: '8px', marginTop: '2px' }}>N° {meta.number} · {meta.date}</p>
          </footer>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
