'use client';

import { useBudget } from '@/lib/budget-context';
import { CustomerSelector } from '@/components/customers/customer-selector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';

export function CustomerSection() {
  const { budget, setCustomer } = useBudget();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5" />
          Datos del Cliente
        </CardTitle>
      </CardHeader>
      <CardContent>
        <CustomerSelector
          value={budget.customer}
          onChange={setCustomer}
        />
      </CardContent>
    </Card>
  );
}
