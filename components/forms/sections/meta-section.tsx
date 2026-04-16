'use client';

import { useBudget } from '@/lib/budget-context';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, User, Loader2 } from 'lucide-react';

const RESPONSABLES = ['Elías', 'Pablo', 'Natalia'];

export function MetaSection() {
  const { budget, setMeta, isLoadingNumber } = useBudget();
  const { meta } = budget;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5" />
          Datos del Presupuesto
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="budget-number">Número de Presupuesto</Label>
            <div className="relative">
              <Input
                id="budget-number"
                value={meta.number}
                onChange={(e) => setMeta({ number: e.target.value })}
                placeholder="7143"
                disabled={isLoadingNumber}
                className={isLoadingNumber ? 'opacity-50' : ''}
              />
              {isLoadingNumber && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="pide-number">Nº PIDE</Label>
            <Input
              id="pide-number"
              value={meta.pideNumber ?? ''}
              onChange={(e) => setMeta({ pideNumber: e.target.value })}
              placeholder="Nº de solicitud del equipo"
            />
          </div>

          <div>
            <Label htmlFor="budget-date">Fecha</Label>
            <Input
              id="budget-date"
              value={meta.date}
              onChange={(e) => setMeta({ date: e.target.value })}
              placeholder="01/04/2025"
            />
          </div>

          <div>
            <Label htmlFor="budget-valid-until">Válido hasta</Label>
            <Input
              id="budget-valid-until"
              value={meta.validUntil}
              onChange={(e) => setMeta({ validUntil: e.target.value })}
              placeholder="08/04/2025"
            />
          </div>

          <div className="col-span-2">
            <Label htmlFor="exchange-rate">Tipo de Cambio (TC)</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">$</span>
              <Input
                id="exchange-rate"
                type="number"
                value={meta.exchangeRate}
                onChange={(e) => setMeta({ exchangeRate: Number(e.target.value) })}
                placeholder="1200"
                className="max-w-[160px]"
              />
              <span className="text-sm text-muted-foreground">/ U$S</span>
            </div>
          </div>

          {/* Responsable */}
          <div className="col-span-2">
            <Label className="flex items-center gap-1 mb-2">
              <User className="h-4 w-4" />
              Responsable
            </Label>
            <div className="flex gap-2">
              {RESPONSABLES.map((nombre) => (
                <button
                  key={nombre}
                  type="button"
                  onClick={() => setMeta({ responsable: nombre })}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                    (meta.responsable ?? 'Elías') === nombre
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
                  }`}
                >
                  {nombre}
                </button>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
