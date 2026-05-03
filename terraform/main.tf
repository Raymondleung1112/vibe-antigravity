terraform {
  backend "gcs" {
    # 呢個名要同你一陣手動起嗰個 State Bucket 一致
    bucket = "gcp-hk-sandbox-tfstate-986836649818"
    prefix = "terraform/state"
  }
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = "gcp-hk-sandbox"
  region  = "asia-east1"
}

# 建立存放圖片嘅 Bucket (你之後上傳功能用)
resource "google_storage_bucket" "vibe_uploads" {
  name                        = "vibe-uploads-986836649818"
  location                    = "ASIA-EAST1"
  force_destroy               = true
  uniform_bucket_level_access = true
}

# 建立 Cloud Run 服務
resource "google_cloud_run_v2_service" "vibe_app" {
  name     = "antigravity-app"
  location = "asia-east1"
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    containers {
      # 注意：CI/CD 流程會自動將 ${{ github.sha }} 傳入嚟取代呢個 placeholder
      image = "asia-east1-docker.pkg.dev/gcp-hk-sandbox/antigravity-vibe-repo/vibe-app:latest"
      env {
        name  = "BUCKET_NAME"
        value = google_storage_bucket.vibe_uploads.name
      }
    }
  }
}

# 授權公開存取
resource "google_cloud_run_v2_service_iam_member" "public" {
  location = google_cloud_run_v2_service.vibe_app.location
  name     = google_cloud_run_v2_service.vibe_app.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
