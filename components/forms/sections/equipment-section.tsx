'use client';

import { useState } from 'react';
import { useBudget } from '@/lib/budget-context';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Cog, ChevronsUpDown, Check } from 'lucide-react';
import { EQUIPMENT_TYPE_LABELS, type EquipmentType } from '@/types/budget';
import { cn } from '@/lib/utils';

// Standard HP values from pricing table
const STANDARD_HP_VALUES = [
  0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 5.5, 7.5, 10, 12.5, 15, 20, 25, 30, 40, 50, 60, 75, 100, 125, 150, 180, 220
];

export function EquipmentSection() {
  const { budget, setEquipment } = useBudget();
  const { equipment } = budget;
  const [powerOpen, setPowerOpen] = useState(false);
  const [customPower, setCustomPower] = useState('');

  const handlePowerSelect = (value: number) => {
    setEquipment({ power: value });
    setPowerOpen(false);
  };

  const handleCustomPowerSubmit = () => {
    const value = parseFloat(customPower);
    if (!isNaN(value) && value > 0) {
      setEquipment({ power: value });
      setCustomPower('');
      setPowerOpen(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Cog className="h-5 w-5" />
          Datos del Equipo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="equipment-type">Tipo de Equipo</Label>
            <Select
              value={equipment.type}
              onValueChange={(value) => setEquipment({ type: value as EquipmentType })}
            >
              <SelectTrigger id="equipment-type">
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(EQUIPMENT_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="equipment-subtype">Subtipo / Descripción</Label>
            <Input
              id="equipment-subtype"
              value={equipment.subtype || ''}
              onChange={(e) => setEquipment({ subtype: e.target.value })}
              placeholder="Ej: centrífuga"
            />
          </div>

          <div>
            <Label>Potencia (HP)</Label>
            <Popover open={powerOpen} onOpenChange={setPowerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={powerOpen}
                  className="w-full justify-between font-normal"
                >
                  {equipment.power ? `${equipment.power} HP` : 'Seleccionar potencia'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0" align="start">
                <div className="p-2 border-b">
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      step="0.25"
                      min="0.25"
                      placeholder="HP personalizado"
                      value={customPower}
                      onChange={(e) => setCustomPower(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCustomPowerSubmit();
                        }
                      }}
                      className="h-8"
                    />
                    <Button size="sm" className="h-8 px-2" onClick={handleCustomPowerSubmit}>
                      OK
                    </Button>
                  </div>
                </div>
                <div className="max-h-[200px] overflow-y-auto">
                  {STANDARD_HP_VALUES.map((hp) => (
                    <button
                      key={hp}
                      onClick={() => handlePowerSelect(hp)}
                      className={cn(
                        "relative flex cursor-pointer select-none items-center w-full px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                        equipment.power === hp && "bg-accent"
                      )}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          equipment.power === hp ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {hp} HP
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label htmlFor="equipment-rpm">RPM</Label>
            <Input
              id="equipment-rpm"
              type="number"
              value={equipment.rpm || ''}
              onChange={(e) => setEquipment({ rpm: e.target.value ? Number(e.target.value) : undefined })}
              placeholder="1450"
            />
          </div>

          <div>
            <Label htmlFor="equipment-quantity">Cantidad</Label>
            <Input
              id="equipment-quantity"
              type="number"
              min="1"
              value={equipment.quantity}
              onChange={(e) => setEquipment({ quantity: Number(e.target.value) })}
              placeholder="1"
            />
          </div>

          <div>
            <Label htmlFor="equipment-brand">Marca</Label>
            <Input
              id="equipment-brand"
              value={equipment.brand || ''}
              onChange={(e) => setEquipment({ brand: e.target.value })}
              placeholder="Marca del equipo"
            />
          </div>

          <div>
            <Label htmlFor="equipment-model">Modelo</Label>
            <Input
              id="equipment-model"
              value={equipment.model || ''}
              onChange={(e) => setEquipment({ model: e.target.value })}
              placeholder="Modelo"
            />
          </div>

          <div>
            <Label htmlFor="equipment-serial">Serie / ID interno</Label>
            <Input
              id="equipment-serial"
              value={equipment.serial || ''}
              onChange={(e) => setEquipment({ serial: e.target.value })}
              placeholder="Número de serie"
            />
          </div>

          <div className="col-span-2">
            <Label htmlFor="equipment-failure">Motivo de la falla</Label>
            <Textarea
              id="equipment-failure"
              value={equipment.failureReason || ''}
              onChange={(e) => setEquipment({ failureReason: e.target.value })}
              placeholder="Describir el motivo de la falla o avería del equipo..."
              rows={2}
            />
          </div>

          <div className="col-span-2">
            <Label htmlFor="equipment-notes">Observaciones del equipo</Label>
            <Textarea
              id="equipment-notes"
              value={equipment.notes || ''}
              onChange={(e) => setEquipment({ notes: e.target.value })}
              placeholder="Notas adicionales sobre el equipo..."
              rows={2}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
