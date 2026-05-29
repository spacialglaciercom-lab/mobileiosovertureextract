//! Basic MCP server example

use overture_mcp::{McpServer, tools::*};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Create server
    let mut server = McpServer::new(
        "overture-maps-extractor".to_string(),
        env!("CARGO_PKG_VERSION").to_string(),
    );

    // Get backend URL from environment or use default
    let backend_url = std::env::var("OVERTURE_BACKEND_URL")
        .unwrap_or_else(|_| "http://localhost:8080".to_string());

    // Register tools
    server.register_tool(Box::new(
        HealthCheckTool::new(backend_url.clone())?
    ));
    
    server.register_tool(Box::new(
        ExtractCheckTool::new(backend_url.clone())?
    ));
    
    server.register_tool(Box::new(
        ExtractPolygonTool::new(backend_url.clone())?
    ));

    eprintln!("MCP Server starting with backend: {}", backend_url);
    eprintln!("Registered {} tools", 3);

    // Run server
    server.run().await?;

    Ok(())
}
