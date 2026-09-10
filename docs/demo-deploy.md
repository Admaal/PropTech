# Despliegue de la demo pública

Guía para publicar PropTech con **Vercel (frontend)** + **Cloud Run (API + IA)**.

## Arquitectura

- **Vercel** — `apps/web` (gratis en Hobby)
- **Cloud Run** — `apps/server` + `services/mcp-ai` (escala a 0)
- **Supabase** — Auth, DB, Storage

## 1. Preparar Supabase (manual)

En [Supabase Dashboard](https://supabase.com/dashboard) → Authentication → Providers → Email:

1. **Desactivar** "Enable sign ups" (solo login con cuentas demo)
2. Site URL: `https://tu-app.vercel.app`
3. Redirect URLs: `https://tu-app.vercel.app/**` y `https://*.vercel.app/**` (previews)

Crea las cuentas demo con `node scripts/setup-demo-users.mjs` (requiere `.env` local).

## 2. Alertas de coste (manual)

### Google AI Studio

1. [AI Studio](https://aistudio.google.com/apikey) → tu API key → límites
2. Configura alerta (~5 €) y tope mensual (~10 €)

### GCP Billing

1. Billing → Budgets & alerts → crear presupuesto en el proyecto
2. Alerta al 50 % y 90 % del límite mensual

## 3. Backend en Cloud Run

Guía detallada en [gcp-setup.md](gcp-setup.md).

En Windows, primero:

```powershell
$env:GCP_PROJECT_ID = "tu-proyecto-gcp"
.\scripts\gcp-bootstrap.ps1
```

Build y push (PowerShell):

```powershell
$PROJECT_ID = "tu-proyecto-gcp"
$REGION = "europe-west1"

docker build -f apps/server/Dockerfile -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/proptech/server:latest .
docker build -f services/mcp-ai/Dockerfile -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/proptech/mcp-ai:latest .

docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/proptech/server:latest
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/proptech/mcp-ai:latest
```

Terraform (`infra/terraform`):

```powershell
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform apply
```

Anota el output `server_url` (ej. `https://proptech-server-xxxxx.run.app`).

Variables aplicadas por Terraform en el server:

| Variable | Valor demo |
|----------|------------|
| `DAILY_ANALYSIS_QUOTA` | 3 |
| `RATE_LIMIT_MAX` | 100 |
| `UPLOAD_RATE_LIMIT_MAX` | 5 |
| `CORS_ORIGIN` | URL de Vercel |

## 4. Frontend en Vercel

1. Importa el repo en [Vercel](https://vercel.com)
2. **Root Directory:** `apps/web`
3. Variables de entorno:

| Variable | Valor |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key |
| `NEXT_PUBLIC_API_URL` | `server_url` de Cloud Run |
| `NEXT_PUBLIC_SITE_URL` | URL pública base para sitemap (opcional; Vercel la detecta si no se define) |
| `DEMO_USER_PASSWORD` | Contraseña demo (solo servidor Vercel; **no** `NEXT_PUBLIC_*`) |

4. Deploy

Si el build falla por el monorepo, Vercel usará `apps/web/vercel.json` con los comandos de `pnpm` desde la raíz.

## 5. Post-deploy

1. Actualiza `cors_origin` en `terraform.tfvars` con la URL final de Vercel y vuelve a `terraform apply` si cambió el dominio
2. Prueba login con las cuentas demo configuradas en Supabase
3. Sube un PDF de prueba y verifica el análisis IA
4. Verifica que `/register` redirige a `/login`

## Límites activos en demo

| Protección | Límite |
|------------|--------|
| Registro | Deshabilitado (Supabase + UI) |
| Análisis IA | 3/día por organización |
| Subidas PDF | 5/hora por usuario |
| API global | 100 req / 15 min por IP |
| PDF | Solo `%PDF-`, máx. 10 MB, nombre sanitizado |

## Desarrollo local vs producción

| | Local | Demo pública |
|---|-------|--------------|
| `DAILY_ANALYSIS_QUOTA` | `3` | `3` |
| Registro | Ruta eliminada (redirige a login) | Deshabilitado en Supabase |
| Login | Botones demo A / B | Igual |
