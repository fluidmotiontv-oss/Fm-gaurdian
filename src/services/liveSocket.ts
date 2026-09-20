/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface LiveSocketCallbacks {
  onAudioChunk: (base64Audio: string, mimeType?: string) => void;
  onTextChunk: (text: string) => void;
  onInterrupted: () => void;
  onTurnComplete: () => void;
  onStatusChange: (status: 'disconnected' | 'connecting' | 'connected' | 'error', details?: string) => void;
  onError: (error: string) => void;
}

export class LiveSocketClient {
  private ws: WebSocket | null = null;
  private callbacks: LiveSocketCallbacks;
  private isExplicitlyClosed = false;
  private reconnectTimer: any = null;
  private pingInterval: any = null;
  public lastLatencyMs = 0;

  constructor(callbacks: LiveSocketCallbacks) {
    this.callbacks = callbacks;
  }

  public connect() {
    this.isExplicitlyClosed = false;
    this.callbacks.onStatusChange('connecting');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/live`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[LiveSocket] Connected to server /live');
        this.callbacks.onStatusChange('connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'audio') {
            this.callbacks.onAudioChunk(data.audio, data.mimeType);
          } else if (data.type === 'text') {
            this.callbacks.onTextChunk(data.text);
          } else if (data.type === 'interrupted') {
            this.callbacks.onInterrupted();
          } else if (data.type === 'turnComplete') {
            this.callbacks.onTurnComplete();
          } else if (data.type === 'status') {
            this.callbacks.onStatusChange(data.status === 'connected' ? 'connected' : 'disconnected', data.model);
          } else if (data.type === 'error') {
            this.callbacks.onError(data.error || 'Live connection error');
          }
        } catch (e) {
          console.warn('[LiveSocket] Parse error:', e);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('[LiveSocket] Socket error:', err);
        this.callbacks.onError('WebSocket encountered a network error.');
      };

      this.ws.onclose = () => {
        this.callbacks.onStatusChange('disconnected');
        if (!this.isExplicitlyClosed) {
          // Auto-reconnect after 3 seconds if not intentionally closed
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = setTimeout(() => {
            if (!this.isExplicitlyClosed) {
              console.log('[LiveSocket] Reconnecting...');
              this.connect();
            }
          }, 3000);
        }
      };
    } catch (e: any) {
      this.callbacks.onError(`Connection initiation failed: ${e?.message}`);
      this.callbacks.onStatusChange('error');
    }
  }

  public sendAudioChunk(base64PCM: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'audio', audio: base64PCM }));
    }
  }

  public sendVideoFrame(base64Jpeg: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'video_frame', frame: base64Jpeg, mimeType: 'image/jpeg' }));
    }
  }

  public sendTextMessage(text: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'text', text }));
    }
  }

  public disconnect() {
    this.isExplicitlyClosed = true;
    clearTimeout(this.reconnectTimer);
    clearInterval(this.pingInterval);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.callbacks.onStatusChange('disconnected');
  }

  public isConnected(): boolean {
    return Boolean(this.ws && this.ws.readyState === WebSocket.OPEN);
  }
}
