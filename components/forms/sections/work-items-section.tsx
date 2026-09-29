'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useBudget } from '@/lib/budget-context';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ClipboardList, Plus, X, Loader2, GripVertical, Search, Trash2 } from 'lucide-react';
import {
  EQUIPMENT_TYPE_LABELS,
  WORK_ITEMS_BY_EQUIPMENT_TYPE,
  WORK_SCENARIOS_BY_EQUIPMENT_TYPE,
  type WorkItem,
  type WorkScenario,
} from '@/types/budget';

// A chip row returned from the DB
interface ChipRow {
  id: string;
  description: string;
  equipmentType: string | null;
}

// Una fila de la lista de trabajos disponibles. `id` sólo existe si la fila
// vive en la DB (es la única que se puede borrar del panel de sugeridos).
interface ChipEntry {
  key: string;
  id?: string;
  description: string;
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
  const [filter, setFilter] = useState('');
  // Escenarios propios: se arman con los trabajos ya tildados.
  const [customScenarios, setCustomScenarios] = useState<WorkScenario[]>([]);
  const [newScenarioName, setNewScenarioName] = useState<string | null>(null);

  const selectedDescriptions = new Set(workItems.map(w => w.description));

  // Lista completa de trabajos disponibles: los cargados en la DB de la empresa
  // + los del catálogo que falten + los que ya estén en el presupuesto. Así,
  // después de aplicar un escenario, los trabajos que no contempla siguen
  // estando acá para sumarlos, aunque la tabla `work_items` de esa empresa
  // haya quedado sembrada con un catálogo viejo.
  const availableChips: ChipEntry[] = useMemo(() => {
    const seen = new Set<string>();
    const out: ChipEntry[] = [];
    const push = (description: string, id?: string) => {
      const d = description.trim();
      if (!d || seen.has(d)) return;
      seen.add(d);
      out.push({ key: id ?? `catalog:${d}`, id, description: d });
    };
    chips.forEach(c => push(c.description, c.id));
    if (equipmentType) (WORK_ITEMS_BY_EQUIPMENT_TYPE[equipmentType] ?? []).forEach(d => push(d));
    workItems.forEach(w => push(w.description));
    return out;
  }, [chips, equipmentType, workItems]);

  const normalizedFilter = filter.trim().toLowerCase();
  const visibleChips = normalizedFilter
    ? availableChips.filter(c => c.description.toLowerCase().includes(normalizedFilter))
    : availableChips;

  const fetchChips = useCallback(async () => {
    // Sin tipo de equipo no hay lista que pedir: la API siembra los trabajos
    // por tipo y sin él devolvería una mezcla de todos.
    if (!equipmentType) {
      setChips([]);
      return;
    }
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

  // Los escenarios salen del catálogo, no de la lista de chips de la DB: cada
  // empresa tiene su propia tabla de trabajos sugeridos y, si quedó sembrada con
  // un catálogo viejo, filtrar contra ella hacía desaparecer los escenarios.
  // Así están disponibles para cualquier equipo del presupuesto y en las dos
  // empresas; los trabajos que no figuren como chip igual se ven en "Orden en el
  // presupuesto" y se pueden quitar de ahí.
  const catalogScenarios: WorkScenario[] = equipmentType
    ? WORK_SCENARIOS_BY_EQUIPMENT_TYPE[equipmentType] ?? []
    : [];

  // Los escenarios propios se guardan por empresa y tipo de equipo, así cada
  // combinación aparece sólo donde tiene sentido.
  const scenariosStorageKey = `bemec_scenarios:${companyId}:${equipmentType}`;

  useEffect(() => {
    if (!equipmentType) {
      setCustomScenarios([]);
      return;
    }
    try {
      const raw = localStorage.getItem(`bemec_scenarios:${companyId}:${equipmentType}`);
      setCustomScenarios(raw ? JSON.parse(raw) : []);
    } catch {
      setCustomScenarios([]);
    }
    setNewScenarioName(null);
  }, [companyId, equipmentType]);

  const persistCustomScenarios = (next: WorkScenario[]) => {
    setCustomScenarios(next);
    localStorage.setItem(scenariosStorageKey, JSON.stringify(next));
  };

  const handleSaveScenario = () => {
    const label = (newScenarioName ?? '').trim();
    if (!label || workItems.length === 0) return;
    const scenario: WorkScenario = {
      id: `custom:${crypto.randomUUID()}`,
      label,
      items: workItems.map(w => w.description),
    };
    // Mismo nombre = se pisa, para poder corregir uno sin acumular duplicados.
    persistCustomScenarios([...customScenarios.filter(s => s.label !== label), scenario]);
    setNewScenarioName(null);
  };

  const handleDeleteScenario = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    persistCustomScenarios(customScenarios.filter(s => s.id !== id));
  };

  const scenarios: WorkScenario[] = [...catalogScenarios, ...customScenarios];

  const activeScenarioId = scenarios.find(s =>
    s.items.length === workItems.length && s.items.every(d => selectedDescriptions.has(d))
  )?.id ?? null;

  // Aplicar un escenario reemplaza la selección: son combinaciones cerradas, y
  // después se puede ajustar tildando o destildando a mano.
  const handleApplyScenario = (scenario: WorkScenario) => {
    if (activeScenarioId === scenario.id) {
      reorderWorkItems([]);
      return;
    }
    reorderWorkItems(
      scenario.items.map((description, order) => ({
        id: crypto.randomUUID(),
        description,
        affectsCalculation: true,
        order,
      }))
    );
  };

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
  const handleDeleteChip = async (e: React.MouseEvent, chip: ChipEntry) => {
    // La fila es un <label>: sin preventDefault el click también tildaría el check.
    e.preventDefault();
    e.stopPropagation();
    if (!chip.id) return;
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
    const alreadyInPanel = availableChips.some(c => c.description === description.trim());
    if (!alreadyInPanel) {
      const res = await fetch('/api/work-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, equipmentType: equipmentType || null, description: description.trim() }),
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

        {/* ── Lista de trabajos disponibles para el tipo de equipo ──────── */}
        {!equipmentType ? (
          <p className="text-sm text-muted-foreground italic py-2">
            Elegí primero el tipo de equipo para ver los trabajos sugeridos.
          </p>
        ) : (
          <div className="space-y-2">
            <div className="space-y-1.5 pb-1">
              <div className="flex items-baseline gap-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Escenarios
                </p>
                <span className="text-[11px] text-muted-foreground/70">
                  — cargan varios trabajos de una vez
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {scenarios.map((scenario) => {
                  const isActive = activeScenarioId === scenario.id;
                  const isCustom = scenario.id.startsWith('custom:');
                  return (
                    <Button
                      key={scenario.id}
                      type="button"
                      size="sm"
                      variant={isActive ? 'default' : 'outline'}
                      className="h-7 px-2.5 text-xs font-normal"
                      onClick={() => handleApplyScenario(scenario)}
                      title={scenario.items.join('\n')}
                    >
                      {scenario.label}
                      <span className="ml-1.5 opacity-60 tabular-nums">{scenario.items.length}</span>
                      {isCustom && (
                        <span
                          role="button"
                          aria-label={`Borrar escenario ${scenario.label}`}
                          onClick={(e) => handleDeleteScenario(e, scenario.id)}
                          className="ml-1 -mr-1 p-0.5 opacity-50 hover:opacity-100 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </span>
                      )}
                    </Button>
                  );
                })}

                {newScenarioName === null ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2.5 text-xs font-normal text-muted-foreground"
                    onClick={() => setNewScenarioName('')}
                    disabled={workItems.length === 0}
                    title={
                      workItems.length === 0
                        ? 'Tildá primero los trabajos que querés guardar'
                        : 'Guardar los trabajos tildados como escenario'
                    }
                  >
                    <Plus className="h-3 w-3" />
                    Guardar escenario
                  </Button>
                ) : (
                  <div className="flex items-center gap-1">
                    <Input
                      autoFocus
                      value={newScenarioName}
                      onChange={(e) => setNewScenarioName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveScenario();
                        if (e.key === 'Escape') setNewScenarioName(null);
                      }}
                      placeholder={`Nombre — ${workItems.length} trabajos`}
                      className="h-7 w-56 text-xs"
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 px-2.5 text-xs font-normal"
                      onClick={handleSaveScenario}
                      disabled={!newScenarioName.trim()}
                    >
                      Guardar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs font-normal text-muted-foreground"
                      onClick={() => setNewScenarioName(null)}
                    >
                      Cancelar
                    </Button>
                  </div>
                )}
              </div>
            </div>

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

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Buscar trabajo..."
                className="h-9 pl-8"
              />
            </div>

            {loadingChips ? (
              <div className="flex items-center gap-1.5 py-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Cargando...
              </div>
            ) : (
              // Lista vertical de alto fijo: marcar o desmarcar no reacomoda
              // nada, así el ítem de al lado sigue donde estaba.
              <div className="border rounded-lg divide-y h-64 overflow-y-auto">
                {visibleChips.map((chip) => {
                  const isSelected = selectedDescriptions.has(chip.description);
                  return (
                    <label
                      key={chip.key}
                      className={[
                        'flex items-center gap-2.5 px-3 py-2 cursor-pointer group/row transition-colors',
                        isSelected ? 'bg-primary/5' : 'hover:bg-muted/50',
                      ].join(' ')}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggleChip(chip.description)}
                        className="shrink-0"
                      />
                      <span className={`flex-1 text-sm ${isSelected ? 'font-medium' : ''}`}>
                        {chip.description}
                      </span>
                      {chip.id && (
                        <button
                          onClick={(e) => handleDeleteChip(e, chip)}
                          title="Eliminar de la lista de sugeridos"
                          className="p-0.5 opacity-0 group-hover/row:opacity-100 text-muted-foreground hover:text-destructive transition-opacity shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </label>
                  );
                })}
                {visibleChips.length === 0 && (
                  <p className="text-xs text-muted-foreground italic p-3">
                    {availableChips.length === 0
                      ? 'Sin sugeridos. Agregá trabajos con el campo de abajo.'
                      : 'Ningún trabajo coincide con la búsqueda.'}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Agregar trabajo a la lista ───────────────────────────────── */}
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
