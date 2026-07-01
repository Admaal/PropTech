import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

const features = [
  {
    title: "Multi-tenant real",
    description:
      "Cada organización ve solo sus inmuebles. Aislamiento con Row-Level Security en PostgreSQL.",
  },
  {
    title: "Mapa interactivo",
    description:
      "Explora propiedades en Madrid con Leaflet. Filtra por zona visible, precio y superficie.",
  },
  {
    title: "Análisis IA async",
    description:
      "Sube PDFs de nóminas o contratos. Gemini analiza en segundo plano sin bloquear la API.",
  },
];

export default function HomePage() {
  return (
    <main>
      <div className="absolute right-6 top-6">
        <ThemeToggle />
      </div>

      <section className="mx-auto flex min-h-[70vh] max-w-[1200px] flex-col items-center justify-center gap-8 px-6 py-20 text-center">
        <Logo className="h-12 w-12" />
        <p className="inline-block rounded-full border border-border bg-card px-4 py-2 text-sm">
          PropTech SaaS · Portfolio
        </p>
        <h1 className="max-w-3xl text-4xl font-medium tracking-tight md:text-6xl">
          Inteligencia inmobiliaria con IA
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          Explora dos inmobiliarias de ejemplo en Madrid, sube documentos y
          consulta evaluaciones de riesgo generadas por IA.
        </p>
        <Link
          href="/login"
          className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground"
        >
          Probar la demo
        </Link>
      </section>

      <section className="border-t border-border bg-card">
        <div className="mx-auto grid max-w-[1200px] gap-8 px-6 py-16 md:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-lg border border-border bg-background p-6"
            >
              <h2 className="mb-2 text-lg font-medium">{feature.title}</h2>
              <p className="text-sm text-muted-foreground">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto max-w-[1200px] px-6 py-12 text-center text-sm text-muted-foreground">
          Stack: Next.js · Express · Supabase · MCP · Gemini · Docker ·
          Terraform
        </div>
      </section>
    </main>
  );
}
