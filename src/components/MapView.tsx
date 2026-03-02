// Map View component with polygon drawing using Apple Maps

import React, { useRef, useCallback, forwardRef, useImperativeHandle, useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, Alert } from 'react-native';
import RNMapView, { Marker, Polygon, Polyline, MapPressEvent, Region, PROVIDER_DEFAULT } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Coordinate, Feature, MeasurementMode, SlopeCell } from '../types';
import { COLORS, DEFAULT_CENTER, DEFAULT_ZOOM, getSlopeColor } from '../constants';
import { coordinatesToFeature } from '../utils/geometry';

type MapType = 'standard' | 'satellite' | 'hybrid';

interface MapViewProps {
  onPolygonCreated: (feature: Feature, points: Coordinate[]) => void;
  onPolygonCleared: () => void;
  mode: MeasurementMode;
  slopeCells?: SlopeCell[];
}

export interface MapViewHandle {
  flyTo: (coords: [number, number], zoom: number) => void;
  clearPolygon: () => void;
  getLocation: () => Promise<[number, number] | null>;
}

const zoomToLatitudeDelta = (zoom: number): number => {
  return 360 / Math.pow(2, zoom);
};

export const MapViewComponent = forwardRef<MapViewHandle, MapViewProps>(
  ({ onPolygonCreated, onPolygonCleared, mode, slopeCells = [] }, ref) => {
    const insets = useSafeAreaInsets();
    const mapRef = useRef<RNMapView>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [points, setPoints] = useState<Coordinate[]>([]);
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
    const [mapType, setMapType] = useState<MapType>('standard');

    const initialRegion: Region = {
      latitude: DEFAULT_CENTER[1],
      longitude: DEFAULT_CENTER[0],
      latitudeDelta: zoomToLatitudeDelta(DEFAULT_ZOOM),
      longitudeDelta: zoomToLatitudeDelta(DEFAULT_ZOOM),
    };

    const handleClear = useCallback(() => {
      setPoints([]);
      setIsDrawing(false);
      onPolygonCleared();
    }, [onPolygonCleared]);

    useImperativeHandle(ref, () => ({
      flyTo: (coords: [number, number], zoom: number) => {
        const delta = zoomToLatitudeDelta(zoom);
        mapRef.current?.animateToRegion({
          latitude: coords[1],
          longitude: coords[0],
          latitudeDelta: delta,
          longitudeDelta: delta,
        }, 2000);
      },
      clearPolygon: handleClear,
      getLocation: async () => {
        if (userLocation) return userLocation;
        Alert.alert('Location', 'Enable location services and allow access to use this feature.');
        return null;
      },
    }));

    const handleMapPress = useCallback((event: MapPressEvent) => {
      if (!isDrawing) return;

      const { coordinate } = event.nativeEvent;
      const newPoint: Coordinate = {
        longitude: coordinate.longitude,
        latitude: coordinate.latitude,
      };

      setPoints((prev) => {
        if (mode === 'two_point' && prev.length >= 2) {
          return [newPoint];
        }
        return [...prev, newPoint];
      });
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

    const getModeLabel = () => {
      switch (mode) {
        case 'polygon': return 'Polygon';
        case 'path': return 'Path';
        case 'two_point': return 'Line';
        default: return 'Measure';
      }
    };
    
    const minPoints = mode === 'polygon' ? 3 : 2;

    const polygonCoords = points.map(p => ({
      latitude: p.latitude,
      longitude: p.longitude,
    }));

    return (
      <View style={styles.container}>
        <RNMapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_DEFAULT}
          mapType={mapType}
          initialRegion={initialRegion}
          showsUserLocation={true}
          showsMyLocationButton={false}
          onPress={handleMapPress}
          onUserLocationChange={(event) => {
            const { coordinate } = event.nativeEvent;
            if (coordinate) {
              setUserLocation([coordinate.longitude, coordinate.latitude]);
            }
          }}
        >
          {/* Polygon/Polyline */}
          {points.length >= 2 && (
            mode === 'polygon' && points.length >= 3 ? (
              <Polygon
                coordinates={polygonCoords}
                fillColor={COLORS.polygon.fill}
                strokeColor={COLORS.polygon.stroke}
                strokeWidth={3}
              />
            ) : (
              <Polyline
                coordinates={polygonCoords}
                strokeColor={COLORS.polygon.stroke}
                strokeWidth={3}
              />
            )
          )}

          {/* Slope overlay cells */}
          {slopeCells.map((cell, index) => (
            <Polygon
              key={`slope-${index}`}
              coordinates={cell.coordinates.map(c => ({
                latitude: c.latitude,
                longitude: c.longitude,
              }))}
              fillColor={getSlopeColor(cell.slopePercent)}
              strokeColor="rgba(0,0,0,0.2)"
              strokeWidth={0.5}
            />
          ))}

          {/* Point markers */}
          {points.map((point, index) => (
            <Marker
              key={`point-${index}`}
              coordinate={{
                latitude: point.latitude,
                longitude: point.longitude,
              }}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={styles.markerDot} />
            </Marker>
          ))}
        </RNMapView>

        {/* Map Type Switcher */}
        <View style={[styles.modeSwitcher, { top: insets.top + 10 }]}>
          <TouchableOpacity
            style={[styles.modeButton, mapType === 'standard' && styles.modeButtonActive]}
            onPress={() => setMapType('standard')}
          >
            <Ionicons name="map-outline" size={20} color={mapType === 'standard' ? '#fff' : '#000'} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, mapType === 'hybrid' && styles.modeButtonActive]}
            onPress={() => setMapType('hybrid')}
          >
            <Ionicons name="layers-outline" size={20} color={mapType === 'hybrid' ? '#fff' : '#000'} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, mapType === 'satellite' && styles.modeButtonActive]}
            onPress={() => setMapType('satellite')}
          >
            <Ionicons name="earth-outline" size={20} color={mapType === 'satellite' ? '#fff' : '#000'} />
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
  markerDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
});
