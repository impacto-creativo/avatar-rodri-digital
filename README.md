# Avatar Rodri Digital 🤖

Avatar 3D interactivo de **Rodri Digital** construido con [Three.js](https://threejs.org/), controlable en tiempo real por agentes de IA a través de un servidor **MCP (Model Context Protocol)** compatible con **Claude Desktop**.

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

- **Node.js ≥ 18** → [descargar](https://nodejs.org/)
- **Claude Desktop** → [descargar](https://claude.ai/download) (versión con soporte MCP)

---

## Instalación

```bash
git clone https://github.com/impacto-creativo/avatar-rodri-digital.git
cd avatar-rodri-digital
npm install
```

---

## Vinculación con Claude Desktop

### Opción A — Automática (recomendada) ✅

Ejecuta el script de configuración incluido:

```bash
npm run setup-claude
```

El script:
1. Detecta tu sistema operativo
2. Encuentra la ruta correcta al archivo de configuración de Claude Desktop
3. Agrega la entrada del servidor MCP automáticamente
4. Guarda una copia de seguridad del archivo anterior

Si quieres ver qué haría **sin modificar nada**, usa el modo dry-run:

```bash
npm run setup-claude:dry
```

---

### Opción B — Manual

#### Paso 1: Abre el archivo de configuración de Claude Desktop

| Sistema | Ruta del archivo |
|---------|-----------------|
| **macOS** | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| **Windows** | `%APPDATA%\Claude\claude_desktop_config.json` |
| **Linux** | `~/.config/Claude/claude_desktop_config.json` |

Si el archivo no existe, créalo con el contenido siguiente.  
Si ya existe, agrega la sección `mcpServers` (o añade la entrada dentro de ella).

#### Paso 2: Agrega la configuración del avatar

Reemplaza `/ruta/a/tu/proyecto` con la ruta real donde clonaste el repositorio:

```json
{
  "mcpServers": {
    "avatar-rodri-digital": {
      "command": "node",
      "args": ["/ruta/a/tu/proyecto/avatar-rodri-digital/server/index.js"]
    }
  }
}
```

> **Windows:** usa barras invertidas dobles o barras normales:  
> `"C:\\Users\\TuUsuario\\avatar-rodri-digital\\server\\index.js"`

#### Paso 3: Reinicia Claude Desktop

Cierra completamente Claude Desktop y ábrelo de nuevo. Los servidores MCP se cargan al inicio.

---

## Uso diario

### 1. Inicia el servidor del avatar

```bash
npm start
```

Deja esta terminal abierta. El servidor escucha WebSockets en `ws://localhost:3001` y recibe comandos de Claude Desktop por `stdio`.

### 2. Abre el avatar en el navegador

```bash
npm run dev
```

Ve a **http://localhost:5173** — verás el avatar 3D con el indicador de conexión.

### 3. Controla el avatar desde Claude Desktop

En Claude Desktop verás el ícono de herramientas 🔧. Puedes pedirle a Claude:

> *"Usa avatar_speak para que Rodri diga 'Hola, soy tu asistente digital'"*  
> *"Cambia la emoción del avatar a happy"*  
> *"Haz que el avatar salude con wave"*

O Claude lo usará automáticamente al responder si describe acciones del avatar.

---

## Herramientas MCP disponibles

| Herramienta | Parámetros | Descripción |
|-------------|-----------|-------------|
| `avatar_speak` | `text`, `duration?` | El avatar habla y muestra burbuja de diálogo |
| `avatar_set_emotion` | `emotion` | Cambia expresión facial |
| `avatar_gesture` | `gesture`, `duration?` | Activa un gesto corporal |
| `avatar_stop` | — | Detiene la animación de habla |

**Emociones disponibles:** `neutral` · `happy` · `sad` · `surprised` · `angry` · `thinking`

**Gestos disponibles:** `wave` · `nod` · `shake_head` · `thumbs_up` · `point`

---

## Solución de problemas

**El indicador en el avatar dice "MCP: Desconectado"**  
→ Asegúrate de que `npm start` está corriendo en otra terminal.

**Claude Desktop no muestra las herramientas del avatar**  
→ Verifica que el archivo `claude_desktop_config.json` es JSON válido y contiene la entrada `avatar-rodri-digital`.  
→ Reinicia Claude Desktop completamente.  
→ Ejecuta `npm run setup-claude:dry` y revisa que la ruta al servidor es correcta.

**Error `Cannot find module` al iniciar el servidor**  
→ Ejecuta `npm install` desde la raíz del proyecto.

**Puerto 3001 ya en uso**  
→ Cambia `WS_PORT` en `server/index.js` y el `WS_URL` en `src/main.js` al mismo puerto libre.

---

## Build para producción

```bash
npm run build
```

La aplicación queda en `dist/`. El servidor (`server/index.js`) sigue corriendo por separado con Node.js.

---

## Estructura del proyecto

```
avatar-rodri-digital/
├── index.html              # Página principal con HUD
├── vite.config.js          # Configuración de Vite
├── package.json
├── scripts/
│   └── setup-claude.js     # Script de configuración automática para Claude Desktop
├── src/
│   ├── main.js             # Escena Three.js, render loop, despachador de comandos
│   ├── avatar.js           # Construcción y animación del avatar
│   └── websocket.js        # Cliente WebSocket con reconexión automática
└── server/
    └── index.js            # Servidor MCP + WebSocket
```

