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
  TouchableOpacity,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { MapView, MapViewHandle } from './src/components/MapView';
import { Button } from './src/components/Button';
import { BottomSheet } from './src/components/BottomSheet';
import { MeasurementCard } from './src/components/MeasurementCard';
import { ProgressCard } from './src/components/ProgressCard';
import { CityPicker } from './src/components/CityPicker';
import { PrivacyPolicy } from './src/components/PrivacyPolicy';
import { Feedback } from './src/components/Feedback';
import { webSocketService } from './src/services/WebSocketService';
import { apiService } from './src/services/ApiService';
import { calculateMetrics, isAreaValid, getAdvancedMetrics, calculateSlopeGrid } from './src/utils/geometry';
import { COLORS, MAX_AREA_KM2, DEFAULT_WS_URL, SLOPE_COLORS } from './src/constants';
import { Feature, Coordinate, ExtractionProgress, CityPreset, MeasurementMode, MeasurementMetrics, SlopeCell } from './src/types';

function AppContent() {
  // Safe area insets
  const insets = useSafeAreaInsets();
  
  // Map reference
  const mapRef = useRef<MapViewHandle>(null);

  // State
  const [currentPolygon, setCurrentPolygon] = useState<Feature | null>(null);
  const [mode, setMode] = useState<MeasurementMode>('polygon');
  const [polygonPoints, setPolygonPoints] = useState<Coordinate[]>([]);
  const [metrics, setMetrics] = useState<MeasurementMetrics | null>(null);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState<ExtractionProgress | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [geojsonUrl, setGeojsonUrl] = useState<string | null>(null);
  const [slopeCells, setSlopeCells] = useState<SlopeCell[]>([]);
  const [isLoadingSlope, setIsLoadingSlope] = useState(false);

  // Handle polygon creation
  const handlePolygonCreated = useCallback(async (feature: Feature, points: Coordinate[]) => {
    const newMetrics = calculateMetrics(feature);

    // Check area limit
    if (feature.geometry.type === 'Polygon' && newMetrics.area && !isAreaValid(newMetrics.area, MAX_AREA_KM2)) {
      Alert.alert(
        'Area Too Large',
        `The selected area (${newMetrics.area.toFixed(1)} km²) exceeds the maximum of ${MAX_AREA_KM2} km². Please draw a smaller polygon.`,
        [{ text: 'OK', onPress: () => mapRef.current?.clearPolygon() }]
      );
      return;
    }

    setCurrentPolygon(feature);
    setPolygonPoints(points);
    setMetrics(newMetrics);
    setShowBottomSheet(true);

    // Advanced metrics
    try {
      const advanced = await getAdvancedMetrics(points);
      setMetrics((prev) => (prev ? { ...prev, ...advanced } : advanced));
    } catch (e) {
      console.warn('Failed to fetch advanced metrics');
    }
  }, [mode]);

  // Handle polygon cleared
  const handlePolygonCleared = useCallback(() => {
    setCurrentPolygon(null);
    setPolygonPoints([]);
    setMetrics(null);
    setShowBottomSheet(false);
    setExtractionProgress(null);
    setDownloadUrl(null);
    setGeojsonUrl(null);
    setSlopeCells([]);
    webSocketService.disconnect();
  }, []);

  // Handle slope analysis
  const handleShowSlope = useCallback(async () => {
    if (polygonPoints.length < 3) return;

    setIsLoadingSlope(true);
    try {
      const cells = await calculateSlopeGrid(polygonPoints, 8);
      setSlopeCells(cells);
      
      if (cells.length === 0) {
        Alert.alert('Slope Analysis', 'Could not calculate slope for this area.');
      }
    } catch (error: any) {
      console.error('Slope analysis error:', error);
      Alert.alert('Error', error?.message || 'Failed to analyze slope');
    } finally {
      setIsLoadingSlope(false);
    }
  }, [polygonPoints]);

  // Clear slope overlay
  const handleClearSlope = useCallback(() => {
    setSlopeCells([]);
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
            const baseUrl = httpUrl.endsWith('/') ? httpUrl.slice(0, -1) : httpUrl;
            
            if (progress.geojson_url) {
              if (progress.geojson_url.startsWith('http')) {
                setGeojsonUrl(progress.geojson_url);
              } else {
                const path = progress.geojson_url.startsWith('/') ? progress.geojson_url : `/${progress.geojson_url}`;
                setGeojsonUrl(`${baseUrl}${path}`);
              }
            }
            if (progress.download_url) {
               if (progress.download_url.startsWith('http')) {
                setDownloadUrl(progress.download_url);
              } else {
                const path = progress.download_url.startsWith('/') ? progress.download_url : `/${progress.download_url}`;
                setDownloadUrl(`${baseUrl}${path}`);
              }
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
      // @ts-ignore
      const downloadPath = `${FileSystem.documentDirectory}${filename}`;
      
      const downloadResult = await FileSystem.downloadAsync(url, downloadPath);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloadResult.uri);
      } else {
        Alert.alert('Download Complete', `File saved to: ${downloadResult.uri}`);
      }
    } catch (error: any) {
      console.error('Download error:', error);
      Alert.alert('Download Error', `Failed to download file: ${error?.message || JSON.stringify(error)}`);
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
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

        {/* Map */}
        <MapView
          ref={mapRef}
          onPolygonCreated={handlePolygonCreated}
          onPolygonCleared={handlePolygonCleared}
          mode={mode}
          slopeCells={slopeCells}
        />

        {/* Top Controls */}
        <View style={[styles.topControls, { top: insets.top + 16 }]}>
          <View style={{flexDirection: 'row', gap: 8}}>
            <Button title="Area" onPress={() => setMode('polygon')} variant={mode === 'polygon' ? 'primary' : 'secondary'} size="small" />
            <Button title="Line" onPress={() => setMode('two_point')} variant={mode === 'two_point' ? 'primary' : 'secondary'} size="small" />
            <Button title="Path" onPress={() => setMode('path')} variant={mode === 'path' ? 'primary' : 'secondary'} size="small" />
          </View>
          <View style={{flexDirection: 'row', gap: 8}}>
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
          title={mode === 'polygon' ? "Area Measurement" : "Distance Measurement"}
          subtitle={
            metrics?.area
              ? `${metrics.area.toFixed(3)} km² • ${metrics.perimeter?.toFixed(3)} km perimeter`
              : metrics?.length
              ? `${metrics.length.toFixed(3)} km`
              : undefined
          }
        >
          {/* Stats */}
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>POINTS</Text>
              <Text style={styles.statValue}>{polygonPoints.length}</Text>
            </View>

            {mode === 'polygon' ? (
              <>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>AREA</Text>
                  <Text style={styles.statValue}>{metrics?.area?.toFixed(3)}</Text>
                  <Text style={styles.statHint}>km²</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>PERIMETER</Text>
                  <Text style={styles.statValue}>{metrics?.perimeter?.toFixed(2)}</Text>
                  <Text style={styles.statHint}>km</Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>LENGTH</Text>
                  <Text style={styles.statValue}>{metrics?.length?.toFixed(3)}</Text>
                  <Text style={styles.statHint}>km</Text>
                </View>
                {metrics?.heading !== undefined ? (
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>HEADING</Text>
                    <Text style={styles.statValue}>{metrics.heading.toFixed(1)}°</Text>
                  </View>
                ) : <View style={styles.statBox} />}
              </>
            )}
          </View>

          {/* Advanced Metrics */}
          {metrics?.minElevation !== undefined && (
            <View style={{ marginBottom: 16, paddingHorizontal: 4 }}>
              <Text style={[styles.statLabel, { marginBottom: 8 }]}>ELEVATION (m)</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text>Min: {metrics.minElevation}m</Text>
                <Text>Med: {metrics.medianElevation}m</Text>
                <Text>Max: {metrics.maxElevation}m</Text>
              </View>
            </View>
          )}

          {metrics?.minSlope !== undefined && (
            <View style={{ marginBottom: 16, paddingHorizontal: 4 }}>
              <Text style={[styles.statLabel, { marginBottom: 8 }]}>SLOPE (°)</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text>Min: {metrics.minSlope?.toFixed(1)}°</Text>
                <Text>Med: {metrics.medianSlope?.toFixed(1)}°</Text>
                <Text>Max: {metrics.maxSlope?.toFixed(1)}°</Text>
              </View>
            </View>
          )}

          {/* Progress */}
          {isExtracting && extractionProgress && (
            <ProgressCard progress={extractionProgress} />
          )}

          {/* Slope Legend */}
          {slopeCells.length > 0 && (
            <View style={styles.slopeLegend}>
              <Text style={[styles.statLabel, { marginBottom: 8 }]}>SLOPE LEGEND</Text>
              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: SLOPE_COLORS.flat }]} />
                  <Text style={styles.legendText}>0-5%</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: SLOPE_COLORS.gentle }]} />
                  <Text style={styles.legendText}>5-10%</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: SLOPE_COLORS.moderate }]} />
                  <Text style={styles.legendText}>10-15%</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: SLOPE_COLORS.steep }]} />
                  <Text style={styles.legendText}>15-25%</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: SLOPE_COLORS.verySteep }]} />
                  <Text style={styles.legendText}>25%+</Text>
                </View>
              </View>
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            {!isExtracting && !downloadUrl && !geojsonUrl && (
              <>
                {mode === 'polygon' && (
                  <>
                    <Button
                      title={isLoadingSlope ? "Analyzing Slope..." : slopeCells.length > 0 ? "Hide Slope" : "Show Slope"}
                      onPress={slopeCells.length > 0 ? handleClearSlope : handleShowSlope}
                      variant="secondary"
                      size="medium"
                      style={styles.actionButton}
                      disabled={isLoadingSlope}
                    />
                    <Button
                      title="Extract & Process"
                      onPress={handleExtract}
                      variant="primary"
                      size="large"
                      style={styles.actionButton}
                    />
                  </>
                )}
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

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.footerButton}
            onPress={() => setShowFeedback(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.footerIcon}>💬</Text>
            <Text style={styles.footerText}>Feedback</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.footerButton}
            onPress={() => setShowPrivacyPolicy(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.footerIcon}>🛡️</Text>
            <Text style={styles.footerText}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>

        {/* Privacy Policy Modal */}
        <PrivacyPolicy
          visible={showPrivacyPolicy}
          onClose={() => setShowPrivacyPolicy(false)}
        />

        {/* Feedback Modal */}
        <Feedback
          visible={showFeedback}
          onClose={() => setShowFeedback(false)}
        />
      </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
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
    left: 16,
    flexDirection: 'column',
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
  slopeLegend: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  legendItem: {
    alignItems: 'center',
    gap: 4,
  },
  legendColor: {
    width: 24,
    height: 16,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  footer: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  footerIcon: {
    fontSize: 12,
  },
  footerText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
});
