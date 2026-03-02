// Geospatial utility functions using Turf.js

import area from '@turf/area';
import length from '@turf/length';
import { Feature, MeasurementMetrics, Coordinate, MeasurementMode, SlopeCell } from '../types';
import { GOOGLE_ELEVATION_API_KEY } from '../constants';

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
 * Fetch advanced metrics (elevation, slope) asynchronously using Google Elevation API
 */
export async function getAdvancedMetrics(coords: Coordinate[]): Promise<Partial<MeasurementMetrics>> {
  if (coords.length < 2) return {};

  try {
    // Google Elevation API
    // Format: lat,lng|lat,lng|...
    const locations = coords.map(c => `${c.latitude},${c.longitude}`).join('|');
    const url = `https://maps.googleapis.com/maps/api/elevation/json?locations=${locations}&key=${GOOGLE_ELEVATION_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status !== 'OK' || !data.results || !Array.isArray(data.results)) {
      console.warn('Google Elevation API error:', data.status, data.error_message);
      return {};
    }
    
    const elevations: number[] = data.results.map((r: { elevation: number }) => r.elevation);
    
    // Sort for stats
    const sortedElev = [...elevations].sort((a, b) => a - b);
    const minElev = Math.round(sortedElev[0]);
    const maxElev = Math.round(sortedElev[sortedElev.length - 1]);
    const medianElev = Math.round(sortedElev[Math.floor(sortedElev.length / 2)]);

    // Calculate slopes between consecutive points
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

/**
 * Ray casting algorithm to check if a point is inside a polygon
 */
function isPointInPolygon(point: Coordinate, polygon: Coordinate[]): boolean {
  const x = point.longitude;
  const y = point.latitude;
  let inside = false;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].longitude;
    const yi = polygon[i].latitude;
    const xj = polygon[j].longitude;
    const yj = polygon[j].latitude;
    
    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    
    if (intersect) inside = !inside;
  }
  
  return inside;
}

/**
 * Generate a grid of points within a polygon for slope analysis
 */
export function generateGridPoints(
  polygonCoords: Coordinate[],
  gridSize: number = 10 // Number of cells per side
): { points: Coordinate[][]; cellSize: { lat: number; lng: number } } {
  const bbox = getBoundingBox(polygonCoords);
  
  const latStep = (bbox.maxLat - bbox.minLat) / gridSize;
  const lngStep = (bbox.maxLng - bbox.minLng) / gridSize;
  
  const points: Coordinate[][] = [];
  
  // Generate grid points (gridSize+1 points to create gridSize cells)
  for (let i = 0; i <= gridSize; i++) {
    const row: Coordinate[] = [];
    for (let j = 0; j <= gridSize; j++) {
      const lat = bbox.minLat + i * latStep;
      const lng = bbox.minLng + j * lngStep;
      row.push({ latitude: lat, longitude: lng });
    }
    points.push(row);
  }
  
  return { points, cellSize: { lat: latStep, lng: lngStep } };
}

/**
 * Check if a cell is inside the polygon (center point inside)
 */
function isCellInPolygon(
  corners: Coordinate[],
  polygonCoords: Coordinate[]
): boolean {
  // Check if center of cell is inside polygon
  const centerLat = (corners[0].latitude + corners[2].latitude) / 2;
  const centerLng = (corners[0].longitude + corners[2].longitude) / 2;
  const center: Coordinate = { latitude: centerLat, longitude: centerLng };
  
  return isPointInPolygon(center, polygonCoords);
}

/**
 * Calculate slope cells for a polygon area using elevation data
 */
export async function calculateSlopeGrid(
  polygonCoords: Coordinate[],
  gridSize: number = 8 // Reduced for API limits
): Promise<SlopeCell[]> {
  const { points, cellSize } = generateGridPoints(polygonCoords, gridSize);
  
  // Flatten points for API call
  const allPoints: Coordinate[] = [];
  for (const row of points) {
    for (const point of row) {
      allPoints.push(point);
    }
  }
  
  // Fetch elevations (Google API has 512 points per request limit)
  const elevations = await fetchElevations(allPoints);
  if (!elevations || elevations.length === 0) {
    throw new Error('Failed to fetch elevation data');
  }
  
  // Reshape elevations back to grid
  const elevationGrid: number[][] = [];
  let idx = 0;
  for (let i = 0; i <= gridSize; i++) {
    const row: number[] = [];
    for (let j = 0; j <= gridSize; j++) {
      row.push(elevations[idx] || 0);
      idx++;
    }
    elevationGrid.push(row);
  }
  
  // Calculate slope for each cell
  const slopeCells: SlopeCell[] = [];
  
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      // Cell corners (bottom-left, bottom-right, top-right, top-left)
      const corners: Coordinate[] = [
        points[i][j],
        points[i][j + 1],
        points[i + 1][j + 1],
        points[i + 1][j],
      ];
      
      // Skip cells outside polygon
      if (!isCellInPolygon(corners, polygonCoords)) {
        continue;
      }
      
      // Get elevations at corners
      const e00 = elevationGrid[i][j];
      const e01 = elevationGrid[i][j + 1];
      const e10 = elevationGrid[i + 1][j];
      const e11 = elevationGrid[i + 1][j + 1];
      
      // Calculate average elevation
      const avgElevation = (e00 + e01 + e10 + e11) / 4;
      
      // Calculate slope using gradient
      // dz/dx and dz/dy in meters
      const cellWidthMeters = cellSize.lng * 111320 * Math.cos((corners[0].latitude * Math.PI) / 180);
      const cellHeightMeters = cellSize.lat * 110540;
      
      const dzdx = ((e01 - e00) + (e11 - e10)) / 2 / cellWidthMeters;
      const dzdy = ((e10 - e00) + (e11 - e01)) / 2 / cellHeightMeters;
      
      // Slope magnitude
      const slopeRatio = Math.sqrt(dzdx * dzdx + dzdy * dzdy);
      const slopePercent = slopeRatio * 100;
      const slopeDegrees = Math.atan(slopeRatio) * (180 / Math.PI);
      
      slopeCells.push({
        coordinates: corners,
        slopePercent,
        slopeDegrees,
        elevation: avgElevation,
      });
    }
  }
  
  return slopeCells;
}

/**
 * Fetch elevations for an array of coordinates
 */
async function fetchElevations(coords: Coordinate[]): Promise<number[]> {
  // Google Elevation API limit is 512 locations per request
  const MAX_POINTS = 512;
  
  if (coords.length > MAX_POINTS) {
    // Sample points if too many
    const step = Math.ceil(coords.length / MAX_POINTS);
    coords = coords.filter((_, i) => i % step === 0);
  }
  
  const locations = coords.map(c => `${c.latitude},${c.longitude}`).join('|');
  const url = `https://maps.googleapis.com/maps/api/elevation/json?locations=${locations}&key=${GOOGLE_ELEVATION_API_KEY}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status !== 'OK' || !data.results) {
      console.warn('Elevation API error:', data.status, data.error_message);
      return [];
    }
    
    return data.results.map((r: { elevation: number }) => r.elevation);
  } catch (error) {
    console.error('Failed to fetch elevations:', error);
    return [];
  }
}
