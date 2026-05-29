/**
 * Statistics Tool
 */

import { Tool, GetStatsInput, GraphStats, ToolResponse } from '../types/index.js';
import { ApiClient } from '../services/api-client.js';

/**
 * Get Statistics Tool
 */
export const getStatsTool: Tool<GetStatsInput, GraphStats> = {
  definition: {
    name: 'overture_get_stats',
    description: 'Get graph statistics for a cached extraction.',
    inputSchema: {
      type: 'object',
      required: ['hash'],
      properties: {
        hash: {
          type: 'string',
          description: 'Extraction hash from extract operation',
        },
        backend_url: {
          type: 'string',
          format: 'uri',
        },
      },
    },
  },

  handler: async (args: GetStatsInput): Promise<ToolResponse<GraphStats>> => {
    // Use 5 minute timeout for stats retrieval
    const client = new ApiClient(args.backend_url, 300000);

    try {
      const stats = await client.getStats(args.hash);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(stats, null, 2),
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
