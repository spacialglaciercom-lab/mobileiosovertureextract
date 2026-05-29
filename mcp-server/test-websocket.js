#!/usr/bin/env node

/**
 * WebSocket extraction test for MCP server
 * Tests the full extraction pipeline with progress updates
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Start MCP server
const serverPath = join(__dirname, 'dist', 'index.js');
const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'inherit'],
  env: {
    ...process.env,
    OVERTURE_BACKEND_URL: 'http://localhost:8080',
    OVERTURE_WS_URL: 'ws://localhost:8080',
  },
});

let responseBuffer = '';

server.stdout.on('data', (data) => {
  responseBuffer += data.toString();
  
  const lines = responseBuffer.split('\n');
  responseBuffer = lines.pop() || '';
  
  lines.forEach((line) => {
    if (line.trim()) {
      try {
        const response = JSON.parse(line);
        console.log('Response:', JSON.stringify(response, null, 2));
      } catch (e) {
        // Not JSON, ignore
      }
    }
  });
});

server.on('error', (error) => {
  console.error('Server error:', error);
  process.exit(1);
});

// Wait for server to start
setTimeout(() => {
  console.log('\n=== Testing WebSocket Extraction ===\n');
  
  // Small polygon in San Francisco for quick extraction
  const testPolygon = {
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
  
  console.log('Test: Extract polygon with WebSocket (full pipeline)');
  const extractRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'overture_extract_polygon',
      arguments: {
        polygon: testPolygon,
        timeout_seconds: 120
      },
    },
  };
  
  server.stdin.write(JSON.stringify(extractRequest) + '\n');
  
  // Wait for extraction to complete (or timeout)
  setTimeout(() => {
    console.log('\n=== Test Complete ===\n');
    server.kill();
    process.exit(0);
  }, 125000); // 125 seconds to allow for 120s timeout + buffer
}, 1000);
