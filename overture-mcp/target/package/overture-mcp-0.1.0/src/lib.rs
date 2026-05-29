//! # Overture MCP
//!
//! Model Context Protocol (MCP) server for Overture Maps road network extraction.
//!
//! This crate provides a minimal viable implementation of an MCP server with essential
//! tools for interacting with the Overture Maps extraction backend.
//!
//! ## Features
//!
//! - **3 Core MCP Tools**: Health check and extraction tools
//! - **Async/Await**: Built with Tokio for efficient async I/O
//! - **Type Safe**: Full type safety with comprehensive error handling
//! - **Lightweight**: Minimal dependencies for fast compilation
//!
//! ## Quick Start
//!
//! ```rust,no_run
//! use overture_mcp::{McpServer, tools::*};
//!
//! #[tokio::main]
//! async fn main() -> Result<(), Box<dyn std::error::Error>> {
//!     let mut server = McpServer::new(
//!         "overture-maps-extractor".to_string(),
//!         "0.1.0".to_string(),
//!     );
//!
//!     // Register tools
//!     server.register_tool(Box::new(
//!         HealthCheckTool::new("http://localhost:8080".to_string())?
//!     ));
//!     
//!     server.register_tool(Box::new(
//!         ExtractCheckTool::new("http://localhost:8080".to_string())?
//!     ));
//!     
//!     server.register_tool(Box::new(
//!         ExtractPolygonTool::new("http://localhost:8080".to_string())?
//!     ));
//!
//!     // Run server
//!     server.run().await?;
//!     Ok(())
//! }
//! ```
//!
//! ## Available Tools
//!
//! 1. **overture_health_check** - Check backend health and version
//! 2. **overture_extract_check** - Check if extraction is cached
//! 3. **overture_extract_polygon** - Extract road network for a polygon
//!
//! ## Architecture
//!
//! The crate is organized into several modules:
//!
//! - [`server`] - MCP server implementation
//! - [`protocol`] - MCP protocol types and JSON-RPC handling
//! - [`tools`] - Tool implementations
//! - [`client`] - HTTP client for backend communication
//! - [`transport`] - Stdio transport layer
//! - [`error`] - Error types
//!
//! ## Error Handling
//!
//! All operations return a [`Result`] type with [`McpError`] for comprehensive
//! error handling.
//!
//! ## License
//!
//! Licensed under either of Apache License, Version 2.0 or MIT license at your option.

pub mod client;
pub mod error;
pub mod protocol;
pub mod server;
pub mod tools;
pub mod transport;

// Re-exports for convenience
pub use error::{McpError, Result};
pub use protocol::types::*;
pub use server::McpServer;
pub use tools::{ExtractCheckTool, ExtractPolygonTool, HealthCheckTool, Tool, ToolRegistry};