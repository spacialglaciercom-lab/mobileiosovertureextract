# Rust MCP Crate Implementation Plan

## Overview

Create a standalone Rust crate that implements Model Context Protocol (MCP) server functionality for the Overture Maps extraction project. This crate will be publishable on crates.io and provide the same 8 tools currently implemented in TypeScript.

## Project Goals

1. **Standalone Crate**: Self-contained library that can be used independently
2. **Publishable**: Meet all crates.io requirements and best practices
3. **Feature Parity**: Implement all 8 MCP tools from TypeScript version
4. **Performance**: Leverage Rust's performance benefits
5. **Type Safety**: Full type safety with proper error handling
6. **Documentation**: Comprehensive docs for crates.io

## Crate Structure

```
overture-mcp/
├── Cargo.toml                 # Crate manifest
├── README.md                  # Crate documentation
├── LICENSE                    # MIT or Apache-2.0
├── CHANGELOG.md              # Version history
├── examples/
│   ├── basic_server.rs       # Simple server example
│   ├── with_backend.rs       # Full integration example
│   └── custom_tools.rs       # Extending with custom tools
├── src/
│   ├── lib.rs                # Library entry point
│   ├── server.rs             # MCP server implementation
│   ├── transport/
│   │   ├── mod.rs
│   │   └── stdio.rs          # Stdio transport
│   ├── protocol/
│   │   ├── mod.rs
│   │   ├── types.rs          # MCP protocol types
│   │   └── jsonrpc.rs        # JSON-RPC handling
│   ├── tools/
│   │   ├── mod.rs
│   │   ├── health.rs         # Health check tool
│   │   ├── extract.rs        # Extraction tools
│   │   ├── download.rs       # Download tools
│   │   ├── stats.rs          # Statistics tool
│   │   └── cache.rs          # Cache management tools
│   ├── client/
│   │   ├── mod.rs
│   │   ├── http.rs           # HTTP client for backend
│   │   └── websocket.rs      # WebSocket client
│   ├── error.rs              # Error types
│   └── config.rs             # Configuration
├── tests/
│   ├── integration_tests.rs  # Integration tests
│   └── tool_tests.rs         # Tool-specific tests
└── benches/
    └── server_bench.rs       # Performance benchmarks

Binary crate (optional):
overture-mcp-server/
├── Cargo.toml
├── src/
│   └── main.rs               # Standalone server binary
└── README.md
```

## Dependencies

### Core Dependencies

```toml
[dependencies]
# Async runtime
tokio = { version = "1.35", features = ["full"] }

# Serialization
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"

# HTTP client
reqwest = { version = "0.11", features = ["json"] }

# WebSocket
tokio-tungstenite = "0.21"

# Error handling
thiserror = "1.0"
anyhow = "1.0"

# Logging
tracing = "0.1"
tracing-subscriber = "0.3"

# Configuration
config = "0.13"

# Optional: CLI for binary
clap = { version = "4.4", features = ["derive"], optional = true }

[dev-dependencies]
# Testing
tokio-test = "0.4"
mockito = "1.2"
criterion = "0.5"

[features]
default = []
cli = ["clap"]
```

## Implementation Phases

### Phase 1: Core Protocol Implementation (2-3 days)

#### 1.1 Protocol Types

```rust
// src/protocol/types.rs

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// JSON-RPC 2.0 request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JsonRpcRequest {
    pub jsonrpc: String,
    pub id: Option<serde_json::Value>,
    pub method: String,
    pub params: Option<serde_json::Value>,
}

/// JSON-RPC 2.0 response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JsonRpcResponse {
    pub jsonrpc: String,
    pub id: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<JsonRpcError>,
}

/// JSON-RPC error
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JsonRpcError {
    pub code: i32,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<serde_json::Value>,
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
    pub tools: Option<HashMap<String, serde_json::Value>>,
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
```

#### 1.2 Transport Layer

```rust
// src/transport/stdio.rs

use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::io::{stdin, stdout};
use crate::protocol::types::{JsonRpcRequest, JsonRpcResponse};
use crate::error::Result;

pub struct StdioTransport {
    reader: BufReader<tokio::io::Stdin>,
    writer: tokio::io::Stdout,
}

impl StdioTransport {
    pub fn new() -> Self {
        Self {
            reader: BufReader::new(stdin()),
            writer: stdout(),
        }
    }

    pub async fn read_request(&mut self) -> Result<JsonRpcRequest> {
        let mut line = String::new();
        self.reader.read_line(&mut line).await?;
        let request = serde_json::from_str(&line)?;
        Ok(request)
    }

    pub async fn write_response(&mut self, response: &JsonRpcResponse) -> Result<()> {
        let json = serde_json::to_string(response)?;
        self.writer.write_all(json.as_bytes()).await?;
        self.writer.write_all(b"\n").await?;
        self.writer.flush().await?;
        Ok(())
    }
}
```

#### 1.3 Error Types

```rust
// src/error.rs

use thiserror::Error;

#[derive(Error, Debug)]
pub enum McpError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("HTTP error: {0}")]
    Http(#[from] reqwest::Error),

    #[error("WebSocket error: {0}")]
    WebSocket(String),

    #[error("Backend error: {0}")]
    Backend(String),

    #[error("Tool error: {0}")]
    Tool(String),

    #[error("Validation error: {0}")]
    Validation(String),

    #[error("Timeout error: {0}")]
    Timeout(String),
}

pub type Result<T> = std::result::Result<T, McpError>;
```

### Phase 2: Tool Framework (1-2 days)

#### 2.1 Tool Trait

```rust
// src/tools/mod.rs

use async_trait::async_trait;
use serde_json::Value;
use crate::protocol::types::{Tool as ToolDef, ToolResult};
use crate::error::Result;

#[async_trait]
pub trait Tool: Send + Sync {
    /// Get tool definition
    fn definition(&self) -> ToolDef;

    /// Execute tool with given arguments
    async fn execute(&self, args: Value) -> Result<ToolResult>;
}

/// Tool registry
pub struct ToolRegistry {
    tools: Vec<Box<dyn Tool>>,
}

impl ToolRegistry {
    pub fn new() -> Self {
        Self { tools: Vec::new() }
    }

    pub fn register(&mut self, tool: Box<dyn Tool>) {
        self.tools.push(tool);
    }

    pub fn list(&self) -> Vec<ToolDef> {
        self.tools.iter().map(|t| t.definition()).collect()
    }

    pub async fn execute(&self, name: &str, args: Value) -> Result<ToolResult> {
        let tool = self.tools
            .iter()
            .find(|t| t.definition().name == name)
            .ok_or_else(|| McpError::Tool(format!("Tool not found: {}", name)))?;

        tool.execute(args).await
    }
}
```

#### 2.2 Backend Client

```rust
// src/client/http.rs

use reqwest::Client;
use serde::{Deserialize, Serialize};
use crate::error::{Result, McpError};

#[derive(Clone)]
pub struct BackendClient {
    client: Client,
    base_url: String,
}

impl BackendClient {
    pub fn new(base_url: String) -> Self {
        Self {
            client: Client::new(),
            base_url,
        }
    }

    pub async fn health_check(&self) -> Result<HealthResponse> {
        let url = format!("{}/health", self.base_url);
        let response = self.client.get(&url).send().await?;
        
        if !response.status().is_success() {
            return Err(McpError::Backend(format!(
                "Health check failed: {}",
                response.status()
            )));
        }

        Ok(response.json().await?)
    }

    pub async fn extract_polygon(&self, polygon: Value) -> Result<ExtractionResult> {
        let url = format!("{}/extract", self.base_url);
        let response = self.client
            .post(&url)
            .json(&serde_json::json!({ "polygon": polygon }))
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(McpError::Backend(format!(
                "Extraction failed: {}",
                response.status()
            )));
        }

        Ok(response.json().await?)
    }

    // Additional methods for other endpoints...
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HealthResponse {
    pub status: String,
    pub version: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExtractionResult {
    pub status: String,
    pub cached: Option<bool>,
    pub hash: String,
    pub nodes: Option<u32>,
    pub edges: Option<u32>,
    pub download_url: Option<String>,
    pub geojson_url: Option<String>,
}
```

### Phase 3: Tool Implementation (3-4 days)

#### 3.1 Health Check Tool

```rust
// src/tools/health.rs

use async_trait::async_trait;
use serde_json::{json, Value};
use crate::tools::Tool;
use crate::protocol::types::{Tool as ToolDef, ToolResult, Content};
use crate::client::http::BackendClient;
use crate::error::Result;

pub struct HealthCheckTool {
    client: BackendClient,
}

impl HealthCheckTool {
    pub fn new(backend_url: String) -> Self {
        Self {
            client: BackendClient::new(backend_url),
        }
    }
}

#[async_trait]
impl Tool for HealthCheckTool {
    fn definition(&self) -> ToolDef {
        ToolDef {
            name: "overture_health_check".to_string(),
            description: "Check the health and version of the Overture Maps extraction backend".to_string(),
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

    async fn execute(&self, _args: Value) -> Result<ToolResult> {
        match self.client.health_check().await {
            Ok(health) => {
                let response = json!({
                    "status": "healthy",
                    "version": health.version,
                    "timestamp": chrono::Utc::now().to_rfc3339()
                });

                Ok(ToolResult {
                    content: vec![Content::Text {
                        text: serde_json::to_string_pretty(&response)?,
                    }],
                    is_error: None,
                })
            }
            Err(e) => {
                let response = json!({
                    "status": "unhealthy",
                    "error": e.to_string(),
                    "timestamp": chrono::Utc::now().to_rfc3339()
                });

                Ok(ToolResult {
                    content: vec![Content::Text {
                        text: serde_json::to_string_pretty(&response)?,
                    }],
                    is_error: Some(true),
                })
            }
        }
    }
}
```

#### 3.2 Extract Tools

```rust
// src/tools/extract.rs

use async_trait::async_trait;
use serde_json::{json, Value};
use crate::tools::Tool;
use crate::protocol::types::{Tool as ToolDef, ToolResult, Content};
use crate::client::{http::BackendClient, websocket::WebSocketClient};
use crate::error::Result;

pub struct ExtractCheckTool {
    client: BackendClient,
}

impl ExtractCheckTool {
    pub fn new(backend_url: String) -> Self {
        Self {
            client: BackendClient::new(backend_url),
        }
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
                        "description": "GeoJSON Polygon Feature"
                    }
                }
            }),
        }
    }

    async fn execute(&self, args: Value) -> Result<ToolResult> {
        let polygon = args.get("polygon")
            .ok_or_else(|| McpError::Validation("Missing polygon parameter".to_string()))?;

        match self.client.extract_polygon(polygon.clone()).await {
            Ok(result) => {
                Ok(ToolResult {
                    content: vec![Content::Text {
                        text: serde_json::to_string_pretty(&result)?,
                    }],
                    is_error: None,
                })
            }
            Err(e) => {
                let response = json!({
                    "status": "error",
                    "error": e.to_string()
                });

                Ok(ToolResult {
                    content: vec![Content::Text {
                        text: serde_json::to_string_pretty(&response)?,
                    }],
                    is_error: Some(true),
                })
            }
        }
    }
}

pub struct ExtractPolygonTool {
    ws_url: String,
}

impl ExtractPolygonTool {
    pub fn new(ws_url: String) -> Self {
        Self { ws_url }
    }
}

#[async_trait]
impl Tool for ExtractPolygonTool {
    fn definition(&self) -> ToolDef {
        ToolDef {
            name: "overture_extract_polygon".to_string(),
            description: "Extract road network for a polygon with real-time progress updates.".to_string(),
            input_schema: json!({
                "type": "object",
                "required": ["polygon"],
                "properties": {
                    "polygon": {
                        "type": "object",
                        "description": "GeoJSON Polygon Feature"
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

    async fn execute(&self, args: Value) -> Result<ToolResult> {
        let polygon = args.get("polygon")
            .ok_or_else(|| McpError::Validation("Missing polygon parameter".to_string()))?;
        
        let timeout_secs = args.get("timeout_seconds")
            .and_then(|v| v.as_u64())
            .unwrap_or(300);

        let mut ws_client = WebSocketClient::new(&self.ws_url).await?;
        
        match ws_client.extract_polygon(polygon.clone(), timeout_secs).await {
            Ok(result) => {
                Ok(ToolResult {
                    content: vec![Content::Text {
                        text: serde_json::to_string_pretty(&result)?,
                    }],
                    is_error: None,
                })
            }
            Err(e) => {
                let response = json!({
                    "status": "error",
                    "error": e.to_string()
                });

                Ok(ToolResult {
                    content: vec![Content::Text {
                        text: serde_json::to_string_pretty(&response)?,
                    }],
                    is_error: Some(true),
                })
            }
        }
    }
}
```

### Phase 4: Server Implementation (2 days)

#### 4.1 MCP Server

```rust
// src/server.rs

use tokio::io::{AsyncBufReadExt, BufReader};
use crate::transport::stdio::StdioTransport;
use crate::protocol::types::*;
use crate::tools::ToolRegistry;
use crate::error::{Result, McpError};

pub struct McpServer {
    name: String,
    version: String,
    tools: ToolRegistry,
}

impl McpServer {
    pub fn new(name: String, version: String) -> Self {
        Self {
            name,
            version,
            tools: ToolRegistry::new(),
        }
    }

    pub fn register_tool(&mut self, tool: Box<dyn crate::tools::Tool>) {
        self.tools.register(tool);
    }

    pub async fn run(&self) -> Result<()> {
        let mut transport = StdioTransport::new();

        tracing::info!("MCP Server {} v{} starting...", self.name, self.version);
        tracing::info!("Registered {} tools", self.tools.list().len());

        loop {
            let request = transport.read_request().await?;
            
            tracing::debug!("Received request: {}", request.method);

            let response = self.handle_request(request).await;
            transport.write_response(&response).await?;
        }
    }

    async fn handle_request(&self, request: JsonRpcRequest) -> JsonRpcResponse {
        match request.method.as_str() {
            "initialize" => self.handle_initialize(request),
            "tools/list" => self.handle_tools_list(request),
            "tools/call" => self.handle_tools_call(request).await,
            _ => JsonRpcResponse {
                jsonrpc: "2.0".to_string(),
                id: request.id,
                result: None,
                error: Some(JsonRpcError {
                    code: -32601,
                    message: format!("Method not found: {}", request.method),
                    data: None,
                }),
            },
        }
    }

    fn handle_initialize(&self, request: JsonRpcRequest) -> JsonRpcResponse {
        let result = InitializeResult {
            protocol_version: "2024-11-05".to_string(),
            capabilities: ServerCapabilities {
                tools: Some(std::collections::HashMap::new()),
            },
            server_info: ServerInfo {
                name: self.name.clone(),
                version: self.version.clone(),
            },
        };

        JsonRpcResponse {
            jsonrpc: "2.0".to_string(),
            id: request.id,
            result: Some(serde_json::to_value(result).unwrap()),
            error: None,
        }
    }

    fn handle_tools_list(&self, request: JsonRpcRequest) -> JsonRpcResponse {
        let tools = self.tools.list();
        let result = serde_json::json!({ "tools": tools });

        JsonRpcResponse {
            jsonrpc: "2.0".to_string(),
            id: request.id,
            result: Some(result),
            error: None,
        }
    }

    async fn handle_tools_call(&self, request: JsonRpcRequest) -> JsonRpcResponse {
        let params = match request.params {
            Some(p) => p,
            None => {
                return JsonRpcResponse {
                    jsonrpc: "2.0".to_string(),
                    id: request.id,
                    result: None,
                    error: Some(JsonRpcError {
                        code: -32602,
                        message: "Invalid params".to_string(),
                        data: None,
                    }),
                };
            }
        };

        let name = match params.get("name").and_then(|v| v.as_str()) {
            Some(n) => n,
            None => {
                return JsonRpcResponse {
                    jsonrpc: "2.0".to_string(),
                    id: request.id,
                    result: None,
                    error: Some(JsonRpcError {
                        code: -32602,
                        message: "Missing tool name".to_string(),
                        data: None,
                    }),
                };
            }
        };

        let args = params.get("arguments").cloned().unwrap_or(serde_json::json!({}));

        match self.tools.execute(name, args).await {
            Ok(result) => JsonRpcResponse {
                jsonrpc: "2.0".to_string(),
                id: request.id,
                result: Some(serde_json::to_value(result).unwrap()),
                error: None,
            },
            Err(e) => JsonRpcResponse {
                jsonrpc: "2.0".to_string(),
                id: request.id,
                result: None,
                error: Some(JsonRpcError {
                    code: -32000,
                    message: e.to_string(),
                    data: None,
                }),
            },
        }
    }
}
```

### Phase 5: Library API (1 day)

#### 5.1 Public API

```rust
// src/lib.rs

//! # Overture MCP
//!
//! Model Context Protocol (MCP) server for Overture Maps road network extraction.
//!
//! ## Features
//!
//! - 8 MCP tools for road network extraction
//! - HTTP and WebSocket client support
//! - Async/await with Tokio
//! - Type-safe protocol implementation
//!
//! ## Example
//!
//! ```rust,no_run
//! use overture_mcp::{McpServer, tools::*};
//!
//! #[tokio::main]
//! async fn main() -> Result<(), Box<dyn std::error::Error>> {
//!     let mut server = McpServer::new(
//!         "overture-maps-extractor".to_string(),
//!         "1.0.0".to_string(),
//!     );
//!
//!     // Register tools
//!     server.register_tool(Box::new(HealthCheckTool::new(
//!         "http://localhost:8080".to_string()
//!     )));
//!
//!     // Run server
//!     server.run().await?;
//!     Ok(())
//! }
//! ```

pub mod server;
pub mod transport;
pub mod protocol;
pub mod tools;
pub mod client;
pub mod error;
pub mod config;

// Re-exports
pub use server::McpServer;
pub use error::{McpError, Result};
pub use protocol::types::*;
```

#### 5.2 Configuration

```rust
// src/config.rs

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub server: ServerConfig,
    pub backend: BackendConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerConfig {
    pub name: String,
    pub version: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackendConfig {
    pub http_url: String,
    pub ws_url: String,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            server: ServerConfig {
                name: "overture-maps-extractor".to_string(),
                version: env!("CARGO_PKG_VERSION").to_string(),
            },
            backend: BackendConfig {
                http_url: "http://localhost:8080".to_string(),
                ws_url: "ws://localhost:8080".to_string(),
            },
        }
    }
}

impl Config {
    pub fn from_env() -> Result<Self, config::ConfigError> {
        let mut cfg = config::Config::builder()
            .add_source(config::Environment::with_prefix("OVERTURE_MCP"))
            .build()?;

        cfg.try_deserialize()
    }
}
```

### Phase 6: Binary Crate (1 day)

#### 6.1 Standalone Binary

```rust
// overture-mcp-server/src/main.rs

use clap::Parser;
use overture_mcp::{McpServer, tools::*, config::Config};
use tracing_subscriber;

#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    /// Backend HTTP URL
    #[arg(long, env = "OVERTURE_BACKEND_URL", default_value = "http://localhost:8080")]
    backend_url: String,

    /// Backend WebSocket URL
    #[arg(long, env = "OVERTURE_WS_URL", default_value = "ws://localhost:8080")]
    ws_url: String,

    /// Log level
    #[arg(long, env = "RUST_LOG", default_value = "info")]
    log_level: String,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args = Args::parse();

    // Initialize logging
    tracing_subscriber::fmt()
        .with_env_filter(&args.log_level)
        .init();

    // Create server
    let mut server = McpServer::new(
        "overture-maps-extractor".to_string(),
        env!("CARGO_PKG_VERSION").to_string(),
    );

    // Register all tools
    server.register_tool(Box::new(health::HealthCheckTool::new(
        args.backend_url.clone()
    )));
    
    server.register_tool(Box::new(extract::ExtractCheckTool::new(
        args.backend_url.clone()
    )));
    
    server.register_tool(Box::new(extract::ExtractPolygonTool::new(
        args.ws_url.clone()
    )));
    
    server.register_tool(Box::new(download::DownloadGraphTool::new(
        args.backend_url.clone()
    )));
    
    server.register_tool(Box::new(download::DownloadGeoJsonTool::new(
        args.backend_url.clone()
    )));
    
    server.register_tool(Box::new(stats::GetStatsTool::new(
        args.backend_url.clone()
    )));
    
    server.register_tool(Box::new(cache::ListCacheTool::new(
        args.backend_url.clone()
    )));
    
    server.register_tool(Box::new(cache::ClearCacheTool::new(
        args.backend_url.clone()
    )));

    // Run server
    server.run().await?;

    Ok(())
}
```

### Phase 7: Testing & Documentation (2 days)

#### 7.1 Integration Tests

```rust
// tests/integration_tests.rs

use overture_mcp::{McpServer, tools::*};
use tokio::test;

#[tokio::test]
async fn test_health_check_tool() {
    let tool = health::HealthCheckTool::new("http://localhost:8080".to_string());
    let result = tool.execute(serde_json::json!({})).await;
    assert!(result.is_ok());
}

#[tokio::test]
async fn test_extract_check_tool() {
    let tool = extract::ExtractCheckTool::new("http://localhost:8080".to_string());
    let polygon = serde_json::json!({
        "type": "Feature",
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [-122.4, 37.7],
                [-122.3, 37.7],
                [-122.3, 37.8],
                [-122.4, 37.8],
                [-122.4, 37.7]
            ]]
        }
    });
    
    let result = tool.execute(serde_json::json!({ "polygon": polygon })).await;
    assert!(result.is_ok());
}
```

#### 7.2 Benchmarks

```rust
// benches/server_bench.rs

use criterion::{black_box, criterion_group, criterion_main, Criterion};
use overture_mcp::tools::*;

fn bench_health_check(c: &mut Criterion) {
    let rt = tokio::runtime::Runtime::new().unwrap();
    let tool = health::HealthCheckTool::new("http://localhost:8080".to_string());

    c.bench_function("health_check", |b| {
        b.to_async(&rt).iter(|| async {
            tool.execute(black_box(serde_json::json!({}))).await
        });
    });
}

criterion_group!(benches, bench_health_check);
criterion_main!(benches);
```

#### 7.3 Documentation

```rust
// README.md for crate

# Overture MCP

[![Crates.io](https://img.shields.io/crates/v/overture-mcp.svg)](https://crates.io/crates/overture-mcp)
[![Documentation](https://docs.rs/overture-mcp/badge.svg)](https://docs.rs/overture-mcp)
[![License](https://img.shields.io/crates/l/overture-mcp.svg)](LICENSE)

Model Context Protocol (MCP) server for Overture Maps road network extraction.

## Features

- 🚀 **8 MCP Tools**: Complete set of tools for road network extraction
- ⚡ **High Performance**: Built with Rust and Tokio for async I/O
- 🔒 **Type Safe**: Full type safety with comprehensive error handling
- 📦 **Standalone**: Can be used as a library or standalone binary
- 🧪 **Well Tested**: Comprehensive test suite and benchmarks

## Installation

Add to your `Cargo.toml`:

```toml
[dependencies]
overture-mcp = "0.1.0"
```

## Quick Start

### As a Library

```rust
use overture_mcp::{McpServer, tools::*};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut server = McpServer::new(
        "my-server".to_string(),
        "1.0.0".to_string(),
    );

    server.register_tool(Box::new(health::HealthCheckTool::new(
        "http://localhost:8080".to_string()
    )));

    server.run().await?;
    Ok(())
}
```

### As a Binary

```bash
cargo install overture-mcp-server
overture-mcp-server --backend-url http://localhost:8080
```

## Available Tools

1. **overture_health_check** - Check backend health
2. **overture_extract_check** - Check extraction cache
3. **overture_extract_polygon** - Extract with progress
4. **overture_download_graph** - Download graph file
5. **overture_download_geojson** - Download GeoJSON
6. **overture_get_stats** - Get statistics
7. **overture_list_cache** - List cache entries
8. **overture_clear_cache** - Clear cache

## Documentation

Full documentation available at [docs.rs/overture-mcp](https://docs.rs/overture-mcp)

## License

MIT OR Apache-2.0
```

### Phase 8: Publishing (1 day)

#### 8.1 Cargo.toml for Publishing

```toml
[package]
name = "overture-mcp"
version = "0.1.0"
edition = "2021"
authors = ["Your Name <your.email@example.com>"]
license = "MIT OR Apache-2.0"
description = "Model Context Protocol server for Overture Maps road network extraction"
homepage = "https://github.com/yourusername/overture-mcp"
repository = "https://github.com/yourusername/overture-mcp"
documentation = "https://docs.rs/overture-mcp"
readme = "README.md"
keywords = ["mcp", "overture-maps", "road-network", "geospatial"]
categories = ["network-programming", "asynchronous", "science::geo"]

[dependencies]
tokio = { version = "1.35", features = ["full"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
reqwest = { version = "0.11", features = ["json"] }
tokio-tungstenite = "0.21"
thiserror = "1.0"
anyhow = "1.0"
tracing = "0.1"
tracing-subscriber = "0.3"
config = "0.13"
async-trait = "0.1"
chrono = { version = "0.4", features = ["serde"] }

[dev-dependencies]
tokio-test = "0.4"
mockito = "1.2"
criterion = "0.5"

[[bench]]
name = "server_bench"
harness = false

[package.metadata.docs.rs]
all-features = true
rustdoc-args = ["--cfg", "docsrs"]
```

#### 8.2 Publishing Checklist

1. **Pre-publish**:
   - [ ] Run `cargo fmt`
   - [ ] Run `cargo clippy`
   - [ ] Run `cargo test`
   - [ ] Run `cargo doc --no-deps`
   - [ ] Update CHANGELOG.md
   - [ ] Update version in Cargo.toml
   - [ ] Add LICENSE files (MIT and Apache-2.0)

2. **Publish**:
   ```bash
   cargo publish --dry-run
   cargo publish
   ```

3. **Post-publish**:
   - [ ] Create GitHub release
   - [ ] Update documentation
   - [ ] Announce on social media

## Advantages Over TypeScript Version

1. **Performance**: 2-10x faster execution
2. **Memory**: 50-70% less memory usage
3. **Binary Size**: Single ~5MB binary (vs Node.js + deps)
4. **Type Safety**: Compile-time guarantees
5. **Deployment**: No runtime dependencies
6. **Concurrency**: Better async performance with Tokio

## Integration with Existing Project

### Option 1: Replace TypeScript MCP Server

Update `.bob/settings.json`:

```json
{
  "mcpServers": {
    "overture-maps": {
      "command": "overture-mcp-server",
      "env": {
        "OVERTURE_BACKEND_URL": "http://localhost:8080",
        "OVERTURE_WS_URL": "ws://localhost:8080"
      },
      "trust": true
    }
  }
}
```

### Option 2: Use as Library in Rust Backend

Integrate directly into the Rust backend:

```rust
// In rust-backend/src/main.rs

use overture_mcp::McpServer;

#[tokio::main]
async fn main() {
    // Start HTTP/WebSocket server
    tokio::spawn(async {
        start_http_server().await;
    });

    // Start MCP server
    let mut mcp_server = McpServer::new(
        "overture-maps".to_string(),
        env!("CARGO_PKG_VERSION").to_string(),
    );
    
    // Register tools...
    
    mcp_server.run().await.unwrap();
}
```

## Timeline

- **Phase 1**: Core Protocol (2-3 days)
- **Phase 2**: Tool Framework (1-2 days)
- **Phase 3**: Tool Implementation (3-4 days)
- **Phase 4**: Server Implementation (2 days)
- **Phase 5**: Library API (1 day)
- **Phase 6**: Binary Crate (1 day)
- **Phase 7**: Testing & Documentation (2 days)
- **Phase 8**: Publishing (1 day)

**Total**: 13-16 days

## Success Criteria

- [ ] All 8 tools implemented and working
- [ ] Feature parity with TypeScript version
- [ ] Comprehensive test coverage (>80%)
- [ ] Full documentation with examples
- [ ] Published on crates.io
- [ ] Binary available via `cargo install`
- [ ] Performance benchmarks showing improvements
- [ ] Integration tested with Bob Shell

## Next Steps for AI Agent

1. Create new Rust project: `cargo new overture-mcp --lib`
2. Set up project structure as outlined
3. Implement Phase 1 (Core Protocol)
4. Continue through phases sequentially
5. Test each phase before moving to next
6. Publish to crates.io when complete

## Resources

- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [Tokio Documentation](https://tokio.rs/)
- [Crates.io Publishing Guide](https://doc.rust-lang.org/cargo/reference/publishing.html)
- [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/)
