'use client';

import { useBudget } from '@/lib/budget-context';
import { formatARS } from '@/lib/pricing/calculations';
import { EQUIPMENT_TYPE_LABELS, COMPANIES } from '@/types/budget';
import type { RepairSection } from '@/types/budget';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SectionTotals {
  labor: number;
  bearings: number;
  spareParts: number;
  machining: number;
}

// ─── Per-section economic breakdown (client-facing) ───────────────────────────
function SectionBreakdown({ section, sectionTotals, primaryColor, isOnly }: {
  section: RepairSection;
  sectionTotals: SectionTotals;
  primaryColor: string;
  isOnly: boolean;
}) {
  const { equipment, workItems, labor, bearings, spareParts, machining } = section;

  const equipmentDisplay = [
    EQUIPMENT_TYPE_LABELS[equipment.type],
    equipment.power ? `${equipment.power} HP` : null,
  ].filter(Boolean).join(' · ');

  // Single unified total
  const sectionTotal =
    sectionTotals.labor +
    sectionTotals.bearings +
    sectionTotals.spareParts +
    sectionTotals.machining;

  // All description lines (labels only, no individual prices shown to client)
  const allDescLines: string[] = [
    ...labor.map(i => i.description),
    ...bearings.map(i => `Rod. ${i.code}${i.quantity > 1 ? ` × ${i.quantity}` : ''}`),
    ...spareParts.map(i => `${i.description}${i.quantity > 1 ? ` × ${i.quantity}` : ''}`),
    ...machining.map(i => `${i.description}${i.quantity > 1 ? ` × ${i.quantity}` : ''}`),
  ];

  const hasEconomics = sectionTotal > 0 || allDescLines.length > 0;

  return (
    <div>
      {/* Equipment header */}
      <section style={{ marginBottom: '12px' }}>
        {!isOnly && (
          <h3 style={{
            fontSize: '11px', fontWeight: 700, color: primaryColor,
            textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px',
          }}>
            {section.label}
          </h3>
        )}
        <h3 style={{
          fontSize: '10px', fontWeight: 700, color: isOnly ? primaryColor : '#555',
          textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px',
        }}>
          Equipo
        </h3>
        <p style={{ fontSize: '11px', fontWeight: 500, color: '#333333', margin: '0 0 2px 0' }}>
          {equipmentDisplay || '—'}
          {equipment.brand  && ` — Marca: ${equipment.brand}`}
          {equipment.model  && ` — Modelo: ${equipment.model}`}
          {equipment.serial && ` — Serie: ${equipment.serial}`}
          {equipment.quantity > 1 && ` — Cant: ${equipment.quantity}`}
        </p>
        {equipment.failureReason && (
          <div style={{ marginTop: '4px', padding: '4px 6px', backgroundColor: '#fff5f5', borderRadius: '3px', borderLeft: '2px solid #dc2626' }}>
            <span style={{ fontWeight: 600, color: '#dc2626', fontSize: '8px', textTransform: 'uppercase' }}>Motivo de la falla: </span>
            <span style={{ fontSize: '10px', color: '#333333' }}>{equipment.failureReason}</span>
          </div>
        )}
      </section>

      {/* Work items */}
      {workItems.length > 0 && (
        <section style={{ marginBottom: '12px' }}>
          <h3 style={{
            fontSize: '10px', fontWeight: 700, color: primaryColor,
            textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px',
          }}>
            Detalle del Trabajo a Realizar
          </h3>
          <p style={{ fontSize: '10px', color: '#333333', margin: 0, lineHeight: 1.5 }}>
            {workItems.map(item => item.description).join(' • ')}
          </p>
        </section>
      )}

      {/* Economic breakdown — single unified section */}
      {hasEconomics && (
        <section style={{ marginBottom: '12px' }}>
          <h3 style={{
            fontSize: '10px', fontWeight: 700, color: primaryColor,
            textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px',
          }}>
            Desglose Económico
          </h3>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
            <tbody>
              <tr>
                <td style={{ padding: '3px 0', color: '#555', fontStyle: 'italic', lineHeight: '1.4' }}>
                  {allDescLines.length > 0
                    ? allDescLines.join(' · ')
                    : 'Trabajos de reparación y materiales'}
                </td>
                <td style={{ padding: '3px 0', textAlign: 'right', fontWeight: 500, color: '#333', width: '100px', verticalAlign: 'top' }}>
                  {formatARS(sectionTotal)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Section subtotal */}
          <div style={{ borderTop: `1px solid ${primaryColor}`, paddingTop: '5px', marginTop: '5px', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600, color: '#555', fontSize: '10px' }}>
              {isOnly ? 'SUBTOTAL' : `Subtotal ${section.label}`}
            </span>
            <span style={{ fontSize: '12px', fontWeight: 700, color: primaryColor }}>
              {formatARS(sectionTotal)}
            </span>
          </div>
        </section>
      )}
    </div>
  );
}

// ─── Main preview ──────────────────────────────────────────────────────────────
export function BudgetPreview() {
  const { budget, effectiveSections } = useBudget();
  const { meta, customer } = budget;

  const company      = COMPANIES[budget.companyId];
  const primaryColor = company.primaryColor;
  const isOnly       = effectiveSections.length === 1;
  const previewFont  = budget.companyId === 'bemec'
    ? "'Changa', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif"
    : "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif";

  // Compute per-section totals. For the active section, use pre-computed budget
  // subtotals (same values shown in TotalsSection — guaranteed correct). For
  // non-active sections, sum directly from their stored item arrays.
  const perSectionTotals: SectionTotals[] = effectiveSections.map((section, idx) => {
    if (idx === budget.activeSectionIdx) {
      return {
        labor:      budget.subtotalLabor,
        bearings:   budget.subtotalBearings,
        spareParts: budget.subtotalSpareParts,
        machining:  budget.subtotalMachining,
      };
    }
    return {
      labor:      section.labor.reduce((s, i) => s + i.priceARS, 0),
      bearings:   section.bearings.reduce((s, i) => s + i.subtotalARS, 0),
      spareParts: section.spareParts.reduce((s, i) => s + i.subtotalARS, 0),
      machining:  section.machining.reduce((s, i) => s + i.subtotalARS, 0),
    };
  });

  // Grand total = active section uses pre-computed budget.subtotalGeneral; other sections computed
  const grandTotal = perSectionTotals.reduce((sum, t) => sum + t.labor + t.bearings + t.spareParts + t.machining, 0);

  return (
    <ScrollArea className="h-full bg-neutral-200">
      <div className="p-3">
        <div style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }}>
          <div
            id="budget-preview"
            data-company-id={budget.companyId}
            style={{
              width: '210mm',
              minHeight: '297mm',
              padding: '15mm 20mm',
              backgroundColor: '#ffffff',
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
              fontFamily: previewFont,
              transform: 'scale(0.5)',
              transformOrigin: 'top left',
              position: 'relative',
            }}
          >
            {/* Header */}
            <header style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
              marginBottom: '16px', paddingBottom: '10px', borderBottom: `2px solid ${primaryColor}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img src={company.logo} alt={company.name}
                  style={{ width: '60px', height: '60px', objectFit: 'contain' }}
                  crossOrigin="anonymous"
                />
                <div>
                  <h1 style={{ fontSize: '26px', fontWeight: 800, color: primaryColor, margin: 0, letterSpacing: '-0.5px' }}>
                    {company.name}
                  </h1>
                  <p style={{ fontSize: '10px', color: '#666', margin: '2px 0 0 0' }}>{company.subtitle}</p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#333', margin: 0 }}>
                  PRESUPUESTO N° {meta.number}
                </h2>
                {meta.pideNumber && (
                  <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#333', margin: '2px 0 0 0' }}>
                    N° PIDE {meta.pideNumber}
                  </h2>
                )}
                <p style={{ fontSize: '10px', color: '#666', margin: '2px 0' }}>Fecha: {meta.date}</p>
                <p style={{ fontSize: '10px', color: '#666', margin: '2px 0' }}>Válido hasta: {meta.validUntil}</p>
                <p style={{ fontSize: '9px', color: '#888', margin: '2px 0' }}>
                  TC: ${meta.exchangeRate.toLocaleString('es-AR')} / U$S
                </p>
              </div>
            </header>

            {/* Customer Data */}
            <section style={{ marginBottom: '12px' }}>
              <h3 style={{
                fontSize: '10px', fontWeight: 700, color: primaryColor,
                textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px',
              }}>
                Datos del Cliente
              </h3>
              <div style={{
                backgroundColor: '#f8f8f8', borderRadius: '4px', padding: '8px',
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', fontSize: '10px',
              }}>
                <div>
                  <span style={{ fontWeight: 600, color: '#555', fontSize: '8px', textTransform: 'uppercase' }}>CLIENTE</span>
                  <p style={{ color: '#333', margin: '1px 0 0 0' }}>{customer.name || '—'}</p>
                </div>
                <div>
                  <span style={{ fontWeight: 600, color: '#555', fontSize: '8px', textTransform: 'uppercase' }}>ATENCIÓN</span>
                  <p style={{ color: '#333', margin: '1px 0 0 0' }}>{customer.attention || '—'}</p>
                </div>
                <div>
                  <span style={{ fontWeight: 600, color: '#555', fontSize: '8px', textTransform: 'uppercase' }}>EMAIL</span>
                  <p style={{ color: '#333', margin: '1px 0 0 0' }}>{customer.email || '—'}</p>
                </div>
                <div>
                  <span style={{ fontWeight: 600, color: '#555', fontSize: '8px', textTransform: 'uppercase' }}>TELÉFONO</span>
                  <p style={{ color: '#333', margin: '1px 0 0 0' }}>{customer.phone || '—'}</p>
                </div>
                {customer.cuit && (
                  <div>
                    <span style={{ fontWeight: 600, color: '#555', fontSize: '8px', textTransform: 'uppercase' }}>CUIT</span>
                    <p style={{ color: '#333', margin: '1px 0 0 0' }}>{customer.cuit}</p>
                  </div>
                )}
                {customer.address && (
                  <div>
                    <span style={{ fontWeight: 600, color: '#555', fontSize: '8px', textTransform: 'uppercase' }}>DIRECCIÓN</span>
                    <p style={{ color: '#333', margin: '1px 0 0 0' }}>
                      {[customer.address, customer.locality, customer.province].filter(Boolean).join(', ')}
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* Sections */}
            {effectiveSections.map((section, idx) => (
              <div key={section.id}>
                {!isOnly && idx > 0 && (
                  <div style={{ borderTop: '1px dashed #ddd', marginBottom: '12px', marginTop: '4px' }} />
                )}
                <SectionBreakdown
                  section={section}
                  sectionTotals={perSectionTotals[idx]}
                  primaryColor={primaryColor}
                  isOnly={isOnly}
                />
              </div>
            ))}

            {/* Grand total (only if multiple sections) */}
            {!isOnly && (
              <div style={{
                borderTop: `2px solid ${primaryColor}`, paddingTop: '10px', marginTop: '8px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontWeight: 700, color: '#333', fontSize: '13px' }}>TOTAL GENERAL</span>
                <span style={{ fontSize: '18px', fontWeight: 700, color: primaryColor }}>
                  {formatARS(grandTotal)}
                </span>
              </div>
            )}

            {/* Observations */}
            <section style={{ marginBottom: '16px', marginTop: isOnly ? '0' : '12px' }}>
              <h3 style={{
                fontSize: '10px', fontWeight: 700, color: primaryColor,
                textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px',
              }}>
                Observaciones
              </h3>
              <div style={{ fontSize: '9px', color: '#555', lineHeight: 1.4 }}>
                <p style={{ margin: '2px 0' }}>• Precios expresados en pesos argentinos. IVA no incluido.</p>
                <p style={{ margin: '2px 0' }}>• TC utilizado: ${meta.exchangeRate.toLocaleString('es-AR')} / U$S (referencial). Validez: {meta.commercialValidity || '7 días hábiles'}. Pago: {meta.paymentTerms || 'A convenir'}.</p>
                {meta.generalNotes && (
                  <p style={{ marginTop: '4px', whiteSpace: 'pre-line' }}>{meta.generalNotes}</p>
                )}
              </div>
            </section>

            {/* Footer */}
            <footer style={{
              position: 'absolute', bottom: '12px', left: '20mm', right: '20mm',
              textAlign: 'center', paddingTop: '8px', borderTop: '1px solid #ccc',
              fontSize: '9px', color: '#888',
            }}>
              <p style={{ fontWeight: 600, color: primaryColor, margin: '0' }}>
                {company.name} — {company.subtitle} · Mendoza, Argentina
              </p>
              <p style={{ fontSize: '8px', marginTop: '2px' }}>N° {meta.number} · {meta.date}</p>
            </footer>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
