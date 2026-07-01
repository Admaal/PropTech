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

## Paso 2 — Build y push de imágenes

Con Docker en marcha, desde la raíz:

```powershell
$PROJECT_ID = "tu-proyecto-gcp"
$REGION = "europe-west1"

docker build -f apps/server/Dockerfile -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/proptech/server:latest .
docker build -f services/mcp-ai/Dockerfile -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/proptech/mcp-ai:latest .

docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/proptech/server:latest
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/proptech/mcp-ai:latest
```

---

## Paso 3 — Secretos en Secret Manager

Primero `terraform apply` crea los secretos vacíos. Luego añade valores desde tu `.env` local (no los subas a Git):

```powershell
# Sustituye los valores por los de tu .env
echo -n "TU_SUPABASE_URL" | gcloud secrets versions add proptech-supabase-url --data-file=-
echo -n "TU_ANON_KEY" | gcloud secrets versions add proptech-supabase-anon-key --data-file=-
echo -n "TU_SERVICE_ROLE_KEY" | gcloud secrets versions add proptech-supabase-service-role-key --data-file=-
echo -n "TU_GEMINI_KEY" | gcloud secrets versions add proptech-gemini-api-key --data-file=-

# Clave interna server ↔ mcp (genera una nueva para producción)
openssl rand -hex 32 | gcloud secrets versions add proptech-internal-service-key --data-file=-
```

Guarda el `INTERNAL_SERVICE_KEY` generado: debe coincidir en server y mcp-ai.

Alternativa: `.\scripts\push-gcp-secrets.ps1` (lee `.env` local; requiere `GCP_PROJECT_ID`).

---

## Paso 4 — Terraform

Copia y edita las variables (el archivo real no va al repo):

```powershell
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
# Edita project_id, imágenes y cors_origin

terraform init
terraform plan
terraform apply
```

Anota el output `server_url` — lo necesitarás para Vercel (`NEXT_PUBLIC_API_URL`).

Antes del deploy final, actualiza `cors_origin` en `terraform.tfvars` con tu URL de Vercel y vuelve a `terraform apply`.

---

## Paso 5 — Presupuesto (recomendado)

1. **GCP Console** → Billing → Budgets → alerta ~10 €/mes
2. **Google AI Studio** → API key → límite y alerta similar

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
| CORS en el navegador | `cors_origin` en terraform debe ser la URL exacta de Vercel |
