# Tope diario de peticiones a Gemini por modelo y por tier. Los identificadores de cuota
# salen de Cloud Quotas (quotaInfos de generativelanguage.googleapis.com). Solo baja
# límites: la preferencia nunca los aumenta por encima del valor por defecto.

resource "google_project_service" "cloud_quotas" {
  project            = var.project_id
  service            = "cloudquotas.googleapis.com"
  disable_on_destroy = false
}

locals {
  gemini_quota_ids = [
    "GenerateRequestsPerDayPerProjectPerModel-FreeTier",
    "GenerateRequestsPerDayPerProjectPerModel-PaidTier2",
    "GenerateRequestsPerDayPerProjectPerModel-PaidTier3",
  ]
  gemini_quota_models = [
    "gemini-3.1-flash-lite",
    "gemini-3-flash-preview",
    "gemini-2.5-flash-lite",
  ]
}

resource "google_cloud_quotas_quota_preference" "gemini_daily_cap" {
  for_each = {
    for pair in setproduct(local.gemini_quota_ids, local.gemini_quota_models) :
    "${pair[0]}|${pair[1]}" => { quota_id = pair[0], model = pair[1] }
  }
  parent        = "projects/${var.project_id}"
  service       = "generativelanguage.googleapis.com"
  quota_id      = each.value.quota_id
  dimensions    = { model = each.value.model }
  justification = "Tope diario de seguridad del presupuesto del portfolio"

  quota_config {
    preferred_value = var.gemini_daily_request_cap
  }

  depends_on = [google_project_service.cloud_quotas]
}
