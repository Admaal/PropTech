# Bootstrap GCP — PropTech
# Ejecutar en PowerShell tras instalar Google Cloud SDK.
# Requiere: $env:GCP_PROJECT_ID o parámetro -ProjectId

param(
  [string]$ProjectId = $env:GCP_PROJECT_ID
)

$ErrorActionPreference = "Stop"

if (-not $ProjectId) {
  Write-Host "Define GCP_PROJECT_ID o pasa -ProjectId tu-proyecto-gcp"
  exit 1
}

$REGION = "europe-west1"
$REPO = "proptech"

if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
  Write-Host @"

gcloud no está instalado. Instálalo desde:
  https://cloud.google.com/sdk/docs/install

Luego reinicia PowerShell y vuelve a ejecutar este script.
"@
  exit 1
}

Write-Host "Configurando proyecto $ProjectId..."
gcloud config set project $ProjectId
gcloud auth login
gcloud auth application-default login

Write-Host "Habilitando APIs necesarias..."
$apis = @(
  "run.googleapis.com",
  "artifactregistry.googleapis.com",
  "secretmanager.googleapis.com",
  "cloudbuild.googleapis.com",
  "iam.googleapis.com"
)
foreach ($api in $apis) {
  gcloud services enable $api --project=$ProjectId
}

Write-Host "Creando repositorio Artifact Registry (si no existe)..."
gcloud artifacts repositories describe $REPO `
  --location=$REGION `
  --project=$ProjectId 2>$null
if ($LASTEXITCODE -ne 0) {
  gcloud artifacts repositories create $REPO `
    --repository-format=docker `
    --location=$REGION `
    --description="PropTech portfolio images" `
    --project=$ProjectId
}

Write-Host "Configurando Docker para Artifact Registry..."
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

Write-Host @"

Listo. Siguiente paso — build y push de imágenes (desde la raíz del repo):

  `$PROJECT_ID = "$ProjectId"
  `$REGION = "$REGION"
  docker build -f apps/server/Dockerfile -t `${REGION}-docker.pkg.dev/`${PROJECT_ID}/${REPO}/server:latest .
  docker build -f services/mcp-ai/Dockerfile -t `${REGION}-docker.pkg.dev/`${PROJECT_ID}/${REPO}/mcp-ai:latest .
  docker push `${REGION}-docker.pkg.dev/`${PROJECT_ID}/${REPO}/server:latest
  docker push `${REGION}-docker.pkg.dev/`${PROJECT_ID}/${REPO}/mcp-ai:latest

Luego Terraform (requiere terraform instalado):

  cd infra/terraform
  cp terraform.tfvars.example terraform.tfvars
  terraform init
  terraform apply

Ver docs/gcp-setup.md para secretos y presupuesto.
"@
