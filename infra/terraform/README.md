# Despliegue en GCP Cloud Run

Infraestructura mínima para portfolio: **server** (público) + **mcp-ai** (URL pública, invocación restringida por IAM).

## Prerrequisitos

- Proyecto GCP con billing habilitado
- [Terraform](https://www.terraform.io/) >= 1.5
- Imágenes Docker en Artifact Registry

## 1. Construir y subir imágenes

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

## 4. Frontend

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
