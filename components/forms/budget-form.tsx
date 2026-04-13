'use client';

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

export function BudgetForm() {
  const { budget } = useBudget();

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        <MetaSection />
        
        <Separator />
        
        <CustomerSection />
        
        <Separator />
        
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
