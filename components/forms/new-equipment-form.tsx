'use client';

import { useState, useEffect, useCallback } from 'react';
import { useNewEquipment } from '@/lib/new-equipment-context';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Trash2, Zap, Droplets, Settings, Gauge, Package, ChevronsUpDown, Check, Plus, X, Loader2 } from 'lucide-react';
import { NEW_EQUIPMENT_TYPE_LABELS, type NewEquipmentType, type NewEquipmentItem } from '@/types/budget';
import { NewEquipmentDeliveryPanel } from '@/components/delivery/new-equipment-delivery-panel';
import { SellerPicker, type SellerFromApi } from '@/components/forms/sections/seller-picker';
import { cn } from '@/lib/utils';

const EQUIPMENT_ICONS: Record<NewEquipmentType, React.ReactNode> = {
  motor_electrico: <Zap className="h-4 w-4" />,
  bomba_centrifuga: <Droplets className="h-4 w-4" />,
  bomba_vacio: <Droplets className="h-4 w-4" />,
  reductor_velocidad: <Settings className="h-4 w-4" />,
  variador_frecuencia: <Gauge className="h-4 w-4" />,
  otro: <Package className="h-4 w-4" />,
};

// Standard HP values matching the labor pricing table
const STANDARD_HP_VALUES = [
  0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 5.5, 7.5, 10, 12.5, 15, 20, 25, 30, 40, 50, 60, 75, 100, 125, 150, 180, 220,
];

function HPSelector({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (val: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState('');

  const handleSelect = (hp: number) => {
    onChange(`${hp} HP`);
    setOpen(false);
  };

  const handleCustom = () => {
    const v = parseFloat(custom);
    if (!isNaN(v) && v > 0) {
      onChange(`${v} HP`);
      setCustom('');
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal h-9"
        >
          {value || 'Seleccionar potencia'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="start">
        <div className="p-2 border-b">
          <div className="flex gap-2">
            <Input
              type="number"
              step="0.25"
              min="0.25"
              placeholder="HP personalizado"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCustom();
              }}
              className="h-8"
            />
            <Button size="sm" className="h-8 px-2" onClick={handleCustom}>OK</Button>
          </div>
        </div>
        <div className="max-h-[200px] overflow-y-auto">
          {STANDARD_HP_VALUES.map((hp) => {
            const label = `${hp} HP`;
            return (
              <button
                key={hp}
                type="button"
                onClick={() => handleSelect(hp)}
                className={cn(
                  'relative flex cursor-pointer select-none items-center w-full px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground',
                  value === label && 'bg-accent',
                )}
              >
                <Check className={cn('mr-2 h-4 w-4', value === label ? 'opacity-100' : 'opacity-0')} />
                {label}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function EquipmentItemCard({ item }: { item: NewEquipmentItem }) {
  const { updateItem, removeItem } = useNewEquipment();

  const renderSpecificFields = () => {
    switch (item.type) {
      case 'motor_electrico':
      case 'bomba_centrifuga':
      case 'bomba_vacio':
        return (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Potencia (HP)</Label>
                <HPSelector
                  value={item.potencia}
                  onChange={(val) => updateItem(item.id, { potencia: val })}
                />
              </div>
              <div>
                <Label className="text-xs">RPM</Label>
                <Input
                  type="number"
                  value={item.rpm || ''}
                  onChange={(e) => updateItem(item.id, { rpm: parseInt(e.target.value) || undefined })}
                  placeholder="Ej: 1500"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Forma Constructiva</Label>
                <Input
                  value={item.formaConstructiva || ''}
                  onChange={(e) => updateItem(item.id, { formaConstructiva: e.target.value })}
                  placeholder="Ej: B3, B5, B35"
                />
              </div>
              <div>
                <Label className="text-xs">Voltaje</Label>
                <Input
                  value={item.voltaje || ''}
                  onChange={(e) => updateItem(item.id, { voltaje: e.target.value })}
                  placeholder="Ej: 220/380V"
                />
              </div>
            </div>
          </>
        );
      
      case 'reductor_velocidad':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Relación de Transmisión</Label>
              <Input
                value={item.relacionTransmision || ''}
                onChange={(e) => updateItem(item.id, { relacionTransmision: e.target.value })}
                placeholder="Ej: 10:1, 20:1"
              />
            </div>
            <div>
              <Label className="text-xs">Potencia (HP)</Label>
              <HPSelector
                value={item.potencia}
                onChange={(val) => updateItem(item.id, { potencia: val })}
              />
            </div>
          </div>
        );
      
      case 'variador_frecuencia':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Voltaje de Entrada</Label>
              <Input
                value={item.voltajeEntrada || ''}
                onChange={(e) => updateItem(item.id, { voltajeEntrada: e.target.value })}
                placeholder="Ej: 220V, 380V"
              />
            </div>
            <div>
              <Label className="text-xs">Potencia (kW)</Label>
              <Input
                value={item.potenciaKW || ''}
                onChange={(e) => updateItem(item.id, { potenciaKW: e.target.value })}
                placeholder="Ej: 2.2 kW"
              />
            </div>
          </div>
        );
      
      case 'otro':
        return (
          <>
            <div>
              <Label className="text-xs">Descripción del Equipo</Label>
              <Input
                value={item.customDescription || ''}
                onChange={(e) => updateItem(item.id, { customDescription: e.target.value })}
                placeholder="Nombre o tipo de equipo"
              />
            </div>
            <div>
              <Label className="text-xs">Especificaciones</Label>
              <Textarea
                value={item.customSpecs || ''}
                onChange={(e) => updateItem(item.id, { customSpecs: e.target.value })}
                placeholder="Detalles técnicos del equipo..."
                rows={2}
              />
            </div>
          </>
        );
      
      default:
        return null;
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {EQUIPMENT_ICONS[item.type]}
            <CardTitle className="text-base">
              {item.type === 'otro' && item.customDescription
                ? item.customDescription
                : NEW_EQUIPMENT_TYPE_LABELS[item.type]}
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => removeItem(item.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Common fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Marca</Label>
            <Input
              value={item.brand}
              onChange={(e) => updateItem(item.id, { brand: e.target.value })}
              placeholder="Ej: WEG, Siemens"
            />
          </div>
          <div>
            <Label className="text-xs">Modelo</Label>
            <Input
              value={item.model}
              onChange={(e) => updateItem(item.id, { model: e.target.value })}
              placeholder="Modelo del equipo"
            />
          </div>
        </div>

        {/* Type-specific fields */}
        {renderSpecificFields()}

        <Separator />

        {/* Pricing */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Cantidad</Label>
            <Input
              type="number"
              min={1}
              value={item.quantity}
              onChange={(e) => updateItem(item.id, { quantity: parseInt(e.target.value) || 1 })}
            />
          </div>
          <div>
            <Label className="text-xs">Precio Unit. (ARS)</Label>
            <Input
              type="number"
              min={0}
              value={item.unitPriceARS || ''}
              onChange={(e) => updateItem(item.id, { unitPriceARS: parseFloat(e.target.value) || 0 })}
              placeholder="0"
            />
          </div>
          <div>
            <Label className="text-xs">Subtotal</Label>
            <div className="h-9 flex items-center px-3 bg-muted rounded-md font-medium">
              {formatCurrency(item.subtotalARS)}
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <Label className="text-xs">Notas (opcional)</Label>
          <Input
            value={item.notes || ''}
            onChange={(e) => updateItem(item.id, { notes: e.target.value })}
            placeholder="Observaciones adicionales..."
          />
        </div>
      </CardContent>
    </Card>
  );
}

interface CustomEquipmentType {
  id: string;
  label: string;
}

export function NewEquipmentForm() {
  const { budget, setMeta, setCustomer, addItem, addCustomItem } = useNewEquipment();
  const [customEquipTypes, setCustomEquipTypes] = useState<CustomEquipmentType[]>([]);
  const [loadingEquipTypes, setLoadingEquipTypes] = useState(false);
  const [newEquipTypeName, setNewEquipTypeName] = useState('');

  const fetchCustomEquipTypes = useCallback(async (companyId: string) => {
    setLoadingEquipTypes(true);
    try {
      const res = await fetch(`/api/equipment-types?companyId=${companyId}&budgetType=equipo_nuevo`);
      if (res.ok) setCustomEquipTypes(await res.json());
    } finally {
      setLoadingEquipTypes(false);
    }
  }, []);

  useEffect(() => { fetchCustomEquipTypes(budget.companyId); }, [budget.companyId, fetchCustomEquipTypes]);

  const handleAddCustomEquipType = async () => {
    const label = newEquipTypeName.trim();
    if (!label) return;
    setNewEquipTypeName('');
    const res = await fetch('/api/equipment-types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId: budget.companyId, budgetType: 'equipo_nuevo', label }),
    });
    if (res.ok) {
      const created: CustomEquipmentType = await res.json();
      setCustomEquipTypes(prev => [...prev, created]);
      addCustomItem(label);
    }
  };

  const handleDeleteCustomEquipType = async (ct: CustomEquipmentType) => {
    await fetch(`/api/equipment-types/${ct.id}`, { method: 'DELETE' });
    setCustomEquipTypes(prev => prev.filter(t => t.id !== ct.id));
  };

  const handleSelectSeller = (seller: SellerFromApi) => {
    setMeta({
      responsable: seller.name,
      sellerId: seller.id,
      sellerSignature: seller.signature ?? '',
      sellerSignatureFileName: seller.signatureFileName ?? '',
      sellerSignatureFileBase64: seller.signatureFileBase64 ?? '',
    });
  };
  const { meta, customer, items, subtotalItems } = budget;

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6">
        {/* Budget Meta */}
        <section>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
            Datos del Presupuesto
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">N° Presupuesto</Label>
              <Input
                value={meta.number}
                onChange={(e) => setMeta({ number: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">Nº PIDE</Label>
              <Input
                value={meta.pideNumber ?? ''}
                onChange={(e) => setMeta({ pideNumber: e.target.value })}
                placeholder="Solicitud del equipo"
              />
            </div>
            <div>
              <Label className="text-xs">Fecha</Label>
              <Input
                value={meta.date}
                onChange={(e) => setMeta({ date: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">Válido hasta</Label>
              <Input
                value={meta.validUntil}
                onChange={(e) => setMeta({ validUntil: e.target.value })}
              />
            </div>
          </div>
          <div className="mt-4">
            <SellerPicker
              companyId={budget.companyId}
              responsable={meta.responsable}
              onSelect={handleSelectSeller}
            />
          </div>
        </section>

        <Separator />

        {/* Customer Data */}
        <section>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
            Datos del Cliente
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Cliente</Label>
              <Input
                value={customer.name || ''}
                onChange={(e) => setCustomer({ name: e.target.value })}
                placeholder="Nombre o razón social"
              />
            </div>
            <div>
              <Label className="text-xs">Atención</Label>
              <Input
                value={customer.attention || ''}
                onChange={(e) => setCustomer({ attention: e.target.value })}
                placeholder="Persona de contacto"
              />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input
                type="email"
                value={customer.email || ''}
                onChange={(e) => setCustomer({ email: e.target.value })}
                placeholder="email@ejemplo.com"
              />
            </div>
            <div>
              <Label className="text-xs">Teléfono</Label>
              <Input
                value={customer.phone || ''}
                onChange={(e) => setCustomer({ phone: e.target.value })}
                placeholder="+54 11 1234-5678"
              />
            </div>
          </div>
        </section>

        <Separator />

        {/* Equipment Items */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Equipos
            </h3>
          </div>

          {/* Add Equipment Buttons */}
          <div className="space-y-3 mb-4">
            {/* Standard types */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Tipos de equipo
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(NEW_EQUIPMENT_TYPE_LABELS) as NewEquipmentType[]).map((type) => (
                  <Button
                    key={type}
                    variant="outline"
                    size="sm"
                    onClick={() => addItem(type)}
                    className="gap-1.5 h-8 text-xs"
                  >
                    {EQUIPMENT_ICONS[type]}
                    {NEW_EQUIPMENT_TYPE_LABELS[type]}
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom types from DB */}
            {(loadingEquipTypes && customEquipTypes.length === 0) ? (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Cargando...
              </div>
            ) : customEquipTypes.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {customEquipTypes.map((ct) => (
                  <div key={ct.id} className="flex items-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addCustomItem(ct.label)}
                      className="gap-1.5 h-8 text-xs rounded-r-none border-r-0"
                    >
                      <Package className="h-3.5 w-3.5" />
                      {ct.label}
                    </Button>
                    <button
                      onClick={() => handleDeleteCustomEquipType(ct)}
                      title="Eliminar tipo"
                      className="flex items-center px-1.5 h-8 rounded-r-md border border-border bg-background text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add custom type input */}
            <div className="flex gap-2">
              <input
                value={newEquipTypeName}
                onChange={(e) => setNewEquipTypeName(e.target.value)}
                placeholder="Agregar tipo personalizado..."
                className="flex-1 h-8 px-3 text-sm rounded-md border border-input bg-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                onKeyDown={(e) => e.key === 'Enter' && handleAddCustomEquipType()}
              />
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-2.5 shrink-0"
                onClick={handleAddCustomEquipType}
                disabled={!newEquipTypeName.trim()}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Equipment List */}
          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No hay equipos agregados</p>
              <p className="text-xs">Usa los botones de arriba para agregar equipos</p>
            </div>
          ) : (
            items.map((item) => (
              <EquipmentItemCard key={item.id} item={item} />
            ))
          )}
        </section>

        <Separator />

        {/* Totals */}
        <section>
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b">
              <Label className="text-xs">Tipo de Cambio (TC)</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">$</span>
                <Input
                  type="number"
                  value={meta.exchangeRate === 0 ? '' : meta.exchangeRate}
                  onChange={(e) => setMeta({ exchangeRate: parseFloat(e.target.value) || 0 })}
                  className="w-32 bg-white"
                  placeholder="Ingresá el TC..."
                />
                <span className="text-sm text-muted-foreground">/ U$S</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-lg font-bold">
              <span>SUBTOTAL</span>
              <span>{formatCurrency(subtotalItems)}</span>
            </div>
          </div>
        </section>

        <Separator />

        {/* Payment Terms */}
        <section>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
            Observaciones
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Validez Comercial</Label>
              <Input
                value={meta.commercialValidity || ''}
                onChange={(e) => setMeta({ commercialValidity: e.target.value })}
                placeholder="7 días hábiles"
              />
            </div>
            <div>
              <Label className="text-xs">Forma de Pago</Label>
              <Input
                value={meta.paymentTerms || ''}
                onChange={(e) => setMeta({ paymentTerms: e.target.value })}
                placeholder="A convenir"
              />
            </div>
          </div>
          <div className="mt-3">
            <Label className="text-xs">Observaciones Generales</Label>
            <Textarea
              value={meta.generalNotes || ''}
              onChange={(e) => setMeta({ generalNotes: e.target.value })}
              placeholder="Notas adicionales para el presupuesto..."
              rows={3}
              className="resize-none bg-white"
            />
          </div>
        </section>

        <Separator />

        {/* Delivery Panel */}
        <section>
          <NewEquipmentDeliveryPanel />
        </section>
      </div>
    </ScrollArea>
  );
}
