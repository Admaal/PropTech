# Conectar y desplegar en GCP

Guía genérica para desplegar el backend en **Cloud Run** con tu propio proyecto GCP.

| Campo | Valor |
|-------|-------|
| **Project ID** | Tu proyecto (ej. `mi-proyecto-gcp`) |
| **Región recomendada** | `europe-west1` |

## Paso 0 — Instalar herramientas (Windows)

1. **Google Cloud SDK** (incluye `gcloud`):
   https://cloud.google.com/sdk/docs/install

2. **Docker Desktop**:
   https://www.docker.com/products/docker-desktop/

3. **Terraform**:
   https://developer.hashicorp.com/terraform/install

Reinicia PowerShell tras instalar.

Comprueba:

```powershell
gcloud --version
docker --version
terraform version
```

---

## Paso 1 — Autenticación y bootstrap

Define tu proyecto y ejecuta desde la raíz del repo:

```powershell
$env:GCP_PROJECT_ID = "tu-proyecto-gcp"
.\scripts\gcp-bootstrap.ps1
```

Esto hace:

- `gcloud config set project` con tu project ID
- Login interactivo (`gcloud auth login`)
- Habilita APIs: Cloud Run, Artifact Registry, Secret Manager…
- Crea el repo Docker `proptech` en `europe-west1`

---

## Paso 2 — Build y push inicial de imágenes

Con Docker en marcha, desde la raíz:

```powershell
$PROJECT_ID = "tu-proyecto-gcp"
$REGION = "europe-west1"

docker build -f apps/server/Dockerfile -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/proptech/server:latest .
docker build -f services/mcp-ai/Dockerfile -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/proptech/mcp-ai:latest .

docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/proptech/server:latest
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/proptech/mcp-ai:latest
```

Este paso manual solo es necesario para crear o recuperar los servicios por
primera vez. Los despliegues posteriores se hacen automáticamente con Cloud Build
usando una etiqueta inmutable derivada del commit.

---

## Paso 3 — Secretos en Secret Manager

Primero `terraform apply` crea los secretos vacíos. Luego añade valores desde tu `.env` local (no los subas a Git):

```bash
# Bash/WSL. En PowerShell usa .\scripts\push-gcp-secrets.ps1.
# Sustituye los valores por los de tu .env sin imprimirlos en CI.
echo -n "TU_SUPABASE_URL" | gcloud secrets versions add proptech-supabase-url --data-file=-
echo -n "TU_ANON_KEY" | gcloud secrets versions add proptech-supabase-anon-key --data-file=-
echo -n "TU_SERVICE_ROLE_KEY" | gcloud secrets versions add proptech-supabase-service-role-key --data-file=-
echo -n "TU_GEMINI_KEY" | gcloud secrets versions add proptech-gemini-api-key --data-file=-

# Clave interna server ↔ mcp (genera una nueva para producción)
openssl rand -hex 32 | gcloud secrets versions add proptech-internal-service-key --data-file=-
```

Guarda el `INTERNAL_SERVICE_KEY` generado: debe coincidir en server y mcp-ai.

Alternativa: `.\scripts\push-gcp-secrets.ps1` (lee `.env` local; requiere `GCP_PROJECT_ID`).

Terraform concede acceso a secretos mediante cuentas runtime separadas: el API no
recibe `SUPABASE_SERVICE_ROLE_KEY` ni `GEMINI_API_KEY`, y mcp-ai no recibe la
clave anon del navegador. Retira cualquier permiso antiguo de la cuenta Compute
predeterminada antes de publicar.

---

## Paso 4 — Terraform

El estado de Terraform vive en un bucket de GCS (ver [ADR-009](adr/009-estado-remoto-terraform-gcs.md)).
Antes del primer `terraform init`, crea el bucket (privado y con versionado) y pon su
nombre en el bloque `backend "gcs"` de `infra/terraform/main.tf`:

```bash
gcloud storage buckets create gs://TU-PROYECTO-tfstate --project=TU-PROYECTO \
  --location=europe-west1 --uniform-bucket-level-access --public-access-prevention
gcloud storage buckets update gs://TU-PROYECTO-tfstate --versioning
```

Copia y edita las variables (el archivo real no va al repo):

```powershell
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
# Edita project_id, imágenes, cors_origin, billing_account_id y alert_email

terraform init
terraform plan
terraform apply
```

`alert_email` es obligatorio: recibe la alerta de Cloud Monitoring cuando un análisis
llega a la cola de mensajes fallidos (DLQ). Solo va en `terraform.tfvars`, nunca en el repo.
Terraform habilita las APIs de Pub/Sub y Cloud Quotas por sí mismo.

Anota el output `server_url` — lo necesitarás para Vercel (`NEXT_PUBLIC_API_URL`).

Tras el primer `apply`, copia la URL real de `mcp-ai` en la variable `mcp_ai_url`
(`terraform.tfvars`) y vuelve a aplicar: la suscripción de Pub/Sub y la validación
OIDC de mcp-ai usan esa URL como audiencia, y su valor por defecto corresponde a otro proyecto.

Para ejecutar Terraform desde tu máquina usa `gcloud auth application-default login`, o
exporta `GOOGLE_OAUTH_ACCESS_TOKEN=$(gcloud auth print-access-token)` para un comando suelto.

Antes del deploy final, actualiza `cors_origin` en `terraform.tfvars` con tu URL de Vercel y vuelve a `terraform apply`.

Este `terraform apply` también crea el trigger `proptech-deploy-main`, la cuenta
`proptech-cloud-build` y sus permisos mínimos. El trigger escucha únicamente
pushes a `main`: construye y publica `server` y `mcp-ai` y actualiza los servicios
existentes de Cloud Run. No aplica Terraform ni ejecuta despliegues desde pull
requests.

Después del primer despliegue, para cambios de aplicación basta con hacer push a
`main`. Los cambios de infraestructura, secretos, variables de producción o
topología siguen requiriendo `terraform plan` y `terraform apply` manuales.

---

## Paso 5 — Presupuesto y alertas

1. Terraform crea un presupuesto de **1 €/mes** para este proyecto, con alertas al
   50 % y 100 %. El presupuesto avisa, pero no corta automáticamente el consumo.
2. Terraform fija un **tope diario de peticiones a Gemini** por modelo y tier
   (`gemini_daily_request_cap`, 150 por defecto) con preferencias de Cloud Quotas. Google
   rechaza las peticiones que superen el tope, así que ese es el límite que sí corta el gasto
   (ver [ADR-010](adr/010-tope-diario-gemini-cloud-quotas.md)).
3. Terraform crea una alerta por email cuando llega un mensaje a `analysis-jobs-dlq`.

---

## Paso 6 — GitHub → Vercel (después del backend)

1. Sube el repo a GitHub
2. Importa en Vercel, root `apps/web`
3. Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_API_URL` = URL Cloud Run del paso 4
   - `DEMO_USER_PASSWORD` = contraseña de las cuentas demo (solo en Vercel, sin prefijo `NEXT_PUBLIC_`)
4. Supabase Auth → Site URL y Redirect URLs con tu dominio Vercel

Guía completa: [demo-deploy.md](demo-deploy.md)

---

## Solución de problemas

| Error | Qué hacer |
|-------|-----------|
| `gcloud` no reconocido | Instala Cloud SDK y reinicia terminal |
| `docker` no reconocido | Instala Docker Desktop |
| Billing not enabled | Activa facturación en el proyecto GCP |
| 403 al push de imagen | Ejecuta `gcloud auth configure-docker europe-west1-docker.pkg.dev` |
| `terraform init` no encuentra el bucket | Crea el bucket de estado (Paso 4) y revisa el nombre en `backend "gcs"` |
| 403 "requires a quota project" en `terraform plan` | El provider debe llevar `user_project_override` y `billing_project` (ya configurados en `main.tf`) |
| El push de Pub/Sub responde 401 | Revisa que `mcp_ai_url` coincide con la URL real de mcp-ai y que `PUBSUB_PUSH_AUDIENCE` es `<mcp_ai_url>/pubsub/analyze` |
| CORS en el navegador | `cors_origin` en terraform debe ser la URL exacta de Vercel |
