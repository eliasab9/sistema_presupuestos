'use client';

import { useBudget } from '@/lib/budget-context';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

export function ObservationsSection() {
  const { budget, setMeta } = useBudget();
  const { meta } = budget;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5" />
          Observaciones y Condiciones
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="payment-terms">Forma de Pago</Label>
            <Input
              id="payment-terms"
              value={meta.paymentTerms || ''}
              onChange={(e) => setMeta({ paymentTerms: e.target.value })}
              placeholder="A convenir"
            />
          </div>
          
          <div>
            <Label htmlFor="commercial-validity">Validez del Presupuesto</Label>
            <Input
              id="commercial-validity"
              value={meta.commercialValidity || ''}
              onChange={(e) => setMeta({ commercialValidity: e.target.value })}
              placeholder="7 días hábiles"
            />
          </div>
          
          <div className="col-span-2">
            <Label htmlFor="general-notes">Observaciones Generales</Label>
            <Textarea
              id="general-notes"
              value={meta.generalNotes || ''}
              onChange={(e) => setMeta({ generalNotes: e.target.value })}
              placeholder="IVA: 21% materiales y mantenimiento — 10,5% fabricación de bobinado.&#10;Tipo de cambio utilizado: $1.200 / U$S (referencial a la fecha)."
              rows={4}
              className="resize-none bg-white"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
