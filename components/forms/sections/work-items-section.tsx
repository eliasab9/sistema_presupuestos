'use client';

import { useState, useEffect, useCallback } from 'react';
import { useBudget } from '@/lib/budget-context';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardList, Plus, X, Loader2, GripVertical } from 'lucide-react';
import { COMMON_WORK_ITEMS, type WorkItem } from '@/types/budget';

interface CustomWorkItem {
  id: string;
  description: string;
}

export function WorkItemsSection() {
  const { budget, addWorkItem, removeWorkItem, reorderWorkItems } = useBudget();
  const { workItems } = budget;
  const companyId = budget.companyId;
  const [newItemText, setNewItemText] = useState('');
  const [customItems, setCustomItems] = useState<CustomWorkItem[]>([]);
  const [loadingCustom, setLoadingCustom] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

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

  const handleToggleChip = async (description: string, isCustom = false, customRef: CustomWorkItem | null = null) => {
    const existing = workItems.find(w => w.description === description);
    if (existing) {
      // Already selected → remove it
      removeWorkItem(existing.id);
    } else {
      // Not selected → add it
      const newItem: WorkItem = {
        id: crypto.randomUUID(),
        description: description.trim(),
        affectsCalculation: true,
        order: workItems.length,
      };
      addWorkItem(newItem);
    }
    void isCustom; void customRef; // currently unused but kept for future custom handling
  };

  const handleAddCustom = async (description: string) => {
    if (!description.trim()) return;
    const newItem: WorkItem = {
      id: crypto.randomUUID(),
      description: description.trim(),
      affectsCalculation: true,
      order: workItems.length,
    };
    addWorkItem(newItem);
    setNewItemText('');

    if (!allFrequentDescriptions.includes(description.trim())) {
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

  const handleDeleteCustomItem = async (e: React.MouseEvent, item: CustomWorkItem) => {
    e.stopPropagation();
    await fetch(`/api/work-items/${item.id}`, { method: 'DELETE' });
    setCustomItems(prev => prev.filter(i => i.id !== item.id));
    // Also remove from work list if selected
    const existing = workItems.find(w => w.description === item.description);
    if (existing) removeWorkItem(existing.id);
  };

  // Drag-to-reorder
  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const newItems = [...workItems];
    const [moved] = newItems.splice(dragIndex, 1);
    newItems.splice(index, 0, moved);
    reorderWorkItems(newItems.map((item, i) => ({ ...item, order: i })));
    setDragIndex(index);
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

        {/* ── Chips toggleables ────────────────────────────────────────── */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Seleccioná los trabajos
          </p>

          {loadingCustom && customItems.length === 0 ? (
            <div className="flex items-center gap-1.5 py-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Cargando...
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5 max-h-52 overflow-y-auto pr-1">
              {allQuickItems.map((item) => {
                const isSelected = workItems.some(w => w.description === item.description);
                return (
                  <div key={item.key} className="flex items-center group/chip">
                    <button
                      onClick={() => handleToggleChip(item.description, item.isCustom, item.customRef)}
                      className={[
                        'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border transition-all duration-150',
                        item.isCustom ? 'rounded-l-full border-r-0' : 'rounded-full',
                        isSelected
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm hover:bg-primary/80'
                          : 'bg-background border-border text-foreground hover:border-primary/50 hover:bg-muted/60 cursor-pointer',
                      ].join(' ')}
                    >
                      {isSelected
                        ? <X className="h-3 w-3 shrink-0" />
                        : <Plus className="h-3 w-3 shrink-0 text-muted-foreground" />}
                      {item.description}
                    </button>

                    {item.isCustom && (
                      <button
                        onClick={(e) => handleDeleteCustomItem(e, item.customRef!)}
                        title="Eliminar de la lista"
                        className="inline-flex items-center px-1.5 py-1.5 rounded-r-full border border-border bg-background text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <p className="text-[11px] text-muted-foreground">
            Click para agregar · Click nuevamente para quitar
          </p>
        </div>

        {/* ── Agregar trabajo personalizado ────────────────────────────── */}
        <div className="flex gap-2">
          <Input
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            placeholder="Agregar trabajo no listado..."
            className="flex-1 h-9"
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddCustom(newItemText); }}
          />
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => handleAddCustom(newItemText)}
            disabled={!newItemText.trim()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* ── Lista ordenable de trabajos seleccionados ────────────────── */}
        {workItems.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Orden en el presupuesto
            </p>
            <div className="space-y-1">
              {workItems.map((item, index) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={() => setDragIndex(null)}
                  className={[
                    'flex items-center gap-2 px-2 py-1.5 rounded-lg border transition-all cursor-grab active:cursor-grabbing',
                    dragIndex === index ? 'bg-primary/5 border-primary/30 opacity-70' : 'bg-muted/30 border-transparent hover:border-border hover:bg-muted/50',
                  ].join(' ')}
                >
                  <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                  <span className="text-xs text-muted-foreground w-4 shrink-0 tabular-nums">{index + 1}.</span>
                  <span className="flex-1 text-sm">{item.description}</span>
                  <button
                    onClick={() => removeWorkItem(item.id)}
                    className="p-0.5 text-muted-foreground/40 hover:text-destructive transition-colors shrink-0"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
