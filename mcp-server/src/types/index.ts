/**
 * Type definitions for Overture Maps MCP Server
 */

// GeoJSON Types
export interface Coordinate {
  longitude: number;
  latitude: number;
}

export interface PolygonGeometry {
  type: 'Polygon';
  coordinates: number[][][];
}

export interface Feature {
  type: 'Feature';
  geometry: PolygonGeometry;
  properties?: Record<string, unknown>;
}

export interface FeatureCollection {
  type: 'FeatureCollection';
  features: Feature[];
}

// Extraction Types
export interface ExtractionProgress {
  stage: 'downloading' | 'clipping' | 'building_graph' | 'complete' | 'error';
  progress: number;
  message?: string;
  download_url?: string;
  geojson_url?: string;
  nodes?: number;
  edges?: number;
  error?: string;
}

export interface ExtractionResult {
  status: 'complete' | 'pending' | 'error' | 'timeout';
  cached?: boolean;
  hash: string;
  nodes?: number;
  edges?: number;
  download_url?: string;
  geojson_url?: string;
  progress_stages?: ExtractionProgress[];
  error?: string;
}

// Statistics Types
export interface GraphStats {
  nodes: number;
  edges: number;
  density: number;
  is_connected: boolean;
}

// Cache Types
export interface CacheEntry {
  hash: string;
  created_at: string;
  nodes: number;
  edges: number;
}

export interface CacheListResponse {
  cached_extractions: CacheEntry[];
  total_count: number;
}

export interface ClearCacheResponse {
  success: boolean;
  cleared_count: number;
}

// Health Check Types
export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  version?: string;
  timestamp: string;
  error?: string;
}

// Download Types
export interface DownloadGraphResponse {
  success: boolean;
  file_path?: string;
  file_size_bytes?: number;
  base64_data?: string;
  error?: string;
}

export interface DownloadGeoJsonResponse {
  success: boolean;
  file_path?: string;
  geojson?: FeatureCollection;
  feature_count?: number;
  error?: string;
}

// Tool Input Types
export interface HealthCheckInput {
  backend_url?: string;
}

export interface ExtractCheckInput {
  polygon: Feature;
  backend_url?: string;
}

export interface ExtractPolygonInput {
  polygon: Feature;
  backend_url?: string;
  timeout_seconds?: number;
}

export interface DownloadGraphInput {
  hash: string;
  output_path?: string;
  backend_url?: string;
}

export interface DownloadGeoJsonInput {
  hash: string;
  output_path?: string;
  backend_url?: string;
}

export interface GetStatsInput {
  hash: string;
  backend_url?: string;
}

export interface ListCacheInput {
  backend_url?: string;
}

export interface ClearCacheInput {
  hash?: string;
  backend_url?: string;
}

// MCP Tool Types
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties?: Record<string, unknown>;
    required?: string[];
  };
}

export interface ToolHandler<TInput = any, TOutput = any> {
  (args: TInput): Promise<ToolResponse<TOutput>>;
}

export interface Tool<TInput = any, TOutput = any> {
  definition: ToolDefinition;
  handler: ToolHandler<TInput, TOutput>;
}

export interface ToolResponse<T = any> {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

// Configuration Types
export interface ServerConfig {
  backendUrl: string;
  wsUrl: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  timeout: number;
}

// Error Types
export class MCPError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'MCPError';
  }
}

export class BackendError extends MCPError {
  constructor(message: string, details?: unknown) {
    super(message, 'BACKEND_ERROR', details);
    this.name = 'BackendError';
  }
}

export class ValidationError extends MCPError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class TimeoutError extends MCPError {
  constructor(message: string, details?: unknown) {
    super(message, 'TIMEOUT_ERROR', details);
    this.name = 'TimeoutError';
  }
}
