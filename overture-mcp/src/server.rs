//! MCP server implementation

use crate::error::Result;
use crate::protocol::types::{
    InitializeResult, JsonRpcError, JsonRpcRequest, JsonRpcResponse, ServerCapabilities,
    ServerInfo,
};
use crate::tools::ToolRegistry;
use crate::transport::StdioTransport;

/// MCP server
pub struct McpServer {
    name: String,
    version: String,
    tools: ToolRegistry,
}

impl McpServer {
    /// Create a new MCP server
    pub fn new(name: String, version: String) -> Self {
        Self {
            name,
            version,
            tools: ToolRegistry::new(),
        }
    }

    /// Register a tool
    pub fn register_tool(&mut self, tool: Box<dyn crate::tools::Tool>) {
        self.tools.register(tool);
    }

    /// Run the server (blocking)
    pub async fn run(&self) -> Result<()> {
        let mut transport = StdioTransport::new();

        #[cfg(feature = "logging")]
        tracing::info!("MCP Server {} v{} starting...", self.name, self.version);
        #[cfg(feature = "logging")]
        tracing::info!("Registered {} tools", self.tools.len());

        loop {
            let request = match transport.read_request().await {
                Ok(req) => req,
                Err(e) => {
                    #[cfg(feature = "logging")]
                    tracing::error!("Failed to read request: {}", e);
                    continue;
                }
            };

            #[cfg(feature = "logging")]
            tracing::debug!("Received request: {}", request.method);

            let response = self.handle_request(request).await;
            
            if let Err(e) = transport.write_response(&response).await {
                #[cfg(feature = "logging")]
                tracing::error!("Failed to write response: {}", e);
            }
        }
    }

    /// Handle a JSON-RPC request
    async fn handle_request(&self, request: JsonRpcRequest) -> JsonRpcResponse {
        match request.method.as_str() {
            "initialize" => self.handle_initialize(request),
            "tools/list" => self.handle_tools_list(request),
            "tools/call" => self.handle_tools_call(request).await,
            _ => JsonRpcResponse::error(
                request.id,
                JsonRpcError::method_not_found(&request.method),
            ),
        }
    }

    /// Handle initialize request
    fn handle_initialize(&self, request: JsonRpcRequest) -> JsonRpcResponse {
        let result = InitializeResult {
            protocol_version: "2024-11-05".to_string(),
            capabilities: ServerCapabilities::default(),
            server_info: ServerInfo {
                name: self.name.clone(),
                version: self.version.clone(),
            },
        };

        JsonRpcResponse::success(
            request.id,
            serde_json::to_value(result).unwrap_or_default(),
        )
    }

    /// Handle tools/list request
    fn handle_tools_list(&self, request: JsonRpcRequest) -> JsonRpcResponse {
        let tools = self.tools.list();
        let result = serde_json::json!({ "tools": tools });

        JsonRpcResponse::success(request.id, result)
    }

    /// Handle tools/call request
    async fn handle_tools_call(&self, request: JsonRpcRequest) -> JsonRpcResponse {
        let params = match request.params {
            Some(p) => p,
            None => {
                return JsonRpcResponse::error(
                    request.id,
                    JsonRpcError::invalid_params("Missing params"),
                );
            }
        };

        let name = match params.get("name").and_then(|v| v.as_str()) {
            Some(n) => n,
            None => {
                return JsonRpcResponse::error(
                    request.id,
                    JsonRpcError::invalid_params("Missing tool name"),
                );
            }
        };

        let args = params
            .get("arguments")
            .cloned()
            .unwrap_or(serde_json::json!({}));

        match self.tools.execute(name, args).await {
            Ok(result) => JsonRpcResponse::success(
                request.id,
                serde_json::to_value(result).unwrap_or_default(),
            ),
            Err(e) => JsonRpcResponse::error(request.id, JsonRpcError::server_error(&e.to_string())),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_server_creation() {
        let server = McpServer::new("test-server".to_string(), "1.0.0".to_string());
        assert_eq!(server.name, "test-server");
        assert_eq!(server.version, "1.0.0");
        assert_eq!(server.tools.len(), 0);
    }
}
