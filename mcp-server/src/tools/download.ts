/**
 * Download Tools
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import {
  Tool,
  DownloadGraphInput,
  DownloadGeoJsonInput,
  DownloadGraphResponse,
  DownloadGeoJsonResponse,
  ToolResponse,
} from '../types/index.js';
import { ApiClient } from '../services/api-client.js';

/**
 * Download Graph Tool
 */
export const downloadGraphTool: Tool<DownloadGraphInput, DownloadGraphResponse> = {
  definition: {
    name: 'overture_download_graph',
    description:
      'Download the NetworkX-compatible graph file (.gpickle) for a cached extraction.',
    inputSchema: {
      type: 'object',
      required: ['hash'],
      properties: {
        hash: {
          type: 'string',
          description: 'Extraction hash from extract operation',
        },
        output_path: {
          type: 'string',
          description:
            'Local file path to save the graph (optional, returns base64 if not provided)',
        },
        backend_url: {
          type: 'string',
          format: 'uri',
        },
      },
    },
  },

  handler: async (args: DownloadGraphInput): Promise<ToolResponse<DownloadGraphResponse>> => {
    // Use 5 minute timeout for large graph downloads
    const client = new ApiClient(args.backend_url, 300000);

    try {
      const graphData = await client.downloadGraph(args.hash);

      if (args.output_path) {
        // Save to file
        const absolutePath = path.resolve(args.output_path);
        await fs.mkdir(path.dirname(absolutePath), { recursive: true });
        await fs.writeFile(absolutePath, graphData);

        const response: DownloadGraphResponse = {
          success: true,
          file_path: absolutePath,
          file_size_bytes: graphData.length,
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response, null, 2),
            },
          ],
        };
      } else {
        // Return base64
        const response: DownloadGraphResponse = {
          success: true,
          file_size_bytes: graphData.length,
          base64_data: graphData.toString('base64'),
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response, null, 2),
            },
          ],
        };
      }
    } catch (error: any) {
      const response: DownloadGraphResponse = {
        success: false,
        error: error.message,
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

/**
 * Download GeoJSON Tool
 */
export const downloadGeoJsonTool: Tool<DownloadGeoJsonInput, DownloadGeoJsonResponse> = {
  definition: {
    name: 'overture_download_geojson',
    description: 'Download the GeoJSON road network data for a cached extraction.',
    inputSchema: {
      type: 'object',
      required: ['hash'],
      properties: {
        hash: {
          type: 'string',
          description: 'Extraction hash from extract operation',
        },
        output_path: {
          type: 'string',
          description:
            'Local file path to save the GeoJSON (optional, returns data if not provided)',
        },
        backend_url: {
          type: 'string',
          format: 'uri',
        },
      },
    },
  },

  handler: async (
    args: DownloadGeoJsonInput
  ): Promise<ToolResponse<DownloadGeoJsonResponse>> => {
    // Use 5 minute timeout for large GeoJSON downloads
    const client = new ApiClient(args.backend_url, 300000);

    try {
      const geojson = await client.downloadGeoJson(args.hash);
      const featureCount = geojson.features?.length || 0;

      if (args.output_path) {
        // Save to file
        const absolutePath = path.resolve(args.output_path);
        await fs.mkdir(path.dirname(absolutePath), { recursive: true });
        await fs.writeFile(absolutePath, JSON.stringify(geojson, null, 2));

        const response: DownloadGeoJsonResponse = {
          success: true,
          file_path: absolutePath,
          feature_count: featureCount,
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response, null, 2),
            },
          ],
        };
      } else {
        // Return GeoJSON data
        const response: DownloadGeoJsonResponse = {
          success: true,
          geojson,
          feature_count: featureCount,
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response, null, 2),
            },
          ],
        };
      }
    } catch (error: any) {
      const response: DownloadGeoJsonResponse = {
        success: false,
        error: error.message,
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