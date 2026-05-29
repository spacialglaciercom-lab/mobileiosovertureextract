//! MCP protocol types

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// JSON-RPC 2.0 request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JsonRpcRequest {
    pub jsonrpc: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<serde_json::Value>,
    pub method: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub params: Option<serde_json::Value>,
}

/// JSON-RPC 2.0 response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JsonRpcResponse {
    pub jsonrpc: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<JsonRpcError>,
}

impl JsonRpcResponse {
    /// Create a success response
    pub fn success(id: Option<serde_json::Value>, result: serde_json::Value) -> Self {
        Self {
            jsonrpc: "2.0".to_string(),
            id,
            result: Some(result),
            error: None,
        }
    }

    /// Create an error response
    pub fn error(id: Option<serde_json::Value>, error: JsonRpcError) -> Self {
        Self {
            jsonrpc: "2.0".to_string(),
            id,
            result: None,
            error: Some(error),
        }
    }
}

/// JSON-RPC error
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JsonRpcError {
    pub code: i32,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<serde_json::Value>,
}

impl JsonRpcError {
    /// Method not found error (-32601)
    pub fn method_not_found(method: &str) -> Self {
        Self {
            code: -32601,
            message: format!("Method not found: {}", method),
            data: None,
        }
    }

    /// Invalid params error (-32602)
    pub fn invalid_params(msg: &str) -> Self {
        Self {
            code: -32602,
            message: format!("Invalid params: {}", msg),
            data: None,
        }
    }

    /// Internal error (-32603)
    pub fn internal_error(msg: &str) -> Self {
        Self {
            code: -32603,
            message: format!("Internal error: {}", msg),
            data: None,
        }
    }

    /// Server error (-32000)
    pub fn server_error(msg: &str) -> Self {
        Self {
            code: -32000,
            message: msg.to_string(),
            data: None,
        }
    }
}

/// MCP Tool definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tool {
    pub name: String,
    pub description: String,
    #[serde(rename = "inputSchema")]
    pub input_schema: serde_json::Value,
}

/// MCP Tool call result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolResult {
    pub content: Vec<Content>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "isError")]
    pub is_error: Option<bool>,
}

impl ToolResult {
    /// Create a success result with text content
    pub fn text(text: String) -> Self {
        Self {
            content: vec![Content::Text { text }],
            is_error: None,
        }
    }

    /// Create an error result with text content
    pub fn error(text: String) -> Self {
        Self {
            content: vec![Content::Text { text }],
            is_error: Some(true),
        }
    }
}

/// Content item
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum Content {
    #[serde(rename = "text")]
    Text { text: String },
    #[serde(rename = "image")]
    Image { data: String, mime_type: String },
    #[serde(rename = "resource")]
    Resource { uri: String, mime_type: String },
}

/// Server capabilities
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerCapabilities {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tools: Option<HashMap<String, serde_json::Value>>,
}

impl Default for ServerCapabilities {
    fn default() -> Self {
        Self {
            tools: Some(HashMap::new()),
        }
    }
}

/// Server info
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerInfo {
    pub name: String,
    pub version: String,
}

/// Initialize result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InitializeResult {
    #[serde(rename = "protocolVersion")]
    pub protocol_version: String,
    pub capabilities: ServerCapabilities,
    #[serde(rename = "serverInfo")]
    pub server_info: ServerInfo,
}

/// GeoJSON Feature (simplified for polygon extraction)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Feature {
    #[serde(rename = "type")]
    pub feature_type: String,
    pub geometry: Geometry,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub properties: Option<serde_json::Value>,
}

/// GeoJSON Geometry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Geometry {
    #[serde(rename = "type")]
    pub geometry_type: String,
    pub coordinates: serde_json::Value,
}

/// Extraction result from backend
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtractionResult {
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cached: Option<bool>,
    pub hash: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub nodes: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub edges: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub download_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub geojson_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

/// Health check response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthResponse {
    pub status: String,
    pub version: String,
}
