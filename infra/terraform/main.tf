terraform {
  required_version = ">= 1.5"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

resource "google_cloud_run_v2_service" "server" {
  name     = "proptech-server"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    containers {
      image = var.server_image

      ports {
        container_port = 3001
      }

      env {
        name  = "API_PORT"
        value = "3001"
      }
      env {
        name  = "CORS_ORIGIN"
        value = var.cors_origin
      }
      env {
        name  = "MCP_SERVER_URL"
        value = google_cloud_run_v2_service.mcp_ai.uri
      }
      env {
        name = "SUPABASE_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.supabase_url.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "SUPABASE_ANON_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.supabase_anon_key.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "INTERNAL_SERVICE_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.internal_service_key.secret_id
            version = "latest"
          }
        }
      }
      env {
        name  = "DAILY_ANALYSIS_QUOTA"
        value = tostring(var.daily_analysis_quota)
      }
      env {
        name  = "RATE_LIMIT_MAX"
        value = tostring(var.rate_limit_max)
      }
      env {
        name  = "UPLOAD_RATE_LIMIT_MAX"
        value = tostring(var.upload_rate_limit_max)
      }
      env {
        name  = "RATE_LIMIT_WINDOW_MS"
        value = "900000"
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
        cpu_idle = true
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 1
    }
  }
}

resource "google_cloud_run_v2_service" "mcp_ai" {
  name     = "proptech-mcp-ai"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    containers {
      image = var.mcp_ai_image

      ports {
        container_port = 3002
      }

      env {
        name  = "MCP_PORT"
        value = "3002"
      }
      env {
        name = "GEMINI_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.gemini_api_key.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "SUPABASE_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.supabase_url.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "SUPABASE_SERVICE_ROLE_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.supabase_service_role_key.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "INTERNAL_SERVICE_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.internal_service_key.secret_id
            version = "latest"
          }
        }
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
        cpu_idle = true
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 1
    }
  }
}

resource "google_cloud_run_v2_service_iam_member" "server_public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.server.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_v2_service_iam_member" "mcp_ai_server_invoker" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.mcp_ai.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${data.google_project.current.number}-compute@developer.gserviceaccount.com"
}

data "google_project" "current" {
  project_id = var.project_id
}

# Secret Manager — crear secretos manualmente antes de apply (ver README)
resource "google_secret_manager_secret" "supabase_url" {
  secret_id = "proptech-supabase-url"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "supabase_anon_key" {
  secret_id = "proptech-supabase-anon-key"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "supabase_service_role_key" {
  secret_id = "proptech-supabase-service-role-key"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "gemini_api_key" {
  secret_id = "proptech-gemini-api-key"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "internal_service_key" {
  secret_id = "proptech-internal-service-key"
  replication {
    auto {}
  }
}
