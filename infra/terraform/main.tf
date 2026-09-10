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

resource "google_service_account" "server_runtime" {
  project      = var.project_id
  account_id   = "${var.server_service_name}-runtime"
  display_name = "PropTech API runtime"
}

resource "google_service_account" "mcp_ai_runtime" {
  project      = var.project_id
  account_id   = "${var.mcp_ai_service_name}-runtime"
  display_name = "PropTech MCP-AI runtime"
}

resource "google_cloud_run_v2_service" "server" {
  name     = var.server_service_name
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.server_runtime.email

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

  lifecycle {
    ignore_changes = [
      client,
      client_version,
      template[0].containers[0].image,
    ]
  }
}

resource "google_cloud_run_v2_service" "mcp_ai" {
  name     = var.mcp_ai_service_name
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.mcp_ai_runtime.email

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
        # CPU activa tras el 202: runAnalysis sigue en background con Gemini.
        cpu_idle = false
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 1
    }
  }

  lifecycle {
    ignore_changes = [
      client,
      client_version,
      template[0].containers[0].image,
    ]
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
  member   = "serviceAccount:${google_service_account.server_runtime.email}"
}

data "google_project" "current" {
  project_id = var.project_id
}

data "google_billing_account" "current" {
  billing_account = var.billing_account_id
}

resource "google_billing_budget" "project" {
  billing_account = data.google_billing_account.current.id
  display_name    = "PropTech monthly budget"

  budget_filter {
    projects = ["projects/${data.google_project.current.number}"]
  }

  amount {
    specified_amount {
      currency_code = "EUR"
      units         = "1"
    }
  }

  threshold_rules {
    threshold_percent = 0.5
  }

  threshold_rules {
    threshold_percent = 1.0
  }
}

resource "google_service_account" "cloud_build" {
  project      = var.project_id
  account_id   = var.cloud_build_service_account_id
  display_name = "PropTech Cloud Build deployer"
}

resource "google_project_iam_member" "cloud_build_log_writer" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.cloud_build.email}"
}

resource "google_artifact_registry_repository_iam_member" "cloud_build_writer" {
  project    = var.project_id
  location   = var.region
  repository = var.artifact_registry_repository
  role       = "roles/artifactregistry.writer"
  member     = "serviceAccount:${google_service_account.cloud_build.email}"
}

resource "google_cloud_run_v2_service_iam_member" "cloud_build_server_developer" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.server.name
  role     = "roles/run.developer"
  member   = "serviceAccount:${google_service_account.cloud_build.email}"
}

resource "google_cloud_run_v2_service_iam_member" "cloud_build_mcp_ai_developer" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.mcp_ai.name
  role     = "roles/run.developer"
  member   = "serviceAccount:${google_service_account.cloud_build.email}"
}

resource "google_service_account_iam_member" "cloud_build_can_act_as_runtime" {
  for_each = {
    server = google_service_account.server_runtime.name
    mcp_ai = google_service_account.mcp_ai_runtime.name
  }
  service_account_id = each.value
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.cloud_build.email}"
}

resource "google_service_account_iam_member" "cloud_build_service_agent_token_creator" {
  service_account_id = google_service_account.cloud_build.name
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = "serviceAccount:service-${data.google_project.current.number}@gcp-sa-cloudbuild.iam.gserviceaccount.com"
}

resource "google_cloudbuild_trigger" "deploy_main" {
  project = var.project_id
  name    = "proptech-deploy-main"

  github {
    owner = var.github_owner
    name  = var.github_repository

    push {
      branch = "^main$"
    }
  }

  service_account = google_service_account.cloud_build.id
  filename        = "cloudbuild.yaml"

  substitutions = {
    _REGION         = var.region
    _REPOSITORY     = var.artifact_registry_repository
    _SERVER_SERVICE = var.server_service_name
    _MCP_AI_SERVICE = var.mcp_ai_service_name
  }

  depends_on = [
    google_project_iam_member.cloud_build_log_writer,
    google_artifact_registry_repository_iam_member.cloud_build_writer,
    google_cloud_run_v2_service_iam_member.cloud_build_server_developer,
    google_cloud_run_v2_service_iam_member.cloud_build_mcp_ai_developer,
    google_service_account_iam_member.cloud_build_can_act_as_runtime,
    google_service_account_iam_member.cloud_build_service_agent_token_creator,
    google_billing_budget.project,
  ]
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

resource "google_secret_manager_secret_iam_member" "server_runtime_secrets" {
  for_each = {
    supabase_url         = google_secret_manager_secret.supabase_url.secret_id
    supabase_anon_key    = google_secret_manager_secret.supabase_anon_key.secret_id
    internal_service_key = google_secret_manager_secret.internal_service_key.secret_id
  }

  secret_id = each.value
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.server_runtime.email}"
}

resource "google_secret_manager_secret_iam_member" "mcp_ai_runtime_secrets" {
  for_each = {
    supabase_url              = google_secret_manager_secret.supabase_url.secret_id
    supabase_service_role_key = google_secret_manager_secret.supabase_service_role_key.secret_id
    gemini_api_key            = google_secret_manager_secret.gemini_api_key.secret_id
    internal_service_key      = google_secret_manager_secret.internal_service_key.secret_id
  }

  secret_id = each.value
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.mcp_ai_runtime.email}"
}
