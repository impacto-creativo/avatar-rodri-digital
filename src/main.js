import * as THREE from 'three';
import { Avatar } from './avatar.js';
import { AvatarWebSocket } from './websocket.js';

// ─── Scene setup ──────────────────────────────────────────────────────────────

const container = document.getElementById('canvas-container');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a1a);
scene.fog = new THREE.Fog(0x0a0a1a, 10, 30);

// Camera
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.2, 4.5);
camera.lookAt(0, 0.5, 0);

// ─── Lighting ─────────────────────────────────────────────────────────────────

const ambientLight = new THREE.AmbientLight(0x334466, 1.2);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0x88aaff, 2.5);
keyLight.position.set(2, 4, 3);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xffccaa, 0.8);
fillLight.position.set(-3, 2, 1);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0x4477ff, 1.0);
rimLight.position.set(0, 3, -4);
scene.add(rimLight);

// ─── Ground plane ─────────────────────────────────────────────────────────────

const groundGeo = new THREE.CircleGeometry(3, 48);
const groundMat = new THREE.MeshStandardMaterial({
  color: 0x111133,
  roughness: 0.8,
  metalness: 0.1,
});
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -1.52;
ground.receiveShadow = true;
scene.add(ground);

// Subtle glow ring under avatar
const ringGeo = new THREE.RingGeometry(0.35, 0.7, 40);
const ringMat = new THREE.MeshBasicMaterial({
  color: 0x2255bb,
  transparent: true,
  opacity: 0.4,
  side: THREE.DoubleSide,
});
const ring = new THREE.Mesh(ringGeo, ringMat);
ring.rotation.x = -Math.PI / 2;
ring.position.y = -1.5;
scene.add(ring);

// ─── Grid ─────────────────────────────────────────────────────────────────────

const gridHelper = new THREE.GridHelper(10, 20, 0x112244, 0x112244);
gridHelper.position.y = -1.52;
scene.add(gridHelper);

// ─── Avatar ───────────────────────────────────────────────────────────────────

const avatar = new Avatar(scene);
avatar.group.position.y = -1.5;

// ─── UI helpers ───────────────────────────────────────────────────────────────

const speechBubble = document.getElementById('speech-bubble');
const stateEl = document.getElementById('state-value');
const emotionEl = document.getElementById('emotion-value');

let speechTimeout = null;

function showSpeech(text, durationMs) {
  speechBubble.textContent = text;
  speechBubble.classList.add('visible');
  clearTimeout(speechTimeout);
  speechTimeout = setTimeout(() => speechBubble.classList.remove('visible'), durationMs + 500);
}

function updateHUD() {
  if (stateEl) stateEl.textContent = stateLabels[avatar.state] || avatar.state;
  if (emotionEl) emotionEl.textContent = emotionLabels[avatar.emotion] || avatar.emotion;
}

const stateLabels = {
  idle: 'Inactivo',
  speaking: 'Hablando',
  wave: 'Saludando',
  nod: 'Asintiendo',
  shake_head: 'Negando',
  thumbs_up: 'Aprobando 👍',
  point: 'Señalando',
};

const emotionLabels = {
  neutral: 'Neutral',
  happy: 'Feliz 😊',
  sad: 'Triste 😢',
  surprised: 'Sorprendido 😮',
  angry: 'Enojado 😠',
  thinking: 'Pensando 🤔',
};

// ─── Command dispatcher ───────────────────────────────────────────────────────

function handleCommand(msg) {
  switch (msg.type) {
    case 'speak': {
      const text = msg.text || '';
      const duration = msg.duration || Math.max(3000, text.length * 60);
      avatar.speak(text, duration);
      showSpeech(text, duration);
      break;
    }
    case 'emotion':
      avatar.setEmotion(msg.emotion || 'neutral');
      break;
    case 'gesture':
      avatar.triggerGesture(msg.gesture, msg.duration || 2500);
      break;
    case 'stop':
      avatar.stopSpeaking();
      speechBubble.classList.remove('visible');
      break;
    default:
      console.warn('[Avatar] Unknown command type:', msg.type);
  }
  updateHUD();
}

// ─── WebSocket connection to command server ───────────────────────────────────

// Default port matches server/index.js WS_PORT
const WS_URL = `ws://localhost:3001`;
new AvatarWebSocket(WS_URL, handleCommand);

// ─── Resize handler ───────────────────────────────────────────────────────────

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── Render loop ──────────────────────────────────────────────────────────────

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();

  avatar.update(dt);

  // Slow rotation of the glow ring
  ring.rotation.z += dt * 0.4;

  updateHUD();
  renderer.render(scene, camera);
}

animate();
