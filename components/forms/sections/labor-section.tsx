'use client';

import { useEffect, useState, useRef } from 'react';
import { useBudget } from '@/lib/budget-context';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wrench, Plus, Trash2, RefreshCw } from 'lucide-react';
import { generateSuggestedLabor, formatARS } from '@/lib/pricing/calculations';
import type { LaborItem } from '@/types/budget';

export function LaborSection() {
  const { budget, addLabor, updateLabor, removeLabor, setLabor } = useBudget();
  const { labor, workItems, equipment } = budget;
  const [newDescription, setNewDescription] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const prevWorkItemsRef = useRef<string>('');

  // Auto-recalculate when work items change
  useEffect(() => {
    const workItemsKey = workItems.map(w => `${w.id}-${w.affectsCalculation}`).join(',');
    
    if (prevWorkItemsRef.current !== workItemsKey && workItems.length > 0) {
      prevWorkItemsRef.current = workItemsKey;
      handleGenerateSuggestions();
    }
  }, [workItems, equipment.type, equipment.power]);

  const handleGenerateSuggestions = () => {
    const suggestions = generateSuggestedLabor(workItems, equipment.type, equipment.power);
    
    // Merge with existing manual items
    const manualItems = labor.filter(item => item.isManual);
    setLabor([...suggestions, ...manualItems]);
  };

  const handleAddManual = () => {
    if (!newDescription.trim()) return;
    
    const newItem: LaborItem = {
      id: crypto.randomUUID(),
      description: newDescription.trim(),
      priceARS: Number(newPrice) || 0,
      formula: 'Precio manual',
      isManual: true,
    };
    
    addLabor(newItem);
    setNewDescription('');
    setNewPrice('');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Wrench className="h-5 w-5" />
            Mano de Obra
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleGenerateSuggestions}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Recalcular
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {labor.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Agrega trabajos en la sección anterior y haz clic en &quot;Recalcular&quot; para generar los ítems de mano de obra.
          </p>
        ) : (
          <div className="space-y-2">
            {labor.map((item) => (
              <div 
                key={item.id} 
                className="flex items-center gap-2 bg-muted/50 rounded-md p-2"
              >
                <div className="flex-1 space-y-1">
                  <Input
                    value={item.description}
                    onChange={(e) => updateLabor(item.id, { description: e.target.value })}
                    className="h-8 text-sm font-medium"
                  />
                  {item.formula && (
                    <p className="text-xs text-muted-foreground px-2">{item.formula}</p>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">$</span>
                  <Input
                    type="number"
                    value={item.priceARS}
                    onChange={(e) => updateLabor(item.id, { priceARS: Number(e.target.value), isManual: true })}
                    className="w-32 h-8 text-sm text-right"
                  />
                </div>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => removeLabor(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Add manual item */}
        <div className="flex gap-2 pt-2 border-t">
          <Input
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Descripción manual..."
            className="flex-1"
          />
          <div className="flex items-center gap-1">
            <span className="text-sm text-muted-foreground">$</span>
            <Input
              type="number"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              placeholder="Precio"
              className="w-28"
            />
          </div>
          <Button 
            variant="outline" 
            size="icon"
            onClick={handleAddManual}
            disabled={!newDescription.trim()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        <p className="text-xs text-muted-foreground">
          Los precios son editables. Modifica cualquier valor según necesites.
        </p>
      </CardContent>
    </Card>
  );
}
