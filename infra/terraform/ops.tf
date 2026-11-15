# Alertas operativas. El email vive en terraform.tfvars, no en el repositorio.

resource "google_monitoring_notification_channel" "alert_email" {
  project      = var.project_id
  display_name = "PropTech alertas (email)"
  type         = "email"

  labels = {
    email_address = var.alert_email
  }
}

# Un mensaje en la DLQ significa que un análisis agotó sus entregas y requiere revisión.
resource "google_monitoring_alert_policy" "analysis_dlq" {
  project      = var.project_id
  display_name = "PropTech: mensaje en analysis-jobs-dlq"
  combiner     = "OR"

  conditions {
    display_name = "Mensajes publicados en la DLQ"

    condition_threshold {
      filter          = "metric.type=\"pubsub.googleapis.com/topic/send_message_operation_count\" AND resource.type=\"pubsub_topic\" AND resource.labels.topic_id=\"analysis-jobs-dlq\""
      comparison      = "COMPARISON_GT"
      threshold_value = 0
      duration        = "0s"

      # La métrica solo tiene datos cuando hay un mensaje en la DLQ. Los datos ausentes cuentan
      # como "sin problema", así el incidente se cierra y el siguiente mensaje avisa otra vez.
      evaluation_missing_data = "EVALUATION_MISSING_DATA_INACTIVE"

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_SUM"
      }
    }
  }

  # Red de seguridad: un incidente sin datos nuevos se cierra solo a los 30 minutos.
  alert_strategy {
    auto_close = "1800s"
  }

  notification_channels = [google_monitoring_notification_channel.alert_email.id]

  depends_on = [google_pubsub_topic.analysis_jobs_dlq]
}
