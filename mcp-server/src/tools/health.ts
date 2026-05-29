/**
 * Health Check Tool
 */

import { Tool, HealthCheckInput, HealthCheckResponse, ToolResponse } from '../types/index.js';
import { ApiClient } from '../services/api-client.js';

export const healthCheckTool: Tool<HealthCheckInput, HealthCheckResponse> = {
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

  handler: async (args: HealthCheckInput): Promise<ToolResponse<HealthCheckResponse>> => {
    const client = new ApiClient(args.backend_url);

    try {
      const result = await client.healthCheck();
      const response: HealthCheckResponse = {
        status: 'healthy',
        version: result.version,
        timestamp: new Date().toISOString(),
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response, null, 2),
          },
        ],
      };
    } catch (error) {
      const response: HealthCheckResponse = {
        status: 'unhealthy',
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response, null, 2),
          },
        ],
        isError: true,
      };
    }
  },
};
