"use client";

import { useCallback, useRef, useState } from "react";
import type { PropertyListItem } from "@proptech/shared";
import { fetchProperties } from "@/lib/api";
import { PropertyList } from "@/components/property-list";
import { PropertyMap } from "@/components/property-map-loader";
import {
  PropertyFilters,
  emptyFilters,
  type PropertyFilterValues,
} from "@/components/property-filters";

interface DashboardViewProps {
  accessToken: string;
  initialProperties: PropertyListItem[];
  initialTotal: number;
}

function toSearchParams(
  values: PropertyFilterValues,
  bbox?: string,
): Record<string, string> {
  const params: Record<string, string> = { limit: "100" };
  if (values.priceMin) params.priceMin = values.priceMin;
  if (values.priceMax) params.priceMax = values.priceMax;
  if (values.sqmMin) params.sqmMin = values.sqmMin;
  if (bbox) params.bbox = bbox;
  return params;
}

export function DashboardView({
  accessToken,
  initialProperties,
  initialTotal,
}: DashboardViewProps) {
  const [filters, setFilters] = useState<PropertyFilterValues>(emptyFilters);
  const [properties, setProperties] = useState(initialProperties);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterByMap, setFilterByMap] = useState(false);
  const bboxRef = useRef<string | undefined>(undefined);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(
    async (values: PropertyFilterValues, bbox?: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchProperties(
          accessToken,
          toSearchParams(values, bbox),
        );
        setProperties(result.data);
        setTotal(result.total);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al cargar");
      } finally {
        setLoading(false);
      }
    },
    [accessToken],
  );

  const handleBoundsChange = useCallback(
    (bbox: string) => {
      bboxRef.current = bbox;
      if (!filterByMap) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        load(filters, bbox);
      }, 400);
    },
    [filterByMap, filters, load],
  );

  const handleFilterByMapChange = useCallback(
    (enabled: boolean) => {
      setFilterByMap(enabled);
      if (enabled && bboxRef.current) {
        load(filters, bboxRef.current);
      } else if (!enabled) {
        load(filters);
      }
    },
    [filters, load],
  );

  return (
    <div className="space-y-8">
      <PropertyMap
        properties={properties}
        onBoundsChange={handleBoundsChange}
        filterByMap={filterByMap}
        onFilterByMapChange={handleFilterByMapChange}
      />

      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <PropertyFilters
          values={filters}
          onChange={setFilters}
          onApply={() =>
            load(filters, filterByMap ? bboxRef.current : undefined)
          }
          onReset={() => {
            setFilters(emptyFilters);
            setFilterByMap(false);
            load(emptyFilters);
          }}
          loading={loading}
        />
        <div>
          <p className="mb-6 text-sm text-muted-foreground">
            {total} {total === 1 ? "inmueble" : "inmuebles"} encontrados
            {filterByMap ? " en la zona del mapa" : ""}
          </p>
          {error ? (
            <div className="rounded-lg border border-red-300 bg-red-50 p-6 text-sm text-red-800">
              {error}
            </div>
          ) : loading ? (
            <div className="grid gap-6 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-48 animate-pulse rounded-lg border border-foreground bg-card"
                />
              ))}
            </div>
          ) : properties.length === 0 ? (
            <div className="rounded-lg border border-foreground bg-card p-10 text-center text-sm text-muted-foreground">
              No hay inmuebles con estos filtros. Prueba a ampliar la zona del
              mapa o limpiar los filtros.
            </div>
          ) : (
            <PropertyList properties={properties} />
          )}
        </div>
      </div>
    </div>
  );
}
