# Carga secretos desde .env a Secret Manager (sin imprimir valores)
param(
  [string]$ProjectId = $env:GCP_PROJECT_ID,
  [string]$ServerRuntimeServiceAccountId = "proptech-server-runtime",
  [string]$McpAiRuntimeServiceAccountId = "proptech-mcp-ai-runtime"
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
  $value = $envVars[$key]
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($value)
  $tempFile = Join-Path $env:TEMP "proptech-secret-$secret.txt"
  try {
    [System.IO.File]::WriteAllBytes($tempFile, $bytes)
    gcloud secrets versions add $secret --data-file=$tempFile --project=$ProjectId | Out-Null
  }
  finally {
    Remove-Item $tempFile -Force -ErrorAction SilentlyContinue
  }
}

$serverRuntime = "${ServerRuntimeServiceAccountId}@${ProjectId}.iam.gserviceaccount.com"
$mcpAiRuntime = "${McpAiRuntimeServiceAccountId}@${ProjectId}.iam.gserviceaccount.com"
$secretAccess = @{
  $serverRuntime = @(
    "proptech-supabase-url",
    "proptech-supabase-anon-key",
    "proptech-internal-service-key"
  )
  $mcpAiRuntime = @(
    "proptech-supabase-url",
    "proptech-supabase-service-role-key",
    "proptech-gemini-api-key",
    "proptech-internal-service-key"
  )
}

foreach ($entry in $secretAccess.GetEnumerator()) {
  foreach ($secret in $entry.Value) {
    Write-Host "IAM accessor: $secret"
    gcloud secrets add-iam-policy-binding $secret `
    --member="serviceAccount:$($entry.Key)" `
    --role="roles/secretmanager.secretAccessor" `
    --project=$ProjectId `
    --quiet | Out-Null
  }
}

Write-Host "Secretos listos."
