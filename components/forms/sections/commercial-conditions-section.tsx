'use client';

import { useBudget } from '@/lib/budget-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Receipt, CreditCard, CalendarClock } from 'lucide-react';

const IVA_OPTIONS = [
  { value: '10,5%', label: '10,5%' },
  { value: '21%', label: '21%' },
  { value: '21% materiales y mantenimiento — 10,5% fabricación de bobinado', label: 'Ambos (10,5% + 21%)' },
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

export function CommercialConditionsSection() {
  const { budget, setMeta } = useBudget();
  const { meta } = budget;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Receipt className="h-5 w-5" />
          Condiciones Comerciales
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center gap-1.5 mb-2 text-sm font-medium">
            <Receipt className="h-4 w-4" />
            IVA
          </div>
          <ChipsRow
            options={IVA_OPTIONS}
            current={meta.ivaCondition ?? ''}
            onSelect={(v) => setMeta({ ivaCondition: v })}
          />
          <Input
            value={meta.ivaCondition ?? ''}
            onChange={(e) => setMeta({ ivaCondition: e.target.value })}
            placeholder="O escribí una condición personalizada..."
            className="mt-2 h-8 text-xs"
          />
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
      </CardContent>
    </Card>
  );
}
