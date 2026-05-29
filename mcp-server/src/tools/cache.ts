/**
 * Cache Management Tools
 */

import {
  Tool,
  ListCacheInput,
  ClearCacheInput,
  CacheListResponse,
  ClearCacheResponse,
  ToolResponse,
} from '../types/index.js';
import { ApiClient } from '../services/api-client.js';

/**
 * List Cache Tool
 */
export const listCacheTool: Tool<ListCacheInput, CacheListResponse> = {
  definition: {
    name: 'overture_list_cache',
    description:
      'List all cached extractions. Note: This requires backend support and may not be available.',
    inputSchema: {
      type: 'object',
      properties: {
        backend_url: {
          type: 'string',
          format: 'uri',
        },
      },
    },
  },

  handler: async (args: ListCacheInput): Promise<ToolResponse<CacheListResponse>> => {
    const client = new ApiClient(args.backend_url);

    try {
      const result = await client.listCache();

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
                cached_extractions: [],
                total_count: 0,
                error: (error as Error).message,
                note: 'Cache listing may not be supported by the backend yet.',
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
 * Clear Cache Tool
 */
export const clearCacheTool: Tool<ClearCacheInput, ClearCacheResponse> = {
  definition: {
    name: 'overture_clear_cache',
    description:
      'Clear a specific cached extraction or all cache. Note: This requires backend support and may not be available.',
    inputSchema: {
      type: 'object',
      properties: {
        hash: {
          type: 'string',
          description: 'Specific hash to clear (optional, clears all if not provided)',
        },
        backend_url: {
          type: 'string',
          format: 'uri',
        },
      },
    },
  },

  handler: async (args: ClearCacheInput): Promise<ToolResponse<ClearCacheResponse>> => {
    const client = new ApiClient(args.backend_url);

    try {
      const result = await client.clearCache(args.hash);

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
                success: false,
                cleared_count: 0,
                error: (error as Error).message,
                note: 'Cache clearing may not be supported by the backend yet.',
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
