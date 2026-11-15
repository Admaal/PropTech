# Arquitectura — PropTech

## Visión general

Plataforma SaaS multi-tenant para agencias e inversores inmobiliarios. Cada organización ve únicamente sus datos gracias a Row-Level Security en PostgreSQL.

```mermaid
flowchart TB
  subgraph client [Cliente]
    Web[apps/web]
  end

  subgraph supabase [Supabase]
    Auth[Auth JWT]
    PG[(PostgreSQL + RLS)]
    Storage[(Storage)]
  end

  subgraph gcp [GCP Cloud Run y Pub/Sub]
    Server[apps/server]
    Topic[[Pub/Sub analysis-jobs]]
    DLQ[[analysis-jobs-dlq]]
    MCP[services/mcp-ai]
  end

  Web -->|REST + JWT| Server
  Web --> Auth
  Server --> PG
  Server --> Storage
  Server -->|publica AnalyzeJob| Topic
  Topic -->|push OIDC, 5 entregas| MCP
  Topic -.->|tras 5 fallos de infraestructura| DLQ
  MCP --> Gemini[Gemini API]
  MCP -->|service_role + claim/lease| PG
  Web -->|polling| Server
```

## Capas del backend (apps/server)

Arquitectura en capas ligera — no hexagonal completa:

| Capa | Responsabilidad |
|------|-----------------|
| `routes/` | HTTP delgado, parseo, respuestas |
| `services/` | Orquestación de lógica de negocio |
| `repositories/` | Acceso a Supabase |
| `middleware/` | Auth JWT, manejo de errores |

## Multi-tenancy

- Tenant = `organizations`
- Usuarios vinculados vía `organization_members`
- RLS: `organization_id IN (SELECT private.user_organization_ids())`
- La API usa el JWT del usuario → Supabase aplica RLS automáticamente
- `member` conserva lectura e inserción del flujo de upload; las operaciones
  destructivas requieren `private.user_is_org_admin(...)`.

## Flujo IA (implementado)

1. Usuario sube PDF con `Idempotency-Key` → server guarda temporalmente en Storage
2. RPC atómica valida propiedad, cuota e idempotencia y crea metadata + análisis
   `status=pending` → responde **202**; la cuota normal de tres análisis diarios
   se impone en PostgreSQL y no acepta un límite superior enviado por el cliente
3. Server dispara `POST /analyze` a mcp-ai (fire-and-forget)
4. mcp-ai reclama el análisis con un lease; jobs abandonados se recuperan y no se
   procesan concurrentemente
5. mcp-ai descarga PDF, llama Gemini, valida Zod, actualiza Supabase
6. Frontend hace polling a `GET /analyses/:id` cada 2s

## Mapa (Leaflet)

- Dashboard con mapa OpenStreetMap y marcadores por nivel de riesgo
- Filtro opcional por bounding box (`bbox=minLng,minLat,maxLng,maxLat`)
- PostGIS en BD para índice geográfico; filtro vía lat/lng en API

## Despliegue

- **Local:** `pnpm dev` o `docker compose up`
- **GCP:** Terraform en `infra/terraform/` (Cloud Run server + mcp-ai)
- **CI:** GitHub Actions — build, typecheck, tests RLS, contratos de infraestructura
  y auditoría de dependencias

## Decisiones documentadas

Decisiones arquitectónicas formales (contexto, decisión, alternativas y consecuencias):

- [ADR-001](adr/001-async-ai-via-mcp.md): IA asíncrona vía servicio MCP separado
- [ADR-002](adr/002-monorepo-componentes-separables.md): Monorepo con componentes separables
- [ADR-003](adr/003-rls-y-service-role-aislado.md): RLS como frontera de tenancy y service role aislado
- [ADR-004](adr/004-idempotencia-y-cuota-atomica-de-uploads.md): Idempotencia y cuota atómica de uploads
- [ADR-005](adr/005-recuperacion-de-jobs-ia-con-leases.md): Recuperación de jobs IA con claim y leases
- [ADR-006](adr/006-permisos-destructivos-para-admins.md): Operaciones destructivas reservadas a admins
- [ADR-007](adr/007-layered-over-hexagonal.md): Capas ligeras en lugar de hexagonal completa

Resumen con trade-offs en el [README](../README.md#decisiones-y-trade-offs).
