import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchProperty, fetchAnalyses } from "@/lib/api";
import { AppShell } from "@/components/app-shell";
import { PropertyDocumentsSection } from "@/components/property-documents-section";
import { PropertyLocationMap } from "@/components/property-location-map-loader";
import { LatestAnalysisBadge } from "@/components/latest-analysis-badge";

interface PropertyPageProps {
  params: Promise<{ id: string }>;
}

export default async function PropertyPage({ params }: PropertyPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return null;
  }

  let property: Awaited<ReturnType<typeof fetchProperty>>;
  let analyses: Awaited<ReturnType<typeof fetchAnalyses>> = [];

  try {
    [property, analyses] = await Promise.all([
      fetchProperty(session.access_token, id),
      fetchAnalyses(session.access_token, id),
    ]);
  } catch {
    notFound();
  }

  return (
    <AppShell
      title={property.title}
      subtitle={`${property.address}, ${property.city}`}
      backHref="/dashboard"
      backLabel="← Volver a propiedades"
    >
      <div className="grid gap-8 lg:grid-cols-2">
        <section className="rounded-lg border border-border bg-card p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <h2 className="text-xl font-medium">Detalle del inmueble</h2>
            {property.latest_analysis ? (
              <LatestAnalysisBadge analysis={property.latest_analysis} />
            ) : (
              <span className="text-xs text-muted-foreground">
                Sin evaluación IA
              </span>
            )}
          </div>
          {property.latitude != null && property.longitude != null && (
            <div className="mb-6 overflow-hidden rounded-lg border border-border">
              <PropertyLocationMap
                latitude={property.latitude}
                longitude={property.longitude}
                title={property.title}
              />
            </div>
          )}
          <dl className="grid grid-cols-2 gap-4 text-sm">
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
            <div>
              <dt className="text-muted-foreground">€/m²</dt>
              <dd className="font-medium">
                {Math.round(property.price_monthly / property.sqm)} €
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-2 text-xl font-medium">
            Documentación del inquilino
          </h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Sube una nómina, contrato o informe de solvencia. El riesgo del
            candidato se calcula aquí con IA y queda en el historial.
          </p>
          <PropertyDocumentsSection
            propertyId={property.id}
            initialAnalyses={analyses}
          />
        </section>
      </div>
    </AppShell>
  );
}
