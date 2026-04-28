'use client';

import { useBudget } from '@/lib/budget-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calculator, DollarSign } from 'lucide-react';
import { formatARS } from '@/lib/pricing/calculations';

export function TotalsSection() {
  const { budget, setMeta } = useBudget();
  const {
    subtotalLabor,
    subtotalBearings,
    subtotalSpareParts,
    subtotalMachining,
    subtotalGeneral,
    meta,
  } = budget;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calculator className="h-5 w-5" />
          Resumen Económico
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Exchange rate input — at the end so all conversions update before totals are reviewed */}
        <div className="mb-4 p-3 rounded-md bg-muted/40 border">
          <Label htmlFor="exchange-rate-totals" className="flex items-center gap-1 mb-2 text-sm">
            <DollarSign className="h-4 w-4" />
            Tipo de Cambio (TC)
          </Label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">$</span>
            <Input
              id="exchange-rate-totals"
              type="number"
              value={meta.exchangeRate}
              onChange={(e) => setMeta({ exchangeRate: Number(e.target.value) })}
              placeholder="1200"
              className="max-w-[160px]"
            />
            <span className="text-sm text-muted-foreground">/ U$S</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            Editá el TC al final: los importes en USD se reconvierten automáticamente.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between py-1">
            <span className="text-sm text-muted-foreground">Mano de obra</span>
            <span className="text-sm font-medium">{formatARS(subtotalLabor)}</span>
          </div>

          <div className="flex justify-between py-1">
            <span className="text-sm text-muted-foreground">Rodamientos</span>
            <span className="text-sm font-medium">{formatARS(subtotalBearings)}</span>
          </div>

          <div className="flex justify-between py-1">
            <span className="text-sm text-muted-foreground">Repuestos</span>
            <span className="text-sm font-medium">{formatARS(subtotalSpareParts)}</span>
          </div>

          <div className="flex justify-between py-1">
            <span className="text-sm text-muted-foreground">Mecanizados</span>
            <span className="text-sm font-medium">{formatARS(subtotalMachining)}</span>
          </div>

          <div className="border-t pt-2 mt-2">
            <div className="flex justify-between py-1">
              <span className="font-semibold">SUBTOTAL</span>
              <span className="font-bold text-lg">{formatARS(subtotalGeneral)}</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-4">
          Los subtotales se calculan automáticamente. Modificá los valores individuales en cada sección según necesites.
        </p>
      </CardContent>
    </Card>
  );
}
