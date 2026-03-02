// Geospatial utility functions using Turf.js

import area from '@turf/area';
import length from '@turf/length';
import { Feature, MeasurementMetrics, Coordinate, MeasurementMode } from '../types';

/**
 * Calculate geometry metrics based on feature type
 */
export function calculateMetrics(feature: Feature): MeasurementMetrics {
  const geom = feature.geometry;
  
  if (geom.type === 'Polygon') {
    const areaM2 = area(feature as any);
    const areaKm2 = areaM2 / 1_000_000;
    const perimeterKm = length(feature as any, { units: 'kilometers' });
    
    return {
      area: areaKm2,
      perimeter: perimeterKm,
    };
  } else if (geom.type === 'LineString') {
    const lengthKm = length(feature as any, { units: 'kilometers' });
    let heading: number | undefined;

    // For 2-point line, calculate heading
    if (geom.coordinates.length === 2) {
      const c1 = { longitude: geom.coordinates[0][0], latitude: geom.coordinates[0][1] };
      const c2 = { longitude: geom.coordinates[1][0], latitude: geom.coordinates[1][1] };
      heading = calculateHeading(c1, c2);
    }

    return {
      length: lengthKm,
      heading,
    };
  }
  
  return {};
}

/**
 * Calculate heading between two coordinates (0-360 degrees)
 */
export function calculateHeading(start: Coordinate, end: Coordinate): number {
  const lat1 = (start.latitude * Math.PI) / 180;
  const lon1 = (start.longitude * Math.PI) / 180;
  const lat2 = (end.latitude * Math.PI) / 180;
  const lon2 = (end.longitude * Math.PI) / 180;

  const dLon = lon2 - lon1;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  
  return (brng + 360) % 360;
}

/**
 * Fetch advanced metrics (elevation, slope) asynchronously
 */
export async function getAdvancedMetrics(coords: Coordinate[]): Promise<Partial<MeasurementMetrics>> {
  if (coords.length < 2) return {};

  try {
    // Open-Meteo Elevation API (Free, no key)
    const lats = coords.map(c => c.latitude).join(',');
    const lngs = coords.map(c => c.longitude).join(',');
    const url = `https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lngs}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.elevation || !Array.isArray(data.elevation)) return {};
    
    const elevations: number[] = data.elevation;
    
    // Sort for stats
    const sortedElev = [...elevations].sort((a, b) => a - b);
    const minElev = sortedElev[0];
    const maxElev = sortedElev[sortedElev.length - 1];
    const medianElev = sortedElev[Math.floor(sortedElev.length / 2)];

    // Calculate slopes
    const slopes: number[] = [];
    for (let i = 0; i < coords.length - 1; i++) {
      const dist = distanceBetween(coords[i], coords[i+1]);
      if (dist > 0) {
        const elevationChange = elevations[i+1] - elevations[i];
        // Slope in degrees
        const slopeRad = Math.atan(elevationChange / dist);
        const slopeDeg = (slopeRad * 180) / Math.PI;
        slopes.push(Math.abs(slopeDeg));
      }
    }
    
    let minSlope = 0, maxSlope = 0, medianSlope = 0;
    if (slopes.length > 0) {
      const sortedSlopes = [...slopes].sort((a, b) => a - b);
      minSlope = sortedSlopes[0];
      maxSlope = sortedSlopes[sortedSlopes.length - 1];
      medianSlope = sortedSlopes[Math.floor(sortedSlopes.length / 2)];
    }

    return {
      minElevation: minElev,
      maxElevation: maxElev,
      medianElevation: medianElev,
      minSlope,
      maxSlope,
      medianSlope,
    };
  } catch (error) {
    console.warn('Failed to fetch elevation data:', error);
    return {};
  }
}

/**
 * Convert array of coordinates to GeoJSON Feature based on mode
 */
export function coordinatesToFeature(coords: Coordinate[], mode: MeasurementMode): Feature | null {
  if (coords.length < 2) return null;
  
  if (mode === 'polygon') {
    if (coords.length < 3) return null;
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
  } else {
    // LineString for path/two_point
    return {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: coords.map(c => [c.longitude, c.latitude]),
      },
    };
  }
}

// Keep older export for compatibility if needed, but updated signatures
export function coordinatesToPolygon(coords: Coordinate[]): Feature | null {
  return coordinatesToFeature(coords, 'polygon');
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
