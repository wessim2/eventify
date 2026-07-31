variable "gcp_project_id" {
  description = "The GCP project ID to deploy resources into"
  type        = string
  default     = "eventify-production"
}

variable "gcp_region" {
  description = "The GCP region for Cloud Run and Cloud SQL"
  type        = string
  default     = "europe-west1"
}

variable "db_password" {
  description = "The database password for eventify_admin user"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "JWT Secret Key for auth token signing"
  type        = string
  sensitive   = true
}
