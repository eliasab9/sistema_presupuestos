'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Search,
  CheckCircle2,
  Clock,
  Trash2,
  RotateCcw,
  ArrowUpDown,
  ClipboardList,
  TrendingUp,
  Inbox,
  FileText,
  ExternalLink,
  Pencil,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getAllBudgets,
  setBudgetStatus,
  deleteBudget,
} from '@/lib/storage/budgets';
import {
  fetchSentBudgets,
  updateBudgetStatusInDb,
  deleteBudgetFromDb,
  type SentBudgetDTO,
} from '@/lib/storage/budgets-api';
import type { Budget, BudgetStatus, Company } from '@/types/budget';
import { COMPANIES } from '@/types/budget';

type StatusFilter = 'all' | 'pending' | 'approved';
type SortOrder = 'newest' | 'oldest';

interface BudgetHistoryPageProps {
  company: Company;
  onBack: () => void;
  /** Open this budget in the editor for re-pricing / modifying. */
  onEditBudget?: (budgetId: string, budgetType: 'reparacion' | 'equipo_nuevo') => void;
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
  } catch {
    return '—';
  }
}

function formatARS(n: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(n);
}

// Local view-model used by this page: union of localStorage Budget and the
// DB DTO that carries Drive file metadata. The fields the UI reads
// (meta.number, customer.name, totalFinal, status, sentAt) exist on both.
type SentBudget = (Budget | SentBudgetDTO) & {
  driveFileId?: string | null;
  driveWebViewLink?: string | null;
  fileName?: string | null;
  fileFormat?: 'pdf' | 'docx' | null;
  budgetType?: 'reparacion' | 'equipo_nuevo';
};

export function BudgetHistoryPage({ company, onBack, onEditBudget }: BudgetHistoryPageProps) {
  const [allBudgets, setAllBudgets] = useState<SentBudget[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [clientSearch, setClientSearch] = useState('');
  const [budgetToDelete, setBudgetToDelete] = useState<SentBudget | null>(null);

  const refresh = useCallback(async () => {
    // localStorage cache for instant render / offline fallback
    const local = getAllBudgets().filter((b) => !!b.status && b.companyId === company.id);
    setAllBudgets(local);
    // DB is the source of truth across devices
    try {
      const remote = await fetchSentBudgets(company.id);
      // Merge: prefer remote rows; keep local rows that are not yet in DB.
      const remoteIds = new Set(remote.map((b) => b.id));
      const merged: SentBudget[] = [
        ...remote,
        ...local.filter((b) => !remoteIds.has(b.id)),
      ];
      setAllBudgets(merged);
    } catch (e) {
      console.warn('Could not load budgets from DB, using localStorage only:', e);
    }
  }, [company.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    let list = allBudgets;

    if (statusFilter !== 'all') {
      list = list.filter((b) => b.status === statusFilter);
    }

    if (clientSearch.trim()) {
      const q = clientSearch.toLowerCase();
      list = list.filter((b) =>
        (b.customer.name ?? '').toLowerCase().includes(q)
      );
    }

    list = [...list].sort((a, b) => {
      const da = a.sentAt ?? a.updatedAt;
      const db = b.sentAt ?? b.updatedAt;
      return sortOrder === 'newest' ? db.localeCompare(da) : da.localeCompare(db);
    });

    return list;
  }, [allBudgets, statusFilter, sortOrder, clientSearch]);

  // Stats
  const total = allBudgets.length;
  const pending = allBudgets.filter((b) => b.status === 'pending').length;
  const approved = allBudgets.filter((b) => b.status === 'approved').length;
  const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;
  const totalValue = filtered.reduce((sum, b) => sum + (b.totalFinal ?? 0), 0);

  const handleToggleStatus = (b: SentBudget) => {
    const next: BudgetStatus = b.status === 'approved' ? 'pending' : 'approved';
    setBudgetStatus(b.id, next);
    updateBudgetStatusInDb(b.id, next).catch((e) =>
      console.error('Failed to update status in DB:', e)
    );
    refresh();
    toast.success(next === 'approved' ? 'Marcado como aprobado ✓' : 'Vuelto a pendiente');
  };

  const handleDelete = (b: SentBudget) => {
    setBudgetToDelete(b);
  };

  const handleConfirmDelete = () => {
    if (!budgetToDelete) return;
    deleteBudget(budgetToDelete.id);
    deleteBudgetFromDb(budgetToDelete.id).catch((e) =>
      console.error('Failed to delete budget from DB:', e)
    );
    setBudgetToDelete(null);
    refresh();
    toast.success('Eliminado del historial');
  };

  const handleOpenFile = (b: SentBudget) => {
    if (b.driveWebViewLink) {
      window.open(b.driveWebViewLink, '_blank', 'noopener,noreferrer');
      return;
    }
    toast.info('Este presupuesto no tiene archivo guardado en Drive.', {
      description:
        'Sólo los presupuestos enviados desde esta versión con guardado en Drive incluyen el archivo.',
    });
  };

  const STATUS_FILTERS: { value: StatusFilter; label: string; count: number }[] = [
    { value: 'all', label: 'Todos', count: total },
    { value: 'pending', label: 'Pendientes', count: pending },
    { value: 'approved', label: 'Aprobados', count: approved },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div
          className="h-1"
          style={{
            background: `linear-gradient(90deg, ${company.primaryColor}, ${company.secondaryColor})`,
          }}
        />
        <div className="px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${company.primaryColor}15` }}
          >
            <img src={company.logo} alt={company.name} className="w-6 h-6 object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold leading-tight truncate" style={{ color: company.primaryColor }}>
              Estado de presupuestos
            </h1>
            <p className="text-xs text-muted-foreground">{company.name}</p>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 space-y-6">

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total enviados', value: total, icon: ClipboardList, color: company.primaryColor },
            { label: 'Pendientes', value: pending, icon: Clock, color: '#f59e0b' },
            { label: 'Aprobados', value: approved, icon: CheckCircle2, color: '#22c55e' },
            { label: 'Tasa aprobación', value: `${approvalRate}%`, icon: TrendingUp, color: '#6366f1' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div
              key={label}
              className="bg-white rounded-2xl border shadow-sm p-4 flex items-start gap-3"
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${color}15` }}
              >
                <Icon className="h-4 w-4" style={{ color }} />
              </div>
              <div className="min-w-0">
                <div className="text-xl font-bold text-slate-800 leading-tight">{value}</div>
                <div className="text-xs text-muted-foreground leading-snug">{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border shadow-sm p-4 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status chips */}
            {STATUS_FILTERS.map(({ value, label, count }) => (
              <button
                key={value}
                onClick={() => setStatusFilter(value)}
                className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
                  statusFilter === value
                    ? 'border-transparent text-white shadow-sm'
                    : 'bg-transparent text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
                style={
                  statusFilter === value
                    ? { backgroundColor: company.primaryColor }
                    : undefined
                }
              >
                {label}
                <span
                  className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                    statusFilter === value ? 'bg-white/20' : 'bg-slate-100'
                  }`}
                >
                  {count}
                </span>
              </button>
            ))}

            {/* Sort toggle */}
            <button
              onClick={() => setSortOrder((o) => (o === 'newest' ? 'oldest' : 'newest'))}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 text-sm text-slate-600 hover:border-slate-300 transition-colors"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              {sortOrder === 'newest' ? 'Más recientes' : 'Más antiguos'}
            </button>
          </div>

          {/* Client search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              placeholder="Filtrar por cliente..."
              className="pl-9 rounded-xl bg-slate-50 border-slate-200"
            />
          </div>
        </div>

        {/* Results summary */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
            <span>
              {filtered.length} presupuesto{filtered.length !== 1 ? 's' : ''}
            </span>
            <span className="font-medium text-slate-700">
              Total: {formatARS(totalValue)}
            </span>
          </div>
        )}

        {/* Budget list */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border shadow-sm py-16 flex flex-col items-center gap-3 text-center px-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: `${company.primaryColor}10` }}
            >
              <Inbox className="h-8 w-8" style={{ color: company.primaryColor, opacity: 0.5 }} />
            </div>
            <div>
              <p className="font-medium text-slate-700">
                {statusFilter === 'pending'
                  ? 'No hay presupuestos pendientes'
                  : statusFilter === 'approved'
                  ? 'No hay presupuestos aprobados'
                  : clientSearch
                  ? 'Sin resultados para esa búsqueda'
                  : 'Todavía no enviaste ningún presupuesto'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {!clientSearch && statusFilter === 'all'
                  ? 'Cuando envíes un presupuesto desde el panel de entrega, aparecerá acá.'
                  : 'Probá con otros filtros.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((b) => {
              const isApproved = b.status === 'approved';
              const co = COMPANIES[b.companyId];
              const hasFile = !!b.driveWebViewLink;
              return (
                <div
                  key={b.id}
                  role={hasFile ? 'button' : undefined}
                  tabIndex={hasFile ? 0 : undefined}
                  onClick={hasFile ? () => handleOpenFile(b) : undefined}
                  onKeyDown={
                    hasFile
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleOpenFile(b);
                          }
                        }
                      : undefined
                  }
                  title={hasFile ? 'Abrir archivo enviado en Google Drive' : undefined}
                  className={`bg-white rounded-2xl border shadow-sm transition-all ${
                    hasFile
                      ? 'cursor-pointer hover:shadow-md hover:border-slate-300'
                      : 'hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center gap-4 p-4">
                    {/* Status accent */}
                    <div
                      className="w-1.5 self-stretch rounded-full shrink-0"
                      style={{ backgroundColor: isApproved ? '#22c55e' : '#f59e0b' }}
                    />

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-bold text-slate-800">N° {b.meta.number}</span>
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 h-4 font-medium"
                          style={{ borderColor: co.primaryColor, color: co.primaryColor }}
                        >
                          {co.name}
                        </Badge>
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            isApproved
                              ? 'bg-green-50 text-green-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {isApproved ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <Clock className="h-3 w-3" />
                          )}
                          {isApproved ? 'Aprobado' : 'Pendiente'}
                        </span>
                        {hasFile && (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600"
                            title="Archivo disponible en Drive"
                          >
                            <FileText className="h-3 w-3" />
                            {(b.fileFormat ?? 'pdf').toUpperCase()}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-700 font-medium truncate">
                        {b.customer.name || <span className="text-muted-foreground italic">Sin cliente</span>}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>Enviado {formatDate(b.sentAt ?? b.updatedAt)}</span>
                        <span>·</span>
                        <span className="font-medium text-slate-700">{formatARS(b.totalFinal)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div
                      className="flex items-center gap-1 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {hasFile && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                          onClick={() => handleOpenFile(b)}
                          title="Abrir archivo en Drive"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {onEditBudget && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2.5 text-xs rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                          onClick={() => onEditBudget(b.id, b.budgetType ?? 'reparacion')}
                          title="Editar presupuesto y volver a enviarlo"
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1" />
                          Editar
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-8 px-2.5 text-xs rounded-xl ${
                          isApproved
                            ? 'text-amber-600 hover:bg-amber-50 hover:text-amber-700'
                            : 'text-green-600 hover:bg-green-50 hover:text-green-700'
                        }`}
                        onClick={() => handleToggleStatus(b)}
                      >
                        {isApproved ? (
                          <><RotateCcw className="h-3.5 w-3.5 mr-1" />Pendiente</>
                        ) : (
                          <><CheckCircle2 className="h-3.5 w-3.5 mr-1" />Aprobar</>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50"
                        onClick={() => handleDelete(b)}
                        title="Eliminar"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={budgetToDelete !== null}
        onOpenChange={(open) => { if (!open) setBudgetToDelete(null); }}
        title={`¿Eliminar presupuesto N° ${budgetToDelete?.meta.number}?`}
        description="Esta acción no se puede deshacer. El presupuesto se eliminará del historial local."
        confirmLabel="Eliminar"
        destructive
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
