//! Stdio transport for MCP protocol

use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};

use crate::error::Result;
use crate::protocol::types::{JsonRpcRequest, JsonRpcResponse};

/// Stdio transport for JSON-RPC communication
pub struct StdioTransport {
    reader: BufReader<tokio::io::Stdin>,
    writer: tokio::io::Stdout,
}

impl StdioTransport {
    /// Create a new stdio transport
    pub fn new() -> Self {
        Self {
            reader: BufReader::new(tokio::io::stdin()),
            writer: tokio::io::stdout(),
        }
    }

    /// Read a JSON-RPC request from stdin
    pub async fn read_request(&mut self) -> Result<JsonRpcRequest> {
        let mut line = String::new();
        self.reader.read_line(&mut line).await?;
        
        if line.trim().is_empty() {
            return Err(crate::error::McpError::protocol("Empty request"));
        }

        let request = serde_json::from_str(&line)?;
        Ok(request)
    }

    /// Write a JSON-RPC response to stdout
    pub async fn write_response(&mut self, response: &JsonRpcResponse) -> Result<()> {
        let json = serde_json::to_string(response)?;
        self.writer.write_all(json.as_bytes()).await?;
        self.writer.write_all(b"\n").await?;
        self.writer.flush().await?;
        Ok(())
    }
}

impl Default for StdioTransport {
    fn default() -> Self {
        Self::new()
    }
}
