'use client';

import { useState, useEffect, useCallback } from 'react';
import { useBudget } from '@/lib/budget-context';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardList, Plus, X, Loader2, GripVertical } from 'lucide-react';
import { EQUIPMENT_TYPE_LABELS, type WorkItem } from '@/types/budget';

// A chip row returned from the DB
interface ChipRow {
  id: string;
  description: string;
  equipmentType: string | null;
}

export function WorkItemsSection() {
  const { budget, addWorkItem, removeWorkItem, reorderWorkItems } = useBudget();
  const { workItems, equipment } = budget;
  const equipmentType = equipment.type;
  const companyId = budget.companyId;

  const [newItemText, setNewItemText] = useState('');
  // All chips for the active equipment type (from DB, auto-seeded on first load)
  const [chips, setChips] = useState<ChipRow[]>([]);
  const [loadingChips, setLoadingChips] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const fetchChips = useCallback(async () => {
    setLoadingChips(true);
    try {
      const res = await fetch(`/api/work-items?companyId=${companyId}&equipmentType=${equipmentType}`);
      if (res.ok) setChips(await res.json());
    } finally {
      setLoadingChips(false);
    }
  }, [companyId, equipmentType]);

  // Reload chips whenever company or equipment type changes
  useEffect(() => { fetchChips(); }, [fetchChips]);

  // Toggle chip: add to / remove from the selected work items list
  const handleToggleChip = (description: string) => {
    const existing = workItems.find(w => w.description === description);
    if (existing) {
      removeWorkItem(existing.id);
    } else {
      addWorkItem({
        id: crypto.randomUUID(),
        description: description.trim(),
        affectsCalculation: true,
        order: workItems.length,
      });
    }
  };

  // Remove a chip from the DB panel (does not affect the selected list state)
  const handleDeleteChip = async (e: React.MouseEvent, chip: ChipRow) => {
    e.stopPropagation();
    await fetch(`/api/work-items/${chip.id}`, { method: 'DELETE' });
    setChips(prev => prev.filter(c => c.id !== chip.id));
    // Also deselect from the work list if it was selected
    const inList = workItems.find(w => w.description === chip.description);
    if (inList) removeWorkItem(inList.id);
  };

  // Add a new chip to the DB (scoped to current equipment type) and select it
  const handleAddCustom = async (description: string) => {
    if (!description.trim()) return;
    // Select it immediately
    addWorkItem({
      id: crypto.randomUUID(),
      description: description.trim(),
      affectsCalculation: true,
      order: workItems.length,
    });
    setNewItemText('');

    // Persist as a chip for this company + equipment type if not already in panel
    const alreadyInPanel = chips.some(c => c.description === description.trim());
    if (!alreadyInPanel) {
      const res = await fetch('/api/work-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, equipmentType, description: description.trim() }),
      });
      if (res.ok) {
        const created: ChipRow = await res.json();
        setChips(prev => [...prev, created]);
      }
    }
  };

  // Drag-to-reorder the selected items list
  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const next = [...workItems];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(index, 0, moved);
    reorderWorkItems(next.map((item, i) => ({ ...item, order: i })));
    setDragIndex(index);
  };

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

        {/* ── Chips per equipment type ──────────────────────────────────── */}
        <div className="space-y-2">
          <div className="flex items-baseline gap-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Seleccioná los trabajos
            </p>
            <span className="text-[11px] text-muted-foreground/70">
              — sugeridos para{' '}
              <span className="font-medium text-primary">
                {EQUIPMENT_TYPE_LABELS[equipmentType]}
              </span>
            </span>
          </div>

          {loadingChips ? (
            <div className="flex items-center gap-1.5 py-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Cargando...
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5 max-h-52 overflow-y-auto pr-1">
              {chips.map((chip) => {
                const isSelected = workItems.some(w => w.description === chip.description);
                return (
                  <div key={chip.id} className="flex items-center group/chip">
                    <button
                      onClick={() => handleToggleChip(chip.description)}
                      className={[
                        'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-l-full border-r-0 transition-all duration-150',
                        isSelected
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm hover:bg-primary/80'
                          : 'bg-background border-border text-foreground hover:border-primary/50 hover:bg-muted/60 cursor-pointer',
                      ].join(' ')}
                    >
                      {isSelected
                        ? <X className="h-3 w-3 shrink-0" />
                        : <Plus className="h-3 w-3 shrink-0 text-muted-foreground" />}
                      {chip.description}
                    </button>
                    {/* Remove chip from panel */}
                    <button
                      onClick={(e) => handleDeleteChip(e, chip)}
                      title="Quitar de la lista de sugeridos"
                      className={[
                        'inline-flex items-center px-1.5 py-1.5 rounded-r-full border border-l-0 transition-colors',
                        isSelected
                          ? 'border-primary bg-primary text-white/70 hover:text-white hover:bg-primary/80'
                          : 'border-border bg-background text-muted-foreground hover:text-destructive hover:bg-destructive/5',
                      ].join(' ')}
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                );
              })}
              {chips.length === 0 && !loadingChips && (
                <p className="text-xs text-muted-foreground italic">
                  Sin sugeridos. Agregá trabajos con el campo de abajo.
                </p>
              )}
            </div>
          )}
          <p className="text-[11px] text-muted-foreground">
            Click para agregar · Click nuevamente para quitar · ✕ derecho para eliminar de la lista
          </p>
        </div>

        {/* ── Agregar trabajo al panel de chips ────────────────────────── */}
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
