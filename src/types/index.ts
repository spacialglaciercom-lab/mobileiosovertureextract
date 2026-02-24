// Types for the Overture OSM Extractor App

export interface Coordinate {
  longitude: number;
  latitude: number;
}

export interface Polygon {
  type: 'Polygon';
  coordinates: number[][][];
}

export interface Feature {
  type: 'Feature';
  geometry: Polygon;
  properties?: Record<string, unknown>;
}

export interface MeasurementMetrics {
  area: number;
  perimeter: number;
}

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
