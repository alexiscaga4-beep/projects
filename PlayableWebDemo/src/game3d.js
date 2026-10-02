import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// --- Sound Synthesizer (Zero-Dependency Web Audio API) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(type) {
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  const now = audioCtx.currentTime;

  if (type === 'fireball') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(500, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.18);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.18);
    osc.start(now);
    osc.stop(now + 0.18);
  } else if (type === 'hit') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(45, now + 0.12);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
    osc.start(now);
    osc.stop(now + 0.12);
  } else if (type === 'gem') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(1450, now + 0.14);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.14);
    osc.start(now);
    osc.stop(now + 0.14);
  } else if (type === 'levelup') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.setValueAtTime(660, now + 0.12);
    osc.frequency.setValueAtTime(990, now + 0.24);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.45);
    osc.start(now);
    osc.stop(now + 0.45);
  } else if (type === 'hurt') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(170, now);
    osc.frequency.linearRampToValueAtTime(35, now + 0.2);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
    osc.start(now);
    osc.stop(now + 0.2);
  } else if (type === 'altar') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(820, now + 0.3);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.6);
    osc.start(now);
    osc.stop(now + 0.6);
  } else if (type === 'torch') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(360, now + 0.15);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
    osc.start(now);
    osc.stop(now + 0.25);
  } else if (type === 'crystal') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.2);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
    osc.start(now);
    osc.stop(now + 0.2);
  }
}

// ==========================================
// 1. SCENE, ISOMETRIC CAMERA & BOUNDARIES
// ==========================================
const container = document.getElementById('game-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0e131d);
// 3. REDUCED DRAW DISTANCE: Linear fog matches camera far clipping plane
scene.fog = new THREE.Fog(0x0e131d, 48, 88);

// Isometric RPG Perspective Camera
// 3. CAMERA CLIPPING: Far clipping plane reduced from 350 down to 88m
const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 88);
const CAM_OFFSET = new THREE.Vector3(18, 22, 18);

// STRICT CAMERA CLAMP LIMITS (Prevents camera from panning into the void)
const CAM_LIMITS = {
  minX: -14,
  maxX: 14,
  minZ: -12,
  maxZ: 14
};

// Camera Occlusion Raycasting State
const cameraRaycaster = new THREE.Raycaster();
const occludingMeshes = [];

// 4. LOWER RESOLUTION SCALE & DISABLED POST-PROCESSING / ANTI-ALIASING
// antialias = false eliminates expensive multi-sample passes; setPixelRatio(0.75) cuts fill rate by ~44%
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);

let currentRenderScale = 0.75;
renderer.setPixelRatio(currentRenderScale);

// 1. DISABLE DYNAMIC SHADOWS: Completely turns off shadow depth map render passes for all objects
renderer.shadowMap.enabled = false;
renderer.toneMapping = THREE.NoToneMapping; // Simplified tone mapping

const existingCanvas = document.getElementById('gameCanvas');
if (existingCanvas) {
  existingCanvas.replaceWith(renderer.domElement);
} else {
  container.insertBefore(renderer.domElement, container.firstChild);
}
renderer.domElement.id = 'gameCanvas';

// 1. CHEAP BLOB SHADOWS: Dark circular decals replacing real-time dynamic shadows
const blobShadowGeo = new THREE.CircleGeometry(1.0, 16);
blobShadowGeo.rotateX(-Math.PI / 2);
const blobShadowMat = new THREE.MeshBasicMaterial({
  color: 0x000000,
  transparent: true,
  opacity: 0.38,
  depthWrite: false
});

function createBlobShadow(radius = 1.0) {
  const mesh = new THREE.Mesh(blobShadowGeo, blobShadowMat);
  mesh.scale.set(radius, 1, radius);
  mesh.position.y = 0.04; // Sits slightly above ground floor
  mesh.renderOrder = 1;
  return mesh;
}

// Atmospheric Lighting (Simple diffuse lighting without shadow map overhead)
const ambientLight = new THREE.AmbientLight(0xdbe6f6, 1.15);
scene.add(ambientLight);

const hemiLight = new THREE.HemisphereLight(0x7ec8e3, 0x1b233d, 0.75);
scene.add(hemiLight);

const sunLight = new THREE.DirectionalLight(0xfff3db, 2.2);
sunLight.position.set(40, 65, 35);
sunLight.castShadow = false; // Disabled dynamic shadow casting
scene.add(sunLight);

// ==========================================
// 2. ENCLOSED TERRAIN & STRICT BOUNDARIES
// ==========================================
const arenaRadius = 34.0; // Playable boundary radius

// Sub-Terrain Base Foundation
const baseGroundGeo = new THREE.PlaneGeometry(280, 280, 8, 8);
baseGroundGeo.rotateX(-Math.PI / 2);
const canvasTile = document.createElement('canvas');
canvasTile.width = 128;
canvasTile.height = 128;
const tCtx = canvasTile.getContext('2d');
tCtx.fillStyle = '#10141e';
tCtx.fillRect(0, 0, 128, 128);
tCtx.strokeStyle = '#181e2c';
tCtx.lineWidth = 2;
tCtx.strokeRect(2, 2, 124, 124);
const groundTex = new THREE.CanvasTexture(canvasTile);
groundTex.wrapS = THREE.RepeatWrapping;
groundTex.wrapT = THREE.RepeatWrapping;
groundTex.repeat.set(50, 50);

const baseGroundMat = new THREE.MeshStandardMaterial({
  map: groundTex,
  roughness: 0.95,
  metalness: 0.05
});
const baseGround = new THREE.Mesh(baseGroundGeo, baseGroundMat);
baseGround.position.y = -0.5;
baseGround.receiveShadow = true;
scene.add(baseGround);

// Visual Enclosed Barrier: Ancient Stone Ward Pillars
const barrierGroup = new THREE.Group();
const pillarGeo = new THREE.CylinderGeometry(0.8, 1.1, 5.0, 8);
const pillarMat = new THREE.MeshStandardMaterial({ color: 0x1d2230, roughness: 0.9 });
const numPillars = 24;

for (let i = 0; i < numPillars; i++) {
  const angle = (i / numPillars) * Math.PI * 2;
  const pMesh = new THREE.Mesh(pillarGeo, pillarMat);
  pMesh.position.set(Math.cos(angle) * (arenaRadius + 0.8), 2.5, Math.sin(angle) * (arenaRadius + 0.8));
  pMesh.castShadow = true;
  pMesh.receiveShadow = true;
  barrierGroup.add(pMesh);
}

// Glowing Arcane Ward Wall
const wardGeo = new THREE.CylinderGeometry(arenaRadius + 0.5, arenaRadius + 0.5, 4.5, 64, 1, true);
const wardMat = new THREE.MeshBasicMaterial({
  color: 0x00d2ff,
  transparent: true,
  opacity: 0.25,
  side: THREE.DoubleSide,
  depthWrite: false
});
const wardMesh = new THREE.Mesh(wardGeo, wardMat);
wardMesh.position.y = 2.25;
barrierGroup.add(wardMesh);

// Ground Border Runes
const boundaryGeo = new THREE.RingGeometry(arenaRadius - 0.7, arenaRadius, 96);
boundaryGeo.rotateX(-Math.PI / 2);
const boundaryMat = new THREE.MeshBasicMaterial({
  color: 0x00ffff,
  side: THREE.DoubleSide,
  transparent: true,
  opacity: 0.65,
  depthWrite: false
});
const boundaryMesh = new THREE.Mesh(boundaryGeo, boundaryMat);
boundaryMesh.position.y = 0.15;
boundaryMesh.renderOrder = 1;
barrierGroup.add(boundaryMesh);

scene.add(barrierGroup);

// ==========================================
// 3. ZERO-LAG PRECOMPUTED HEIGHT GRID (O(1))
// ==========================================
// Completely replaces expensive per-frame raycasting with an instant, lag-free height lookup table
const heightGridRes = 64;
const gridMin = -42;
const gridMax = 42;
const gridStep = (gridMax - gridMin) / (heightGridRes - 1);
const heightGrid = new Float32Array(heightGridRes * heightGridRes);

function getGroundHeight(x, z) {
  // Fast Bilinear Grid Interpolation in O(1)
  const gx = (x - gridMin) / gridStep;
  const gz = (z - gridMin) / gridStep;
  const ix = Math.floor(gx);
  const iz = Math.floor(gz);

  if (ix < 0 || ix >= heightGridRes - 1 || iz < 0 || iz >= heightGridRes - 1) {
    return 0.35; // Default temple floor height
  }

  const fx = gx - ix;
  const fz = gz - iz;

  const h00 = heightGrid[iz * heightGridRes + ix];
  const h10 = heightGrid[iz * heightGridRes + (ix + 1)];
  const h01 = heightGrid[(iz + 1) * heightGridRes + ix];
  const h11 = heightGrid[(iz + 1) * heightGridRes + (ix + 1)];

  const hTop = h00 * (1 - fx) + h10 * fx;
  const hBottom = h01 * (1 - fx) + h11 * fx;
  return hTop * (1 - fz) + hBottom * fz;
}

// Precomputes the height grid ONCE during terrain loading
function buildHeightGrid(terrainScene) {
  const meshes = [];
  terrainScene.traverse(c => {
    if (c.isMesh) meshes.push(c);
  });

  const ray = new THREE.Raycaster();
  const down = new THREE.Vector3(0, -1, 0);

  for (let r = 0; r < heightGridRes; r++) {
    for (let c = 0; c < heightGridRes; c++) {
      const wx = gridMin + c * gridStep;
      const wz = gridMin + r * gridStep;

      ray.set(new THREE.Vector3(wx, 50, wz), down);
      const hits = ray.intersectObjects(meshes, true);
      let foundY = 0.35;

      for (let i = 0; i < hits.length; i++) {
        if (hits[i].point.y < 12.0 && hits[i].point.y >= -1.0) {
          foundY = hits[i].point.y;
          break;
        }
      }
      heightGrid[r * heightGridRes + c] = foundY;
    }
  }
  console.log('✓ Zero-Lag Height Grid Precomputed (60 FPS Unlocked)');
}

// ==========================================
// 4. MODEL SCALING & TEMPLATES (1.8x LARGER)
// ==========================================
const loader = new GLTFLoader();
const modelTemplates = {
  player: null,
  fireball: null,
  breadMonster: null,
  eyeMonster: null,
  insectMonster: null,
  terrain: null
};

// Generic Normalizer for Character Models
// Scales characters by 1.8x and sets renderOrder = 2 with depthWrite = true
function prepareCharacterTemplate(gltfScene, targetHeight) {
  const root = gltfScene;
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxH = size.y || 1;
  const scale = targetHeight / maxH;
  root.scale.set(scale, scale, scale);

  const scaledBox = new THREE.Box3().setFromObject(root);
  const center = new THREE.Vector3();
  scaledBox.getCenter(center);

  root.position.x -= center.x;
  root.position.z -= center.z;
  root.position.y -= scaledBox.min.y;

  root.traverse(child => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      child.renderOrder = 2; // Renders squarely on top of floor & decals
      if (child.material) {
        child.material.depthTest = true;
        child.material.depthWrite = true;
        child.material.transparent = false;
        child.material.roughness = 0.65;
      }
    }
  });

  const wrapper = new THREE.Group();
  wrapper.add(root);
  return wrapper;
}

// Scaled Fallback Geometries (1.8x larger)
function createFallbackPlayer() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.9, 1.8, 8, 16),
    new THREE.MeshStandardMaterial({ color: 0x3a7bd5, roughness: 0.4 })
  );
  body.position.y = 1.8;
  body.castShadow = true;
  body.renderOrder = 2;
  g.add(body);
  const hat = new THREE.Mesh(
    new THREE.ConeGeometry(1.0, 1.8, 16),
    new THREE.MeshStandardMaterial({ color: 0x1d2c5e, roughness: 0.5 })
  );
  hat.position.y = 3.6;
  hat.castShadow = true;
  hat.renderOrder = 2;
  g.add(hat);
  return g;
}

function createFallbackFireball() {
  const g = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.7, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xff4500, emissive: 0xff6b35, emissiveIntensity: 2.2 })
  );
  core.renderOrder = 2;
  g.add(core);
  return g;
}

function createFallbackMonster(color, height) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(height * 0.8, height, height * 0.8),
    new THREE.MeshStandardMaterial({ color, roughness: 0.6 })
  );
  m.position.y = height / 2;
  m.castShadow = true;
  m.renderOrder = 2;
  g.add(m);
  return g;
}

// --- Load Terrain Model (el_inicio_-_the_beggining.glb) ---
loader.load('models/el_inicio_-_the_beggining.glb', gltf => {
  const terrain = gltf.scene;
  const terrainScale = 8.0;
  terrain.scale.set(terrainScale, terrainScale, terrainScale);
  terrain.position.set(0, -0.05, 0);
  terrain.updateMatrixWorld(true);

  terrain.traverse(child => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      child.userData.isEnvironment = true;

      if (child.material) {
        child.material.depthTest = true;
        child.material.depthWrite = true;
        child.material.polygonOffset = true;
        child.material.polygonOffsetFactor = 1.0;
        child.material.polygonOffsetUnits = 1.0;
        child.material.roughness = 0.82;
      }

      const lowerName = (child.name || '').toLowerCase();

      // Camera Occlusion: Detect tall tree foliage, canopies, or statues blocking view
      if (lowerName.includes('arbol') || lowerName.includes('pino') || lowerName.includes('espada') || lowerName.includes('obelisco')) {
        child.userData.isOccluder = true;
        if (child.material) {
          child.material = child.material.clone();
          child.material.transparent = true;
          child.userData.originalOpacity = child.material.opacity !== undefined ? child.material.opacity : 1.0;
          child.userData.targetOpacity = 1.0;
        }
        occludingMeshes.push(child);
      }

      // Static Environment Colliders: Extract solid obstacles (rocks, statues, trunks, bases)
      if (!lowerName.includes('suelo') && !lowerName.includes('terra')) {
        const box = new THREE.Box3().setFromObject(child);
        const size = new THREE.Vector3();
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);

        // Keep obstacles with meaningful horizontal dimensions (exclude tiny rubble or map bounds)
        if (size.x > 0.8 && size.x < 22 && size.z > 0.8 && size.z < 22 && size.y > 0.6) {
          const colRadius = Math.min(Math.max(size.x, size.z) * 0.45, 4.0);
          interactiveProps.obstacles.push({
            pos: new THREE.Vector3(center.x, 0, center.z),
            radius: colRadius,
            name: child.name,
            height: size.y
          });
        }
      }
    }
  });

  scene.add(terrain);
  modelTemplates.terrain = terrain;

  // Precompute height grid once
  buildHeightGrid(terrain);

  // Position player safely on floor
  player.pos.y = getGroundHeight(player.pos.x, player.pos.z);
  player.group.position.y = player.pos.y;
  console.log('✓ Enclosed Terrain Loaded (Colliders & Occluders Active)');
});

// --- Load Lizard Wizard (Hero Player) - 1.8x SCALED to 4.2m ---
loader.load('models/lizard_wizard.glb', gltf => {
  modelTemplates.player = prepareCharacterTemplate(gltf.scene, 4.2);
  if (player.mesh) {
    player.group.remove(player.mesh);
    player.mesh = modelTemplates.player.clone(true);
    player.group.add(player.mesh);
  }
  console.log('✓ Lizard Wizard Loaded (Scaled 1.8x to 4.2m)');
});

// --- Load Fireball Projectile - 1.8x SCALED to 2.4m ---
loader.load('models/low_poly_fireball__boule_de_feu_en_low_poly.glb', gltf => {
  const root = gltf.scene;
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const scale = 2.4 / maxDim; // 1.8x larger
  root.scale.set(scale, scale, scale);

  const scaledBox = new THREE.Box3().setFromObject(root);
  const center = new THREE.Vector3();
  scaledBox.getCenter(center);
  root.position.sub(center);

  // Aligned head-first along +Z axis
  root.rotation.y = -Math.PI / 2;

  root.traverse(child => {
    if (child.isMesh) {
      child.renderOrder = 2;
      if (child.material) {
        child.material.emissive = new THREE.Color(0xff5500);
        child.material.emissiveIntensity = 1.4;
      }
    }
  });

  const wrapper = new THREE.Group();
  wrapper.add(root);
  modelTemplates.fireball = wrapper;
  console.log('✓ Fireball Projectile Loaded (Scaled 1.8x to 2.4m)');
});

// --- Load Enemy Models - 1.8x SCALED ---
loader.load('models/low_poly_monster_model.glb', gltf => {
  modelTemplates.eyeMonster = prepareCharacterTemplate(gltf.scene, 2.9);
  console.log('✓ Low Poly Monster Loaded (Scaled 1.8x to 2.9m)');
});

loader.load('models/bread_monster_model.glb', gltf => {
  modelTemplates.breadMonster = prepareCharacterTemplate(gltf.scene, 3.1);
  console.log('✓ Bread Monster Loaded (Scaled 1.8x to 3.1m)');
});

loader.load('models/stylized_insect_monster_pbr_low-poly_game_ready (1).glb', gltf => {
  modelTemplates.insectMonster = prepareCharacterTemplate(gltf.scene, 6.0);
  console.log('✓ Insect Brute Boss Loaded (Scaled 1.8x to 6.0m)');
});

// ==========================================
// 5. INTERACTIVE TERRAIN SYSTEMS
// ==========================================
const altarRuneGeo = new THREE.RingGeometry(4.5, 5.5, 48);
altarRuneGeo.rotateX(-Math.PI / 2);
const altarRuneMat = new THREE.MeshBasicMaterial({
  color: 0x00ffff,
  transparent: true,
  opacity: 0.75,
  side: THREE.DoubleSide,
  depthWrite: false
});
const altarRuneMesh = new THREE.Mesh(altarRuneGeo, altarRuneMat);
altarRuneMesh.position.set(0.5, 0.4, -20);
altarRuneMesh.renderOrder = 1;
scene.add(altarRuneMesh);

const altarPointLight = new THREE.PointLight(0x00d2ff, 3.5, 18);
altarPointLight.position.set(0.5, 4.0, -20);
scene.add(altarPointLight);

const interactiveProps = {
  altar: {
    pos: new THREE.Vector3(0.5, 0, -20),
    radius: 5.5,
    cooldown: 0,
    maxCooldown: 18,
    runeMesh: altarRuneMesh,
    light: altarPointLight
  },
  torches: [],
  crystals: [],
  obstacles: [
    { pos: new THREE.Vector3(0.5, 0, -20), radius: 4.5 },
    { pos: new THREE.Vector3(-4.0, 0, 26), radius: 2.2 },
    { pos: new THREE.Vector3(9.5, 0, 28), radius: 2.2 },
    { pos: new THREE.Vector3(-24, 0, 0), radius: 3.0 },
    { pos: new THREE.Vector3(24, 0, 2), radius: 3.0 }
  ]
};

// 5 Interactive Torches
const torchConfigs = [
  { x: 17.0, z: -18.0 },
  { x: -11.0, z: -7.0 },
  { x: -9.5, z: -13.0 },
  { x: 12.0, z: -4.0 },
  { x: -12.5, z: -19.0 }
];

torchConfigs.forEach((cfg, idx) => {
  const torchGroup = new THREE.Group();
  torchGroup.position.set(cfg.x, 0, cfg.z);

  const ped = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.85, 2.2, 8),
    new THREE.MeshStandardMaterial({ color: 0x222633, roughness: 0.9 })
  );
  ped.position.y = 1.1;
  ped.castShadow = true;
  ped.renderOrder = 2;
  torchGroup.add(ped);

  const bowl = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 0.45, 0.6, 8),
    new THREE.MeshStandardMaterial({ color: 0x3a4055, roughness: 0.8, metalness: 0.3 })
  );
  bowl.position.y = 2.3;
  bowl.castShadow = true;
  bowl.renderOrder = 2;
  torchGroup.add(bowl);

  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.5, 1.3, 8),
    new THREE.MeshBasicMaterial({ color: 0xff6b35, transparent: true, opacity: 0.2, depthWrite: false })
  );
  flame.position.y = 3.0;
  flame.renderOrder = 3;
  torchGroup.add(flame);

  const light = new THREE.PointLight(0xff6b35, 0, 14);
  light.position.set(0, 3.1, 0);
  torchGroup.add(light);

  scene.add(torchGroup);

  interactiveProps.torches.push({
    id: idx + 1,
    group: torchGroup,
    flame,
    light,
    pos: new THREE.Vector3(cfg.x, 0, cfg.z),
    radius: 3.8,
    isLit: false,
    burnTimer: 0
  });
});

// 6 Destructible Crystals
const crystalConfigs = [
  { x: -16, z: 6 },
  { x: 16, z: 10 },
  { x: -7, z: 20 },
  { x: 10, z: 22 },
  { x: -19, z: -5 },
  { x: 19, z: -8 }
];

crystalConfigs.forEach((cfg) => {
  const cGroup = new THREE.Group();
  cGroup.position.set(cfg.x, 0, cfg.z);

  const cGeo = new THREE.OctahedronGeometry(1.1, 0);
  const cMat = new THREE.MeshStandardMaterial({
    color: 0x00d2ff,
    emissive: 0x0088cc,
    emissiveIntensity: 0.85,
    roughness: 0.15,
    metalness: 0.85
  });
  const mesh = new THREE.Mesh(cGeo, cMat);
  mesh.position.y = 1.2;
  mesh.castShadow = true;
  mesh.renderOrder = 2;
  cGroup.add(mesh);

  scene.add(cGroup);

  interactiveProps.crystals.push({
    group: cGroup,
    mesh,
    pos: new THREE.Vector3(cfg.x, 0, cfg.z),
    radius: 1.8,
    alive: true,
    respawnTimer: 0
  });
});

// ==========================================
// 6. SAFE SPAWN & PLAYER ARCHITECTURE
// ==========================================
const gameState = {
  isGameOver: false,
  survivalTime: 0,
  kills: 0,
  level: 1,
  currentXP: 0,
  xpToNextLevel: 50,
  torchesLit: 0
};

// Player spawns safely in center of enclosed courtyard
const player = {
  pos: new THREE.Vector3(0, 0.4, 0),
  velocity: new THREE.Vector3(),
  accel: 55,
  maxSpeed: 12.0,
  friction: 14,
  maxHealth: 100,
  health: 100,
  invulnerableTime: 0,
  attackCooldown: 0.72,
  attackTimer: 0,
  targetingRange: 26,
  damage: 35,
  facingAngle: 0,
  walkPhase: 0,
  recoilOffset: 0,
  overchargeTimer: 0,
  radius: 1.15, // Physics capsule collider radius
  colliderHeight: 4.2, // Character collider height
  attackAnimTimer: 0,
  animState: 'IDLE', // 'IDLE', 'WALK', 'ATTACK'
  group: new THREE.Group(),
  mesh: null
};

player.mesh = createFallbackPlayer();
player.group.add(player.mesh);
player.group.position.copy(player.pos);
scene.add(player.group);

// --- Staff Muzzle Node (Fires spells directly from staff crystal tip) ---
const staffMuzzle = new THREE.Object3D();
staffMuzzle.name = 'StaffMuzzle';
staffMuzzle.position.set(1.15, 3.15, 0.45);
player.group.add(staffMuzzle);

const muzzleFlareGeo = new THREE.SphereGeometry(0.35, 8, 8);
const muzzleFlareMat = new THREE.MeshBasicMaterial({ color: 0xffaa33, transparent: true, opacity: 0 });
const muzzleFlareMesh = new THREE.Mesh(muzzleFlareGeo, muzzleFlareMat);
staffMuzzle.add(muzzleFlareMesh);

const playerLight = new THREE.PointLight(0x00d2ff, 1.8, 11);
playerLight.position.set(0, 2.5, 0);
player.group.add(playerLight);

const ringGeo = new THREE.RingGeometry(1.2, 1.5, 32);
ringGeo.rotateX(-Math.PI / 2);
const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0, depthWrite: false });
const castingRing = new THREE.Mesh(ringGeo, ringMat);
castingRing.position.y = 0.08;
castingRing.renderOrder = 1;
player.group.add(castingRing);

const novaGeo = new THREE.RingGeometry(0.5, 2.0, 48);
novaGeo.rotateX(-Math.PI / 2);
const novaMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
const novaMesh = new THREE.Mesh(novaGeo, novaMat);
novaMesh.position.y = 0.3;
novaMesh.renderOrder = 1;
scene.add(novaMesh);
let novaState = { active: false, radius: 0, maxRadius: 34 };

// Shared Pool Geometries for Zero-Garbage Memory Management
const sparkGeo = new THREE.SphereGeometry(0.18, 6, 6);
const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffde59 });
const gemGeo = new THREE.OctahedronGeometry(0.55, 0);
const gemMat = new THREE.MeshStandardMaterial({
  color: 0x00d2ff,
  emissive: 0x00a2ff,
  emissiveIntensity: 0.95,
  roughness: 0.2,
  metalness: 0.8
});

// Entity Collections
const enemies = [];
const projectiles = [];
const gems = [];
const particles = [];

// ==========================================
// 7. CONTROLS & INTERACTION
// ==========================================
const keys = {};
window.addEventListener('keydown', e => {
  keys[e.key.toLowerCase()] = true;

  if (e.code === 'Space' || e.key === 'e' || e.key === 'E') {
    tryActivateAltar();
  }

  if (gameState.isGameOver && (e.key === 'r' || e.key === 'R')) {
    restartGame();
  }
});
window.addEventListener('keyup', e => {
  keys[e.key.toLowerCase()] = false;
});

const shrineBtn = document.createElement('button');
shrineBtn.id = 'shrine-action-btn';
shrineBtn.className = 'shrine-btn hidden';
shrineBtn.innerHTML = '⚡ ACTIVATE SHRINE';
container.appendChild(shrineBtn);
shrineBtn.addEventListener('click', tryActivateAltar);

const touchInput = { active: false, startX: 0, startY: 0, dx: 0, dy: 0 };
const joystickNub = document.getElementById('touch-joystick-nub') || document.createElement('div');
joystickNub.id = 'touch-joystick-nub';
joystickNub.className = 'touch-nub hidden';
if (!joystickNub.parentElement) container.appendChild(joystickNub);

window.addEventListener('touchstart', e => {
  const touch = e.touches[0];
  if (touch.clientY > window.innerHeight * 0.25) {
    touchInput.active = true;
    touchInput.startX = touch.clientX;
    touchInput.startY = touch.clientY;
    touchInput.dx = 0;
    touchInput.dy = 0;
    joystickNub.style.left = `${touch.clientX}px`;
    joystickNub.style.top = `${touch.clientY}px`;
    joystickNub.classList.remove('hidden');
  }
}, { passive: false });

window.addEventListener('touchmove', e => {
  if (!touchInput.active) return;
  const touch = e.touches[0];
  const rawDx = touch.clientX - touchInput.startX;
  const rawDy = touch.clientY - touchInput.startY;
  const dist = Math.hypot(rawDx, rawDy);
  const maxR = 48;

  if (dist > maxR) {
    touchInput.dx = rawDx / dist;
    touchInput.dy = rawDy / dist;
  } else if (dist > 5) {
    touchInput.dx = rawDx / maxR;
    touchInput.dy = rawDy / maxR;
  } else {
    touchInput.dx = 0;
    touchInput.dy = 0;
  }

  joystickNub.style.left = `${touchInput.startX + touchInput.dx * maxR}px`;
  joystickNub.style.top = `${touchInput.startY + touchInput.dy * maxR}px`;
}, { passive: false });

window.addEventListener('touchend', () => {
  touchInput.active = false;
  touchInput.dx = 0;
  touchInput.dy = 0;
  joystickNub.classList.add('hidden');
});

function onWindowResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}
window.addEventListener('resize', onWindowResize);

// ==========================================
// 8. INTERACTIVE ACTIONS
// ==========================================
function tryActivateAltar() {
  const altar = interactiveProps.altar;
  const dist = player.pos.distanceTo(altar.pos);

  if (dist <= altar.radius && altar.cooldown <= 0) {
    activateAltarWrath();
  }
}

function activateAltarWrath() {
  const altar = interactiveProps.altar;
  altar.cooldown = altar.maxCooldown;
  playSound('altar');

  novaState.active = true;
  novaState.radius = 1.0;
  novaMesh.position.copy(altar.pos);
  novaMesh.position.y = getGroundHeight(altar.pos.x, altar.pos.z) + 0.3;
  novaMat.opacity = 1.0;

  player.health = Math.min(player.maxHealth, player.health + 40);
  player.overchargeTimer = 8.0;

  for (let i = 0; i < 30; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd = Math.random() * 20 + 8;
    const spark = new THREE.Mesh(sparkGeo, sparkMat);
    spark.position.copy(altar.pos);
    spark.position.y += 1.8;
    spark.renderOrder = 2;
    scene.add(spark);
    particles.push({
      mesh: spark,
      vel: new THREE.Vector3(Math.cos(angle) * spd, Math.random() * 8 + 4, Math.sin(angle) * spd),
      life: 0.6
    });
  }

  enemies.forEach(e => {
    if (e.dead) return;
    const diff = new THREE.Vector3().subVectors(e.group.position, altar.pos);
    diff.y = 0;
    const d = diff.length();
    if (d < 34) {
      diff.normalize();
      e.hp -= 150;
      e.hitFlash = 0.3;
      e.knockback.addScaledVector(diff, 30);
      e.squashStretch.set(1.5, 0.6, 1.5);
      if (e.hp <= 0) {
        e.dead = true;
        gameState.kills++;
        spawnGem(e.group.position, 35);
      }
    }
  });

  updateHUD();
}

function igniteTorch(torch) {
  if (torch.isLit) return;
  torch.isLit = true;
  torch.flame.material.opacity = 0.95;
  torch.light.intensity = 3.2;
  playSound('torch');
  gameState.torchesLit++;

  for (let i = 0; i < 12; i++) {
    const s = new THREE.Mesh(sparkGeo, sparkMat);
    s.position.set(torch.pos.x, 3.0, torch.pos.z);
    s.renderOrder = 2;
    scene.add(s);
    particles.push({
      mesh: s,
      vel: new THREE.Vector3((Math.random() - 0.5) * 6, Math.random() * 6 + 4, (Math.random() - 0.5) * 6),
      life: 0.45
    });
  }

  if (gameState.torchesLit === 5) {
    addXP(150);
    playSound('levelup');
  }
}

function shatterCrystal(crystal) {
  if (!crystal.alive) return;
  crystal.alive = false;
  crystal.mesh.visible = false;
  crystal.respawnTimer = 40;
  playSound('crystal');

  for (let i = 0; i < 14; i++) {
    const shard = new THREE.Mesh(gemGeo, gemMat);
    shard.scale.set(0.4, 0.4, 0.4);
    shard.position.copy(crystal.pos);
    shard.position.y += 1.0;
    shard.renderOrder = 2;
    scene.add(shard);
    particles.push({
      mesh: shard,
      vel: new THREE.Vector3((Math.random() - 0.5) * 12, Math.random() * 8 + 3, (Math.random() - 0.5) * 12),
      life: 0.5
    });
  }

  spawnGem(crystal.pos, 30);
  player.health = Math.min(player.maxHealth, player.health + 15);
  updateHUD();
}

// ==========================================
// 9. HIGH-PERFORMANCE OBJECT POOLING & SPAWNER
// ==========================================
let spawnTimer = 0;
const baseSpawnInterval = 1.4;
const MAX_ENEMIES = 45; // Performance optimized density for rock-solid 60 FPS

// --- Fireball Object Pool (Zero Garbage Collection) ---
const FIREBALL_POOL_SIZE = 30;
const fireballPool = [];

function createPooledFireball() {
  const group = new THREE.Group();
  let mesh = null;

  if (modelTemplates.fireball) {
    mesh = modelTemplates.fireball.clone(true);
  } else {
    mesh = createFallbackFireball();
  }
  group.add(mesh);

  const pLight = new THREE.PointLight(0xff6b35, 3.2, 14);
  pLight.position.set(0, 0, 0);
  group.add(pLight);

  group.visible = false;
  scene.add(group);

  return {
    group,
    mesh,
    light: pLight,
    active: false,
    dir: new THREE.Vector3(),
    speed: 32,
    damage: 35,
    life: 0,
    spin: 0
  };
}

function getPooledFireball() {
  for (let i = 0; i < fireballPool.length; i++) {
    if (!fireballPool[i].active) {
      return fireballPool[i];
    }
  }
  const extra = createPooledFireball();
  fireballPool.push(extra);
  return extra;
}

function spawnEnemy() {
  let activeCount = 0;
  for (let i = 0; i < enemies.length; i++) {
    if (enemies[i].active) activeCount++;
  }
  if (activeCount >= MAX_ENEMIES) return;

  const difficulty = Math.min(1.0, gameState.survivalTime / 240);
  const spawnDist = arenaRadius - 3.5;
  const angle = Math.random() * Math.PI * 2;
  const spawnX = Math.cos(angle) * spawnDist;
  const spawnZ = Math.sin(angle) * spawnDist;
  const spawnY = getGroundHeight(spawnX, spawnZ);

  let type = 'eye';
  let speed = 6.2;
  let hp = 55;
  let damage = 12;
  let height = 2.9;
  let radius = 1.3;
  let color = 0xcc3355;

  const rand = Math.random();
  if (difficulty > 0.3 && rand < 0.25) {
    type = 'insect';
    speed = 3.8;
    hp = 200;
    damage = 25;
    height = 6.0;
    radius = 2.4;
    color = 0x882233;
  } else if (rand > 0.5) {
    type = 'bread';
    speed = 5.6;
    hp = 45;
    damage = 10;
    height = 3.1;
    radius = 1.3;
    color = 0xdd8833;
  }

  // Recycle inactive enemy from pool if available
  let recycledEnemy = null;
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (!e.active && e.type === type) {
      recycledEnemy = e;
      break;
    }
  }

  if (recycledEnemy) {
    recycledEnemy.active = true;
    recycledEnemy.dead = false;
    recycledEnemy.speed = speed;
    recycledEnemy.maxHp = hp;
    recycledEnemy.hp = hp;
    recycledEnemy.damage = damage;
    recycledEnemy.radius = radius;
    recycledEnemy.hitFlash = 0;
    recycledEnemy.group.position.set(spawnX, spawnY, spawnZ);
    recycledEnemy.group.visible = true;
    recycledEnemy.velocity.set(0, 0, 0);
    recycledEnemy.knockback.set(0, 0, 0);
    recycledEnemy.squashStretch.set(1, 1, 1);
  } else {
    const group = new THREE.Group();
    let mesh = null;

    if (type === 'bread' && modelTemplates.breadMonster) {
      mesh = modelTemplates.breadMonster.clone(true);
    } else if (type === 'eye' && modelTemplates.eyeMonster) {
      mesh = modelTemplates.eyeMonster.clone(true);
    } else if (type === 'insect' && modelTemplates.insectMonster) {
      mesh = modelTemplates.insectMonster.clone(true);
    } else {
      mesh = createFallbackMonster(color, height);
    }

    group.add(mesh);
    group.position.set(spawnX, spawnY, spawnZ);
    scene.add(group);

    enemies.push({
      group,
      mesh,
      type,
      active: true,
      dead: false,
      speed,
      maxHp: hp,
      hp,
      damage,
      radius,
      hitFlash: 0,
      velocity: new THREE.Vector3(),
      knockback: new THREE.Vector3(),
      walkPhase: Math.random() * Math.PI * 2,
      squashStretch: new THREE.Vector3(1, 1, 1)
    });
  }
}

// --- Fireball Cast with Staff Muzzle Node & Attack Animation ---
function fireFireball(targetEnemy) {
  // 1. Get exact world position of the staff crystal tip node
  const spawnPos = new THREE.Vector3();
  staffMuzzle.getWorldPosition(spawnPos);

  // 2. Direct trajectory from staff tip towards enemy torso
  const targetPos = targetEnemy.group.position.clone();
  targetPos.y += 1.0;
  const dir = new THREE.Vector3().subVectors(targetPos, spawnPos).normalize();

  // 3. Trigger Staff Attack Animation & Visual Flares
  player.attackAnimTimer = 0.24;
  player.animState = 'ATTACK';
  muzzleFlareMat.opacity = 1.0; // Flash muzzle flare at staff tip
  castingRing.material.opacity = 0.9;
  player.recoilOffset = 0.25;
  playSound('fireball');

  // 4. Retrieve recycled fireball from Object Pool
  const p = getPooledFireball();
  p.active = true;
  p.group.visible = true;
  p.group.position.copy(spawnPos);
  p.group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
  p.dir.copy(dir);
  p.damage = player.overchargeTimer > 0 ? player.damage * 1.4 : player.damage;
  p.life = 2.8;
  p.spin = 0;

  if (!projectiles.includes(p)) {
    projectiles.push(p);
  }
}

function spawnGem(pos, xpVal) {
  const mesh = new THREE.Mesh(gemGeo, gemMat);
  mesh.position.copy(pos);
  mesh.position.y = getGroundHeight(pos.x, pos.z) + 0.55;
  mesh.castShadow = true;
  mesh.renderOrder = 2;
  scene.add(mesh);

  gems.push({
    mesh,
    xp: xpVal,
    speed: 10,
    magnetized: false,
    hoverOffset: Math.random() * Math.PI * 2
  });
}

function spawnSparks(pos) {
  for (let i = 0; i < 5; i++) {
    const s = new THREE.Mesh(sparkGeo, sparkMat);
    s.position.copy(pos);
    s.renderOrder = 2;
    scene.add(s);
    const vel = new THREE.Vector3(
      (Math.random() - 0.5) * 10,
      Math.random() * 8 + 3,
      (Math.random() - 0.5) * 10
    );
    particles.push({ mesh: s, vel, life: 0.35 });
  }
}

function addXP(amount) {
  gameState.currentXP += amount;
  while (gameState.currentXP >= gameState.xpToNextLevel) {
    gameState.currentXP -= gameState.xpToNextLevel;
    gameState.level++;
    gameState.xpToNextLevel = Math.round(gameState.xpToNextLevel * 1.35);

    player.attackCooldown = Math.max(0.14, player.attackCooldown * 0.88);
    player.damage += 8;
    player.maxSpeed += 0.45;
    player.health = Math.min(player.maxHealth, player.health + 25);
    playSound('levelup');
  }
}

function triggerGameOver() {
  gameState.isGameOver = true;
  playSound('hurt');

  const minutes = Math.floor(gameState.survivalTime / 60);
  const seconds = Math.floor(gameState.survivalTime % 60);
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  document.getElementById('final-time').textContent = timeStr;
  document.getElementById('final-kills').textContent = gameState.kills;
  document.getElementById('final-level').textContent = gameState.level;
  document.getElementById('game-over-modal').classList.remove('hidden');
}

// Memory Cleanup Helper - Thoroughly detaches objects and frees GPU/engine handles
function cleanEntity(entity, sceneRef) {
  const root = entity.group || entity.mesh;
  if (root) {
    sceneRef.remove(root);
    root.traverse(node => {
      if (node.isLight && node.dispose) {
        node.dispose();
      }
    });
  }
  entity.group = null;
  entity.mesh = null;
}

function resetGame() {
  gameState.isGameOver = false;
  gameState.survivalTime = 0;
  gameState.kills = 0;
  gameState.level = 1;
  gameState.currentXP = 0;
  gameState.xpToNextLevel = 50;
  gameState.torchesLit = 0;

  const groundY = getGroundHeight(0, 0);
  player.pos.set(0, groundY, 0);
  player.velocity.set(0, 0, 0);
  player.group.position.copy(player.pos);
  player.health = player.maxHealth;
  player.invulnerableTime = 0;
  player.attackCooldown = 0.72;
  player.damage = 35;
  player.maxSpeed = 12.0;
  player.overchargeTimer = 0;

  interactiveProps.altar.cooldown = 0;
  interactiveProps.torches.forEach(t => {
    t.isLit = false;
    t.flame.material.opacity = 0.2;
    t.light.intensity = 0;
  });

  interactiveProps.crystals.forEach(c => {
    c.alive = true;
    c.mesh.visible = true;
    c.respawnTimer = 0;
  });

  // Deactivate pooled entities on restart
  enemies.forEach(e => {
    e.active = false;
    e.dead = true;
    e.group.visible = false;
  });
  projectiles.forEach(p => {
    p.active = false;
    p.group.visible = false;
  });
  fireballPool.forEach(p => {
    p.active = false;
    p.group.visible = false;
  });
  gems.forEach(g => cleanEntity(g, scene));
  gems.length = 0;
  particles.forEach(pt => cleanEntity(pt, scene));
  particles.length = 0;

  spawnTimer = 0;
  document.getElementById('game-over-modal').classList.add('hidden');
  updateHUD();
}

function restartGame() {
  resetGame();
}
document.getElementById('restart-btn').addEventListener('click', restartGame);

function updateHUD() {
  const hpPct = Math.max(0, (player.health / player.maxHealth) * 100);
  document.getElementById('hp-bar-fill').style.width = `${hpPct}%`;
  document.getElementById('hp-text').textContent = `${Math.ceil(player.health)} / ${player.maxHealth}`;

  const xpPct = Math.min(100, (gameState.currentXP / gameState.xpToNextLevel) * 100);
  document.getElementById('xp-bar-fill').style.width = `${xpPct}%`;
  document.getElementById('xp-text').textContent = `${gameState.currentXP} / ${gameState.xpToNextLevel}`;
  document.getElementById('level-display').textContent = `LV. ${gameState.level}`;

  const m = Math.floor(gameState.survivalTime / 60);
  const s = Math.floor(gameState.survivalTime % 60);
  document.getElementById('timer-display').textContent =
    `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  document.getElementById('kills-display').textContent = `⚔️ FOES SLAIN: ${gameState.kills}`;
}

// ==========================================
// 10. OPTIMIZED 60 FPS GAME LOOP
// ==========================================
const clock = new THREE.Clock();
let frameCount = 0;

function animate() {
  requestAnimationFrame(animate);

  const dt = Math.min(0.06, clock.getDelta());
  frameCount++;

  if (gameState.isGameOver) {
    renderer.render(scene, camera);
    return;
  }

  gameState.survivalTime += dt;

  // 1. Isometric Movement Controls
  let screenX = 0;
  let screenY = 0;

  if (keys['w'] || keys['arrowup']) screenY -= 1;
  if (keys['s'] || keys['arrowdown']) screenY += 1;
  if (keys['a'] || keys['arrowleft']) screenX -= 1;
  if (keys['d'] || keys['arrowright']) screenX += 1;

  if (touchInput.active) {
    screenX = touchInput.dx;
    screenY = touchInput.dy;
  }

  const forward3D = new THREE.Vector3(-1, 0, -1).normalize();
  const right3D = new THREE.Vector3(1, 0, -1).normalize();
  const targetDir = new THREE.Vector3()
    .addScaledVector(forward3D, -screenY)
    .addScaledVector(right3D, screenX);

  if (targetDir.lengthSq() > 1.0) targetDir.normalize();

  const currentMaxSpeed = player.overchargeTimer > 0 ? player.maxSpeed * 1.35 : player.maxSpeed;
  const targetVel = targetDir.clone().multiplyScalar(currentMaxSpeed);

  if (targetDir.lengthSq() > 0.05) {
    player.velocity.lerp(targetVel, player.accel * dt * 0.2);
  } else {
    player.velocity.lerp(new THREE.Vector3(), player.friction * dt);
  }

  player.pos.addScaledVector(player.velocity, dt);

  // Physics-Based Obstacle Collision with Smooth Wall-Sliding (move_and_slide)
  for (let i = 0; i < interactiveProps.obstacles.length; i++) {
    const obs = interactiveProps.obstacles[i];
    const diffX = player.pos.x - obs.pos.x;
    const diffZ = player.pos.z - obs.pos.z;
    const d = Math.hypot(diffX, diffZ);
    const minD = obs.radius + player.radius;

    if (d < minD && d > 0.001) {
      const normX = diffX / d;
      const normZ = diffZ / d;

      // Depenetrate: Push character smoothly out of obstacle
      player.pos.x = obs.pos.x + normX * minD;
      player.pos.z = obs.pos.z + normZ * minD;

      // Wall-Sliding: Project velocity vector onto the obstacle tangent plane
      const vDotN = player.velocity.x * normX + player.velocity.z * normZ;
      if (vDotN < 0) {
        player.velocity.x -= normX * vDotN;
        player.velocity.z -= normZ * vDotN;
      }
    }
  }

  // STRICT TERRAIN BOUNDARY CLAMPING
  const distFromCenter = Math.hypot(player.pos.x, player.pos.z);
  if (distFromCenter > arenaRadius - 1.5) {
    const normalX = player.pos.x / distFromCenter;
    const normalZ = player.pos.z / distFromCenter;

    player.pos.x = normalX * (arenaRadius - 1.5);
    player.pos.z = normalZ * (arenaRadius - 1.5);

    const vDotN = player.velocity.x * normalX + player.velocity.z * normalZ;
    if (vDotN > 0) {
      player.velocity.x -= normalX * vDotN;
      player.velocity.z -= normalZ * vDotN;
    }
  }

  // O(1) Fast Height Interpolation (Zero lag)
  const targetGroundY = getGroundHeight(player.pos.x, player.pos.z);
  player.pos.y = THREE.MathUtils.lerp(player.pos.y, targetGroundY, 20 * dt);

  const speed = player.velocity.length();
  if (speed > 0.4) {
    const targetAngle = Math.atan2(player.velocity.x, player.velocity.z);
    player.facingAngle = THREE.MathUtils.lerp(player.facingAngle, targetAngle, 14 * dt);
    player.group.rotation.y = player.facingAngle;
  }

  // ==========================================
  // ANIMATION STATE MACHINE (Player Locomotion & Attacks)
  // ==========================================
  const isMoving = speed > 0.35;

  if (player.attackAnimTimer > 0) {
    player.animState = 'ATTACK';
    player.attackAnimTimer -= dt;
  } else if (isMoving) {
    player.animState = 'WALK';
  } else {
    player.animState = 'IDLE';
  }

  // Decay Muzzle Flash Flare
  if (muzzleFlareMat.opacity > 0) {
    muzzleFlareMat.opacity = Math.max(0, muzzleFlareMat.opacity - 6 * dt);
  }

  if (player.animState === 'WALK') {
    // Dynamic Stride Stepping & Bobbing
    player.walkPhase += dt * (speed * 1.45);
    const stepBob = Math.abs(Math.sin(player.walkPhase)) * 0.32;
    player.group.position.y = player.pos.y + stepBob;

    // Rhythmic squash & stretch on step impacts
    const stretch = Math.sin(player.walkPhase * 2) * 0.09;
    player.mesh.scale.set(1.0 - stretch * 0.5, 1.0 + stretch, 1.0 - stretch * 0.5);

    // Forward sprint lean and side-to-side hip sway
    const forwardLean = THREE.MathUtils.clamp((speed / currentMaxSpeed) * 0.16, 0.05, 0.20);
    const hipSway = Math.sin(player.walkPhase) * 0.08;
    player.mesh.rotation.x = forwardLean;
    player.mesh.rotation.z = hipSway;
    player.mesh.position.z = 0;
  } else if (player.animState === 'IDLE') {
    // Idle Breathing & Resting Cycle
    const idleT = clock.getElapsedTime();
    player.group.position.y = THREE.MathUtils.lerp(player.group.position.y, player.pos.y, 8 * dt);
    const breath = Math.sin(idleT * 2.4) * 0.035;
    player.mesh.scale.lerp(new THREE.Vector3(1.0 + breath * 0.5, 1.0 - breath, 1.0 + breath * 0.5), 8 * dt);
    player.mesh.rotation.x = THREE.MathUtils.lerp(player.mesh.rotation.x, 0, 8 * dt);
    player.mesh.rotation.z = THREE.MathUtils.lerp(player.mesh.rotation.z, 0, 8 * dt);
    player.mesh.position.z = THREE.MathUtils.lerp(player.mesh.position.z, 0, 10 * dt);
  }

  // Attack Animation: Staff thrusts towards target
  if (player.animState === 'ATTACK') {
    const attackProgress = player.attackAnimTimer / 0.24; // 1 down to 0
    const thrust = Math.sin(attackProgress * Math.PI) * 0.42;
    player.mesh.position.z = thrust;
    player.mesh.rotation.x = -thrust * 0.35; // Torso leans forward into spell
    player.mesh.scale.set(0.96, 1.07, 1.04);
  }

  if (player.recoilOffset > 0.001) {
    player.recoilOffset = THREE.MathUtils.lerp(player.recoilOffset, 0, 12 * dt);
    player.group.position.addScaledVector(
      new THREE.Vector3(Math.sin(player.facingAngle), 0, Math.cos(player.facingAngle)),
      -player.recoilOffset
    );
  }

  if (player.overchargeTimer > 0) {
    player.overchargeTimer -= dt;
    playerLight.color.setHex(0xffde59);
    playerLight.intensity = 2.6;
  } else {
    playerLight.color.setHex(0x00d2ff);
    playerLight.intensity = 1.8;
  }

  player.group.position.x = player.pos.x;
  player.group.position.z = player.pos.z;

  if (player.invulnerableTime > 0) {
    player.invulnerableTime -= dt;
    player.mesh.visible = Math.floor(clock.getElapsedTime() * 18) % 2 === 0;
  } else {
    player.mesh.visible = true;
  }

  // ==========================================
  // CAMERA BOUNDARIES: CLAMPED TRACKING
  // ==========================================
  // The camera stops moving at the edge of the terrain so the player NEVER sees outside void
  const targetLookX = THREE.MathUtils.clamp(player.pos.x, CAM_LIMITS.minX, CAM_LIMITS.maxX);
  const targetLookZ = THREE.MathUtils.clamp(player.pos.z, CAM_LIMITS.minZ, CAM_LIMITS.maxZ);
  const targetLookY = 1.8;

  const targetCamPos = new THREE.Vector3(
    targetLookX + CAM_OFFSET.x,
    CAM_OFFSET.y,
    targetLookZ + CAM_OFFSET.z
  );

  camera.position.lerp(targetCamPos, 0.08);
  camera.lookAt(targetLookX, targetLookY, targetLookZ);

  sunLight.position.set(targetLookX + 40, 65, targetLookZ + 35);
  sunLight.target.position.set(targetLookX, 0, targetLookZ);
  sunLight.target.updateMatrixWorld();

  // ==========================================
  // CAMERA OCCLUSION RAYCASTING (Line-of-Sight Transparency)
  // ==========================================
  if (occludingMeshes.length > 0) {
    const camPos = camera.position;
    // Aim raycast directly at player chest/head
    const playerTarget = new THREE.Vector3(player.pos.x, player.pos.y + 1.8, player.pos.z);
    const rayDir = new THREE.Vector3().subVectors(playerTarget, camPos);
    const maxDist = rayDir.length();
    rayDir.normalize();

    cameraRaycaster.set(camPos, rayDir);
    cameraRaycaster.near = 1.0;
    cameraRaycaster.far = Math.max(1.0, maxDist - 0.6); // Exclude character itself

    // Intersect strictly with environmental occluders (trees, leaves, statues)
    const hits = cameraRaycaster.intersectObjects(occludingMeshes, false);
    const hitSet = new Set();
    for (let i = 0; i < hits.length; i++) {
      if (hits[i].object && hits[i].object.userData.isOccluder) {
        hitSet.add(hits[i].object);
      }
    }

    // Toggle transparency: 30% when blocking, smoothly restored to 100% when clear
    for (let i = 0; i < occludingMeshes.length; i++) {
      const m = occludingMeshes[i];
      if (hitSet.has(m)) {
        m.userData.targetOpacity = 0.3; // Faded to 30%
      } else {
        m.userData.targetOpacity = m.userData.originalOpacity || 1.0; // Restored to 100%
      }

      if (m.material) {
        m.material.opacity = THREE.MathUtils.lerp(m.material.opacity, m.userData.targetOpacity, 9 * dt);
      }
    }
  }

  // 2. Interactive Altar
  const altar = interactiveProps.altar;
  if (altar.cooldown > 0) {
    altar.cooldown -= dt;
    altarRuneMesh.rotation.z += dt * 0.6;
    altarRuneMat.opacity = 0.25;
  } else {
    altarRuneMesh.rotation.z += dt * 2.0;
    altarRuneMat.opacity = 0.65 + Math.sin(clock.getElapsedTime() * 4) * 0.25;
  }

  const distToAltar = player.pos.distanceTo(altar.pos);
  if (distToAltar <= altar.radius && altar.cooldown <= 0) {
    shrineBtn.classList.remove('hidden');
    shrineBtn.innerHTML = '⚡ ACTIVATE SHRINE (Press SPACE / E)';
  } else if (distToAltar <= altar.radius) {
    shrineBtn.classList.remove('hidden');
    shrineBtn.innerHTML = `⏳ RECHARGING (${Math.ceil(altar.cooldown)}s)`;
  } else {
    shrineBtn.classList.add('hidden');
  }

  if (novaState.active) {
    novaState.radius += dt * 65;
    novaMesh.scale.set(novaState.radius, novaState.radius, 1);
    novaMat.opacity = Math.max(0, 1.0 - novaState.radius / novaState.maxRadius);

    if (novaState.radius >= novaState.maxRadius) {
      novaState.active = false;
      novaMat.opacity = 0;
    }
  }

  // 3. Torches & Crystals
  interactiveProps.torches.forEach(t => {
    if (!t.isLit && player.pos.distanceTo(t.pos) <= t.radius) {
      igniteTorch(t);
    }

    if (t.isLit) {
      t.flame.scale.y = 1.0 + Math.sin(clock.getElapsedTime() * 14 + t.id) * 0.25;
      t.light.intensity = 3.0 + Math.sin(clock.getElapsedTime() * 18 + t.id) * 0.5;

      t.burnTimer += dt;
      if (t.burnTimer >= 0.4) {
        enemies.forEach(e => {
          if (!e.dead && e.group.position.distanceTo(t.pos) <= 4.5) {
            e.hp -= 14;
            e.hitFlash = 0.15;
            spawnSparks(e.group.position);
            if (e.hp <= 0) {
              e.dead = true;
              gameState.kills++;
              spawnGem(e.group.position, 10);
            }
          }
        });
        t.burnTimer = 0;
      }
    }
  });

  interactiveProps.crystals.forEach(c => {
    if (c.alive) {
      c.mesh.rotation.y += dt * 2.0;
      c.mesh.position.y = 1.2 + Math.sin(clock.getElapsedTime() * 3) * 0.15;
    } else {
      c.respawnTimer -= dt;
      if (c.respawnTimer <= 0) {
        c.alive = true;
        c.mesh.visible = true;
      }
    }
  });

  // 4. Auto-Attack Targeting
  const attackDelay = player.overchargeTimer > 0 ? player.attackCooldown * 0.55 : player.attackCooldown;
  player.attackTimer += dt;
  if (player.attackTimer >= attackDelay) {
    let nearestEnemy = null;
    let shortestDistSq = player.targetingRange * player.targetingRange;

    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (e.dead) continue;
      const dSq = player.pos.distanceToSquared(e.group.position);
      if (dSq < shortestDistSq) {
        shortestDistSq = dSq;
        nearestEnemy = e;
      }
    }

    if (nearestEnemy) {
      fireFireball(nearestEnemy);
      player.attackTimer = 0;
    }
  }

  // 5. Fireball Projectiles Update & Collision Culling
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.group.position.addScaledVector(p.dir, p.speed * dt);
    p.life -= dt;

    interactiveProps.torches.forEach(t => {
      if (!t.isLit && p.group.position.distanceTo(t.pos) <= 3.8) {
        igniteTorch(t);
      }
    });

    interactiveProps.crystals.forEach(c => {
      if (c.alive && p.group.position.distanceTo(c.pos) <= 2.2) {
        shatterCrystal(c);
      }
    });

    p.spin += dt * 14;
    if (p.mesh) p.mesh.rotation.z = p.spin;

    let hit = false;
    for (let j = 0; j < enemies.length; j++) {
      const e = enemies[j];
      if (e.dead) continue;

      // Fast AABB bounding check before distance calculation
      const dx = Math.abs(p.group.position.x - e.group.position.x);
      const dz = Math.abs(p.group.position.z - e.group.position.z);
      const maxHit = e.radius + 1.2;

      if (dx < maxHit && dz < maxHit) {
        const dist = p.group.position.distanceTo(e.group.position);
        if (dist < maxHit) {
          e.hp -= p.damage;
          e.hitFlash = 0.18;
          e.knockback.addScaledVector(p.dir, 16);
          e.squashStretch.set(1.4, 0.7, 1.4);

          playSound('hit');
          spawnSparks(p.group.position);

          if (e.hp <= 0) {
            e.dead = true;
            e.active = false;
            e.group.visible = false;
            gameState.kills++;
            spawnGem(e.group.position, e.type === 'insect' ? 50 : 10);
          }
          hit = true;
          break;
        }
      }
    }

    // Pooled Recycling: Return fireball to pool (No GC overhead, No scene graph churn)
    if (hit || p.life <= 0 || p.group.position.lengthSq() > 1600) {
      p.active = false;
      p.group.visible = false;
    }
  }

  // 6. Optimized Swarm Spawner & Boids Separation
  const difficulty = Math.min(1.0, gameState.survivalTime / 240);
  const currentInterval = THREE.MathUtils.lerp(baseSpawnInterval, 0.45, difficulty);

  spawnTimer += dt;
  if (spawnTimer >= currentInterval) {
    spawnEnemy();
    spawnTimer = 0;
  }

  // Boids Separation run every 2nd frame for 2x performance speedup
  if (frameCount % 2 === 0) {
    for (let i = 0; i < enemies.length; i++) {
      const e1 = enemies[i];
      if (e1.dead) continue;

      for (let j = i + 1; j < enemies.length; j++) {
        const e2 = enemies[j];
        if (e2.dead) continue;

        const sepX = e1.group.position.x - e2.group.position.x;
        const sepZ = e1.group.position.z - e2.group.position.z;
        const minDist = e1.radius + e2.radius;
        const distSq = sepX * sepX + sepZ * sepZ;

        if (distSq < minDist * minDist && distSq > 0.001) {
          const dist = Math.sqrt(distSq);
          const overlap = (minDist - dist) * 0.5;
          const normX = sepX / dist;
          const normZ = sepZ / dist;
          e1.group.position.x += normX * overlap;
          e1.group.position.z += normZ * overlap;
          e2.group.position.x -= normX * overlap;
          e2.group.position.z -= normZ * overlap;
        }
      }
    }
  }

  // Update Individual Enemies
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (e.dead || !e.active) {
      continue;
    }

    const toPlayer = new THREE.Vector3().subVectors(player.pos, e.group.position);
    toPlayer.y = 0;
    const dist = toPlayer.length();

    if (dist > 0.3) {
      toPlayer.normalize();
      e.velocity.lerp(toPlayer.multiplyScalar(e.speed), 8 * dt);
      e.group.position.addScaledVector(e.velocity, dt);

      const enemyAngle = Math.atan2(e.velocity.x, e.velocity.z);
      e.group.rotation.y = THREE.MathUtils.lerp(e.group.rotation.y, enemyAngle, 10 * dt);
    }

    // Keep enemies clamped inside enclosed terrain boundary
    const eDist = Math.hypot(e.group.position.x, e.group.position.z);
    if (eDist > arenaRadius - 1.5) {
      const eNormX = e.group.position.x / eDist;
      const eNormZ = e.group.position.z / eDist;
      e.group.position.x = eNormX * (arenaRadius - 1.5);
      e.group.position.z = eNormZ * (arenaRadius - 1.5);
    }

    // Obstacle Avoidance
    interactiveProps.obstacles.forEach(obs => {
      const diffX = e.group.position.x - obs.pos.x;
      const diffZ = e.group.position.z - obs.pos.z;
      const d = Math.hypot(diffX, diffZ);
      const minD = obs.radius + e.radius;
      if (d < minD && d > 0.01) {
        e.group.position.x = obs.pos.x + (diffX / d) * minD;
        e.group.position.z = obs.pos.z + (diffZ / d) * minD;
      }
    });

    if (e.knockback.lengthSq() > 0.01) {
      e.group.position.addScaledVector(e.knockback, dt);
      e.knockback.multiplyScalar(Math.max(0, 1 - 9 * dt));
    }

    // ==========================================
    // ENEMY ANIMATION STATE MACHINE (Locomotion)
    // ==========================================
    const eGroundY = getGroundHeight(e.group.position.x, e.group.position.z);
    e.walkPhase += dt * (e.speed * 1.35);

    if (e.type === 'bread') {
      // Bread Monster: Bouncy hop stride with squash & stretch
      const hop = Math.abs(Math.sin(e.walkPhase)) * 0.42;
      e.group.position.y = eGroundY + hop;
      const stretch = Math.sin(e.walkPhase * 2) * 0.12;
      e.mesh.scale.set(1.0 - stretch * 0.5, 1.0 + stretch, 1.0 - stretch * 0.5);
      e.mesh.rotation.x = 0.15; // Lean into hop
    } else if (e.type === 'eye') {
      // Eye Monster: Sinusoidal levitation & pulsing float
      const hover = Math.sin(e.walkPhase * 1.2) * 0.22;
      e.group.position.y = eGroundY + 1.2 + hover;
      const pulse = Math.sin(clock.getElapsedTime() * 4) * 0.06;
      e.mesh.scale.set(1.0 + pulse, 1.0 - pulse, 1.0 + pulse);
      e.mesh.rotation.z = Math.sin(e.walkPhase * 0.8) * 0.1; // Banking
    } else if (e.type === 'insect') {
      // Insect Brute: Heavy lumbering stomp with head pitch & side-to-side roll
      const stomp = Math.abs(Math.sin(e.walkPhase)) * 0.18;
      e.group.position.y = eGroundY + stomp;
      const roll = Math.sin(e.walkPhase) * 0.08;
      e.mesh.rotation.z = roll;
      e.mesh.rotation.x = Math.sin(e.walkPhase * 2) * 0.06;
    }

    if (e.hitFlash > 0) {
      e.hitFlash -= dt;
      e.mesh.scale.multiplyScalar(1.15);
    }

    if (dist < e.radius + 1.2 && player.invulnerableTime <= 0) {
      player.health = Math.max(0, player.health - e.damage);
      player.invulnerableTime = 0.6;
      playSound('hurt');

      if (player.health <= 0) {
        triggerGameOver();
        return;
      }
    }
  }

  // 7. Experience Gems
  for (let i = gems.length - 1; i >= 0; i--) {
    const g = gems[i];
    const dist = g.mesh.position.distanceTo(player.pos);

    g.mesh.rotation.y += dt * 3.5;
    g.mesh.rotation.x += dt * 2.0;

    if (!g.magnetized && dist < 9.0) {
      g.magnetized = true;
    }

    if (g.magnetized) {
      g.speed += 26 * dt;
      const dir = new THREE.Vector3().subVectors(player.pos, g.mesh.position).normalize();
      dir.y += 0.35;
      g.mesh.position.addScaledVector(dir, g.speed * dt);

      if (dist < 1.6) {
        addXP(g.xp);
        playSound('gem');
        cleanEntity(g, scene);
        gems.splice(i, 1);
      }
    } else {
      const gFloor = getGroundHeight(g.mesh.position.x, g.mesh.position.z);
      g.mesh.position.y = gFloor + 0.55 + Math.sin(clock.getElapsedTime() * 4 + g.hoverOffset) * 0.18;
    }
  }

  // 8. Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const pt = particles[i];
    pt.mesh.position.addScaledVector(pt.vel, dt);
    pt.vel.y -= 22 * dt;
    pt.life -= dt;
    pt.mesh.scale.multiplyScalar(0.92);

    if (pt.life <= 0) {
      cleanEntity(pt, scene);
      particles.splice(i, 1);
    }
  }

  updateHUD();
  renderer.render(scene, camera);
}

// Start 60 FPS Game Loop
requestAnimationFrame(animate);
