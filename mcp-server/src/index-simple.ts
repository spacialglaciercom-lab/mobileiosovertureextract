#!/usr/bin/env node

/**
 * Overture Maps MCP Server - Simplified Version
 * 
 * This is a simplified implementation that works directly with stdio
 * without relying on complex MCP SDK features that may not be available.
 */

import * as dotenv from 'dotenv';
import { createInterface } from 'readline';

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

// Log server startup to stderr
console.error(`${SERVER_NAME} v${SERVER_VERSION} starting...`);
console.error(`Registered ${tools.length} tools:`);
tools.forEach((tool) => {
  console.error(`  - ${tool.definition.name}: ${tool.definition.description}`);
});
console.error('Backend URL:', process.env.OVERTURE_BACKEND_URL || 'http://localhost:8080');
console.error('WebSocket URL:', process.env.OVERTURE_WS_URL || 'ws://localhost:8080');
console.error('Ready to receive requests...');

// Create readline interface for JSON-RPC over stdio
const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

// Handle incoming JSON-RPC requests
rl.on('line', async (line: string) => {
  try {
    const request = JSON.parse(line);
    console.error(`Received request: ${request.method}`);

    let response: any;

    switch (request.method) {
      case 'tools/list':
        response = {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            tools: tools.map((tool) => ({
              name: tool.definition.name,
              description: tool.definition.description,
              inputSchema: tool.definition.inputSchema,
            })),
          },
        };
        break;

      case 'tools/call':
        const toolName = request.params?.name;
        const args = request.params?.arguments || {};
        
        const tool = tools.find((t) => t.definition.name === toolName);
        
        if (!tool) {
          response = {
            jsonrpc: '2.0',
            id: request.id,
            error: {
              code: -32601,
              message: `Unknown tool: ${toolName}`,
            },
          };
        } else {
          try {
            const result = await tool.handler(args);
            response = {
              jsonrpc: '2.0',
              id: request.id,
              result,
            };
          } catch (error: any) {
            response = {
              jsonrpc: '2.0',
              id: request.id,
              error: {
                code: -32000,
                message: error.message,
              },
            };
          }
        }
        break;

      case 'initialize':
        response = {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {},
            },
            serverInfo: {
              name: SERVER_NAME,
              version: SERVER_VERSION,
            },
          },
        };
        break;

      default:
        response = {
          jsonrpc: '2.0',
          id: request.id,
          error: {
            code: -32601,
            message: `Method not found: ${request.method}`,
          },
        };
    }

    // Send response to stdout
    console.log(JSON.stringify(response));
  } catch (error: any) {
    console.error('Error processing request:', error);
    const errorResponse = {
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32700,
        message: 'Parse error',
      },
    };
    console.log(JSON.stringify(errorResponse));
  }
});

// Handle process signals
process.on('SIGINT', () => {
  console.error('Received SIGINT, shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('Received SIGTERM, shutting down...');
  process.exit(0);
});

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
