"use client";

import { btnPrimaryClasses, btnSecondaryClasses } from "@/lib/ui-styles";

export interface PropertyFilterValues {
  priceMin: string;
  priceMax: string;
  sqmMin: string;
}

interface PropertyFiltersProps {
  values: PropertyFilterValues;
  onChange: (values: PropertyFilterValues) => void;
  onApply: () => void;
  onReset: () => void;
  loading?: boolean;
}

export function PropertyFilters({
  values,
  onChange,
  onApply,
  onReset,
  loading,
}: PropertyFiltersProps) {
  return (
    <aside className="rounded-lg border border-border bg-card p-6">
      <h3 className="mb-4 text-sm font-medium">Filtros</h3>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">
            Precio mínimo (€/mes)
          </label>
          <input
            type="number"
            min={0}
            value={values.priceMin}
            onChange={(e) =>
              onChange({ ...values, priceMin: e.target.value })
            }
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            placeholder="0"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">
            Precio máximo (€/mes)
          </label>
          <input
            type="number"
            min={0}
            value={values.priceMax}
            onChange={(e) =>
              onChange({ ...values, priceMax: e.target.value })
            }
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            placeholder="Sin límite"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">
            Superficie mínima (m²)
          </label>
          <input
            type="number"
            min={0}
            value={values.sqmMin}
            onChange={(e) => onChange({ ...values, sqmMin: e.target.value })}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            placeholder="0"
          />
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          El <strong className="font-medium text-foreground">riesgo del
          inquilino</strong> aparece tras subir y analizar un PDF en la ficha del
          inmueble.
        </p>
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onApply}
            disabled={loading}
            className={`flex-1 ${btnPrimaryClasses}`}
          >
            {loading ? "Buscando…" : "Aplicar"}
          </button>
          <button
            type="button"
            onClick={onReset}
            disabled={loading}
            className={btnSecondaryClasses}
          >
            Limpiar
          </button>
        </div>
      </div>
    </aside>
  );
}

export const emptyFilters: PropertyFilterValues = {
  priceMin: "",
  priceMax: "",
  sqmMin: "",
};
