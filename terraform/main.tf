variable "image_tag" {
  type        = string
  description = "The docker image tag to deploy"
}

terraform {
  backend "gcs" {
    bucket = "gcp-hk-sandbox-tfstate-986836649818"
    prefix = "terraform/state"
  }
}

provider "google" {
  project = "gcp-hk-sandbox"
  region  = "asia-east1"
}

resource "google_storage_bucket" "vibe_uploads" {
  name                        = "vibe-uploads-986836649818"
  location                    = "ASIA-EAST1"
  force_destroy               = true
  uniform_bucket_level_access = true
}

resource "google_cloud_run_v2_service" "vibe_app" {
  name     = "antigravity-app"
  location = "asia-east1"
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    containers {
      image = "asia-east1-docker.pkg.dev/gcp-hk-sandbox/antigravity-vibe-repo/vibe-app:${var.image_tag}"
      env {
        name  = "BUCKET_NAME"
        value = google_storage_bucket.vibe_uploads.name
      }
    }
  }
}

resource "google_cloud_run_v2_service_iam_member" "public" {
  location = google_cloud_run_v2_service.vibe_app.location
  name     = google_cloud_run_v2_service.vibe_app.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
resource "google_cloud_run_v2_service" "vibe_app" {
  name     = "antigravity-app"
  location = "asia-east1"
  ingress  = "INGRESS_TRAFFIC_ALL"

  # 加入呢一行嚟解鎖刪除權限
  deletion_protection = false 

  template {
    containers {
      image = "asia-east1-docker.pkg.dev/gcp-hk-sandbox/antigravity-vibe-repo/vibe-app:${var.image_tag}"
      env {
        name  = "BUCKET_NAME"
        value = google_storage_bucket.vibe_uploads.name
      }
    }
  }
}