#!/usr/bin/env node

/**
 * Simple test script for MCP server
 * Tests the health check tool
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
  
  // Try to parse JSON-RPC responses
  const lines = responseBuffer.split('\n');
  responseBuffer = lines.pop() || ''; // Keep incomplete line
  
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
  console.log('\n=== Testing MCP Server ===\n');
  
  // Test 1: List tools
  console.log('Test 1: List tools');
  const listToolsRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
  };
  server.stdin.write(JSON.stringify(listToolsRequest) + '\n');
  
  // Test 2: Call health check tool
  setTimeout(() => {
    console.log('\nTest 2: Call health check tool');
    const callToolRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'overture_health_check',
        arguments: {},
      },
    };
    server.stdin.write(JSON.stringify(callToolRequest) + '\n');
    
    // Test 3: Extract check with sample polygon
    setTimeout(() => {
      console.log('\nTest 3: Extract check with sample polygon');
      const extractCheckRequest = {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'overture_extract_check',
          arguments: {
            polygon: {
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
            }
          },
        },
      };
      server.stdin.write(JSON.stringify(extractCheckRequest) + '\n');
      
      // Exit after tests
      setTimeout(() => {
        console.log('\n=== Tests Complete ===\n');
        server.kill();
        process.exit(0);
      }, 3000);
    }, 2000);
  }, 2000);
}, 1000);
