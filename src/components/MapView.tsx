// Map View component with polygon drawing

import React, { useRef, useCallback, forwardRef, useImperativeHandle, useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, Platform } from 'react-native';
import MapLibreGL from '@maplibre/maplibre-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Coordinate, Feature, MeasurementMode } from '../types';
import { COLORS, DEFAULT_CENTER, DEFAULT_ZOOM } from '../constants';
import { coordinatesToFeature } from '../utils/geometry';

// Configure MapLibre
MapLibreGL.setAccessToken(null);

const MAP_STYLES = {
  LIGHT: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
  DARK: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  SATELLITE: JSON.stringify({
    version: 8,
    sources: {
      'satellite-tiles': {
        type: 'raster',
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256
      }
    },
    layers: [
      {
        id: 'satellite-layer',
        type: 'raster',
        source: 'satellite-tiles',
        minzoom: 0,
        maxzoom: 22
      }
    ]
  })
};

type MapMode = 'LIGHT' | 'DARK' | 'SATELLITE';

interface MapViewProps {
  onPolygonCreated: (feature: Feature, points: Coordinate[]) => void;
  onPolygonCleared: () => void;
  mode: MeasurementMode;
  mapRef?: React.RefObject<MapLibreGL.MapView>;
}

export interface MapViewHandle {
  flyTo: (coords: [number, number], zoom: number) => void;
  clearPolygon: () => void;
  getLocation: () => Promise<[number, number] | null>;
}

export const MapViewComponent = forwardRef<MapViewHandle, MapViewProps>(
  ({ onPolygonCreated, onPolygonCleared, mode }, ref) => {
    const insets = useSafeAreaInsets();
    const cameraRef = useRef<MapLibreGL.Camera>(null);
    const mapRef = useRef<MapLibreGL.MapView>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [points, setPoints] = useState<Coordinate[]>([]);
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
    const [mapMode, setMapMode] = useState<MapMode>('LIGHT');

    const handleClear = useCallback(() => {
      setPoints([]);
      setIsDrawing(false);
      onPolygonCleared();
    }, [onPolygonCleared]);

    // Expose methods to parent
    useImperativeHandle(ref, () => ({
      flyTo: (coords: [number, number], zoom: number) => {
        cameraRef.current?.setCamera({
          centerCoordinate: coords,
          zoomLevel: zoom,
          animationDuration: 2000,
        });
      },
      clearPolygon: handleClear,
      getLocation: async () => {
        return userLocation;
      },
    }));

    const handleMapPress = useCallback((event: any) => {
      if (!isDrawing) return;

      const { geometry } = event;
      if (geometry && geometry.coordinates) {
        const newPoint: Coordinate = {
          longitude: geometry.coordinates[0],
          latitude: geometry.coordinates[1],
        };

        setPoints((prev) => {
          if (mode === 'two_point' && prev.length >= 2) {
            return [newPoint];
          }
          return [...prev, newPoint];
        });
      }
    }, [isDrawing, mode]);

    const finishDrawing = useCallback(() => {
      const minPoints = mode === 'polygon' ? 3 : 2;
      if (points.length >= minPoints) {
        const feature = coordinatesToFeature(points, mode);
        if (feature) {
          onPolygonCreated(feature, points);
        }
      }
      setIsDrawing(false);
    }, [points, onPolygonCreated, mode]);

    const startDrawing = useCallback(() => {
      setPoints([]);
      setIsDrawing(true);
    }, []);

    const cancelDrawing = useCallback(() => {
      setPoints([]);
      setIsDrawing(false);
    }, []);

    const onUserLocationUpdate = useCallback((location: MapLibreGL.Location) => {
      if (location && location.coords) {
        setUserLocation([location.coords.longitude, location.coords.latitude]);
      }
    }, []);

    // Create GeoJSON for feature
    const featureGeoJSON = React.useMemo(() => {
      const minPoints = mode === 'polygon' ? 3 : 2;
      if (points.length < minPoints) return null;

      const feature = coordinatesToFeature(points, mode);
      if (!feature) return null;

      return {
        type: 'FeatureCollection' as const,
        features: [feature],
      };
    }, [points, mode]);

    const getModeLabel = () => {
      switch (mode) {
        case 'polygon': return 'Polygon';
        case 'path': return 'Path';
        case 'two_point': return 'Line';
        default: return 'Measure';
      }
    };
    
    const minPoints = mode === 'polygon' ? 3 : 2;

    // Get the current map style URL based on mode
    const currentStyleURL = React.useMemo(() => {
      return MAP_STYLES[mapMode];
    }, [mapMode]);

    return (
      <View style={styles.container}>
        <MapLibreGL.MapView
          key={mapMode}
          ref={mapRef}
          style={styles.map}
          styleURL={currentStyleURL}
          onPress={handleMapPress}
        >
          <MapLibreGL.Camera
            ref={cameraRef}
            zoomLevel={DEFAULT_ZOOM}
            centerCoordinate={DEFAULT_CENTER}
          />

          <MapLibreGL.UserLocation
            visible={true}
            onUpdate={onUserLocationUpdate}
          />

          {/* Drawn feature */}
          {featureGeoJSON && (
            <MapLibreGL.ShapeSource
              id="feature-source"
              shape={featureGeoJSON as any}
            >
              {mode === 'polygon' && (
                <MapLibreGL.FillLayer
                  id="polygon-fill"
                  style={{
                    fillColor: COLORS.polygon.fill,
                  }}
                />
              )}
              <MapLibreGL.LineLayer
                id="feature-stroke"
                style={{
                  lineColor: COLORS.polygon.stroke,
                  lineWidth: 3,
                }}
              />
            </MapLibreGL.ShapeSource>
          )}

          {/* Drawn points */}
          {points.length > 0 && (
            <MapLibreGL.ShapeSource
              id="points-source"
              shape={{
                type: 'FeatureCollection',
                features: points.map((p) => ({
                  type: 'Feature',
                  geometry: {
                    type: 'Point',
                    coordinates: [p.longitude, p.latitude],
                  },
                  properties: {},
                })),
              }}
            >
              <MapLibreGL.CircleLayer
                id="points-layer"
                style={{
                  circleRadius: 8,
                  circleColor: COLORS.primary,
                  circleStrokeColor: '#fff',
                  circleStrokeWidth: 2,
                }}
              />
            </MapLibreGL.ShapeSource>
          )}
        </MapLibreGL.MapView>

        {/* Map Mode Switcher */}
        <View style={[styles.modeSwitcher, { top: insets.top + 10 }]}>
          <TouchableOpacity
            style={[styles.modeButton, mapMode === 'LIGHT' && styles.modeButtonActive]}
            onPress={() => setMapMode('LIGHT')}
          >
            <Ionicons name="map-outline" size={20} color={mapMode === 'LIGHT' ? '#fff' : '#000'} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, mapMode === 'DARK' && styles.modeButtonActive]}
            onPress={() => setMapMode('DARK')}
          >
            <Ionicons name="moon-outline" size={20} color={mapMode === 'DARK' ? '#fff' : '#000'} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, mapMode === 'SATELLITE' && styles.modeButtonActive]}
            onPress={() => setMapMode('SATELLITE')}
          >
            <Ionicons name="earth-outline" size={20} color={mapMode === 'SATELLITE' ? '#fff' : '#000'} />
          </TouchableOpacity>
        </View>

        {/* Clear Button */}
        {points.length > 0 && !isDrawing && (
           <TouchableOpacity
              style={[styles.clearButton, { top: insets.top + 60 }]}
              onPress={handleClear}
           >
             <Ionicons name="trash-outline" size={20} color="#FF3B30" />
           </TouchableOpacity>
        )}

        {/* Drawing Controls */}
        <View style={[styles.controls, { paddingBottom: insets.bottom + 20 }]}>
          {!isDrawing ? (
            <TouchableOpacity
              style={styles.drawButton}
              onPress={startDrawing}
              activeOpacity={0.7}
            >
              <Text style={styles.drawButtonIcon}>📐</Text>
              <Text style={styles.drawButtonText}>Draw {getModeLabel()}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.drawingControls}>
              <Text style={styles.drawingHint}>
                Tap to add points ({points.length}/{minPoints} min)
              </Text>
              <View style={styles.drawingButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={cancelDrawing}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                {points.length >= minPoints && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.finishButton]}
                    onPress={finishDrawing}
                  >
                    <Text style={styles.finishButtonText}>Done</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Drawing indicator */}
        {isDrawing && (
          <View style={styles.drawingIndicator}>
            <Text style={styles.drawingIndicatorText}>
              Tap map to add points • Need {Math.max(0, minPoints - points.length)} more
            </Text>
          </View>
        )}
      </View>
    );
  }
);

MapViewComponent.displayName = 'MapView';

export const MapView = React.memo(MapViewComponent);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  controls: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
  },
  drawButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  drawButtonIcon: {
    fontSize: 20,
  },
  drawButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  drawingControls: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  drawingHint: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  drawingButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F2F2F7',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  finishButton: {
    backgroundColor: COLORS.primary,
  },
  finishButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  drawingIndicator: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  drawingIndicatorText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  modeSwitcher: {
    position: 'absolute',
    right: 16,
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 10,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  modeButton: {
    padding: 8,
    borderRadius: 8,
  },
  modeButtonActive: {
    backgroundColor: COLORS.primary,
  },
  clearButton: {
    position: 'absolute',
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 10,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
});
