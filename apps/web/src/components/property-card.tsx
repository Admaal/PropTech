import Image from "next/image";
import Link from "next/link";
import type { PropertyListItem } from "@proptech/shared";
import { LatestAnalysisBadge } from "@/components/latest-analysis-badge";
import { formatMonthlyPrice } from "@/lib/format";
import { isUnsplashImageUrl, optimizeImageUrl } from "@/lib/optimize-image-url";

interface PropertyCardProps {
  property: PropertyListItem;
}

export function PropertyCard({ property }: PropertyCardProps) {
  const photo = property.image_urls[0];

  return (
    <Link href={`/properties/${property.id}`} className="block h-full">
      <article className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card transition-colors hover:bg-muted/30">
        {photo &&
          (isUnsplashImageUrl(photo) ? (
            <Image
              src={optimizeImageUrl(photo, 640)}
              alt=""
              width={640}
              height={400}
              sizes="(max-width: 768px) 100vw, 33vw"
              quality={75}
              loading="lazy"
              className="aspect-16/10 w-full object-cover"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo}
              alt=""
              loading="lazy"
              decoding="async"
              className="aspect-16/10 w-full object-cover"
            />
          ))}
        <div className="flex flex-1 flex-col p-6">
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
          <p className="mb-1 text-sm text-muted-foreground">
            {property.address}
          </p>
          <p className="mb-4 text-sm text-muted-foreground">{property.city}</p>
          <dl className="mt-auto grid grid-cols-3 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Precio</dt>
              <dd className="font-medium whitespace-nowrap">
                {formatMonthlyPrice(property.price_monthly)}
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
        </div>
      </article>
    </Link>
  );
}
