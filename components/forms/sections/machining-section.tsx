'use client';

import { useState } from 'react';
import { useBudget } from '@/lib/budget-context';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Hammer, Plus, Trash2 } from 'lucide-react';
import { formatARS } from '@/lib/pricing/calculations';
import { SHAFT_FILLING_PRICING, COVER_SLEEVE_PRICING } from '@/lib/pricing/data';
import type { MachiningItem } from '@/types/budget';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const MACHINING_TYPES = [
  { id: 'shaft_filling', description: 'Rellenado de eje', hasOptions: true },
  { id: 'cover_sleeve', description: 'Encamisado de tapas', hasOptions: true },
  { id: 'other', description: 'Otro mecanizado', hasOptions: false },
];

export function MachiningSection() {
  const { budget, addMachining, updateMachining, removeMachining } = useBudget();
  const { machining, meta } = budget;
  const [selectedType, setSelectedType] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newQuantity, setNewQuantity] = useState('1');
  const [newPrice, setNewPrice] = useState('');

  const handleAddMachining = () => {
    let description = newDescription;
    let unitPrice = Number(newPrice) || 0;
    
    if (selectedType === 'shaft_filling' && selectedSize) {
      const option = SHAFT_FILLING_PRICING.find(o => o.diameter.toString() === selectedSize);
      if (option) {
        description = `Rellenado de eje ø${option.diameter}mm (rod. ${option.bearing})`;
        // Use USD price converted to ARS
        unitPrice = Math.round((option.priceUSD / 0.65) * meta.exchangeRate);
      }
    } else if (selectedType === 'cover_sleeve' && selectedSize) {
      const option = COVER_SLEEVE_PRICING.find(o => o.diameter.toString() === selectedSize);
      if (option) {
        description = `Encamisado de tapas ø${option.diameter}mm (rod. ${option.bearing})`;
        // Use USD price converted to ARS
        unitPrice = Math.round((option.priceUSD / 0.65) * meta.exchangeRate);
      }
    }
    
    if (!description.trim()) return;
    
    const quantity = Number(newQuantity) || 1;
    const subtotalARS = unitPrice * quantity;
    
    const newItem: MachiningItem = {
      id: crypto.randomUUID(),
      description: description.trim(),
      quantity,
      unitPriceARS: unitPrice,
      subtotalARS,
    };
    
    addMachining(newItem);
    setSelectedType('');
    setSelectedSize('');
    setNewDescription('');
    setNewQuantity('1');
    setNewPrice('');
  };

  const handleUpdateMachining = (id: string, updates: Partial<MachiningItem>) => {
    const item = machining.find(m => m.id === id);
    if (!item) return;
    
    const newQuantity = updates.quantity ?? item.quantity;
    const newUnitPrice = updates.unitPriceARS ?? item.unitPriceARS;
    const subtotalARS = newUnitPrice * newQuantity;
    
    updateMachining(id, { ...updates, subtotalARS });
  };

  const getSizeOptions = () => {
    if (selectedType === 'shaft_filling') {
      return SHAFT_FILLING_PRICING.map(o => ({
        value: o.diameter.toString(),
        label: `ø${o.diameter}mm — ${o.bearing} — U$S ${o.priceUSD}`,
      }));
    }
    if (selectedType === 'cover_sleeve') {
      return COVER_SLEEVE_PRICING.map(o => ({
        value: o.diameter.toString(),
        label: `ø${o.diameter}mm — ${o.bearing} — U$S ${o.priceUSD}`,
      }));
    }
    return [];
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Hammer className="h-5 w-5" />
          Mecanizados
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {machining.length > 0 && (
          <div className="space-y-2">
            {machining.map((item) => (
              <div 
                key={item.id} 
                className="flex items-center gap-2 bg-muted/50 rounded-md p-2"
              >
                <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2 items-center">
                  <Input
                    value={item.description}
                    onChange={(e) => handleUpdateMachining(item.id, { description: e.target.value })}
                    className="h-8 text-sm font-medium col-span-1"
                    placeholder="Descripción"
                  />
                  
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">Cant:</span>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleUpdateMachining(item.id, { quantity: Number(e.target.value) })}
                      className="w-16 h-8 text-sm text-center"
                    />
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">$:</span>
                    <Input
                      type="number"
                      value={item.unitPriceARS}
                      onChange={(e) => handleUpdateMachining(item.id, { unitPriceARS: Number(e.target.value) })}
                      className="w-24 h-8 text-sm text-right"
                    />
                  </div>
                  
                  <div className="flex items-center gap-1 justify-end">
                    <span className="text-sm font-medium">
                      {formatARS(item.subtotalARS)}
                    </span>
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => removeMachining(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Add new machining */}
        <div className="space-y-2 pt-2 border-t">
          <div className="flex gap-2">
            <Select value={selectedType} onValueChange={(v) => { setSelectedType(v); setSelectedSize(''); }}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Tipo de mecanizado..." />
              </SelectTrigger>
              <SelectContent>
                {MACHINING_TYPES.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {(selectedType === 'shaft_filling' || selectedType === 'cover_sleeve') && (
              <Select value={selectedSize} onValueChange={setSelectedSize}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Seleccionar medida..." />
                </SelectTrigger>
                <SelectContent>
                  {getSizeOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          
          <div className="flex gap-2">
            <Input
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Descripción del mecanizado..."
              className="flex-1"
            />
            
            <Input
              type="number"
              min="1"
              value={newQuantity}
              onChange={(e) => setNewQuantity(e.target.value)}
              placeholder="Cant."
              className="w-20"
            />
            
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground">$</span>
              <Input
                type="number"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder="Precio ARS"
                className="w-28"
              />
            </div>
            
            <Button 
              variant="outline" 
              size="icon"
              onClick={handleAddMachining}
              disabled={!newDescription.trim() && !(selectedType && selectedSize)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <p className="text-xs text-muted-foreground">
          Los precios de mecanizado son en ARS. Todos los valores son editables.
        </p>
      </CardContent>
    </Card>
  );
}
