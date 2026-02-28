import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { WebSocketServer } from 'ws';
import http from 'http';

const WS_PORT = 3001;

// ─── WebSocket server (communicates with browser frontend) ────────────────────

const httpServer = http.createServer();
const wss = new WebSocketServer({ server: httpServer });

const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  ws.on('close', () => clients.delete(ws));
});

function broadcast(message) {
  const data = JSON.stringify(message);
  for (const client of clients) {
    if (client.readyState === 1 /* OPEN */) {
      client.send(data);
    }
  }
}

httpServer.listen(WS_PORT, () => {
  process.stderr.write(`[Avatar Server] WebSocket listening on ws://localhost:${WS_PORT}\n`);
});

// ─── MCP Server ───────────────────────────────────────────────────────────────

const server = new McpServer({
  name: 'avatar-rodri-digital',
  version: '1.0.0',
});

// Tool: speak
server.tool(
  'avatar_speak',
  'Hace que el avatar de Rodri Digital diga un texto en voz visible con animación de habla.',
  {
    text: z.string().describe('Texto que el avatar dirá (se muestra como burbuja de diálogo).'),
    duration: z
      .number()
      .optional()
      .describe('Duración en milisegundos de la animación. Si no se especifica se calcula automáticamente.'),
  },
  async ({ text, duration }) => {
    const dur = duration ?? Math.max(3000, text.length * 60);
    broadcast({ type: 'speak', text, duration: dur });
    return {
      content: [{ type: 'text', text: `Avatar hablando: "${text}" (${dur}ms)` }],
    };
  }
);

// Tool: set_emotion
server.tool(
  'avatar_set_emotion',
  'Cambia la expresión facial del avatar.',
  {
    emotion: z
      .enum(['neutral', 'happy', 'sad', 'surprised', 'angry', 'thinking'])
      .describe('Emoción a mostrar en el avatar.'),
  },
  async ({ emotion }) => {
    broadcast({ type: 'emotion', emotion });
    return {
      content: [{ type: 'text', text: `Emoción del avatar cambiada a: ${emotion}` }],
    };
  }
);

// Tool: trigger_gesture
server.tool(
  'avatar_gesture',
  'Activa un gesto o animación en el avatar.',
  {
    gesture: z
      .enum(['wave', 'nod', 'shake_head', 'thumbs_up', 'point'])
      .describe('Gesto a realizar: wave (saludar), nod (asentir), shake_head (negar), thumbs_up (pulgar arriba), point (señalar).'),
    duration: z
      .number()
      .optional()
      .describe('Duración del gesto en milisegundos (por defecto 2500).'),
  },
  async ({ gesture, duration }) => {
    broadcast({ type: 'gesture', gesture, duration: duration ?? 2500 });
    return {
      content: [{ type: 'text', text: `Gesto activado: ${gesture}` }],
    };
  }
);

// Tool: stop
server.tool(
  'avatar_stop',
  'Detiene la animación de habla del avatar inmediatamente.',
  {},
  async () => {
    broadcast({ type: 'stop' });
    return {
      content: [{ type: 'text', text: 'Avatar detenido.' }],
    };
  }
);

// ─── Start MCP via stdio ──────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
