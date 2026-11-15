# Tope diario de peticiones a Gemini por modelo y por tier. Los identificadores de cuota
# salen de Cloud Quotas (quotaInfos de generativelanguage.googleapis.com). Solo baja
# límites: la preferencia nunca los aumenta por encima del valor por defecto.

resource "google_project_service" "cloud_quotas" {
  project            = var.project_id
  service            = "cloudquotas.googleapis.com"
  disable_on_destroy = false
}

locals {
  # Pares verificados en Cloud Quotas. El free tier de gemini-2.5-flash-lite queda fuera:
  # su límite por defecto ya es 20/día y 150 sería un aumento.
  gemini_quota_pairs = [
    { quota_id = "GenerateRequestsPerDayPerProjectPerModel-FreeTier", model = "gemini-3.1-flash-lite" },
    { quota_id = "GenerateRequestsPerDayPerProjectPerModel-FreeTier", model = "gemini-3-flash-preview" },
    { quota_id = "GenerateRequestsPerDayPerProjectPerModel-PaidTier2", model = "gemini-3.1-flash-lite" },
    { quota_id = "GenerateRequestsPerDayPerProjectPerModel-PaidTier2", model = "gemini-3-flash-preview" },
    { quota_id = "GenerateRequestsPerDayPerProjectPerModel-PaidTier2", model = "gemini-2.5-flash-lite" },
  ]
}

resource "google_cloud_quotas_quota_preference" "gemini_daily_cap" {
  for_each = {
    for pair in local.gemini_quota_pairs : "${pair.quota_id}|${pair.model}" => pair
  }
  parent        = "projects/${var.project_id}"
  service       = "generativelanguage.googleapis.com"
  quota_id      = each.value.quota_id
  dimensions    = { model = each.value.model }
  justification = "Tope diario de seguridad del presupuesto del portfolio"

  # Recorte grande a propósito (de cientos de miles a 150). Solo se ignora la
  # comprobación porcentual; la de "por debajo del uso actual" sigue activa.
  ignore_safety_checks = "QUOTA_DECREASE_PERCENTAGE_TOO_HIGH"

  quota_config {
    preferred_value = var.gemini_daily_request_cap
  }

  depends_on = [google_project_service.cloud_quotas]
}
