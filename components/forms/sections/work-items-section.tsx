'use client';

import { useState, useEffect, useCallback } from 'react';
import { useBudget } from '@/lib/budget-context';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardList, Plus, Trash2, ArrowUp, ArrowDown, X, Loader2, Check } from 'lucide-react';
import { COMMON_WORK_ITEMS, type WorkItem } from '@/types/budget';

interface CustomWorkItem {
  id: string;
  description: string;
}

export function WorkItemsSection() {
  const { budget, addWorkItem, updateWorkItem, removeWorkItem, reorderWorkItems } = useBudget();
  const { workItems } = budget;
  const companyId = budget.companyId;
  const [newItemText, setNewItemText] = useState('');
  const [customItems, setCustomItems] = useState<CustomWorkItem[]>([]);
  const [loadingCustom, setLoadingCustom] = useState(false);

  const fetchCustomItems = useCallback(async () => {
    setLoadingCustom(true);
    try {
      const res = await fetch(`/api/work-items?companyId=${companyId}`);
      if (res.ok) setCustomItems(await res.json());
    } finally {
      setLoadingCustom(false);
    }
  }, [companyId]);

  useEffect(() => { fetchCustomItems(); }, [fetchCustomItems]);

  const allFrequentDescriptions = [
    ...COMMON_WORK_ITEMS,
    ...customItems.map(i => i.description),
  ];

  const handleAddItem = async (description: string, saveAsCustom = false) => {
    if (!description.trim()) return;
    const newItem: WorkItem = {
      id: crypto.randomUUID(),
      description: description.trim(),
      affectsCalculation: true,
      order: workItems.length,
    };
    addWorkItem(newItem);
    setNewItemText('');

    if (saveAsCustom && !allFrequentDescriptions.includes(description.trim())) {
      const res = await fetch('/api/work-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, description: description.trim() }),
      });
      if (res.ok) {
        const created: CustomWorkItem = await res.json();
        setCustomItems(prev => [...prev, created]);
      }
    }
  };

  const handleAddCommonItem = (description: string) => {
    if (workItems.some(item => item.description === description)) return;
    handleAddItem(description);
  };

  const handleDeleteCustomItem = async (item: CustomWorkItem) => {
    await fetch(`/api/work-items/${item.id}`, { method: 'DELETE' });
    setCustomItems(prev => prev.filter(i => i.id !== item.id));
  };

  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= workItems.length) return;
    const newItems = [...workItems];
    [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
    reorderWorkItems(newItems.map((item, i) => ({ ...item, order: i })));
  };

  const allQuickItems = [
    ...COMMON_WORK_ITEMS.map(d => ({ key: d, description: d, isCustom: false, customRef: null as CustomWorkItem | null })),
    ...customItems.map(i => ({ key: i.id, description: i.description, isCustom: true, customRef: i })),
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Trabajo a Realizar
          </div>
          {workItems.length > 0 && (
            <Badge variant="secondary" className="text-xs font-normal tabular-nums">
              {workItems.length} {workItems.length === 1 ? 'trabajo' : 'trabajos'}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">

        {/* ── Quick-add: chip list ─────────────────────────────────────── */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Trabajos frecuentes
          </p>

          {loadingCustom && customItems.length === 0 ? (
            <div className="flex items-center gap-1.5 py-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Cargando...
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
              {allQuickItems.map((item) => {
                const isAdded = workItems.some(w => w.description === item.description);
                return (
                  <div key={item.key} className="flex items-center">
                    <button
                      onClick={() => handleAddCommonItem(item.description)}
                      disabled={isAdded}
                      className={[
                        'inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium border transition-all',
                        item.isCustom ? 'rounded-l-full border-r-0' : 'rounded-full',
                        isAdded
                          ? 'bg-primary/10 text-primary border-primary/30 cursor-default'
                          : 'bg-background border-border text-foreground hover:bg-muted hover:border-primary/40 cursor-pointer',
                      ].join(' ')}
                    >
                      {isAdded
                        ? <Check className="h-3 w-3 shrink-0" />
                        : <Plus className="h-3 w-3 shrink-0" />}
                      {item.description}
                    </button>

                    {item.isCustom && (
                      <button
                        onClick={() => handleDeleteCustomItem(item.customRef!)}
                        title="Eliminar de la lista"
                        className="inline-flex items-center px-1.5 py-1 rounded-r-full border border-border bg-background text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Add custom work item ─────────────────────────────────────── */}
        <div className="flex gap-2">
          <Input
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            placeholder="Agregar trabajo personalizado..."
            className="flex-1 h-9"
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddItem(newItemText, true); }}
          />
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => handleAddItem(newItemText, true)}
            disabled={!newItemText.trim()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* ── Added items list ─────────────────────────────────────────── */}
        {workItems.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Trabajos agregados
            </p>
            <div className="space-y-1">
              {workItems.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 border border-transparent hover:border-border hover:bg-muted/60 group transition-all"
                >
                  {/* Reorder arrows */}
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button
                      onClick={() => handleMoveItem(index, 'up')}
                      disabled={index === 0}
                      className="text-muted-foreground/40 hover:text-muted-foreground disabled:opacity-20 transition-colors"
                    >
                      <ArrowUp className="h-2.5 w-2.5" />
                    </button>
                    <button
                      onClick={() => handleMoveItem(index, 'down')}
                      disabled={index === workItems.length - 1}
                      className="text-muted-foreground/40 hover:text-muted-foreground disabled:opacity-20 transition-colors"
                    >
                      <ArrowDown className="h-2.5 w-2.5" />
                    </button>
                  </div>

                  {/* Affects calculation checkbox */}
                  <Checkbox
                    checked={item.affectsCalculation}
                    onCheckedChange={(checked) =>
                      updateWorkItem(item.id, { affectsCalculation: !!checked })
                    }
                    title="Afecta al cálculo de mano de obra"
                    className="shrink-0"
                  />

                  {/* Description */}
                  <Input
                    value={item.description}
                    onChange={(e) => updateWorkItem(item.id, { description: e.target.value })}
                    className="flex-1 h-7 text-sm border-0 bg-transparent px-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />

                  {/* Delete */}
                  <button
                    onClick={() => removeWorkItem(item.id)}
                    title="Eliminar"
                    className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              ☑ Checkbox marcado = afecta al cálculo de mano de obra
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
