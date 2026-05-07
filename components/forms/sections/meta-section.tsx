'use client';

import { useBudget } from '@/lib/budget-context';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Loader2 } from 'lucide-react';
import { SellerPicker, type SellerFromApi } from './seller-picker';

export function MetaSection() {
  const { budget, setMeta, isLoadingNumber } = useBudget();
  const { meta, companyId } = budget;

  const handleSelectSeller = (seller: SellerFromApi) => {
    setMeta({
      responsable: seller.name,
      sellerId: seller.id,
      sellerSignature: seller.signature ?? '',
      sellerSignatureFileName: seller.signatureFileName ?? '',
      sellerSignatureFileBase64: seller.signatureFileBase64 ?? '',
    });
  };

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

          {/* Tipo de cambio */}
          <div className="sm:col-span-2">
            <Label htmlFor="exchange-rate">
              Tipo de Cambio (TC)
              <span className="text-muted-foreground font-normal ml-1">
                — actualiza los precios de rodamientos, repuestos y mecanizados
              </span>
            </Label>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground">$</span>
              <Input
                id="exchange-rate"
                type="number"
                min="0"
                step="1"
                value={meta.exchangeRate === 0 ? '' : meta.exchangeRate}
                onChange={(e) => {
                  const val = e.target.value === '' ? 0 : Number(e.target.value);
                  setMeta({ exchangeRate: val });
                }}
                placeholder="Ingresá el tipo de cambio..."
                className="max-w-[220px]"
              />
            </div>
          </div>

          {/* Responsable + firma */}
          <div className="sm:col-span-2">
            <SellerPicker
              companyId={companyId}
              responsable={meta.responsable}
              onSelect={handleSelectSeller}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
