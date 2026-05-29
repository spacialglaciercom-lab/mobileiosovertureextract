/**
 * WebSocket Client for Overture Maps Backend
 */

import WebSocket from 'ws';
import {
  ExtractionProgress,
  ExtractionResult,
  Feature,
  BackendError,
  TimeoutError,
} from '../types/index.js';

export type ProgressCallback = (progress: ExtractionProgress) => void;

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private wsUrl: string;

  constructor(wsUrl?: string) {
    this.wsUrl = wsUrl || process.env.OVERTURE_WS_URL || 'ws://localhost:8080';
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const url = `${this.wsUrl}/ws/extract`;
        this.ws = new WebSocket(url);

        this.ws.on('open', () => {
          console.error('WebSocket connected');
          resolve();
        });

        this.ws.on('error', (error) => {
          console.error('WebSocket error:', error);
          reject(
            new BackendError('WebSocket connection error. Check backend is running.', {
              url,
              error: error.message,
            })
          );
        });
      } catch (error) {
        reject(
          new BackendError('Failed to create WebSocket connection', {
            error: (error as Error).message,
          })
        );
      }
    });
  }

  /**
   * Extract polygon with progress updates
   */
  async extractPolygon(
    polygon: Feature,
    onProgress: ProgressCallback,
    timeoutMs: number = 300000
  ): Promise<ExtractionResult> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new BackendError('WebSocket not connected');
    }

    return new Promise((resolve, reject) => {
      const progressStages: ExtractionProgress[] = [];
      let timeoutHandle: NodeJS.Timeout;

      // Set up timeout
      timeoutHandle = setTimeout(() => {
        this.disconnect();
        reject(
          new TimeoutError(`Extraction timed out after ${timeoutMs / 1000} seconds`, {
            progress_stages: progressStages,
          })
        );
      }, timeoutMs);

      // Handle messages
      const messageHandler = (data: WebSocket.Data) => {
        try {
          const progress: ExtractionProgress = JSON.parse(data.toString());
          progressStages.push(progress);
          onProgress(progress);

          // Check for completion or error
          if (progress.stage === 'complete') {
            clearTimeout(timeoutHandle);
            resolve({
              status: 'complete',
              hash: this.extractHashFromUrl(progress.download_url || ''),
              nodes: progress.nodes,
              edges: progress.edges,
              download_url: progress.download_url,
              geojson_url: progress.geojson_url,
              progress_stages: progressStages,
            });
          } else if (progress.stage === 'error') {
            clearTimeout(timeoutHandle);
            reject(
              new BackendError(`Extraction failed: ${progress.error}`, {
                progress_stages: progressStages,
              })
            );
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      // Handle errors
      const errorHandler = (error: Error) => {
        clearTimeout(timeoutHandle);
        reject(
          new BackendError('WebSocket error during extraction', {
            error: error.message,
            progress_stages: progressStages,
          })
        );
      };

      // Handle close
      const closeHandler = () => {
        clearTimeout(timeoutHandle);
        // Only reject if we haven't resolved yet
        if (progressStages.length === 0 || progressStages[progressStages.length - 1].stage !== 'complete') {
          reject(
            new BackendError('WebSocket closed unexpectedly', {
              progress_stages: progressStages,
            })
          );
        }
      };

      // Attach handlers
      this.ws!.on('message', messageHandler);
      this.ws!.on('error', errorHandler);
      this.ws!.on('close', closeHandler);

      // Send polygon
      try {
        this.ws!.send(JSON.stringify({ polygon }));
      } catch (error) {
        clearTimeout(timeoutHandle);
        reject(
          new BackendError('Failed to send polygon', {
            error: (error as Error).message,
          })
        );
      }
    });
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      console.error('WebSocket disconnected');
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Extract hash from download URL
   */
  private extractHashFromUrl(url: string): string {
    const match = url.match(/\/download\/([^/]+)/);
    return match ? match[1] : '';
  }
}
