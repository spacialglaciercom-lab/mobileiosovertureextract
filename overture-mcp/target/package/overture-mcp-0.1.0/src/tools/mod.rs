//! MCP tool implementations

use async_trait::async_trait;
use serde_json::Value;

use crate::error::Result;
use crate::protocol::types::{Tool as ToolDef, ToolResult};

pub mod health;
pub mod extract;

pub use health::HealthCheckTool;
pub use extract::{ExtractCheckTool, ExtractPolygonTool};

/// Trait for MCP tools
#[async_trait]
pub trait Tool: Send + Sync {
    /// Get tool definition
    fn definition(&self) -> ToolDef;

    /// Execute tool with given arguments
    async fn execute(&self, args: Value) -> Result<ToolResult>;
}

/// Tool registry for managing multiple tools
pub struct ToolRegistry {
    tools: Vec<Box<dyn Tool>>,
}

impl ToolRegistry {
    /// Create a new empty registry
    pub fn new() -> Self {
        Self { tools: Vec::new() }
    }

    /// Register a tool
    pub fn register(&mut self, tool: Box<dyn Tool>) {
        self.tools.push(tool);
    }

    /// List all registered tools
    pub fn list(&self) -> Vec<ToolDef> {
        self.tools.iter().map(|t| t.definition()).collect()
    }

    /// Execute a tool by name
    pub async fn execute(&self, name: &str, args: Value) -> Result<ToolResult> {
        let tool = self
            .tools
            .iter()
            .find(|t| t.definition().name == name)
            .ok_or_else(|| crate::error::McpError::tool(format!("Tool not found: {}", name)))?;

        tool.execute(args).await
    }

    /// Get number of registered tools
    pub fn len(&self) -> usize {
        self.tools.len()
    }

    /// Check if registry is empty
    pub fn is_empty(&self) -> bool {
        self.tools.is_empty()
    }
}

impl Default for ToolRegistry {
    fn default() -> Self {
        Self::new()
    }
}
