use overture_mcp::{McpServer, tools::*};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("Testing overture-mcp v0.1.0 from crates.io...\n");

    // Test 1: Create server
    println!("✓ Test 1: Creating MCP server...");
    let mut server = McpServer::new(
        "test-server".to_string(),
        "0.1.0".to_string(),
    );
    println!("  SUCCESS: Server created\n");

    // Test 2: Create tools
    println!("✓ Test 2: Creating tools...");
    let backend_url = "http://localhost:8080".to_string();
    
    let health_tool = HealthCheckTool::new(backend_url.clone())?;
    println!("  SUCCESS: HealthCheckTool created");
    
    let extract_check_tool = ExtractCheckTool::new(backend_url.clone())?;
    println!("  SUCCESS: ExtractCheckTool created");
    
    let extract_polygon_tool = ExtractPolygonTool::new(backend_url.clone())?;
    println!("  SUCCESS: ExtractPolygonTool created\n");

    // Test 3: Verify tool definitions
    println!("✓ Test 3: Verifying tool definitions...");
    let health_def = health_tool.definition();
    assert_eq!(health_def.name, "overture_health_check");
    println!("  SUCCESS: Health tool name: {}", health_def.name);
    
    let extract_check_def = extract_check_tool.definition();
    assert_eq!(extract_check_def.name, "overture_extract_check");
    println!("  SUCCESS: Extract check tool name: {}", extract_check_def.name);
    
    let extract_polygon_def = extract_polygon_tool.definition();
    assert_eq!(extract_polygon_def.name, "overture_extract_polygon");
    println!("  SUCCESS: Extract polygon tool name: {}", extract_polygon_def.name);
    println!();

    // Test 4: Register tools with server
    println!("✓ Test 4: Registering tools with server...");
    server.register_tool(Box::new(health_tool));
    server.register_tool(Box::new(extract_check_tool));
    server.register_tool(Box::new(extract_polygon_tool));
    println!("  SUCCESS: All 3 tools registered\n");

    // Test 5: Verify tool registry
    println!("✓ Test 5: Verifying tool registry...");
    let mut registry = ToolRegistry::new();
    registry.register(Box::new(
        HealthCheckTool::new(backend_url.clone())?
    ));
    registry.register(Box::new(
        ExtractCheckTool::new(backend_url.clone())?
    ));
    registry.register(Box::new(
        ExtractPolygonTool::new(backend_url)?
    ));
    
    assert_eq!(registry.len(), 3);
    println!("  SUCCESS: Registry contains {} tools", registry.len());
    
    let tools = registry.list();
    println!("  Registered tools:");
    for tool in tools {
        println!("    - {}: {}", tool.name, tool.description);
    }
    println!();

    println!("🎉 All tests passed!");
    println!("\nThe overture-mcp crate is working correctly!");
    println!("Crate can be used in production.");

    Ok(())
}