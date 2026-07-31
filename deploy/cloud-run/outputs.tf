output "api_service_url" {
  description = "The public URL of the deployed Eventify Cloud Run API"
  value       = google_cloud_run_v2_service.api_service.uri
}

output "artifact_registry_repo" {
  description = "The Artifact Registry Docker repository path"
  value       = "${var.gcp_region}-docker.pkg.dev/${var.gcp_project_id}/eventify-containers"
}

output "database_connection_name" {
  description = "Cloud SQL Instance Connection Name"
  value       = google_sql_database_instance.postgres.connection_name
}
