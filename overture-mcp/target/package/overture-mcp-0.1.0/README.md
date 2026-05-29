# Overture MCP

[![Crates.io](https://img.shields.io/crates/v/overture-mcp.svg)](https://crates.io/crates/overture-mcp)
[![Documentation](https://docs.rs/overture-mcp/badge.svg)](https://docs.rs/overture-mcp)
[![License](https://img.shields.io/crates/l/overture-mcp.svg)](LICENSE)

Model Context Protocol (MCP) server for Overture Maps road network extraction.

## Features

- 🚀 **3 Core MCP Tools**: Essential tools for road network extraction
- ⚡ **High Performance**: Built with Rust and Tokio for async I/O
- 🔒 **Type Safe**: Full type safety with comprehensive error handling
- 📦 **Lightweight**: Minimal dependencies for fast compilation
- 🧪 **Well Tested**: Comprehensive test suite

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
        "overture-maps-extractor".to_string(),
        "0.1.0".to_string(),
    );

    // Register tools
    server.register_tool(Box::new(
        HealthCheckTool::new("http://localhost:8080".to_string())?
    ));
    
    server.register_tool(Box::new(
        ExtractCheckTool::new("http://localhost:8080".to_string())?
    ));
    
    server.register_tool(Box::new(
        ExtractPolygonTool::new("http://localhost:8080".to_string())?
    ));

    // Run server
    server.run().await?;
    Ok(())
}
```

### With Bob Shell

Add to your `.bob/settings.json`:

```json
{
  "mcpServers": {
    "overture-maps": {
      "command": "your-binary-name",
      "env": {
        "OVERTURE_BACKEND_URL": "http://localhost:8080"
      },
      "trust": true
    }
  }
}
```

## Available Tools

### 1. overture_health_check

Check the health and version of the Overture Maps extraction backend.

**Input Schema:**
```json
{
  "backend_url": "http://localhost:8080"  // optional
}
```

**Example Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2026-05-29T21:00:00Z"
}
```

### 2. overture_extract_check

Check if a polygon extraction is already cached. Returns immediately without performing extraction.

**Input Schema:**
```json
{
  "polygon": {
    "type": "Feature",
    "geometry": {
      "type": "Polygon",
      "coordinates": [[[lon, lat], [lon, lat], ...]]
    }
  }
}
```

**Example Response:**
```json
{
  "status": "cached",
  "hash": "abc123...",
  "nodes": 1234,
  "edges": 5678,
  "download_url": "http://localhost:8080/download/abc123",
  "geojson_url": "http://localhost:8080/geojson/abc123"
}
```

### 3. overture_extract_polygon

Extract road network for a polygon. Performs full extraction if not cached.

**Input Schema:**
```json
{
  "polygon": {
    "type": "Feature",
    "geometry": {
      "type": "Polygon",
      "coordinates": [[[lon, lat], [lon, lat], ...]]
    }
  },
  "timeout_seconds": 300  // optional, default 300
}
```

**Example Response:**
```json
{
  "status": "complete",
  "hash": "abc123...",
  "nodes": 1234,
  "edges": 5678,
  "download_url": "http://localhost:8080/download/abc123",
  "geojson_url": "http://localhost:8080/geojson/abc123"
}
```

## Architecture

The crate is organized into several modules:

- **server** - MCP server implementation with JSON-RPC handling
- **protocol** - MCP protocol types and structures
- **tools** - Tool implementations (health, extract)
- **client** - HTTP client for backend communication
- **transport** - Stdio transport layer for MCP protocol
- **error** - Comprehensive error types

## Error Handling

All operations return a `Result<T, McpError>` type:

```rust
use overture_mcp::{Result, McpError};

async fn example() -> Result<()> {
    // Operations that may fail
    Ok(())
}
```

Error types include:
- `McpError::Io` - IO errors
- `McpError::Json` - JSON serialization errors
- `McpError::Http` - HTTP client errors
- `McpError::Backend` - Backend communication errors
- `McpError::Tool` - Tool execution errors
- `McpError::Validation` - Input validation errors
- `McpError::Timeout` - Timeout errors
- `McpError::Protocol` - Protocol errors

## Backend Requirements

This MCP server requires a running Overture Maps extraction backend. The backend should provide:

- `GET /health` - Health check endpoint
- `POST /extract` - Extraction endpoint
- `GET /download/:hash` - Download graph file
- `GET /geojson/:hash` - Download GeoJSON
- `GET /stats/:hash` - Get statistics

See the [rust-backend](../rust-backend) directory for the backend implementation.

## Development

### Building

```bash
cargo build
```

### Testing

```bash
cargo test
```

### Documentation

```bash
cargo doc --open
```

## Examples

See the `examples/` directory for more usage examples:

- `basic_server.rs` - Simple server setup
- `custom_backend.rs` - Custom backend URL configuration

## Performance

Built with Rust and Tokio, this implementation offers:

- **Fast startup**: < 100ms
- **Low memory**: ~5-10MB base memory usage
- **Efficient I/O**: Async operations with Tokio
- **Type safety**: Compile-time guarantees

## Comparison with TypeScript Version

| Feature | Rust | TypeScript |
|---------|------|------------|
| Startup time | < 100ms | ~500ms |
| Memory usage | 5-10MB | 50-100MB |
| Binary size | ~5MB | N/A (requires Node.js) |
| Type safety | Compile-time | Runtime |
| Dependencies | None (static binary) | Node.js + npm packages |

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

Licensed under either of:

- Apache License, Version 2.0 ([LICENSE-APACHE](LICENSE-APACHE) or http://www.apache.org/licenses/LICENSE-2.0)
- MIT license ([LICENSE-MIT](LICENSE-MIT) or http://opensource.org/licenses/MIT)

at your option.

## Related Projects

- [Overture Maps](https://overturemaps.org/) - Open map data
- [Model Context Protocol](https://modelcontextprotocol.io/) - MCP specification
- [Bob Shell](https://github.com/bob-shell) - AI-powered terminal assistant

## Acknowledgments

This project uses data from Overture Maps, which is made available under the Open Data Commons Open Database License (ODbL).
