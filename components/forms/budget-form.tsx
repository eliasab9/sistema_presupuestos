'use client';

import { useState } from 'react';
import { useBudget } from '@/lib/budget-context';
import { MetaSection } from './sections/meta-section';
import { CustomerSection } from './sections/customer-section';
import { EquipmentSection } from './sections/equipment-section';
import { WorkItemsSection } from './sections/work-items-section';
import { BearingsSection } from './sections/bearings-section';
import { SparePartsSection } from './sections/spare-parts-section';
import { MachiningSection } from './sections/machining-section';
import { LaborSection } from './sections/labor-section';
import { TotalsSection } from './sections/totals-section';
import { ObservationsSection } from './sections/observations-section';
import { DeliveryPanel } from '@/components/delivery/delivery-panel';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, Pencil, Check } from 'lucide-react';

export function BudgetForm() {
  const { budget, addSection, switchSection, removeSection, updateSectionLabel, effectiveSections } = useBudget();
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editingLabel, setEditingLabel] = useState('');

  const handleStartEdit = (idx: number, label: string) => {
    setEditingIdx(idx);
    setEditingLabel(label);
  };

  const handleConfirmEdit = () => {
    if (editingIdx !== null && editingLabel.trim()) {
      updateSectionLabel(editingIdx, editingLabel.trim());
    }
    setEditingIdx(null);
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        <MetaSection />

        <Separator />

        <CustomerSection />

        <Separator />

        {/* Section tabs */}
        <div className="space-y-2">
          <div className="flex items-center gap-1 flex-wrap">
            {effectiveSections.map((section, idx) => {
              const isActive = idx === budget.activeSectionIdx;
              return (
                <div key={section.id} className="flex items-center">
                  {editingIdx === idx ? (
                    <div className="flex items-center gap-1">
                      <input
                        autoFocus
                        value={editingLabel}
                        onChange={(e) => setEditingLabel(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleConfirmEdit()}
                        onBlur={handleConfirmEdit}
                        className="px-2 py-1 text-sm border rounded-md w-32 outline-none ring-1 ring-primary"
                      />
                      <button onClick={handleConfirmEdit} className="p-1 text-primary hover:text-primary/80">
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className={`flex items-center gap-0.5 rounded-md border text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
                    }`}>
                      <button
                        onClick={() => switchSection(idx)}
                        className="px-3 py-1.5"
                      >
                        {section.label}
                      </button>
                      {isActive && (
                        <button
                          onClick={() => handleStartEdit(idx, section.label)}
                          className="pr-1.5 opacity-70 hover:opacity-100"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      )}
                      {effectiveSections.length > 1 && (
                        <button
                          onClick={() => removeSection(idx)}
                          className="pr-1.5 opacity-60 hover:opacity-100 hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            <button
              onClick={addSection}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-dashed border-border text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              Agregar equipo
            </button>
          </div>
        </div>

        <EquipmentSection />

        <Separator />

        <WorkItemsSection />

        <Separator />

        <LaborSection />

        <Separator />

        <BearingsSection />

        <Separator />

        <SparePartsSection />

        <Separator />

        <MachiningSection />

        <Separator />

        <TotalsSection />

        <Separator />

        <ObservationsSection />

        <Separator />

        <DeliveryPanel />
      </div>
    </ScrollArea>
  );
}
