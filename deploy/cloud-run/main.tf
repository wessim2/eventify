terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.gcp_project_id
  region  = var.gcp_region
}

# ---------------------------------------------------------------------------
# Artifact Registry Repository for Docker Container Images
# ---------------------------------------------------------------------------
resource "google_artifact_registry_repository" "eventify_repo" {
  location      = var.gcp_region
  repository_id = "eventify-containers"
  description   = "Docker container images for Eventify API, workers, and frontends"
  format        = "DOCKER"
}

# ---------------------------------------------------------------------------
# Cloud SQL PostgreSQL 16 Instance (Row Level Security Enabled)
# ---------------------------------------------------------------------------
resource "google_sql_database_instance" "postgres" {
  name             = "eventify-postgres-instance"
  database_version = "POSTGRES_16"
  region           = var.gcp_region

  settings {
    tier = "db-f1-micro"
    ip_configuration {
      ipv4_enabled = true
    }
    backup_configuration {
      enabled = true
    }
  }
}

resource "google_sql_database" "eventify_db" {
  name     = "eventify"
  instance = google_sql_database_instance.postgres.name
}

resource "google_sql_user" "db_user" {
  name     = "eventify_admin"
  instance = google_sql_database_instance.postgres.name
  password = var.db_password
}

# ---------------------------------------------------------------------------
# Cloud Run Serverless Service: API Core
# ---------------------------------------------------------------------------
resource "google_cloud_run_v2_service" "api_service" {
  name     = "eventify-api"
  location = var.gcp_region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    containers {
      image = "${var.gcp_region}-docker.pkg.dev/${var.gcp_project_id}/eventify-containers/api:latest"
      
      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "PORT"
        value = "3000"
      }
      env {
        name  = "JWT_SECRET"
        value = var.jwt_secret
      }
      env {
        name  = "DATABASE_URL"
        value = "postgresql://${google_sql_user.db_user.name}:${var.db_password}@/${google_sql_database.eventify_db.name}?host=/cloudsql/${google_sql_database_instance.postgres.connection_name}"
      }

      resources {
        limits = {
          cpu    = "1000m"
          memory = "512Mi"
        }
      }
    }
  }
}

# Allow Unauthenticated Public Access to API
resource "google_cloud_run_v2_service_iam_member" "api_public_access" {
  project  = var.gcp_project_id
  location = var.gcp_region
  name     = google_cloud_run_v2_service.api_service.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
