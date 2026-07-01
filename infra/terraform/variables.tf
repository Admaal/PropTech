variable "project_id" {
  type        = string
  description = "ID del proyecto GCP"
}

variable "region" {
  type        = string
  default     = "europe-west1"
  description = "Región de Cloud Run"
}

variable "server_image" {
  type        = string
  description = "Imagen Docker del server (Artifact Registry)"
}

variable "mcp_ai_image" {
  type        = string
  description = "Imagen Docker de mcp-ai (Artifact Registry)"
}

variable "cors_origin" {
  type        = string
  description = "Origen permitido para CORS (URL del frontend)"
}

variable "daily_analysis_quota" {
  type        = number
  default     = 3
  description = "Máximo de análisis IA por organización y día (0 = sin límite)"
}

variable "rate_limit_max" {
  type        = number
  default     = 100
  description = "Peticiones máximas por IP en la ventana de rate limit"
}

variable "upload_rate_limit_max" {
  type        = number
  default     = 5
  description = "Subidas PDF máximas por usuario y hora"
}
