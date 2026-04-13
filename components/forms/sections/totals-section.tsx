'use client';

import { useBudget } from '@/lib/budget-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator } from 'lucide-react';
import { formatARS } from '@/lib/pricing/calculations';

export function TotalsSection() {
  const { budget } = useBudget();
  const {
    subtotalLabor,
    subtotalBearings,
    subtotalSpareParts,
    subtotalMachining,
    subtotalGeneral,
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
          Los subtotales se calculan automáticamente. Modifica los valores individuales en cada sección según necesites.
        </p>
      </CardContent>
    </Card>
  );
}
