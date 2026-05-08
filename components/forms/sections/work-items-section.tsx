'use client';

import { useState, useEffect } from 'react';
import { useBudget } from '@/lib/budget-context';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardList, Plus, Trash2, GripVertical, X } from 'lucide-react';
import { COMMON_WORK_ITEMS, type WorkItem } from '@/types/budget';
import { getCustomWorkItems, saveCustomWorkItem, deleteCustomWorkItem } from '@/lib/storage/work-items';

export function WorkItemsSection() {
  const { budget, addWorkItem, updateWorkItem, removeWorkItem, reorderWorkItems } = useBudget();
  const { workItems } = budget;
  const [newItemText, setNewItemText] = useState('');
  const [customItems, setCustomItems] = useState<string[]>([]);

  useEffect(() => {
    setCustomItems(getCustomWorkItems());
  }, []);

  const allFrequentItems = [...COMMON_WORK_ITEMS, ...customItems];

  const handleAddItem = (description: string, saveAsCustom = false) => {
    if (!description.trim()) return;
    const newItem: WorkItem = {
      id: crypto.randomUUID(),
      description: description.trim(),
      affectsCalculation: true,
      order: workItems.length,
    };
    addWorkItem(newItem);
    setNewItemText('');

    // If it's a manual entry not already in the combined list, save it
    if (saveAsCustom && !allFrequentItems.includes(description.trim())) {
      saveCustomWorkItem(description.trim());
      setCustomItems(getCustomWorkItems());
    }
  };

  const handleAddCommonItem = (description: string) => {
    const exists = workItems.some(item => item.description === description);
    if (exists) return;
    handleAddItem(description);
  };

  const handleDeleteCustomItem = (description: string) => {
    deleteCustomWorkItem(description);
    setCustomItems(getCustomWorkItems());
  };

  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= workItems.length) return;
    
    const newItems = [...workItems];
    [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
    
    // Update order values
    const reordered = newItems.map((item, i) => ({ ...item, order: i }));
    reorderWorkItems(reordered);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ClipboardList className="h-5 w-5" />
          Trabajo a Realizar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Frequent items checklist */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Trabajos frecuentes:</p>
          <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto border rounded-md p-2">
            {allFrequentItems.map((item) => {
              const isAdded = workItems.some(w => w.description === item);
              const isCustom = customItems.includes(item);
              return (
                <div key={item} className="flex items-center group">
                  <button
                    onClick={() => handleAddCommonItem(item)}
                    className={`flex-1 text-left text-sm px-2 py-1 rounded transition-colors ${
                      isAdded
                        ? 'bg-primary/10 text-primary cursor-default'
                        : 'hover:bg-muted cursor-pointer'
                    }`}
                    disabled={isAdded}
                  >
                    {isAdded ? '✓ ' : '+ '}{item}
                  </button>
                  {isCustom && (
                    <button
                      onClick={() => handleDeleteCustomItem(item)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-opacity"
                      title="Eliminar de la lista"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Added items */}
        {workItems.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Trabajos agregados:</p>
            <div className="space-y-2">
              {workItems.map((item, index) => (
                <div 
                  key={item.id} 
                  className="flex items-center gap-2 bg-muted/50 rounded-md p-2"
                >
                  <div className="flex flex-col">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4"
                      onClick={() => handleMoveItem(index, 'up')}
                      disabled={index === 0}
                    >
                      <GripVertical className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  <Checkbox
                    checked={item.affectsCalculation}
                    onCheckedChange={(checked) => 
                      updateWorkItem(item.id, { affectsCalculation: !!checked })
                    }
                    title="Afecta al cálculo"
                  />
                  
                  <Input
                    value={item.description}
                    onChange={(e) => updateWorkItem(item.id, { description: e.target.value })}
                    className="flex-1 h-8 text-sm"
                  />
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => removeWorkItem(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add custom item */}
        <div className="flex gap-2">
          <Input
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            placeholder="Agregar trabajo personalizado..."
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleAddItem(newItemText, true);
              }
            }}
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleAddItem(newItemText, true)}
            disabled={!newItemText.trim()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        <p className="text-xs text-muted-foreground">
          Marca el checkbox si el trabajo afecta al cálculo de mano de obra.
        </p>
      </CardContent>
    </Card>
  );
}
