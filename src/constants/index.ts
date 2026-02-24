import { CityPreset } from '../types';

// City presets for quick navigation
export const CITY_PRESETS: CityPreset[] = [
  { name: 'San Francisco', coords: [-122.4194, 37.7749], zoom: 13 },
  { name: 'Toronto', coords: [-79.3832, 43.6532], zoom: 13 },
  { name: 'New York', coords: [-73.9857, 40.7484], zoom: 13 },
  { name: 'Los Angeles', coords: [-118.2437, 34.0522], zoom: 12 },
  { name: 'Chicago', coords: [-87.6298, 41.8781], zoom: 13 },
  { name: 'Vancouver', coords: [-123.1216, 49.2827], zoom: 13 },
  { name: 'Montreal', coords: [-73.5673, 45.5017], zoom: 13 },
  { name: 'Houston', coords: [-95.3698, 29.7604], zoom: 12 },
  { name: 'Miami', coords: [-80.1918, 25.7617], zoom: 13 },
  { name: 'Seattle', coords: [-122.3321, 47.6062], zoom: 13 },
  { name: 'Denver', coords: [-104.9903, 39.7392], zoom: 13 },
  { name: 'Atlanta', coords: [-84.3880, 33.7490], zoom: 13 },
  { name: 'Boston', coords: [-71.0589, 42.3601], zoom: 13 },
  { name: 'Mexico City', coords: [-99.1332, 19.4326], zoom: 12 },
  { name: 'Washington DC', coords: [-77.0369, 38.9072], zoom: 13 },
  { name: 'Phoenix', coords: [-112.0740, 33.4484], zoom: 12 },
  { name: 'Dallas', coords: [-96.7970, 32.7767], zoom: 12 },
  { name: 'Ottawa', coords: [-75.6972, 45.4215], zoom: 13 },
  { name: 'Calgary', coords: [-114.0719, 51.0447], zoom: 13 },
  { name: 'Portland', coords: [-122.6765, 45.5152], zoom: 13 },
];

// Backend configuration
export const DEFAULT_WS_URL = 'wss://striking-reflection-backend.up.railway.app';
export const OVERTURE_RELEASE = '2026-02-18.0';

// Map configuration
export const DEFAULT_CENTER: [number, number] = [-122.4194, 37.7749];
export const DEFAULT_ZOOM = 12;

// Styling
export const COLORS = {
  primary: '#007AFF',
  primaryDark: '#0056CC',
  success: '#34C759',
  successDark: '#248A3D',
  error: '#FF3B30',
  warning: '#FF9500',
  background: '#F2F2F7',
  card: '#FFFFFF',
  text: '#1C1C1E',
  textSecondary: '#8E8E93',
  border: '#E5E5EA',
  polygon: {
    fill: 'rgba(0, 122, 255, 0.2)',
    stroke: '#007AFF',
  },
  road: {
    stroke: '#007AFF',
  },
};

// Max area in km² for extraction
export const MAX_AREA_KM2 = 100;
