/**
 * Extraction Tools
 */

import {
  Tool,
  ExtractCheckInput,
  ExtractPolygonInput,
  ExtractionResult,
  ToolResponse,
} from '../types/index.js';
import { ApiClient } from '../services/api-client.js';
import { WebSocketClient } from '../services/websocket-client.js';

/**
 * Extract Check Tool - Cache check only (REST)
 */
export const extractCheckTool: Tool<ExtractCheckInput, ExtractionResult> = {
  definition: {
    name: 'overture_extract_check',
    description:
      'Check if a polygon extraction is already cached. Returns immediately without performing extraction.',
    inputSchema: {
      type: 'object',
      required: ['polygon'],
      properties: {
        polygon: {
          type: 'object',
          description: 'GeoJSON Polygon Feature',
          required: ['type', 'geometry'],
          properties: {
            type: {
              type: 'string',
              enum: ['Feature'],
            },
            geometry: {
              type: 'object',
              required: ['type', 'coordinates'],
              properties: {
                type: {
                  type: 'string',
                  enum: ['Polygon'],
                },
                coordinates: {
                  type: 'array',
                  description: 'Array of linear rings (first is exterior, rest are holes)',
                  items: {
                    type: 'array',
                    items: {
                      type: 'array',
                      items: {
                        type: 'number',
                      },
                      minItems: 2,
                      maxItems: 2,
                    },
                  },
                },
              },
            },
          },
        },
        backend_url: {
          type: 'string',
          description: 'Backend URL (optional)',
          format: 'uri',
        },
      },
    },
  },

  handler: async (args: ExtractCheckInput): Promise<ToolResponse<ExtractionResult>> => {
    // Use 5 minute timeout for cache check (should be fast, but allow for network delays)
    const client = new ApiClient(args.backend_url, 300000);

    try {
      const result = await client.extractPolygon(args.polygon);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                status: 'error',
                error: (error as Error).message,
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }
  },
};

/**
 * Extract Polygon Tool - Full pipeline with WebSocket (real-time progress)
 */
export const extractPolygonTool: Tool<ExtractPolygonInput, ExtractionResult> = {
  definition: {
    name: 'overture_extract_polygon',
    description:
      'Extract road network for a polygon with real-time progress updates. This performs the full extraction pipeline if not cached.',
    inputSchema: {
      type: 'object',
      required: ['polygon'],
      properties: {
        polygon: {
          type: 'object',
          description: 'GeoJSON Polygon Feature',
          required: ['type', 'geometry'],
          properties: {
            type: {
              type: 'string',
              enum: ['Feature'],
            },
            geometry: {
              type: 'object',
              required: ['type', 'coordinates'],
              properties: {
                type: {
                  type: 'string',
                  enum: ['Polygon'],
                },
                coordinates: {
                  type: 'array',
                  description: 'Array of linear rings',
                  items: {
                    type: 'array',
                    items: {
                      type: 'array',
                      items: {
                        type: 'number',
                      },
                      minItems: 2,
                      maxItems: 2,
                    },
                  },
                },
              },
            },
          },
        },
        backend_url: {
          type: 'string',
          description: 'Backend WebSocket URL (optional)',
          format: 'uri',
        },
        timeout_seconds: {
          type: 'integer',
          description: 'Maximum time to wait for extraction (default: 300)',
          minimum: 30,
          maximum: 3600,
          default: 300,
        },
      },
    },
  },

  handler: async (args: ExtractPolygonInput): Promise<ToolResponse<ExtractionResult>> => {
    const wsClient = new WebSocketClient(args.backend_url);
    const timeoutMs = (args.timeout_seconds || 300) * 1000;

    try {
      // Connect to WebSocket
      await wsClient.connect();

      // Extract with progress tracking
      const result = await wsClient.extractPolygon(
        args.polygon,
        (progress) => {
          // Log progress to stderr (won't interfere with MCP protocol)
          console.error(
            `Progress: ${progress.stage} - ${progress.progress}% ${progress.message || ''}`
          );
        },
        timeoutMs
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      const errorResult: ExtractionResult = {
        status: 'error',
        hash: '',
        error: (error as Error).message,
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(errorResult, null, 2),
          },
        ],
        isError: true,
      };
    } finally {
      wsClient.disconnect();
    }
  },
};
