#!/usr/bin/env node
/**
 * setup-claude.js
 *
 * Configura automáticamente la integración del Avatar Rodri Digital con Claude Desktop.
 *
 * Uso:
 *   node scripts/setup-claude.js          → muestra el JSON y aplica los cambios
 *   node scripts/setup-claude.js --dry-run → solo muestra el JSON, no modifica nada
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const SERVER_PATH = path.join(PROJECT_ROOT, 'server', 'index.js');
const DRY_RUN = process.argv.includes('--dry-run');

// ─── Colors (no external deps) ───────────────────────────────────────────────

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  dim: '\x1b[2m',
};

const log = (msg) => process.stdout.write(msg + '\n');
const ok = (msg) => log(`${c.green}✔${c.reset}  ${msg}`);
const warn = (msg) => log(`${c.yellow}⚠${c.reset}  ${msg}`);
const info = (msg) => log(`${c.cyan}ℹ${c.reset}  ${msg}`);
const err = (msg) => log(`${c.red}✖${c.reset}  ${msg}`);
const header = (msg) => log(`\n${c.bold}${msg}${c.reset}`);
const sep = () => log('─'.repeat(60));

// ─── Detect Node.js path ─────────────────────────────────────────────────────

function findNodePath() {
  try {
    const cmd = os.platform() === 'win32' ? 'where node' : 'which node';
    const result = execSync(cmd, { encoding: 'utf8' }).trim();
    const first = result.split('\n')[0].trim();
    if (first) return first;
  } catch {}
  return process.execPath; // fallback: current node binary
}

// ─── Detect Claude Desktop config path ───────────────────────────────────────

function getClaudeConfigPath() {
  const platform = os.platform();
  if (platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
  }
  if (platform === 'win32') {
    const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    return path.join(appData, 'Claude', 'claude_desktop_config.json');
  }
  // Linux (and other Unix)
  const xdgConfig = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  return path.join(xdgConfig, 'Claude', 'claude_desktop_config.json');
}

// ─── Build MCP server entry ───────────────────────────────────────────────────

function buildMcpEntry(nodePath) {
  return {
    command: nodePath,
    args: [SERVER_PATH],
  };
}

// ─── Read/write config ────────────────────────────────────────────────────────

function readConfig(configPath) {
  if (!fs.existsSync(configPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (e) {
    warn(`No se pudo leer el archivo de configuración existente (${e.message}). Se creará uno nuevo.`);
    return {};
  }
}

function writeConfig(configPath, config) {
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const backup = configPath + '.backup';
  if (fs.existsSync(configPath)) {
    fs.copyFileSync(configPath, backup);
    ok(`Copia de seguridad guardada en: ${c.dim}${backup}${c.reset}`);
  }
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

header('🤖  Avatar Rodri Digital — Configuración para Claude Desktop');
sep();

// 1. Validate server file exists
if (!fs.existsSync(SERVER_PATH)) {
  err(`No se encontró el servidor en: ${SERVER_PATH}`);
  err(`Asegúrate de ejecutar este script desde el directorio raíz del proyecto.`);
  process.exit(1);
}
ok(`Servidor encontrado: ${c.dim}${SERVER_PATH}${c.reset}`);

// 2. Find node
const nodePath = findNodePath();
ok(`Node.js encontrado en: ${c.dim}${nodePath}${c.reset}`);

// 3. Config file path
const configPath = getClaudeConfigPath();
info(`Archivo de configuración de Claude Desktop:\n   ${c.dim}${configPath}${c.reset}`);

// 4. Build the entry
const mcpEntry = buildMcpEntry(nodePath);
const snippet = {
  mcpServers: {
    'avatar-rodri-digital': mcpEntry,
  },
};

header('📋  Configuración a agregar:');
sep();
log(c.cyan + JSON.stringify(snippet, null, 2) + c.reset);
sep();

if (DRY_RUN) {
  warn('Modo --dry-run: no se modificó ningún archivo.');
  log('');
  log(`Para aplicar los cambios ejecuta:`);
  log(`  ${c.bold}node scripts/setup-claude.js${c.reset}`);
  process.exit(0);
}

// 5. Read existing config and merge
const existing = readConfig(configPath);
if (!existing.mcpServers) existing.mcpServers = {};

const alreadyExists = existing.mcpServers['avatar-rodri-digital'];
existing.mcpServers['avatar-rodri-digital'] = mcpEntry;

writeConfig(configPath, existing);

if (alreadyExists) {
  ok(`Configuración ${c.bold}actualizada${c.reset} en Claude Desktop.`);
} else {
  ok(`Configuración ${c.bold}agregada${c.reset} a Claude Desktop.`);
}

header('🚀  Próximos pasos:');
sep();
log(`  1. ${c.bold}Reinicia Claude Desktop${c.reset} para que detecte el nuevo servidor MCP.`);
log(`  2. Inicia el servidor del avatar:  ${c.bold}npm start${c.reset}`);
log(`  3. Abre el avatar en el navegador: ${c.bold}npm run dev${c.reset}  →  http://localhost:5173`);
log(`  4. En Claude Desktop verás las herramientas del avatar (ícono 🔧):`);
log(`     ${c.dim}avatar_speak, avatar_set_emotion, avatar_gesture, avatar_stop${c.reset}`);
log('');
log(`  ${c.yellow}Nota:${c.reset} el servidor MCP (${c.bold}npm start${c.reset}) debe estar corriendo`);
log(`  antes de usar el avatar desde Claude Desktop.`);
log('');
