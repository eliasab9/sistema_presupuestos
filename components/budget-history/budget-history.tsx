'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClipboardList, CheckCircle2, Clock, Trash2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import {
  getAllBudgets,
  setBudgetStatus,
  deleteBudget,
} from '@/lib/storage/budgets';
import type { Budget, BudgetStatus } from '@/types/budget';
import { COMPANIES } from '@/types/budget';

type Filter = 'pending' | 'approved' | 'all';

const FILTER_LABELS: Record<Filter, string> = {
  pending: 'Pendientes',
  approved: 'Aprobados',
  all: 'Todos',
};

function formatDateShort(iso?: string): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  } catch {
    return iso;
  }
}

function formatARS(n: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
}

export function BudgetHistory() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [filter, setFilter] = useState<Filter>('pending');

  const refresh = useCallback(() => {
    setBudgets(getAllBudgets());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Refresh when window regains focus (covers edits done in same tab)
  useEffect(() => {
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh]);

  const filtered = budgets
    .filter(b => b.status) // Only show budgets that were sent (have status)
    .filter(b => (filter === 'all' ? true : b.status === filter))
    .sort((a, b) => {
      const ad = a.sentAt ?? a.updatedAt;
      const bd = b.sentAt ?? b.updatedAt;
      return bd.localeCompare(ad);
    });

  const counts = {
    pending: budgets.filter(b => b.status === 'pending').length,
    approved: budgets.filter(b => b.status === 'approved').length,
    all: budgets.filter(b => b.status).length,
  };

  const handleToggleStatus = (b: Budget) => {
    const next: BudgetStatus = b.status === 'approved' ? 'pending' : 'approved';
    setBudgetStatus(b.id, next);
    refresh();
    toast.success(next === 'approved' ? 'Marcado como aprobado' : 'Marcado como pendiente');
  };

  const handleDelete = (b: Budget) => {
    if (!confirm(`¿Eliminar el presupuesto N° ${b.meta.number} del historial?`)) return;
    deleteBudget(b.id);
    refresh();
    toast.success('Presupuesto eliminado del historial');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ClipboardList className="h-5 w-5" />
          Estado de presupuestos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Filter chips */}
        <div className="flex gap-1 flex-wrap">
          {(['pending', 'approved', 'all'] as Filter[]).map((f) => {
            const isActive = filter === f;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-md border text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
                }`}
              >
                {FILTER_LABELS[f]} ({counts[f]})
              </button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            {filter === 'pending'
              ? 'No hay presupuestos pendientes. Cuando envíes uno, aparecerá acá.'
              : filter === 'approved'
              ? 'Aún no marcaste ningún presupuesto como aprobado.'
              : 'No hay presupuestos en el historial.'}
          </p>
        ) : (
          <div className="space-y-2">
            {filtered.map((b) => {
              const company = COMPANIES[b.companyId];
              const isApproved = b.status === 'approved';
              return (
                <div
                  key={b.id}
                  className="flex items-center gap-3 rounded-md border p-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">N° {b.meta.number}</span>
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0"
                        style={{ borderColor: company.primaryColor, color: company.primaryColor }}
                      >
                        {company.name}
                      </Badge>
                      <Badge
                        variant={isApproved ? 'default' : 'secondary'}
                        className={`text-[10px] ${isApproved ? 'bg-green-600 hover:bg-green-600' : ''}`}
                      >
                        {isApproved ? (
                          <><CheckCircle2 className="h-3 w-3 mr-1" /> Aprobado</>
                        ) : (
                          <><Clock className="h-3 w-3 mr-1" /> Pendiente</>
                        )}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 truncate">
                      {b.customer.name || 'Sin cliente'} · Enviado {formatDateShort(b.sentAt ?? b.updatedAt)} · {formatARS(b.totalFinal)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs"
                      onClick={() => handleToggleStatus(b)}
                      title={isApproved ? 'Marcar como pendiente' : 'Marcar como aprobado'}
                    >
                      {isApproved ? (
                        <><RotateCcw className="h-3.5 w-3.5 mr-1" /> Pendiente</>
                      ) : (
                        <><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Aprobar</>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(b)}
                      title="Eliminar del historial"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
