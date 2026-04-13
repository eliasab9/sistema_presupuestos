'use client';

import { useState } from 'react';
import { useBudget } from '@/lib/budget-context';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CircleDot, Plus, Trash2 } from 'lucide-react';
import { calculateBearingPrice, formatARS } from '@/lib/pricing/calculations';
import { BEARING_PRICING } from '@/lib/pricing/data';
import type { BearingItem } from '@/types/budget';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function BearingsSection() {
  const { budget, addBearing, updateBearing, removeBearing } = useBudget();
  const { bearings, meta } = budget;
  const [newCode, setNewCode] = useState('');
  const [newQuantity, setNewQuantity] = useState('2');

  const handleAddBearing = () => {
    if (!newCode) return;
    
    const { unitCostUSD, subtotalARS, formula } = calculateBearingPrice(
      newCode,
      Number(newQuantity) || 1,
      meta.exchangeRate
    );
    
    const newItem: BearingItem = {
      id: crypto.randomUUID(),
      code: newCode,
      quantity: Number(newQuantity) || 1,
      unitCostUSD,
      formula,
      subtotalARS,
    };
    
    addBearing(newItem);
    setNewCode('');
    setNewQuantity('2');
  };

  const handleUpdateBearing = (id: string, updates: Partial<BearingItem>) => {
    const item = bearings.find(b => b.id === id);
    if (!item) return;
    
    const newQuantity = updates.quantity ?? item.quantity;
    const newUnitCost = updates.unitCostUSD ?? item.unitCostUSD;
    
    // Recalculate subtotal
    const subtotalARS = Math.round((newUnitCost / 0.65) * meta.exchangeRate * newQuantity);
    const formula = `U$S ${newUnitCost.toFixed(2)} / 0,65 × TC ${meta.exchangeRate} × ${newQuantity}`;
    
    updateBearing(id, { ...updates, subtotalARS, formula });
  };

  // Get unique bearing codes with prices
  const availableBearings = BEARING_PRICING.filter(b => b.priceUSD > 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CircleDot className="h-5 w-5" />
          Rodamientos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {bearings.length > 0 && (
          <div className="space-y-2">
            {bearings.map((item) => (
              <div 
                key={item.id} 
                className="flex items-center gap-2 bg-muted/50 rounded-md p-2"
              >
                <div className="flex-1 grid grid-cols-4 gap-2 items-center">
                  <Input
                    value={item.code}
                    onChange={(e) => handleUpdateBearing(item.id, { code: e.target.value })}
                    className="h-8 text-sm font-medium"
                    placeholder="Código"
                  />
                  
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">Cant:</span>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleUpdateBearing(item.id, { quantity: Number(e.target.value) })}
                      className="w-16 h-8 text-sm text-center"
                    />
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">U$S:</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.unitCostUSD}
                      onChange={(e) => handleUpdateBearing(item.id, { unitCostUSD: Number(e.target.value) })}
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
                  onClick={() => removeBearing(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Add new bearing */}
        <div className="flex gap-2 pt-2 border-t">
          <Select value={newCode} onValueChange={setNewCode}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Seleccionar rodamiento..." />
            </SelectTrigger>
            <SelectContent>
              {availableBearings.map((bearing) => (
                <SelectItem key={bearing.code} value={bearing.code}>
                  {bearing.code} — U$S {bearing.priceUSD.toFixed(2)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Input
            type="number"
            min="1"
            value={newQuantity}
            onChange={(e) => setNewQuantity(e.target.value)}
            placeholder="Cant."
            className="w-20"
          />
          
          <Button 
            variant="outline" 
            size="icon"
            onClick={handleAddBearing}
            disabled={!newCode}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        <p className="text-xs text-muted-foreground">
          Fórmula: (U$S / 0,65) × TC × cantidad. Todos los valores son editables.
        </p>
      </CardContent>
    </Card>
  );
}
