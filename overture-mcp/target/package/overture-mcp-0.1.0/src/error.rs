//! Error types for the MCP server

use thiserror::Error;

/// Result type alias for MCP operations
pub type Result<T> = std::result::Result<T, McpError>;

/// Main error type for MCP operations
#[derive(Error, Debug)]
pub enum McpError {
    /// IO error
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    /// JSON serialization/deserialization error
    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),

    /// HTTP client error
    #[error("HTTP error: {0}")]
    Http(#[from] reqwest::Error),

    /// WebSocket error
    #[error("WebSocket error: {0}")]
    WebSocket(String),

    /// Backend communication error
    #[error("Backend error: {0}")]
    Backend(String),

    /// Tool execution error
    #[error("Tool error: {0}")]
    Tool(String),

    /// Validation error
    #[error("Validation error: {0}")]
    Validation(String),

    /// Timeout error
    #[error("Timeout error: {0}")]
    Timeout(String),

    /// Protocol error
    #[error("Protocol error: {0}")]
    Protocol(String),
}

impl McpError {
    /// Create a backend error
    pub fn backend<S: Into<String>>(msg: S) -> Self {
        Self::Backend(msg.into())
    }

    /// Create a tool error
    pub fn tool<S: Into<String>>(msg: S) -> Self {
        Self::Tool(msg.into())
    }

    /// Create a validation error
    pub fn validation<S: Into<String>>(msg: S) -> Self {
        Self::Validation(msg.into())
    }

    /// Create a timeout error
    pub fn timeout<S: Into<String>>(msg: S) -> Self {
        Self::Timeout(msg.into())
    }

    /// Create a protocol error
    pub fn protocol<S: Into<String>>(msg: S) -> Self {
        Self::Protocol(msg.into())
    }
}
