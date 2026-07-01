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

  subgraph gcp [GCP Cloud Run]
    Server[apps/server]
    MCP[services/mcp-ai]
  end

  Web -->|REST + JWT| Server
  Web --> Auth
  Server --> PG
  Server --> Storage
  Server -->|HTTP fire-and-forget| MCP
  MCP --> Gemini[Gemini API]
  MCP -->|service_role| PG
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
- RLS: `organization_id IN (SELECT user_organization_ids())`
- La API usa el JWT del usuario → Supabase aplica RLS automáticamente

## Flujo IA (implementado)

1. Usuario sube PDF → server guarda en Storage
2. Server crea `document_analyses` con `status=pending` → responde **202**
3. Server dispara `POST /analyze` a mcp-ai (fire-and-forget)
4. mcp-ai descarga PDF, llama Gemini, valida Zod, actualiza Supabase
5. Frontend hace polling a `GET /analyses/:id` cada 2s

## Mapa (Leaflet)

- Dashboard con mapa OpenStreetMap y marcadores por nivel de riesgo
- Filtro opcional por bounding box (`bbox=minLng,minLat,maxLng,maxLat`)
- PostGIS en BD para índice geográfico; filtro vía lat/lng en API

## Despliegue

- **Local:** `pnpm dev` o `docker compose up`
- **GCP:** Terraform en `infra/terraform/` (Cloud Run server + mcp-ai)
- **CI:** GitHub Actions — build, typecheck, tests RLS

## Decisiones documentadas

Ver `docs/adr/` para decisiones arquitectónicas formales.
