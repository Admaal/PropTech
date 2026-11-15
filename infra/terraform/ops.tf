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

  # Comprobado en producción: el incidente se abre al llegar un mensaje a la DLQ y se cierra solo
  # (~1 min) al terminar la ventana, por lo que un mensaje posterior debería avisar de nuevo. No hace falta
  # alert_strategy. evaluation_missing_data tampoco: exige duración distinta de cero y la API lo
  # rechaza con duration = "0s".
  notification_channels = [google_monitoring_notification_channel.alert_email.id]

  depends_on = [google_pubsub_topic.analysis_jobs_dlq]
}
