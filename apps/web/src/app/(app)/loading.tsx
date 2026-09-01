export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Cargando página">
      <span className="sr-only">Cargando página…</span>
      <div className="mb-8 space-y-3">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-muted" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="h-72 animate-pulse rounded-lg border border-border bg-card" />
        <div className="h-72 animate-pulse rounded-lg border border-border bg-card" />
      </div>
    </div>
  );
}
