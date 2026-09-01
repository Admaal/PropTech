# Despliegue en GCP Cloud Run

Infraestructura mínima para portfolio: **server** (público) + **mcp-ai** (URL pública, invocación restringida por IAM).

## Prerrequisitos

- Proyecto GCP con billing habilitado
- [Terraform](https://www.terraform.io/) >= 1.5
- Imágenes Docker en Artifact Registry

## 1. Primer despliegue: construir y subir imágenes

```bash
# Desde la raíz del monorepo
export PROJECT_ID=tu-proyecto-gcp
export REGION=europe-west1

gcloud auth configure-docker ${REGION}-docker.pkg.dev

docker build -f apps/server/Dockerfile -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/proptech/server:latest .
docker build -f services/mcp-ai/Dockerfile -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/proptech/mcp-ai:latest .

docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/proptech/server:latest
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/proptech/mcp-ai:latest
```

### Medición de tamaño

El stage final usa `pnpm deploy --prod --legacy`, por lo que solo contiene la
aplicación desplegada y sus dependencias de producción. Medición local del tamaño
descomprimido (`docker image inspect .Size`) realizada el 2026-09-01:

- `server`: 138.575.145 bytes antes → 60.859.081 bytes después; reducción de
  77.716.064 bytes (56,1 %).
- `mcp-ai`: 140.652.228 bytes antes → 62.464.532 bytes después; reducción de
  78.187.696 bytes (55,6 %).

Las imágenes `proptech-*:optimized` son locales y no se publican automáticamente.
Para desplegarlas, etiqueta esas imágenes con las rutas de Artifact Registry y
ejecuta los `docker push` anteriores.

Estas etiquetas `latest` se utilizan para crear o recuperar los servicios durante
el primer `terraform apply`. Después, los despliegues de aplicación usan etiquetas
inmutables por commit mediante Cloud Build.

## 2. Crear secretos en Secret Manager

Tras el primer `terraform apply` (crea los secretos vacíos), añade las versiones:

```bash
echo -n "https://xxx.supabase.co" | gcloud secrets versions add proptech-supabase-url --data-file=-
echo -n "eyJ..." | gcloud secrets versions add proptech-supabase-anon-key --data-file=-
echo -n "eyJ..." | gcloud secrets versions add proptech-supabase-service-role-key --data-file=-
echo -n "AIza..." | gcloud secrets versions add proptech-gemini-api-key --data-file=-
openssl rand -hex 32 | gcloud secrets versions add proptech-internal-service-key --data-file=-
```

## 3. Terraform

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
# Edita terraform.tfvars

terraform init
terraform plan
terraform apply
```

## 4. Despliegues automáticos posteriores

Terraform crea el trigger `proptech-deploy-main`, la identidad dedicada
`proptech-cloud-build` y sus permisos mínimos. Tras publicar los cambios en GitHub,
un push a `main` ejecuta [`cloudbuild.yaml`](../../cloudbuild.yaml), que:

1. construye `server` y `mcp-ai`;
2. publica ambas imágenes con la etiqueta del commit en Artifact Registry;
3. actualiza `proptech-mcp-ai` y después `proptech-server` en Cloud Run.

Los pull requests y las ramas distintas de `main` no disparan este despliegue.
GitHub Actions mantiene la validación de lint, tipos y tests. Para cambios de
Terraform, topología, secretos o variables de producción se debe ejecutar el
flujo manual de `terraform plan` y `terraform apply`.

Terraform ignora únicamente los cambios de imagen y los metadatos `client` de
Cloud Run para no sobrescribir un despliegue de Cloud Build en la siguiente
aplicación de infraestructura.

## 5. Frontend

El frontend (Next.js) se despliega en **Vercel** apuntando a la URL de Cloud Run del server.

Variables en Vercel:

- `NEXT_PUBLIC_API_URL` — output `server_url`
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Guía GCP: [docs/gcp-setup.md](../../docs/gcp-setup.md)  
Guía completa: [docs/demo-deploy.md](../../docs/demo-deploy.md)

## Variables de rate limit y cuota (server)

En `terraform.tfvars`:

```hcl
daily_analysis_quota  = 3
rate_limit_max        = 100
upload_rate_limit_max = 5
```

## Notas

- mcp-ai usa `INGRESS_TRAFFIC_ALL` con **IAM `run.invoker`** restringido a la service account de Compute (solo el server puede invocarlo). El server envía además `X-Internal-Key` e ID token de Cloud Run.
- Para demo local usa `docker compose up --build` (ver README raíz). En local el puerto 3002 está expuesto: usa `INTERNAL_SERVICE_KEY` fuerte.
- **`cpu_idle = true`** en Terraform (request-based billing): Cloud Run solo factura CPU durante peticiones. Sin esto, el coste puede multiplicarse.
- **Scale-to-zero** (`min_instance_count = 0`): la demo se despierta sola; la primera visita puede tardar ~15 s (UX en `/login`).

## Modo A — Portfolio activo (recomendado)

Demo online para reclutadores con coste bajo:

| Concepto | Coste/mes aprox. |
|----------|------------------|
| Secret Manager (6 secretos) | ~0,35 € |
| Artifact Registry | ~0,05 € |
| Cloud Run (poco tráfico) | ~0–0,50 € |
| **Total GCP** | **~0,40–1 €** |

Mantén los servicios desplegados (`terraform apply`). No hace falta `destroy` rutinario.

**Presupuesto GCP (Terraform):** `google_billing_budget.project` mantiene un
presupuesto de **1 €/mes** para este proyecto, con alertas al 50 % y 100 %.
Este presupuesto avisa, pero no corta automáticamente el consumo.

## Modo B — Pausa larga (~0 €/mes)

Solo si no necesitas la demo durante semanas:

```powershell
cd infra/terraform
terraform destroy
```

Para reactivar: `terraform apply` y repoblar secretos (ver sección 2).

Con Modo B la demo no se auto-despierta; un visitante verá "demo no disponible" hasta que vuelvas a aplicar Terraform.
