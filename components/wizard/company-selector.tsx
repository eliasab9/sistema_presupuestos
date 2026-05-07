import { Building2 } from 'lucide-react';
import type { CompanyId } from '@/types/budget';
import { COMPANIES } from '@/types/budget';

interface CompanySelectorProps {
  onSelect: (companyId: CompanyId) => void;
}

export function CompanySelector({ onSelect }: CompanySelectorProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full animate-fade-in">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white shadow-md mb-5">
            <Building2 className="h-7 w-7 text-slate-500" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 text-slate-800">Sistema de Presupuestos</h1>
          <p className="text-slate-500">Seleccioná la empresa para generar el presupuesto</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          {Object.values(COMPANIES).map((comp) => (
            <button
              key={comp.id}
              className="group relative overflow-hidden rounded-2xl border-2 border-transparent bg-white shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-offset-2 text-left"
              style={{ ['--tw-ring-color' as string]: comp.primaryColor }}
              onClick={() => onSelect(comp.id)}
            >
              <div
                className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
                style={{ background: `linear-gradient(90deg, ${comp.primaryColor}, ${comp.secondaryColor})` }}
              />
              <div className="p-8 flex flex-col items-center text-center">
                <div
                  className="w-20 h-20 rounded-xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
                  style={{ backgroundColor: `${comp.primaryColor}12` }}
                >
                  <img src={comp.logo} alt={comp.name} className="w-14 h-14 object-contain" />
                </div>
                <h2 className="text-xl font-bold mb-1" style={{ color: comp.primaryColor }}>
                  {comp.name}
                </h2>
                <p className="text-sm text-slate-500">{comp.subtitle}</p>
                <div
                  className="mt-5 px-4 py-1.5 rounded-full text-xs font-semibold text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  style={{ backgroundColor: comp.primaryColor }}
                >
                  Seleccionar →
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
