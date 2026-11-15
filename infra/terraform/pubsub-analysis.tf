# Transporte de análisis por Pub/Sub (PR 5a, aditivo). Producción sigue con HTTP hasta
# que ANALYSIS_TRANSPORT=pubsub se active en la PR 5b.

resource "google_project_service" "pubsub" {
  project            = var.project_id
  service            = "pubsub.googleapis.com"
  disable_on_destroy = false
}

resource "google_service_account" "analysis_push" {
  project      = var.project_id
  account_id   = "analysis-push"
  display_name = "PropTech: push de Pub/Sub a mcp-ai"
}

resource "google_pubsub_topic" "analysis_jobs" {
  project    = var.project_id
  name       = var.analysis_topic
  depends_on = [google_project_service.pubsub]
}

resource "google_pubsub_topic" "analysis_jobs_dlq" {
  project    = var.project_id
  name       = "analysis-jobs-dlq"
  depends_on = [google_project_service.pubsub]
}

resource "google_pubsub_subscription" "analysis_push" {
  project              = var.project_id
  name                 = "analysis-push"
  topic                = google_pubsub_topic.analysis_jobs.id
  ack_deadline_seconds = 600

  push_config {
    push_endpoint = "${google_cloud_run_v2_service.mcp_ai.uri}/pubsub/analyze"

    oidc_token {
      service_account_email = google_service_account.analysis_push.email
      audience              = "${google_cloud_run_v2_service.mcp_ai.uri}/pubsub/analyze"
    }
  }

  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }

  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.analysis_jobs_dlq.id
    max_delivery_attempts = 5
  }

  depends_on = [google_project_service.pubsub]
}

# La cuenta del server solo puede publicar en este topic, no en el proyecto.
resource "google_pubsub_topic_iam_member" "server_publisher" {
  project = var.project_id
  topic   = google_pubsub_topic.analysis_jobs.name
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${google_service_account.server_runtime.email}"
}

# La cuenta de push solo puede invocar mcp-ai.
resource "google_cloud_run_v2_service_iam_member" "analysis_push_invoker" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.mcp_ai.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.analysis_push.email}"
}

# El agente de servicio de Pub/Sub firma el OIDC con la cuenta de push y gestiona la DLQ.
locals {
  pubsub_service_agent = "serviceAccount:service-${data.google_project.current.number}@gcp-sa-pubsub.iam.gserviceaccount.com"
}

resource "google_service_account_iam_member" "pubsub_token_creator" {
  service_account_id = google_service_account.analysis_push.name
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = local.pubsub_service_agent
}

resource "google_pubsub_subscription_iam_member" "pubsub_dlq_subscriber" {
  project      = var.project_id
  subscription = google_pubsub_subscription.analysis_push.name
  role         = "roles/pubsub.subscriber"
  member       = local.pubsub_service_agent
}

resource "google_pubsub_topic_iam_member" "pubsub_dlq_publisher" {
  project = var.project_id
  topic   = google_pubsub_topic.analysis_jobs_dlq.name
  role    = "roles/pubsub.publisher"
  member  = local.pubsub_service_agent
}
