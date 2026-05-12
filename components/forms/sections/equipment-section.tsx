'use client';

import { useState, useEffect, useCallback } from 'react';
import { useBudget } from '@/lib/budget-context';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Cog, ChevronsUpDown, Check, Plus, X, Loader2 } from 'lucide-react';
import { EQUIPMENT_TYPE_LABELS, type EquipmentType } from '@/types/budget';
import { cn } from '@/lib/utils';

const STANDARD_HP_VALUES = [
  0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 5.5, 7.5, 10, 12.5, 15, 20, 25, 30, 40, 50, 60, 75, 100, 125, 150, 180, 220,
];

interface CustomEquipmentType {
  id: string;
  label: string;
}

export function EquipmentSection() {
  const { budget, setEquipment } = useBudget();
  const { equipment } = budget;
  const companyId = budget.companyId;

  const [powerOpen, setPowerOpen] = useState(false);
  const [customPower, setCustomPower] = useState('');
  const [customTypes, setCustomTypes] = useState<CustomEquipmentType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');

  const fetchCustomTypes = useCallback(async () => {
    setLoadingTypes(true);
    try {
      const res = await fetch(`/api/equipment-types?companyId=${companyId}&budgetType=reparacion`);
      if (res.ok) setCustomTypes(await res.json());
    } finally {
      setLoadingTypes(false);
    }
  }, [companyId]);

  useEffect(() => { fetchCustomTypes(); }, [fetchCustomTypes]);

  const handleSelectStandard = (value: EquipmentType) => {
    setEquipment({ type: value, customTypeLabel: undefined });
  };

  const handleSelectCustom = (label: string) => {
    setEquipment({ type: 'otro', customTypeLabel: label });
  };

  const handleAddCustomType = async () => {
    const label = newTypeName.trim();
    if (!label) return;
    setNewTypeName('');
    const res = await fetch('/api/equipment-types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId, budgetType: 'reparacion', label }),
    });
    if (res.ok) {
      const created: CustomEquipmentType = await res.json();
      setCustomTypes(prev => [...prev, created]);
      handleSelectCustom(label);
    }
  };

  const handleDeleteCustomType = async (ct: CustomEquipmentType) => {
    await fetch(`/api/equipment-types/${ct.id}`, { method: 'DELETE' });
    setCustomTypes(prev => prev.filter(t => t.id !== ct.id));
    if (equipment.customTypeLabel === ct.label) {
      setEquipment({ type: 'otro', customTypeLabel: undefined });
    }
  };

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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* ── Tipo de Equipo: chip selector ───────────────────────────── */}
          <div className="col-span-1 sm:col-span-2 space-y-2">
            <Label>Tipo de Equipo</Label>

            {loadingTypes && customTypes.length === 0 ? (
              <div className="flex items-center gap-1.5 py-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Cargando...
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-1.5 border rounded-lg p-2.5 max-h-36 overflow-y-auto bg-background">
                  {/* Standard types */}
                  {Object.entries(EQUIPMENT_TYPE_LABELS).map(([value, label]) => {
                    const isSelected = equipment.type === value && !equipment.customTypeLabel;
                    return (
                      <button
                        key={value}
                        onClick={() => handleSelectStandard(value as EquipmentType)}
                        className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                          isSelected
                            ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                            : 'bg-muted/50 border-border text-foreground hover:bg-muted hover:border-primary/40'
                        )}
                      >
                        {isSelected && <Check className="h-2.5 w-2.5 shrink-0" />}
                        {label}
                      </button>
                    );
                  })}

                  {/* Custom types from DB */}
                  {customTypes.map((ct) => {
                    const isSelected = equipment.customTypeLabel === ct.label;
                    return (
                      <div key={ct.id} className="flex items-center">
                        <button
                          onClick={() => handleSelectCustom(ct.label)}
                          className={cn(
                            'inline-flex items-center gap-1 px-2.5 py-1 rounded-l-full text-xs font-medium border border-r-0 transition-all',
                            isSelected
                              ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                              : 'bg-muted/50 border-border text-foreground hover:bg-muted hover:border-primary/40'
                          )}
                        >
                          {isSelected && <Check className="h-2.5 w-2.5 shrink-0" />}
                          {ct.label}
                        </button>
                        <button
                          onClick={() => handleDeleteCustomType(ct)}
                          title="Eliminar tipo"
                          className="inline-flex items-center px-1.5 py-1 rounded-r-full border border-border bg-muted/50 text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Add custom type */}
                <div className="flex gap-2">
                  <Input
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                    placeholder="Agregar tipo personalizado..."
                    className="h-8 text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCustomType()}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-2.5 shrink-0"
                    onClick={handleAddCustomType}
                    disabled={!newTypeName.trim()}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </>
            )}
          </div>

          {/* ── Subtipo ──────────────────────────────────────────────────── */}
          <div>
            <Label htmlFor="equipment-subtype">Subtipo / Descripción</Label>
            <Input
              id="equipment-subtype"
              value={equipment.subtype || ''}
              onChange={(e) => setEquipment({ subtype: e.target.value })}
              placeholder="Ej: centrífuga"
            />
          </div>

          {/* ── Potencia ─────────────────────────────────────────────────── */}
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
                      onKeyDown={(e) => { if (e.key === 'Enter') handleCustomPowerSubmit(); }}
                      className="h-8"
                    />
                    <Button size="sm" className="h-8 px-2" onClick={handleCustomPowerSubmit}>OK</Button>
                  </div>
                </div>
                <div className="max-h-[200px] overflow-y-auto">
                  {STANDARD_HP_VALUES.map((hp) => (
                    <button
                      key={hp}
                      onClick={() => handlePowerSelect(hp)}
                      className={cn(
                        'relative flex cursor-pointer select-none items-center w-full px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground',
                        equipment.power === hp && 'bg-accent'
                      )}
                    >
                      <Check className={cn('mr-2 h-4 w-4', equipment.power === hp ? 'opacity-100' : 'opacity-0')} />
                      {hp} HP
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* ── RPM ──────────────────────────────────────────────────────── */}
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

          {/* ── Cantidad ─────────────────────────────────────────────────── */}
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

          <div className="col-span-1 sm:col-span-2">
            <Label htmlFor="equipment-failure">Motivo de la falla</Label>
            <Textarea
              id="equipment-failure"
              value={equipment.failureReason || ''}
              onChange={(e) => setEquipment({ failureReason: e.target.value })}
              placeholder="Describir el motivo de la falla o avería del equipo..."
              rows={2}
            />
          </div>

          <div className="col-span-1 sm:col-span-2">
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
