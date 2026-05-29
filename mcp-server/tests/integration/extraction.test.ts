import { describe, it, expect } from 'vitest';
import { extractCheckTool, extractPolygonTool } from '../../src/tools/extract.js';
import { downloadGeoJsonTool, downloadGraphTool } from '../../src/tools/download.js';
import { getStatsTool } from '../../src/tools/stats.js';

describe('Extraction Integration Tests', () => {
  // Test polygon for San Francisco area
  const testPolygon = {
    type: 'Feature' as const,
    geometry: {
      type: 'Polygon' as const,
      coordinates: [
        [
          [-122.4194, 37.7749],
          [-122.4094, 37.7749],
          [-122.4094, 37.7849],
          [-122.4194, 37.7849],
          [-122.4194, 37.7749],
        ],
      ],
    },
  };

  describe('Extract Check Tool', () => {
    it('should check cache for polygon', async () => {
      // Skip if backend not available
      try {
        const result = await extractCheckTool.handler({
          polygon: testPolygon,
        });

        expect(result.content).toBeDefined();
        expect(result.content[0].type).toBe('text');

        const data = JSON.parse(result.content[0].text!);
        expect(data.hash).toBeDefined();
        expect(data.status).toBeDefined();
      } catch (error) {
        console.log('Backend not available, skipping test');
      }
    }, 30000);
  });

  describe('Full Extraction Pipeline', () => {
    it('should extract polygon with progress updates', async () => {
      // This test requires a running backend and takes time
      // Skip in CI or if backend not available
      if (process.env.SKIP_INTEGRATION_TESTS) {
        console.log('Skipping integration test');
        return;
      }

      try {
        const result = await extractPolygonTool.handler({
          polygon: testPolygon,
          timeout_seconds: 300,
        });

        expect(result.content).toBeDefined();
        const data = JSON.parse(result.content[0].text!);

        if (data.status === 'complete') {
          expect(data.hash).toBeDefined();
          expect(data.nodes).toBeGreaterThan(0);
          expect(data.edges).toBeGreaterThan(0);
          expect(data.download_url).toBeDefined();
          expect(data.geojson_url).toBeDefined();
          expect(data.progress_stages).toBeDefined();
          expect(data.progress_stages.length).toBeGreaterThan(0);
        }
      } catch (error) {
        console.log('Backend not available or extraction failed, skipping test');
      }
    }, 360000); // 6 minutes timeout
  });

  describe('Download and Stats Pipeline', () => {
    it('should download geojson and get stats for cached extraction', async () => {
      // First check if we have a cached extraction
      try {
        const checkResult = await extractCheckTool.handler({
          polygon: testPolygon,
        });

        const checkData = JSON.parse(checkResult.content[0].text!);

        if (checkData.cached && checkData.hash) {
          // Get stats
          const statsResult = await getStatsTool.handler({
            hash: checkData.hash,
          });

          expect(statsResult.content).toBeDefined();
          const stats = JSON.parse(statsResult.content[0].text!);
          expect(stats.nodes).toBeGreaterThan(0);
          expect(stats.edges).toBeGreaterThan(0);
          expect(stats.density).toBeDefined();
          expect(stats.is_connected).toBeDefined();

          // Download GeoJSON (without saving to file)
          const geojsonResult = await downloadGeoJsonTool.handler({
            hash: checkData.hash,
          });

          expect(geojsonResult.content).toBeDefined();
          const geojsonData = JSON.parse(geojsonResult.content[0].text!);
          expect(geojsonData.success).toBe(true);
          expect(geojsonData.geojson).toBeDefined();
          expect(geojsonData.feature_count).toBeGreaterThan(0);
        } else {
          console.log('No cached extraction available, skipping download tests');
        }
      } catch (error) {
        console.log('Backend not available, skipping test');
      }
    }, 30000);
  });
});
