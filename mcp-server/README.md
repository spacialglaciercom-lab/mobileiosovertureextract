# Overture Maps MCP Server

Model Context Protocol (MCP) server for the Overture Maps road network extraction project. This server exposes all backend functions as MCP tools, enabling AI assistants like Bob Shell to interact with the extraction pipeline programmatically.

## Features

- ✅ **Health Check**: Monitor backend status and version
- ✅ **Cache Check**: Quickly check if extraction is cached
- ✅ **Full Extraction**: Extract road networks with real-time progress
- ✅ **Download Tools**: Get graph files and GeoJSON data
- ✅ **Statistics**: Retrieve graph metrics
- ✅ **Cache Management**: List and clear cached extractions

## Prerequisites

- Node.js 18.0.0 or higher
- Running Overture Maps backend (Rust or Python)
- npm or yarn package manager

## Installation

```bash
# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Edit .env with your backend URLs
nano .env

# Build the server
npm run build
```

## Configuration

Edit `.env` file:

```bash
# Backend URLs
OVERTURE_BACKEND_URL=http://localhost:8080
OVERTURE_WS_URL=ws://localhost:8080

# Logging
LOG_LEVEL=info
```

## Usage

### Standalone Mode

```bash
# Run the server
npm start

# Or run in development mode with auto-reload
npm run dev
```

### With Bob Shell

1. **Add to Bob Shell configuration** (`.bob/settings.json`):

```json
{
  "mcpServers": {
    "overture-maps": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server/dist/index.js"],
      "env": {
        "OVERTURE_BACKEND_URL": "http://localhost:8080",
        "OVERTURE_WS_URL": "ws://localhost:8080"
      },
      "trust": true
    }
  }
}
```

2. **Restart Bob Shell**

3. **List available tools**:
```bash
/tools list
```

You should see all `overture_*` tools.

## Available Tools

### 1. overture_health_check

Check backend health and version.

**Input:**
```json
{
  "backend_url": "http://localhost:8080"  // optional
}
```

**Output:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 2. overture_extract_check

Check if extraction is cached (fast, no extraction).

**Input:**
```json
{
  "polygon": {
    "type": "Feature",
    "geometry": {
      "type": "Polygon",
      "coordinates": [[[lng, lat], ...]]
    }
  }
}
```

**Output:**
```json
{
  "cached": true,
  "hash": "abc123...",
  "status": "complete",
  "nodes": 1234,
  "edges": 2345,
  "download_url": "/download/abc123",
  "geojson_url": "/geojson/abc123"
}
```

### 3. overture_extract_polygon

Full extraction with real-time progress (WebSocket).

**Input:**
```json
{
  "polygon": { /* GeoJSON Feature */ },
  "timeout_seconds": 300  // optional, default 300
}
```

**Output:**
```json
{
  "status": "complete",
  "hash": "abc123...",
  "nodes": 1234,
  "edges": 2345,
  "download_url": "/download/abc123",
  "geojson_url": "/geojson/abc123",
  "progress_stages": [
    {"stage": "downloading", "progress": 15},
    {"stage": "clipping", "progress": 50},
    {"stage": "building_graph", "progress": 85},
    {"stage": "complete", "progress": 100}
  ]
}
```

### 4. overture_download_graph

Download NetworkX-compatible graph file.

**Input:**
```json
{
  "hash": "abc123...",
  "output_path": "./road_network.gpickle"  // optional
}
```

**Output (with output_path):**
```json
{
  "success": true,
  "file_path": "/absolute/path/to/road_network.gpickle",
  "file_size_bytes": 1234567
}
```

**Output (without output_path):**
```json
{
  "success": true,
  "file_size_bytes": 1234567,
  "base64_data": "base64encodeddata..."
}
```

### 5. overture_download_geojson

Download GeoJSON road network data.

**Input:**
```json
{
  "hash": "abc123...",
  "output_path": "./road_network.geojson"  // optional
}
```

**Output (with output_path):**
```json
{
  "success": true,
  "file_path": "/absolute/path/to/road_network.geojson",
  "feature_count": 456
}
```

**Output (without output_path):**
```json
{
  "success": true,
  "geojson": { /* FeatureCollection */ },
  "feature_count": 456
}
```

### 6. overture_get_stats

Get graph statistics.

**Input:**
```json
{
  "hash": "abc123..."
}
```

**Output:**
```json
{
  "nodes": 1234,
  "edges": 2345,
  "density": 0.123,
  "is_connected": true
}
```

### 7. overture_list_cache

List all cached extractions (requires backend support).

**Input:**
```json
{}
```

**Output:**
```json
{
  "cached_extractions": [
    {
      "hash": "abc123...",
      "created_at": "2024-01-15T10:30:00Z",
      "nodes": 1234,
      "edges": 2345
    }
  ],
  "total_count": 1
}
```

### 8. overture_clear_cache

Clear cache entries (requires backend support).

**Input:**
```json
{
  "hash": "abc123..."  // optional, clears all if omitted
}
```

**Output:**
```json
{
  "success": true,
  "cleared_count": 1
}
```

## Usage Examples

### Example 1: Check and Extract

```typescript
// Check if cached
const check = await callTool('overture_extract_check', {
  polygon: myPolygon
});

if (check.cached) {
  console.log('Already cached!');
} else {
  // Perform extraction
  const result = await callTool('overture_extract_polygon', {
    polygon: myPolygon,
    timeout_seconds: 300
  });
  console.log('Extraction complete:', result);
}
```

### Example 2: Download and Analyze

```typescript
// Get statistics
const stats = await callTool('overture_get_stats', {
  hash: 'abc123...'
});
console.log(`Graph: ${stats.nodes} nodes, ${stats.edges} edges`);

// Download files
await callTool('overture_download_geojson', {
  hash: 'abc123...',
  output_path: './network.geojson'
});

await callTool('overture_download_graph', {
  hash: 'abc123...',
  output_path: './network.gpickle'
});
```

### Example 3: Using in Bob Shell

```bash
# In Bob Shell
> Extract road network for San Francisco downtown area

# Bob Shell will:
# 1. Create a polygon for the area
# 2. Call overture_extract_check to see if cached
# 3. If not cached, call overture_extract_polygon
# 4. Download results using overture_download_geojson
# 5. Analyze the network using overture_get_stats
```

## Development

### Project Structure

```
mcp-server/
├── src/
│   ├── index.ts              # Main server entry point
│   ├── types/
│   │   └── index.ts          # TypeScript type definitions
│   ├── services/
│   │   ├── api-client.ts     # HTTP client for backend
│   │   └── websocket-client.ts # WebSocket client
│   └── tools/
│       ├── health.ts         # Health check tool
│       ├── extract.ts        # Extraction tools
│       ├── download.ts       # Download tools
│       ├── stats.ts          # Statistics tool
│       └── cache.ts          # Cache management tools
├── dist/                     # Compiled JavaScript (generated)
├── package.json
├── tsconfig.json
└── README.md
```

### Scripts

```bash
# Build
npm run build

# Development mode (watch)
npm run dev

# Run tests
npm test

# Run tests with coverage
npm test:coverage

# Lint
npm run lint

# Format code
npm run format
```

### Adding New Tools

1. Create tool file in `src/tools/`:

```typescript
// src/tools/my-tool.ts
import { Tool, ToolResponse } from '../types/index.js';

export const myTool: Tool = {
  definition: {
    name: 'overture_my_tool',
    description: 'Description of my tool',
    inputSchema: {
      type: 'object',
      required: ['param1'],
      properties: {
        param1: {
          type: 'string',
          description: 'Parameter description',
        },
      },
    },
  },
  handler: async (args) => {
    // Implementation
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  },
};
```

2. Register in `src/index.ts`:

```typescript
import { myTool } from './tools/my-tool.js';

const tools = [
  // ... existing tools
  myTool,
];
```

## Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- health.test.ts

# Run with coverage
npm test:coverage
```

## Troubleshooting

### Server won't start

- Check Node.js version: `node --version` (must be >= 18.0.0)
- Verify backend is running: `curl http://localhost:8080/health`
- Check environment variables in `.env`

### Tools not appearing in Bob Shell

- Verify MCP server configuration in `.bob/settings.json`
- Check absolute path to `dist/index.js`
- Restart Bob Shell after configuration changes
- Check Bob Shell logs for errors

### WebSocket connection fails

- Ensure backend WebSocket endpoint is accessible
- Check firewall settings
- Verify `OVERTURE_WS_URL` in `.env`

### Cache tools not working

- Cache management endpoints may not be implemented in backend yet
- Check backend version and documentation
- See `MCP_TOOLS_IMPLEMENTATION_PLAN.md` for backend requirements

## Backend Requirements

The MCP server requires a running Overture Maps backend with these endpoints:

- `GET /health` - Health check
- `POST /extract` - Cache check
- `WS /ws/extract` - Full extraction with progress
- `GET /geojson/:hash` - Download GeoJSON
- `GET /download/:hash` - Download graph file
- `GET /stats/:hash` - Get statistics
- `GET /cache` - List cache (optional)
- `DELETE /cache/:hash` - Clear cache (optional)

See the Rust backend in `../rust-backend/` for a complete implementation.

## License

MIT

## Related Documentation

- [Implementation Plan](../MCP_TOOLS_IMPLEMENTATION_PLAN.md)
- [Rust Backend README](../rust-backend/README.md)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/sdk)
- [Bob Shell Documentation](https://docs.bobshell.ai/)
