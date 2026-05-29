//! Integration tests for overture-mcp

use overture_mcp::{McpServer, tools::*};

#[test]
fn test_server_creation() {
    let server = McpServer::new("test-server".to_string(), "1.0.0".to_string());
    // Server should be created successfully
    drop(server);
}

#[test]
fn test_health_check_tool_creation() {
    let result = HealthCheckTool::new("http://localhost:8080".to_string());
    assert!(result.is_ok());
    
    let tool = result.unwrap();
    let def = tool.definition();
    assert_eq!(def.name, "overture_health_check");
    assert!(!def.description.is_empty());
}

#[test]
fn test_extract_check_tool_creation() {
    let result = ExtractCheckTool::new("http://localhost:8080".to_string());
    assert!(result.is_ok());
    
    let tool = result.unwrap();
    let def = tool.definition();
    assert_eq!(def.name, "overture_extract_check");
    assert!(!def.description.is_empty());
}

#[test]
fn test_extract_polygon_tool_creation() {
    let result = ExtractPolygonTool::new("http://localhost:8080".to_string());
    assert!(result.is_ok());
    
    let tool = result.unwrap();
    let def = tool.definition();
    assert_eq!(def.name, "overture_extract_polygon");
    assert!(!def.description.is_empty());
}

#[test]
fn test_tool_registry() {
    let mut registry = overture_mcp::ToolRegistry::new();
    assert_eq!(registry.len(), 0);
    assert!(registry.is_empty());
    
    registry.register(Box::new(
        HealthCheckTool::new("http://localhost:8080".to_string()).unwrap()
    ));
    
    assert_eq!(registry.len(), 1);
    assert!(!registry.is_empty());
    
    let tools = registry.list();
    assert_eq!(tools.len(), 1);
    assert_eq!(tools[0].name, "overture_health_check");
}

#[test]
fn test_multiple_tools_registration() {
    let mut registry = overture_mcp::ToolRegistry::new();
    
    registry.register(Box::new(
        HealthCheckTool::new("http://localhost:8080".to_string()).unwrap()
    ));
    registry.register(Box::new(
        ExtractCheckTool::new("http://localhost:8080".to_string()).unwrap()
    ));
    registry.register(Box::new(
        ExtractPolygonTool::new("http://localhost:8080".to_string()).unwrap()
    ));
    
    assert_eq!(registry.len(), 3);
    
    let tools = registry.list();
    assert_eq!(tools.len(), 3);
    
    let tool_names: Vec<String> = tools.iter().map(|t| t.name.clone()).collect();
    assert!(tool_names.contains(&"overture_health_check".to_string()));
    assert!(tool_names.contains(&"overture_extract_check".to_string()));
    assert!(tool_names.contains(&"overture_extract_polygon".to_string()));
}
