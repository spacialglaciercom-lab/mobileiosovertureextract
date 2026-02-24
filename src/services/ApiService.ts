// REST API service for backend communication

import { DEFAULT_WS_URL } from '../constants';
import { Feature, ExtractionProgress } from '../types';

const getHttpUrl = (wsUrl: string = DEFAULT_WS_URL): string => {
  return wsUrl.replace('wss://', 'https://').replace('ws://', 'http://');
};

export interface ExtractionResult {
  status: string;
  cached: boolean;
  nodes: number;
  edges: number;
  download_url: string;
  geojson_url: string;
}

class ApiService {
  private baseUrl: string;

  constructor(wsUrl: string = DEFAULT_WS_URL) {
    this.baseUrl = getHttpUrl(wsUrl);
  }

  async healthCheck(): Promise<{ status: string; version: string }> {
    const response = await fetch(`${this.baseUrl}/health`);
    if (!response.ok) {
      throw new Error('Health check failed');
    }
    return response.json();
  }

  async extractPolygon(polygon: Feature): Promise<ExtractionResult> {
    const response = await fetch(`${this.baseUrl}/extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ polygon }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Extraction failed');
    }

    return response.json();
  }

  getGeoJsonUrl(hash: string): string {
    return `${this.baseUrl}/geojson/${hash}`;
  }

  getGraphUrl(hash: string): string {
    return `${this.baseUrl}/download/${hash}`;
  }

  async downloadGeoJson(hash: string): Promise<object> {
    const response = await fetch(this.getGeoJsonUrl(hash));
    if (!response.ok) {
      throw new Error('Failed to download GeoJSON');
    }
    return response.json();
  }

  async getStats(hash: string): Promise<{
    nodes: number;
    edges: number;
    density: number;
    is_connected: boolean;
  }> {
    const response = await fetch(`${this.baseUrl}/stats/${hash}`);
    if (!response.ok) {
      throw new Error('Failed to get stats');
    }
    return response.json();
  }
}

export const apiService = new ApiService();
export default ApiService;
