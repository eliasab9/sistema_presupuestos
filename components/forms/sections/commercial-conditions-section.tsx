'use client';

import { useBudget } from '@/lib/budget-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Receipt, CreditCard, CalendarClock, Truck } from 'lucide-react';
import type { BudgetMeta } from '@/types/budget';
import {
  IVA_CONDITION_REDUCED,
  IVA_CONDITION_GENERAL,
  IVA_CONDITION_SPLIT,
} from '@/lib/pricing/calculations';

// El valor es a la vez el texto que se imprime y la clave que decide la
// alícuota, así que tiene que coincidir exacto con las constantes.
const IVA_OPTIONS = [
  { value: IVA_CONDITION_REDUCED, label: '10,5%' },
  { value: IVA_CONDITION_GENERAL, label: '21%' },
  { value: IVA_CONDITION_SPLIT, label: 'Ambos (10,5% + 21%)' },
];

const PAYMENT_OPTIONS = [
  { value: 'CPD 30 días', label: 'CPD 30 días' },
  { value: 'Transferencia bancaria', label: 'Transferencia' },
  { value: 'Efectivo', label: 'Efectivo' },
];

const VALIDITY_OPTIONS = [
  { value: '7 días hábiles', label: '7 días hábiles' },
  { value: 'A convenir', label: 'A convenir' },
];

const DELIVERY_OPTIONS = [
  { value: 'Inmediata', label: 'Inmediata' },
  { value: '15 días', label: '15 días' },
  { value: '30 días', label: '30 días' },
  { value: 'A convenir', label: 'A convenir' },
];

interface ChipsRowProps {
  options: { value: string; label: string }[];
  current: string;
  onSelect: (value: string) => void;
}

function ChipsRow({ options, current, onSelect }: ChipsRowProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const isActive = current === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onSelect(isActive ? '' : opt.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              isActive
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

interface CommercialConditionsFieldsProps {
  meta: BudgetMeta;
  setMeta: (meta: Partial<BudgetMeta>) => void;
  /**
   * Equipo nuevo cotiza con una sola alícuota: vender un equipo no se parte
   * entre bobinado y materiales como una reparación.
   */
  allowSplitIva?: boolean;
}

/**
 * Campos de condiciones comerciales sin contenedor, para que cada formulario
 * los envuelva con su propio encabezado (Card en reparación, section en equipo
 * nuevo) sin duplicar los chips ni las opciones.
 */
export function CommercialConditionsFields({
  meta,
  setMeta,
  allowSplitIva = true,
}: CommercialConditionsFieldsProps) {
  const ivaOptions = allowSplitIva
    ? IVA_OPTIONS
    : IVA_OPTIONS.filter((o) => o.value !== IVA_CONDITION_SPLIT);

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-1.5 mb-2 text-sm font-medium">
          <Receipt className="h-4 w-4" />
          IVA
        </div>
        <ChipsRow
          options={ivaOptions}
          current={meta.ivaCondition ?? ''}
          onSelect={(v) => setMeta({ ivaCondition: v })}
        />
        <Input
          value={meta.ivaCondition ?? ''}
          onChange={(e) => setMeta({ ivaCondition: e.target.value })}
          placeholder="O escribí una condición personalizada..."
          className="mt-2 h-8 text-xs"
        />
        <p className="text-[11px] text-muted-foreground mt-1.5">
          Sin alícuota elegida el presupuesto sale neto, sin tabla de IVA.
        </p>
      </div>

      <div>
        <div className="flex items-center gap-1.5 mb-2 text-sm font-medium">
          <CreditCard className="h-4 w-4" />
          Forma de Pago
        </div>
        <ChipsRow
          options={PAYMENT_OPTIONS}
          current={meta.paymentTerms ?? ''}
          onSelect={(v) => setMeta({ paymentTerms: v })}
        />
        <Input
          value={meta.paymentTerms ?? ''}
          onChange={(e) => setMeta({ paymentTerms: e.target.value })}
          placeholder="O escribí una forma personalizada..."
          className="mt-2 h-8 text-xs"
        />
      </div>

      <div>
        <div className="flex items-center gap-1.5 mb-2 text-sm font-medium">
          <Truck className="h-4 w-4" />
          Plazo de Entrega
        </div>
        <ChipsRow
          options={DELIVERY_OPTIONS}
          current={meta.deliveryTime ?? ''}
          onSelect={(v) => setMeta({ deliveryTime: v })}
        />
        <Input
          value={meta.deliveryTime ?? ''}
          onChange={(e) => setMeta({ deliveryTime: e.target.value })}
          placeholder="O escribí un plazo personalizado..."
          className="mt-2 h-8 text-xs"
        />
      </div>

      <div>
        <div className="flex items-center gap-1.5 mb-2 text-sm font-medium">
          <CalendarClock className="h-4 w-4" />
          Validez del Presupuesto
        </div>
        <ChipsRow
          options={VALIDITY_OPTIONS}
          current={meta.commercialValidity ?? ''}
          onSelect={(v) => setMeta({ commercialValidity: v })}
        />
        <Input
          value={meta.commercialValidity ?? ''}
          onChange={(e) => setMeta({ commercialValidity: e.target.value })}
          placeholder="O escribí una validez personalizada..."
          className="mt-2 h-8 text-xs"
        />
      </div>
    </div>
  );
}

export function CommercialConditionsSection() {
  const { budget, setMeta } = useBudget();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Receipt className="h-5 w-5" />
          Condiciones Comerciales
        </CardTitle>
      </CardHeader>
      <CardContent>
        <CommercialConditionsFields meta={budget.meta} setMeta={setMeta} />
      </CardContent>
    </Card>
  );
}
