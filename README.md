# PropTech — Plataforma SaaS de Inteligencia Inmobiliaria

Monorepo con frontend Next.js, API Express, Supabase (PostgreSQL + RLS + Auth) y servidor MCP para análisis de documentos con IA.

**Demo en vivo:** [https://proptech-web-kappa.vercel.app](https://proptech-web-kappa.vercel.app)

## Capturas

| Dashboard + mapa | Ficha con fotos e IA | Análisis PDF |
|------------------|----------------------|--------------|
| ![Dashboard con mapa y filtros](docs/screenshots/dashboard-mapa.png) | ![Ficha de propiedad](docs/screenshots/propiedad-analisis.png) | ![Resultado del análisis](docs/screenshots/upload-pdf.png) |

## Stack

| Capa | Tecnología |
|------|------------|
| Frontend | Next.js 16, TypeScript, Tailwind CSS, Leaflet |
| API | Express + Zod + rate limiting |
| Base de datos | Supabase PostgreSQL + RLS + PostGIS |
| IA | MCP + Google Gemini (async) |
| Infra | Docker Compose, Terraform, Cloud Run + Vercel |

## Estructura

```
apps/web          → Frontend (mapa, dashboard, análisis)
apps/server       → API REST (Express)
services/mcp-ai   → Análisis IA con Gemini
packages/shared   → Schemas Zod compartidos
supabase/         → Migraciones SQL y seed
infra/terraform/  → Cloud Run (GCP)
docs/             → Guías de despliegue
```

## Requisitos previos

- Node.js 20+
- pnpm 9+
- Cuenta [Supabase](https://supabase.com)
- Docker (opcional, para compose)

## Configuración

1. Clona el repositorio e instala dependencias:

```bash
pnpm install
```

2. Configura `.env` en la raíz (copia desde `.env.example`) y `apps/web/.env.local` (copia desde `apps/web/.env.example`). Next.js solo lee variables `NEXT_PUBLIC_*` desde `apps/web/`.

3. Compila el paquete compartido:

```bash
pnpm --filter @proptech/shared build
```

## Desarrollo local

```bash
pnpm dev
```

- Frontend: http://localhost:3000
- Server: http://localhost:3001/health
- MCP-AI: http://localhost:3002/health

### Local vs producción

| Variable | Desarrollo local | Producción (Cloud Run) |
|----------|------------------|------------------------|
| `DAILY_ANALYSIS_QUOTA` | `0` (sin límite) | `3` |
| Registro | Eliminado de la UI | Deshabilitado en Supabase |

### Variables obligatorias

- `SUPABASE_URL`, `SUPABASE_ANON_KEY` (API server y web)
- `SUPABASE_SERVICE_ROLE_KEY` (solo mcp-ai, nunca en el browser)
- `GEMINI_API_KEY` — [Google AI Studio](https://aistudio.google.com/apikey)
- `INTERNAL_SERVICE_KEY` — clave compartida server ↔ mcp-ai

Modelos Gemini vigentes: consulta [Google AI Studio](https://aistudio.google.com/) o define `GEMINI_MODEL` en `.env`.

## Demo pública

### Cuentas de prueba

| Usuario | Organización | Propiedades |
|---------|--------------|-------------|
| `demo-a@test.com` | Inmobiliaria Centro | 12 |
| `demo-b@test.com` | Gestión Norte | 8 |

La contraseña demo se configura en el **servidor** (`DEMO_USER_PASSWORD` en Vercel o `.env.local` de web) y **no debe subirse al repositorio** ni exponerse con `NEXT_PUBLIC_*`.

El login muestra botones de acceso rápido para Demo A y Demo B. El registro no está disponible (Supabase sign-ups deshabilitado).

### Límites de protección

| Protección | Límite |
|------------|--------|
| Registro de usuarios | Deshabilitado en Supabase |
| Análisis IA | 3 por organización y día |
| Subidas PDF | 5 por usuario y hora |
| Platform admin | Sin cuota ni límite de subidas |
| API global | 100 peticiones / 15 min por IP |
| Archivos | Solo PDF válido (`%PDF-`), máx. 10 MB |

### Checklist antes de publicar

1. Supabase Auth → desactivar sign ups
2. Google AI Studio → alerta y tope de presupuesto (~10 €/mes)
3. GCP Billing → alerta de presupuesto en el proyecto
4. `DAILY_ANALYSIS_QUOTA=3` en Cloud Run (Terraform)

Guía GCP: **[docs/gcp-setup.md](docs/gcp-setup.md)**  
Guía deploy completa: **[docs/demo-deploy.md](docs/demo-deploy.md)**

## Docker Compose

```bash
docker compose up --build
```

Levanta server (`:3001`), mcp-ai (`:3002`) y web (`:3000`). Requiere `.env` configurado.

## Tests

```bash
pnpm --filter @proptech/shared test   # schemas Zod
pnpm --filter @proptech/mcp-ai test   # validación respuesta Gemini
pnpm --filter @proptech/server test   # PDF/cuotas + RLS cross-org
pnpm test:e2e                         # smoke + upload mockeado (sin cuota ni IA)
pnpm test:e2e:full                    # admin + upload real + IA (manual o workflow semanal)
```

Incluye aislamiento RLS entre `demo-a` y `demo-b`, validación de PDF/cuotas, schemas compartidos, parsing de salida Gemini y E2E Playwright en dos capas:

| Comando | Qué valida | Cuándo |
|---------|------------|--------|
| `pnpm test:e2e` | Login, dashboard, ficha, flujo UI de upload **mockeado** | CI en push a `main` y PRs del repo |
| `pnpm test:e2e:full` | Upload real + análisis IA completo (cuenta admin) | Manual o workflow semanal |

Variables E2E: `DEMO_USER_PASSWORD` (CI), `E2E_BASE_URL` (opcional), `PLATFORM_ADMIN_PASSWORD` (full-stack).

## CI

GitHub Actions (`.github/workflows/ci.yml`): build, typecheck, lint, tests unitarios y RLS en cada push/PR.

E2E smoke + upload mockeado en push a `main` y en **pull requests del mismo repositorio** (sin consumir cuota demo ni Gemini).

Full-stack con IA real: workflow manual/semanal `.github/workflows/e2e-full-stack.yml` (requiere secret `PLATFORM_ADMIN_PASSWORD`).

Para tests RLS en CI, configura en GitHub **Settings → Secrets and variables → Actions**:

| Secret / variable | Uso |
|-------------------|-----|
| `SUPABASE_URL` o variable `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_ANON_KEY` o variable `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key (pública; puede ser variable) |
| `DEMO_USER_PASSWORD` | Login demo-a / demo-b en tests RLS y E2E |

Si no configuras ninguno, los tests RLS se omiten y el resto del CI sigue pasando. Si configuras solo algunos, el CI falla con un mensaje claro.

## Seguridad

Ver [SECURITY.md](SECURITY.md) para reportar vulnerabilidades y buenas prácticas antes de desplegar o hacer pública la repo.

## Despliegue

- **GCP:** [docs/gcp-setup.md](docs/gcp-setup.md)
- **Backend:** Cloud Run — [infra/terraform/README.md](infra/terraform/README.md)
- **Frontend:** Vercel — [docs/demo-deploy.md](docs/demo-deploy.md)

Script usuarios demo: crear cuentas `demo-a@test.com` / `demo-b@test.com` en Supabase Auth con la misma contraseña que `DEMO_USER_PASSWORD` y ejecutar el seed SQL.

## Funcionalidades MVP

- Auth Supabase + multi-tenancy (RLS)
- Dashboard con filtros y **mapa Leaflet** (filtro por zona visible)
- Fichas con fotos (carrusel), descripción y evaluación IA
- Detalle de propiedad + upload PDF
- Análisis IA async (Gemini) con polling
- Historial de análisis + enlace desde listado global
- Panel **platform admin** cross-org
- Modo oscuro según preferencia del sistema
- Modo demo con rate limits y cuotas

## Documentación

- [Arquitectura](docs/architecture.md)
- [Despliegue GCP](docs/gcp-setup.md)
- [Despliegue demo (Vercel)](docs/demo-deploy.md)
- [Requisitos](docs/requirements.md)
- [AGENTS.md](AGENTS.md)
- [DESIGN.md](DESIGN.md)

## Licencia

Proyecto de portfolio — uso educativo.
