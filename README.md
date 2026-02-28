# Avatar Rodri Digital 🤖

Avatar 3D interactivo de **Rodri Digital** construido con [Three.js](https://threejs.org/), controlable en tiempo real por agentes de IA a través de un servidor **MCP (Model Context Protocol)** compatible con Claude Desktop.

---

## Arquitectura

```
Claude Desktop ──MCP stdio──▶ server/index.js ──WebSocket──▶ Navegador (Three.js)
```

| Capa | Tecnología | Descripción |
|------|-----------|-------------|
| Frontend | Three.js + Vite | Avatar 3D con animaciones y burbuja de diálogo |
| Servidor | Node.js + `ws` | Puente WebSocket entre MCP y el navegador |
| MCP Server | `@modelcontextprotocol/sdk` | Expone herramientas para Claude Desktop |

---

## Requisitos

- Node.js ≥ 18
- [Claude Desktop](https://claude.ai/download) con soporte MCP

---

## Instalación

```bash
npm install
```

---

## Uso en desarrollo

### 1. Iniciar el servidor MCP (con WebSocket)

```bash
npm start
```

> El servidor escucha WebSockets en `ws://localhost:3001` y MCP por `stdio`.

### 2. Iniciar el frontend

```bash
npm run dev
```

Abre `http://localhost:5173` en el navegador.

### 3. Registrar el servidor en Claude Desktop

Edita el archivo de configuración de Claude Desktop:

**macOS/Linux:** `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "avatar-rodri-digital": {
      "command": "node",
      "args": ["/ruta/absoluta/al/proyecto/server/index.js"]
    }
  }
}
```

Reinicia Claude Desktop. El avatar aparecerá en el panel de herramientas.

---

## Herramientas MCP disponibles

| Herramienta | Parámetros | Descripción |
|-------------|-----------|-------------|
| `avatar_speak` | `text`, `duration?` | El avatar habla y muestra burbuja de diálogo |
| `avatar_set_emotion` | `emotion` | Cambia expresión facial (`neutral`, `happy`, `sad`, `surprised`, `angry`, `thinking`) |
| `avatar_gesture` | `gesture`, `duration?` | Activa un gesto (`wave`, `nod`, `shake_head`, `thumbs_up`, `point`) |
| `avatar_stop` | — | Detiene la animación de habla |

---

## Build para producción

```bash
npm run build
```

La aplicación queda en `dist/`. Puede servirse con cualquier servidor estático.

---

## Estructura del proyecto

```
avatar-rodri-digital/
├── index.html          # Página principal con HUD
├── vite.config.js      # Configuración de Vite
├── package.json
├── src/
│   ├── main.js         # Escena Three.js, render loop, despachador de comandos
│   ├── avatar.js       # Construcción y animación del avatar
│   └── websocket.js    # Cliente WebSocket con reconexión automática
└── server/
    └── index.js        # Servidor MCP + WebSocket
```

