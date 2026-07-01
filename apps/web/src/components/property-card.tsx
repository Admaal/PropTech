import Link from "next/link";
import type { PropertyListItem } from "@proptech/shared";
import { LatestAnalysisBadge } from "@/components/latest-analysis-badge";

interface PropertyCardProps {
  property: PropertyListItem;
}

export function PropertyCard({ property }: PropertyCardProps) {
  return (
    <Link href={`/properties/${property.id}`} className="block">
      <article className="rounded-lg border border-border bg-card p-6 transition-colors hover:bg-muted/30">
        <div className="mb-3 flex items-start justify-between gap-4">
          <h3 className="text-lg font-medium text-card-foreground">
            {property.title}
          </h3>
          {property.latest_analysis ? (
            <LatestAnalysisBadge analysis={property.latest_analysis} />
          ) : (
            <span className="shrink-0 text-xs text-muted-foreground">
              Sin evaluar
            </span>
          )}
        </div>
        <p className="mb-1 text-sm text-muted-foreground">{property.address}</p>
        <p className="mb-4 text-sm text-muted-foreground">{property.city}</p>
        <dl className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <dt className="text-muted-foreground">Precio</dt>
            <dd className="font-medium">
              {property.price_monthly.toLocaleString("es-ES")} €/mes
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Superficie</dt>
            <dd className="font-medium">{property.sqm} m²</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Habitaciones</dt>
            <dd className="font-medium">{property.bedrooms}</dd>
          </div>
        </dl>
      </article>
    </Link>
  );
}
