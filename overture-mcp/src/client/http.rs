//! HTTP client for Overture Maps backend

use reqwest::Client;
use serde_json::Value;
use std::time::Duration;

use crate::error::{McpError, Result};
use crate::protocol::types::{ExtractionResult, HealthResponse};

/// HTTP client for backend API
#[derive(Clone)]
pub struct BackendClient {
    client: Client,
    base_url: String,
}

impl BackendClient {
    /// Create a new backend client
    pub fn new(base_url: String) -> Result<Self> {
        let client = Client::builder()
            .timeout(Duration::from_secs(300)) // 5 minute timeout
            .build()?;

        Ok(Self { client, base_url })
    }

    /// Health check endpoint
    pub async fn health_check(&self) -> Result<HealthResponse> {
        let url = format!("{}/health", self.base_url);
        let response = self.client.get(&url).send().await?;

        if !response.status().is_success() {
            return Err(McpError::backend(format!(
                "Health check failed: {}",
                response.status()
            )));
        }

        Ok(response.json().await?)
    }

    /// Extract polygon (cache check only)
    pub async fn extract_polygon(&self, polygon: Value) -> Result<ExtractionResult> {
        let url = format!("{}/extract", self.base_url);
        let response = self
            .client
            .post(&url)
            .json(&serde_json::json!({ "polygon": polygon }))
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(McpError::backend(format!(
                "Extraction failed ({}): {}",
                status, error_text
            )));
        }

        Ok(response.json().await?)
    }

    /// Get statistics for cached extraction
    pub async fn get_stats(&self, hash: &str) -> Result<Value> {
        let url = format!("{}/stats/{}", self.base_url, hash);
        let response = self.client.get(&url).send().await?;

        if !response.status().is_success() {
            return Err(McpError::backend(format!(
                "Failed to get stats: {}",
                response.status()
            )));
        }

        Ok(response.json().await?)
    }

    /// Download GeoJSON for cached extraction
    pub async fn download_geojson(&self, hash: &str) -> Result<Value> {
        let url = format!("{}/geojson/{}", self.base_url, hash);
        let response = self.client.get(&url).send().await?;

        if !response.status().is_success() {
            return Err(McpError::backend(format!(
                "Failed to download GeoJSON: {}",
                response.status()
            )));
        }

        Ok(response.json().await?)
    }

    /// Download graph file (binary data)
    pub async fn download_graph(&self, hash: &str) -> Result<Vec<u8>> {
        let url = format!("{}/download/{}", self.base_url, hash);
        let response = self.client.get(&url).send().await?;

        if !response.status().is_success() {
            return Err(McpError::backend(format!(
                "Failed to download graph: {}",
                response.status()
            )));
        }

        Ok(response.bytes().await?.to_vec())
    }

    /// Get the base URL
    pub fn base_url(&self) -> &str {
        &self.base_url
    }

    /// Get WebSocket URL from HTTP URL
    pub fn ws_url(&self) -> String {
        self.base_url
            .replace("https://", "wss://")
            .replace("http://", "ws://")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ws_url_conversion() {
        let client = BackendClient::new("http://localhost:8080".to_string()).unwrap();
        assert_eq!(client.ws_url(), "ws://localhost:8080");

        let client = BackendClient::new("https://example.com".to_string()).unwrap();
        assert_eq!(client.ws_url(), "wss://example.com");
    }
}
