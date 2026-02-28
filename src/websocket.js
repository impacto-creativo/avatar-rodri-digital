/**
 * AvatarWebSocket: connects to the local MCP/command server
 * and forwards avatar control commands to the provided callback.
 *
 * The server sends JSON messages of the form:
 *   { type: 'speak' | 'emotion' | 'gesture', ...payload }
 */
export class AvatarWebSocket {
  constructor(url, onCommand) {
    this.url = url;
    this.onCommand = onCommand;
    this.ws = null;
    this.reconnectDelay = 2000;
    this._connect();
  }

  _connect() {
    try {
      this.ws = new WebSocket(this.url);

      this.ws.addEventListener('open', () => {
        console.log('[WS] Connected to avatar command server');
        document.getElementById('connection-dot')?.classList.replace('disconnected', 'connected');
        document.getElementById('connection-label') && (
          document.getElementById('connection-label').textContent = 'MCP: Conectado'
        );
      });

      this.ws.addEventListener('message', (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.onCommand(msg);
        } catch (e) {
          console.warn('[WS] Invalid message:', event.data);
        }
      });

      this.ws.addEventListener('close', () => {
        console.log('[WS] Disconnected – retrying in', this.reconnectDelay, 'ms');
        document.getElementById('connection-dot')?.classList.replace('connected', 'disconnected');
        document.getElementById('connection-label') && (
          document.getElementById('connection-label').textContent = 'MCP: Desconectado'
        );
        setTimeout(() => this._connect(), this.reconnectDelay);
      });

      this.ws.addEventListener('error', () => {
        this.ws.close();
      });
    } catch (e) {
      console.error('[WS] Failed to create WebSocket:', e);
      setTimeout(() => this._connect(), this.reconnectDelay);
    }
  }

  send(data) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }
}
