# MCP Tools Implementation Plan for Overture Maps Extractor

## Overview

This document outlines the implementation plan for creating Model Context Protocol (MCP) tools that expose all functions of the Overture Maps road network extraction project. The MCP server will enable AI assistants like Bob Shell to interact with the extraction backend programmatically.

## Project Architecture Analysis

### Backend Components (Rust)

The Rust backend (`rust-backend/`) provides the following capabilities:

1. **Health Check** (`/health`)
   - Check backend status and version
   
2. **Extraction Pipeline** (`/extract`, `/ws/extract`)
   - REST endpoint for cache-check only
   - WebSocket endpoint for full extraction with progress updates
   
3. **Data Download** (`/download/:hash`, `/geojson/:hash`)
   - Download NetworkX-compatible graph files (.gpickle)
   - Download GeoJSON road network data
   
4. **Statistics** (`/stats/:hash`)
   - Get graph statistics (nodes, edges, density, connectivity)

5. **Core Services**
   - **Cache Manager**: Store and retrieve extraction results
   - **Overture Service**: Fetch data from Overture Maps S3
   - **Clipper**: Clip road segments to polygon boundaries
   - **Graph Builder**: Build NetworkX-compatible road graphs

### Frontend Components (React Native)

The frontend (`src/`) provides:

1. **ApiService** (`src/services/ApiService.ts`)
   - REST API client for backend communication
   - Methods: healthCheck, extractPolygon, downloadGeoJson, getStats
   
2. **WebSocketService** (`src/services/WebSocketService.ts`)
   - WebSocket client for real-time extraction progress
   - Methods: connect, sendPolygon, disconnect, isConnected

## MCP Server Design

### Server Architecture

```
mcp-server/
├── src/
│   ├── index.ts              # Main MCP server entry point
│   ├── tools/
│   │   ├── health.ts         # Health check tool
│   │   ├── extract.ts        # Extraction tools (REST + WebSocket)
│   │   ├── download.ts       # Download tools
│   │   ├── stats.ts          # Statistics tool
│   │   └── cache.ts          # Cache management tools
│   ├── services/
│   │   ├── api-client.ts     # HTTP client wrapper
│   │   └── websocket-client.ts # WebSocket client wrapper
│   ├── types/
│   │   └── index.ts          # TypeScript type definitions
│   └── utils/
│       ├── validation.ts     # Input validation
│       └── formatting.ts     # Output formatting
├── package.json
├── tsconfig.json
└── README.md
```

### MCP Tools Definition

#### 1. Health Check Tool

**Tool Name**: `overture_health_check`

**Description**: Check the health and version of the Overture Maps extraction backend.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "backend_url": {
      "type": "string",
      "description": "Backend URL (optional, defaults to configured URL)",
      "format": "uri"
    }
  }
}
```

**Output Schema**:
```json
{
  "type": "object",
  "properties": {
    "status": {
      "type": "string",
      "enum": ["healthy", "unhealthy"]
    },
    "version": {
      "type": "string"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    }
  }
}
```

#### 2. Extract Polygon (Cache Check)

**Tool Name**: `overture_extract_check`

**Description**: Check if a polygon extraction is already cached. Returns immediately without performing extraction.

**Input Schema**:
```json
{
  "type": "object",
  "required": ["polygon"],
  "properties": {
    "polygon": {
      "type": "object",
      "description": "GeoJSON Polygon Feature",
      "required": ["type", "geometry"],
      "properties": {
        "type": {
          "type": "string",
          "enum": ["Feature"]
        },
        "geometry": {
          "type": "object",
          "required": ["type", "coordinates"],
          "properties": {
            "type": {
              "type": "string",
              "enum": ["Polygon"]
            },
            "coordinates": {
              "type": "array",
              "description": "Array of linear rings (first is exterior, rest are holes)",
              "items": {
                "type": "array",
                "items": {
                  "type": "array",
                  "items": {
                    "type": "number"
                  },
                  "minItems": 2,
                  "maxItems": 2
                }
              }
            }
          }
        }
      }
    },
    "backend_url": {
      "type": "string",
      "description": "Backend URL (optional)",
      "format": "uri"
    }
  }
}
```

**Output Schema**:
```json
{
  "type": "object",
  "properties": {
    "cached": {
      "type": "boolean"
    },
    "hash": {
      "type": "string",
      "description": "Unique hash for this polygon"
    },
    "status": {
      "type": "string",
      "enum": ["complete", "pending"]
    },
    "nodes": {
      "type": "integer",
      "description": "Number of nodes (if cached)"
    },
    "edges": {
      "type": "integer",
      "description": "Number of edges (if cached)"
    },
    "download_url": {
      "type": "string",
      "description": "URL to download graph file (if cached)"
    },
    "geojson_url": {
      "type": "string",
      "description": "URL to download GeoJSON (if cached)"
    }
  }
}
```

#### 3. Extract Polygon (Full Pipeline)

**Tool Name**: `overture_extract_polygon`

**Description**: Extract road network for a polygon with real-time progress updates. This performs the full extraction pipeline if not cached.

**Input Schema**:
```json
{
  "type": "object",
  "required": ["polygon"],
  "properties": {
    "polygon": {
      "type": "object",
      "description": "GeoJSON Polygon Feature (same as extract_check)"
    },
    "backend_url": {
      "type": "string",
      "description": "Backend WebSocket URL (optional)",
      "format": "uri"
    },
    "timeout_seconds": {
      "type": "integer",
      "description": "Maximum time to wait for extraction (default: 300)",
      "minimum": 30,
      "maximum": 3600,
      "default": 300
    }
  }
}
```

**Output Schema**:
```json
{
  "type": "object",
  "properties": {
    "status": {
      "type": "string",
      "enum": ["complete", "error", "timeout"]
    },
    "hash": {
      "type": "string"
    },
    "progress_stages": {
      "type": "array",
      "description": "List of progress updates received",
      "items": {
        "type": "object",
        "properties": {
          "stage": {
            "type": "string",
            "enum": ["downloading", "clipping", "building_graph", "complete", "error"]
          },
          "progress": {
            "type": "number",
            "minimum": 0,
            "maximum": 100
          },
          "message": {
            "type": "string"
          }
        }
      }
    },
    "nodes": {
      "type": "integer"
    },
    "edges": {
      "type": "integer"
    },
    "download_url": {
      "type": "string"
    },
    "geojson_url": {
      "type": "string"
    },
    "error": {
      "type": "string",
      "description": "Error message if status is 'error'"
    }
  }
}
```

#### 4. Download Graph

**Tool Name**: `overture_download_graph`

**Description**: Download the NetworkX-compatible graph file (.gpickle) for a cached extraction.

**Input Schema**:
```json
{
  "type": "object",
  "required": ["hash"],
  "properties": {
    "hash": {
      "type": "string",
      "description": "Extraction hash from extract operation"
    },
    "output_path": {
      "type": "string",
      "description": "Local file path to save the graph (optional, returns base64 if not provided)"
    },
    "backend_url": {
      "type": "string",
      "format": "uri"
    }
  }
}
```

**Output Schema**:
```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean"
    },
    "file_path": {
      "type": "string",
      "description": "Path where file was saved (if output_path provided)"
    },
    "file_size_bytes": {
      "type": "integer"
    },
    "base64_data": {
      "type": "string",
      "description": "Base64-encoded graph data (if output_path not provided)"
    }
  }
}
```

#### 5. Download GeoJSON

**Tool Name**: `overture_download_geojson`

**Description**: Download the GeoJSON road network data for a cached extraction.

**Input Schema**:
```json
{
  "type": "object",
  "required": ["hash"],
  "properties": {
    "hash": {
      "type": "string",
      "description": "Extraction hash from extract operation"
    },
    "output_path": {
      "type": "string",
      "description": "Local file path to save the GeoJSON (optional, returns data if not provided)"
    },
    "backend_url": {
      "type": "string",
      "format": "uri"
    }
  }
}
```

**Output Schema**:
```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean"
    },
    "file_path": {
      "type": "string",
      "description": "Path where file was saved (if output_path provided)"
    },
    "geojson": {
      "type": "object",
      "description": "GeoJSON FeatureCollection (if output_path not provided)"
    },
    "feature_count": {
      "type": "integer",
      "description": "Number of road segments"
    }
  }
}
```

#### 6. Get Statistics

**Tool Name**: `overture_get_stats`

**Description**: Get graph statistics for a cached extraction.

**Input Schema**:
```json
{
  "type": "object",
  "required": ["hash"],
  "properties": {
    "hash": {
      "type": "string",
      "description": "Extraction hash from extract operation"
    },
    "backend_url": {
      "type": "string",
      "format": "uri"
    }
  }
}
```

**Output Schema**:
```json
{
  "type": "object",
  "properties": {
    "nodes": {
      "type": "integer",
      "description": "Number of nodes in the graph"
    },
    "edges": {
      "type": "integer",
      "description": "Number of edges in the graph"
    },
    "density": {
      "type": "number",
      "description": "Graph density (0-1)"
    },
    "is_connected": {
      "type": "boolean",
      "description": "Whether the graph is fully connected"
    }
  }
}
```

#### 7. List Cache

**Tool Name**: `overture_list_cache`

**Description**: List all cached extractions (requires backend support - may need to be added).

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "backend_url": {
      "type": "string",
      "format": "uri"
    }
  }
}
```

**Output Schema**:
```json
{
  "type": "object",
  "properties": {
    "cached_extractions": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "hash": {
            "type": "string"
          },
          "created_at": {
            "type": "string",
            "format": "date-time"
          },
          "nodes": {
            "type": "integer"
          },
          "edges": {
            "type": "integer"
          }
        }
      }
    },
    "total_count": {
      "type": "integer"
    }
  }
}
```

#### 8. Clear Cache

**Tool Name**: `overture_clear_cache`

**Description**: Clear a specific cached extraction or all cache (requires backend support - may need to be added).

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "hash": {
      "type": "string",
      "description": "Specific hash to clear (optional, clears all if not provided)"
    },
    "backend_url": {
      "type": "string",
      "format": "uri"
    }
  }
}
```

**Output Schema**:
```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean"
    },
    "cleared_count": {
      "type": "integer",
      "description": "Number of cache entries cleared"
    }
  }
}
```

## Implementation Details

### Technology Stack

- **Language**: TypeScript/Node.js
- **MCP SDK**: `@modelcontextprotocol/sdk`
- **HTTP Client**: `axios` or `node-fetch`
- **WebSocket Client**: `ws`
- **Validation**: `ajv` (JSON Schema validation)

### Project Structure

```typescript
// src/index.ts - Main MCP server
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { healthCheckTool } from './tools/health.js';
import { extractCheckTool, extractPolygonTool } from './tools/extract.js';
import { downloadGraphTool, downloadGeoJsonTool } from './tools/download.js';
import { getStatsTool } from './tools/stats.js';
import { listCacheTool, clearCacheTool } from './tools/cache.js';

const server = new Server(
  {
    name: 'overture-maps-extractor',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register all tools
const tools = [
  healthCheckTool,
  extractCheckTool,
  extractPolygonTool,
  downloadGraphTool,
  downloadGeoJsonTool,
  getStatsTool,
  listCacheTool,
  clearCacheTool,
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: tools.map(tool => tool.definition),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const tool = tools.find(t => t.definition.name === request.params.name);
  if (!tool) {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }
  return await tool.handler(request.params.arguments);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Overture Maps MCP server running on stdio');
}

main().catch(console.error);
```

### Tool Implementation Example

```typescript
// src/tools/health.ts
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ApiClient } from '../services/api-client.js';

export const healthCheckTool = {
  definition: {
    name: 'overture_health_check',
    description: 'Check the health and version of the Overture Maps extraction backend',
    inputSchema: {
      type: 'object',
      properties: {
        backend_url: {
          type: 'string',
          description: 'Backend URL (optional, defaults to configured URL)',
          format: 'uri',
        },
      },
    },
  },
  handler: async (args: any) => {
    const client = new ApiClient(args.backend_url);
    try {
      const result = await client.healthCheck();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              status: 'healthy',
              version: result.version,
              timestamp: new Date().toISOString(),
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              status: 'unhealthy',
              error: error.message,
              timestamp: new Date().toISOString(),
            }, null, 2),
          },
        ],
        isError: true,
      };
    }
  },
};
```

### WebSocket Tool Implementation

```typescript
// src/tools/extract.ts
import { WebSocketClient } from '../services/websocket-client.js';

export const extractPolygonTool = {
  definition: {
    name: 'overture_extract_polygon',
    description: 'Extract road network for a polygon with real-time progress updates',
    inputSchema: {
      type: 'object',
      required: ['polygon'],
      properties: {
        polygon: {
          type: 'object',
          description: 'GeoJSON Polygon Feature',
        },
        backend_url: {
          type: 'string',
          format: 'uri',
        },
        timeout_seconds: {
          type: 'integer',
          default: 300,
          minimum: 30,
          maximum: 3600,
        },
      },
    },
  },
  handler: async (args: any) => {
    const wsClient = new WebSocketClient(args.backend_url);
    const progressStages: any[] = [];
    
    try {
      await wsClient.connect();
      
      const result = await wsClient.extractPolygon(
        args.polygon,
        (progress) => {
          progressStages.push(progress);
          // Optionally send progress updates via MCP notifications
        },
        args.timeout_seconds * 1000
      );
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              status: 'complete',
              hash: result.hash,
              progress_stages: progressStages,
              nodes: result.nodes,
              edges: result.edges,
              download_url: result.download_url,
              geojson_url: result.geojson_url,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              status: 'error',
              error: error.message,
              progress_stages: progressStages,
            }, null, 2),
          },
        ],
        isError: true,
      };
    } finally {
      wsClient.disconnect();
    }
  },
};
```

## Configuration

### MCP Server Configuration

Create `.bob/settings.json` in the project root:

```json
{
  "mcpServers": {
    "overture-maps": {
      "command": "node",
      "args": ["mcp-server/dist/index.js"],
      "env": {
        "OVERTURE_BACKEND_URL": "http://localhost:8080",
        "OVERTURE_WS_URL": "ws://localhost:8080"
      },
      "trust": true,
      "includeTools": [
        "overture_health_check",
        "overture_extract_check",
        "overture_extract_polygon",
        "overture_download_graph",
        "overture_download_geojson",
        "overture_get_stats"
      ]
    }
  }
}
```

### Environment Variables

```bash
# .env file for MCP server
OVERTURE_BACKEND_URL=http://localhost:8080
OVERTURE_WS_URL=ws://localhost:8080
LOG_LEVEL=info
```

## Deployment Strategy

### Local Development

1. **Build MCP Server**:
   ```bash
   cd mcp-server
   npm install
   npm run build
   ```

2. **Start Rust Backend**:
   ```bash
   cd rust-backend
   cargo run --release
   ```

3. **Configure Bob Shell**:
   - Add MCP server configuration to `.bob/settings.json`
   - Restart Bob Shell

4. **Test Tools**:
   ```bash
   # In Bob Shell
   /tools list
   # Should show all overture_* tools
   ```

### Production Deployment

1. **Package MCP Server**:
   ```bash
   npm run build
   npm pack
   ```

2. **Deploy Backend**:
   - Use Docker: `docker-compose up -d`
   - Or systemd service for the Rust binary

3. **Configure for Production**:
   ```json
   {
     "mcpServers": {
       "overture-maps": {
         "command": "node",
         "args": ["/opt/overture-mcp/dist/index.js"],
         "env": {
           "OVERTURE_BACKEND_URL": "https://api.overture.example.com",
           "OVERTURE_WS_URL": "wss://api.overture.example.com"
         }
       }
     }
   }
   ```

## Testing Strategy

### Unit Tests

```typescript
// tests/tools/health.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { healthCheckTool } from '../../src/tools/health';

describe('Health Check Tool', () => {
  it('should return healthy status when backend is running', async () => {
    const result = await healthCheckTool.handler({
      backend_url: 'http://localhost:8080'
    });
    
    const data = JSON.parse(result.content[0].text);
    expect(data.status).toBe('healthy');
    expect(data.version).toBeDefined();
  });
  
  it('should return unhealthy status when backend is down', async () => {
    const result = await healthCheckTool.handler({
      backend_url: 'http://localhost:9999'
    });
    
    expect(result.isError).toBe(true);
    const data = JSON.parse(result.content[0].text);
    expect(data.status).toBe('unhealthy');
  });
});
```

### Integration Tests

```typescript
// tests/integration/extraction.test.ts
import { describe, it, expect } from 'vitest';
import { extractCheckTool, extractPolygonTool } from '../../src/tools/extract';

describe('Extraction Integration', () => {
  const testPolygon = {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-122.4, 37.7],
        [-122.3, 37.7],
        [-122.3, 37.8],
        [-122.4, 37.8],
        [-122.4, 37.7]
      ]]
    }
  };
  
  it('should check cache for polygon', async () => {
    const result = await extractCheckTool.handler({
      polygon: testPolygon
    });
    
    const data = JSON.parse(result.content[0].text);
    expect(data.hash).toBeDefined();
    expect(data.cached).toBeDefined();
  });
  
  it('should extract polygon with progress updates', async () => {
    const result = await extractPolygonTool.handler({
      polygon: testPolygon,
      timeout_seconds: 300
    });
    
    const data = JSON.parse(result.content[0].text);
    expect(data.status).toBe('complete');
    expect(data.nodes).toBeGreaterThan(0);
    expect(data.edges).toBeGreaterThan(0);
  });
});
```

## Usage Examples

### Example 1: Check Backend Health

```typescript
// In Bob Shell or any MCP client
const result = await callTool('overture_health_check', {});
console.log(result);
// Output:
// {
//   "status": "healthy",
//   "version": "1.0.0",
//   "timestamp": "2024-01-15T10:30:00Z"
// }
```

### Example 2: Extract Road Network

```typescript
const polygon = {
  type: 'Feature',
  geometry: {
    type: 'Polygon',
    coordinates: [[
      [-122.4194, 37.7749],
      [-122.4094, 37.7749],
      [-122.4094, 37.7849],
      [-122.4194, 37.7849],
      [-122.4194, 37.7749]
    ]]
  }
};

// First check cache
const cacheCheck = await callTool('overture_extract_check', { polygon });
if (cacheCheck.cached) {
  console.log('Already cached!', cacheCheck);
} else {
  // Perform full extraction
  const extraction = await callTool('overture_extract_polygon', {
    polygon,
    timeout_seconds: 300
  });
  console.log('Extraction complete:', extraction);
}
```

### Example 3: Download and Analyze

```typescript
// Get statistics
const stats = await callTool('overture_get_stats', {
  hash: 'abc123...'
});
console.log(`Graph has ${stats.nodes} nodes and ${stats.edges} edges`);

// Download GeoJSON
const geojson = await callTool('overture_download_geojson', {
  hash: 'abc123...',
  output_path: './road_network.geojson'
});
console.log(`Saved ${geojson.feature_count} road segments`);

// Download graph for NetworkX
const graph = await callTool('overture_download_graph', {
  hash: 'abc123...',
  output_path: './road_network.gpickle'
});
console.log(`Graph file saved: ${graph.file_path}`);
```

## Backend Enhancements Needed

To fully support all MCP tools, the following endpoints should be added to the Rust backend:

### 1. List Cache Endpoint

```rust
// GET /cache
pub async fn list_cache(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<CacheEntry>>> {
    let cache = state.cache.list().await;
    Ok(Json(cache))
}
```

### 2. Clear Cache Endpoint

```rust
// DELETE /cache/:hash or DELETE /cache (clear all)
pub async fn clear_cache(
    Path(hash): Path<Option<String>>,
    State(state): State<Arc<AppState>>,
) -> Result<Json<ClearCacheResponse>> {
    let count = if let Some(hash) = hash {
        state.cache.remove(&hash).await;
        1
    } else {
        let size = state.cache.size().await;
        state.cache.clear().await;
        size
    };
    
    Ok(Json(ClearCacheResponse {
        success: true,
        cleared_count: count,
    }))
}
```

## Documentation

### User Documentation

Create `mcp-server/README.md` with:
- Installation instructions
- Configuration guide
- Tool reference with examples
- Troubleshooting guide

### Developer Documentation

Create `mcp-server/DEVELOPMENT.md` with:
- Architecture overview
- Adding new tools
- Testing guidelines
- Contribution guidelines

## Success Criteria

- [x] All backend functions exposed as MCP tools
- [ ] MCP server implemented in TypeScript
- [ ] All tools have proper input/output schemas
- [ ] WebSocket support for real-time progress
- [ ] Comprehensive error handling
- [ ] Unit and integration tests
- [ ] Documentation complete
- [ ] Bob Shell integration tested
- [ ] Production deployment guide

## Timeline

1. **Phase 1: Setup** (1 day)
   - Initialize MCP server project
   - Set up TypeScript, dependencies
   - Create project structure

2. **Phase 2: Core Tools** (2 days)
   - Implement health check
   - Implement extract check (REST)
   - Implement download tools
   - Implement stats tool

3. **Phase 3: WebSocket Tools** (2 days)
   - Implement WebSocket client
   - Implement full extraction tool
   - Add progress tracking

4. **Phase 4: Cache Management** (1 day)
   - Add backend cache endpoints
   - Implement cache tools

5. **Phase 5: Testing** (2 days)
   - Write unit tests
   - Write integration tests
   - Test with Bob Shell

6. **Phase 6: Documentation** (1 day)
   - User documentation
   - Developer documentation
   - Deployment guide

**Total Estimated Time**: 9 days

## Next Steps

1. Review and approve this implementation plan
2. Set up MCP server project structure
3. Begin Phase 1 implementation
4. Iterate based on testing and feedback

## References

- [MCP SDK Documentation](https://github.com/modelcontextprotocol/sdk)
- [Bob Shell MCP Configuration](https://docs.bobshell.ai/mcp)
- [Overture Maps Documentation](https://docs.overturemaps.org/)
- [NetworkX Documentation](https://networkx.org/documentation/stable/)
