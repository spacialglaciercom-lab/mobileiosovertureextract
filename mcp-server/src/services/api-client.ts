/**
 * HTTP API Client for Overture Maps Backend
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  ExtractionResult,
  GraphStats,
  Feature,
  FeatureCollection,
  CacheListResponse,
  ClearCacheResponse,
  BackendError,
} from '../types/index.js';

export class ApiClient {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.OVERTURE_BACKEND_URL || 'http://localhost:8080';
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response) {
          // Server responded with error status
          const message = (error.response.data as any)?.detail || error.message;
          throw new BackendError(
            `Backend error (${error.response.status}): ${message}`,
            {
              status: error.response.status,
              data: error.response.data,
            }
          );
        } else if (error.request) {
          // Request made but no response
          throw new BackendError('No response from backend. Is the server running?', {
            url: this.baseUrl,
          });
        } else {
          // Error setting up request
          throw new BackendError(`Request error: ${error.message}`);
        }
      }
    );
  }

  /**
   * Health check endpoint
   * GET /health
   */
  async healthCheck(): Promise<{ status: string; version: string }> {
    const response = await this.client.get('/health');
    return response.data;
  }

  /**
   * Extract polygon (cache check only)
   * POST /extract
   */
  async extractPolygon(polygon: Feature): Promise<ExtractionResult> {
    const response = await this.client.post('/extract', { polygon });
    return response.data;
  }

  /**
   * Get statistics for cached extraction
   * GET /stats/:hash
   */
  async getStats(hash: string): Promise<GraphStats> {
    const response = await this.client.get(`/stats/${hash}`);
    return response.data;
  }

  /**
   * Download GeoJSON for cached extraction
   * GET /geojson/:hash
   */
  async downloadGeoJson(hash: string): Promise<FeatureCollection> {
    const response = await this.client.get(`/geojson/${hash}`);
    return response.data;
  }

  /**
   * Download graph file (binary data)
   * GET /download/:hash
   */
  async downloadGraph(hash: string): Promise<Buffer> {
    const response = await this.client.get(`/download/${hash}`, {
      responseType: 'arraybuffer',
    });
    return Buffer.from(response.data);
  }

  /**
   * List all cached extractions
   * GET /cache
   * Note: This endpoint may need to be added to the backend
   */
  async listCache(): Promise<CacheListResponse> {
    try {
      const response = await this.client.get('/cache');
      return response.data;
    } catch (error) {
      // If endpoint doesn't exist, return empty list
      const backendError = error as BackendError;
      if (backendError.details && (backendError.details as any).status === 404) {
        return {
          cached_extractions: [],
          total_count: 0,
        };
      }
      throw error;
    }
  }

  /**
   * Clear cache (specific hash or all)
   * DELETE /cache/:hash or DELETE /cache
   * Note: This endpoint may need to be added to the backend
   */
  async clearCache(hash?: string): Promise<ClearCacheResponse> {
    try {
      const url = hash ? `/cache/${hash}` : '/cache';
      const response = await this.client.delete(url);
      return response.data;
    } catch (error) {
      // If endpoint doesn't exist, return error
      const backendError = error as BackendError;
      if (backendError.details && (backendError.details as any).status === 404) {
        throw new BackendError(
          'Cache management endpoints not available. Backend may need to be updated.'
        );
      }
      throw error;
    }
  }

  /**
   * Get the base URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Get WebSocket URL from HTTP URL
   */
  getWebSocketUrl(): string {
    return this.baseUrl.replace('https://', 'wss://').replace('http://', 'ws://');
  }
}
