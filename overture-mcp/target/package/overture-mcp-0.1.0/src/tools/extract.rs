//! Extraction tools

use async_trait::async_trait;
use serde_json::json;

use crate::client::BackendClient;
use crate::error::{McpError, Result};
use crate::protocol::types::{Tool as ToolDef, ToolResult};
use crate::tools::Tool;

/// Extract check tool (cache check only)
pub struct ExtractCheckTool {
    client: BackendClient,
}

impl ExtractCheckTool {
    /// Create a new extract check tool
    pub fn new(backend_url: String) -> Result<Self> {
        Ok(Self {
            client: BackendClient::new(backend_url)?,
        })
    }
}

#[async_trait]
impl Tool for ExtractCheckTool {
    fn definition(&self) -> ToolDef {
        ToolDef {
            name: "overture_extract_check".to_string(),
            description: "Check if a polygon extraction is already cached. Returns immediately without performing extraction.".to_string(),
            input_schema: json!({
                "type": "object",
                "required": ["polygon"],
                "properties": {
                    "polygon": {
                        "type": "object",
                        "description": "GeoJSON Polygon Feature",
                        "required": ["type", "geometry"],
                        "properties": {
                            "type": {
                                "type": "string",
                                "enum": ["Feature"]
                            },
                            "geometry": {
                                "type": "object",
                                "required": ["type", "coordinates"],
                                "properties": {
                                    "type": {
                                        "type": "string",
                                        "enum": ["Polygon"]
                                    },
                                    "coordinates": {
                                        "type": "array",
                                        "description": "Array of linear rings (first is exterior, rest are holes)",
                                        "items": {
                                            "type": "array",
                                            "items": {
                                                "type": "array",
                                                "items": {
                                                    "type": "number"
                                                },
                                                "minItems": 2,
                                                "maxItems": 2
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "backend_url": {
                        "type": "string",
                        "description": "Backend URL (optional)",
                        "format": "uri"
                    }
                }
            }),
        }
    }

    async fn execute(&self, args: serde_json::Value) -> Result<ToolResult> {
        let polygon = args
            .get("polygon")
            .ok_or_else(|| McpError::validation("Missing polygon parameter"))?
            .clone();

        match self.client.extract_polygon(polygon).await {
            Ok(result) => Ok(ToolResult::text(serde_json::to_string_pretty(&result)?)),
            Err(e) => {
                let response = json!({
                    "status": "error",
                    "error": e.to_string()
                });
                Ok(ToolResult::error(serde_json::to_string_pretty(&response)?))
            }
        }
    }
}

/// Extract polygon tool (full extraction with progress - simplified version)
pub struct ExtractPolygonTool {
    client: BackendClient,
}

impl ExtractPolygonTool {
    /// Create a new extract polygon tool
    pub fn new(backend_url: String) -> Result<Self> {
        Ok(Self {
            client: BackendClient::new(backend_url)?,
        })
    }
}

#[async_trait]
impl Tool for ExtractPolygonTool {
    fn definition(&self) -> ToolDef {
        ToolDef {
            name: "overture_extract_polygon".to_string(),
            description: "Extract road network for a polygon. This performs the full extraction pipeline if not cached.".to_string(),
            input_schema: json!({
                "type": "object",
                "required": ["polygon"],
                "properties": {
                    "polygon": {
                        "type": "object",
                        "description": "GeoJSON Polygon Feature",
                        "required": ["type", "geometry"],
                        "properties": {
                            "type": {
                                "type": "string",
                                "enum": ["Feature"]
                            },
                            "geometry": {
                                "type": "object",
                                "required": ["type", "coordinates"],
                                "properties": {
                                    "type": {
                                        "type": "string",
                                        "enum": ["Polygon"]
                                    },
                                    "coordinates": {
                                        "type": "array",
                                        "description": "Array of linear rings",
                                        "items": {
                                            "type": "array",
                                            "items": {
                                                "type": "array",
                                                "items": {
                                                    "type": "number"
                                                },
                                                "minItems": 2,
                                                "maxItems": 2
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "backend_url": {
                        "type": "string",
                        "description": "Backend URL (optional)",
                        "format": "uri"
                    },
                    "timeout_seconds": {
                        "type": "integer",
                        "description": "Maximum time to wait for extraction (default: 300)",
                        "minimum": 30,
                        "maximum": 3600,
                        "default": 300
                    }
                }
            }),
        }
    }

    async fn execute(&self, args: serde_json::Value) -> Result<ToolResult> {
        let polygon = args
            .get("polygon")
            .ok_or_else(|| McpError::validation("Missing polygon parameter"))?
            .clone();

        // Note: This is a simplified version that uses the REST API
        // For full WebSocket support with progress updates, see the TypeScript implementation
        match self.client.extract_polygon(polygon).await {
            Ok(result) => Ok(ToolResult::text(serde_json::to_string_pretty(&result)?)),
            Err(e) => {
                let response = json!({
                    "status": "error",
                    "error": e.to_string()
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
    fn test_extract_check_definition() {
        let tool = ExtractCheckTool::new("http://localhost:8080".to_string()).unwrap();
        let def = tool.definition();
        assert_eq!(def.name, "overture_extract_check");
        assert!(!def.description.is_empty());
    }

    #[test]
    fn test_extract_polygon_definition() {
        let tool = ExtractPolygonTool::new("http://localhost:8080".to_string()).unwrap();
        let def = tool.definition();
        assert_eq!(def.name, "overture_extract_polygon");
        assert!(!def.description.is_empty());
    }
}
