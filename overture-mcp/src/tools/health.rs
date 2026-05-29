//! Health check tool

use async_trait::async_trait;
use serde_json::json;

use crate::client::BackendClient;
use crate::error::Result;
use crate::protocol::types::{Tool as ToolDef, ToolResult};
use crate::tools::Tool;

/// Health check tool for backend status
pub struct HealthCheckTool {
    client: BackendClient,
}

impl HealthCheckTool {
    /// Create a new health check tool
    pub fn new(backend_url: String) -> Result<Self> {
        Ok(Self {
            client: BackendClient::new(backend_url)?,
        })
    }
}

#[async_trait]
impl Tool for HealthCheckTool {
    fn definition(&self) -> ToolDef {
        ToolDef {
            name: "overture_health_check".to_string(),
            description: "Check the health and version of the Overture Maps extraction backend"
                .to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "backend_url": {
                        "type": "string",
                        "description": "Backend URL (optional, defaults to configured URL)",
                        "format": "uri"
                    }
                }
            }),
        }
    }

    async fn execute(&self, _args: serde_json::Value) -> Result<ToolResult> {
        match self.client.health_check().await {
            Ok(health) => {
                let response = json!({
                    "status": "healthy",
                    "version": health.version,
                    "timestamp": chrono::Utc::now().to_rfc3339()
                });

                Ok(ToolResult::text(serde_json::to_string_pretty(&response)?))
            }
            Err(e) => {
                let response = json!({
                    "status": "unhealthy",
                    "error": e.to_string(),
                    "timestamp": chrono::Utc::now().to_rfc3339()
                });

                Ok(ToolResult::error(serde_json::to_string_pretty(&response)?))
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tool_definition() {
        let tool = HealthCheckTool::new("http://localhost:8080".to_string()).unwrap();
        let def = tool.definition();
        assert_eq!(def.name, "overture_health_check");
        assert!(!def.description.is_empty());
    }
}
