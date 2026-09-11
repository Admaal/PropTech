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
  description = "Cuota server-side de análisis IA por organización y día"
  validation {
    condition     = var.daily_analysis_quota == 3
    error_message = "La cuota publicada debe ser exactamente 3; los platform admins quedan exentos."
  }
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

variable "artifact_registry_repository" {
  type        = string
  default     = "proptech"
  description = "Repositorio Docker de Artifact Registry"
}

variable "server_service_name" {
  type        = string
  default     = "proptech-server"
  description = "Nombre del servicio server en Cloud Run"
}

variable "mcp_ai_service_name" {
  type        = string
  default     = "proptech-mcp-ai"
  description = "Nombre del servicio mcp-ai en Cloud Run"
}

variable "cloud_build_service_account_id" {
  type        = string
  default     = "proptech-cloud-build"
  description = "ID de la cuenta de servicio dedicada a Cloud Build"
}

variable "billing_account_id" {
  type        = string
  nullable    = false
  description = "ID de la cuenta de facturación para el presupuesto mensual"
}

variable "github_owner" {
  type        = string
  default     = "Admaal"
  description = "Propietario del repositorio GitHub conectado a Cloud Build"
}

variable "github_repository" {
  type        = string
  default     = "PropTech"
  description = "Nombre del repositorio GitHub conectado a Cloud Build"
}
