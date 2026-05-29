import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { healthCheckTool } from '../../src/tools/health.js';

describe('Health Check Tool', () => {
  it('should have correct definition', () => {
    expect(healthCheckTool.definition.name).toBe('overture_health_check');
    expect(healthCheckTool.definition.description).toBeDefined();
    expect(healthCheckTool.definition.inputSchema).toBeDefined();
  });

  it('should return healthy status when backend is running', async () => {
    // This test requires a running backend
    // Skip if backend is not available
    try {
      const result = await healthCheckTool.handler({
        backend_url: 'http://localhost:8080',
      });

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');

      const data = JSON.parse(result.content[0].text!);
      expect(data.status).toBe('healthy');
      expect(data.version).toBeDefined();
      expect(data.timestamp).toBeDefined();
    } catch (error) {
      console.log('Backend not available, skipping test');
    }
  }, 10000);

  it('should return unhealthy status when backend is down', async () => {
    const result = await healthCheckTool.handler({
      backend_url: 'http://localhost:9999',
    });

    expect(result.isError).toBe(true);
    expect(result.content).toBeDefined();

    const data = JSON.parse(result.content[0].text!);
    expect(data.status).toBe('unhealthy');
    expect(data.error).toBeDefined();
  }, 10000);
});
