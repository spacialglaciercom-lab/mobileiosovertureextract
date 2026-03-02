// Map View component with polygon drawing

import React, { useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import MapLibreGL from '@maplibre/maplibre-react-native';
import { Coordinate, Feature } from '../types';
import { COLORS, DEFAULT_CENTER, DEFAULT_ZOOM } from '../constants';
import { coordinatesToPolygon } from '../utils/geometry';

// Configure MapLibre
MapLibreGL.setAccessToken(null);

interface MapViewProps {
  onPolygonCreated: (polygon: Feature, points: Coordinate[]) => void;
  onPolygonCleared: () => void;
  mapRef?: React.RefObject<MapLibreGL.MapView>;
}

export interface MapViewHandle {
  flyTo: (coords: [number, number], zoom: number) => void;
  clearPolygon: () => void;
  getLocation: () => Promise<[number, number] | null>;
}

export const MapViewComponent = forwardRef<MapViewHandle, MapViewProps>(
  ({ onPolygonCreated, onPolygonCleared }, ref) => {
    const cameraRef = useRef<MapLibreGL.Camera>(null);
    const mapRef = useRef<MapLibreGL.MapView>(null);
    const [isDrawing, setIsDrawing] = React.useState(false);
    const [points, setPoints] = React.useState<Coordinate[]>([]);
    const [userLocation, setUserLocation] = React.useState<[number, number] | null>(null);

    // Expose methods to parent
    useImperativeHandle(ref, () => ({
      flyTo: (coords: [number, number], zoom: number) => {
        cameraRef.current?.setCamera({
          centerCoordinate: coords,
          zoomLevel: zoom,
          animationDuration: 2000,
        });
      },
      clearPolygon: () => {
        setPoints([]);
        setIsDrawing(false);
        onPolygonCleared();
      },
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
          const newPoints = [...prev, newPoint];
          return newPoints;
        });
      }
    }, [isDrawing]);

    const finishDrawing = useCallback(() => {
      if (points.length >= 3) {
        const polygon = coordinatesToPolygon(points);
        if (polygon) {
          onPolygonCreated(polygon, points);
        }
      }
      setIsDrawing(false);
    }, [points, onPolygonCreated]);

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

    // Create GeoJSON for polygon fill
    const polygonGeoJSON = React.useMemo(() => {
      if (points.length < 3) return null;

      const ring = [
        ...points.map((p) => [p.longitude, p.latitude]),
        [points[0].longitude, points[0].latitude],
      ];

      return {
        type: 'FeatureCollection' as const,
        features: [
          {
            type: 'Feature' as const,
            geometry: {
              type: 'Polygon' as const,
              coordinates: [ring],
            },
            properties: {},
          },
        ],
      };
    }, [points]);

    return (
      <View style={styles.container}>
        <MapLibreGL.MapView
          ref={mapRef}
          style={styles.map}
          styleURL="https://demotiles.maplibre.org/style.json"
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

          {/* Drawn polygon fill */}
          {polygonGeoJSON && (
            <MapLibreGL.ShapeSource
              id="polygon-source"
              shape={polygonGeoJSON}
            >
              <MapLibreGL.FillLayer
                id="polygon-fill"
                style={{
                  fillColor: COLORS.polygon.fill,
                }}
              />
              <MapLibreGL.LineLayer
                id="polygon-stroke"
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

        {/* Drawing Controls */}
        <View style={styles.controls}>
          {!isDrawing ? (
            <TouchableOpacity
              style={styles.drawButton}
              onPress={startDrawing}
              activeOpacity={0.7}
            >
              <Text style={styles.drawButtonIcon}>📐</Text>
              <Text style={styles.drawButtonText}>Draw Polygon</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.drawingControls}>
              <Text style={styles.drawingHint}>
                Tap to add points ({points.length}/3 min)
              </Text>
              <View style={styles.drawingButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={cancelDrawing}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                {points.length >= 3 && (
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
              Tap map to add points • Need {Math.max(0, 3 - points.length)} more
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
});
