// Main App component for Overture OSM Extractor

import React, { useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  StatusBar,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { MapView, MapViewHandle } from './src/components/MapView';
import { Button } from './src/components/Button';
import { BottomSheet } from './src/components/BottomSheet';
import { MeasurementCard } from './src/components/MeasurementCard';
import { ProgressCard } from './src/components/ProgressCard';
import { CityPicker } from './src/components/CityPicker';
import { webSocketService } from './src/services/WebSocketService';
import { apiService } from './src/services/ApiService';
import { calculateMetrics, isAreaValid } from './src/utils/geometry';
import { COLORS, MAX_AREA_KM2, DEFAULT_WS_URL } from './src/constants';
import { Feature, Coordinate, ExtractionProgress, CityPreset } from './src/types';

export default function App() {
  // Map reference
  const mapRef = useRef<MapViewHandle>(null);

  // State
  const [currentPolygon, setCurrentPolygon] = useState<Feature | null>(null);
  const [polygonPoints, setPolygonPoints] = useState<Coordinate[]>([]);
  const [metrics, setMetrics] = useState<{ area: number; perimeter: number } | null>(null);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState<ExtractionProgress | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [geojsonUrl, setGeojsonUrl] = useState<string | null>(null);

  // Handle polygon creation
  const handlePolygonCreated = useCallback((polygon: Feature, points: Coordinate[]) => {
    const newMetrics = calculateMetrics(polygon);

    // Check area limit
    if (!isAreaValid(newMetrics.area, MAX_AREA_KM2)) {
      Alert.alert(
        'Area Too Large',
        `The selected area (${newMetrics.area.toFixed(1)} km²) exceeds the maximum of ${MAX_AREA_KM2} km². Please draw a smaller polygon.`,
        [{ text: 'OK', onPress: () => mapRef.current?.clearPolygon() }]
      );
      return;
    }

    setCurrentPolygon(polygon);
    setPolygonPoints(points);
    setMetrics(newMetrics);
    setShowBottomSheet(true);
  }, []);

  // Handle polygon cleared
  const handlePolygonCleared = useCallback(() => {
    setCurrentPolygon(null);
    setPolygonPoints([]);
    setMetrics(null);
    setShowBottomSheet(false);
    setExtractionProgress(null);
    setDownloadUrl(null);
    setGeojsonUrl(null);
    webSocketService.disconnect();
  }, []);

  // Handle extraction
  const handleExtract = useCallback(async () => {
    if (!currentPolygon) return;

    setIsExtracting(true);
    setExtractionProgress({ stage: 'downloading', progress: 0 });
    setDownloadUrl(null);
    setGeojsonUrl(null);

    try {
      await webSocketService.connect(
        (progress) => {
          setExtractionProgress(progress);

          if (progress.stage === 'complete') {
            setIsExtracting(false);
            const httpUrl = DEFAULT_WS_URL.replace('wss://', 'https://').replace('ws://', 'http://');
            if (progress.geojson_url) {
              setGeojsonUrl(`${httpUrl}${progress.geojson_url}`);
            }
            if (progress.download_url) {
              setDownloadUrl(`${httpUrl}${progress.download_url}`);
            }
            webSocketService.disconnect();
          } else if (progress.stage === 'error') {
            setIsExtracting(false);
            Alert.alert('Error', progress.error || 'Extraction failed');
            webSocketService.disconnect();
          }
        },
        (error) => {
          setIsExtracting(false);
          Alert.alert('Connection Error', error);
        }
      );

      webSocketService.sendPolygon(currentPolygon);
    } catch (error) {
      setIsExtracting(false);
      Alert.alert('Error', 'Failed to start extraction');
    }
  }, [currentPolygon]);

  // Handle download
  const handleDownload = useCallback(async (url: string, filename: string) => {
    try {
      const downloadPath = `${FileSystem.documentDirectory}${filename}`;
      
      const downloadResult = await FileSystem.downloadAsync(url, downloadPath);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloadResult.uri);
      } else {
        Alert.alert('Download Complete', `File saved to: ${downloadResult.uri}`);
      }
    } catch (error) {
      Alert.alert('Download Error', 'Failed to download file');
    }
  }, []);

  // Handle city selection
  const handleSelectCity = useCallback((city: CityPreset) => {
    mapRef.current?.flyTo(city.coords, city.zoom);
    setShowCityPicker(false);
  }, []);

  // Handle geolocation
  const handleGeolocate = useCallback(async () => {
    const location = await mapRef.current?.getLocation();
    if (location) {
      mapRef.current?.flyTo(location, 15);
    } else {
      Alert.alert('Location', 'Unable to get current location');
    }
  }, []);

  // Handle reset
  const handleReset = useCallback(() => {
    mapRef.current?.clearPolygon();
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

        {/* Map */}
        <MapView
          ref={mapRef}
          onPolygonCreated={handlePolygonCreated}
          onPolygonCleared={handlePolygonCleared}
        />

        {/* Top Controls */}
        <View style={styles.topControls}>
          <Button
            title="📍 Cities"
            onPress={() => setShowCityPicker(true)}
            variant="secondary"
            size="small"
          />
          <Button
            title="🎯"
            onPress={handleGeolocate}
            variant="secondary"
            size="small"
          />
        </View>

        {/* Measurement Card */}
        {metrics && !showBottomSheet && (
          <View style={styles.measurementCard}>
            <MeasurementCard metrics={metrics} pointCount={polygonPoints.length} />
          </View>
        )}

        {/* City Picker Modal */}
        <CityPicker
          visible={showCityPicker}
          onClose={() => setShowCityPicker(false)}
          onSelectCity={handleSelectCity}
        />

        {/* Bottom Sheet */}
        <BottomSheet
          visible={showBottomSheet}
          onClose={() => setShowBottomSheet(false)}
          title="Polygon Selected"
          subtitle={metrics ? `${metrics.area.toFixed(3)} km² • ${metrics.perimeter.toFixed(3)} km perimeter` : undefined}
        >
          {/* Stats */}
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>POINTS</Text>
              <Text style={[styles.statValue, polygonPoints.length >= 3 && styles.statValid]}>
                {polygonPoints.length}
              </Text>
              <Text style={styles.statHint}>/ 3 min</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>AREA</Text>
              <Text style={styles.statValue}>{metrics?.area.toFixed(3)}</Text>
              <Text style={styles.statHint}>km²</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>PERIMETER</Text>
              <Text style={styles.statValue}>{metrics?.perimeter.toFixed(2)}</Text>
              <Text style={styles.statHint}>km</Text>
            </View>
          </View>

          {/* Progress */}
          {isExtracting && extractionProgress && (
            <ProgressCard progress={extractionProgress} />
          )}

          {/* Actions */}
          <View style={styles.actions}>
            {!isExtracting && !downloadUrl && !geojsonUrl && (
              <>
                <Button
                  title="Extract & Process"
                  onPress={handleExtract}
                  variant="primary"
                  size="large"
                  style={styles.actionButton}
                />
                <Button
                  title="Clear Selection"
                  onPress={handleReset}
                  variant="outline"
                  size="medium"
                  style={styles.actionButton}
                />
              </>
            )}

            {geojsonUrl && (
              <Button
                title="📥 Download GeoJSON"
                onPress={() => handleDownload(geojsonUrl, 'transportation.geojson')}
                variant="success"
                size="large"
                style={styles.actionButton}
              />
            )}

            {downloadUrl && (
              <Button
                title="📥 Download Graph"
                onPress={() => handleDownload(downloadUrl, 'road_network.gpickle')}
                variant="outline"
                size="medium"
                style={styles.actionButton}
              />
            )}

            {(downloadUrl || geojsonUrl) && (
              <Button
                title="Start New Extraction"
                onPress={handleReset}
                variant="secondary"
                size="medium"
                style={styles.actionButton}
              />
            )}
          </View>
        </BottomSheet>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topControls: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    gap: 8,
  },
  measurementCard: {
    position: 'absolute',
    top: 16,
    left: 16,
    maxWidth: 200,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  statValid: {
    color: COLORS.success,
  },
  statHint: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  actions: {
    gap: 12,
    paddingBottom: 20,
  },
  actionButton: {
    width: '100%',
  },
});
