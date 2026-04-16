'use client';

import { useNewEquipment } from '@/lib/new-equipment-context';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Zap, Droplets, Settings, Gauge, Package } from 'lucide-react';
import { NEW_EQUIPMENT_TYPE_LABELS, type NewEquipmentType, type NewEquipmentItem } from '@/types/budget';
import { NewEquipmentDeliveryPanel } from '@/components/delivery/new-equipment-delivery-panel';

const EQUIPMENT_ICONS: Record<NewEquipmentType, React.ReactNode> = {
  motor_electrico: <Zap className="h-4 w-4" />,
  bomba_centrifuga: <Droplets className="h-4 w-4" />,
  reductor_velocidad: <Settings className="h-4 w-4" />,
  variador_frecuencia: <Gauge className="h-4 w-4" />,
  otro: <Package className="h-4 w-4" />,
};

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
        return (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Potencia (HP)</Label>
                <Input
                  value={item.potencia || ''}
                  onChange={(e) => updateItem(item.id, { potencia: e.target.value })}
                  placeholder="Ej: 5 HP"
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
              <Input
                value={item.potencia || ''}
                onChange={(e) => updateItem(item.id, { potencia: e.target.value })}
                placeholder="Ej: 5 HP"
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
            <CardTitle className="text-base">{NEW_EQUIPMENT_TYPE_LABELS[item.type]}</CardTitle>
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

export function NewEquipmentForm() {
  const { budget, setMeta, setCustomer, addItem } = useNewEquipment();
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
            <div>
              <Label className="text-xs">TC (ARS/USD)</Label>
              <Input
                type="number"
                value={meta.exchangeRate}
                onChange={(e) => setMeta({ exchangeRate: parseFloat(e.target.value) || 0 })}
              />
            </div>
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
          <div className="flex flex-wrap gap-2 mb-4">
            {(Object.keys(NEW_EQUIPMENT_TYPE_LABELS) as NewEquipmentType[]).map((type) => (
              <Button
                key={type}
                variant="outline"
                size="sm"
                onClick={() => addItem(type)}
                className="gap-1"
              >
                {EQUIPMENT_ICONS[type]}
                {NEW_EQUIPMENT_TYPE_LABELS[type]}
              </Button>
            ))}
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
          <div className="bg-muted/50 rounded-lg p-4">
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
