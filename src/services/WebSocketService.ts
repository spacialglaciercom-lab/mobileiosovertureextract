// WebSocket service for backend communication

import { ExtractionProgress, Feature } from '../types';
import { DEFAULT_WS_URL } from '../constants';

export type ProgressCallback = (progress: ExtractionProgress) => void;
export type ErrorCallback = (error: string) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private progressCallback: ProgressCallback | null = null;
  private errorCallback: ErrorCallback | null = null;

  connect(
    onProgress: ProgressCallback,
    onError: ErrorCallback,
    wsUrl: string = DEFAULT_WS_URL
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(`${wsUrl}/ws/extract`);
        this.progressCallback = onProgress;
        this.errorCallback = onError;

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data: ExtractionProgress = JSON.parse(event.data);
            if (this.progressCallback) {
              this.progressCallback(data);
            }
          } catch (e) {
            console.error('Failed to parse WebSocket message:', e);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          if (this.errorCallback) {
            this.errorCallback('Connection error. Check backend is running.');
          }
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('WebSocket disconnected');
          this.ws = null;
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  sendPolygon(polygon: Feature): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected');
      return false;
    }

    this.ws.send(JSON.stringify({ polygon }));
    return true;
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.progressCallback = null;
    this.errorCallback = null;
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

export const webSocketService = new WebSocketService();
export default WebSocketService;
