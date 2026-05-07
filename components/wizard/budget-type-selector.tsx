import { ArrowLeft, Wrench, Package, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Company, BudgetType } from '@/types/budget';

interface BudgetTypeSelectorProps {
  company: Company;
  onBack: () => void;
  onSelect: (type: BudgetType) => void;
  onHistory: () => void;
}

const BUDGET_TYPES = [
  {
    type: 'reparacion' as const,
    icon: Wrench,
    title: 'Reparación',
    desc: 'Presupuestar reparación de motores, bombas, reductores y otros equipos',
  },
  {
    type: 'equipo_nuevo' as const,
    icon: Package,
    title: 'Equipo Nuevo',
    desc: 'Cotizar venta de equipos nuevos: motores, bombas, reductores, variadores',
  },
] as const;

export function BudgetTypeSelector({ company, onBack, onSelect, onHistory }: BudgetTypeSelectorProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white border-b shadow-sm">
        <div
          className="h-1"
          style={{ background: `linear-gradient(90deg, ${company.primaryColor}, ${company.secondaryColor})` }}
        />
        <div className="px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-3 rounded-xl px-1.5 py-1 -mx-1.5 -my-1 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1"
            style={{ ['--tw-ring-color' as string]: company.primaryColor }}
            title="Volver al inicio"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${company.primaryColor}15` }}
            >
              <img src={company.logo} alt={company.name} className="w-7 h-7 object-contain" />
            </div>
            <div className="text-left">
              <h1 className="text-base font-bold leading-tight" style={{ color: company.primaryColor }}>
                {company.name}
              </h1>
              <p className="text-xs text-muted-foreground">{company.subtitle}</p>
            </div>
          </button>
          <div className="ml-auto">
            <Button variant="outline" size="sm" className="rounded-xl" onClick={onHistory}>
              <ClipboardList className="h-4 w-4 mr-1.5" />
              Estado
            </Button>
          </div>
        </div>
      </header>

      <div className="flex items-center justify-center p-4 animate-fade-in" style={{ minHeight: 'calc(100vh - 74px)' }}>
        <div className="max-w-2xl w-full">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold tracking-tight mb-2 text-slate-800">Tipo de Presupuesto</h2>
            <p className="text-slate-500">¿Qué tipo de presupuesto querés crear?</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {BUDGET_TYPES.map(({ type, icon: Icon, title, desc }) => (
              <button
                key={type}
                onClick={() => onSelect(type)}
                className="group relative overflow-hidden rounded-2xl border-2 border-transparent bg-white shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 text-left focus:outline-none"
              >
                <div
                  className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
                  style={{ background: `linear-gradient(90deg, ${company.primaryColor}, ${company.secondaryColor})` }}
                />
                <div className="p-8 flex flex-col items-center text-center">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
                    style={{ backgroundColor: `${company.primaryColor}15` }}
                  >
                    <Icon className="h-8 w-8" style={{ color: company.primaryColor }} />
                  </div>
                  <h3 className="text-lg font-bold mb-2 text-slate-800">{title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                  <div
                    className="mt-5 px-4 py-1.5 rounded-full text-xs font-semibold text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    style={{ backgroundColor: company.primaryColor }}
                  >
                    Seleccionar →
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
