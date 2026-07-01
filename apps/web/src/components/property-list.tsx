import type { PropertyListItem } from "@proptech/shared";
import { PropertyCard } from "./property-card";

interface PropertyListProps {
  properties: PropertyListItem[];
  emptyMessage?: string;
}

export function PropertyList({
  properties,
  emptyMessage = "No hay propiedades que coincidan con los filtros.",
}: PropertyListProps) {
  if (properties.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-12 text-center">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 md:items-stretch">
      {properties.map((property) => (
        <PropertyCard key={property.id} property={property} />
      ))}
    </div>
  );
}
