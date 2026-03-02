// Types for the Overture OSM Extractor App

export interface Coordinate {
  longitude: number;
  latitude: number;
}

export interface PolygonGeometry {
  type: 'Polygon';
  coordinates: number[][][];
}

export interface LineStringGeometry {
  type: 'LineString';
  coordinates: number[][];
}

export interface PointGeometry {
  type: 'Point';
  coordinates: number[];
}

export type Geometry = PolygonGeometry | LineStringGeometry | PointGeometry;

export interface Feature {
  type: 'Feature';
  geometry: Geometry;
  properties?: Record<string, unknown>;
}

export interface MeasurementMetrics {
  area?: number;
  perimeter?: number; // or length for paths
  length?: number;
  heading?: number;
  minElevation?: number;
  maxElevation?: number;
  medianElevation?: number;
  minSlope?: number;
  maxSlope?: number;
  medianSlope?: number;
}

export type MeasurementMode = 'polygon' | 'path' | 'two_point';

export interface ExtractionProgress {
  stage: 'downloading' | 'clipping' | 'building_graph' | 'complete' | 'error';
  progress: number;
  download_url?: string;
  geojson_url?: string;
  nodes?: number;
  edges?: number;
  error?: string;
}

export interface RoadSegment {
  geometry: {
    type: string;
    coordinates: number[][];
  };
  class: string;
  subtype: string;
}

export interface CityPreset {
  name: string;
  coords: [number, number];
  zoom: number;
}

export interface DrawState {
  isDrawing: boolean;
  currentPoints: Coordinate[];
  polygonComplete: boolean;
}

// Slope visualization cell
export interface SlopeCell {
  coordinates: Coordinate[]; // 4 corners of the cell
  slopePercent: number;      // Slope as percentage (rise/run * 100)
  slopeDegrees: number;      // Slope in degrees
  elevation: number;         // Average elevation of the cell
}
