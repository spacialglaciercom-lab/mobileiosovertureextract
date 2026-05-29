#!/usr/bin/env node

/**
 * Overture Maps MCP Server
 * 
 * Model Context Protocol server for extracting road networks from Overture Maps.
 * Provides tools for health checks, extraction, downloads, statistics, and cache management.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import tools
import { healthCheckTool } from './tools/health.js';
import { extractCheckTool, extractPolygonTool } from './tools/extract.js';
import { downloadGraphTool, downloadGeoJsonTool } from './tools/download.js';
import { getStatsTool } from './tools/stats.js';
import { listCacheTool, clearCacheTool } from './tools/cache.js';

// Server configuration
const SERVER_NAME = 'overture-maps-extractor';
const SERVER_VERSION = '1.0.0';

// Create MCP server
const server = new Server(
  {
    name: SERVER_NAME,
    version: SERVER_VERSION,
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

// Log server startup
console.error(`${SERVER_NAME} v${SERVER_VERSION} starting...`);
console.error(`Registered ${tools.length} tools:`);
tools.forEach((tool) => {
  console.error(`  - ${tool.definition.name}: ${tool.definition.description}`);
});

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  console.error('Received list tools request');
  
  const mcpTools = tools.map((tool) => ({
    name: tool.definition.name,
    description: tool.definition.description,
    inputSchema: tool.definition.inputSchema,
  }));

  return {
    tools: mcpTools,
  };
});

// Handle call tool request
server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
  const toolName = request.params.name;
  const args = request.params.arguments || {};

  console.error(`Received call tool request: ${toolName}`);
  console.error(`Arguments: ${JSON.stringify(args, null, 2)}`);

  // Find the tool
  const tool = tools.find((t) => t.definition.name === toolName);
  
  if (!tool) {
    console.error(`Unknown tool: ${toolName}`);
    throw new Error(`Unknown tool: ${toolName}`);
  }

  try {
    // Execute the tool handler
    const result = await tool.handler(args);
    console.error(`Tool ${toolName} completed successfully`);
    return result;
  } catch (error: any) {
    console.error(`Tool ${toolName} failed:`, error);
    
    // Return error response
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              error: error.message,
              tool: toolName,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }
});

// Main function
async function main() {
  try {
    // Create stdio transport
    const transport = new StdioServerTransport();
    
    // Connect server to transport
    await server.connect(transport);
    
    console.error(`${SERVER_NAME} running on stdio`);
    console.error('Backend URL:', process.env.OVERTURE_BACKEND_URL || 'http://localhost:8080');
    console.error('WebSocket URL:', process.env.OVERTURE_WS_URL || 'ws://localhost:8080');
    console.error('Ready to receive requests...');
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle process signals
process.on('SIGINT', () => {
  console.error('Received SIGINT, shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('Received SIGTERM, shutting down...');
  process.exit(0);
});

// Start the server
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});