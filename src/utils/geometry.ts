// Geospatial utility functions using Turf.js

import area from '@turf/area';
import length from '@turf/length';
import { feature } from '@turf/helpers';
import { Feature, MeasurementMetrics, Coordinate } from '../types';

/**
 * Calculate area and perimeter of a polygon
 */
export function calculateMetrics(polygon: Feature): MeasurementMetrics {
  const areaM2 = area(polygon as any);
  const areaKm2 = areaM2 / 1_000_000;
  const perimeterKm = length(polygon, { units: 'kilometers' });
  
  return {
    area: areaKm2,
    perimeter: perimeterKm,
  };
}

/**
 * Convert array of coordinates to GeoJSON Polygon
 */
export function coordinatesToPolygon(coords: Coordinate[]): Feature | null {
  if (coords.length < 3) return null;
  
  // Close the polygon by repeating the first point
  const ring = [
    ...coords.map(c => [c.longitude, c.latitude]),
    [coords[0].longitude, coords[0].latitude]
  ];
  
  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [ring],
    },
  };
}

/**
 * Get bounding box from coordinates
 */
export function getBoundingBox(coords: Coordinate[]): {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
} {
  const lngs = coords.map(c => c.longitude);
  const lats = coords.map(c => c.latitude);
  
  return {
    minLng: Math.min(...lngs),
    minLat: Math.min(...lats),
    maxLng: Math.max(...lngs),
    maxLat: Math.max(...lats),
  };
}

/**
 * Calculate distance between two points in meters
 */
export function distanceBetween(
  coord1: Coordinate,
  coord2: Coordinate
): number {
  const R = 6371000; // Earth's radius in meters
  const φ1 = (coord1.latitude * Math.PI) / 180;
  const φ2 = (coord2.latitude * Math.PI) / 180;
  const Δφ = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const Δλ = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Check if area is within allowed limits
 */
export function isAreaValid(areaKm2: number, maxAreaKm2: number = 100): boolean {
  return areaKm2 <= maxAreaKm2;
}
