'use client';

import { useState } from 'react';
import { useBudget } from '@/lib/budget-context';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Plus, Trash2 } from 'lucide-react';
import { formatARS, calculateSealPrice, calculateCapacitorPrice } from '@/lib/pricing/calculations';
import type { SparePartItem } from '@/types/budget';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const COMMON_SPARE_PARTS = [
  { id: 'seal_ceramic', description: 'Sello cerámico compacto', defaultPriceUSD: 13 },
  { id: 'capacitor', description: 'Capacitor', defaultPriceUSD: 10 },
  { id: 'fan_cover', description: 'Cubre ventilador', defaultPriceUSD: 5 },
  { id: 'rear_cover', description: 'Tapa trasera', defaultPriceUSD: 10 },
  { id: 'fan', description: 'Ventilador', defaultPriceUSD: 3 },
  { id: 'other', description: 'Otro repuesto', defaultPriceUSD: 0 },
];

export function SparePartsSection() {
  const { budget, addSparePart, updateSparePart, removeSparePart } = useBudget();
  const { spareParts, meta } = budget;
  const [selectedType, setSelectedType] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newQuantity, setNewQuantity] = useState('1');
  const [newPriceUSD, setNewPriceUSD] = useState('');
  const [newDiameter, setNewDiameter] = useState('');

  const handleAddSparePart = () => {
    let description = newDescription;
    let priceUSD = Number(newPriceUSD) || 0;
    
    if (selectedType && selectedType !== 'other') {
      const part = COMMON_SPARE_PARTS.find(p => p.id === selectedType);
      if (part) {
        description = description || part.description;
        if (selectedType === 'seal_ceramic' && newDiameter) {
          description = `Sello cerámico ø${newDiameter}mm compacto`;
          const result = calculateSealPrice(Number(newDiameter), 'ceramic_compact', 1, meta.exchangeRate);
          priceUSD = result.unitPriceUSD;
        } else if (selectedType === 'capacitor' && newDiameter) {
          description = `Capacitor ${newDiameter} uF`;
          const result = calculateCapacitorPrice(Number(newDiameter), 1, meta.exchangeRate);
          priceUSD = result.unitPriceUSD;
        } else {
          priceUSD = priceUSD || part.defaultPriceUSD;
        }
      }
    }
    
    if (!description.trim()) return;
    
    const quantity = Number(newQuantity) || 1;
    const subtotalARS = Math.round((priceUSD / 0.65) * meta.exchangeRate * quantity);
    const formula = `U$S ${priceUSD.toFixed(2)} / 0,65 × TC ${meta.exchangeRate} × ${quantity}`;
    
    const newItem: SparePartItem = {
      id: crypto.randomUUID(),
      description: description.trim(),
      quantity,
      unitPriceUSD: priceUSD,
      formula,
      subtotalARS,
    };
    
    addSparePart(newItem);
    setSelectedType('');
    setNewDescription('');
    setNewQuantity('1');
    setNewPriceUSD('');
    setNewDiameter('');
  };

  const handleUpdateSparePart = (id: string, updates: Partial<SparePartItem>) => {
    const item = spareParts.find(s => s.id === id);
    if (!item) return;
    
    const newQuantity = updates.quantity ?? item.quantity;
    const newPriceUSD = updates.unitPriceUSD ?? item.unitPriceUSD;
    
    // Recalculate subtotal
    const subtotalARS = Math.round((newPriceUSD / 0.65) * meta.exchangeRate * newQuantity);
    const formula = `U$S ${newPriceUSD.toFixed(2)} / 0,65 × TC ${meta.exchangeRate} × ${newQuantity}`;
    
    updateSparePart(id, { ...updates, subtotalARS, formula });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Package className="h-5 w-5" />
          Repuestos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {spareParts.length > 0 && (
          <div className="space-y-2">
            {spareParts.map((item) => (
              <div 
                key={item.id} 
                className="flex items-center gap-2 bg-muted/50 rounded-md p-2"
              >
                <div className="flex-1 grid grid-cols-4 gap-2 items-center">
                  <Input
                    value={item.description}
                    onChange={(e) => handleUpdateSparePart(item.id, { description: e.target.value })}
                    className="h-8 text-sm font-medium col-span-1"
                    placeholder="Descripción"
                  />
                  
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">Cant:</span>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleUpdateSparePart(item.id, { quantity: Number(e.target.value) })}
                      className="w-16 h-8 text-sm text-center"
                    />
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">U$S:</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.unitPriceUSD}
                      onChange={(e) => handleUpdateSparePart(item.id, { unitPriceUSD: Number(e.target.value) })}
                      className="w-20 h-8 text-sm text-right"
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
                  onClick={() => removeSparePart(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Add new spare part */}
        <div className="space-y-2 pt-2 border-t">
          <div className="flex gap-2">
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Tipo de repuesto..." />
              </SelectTrigger>
              <SelectContent>
                {COMMON_SPARE_PARTS.map((part) => (
                  <SelectItem key={part.id} value={part.id}>
                    {part.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {(selectedType === 'seal_ceramic') && (
              <Input
                type="number"
                value={newDiameter}
                onChange={(e) => setNewDiameter(e.target.value)}
                placeholder="ø mm"
                className="w-24"
              />
            )}
            
            {(selectedType === 'capacitor') && (
              <Input
                type="number"
                value={newDiameter}
                onChange={(e) => setNewDiameter(e.target.value)}
                placeholder="uF"
                className="w-24"
              />
            )}
          </div>
          
          <div className="flex gap-2">
            <Input
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Descripción del repuesto..."
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
              <span className="text-sm text-muted-foreground">U$S</span>
              <Input
                type="number"
                step="0.01"
                value={newPriceUSD}
                onChange={(e) => setNewPriceUSD(e.target.value)}
                placeholder="Precio"
                className="w-24"
              />
            </div>
            
            <Button 
              variant="outline" 
              size="icon"
              onClick={handleAddSparePart}
              disabled={!newDescription.trim() && !selectedType}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <p className="text-xs text-muted-foreground">
          Fórmula: (U$S / 0,65) × TC × cantidad. Todos los valores son editables.
        </p>
      </CardContent>
    </Card>
  );
}
