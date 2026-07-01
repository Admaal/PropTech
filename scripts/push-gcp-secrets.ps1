# Carga secretos desde .env a Secret Manager (sin imprimir valores)
param(
  [string]$ProjectId = $env:GCP_PROJECT_ID
)

$ErrorActionPreference = "Stop"

if (-not $ProjectId) {
  throw "Define GCP_PROJECT_ID o pasa -ProjectId"
}

$EnvFile = Join-Path (Split-Path $PSScriptRoot -Parent) ".env"

$map = @{
  "proptech-supabase-url"              = "SUPABASE_URL"
  "proptech-supabase-anon-key"         = "SUPABASE_ANON_KEY"
  "proptech-supabase-service-role-key" = "SUPABASE_SERVICE_ROLE_KEY"
  "proptech-gemini-api-key"            = "GEMINI_API_KEY"
  "proptech-internal-service-key"      = "INTERNAL_SERVICE_KEY"
}

$envVars = @{}
Get-Content $EnvFile | ForEach-Object {
  if ($_ -match '^\s*([^#=]+)=(.*)$') {
    $envVars[$matches[1].Trim()] = $matches[2].Trim()
  }
}

foreach ($secret in $map.Keys) {
  $key = $map[$secret]
  if (-not $envVars.ContainsKey($key)) {
    throw "Falta $key en .env"
  }
  Write-Host "Subiendo $secret..."
  $envVars[$key] | gcloud secrets versions add $secret --data-file=- --project=$ProjectId | Out-Null
}

$projectNumber = gcloud projects describe $ProjectId --format="value(projectNumber)"
$sa = "${projectNumber}-compute@developer.gserviceaccount.com"
foreach ($secret in $map.Keys) {
  Write-Host "IAM accessor: $secret"
  gcloud secrets add-iam-policy-binding $secret `
    --member="serviceAccount:$sa" `
    --role="roles/secretmanager.secretAccessor" `
    --project=$ProjectId `
    --quiet | Out-Null
}

Write-Host "Secretos listos."
