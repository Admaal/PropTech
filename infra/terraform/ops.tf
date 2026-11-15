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

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_SUM"
      }
    }
  }

  # La métrica solo tiene datos cuando hay un mensaje en la DLQ, así que el incidente no se cerraría
  # solo (por defecto, a los 7 días) y un mensaje nuevo no avisaría. Se cierra a los 30 minutos sin
  # datos nuevos. No se usa evaluation_missing_data: exige una duración distinta de cero y la API
  # rechaza el cambio con duration = "0s".
  alert_strategy {
    auto_close = "1800s"
  }

  notification_channels = [google_monitoring_notification_channel.alert_email.id]

  depends_on = [google_pubsub_topic.analysis_jobs_dlq]
}
