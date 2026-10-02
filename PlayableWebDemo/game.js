// Arcane Survival - 2D Arena Prototype (Mirrors Unity C# Logic 1:1)

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Audio Synthesizer (Zero external dependencies) ---
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

  if (type === 'shoot') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.12);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
    osc.start(now);
    osc.stop(now + 0.12);
  } else if (type === 'hit') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(60, now + 0.08);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.08);
    osc.start(now);
    osc.stop(now + 0.08);
  } else if (type === 'gem') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
    osc.start(now);
    osc.stop(now + 0.1);
  } else if (type === 'levelup') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.setValueAtTime(600, now + 0.1);
    osc.frequency.setValueAtTime(900, now + 0.2);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.35);
    osc.start(now);
    osc.stop(now + 0.35);
  } else if (type === 'hurt') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.linearRampToValueAtTime(40, now + 0.15);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
    osc.start(now);
    osc.stop(now + 0.15);
  }
}

// --- Asset Loader ---
const sprites = {};
const spriteNames = [
  'spr_player_idle',
  'spr_enemy_basic',
  'spr_enemy_brute',
  'spr_projectile_magic',
  'spr_gem_xp',
  'spr_ground_tile',
  'spr_vfx_hit'
];

let loadedCount = 0;
spriteNames.forEach(name => {
  const img = new Image();
  img.src = `sprites/${name}.png`;
  img.onload = () => {
    loadedCount++;
  };
  sprites[name] = img;
});

// --- Game State & Variables ---
const keys = {};
window.addEventListener('keydown', e => {
  keys[e.key.toLowerCase()] = true;
  if (gameState.isGameOver && (e.key === 'r' || e.key === 'R')) {
    restartGame();
  }
});
window.addEventListener('keyup', e => {
  keys[e.key.toLowerCase()] = false;
});

const gameState = {
  isGameOver: false,
  survivalTime: 0,
  kills: 0,
  level: 1,
  currentXP: 0,
  xpToNextLevel: 50
};

// Player Object
const player = {
  x: 0,
  y: 0,
  speed: 240,
  maxHealth: 100,
  health: 100,
  invulnerableTime: 0,
  facingLeft: false,
  attackCooldown: 0.8,
  attackTimer: 0,
  targetingRange: 400,
  damage: 25
};

// Entities Collections
let enemies = [];
let projectiles = [];
let gems = [];
let particles = [];

// Spawner Settings
let spawnTimer = 0;
const baseSpawnInterval = 1.6;
const spawnRadius = 550;

function resetGame() {
  gameState.isGameOver = false;
  gameState.survivalTime = 0;
  gameState.kills = 0;
  gameState.level = 1;
  gameState.currentXP = 0;
  gameState.xpToNextLevel = 50;

  player.x = 0;
  player.y = 0;
  player.health = player.maxHealth;
  player.invulnerableTime = 0;
  player.attackCooldown = 0.8;
  player.damage = 25;

  enemies = [];
  projectiles = [];
  gems = [];
  particles = [];
  spawnTimer = 0;

  document.getElementById('game-over-modal').classList.add('hidden');
  updateHUD();
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

function restartGame() {
  resetGame();
}

document.getElementById('restart-btn').addEventListener('click', restartGame);

// --- Game Logic Update ---
function update(dt) {
  if (gameState.isGameOver) return;

  gameState.survivalTime += dt;

  // 1. Player Movement & Input Normalization
  let dx = 0;
  let dy = 0;
  if (keys['w'] || keys['arrowup']) dy -= 1;
  if (keys['s'] || keys['arrowdown']) dy += 1;
  if (keys['a'] || keys['arrowleft']) dx -= 1;
  if (keys['d'] || keys['arrowright']) dx += 1;

  if (dx !== 0 && dy !== 0) {
    const invSqrt = 1 / Math.sqrt(2);
    dx *= invSqrt;
    dy *= invSqrt;
  }

  player.x += dx * player.speed * dt;
  player.y += dy * player.speed * dt;

  if (dx < -0.1) player.facingLeft = true;
  else if (dx > 0.1) player.facingLeft = false;

  if (player.invulnerableTime > 0) {
    player.invulnerableTime -= dt;
  }

  // 2. Auto-Attack Targeting
  player.attackTimer += dt;
  if (player.attackTimer >= player.attackCooldown) {
    let nearestEnemy = null;
    let shortestDistSq = player.targetingRange * player.targetingRange;

    for (const enemy of enemies) {
      const edx = enemy.x - player.x;
      const edy = enemy.y - player.y;
      const distSq = edx * edx + edy * edy;
      if (distSq < shortestDistSq) {
        shortestDistSq = distSq;
        nearestEnemy = enemy;
      }
    }

    if (nearestEnemy) {
      const angle = Math.atan2(nearestEnemy.y - player.y, nearestEnemy.x - player.x);
      projectiles.push({
        x: player.x,
        y: player.y,
        vx: Math.cos(angle) * 580,
        vy: Math.sin(angle) * 580,
        angle: angle,
        damage: player.damage,
        lifespan: 3.0
      });
      playSound('shoot');
      player.attackTimer = 0;
    }
  }

  // 3. Projectile Updates
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.lifespan -= dt;

    let hit = false;
    for (const enemy of enemies) {
      const dist = Math.hypot(enemy.x - p.x, enemy.y - p.y);
      if (dist < enemy.radius + 12) {
        enemy.health -= p.damage;
        enemy.hitFlash = 0.12;
        playSound('hit');

        // Spawn hit sparks
        for (let k = 0; k < 4; k++) {
          const sparkAngle = Math.random() * Math.PI * 2;
          particles.push({
            x: p.x,
            y: p.y,
            vx: Math.cos(sparkAngle) * 120,
            vy: Math.sin(sparkAngle) * 120,
            life: 0.25,
            color: '#ffde59'
          });
        }

        if (enemy.health <= 0) {
          enemy.dead = true;
          gameState.kills++;
          gems.push({
            x: enemy.x,
            y: enemy.y,
            xp: enemy.isBrute ? 30 : 10,
            speed: 250,
            magnetized: false
          });
        }
        hit = true;
        break;
      }
    }

    if (hit || p.lifespan <= 0) {
      projectiles.splice(i, 1);
    }
  }

  // 4. Enemy Spawner & AI
  const difficultyFactor = Math.min(1.0, gameState.survivalTime / 240);
  const currentInterval = baseSpawnInterval - difficultyFactor * 1.15; // scales from 1.6s to 0.45s

  spawnTimer += dt;
  if (spawnTimer >= currentInterval && enemies.length < 90) {
    spawnTimer = 0;
    const angle = Math.random() * Math.PI * 2;
    const isBrute = difficultyFactor > 0.25 && Math.random() < 0.25;

    enemies.push({
      x: player.x + Math.cos(angle) * spawnRadius,
      y: player.y + Math.sin(angle) * spawnRadius,
      speed: isBrute ? 100 : 160,
      maxHealth: isBrute ? 120 : 45,
      health: isBrute ? 120 : 45,
      radius: isBrute ? 28 : 18,
      damage: isBrute ? 20 : 10,
      isBrute: isBrute,
      hitFlash: 0,
      dead: false
    });
  }

  // Update Enemies
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    if (e.dead) {
      enemies.splice(i, 1);
      continue;
    }

    const edx = player.x - e.x;
    const edy = player.y - e.y;
    const dist = Math.hypot(edx, edy);

    if (dist > 0.1) {
      e.x += (edx / dist) * e.speed * dt;
      e.y += (edy / dist) * e.speed * dt;
    }

    if (e.hitFlash > 0) e.hitFlash -= dt;

    // Contact damage check
    if (dist < e.radius + 16 && player.invulnerableTime <= 0) {
      player.health = Math.max(0, player.health - e.damage);
      player.invulnerableTime = 0.6;
      playSound('hurt');

      if (player.health <= 0) {
        triggerGameOver();
        return;
      }
    }
  }

  // 5. XP Gems & Magnet
  for (let i = gems.length - 1; i >= 0; i--) {
    const g = gems[i];
    const dist = Math.hypot(player.x - g.x, player.y - g.y);

    if (!g.magnetized && dist < 160) {
      g.magnetized = true;
    }

    if (g.magnetized) {
      g.speed += 400 * dt;
      const angle = Math.atan2(player.y - g.y, player.x - g.x);
      g.x += Math.cos(angle) * g.speed * dt;
      g.y += Math.sin(angle) * g.speed * dt;

      if (dist < 24) {
        addXP(g.xp);
        playSound('gem');
        gems.splice(i, 1);
      }
    }
  }

  // 6. Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    if (p.life <= 0) particles.splice(i, 1);
  }

  updateHUD();
}

function addXP(amount) {
  gameState.currentXP += amount;
  while (gameState.currentXP >= gameState.xpToNextLevel) {
    gameState.currentXP -= gameState.xpToNextLevel;
    gameState.level++;
    gameState.xpToNextLevel = Math.round(gameState.xpToNextLevel * 1.35);

    // Apply level up upgrades
    player.attackCooldown = Math.max(0.18, player.attackCooldown * 0.9);
    player.damage += 6;
    player.health = Math.min(player.maxHealth, player.health + 20);
    playSound('levelup');
  }
}

function updateHUD() {
  // Health Bar
  const hpPercent = Math.max(0, (player.health / player.maxHealth) * 100);
  document.getElementById('hp-bar-fill').style.width = `${hpPercent}%`;
  document.getElementById('hp-text').textContent = `${player.health} / ${player.maxHealth}`;

  // XP Bar
  const xpPercent = Math.min(100, (gameState.currentXP / gameState.xpToNextLevel) * 100);
  document.getElementById('xp-bar-fill').style.width = `${xpPercent}%`;
  document.getElementById('xp-text').textContent = `${gameState.currentXP} / ${gameState.xpToNextLevel}`;
  document.getElementById('level-display').textContent = `LV. ${gameState.level}`;

  // Timer & Kills
  const minutes = Math.floor(gameState.survivalTime / 60);
  const seconds = Math.floor(gameState.survivalTime % 60);
  document.getElementById('timer-display').textContent = 
    `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  document.getElementById('kills-display').textContent = `⚔️ FOES SLAIN: ${gameState.kills}`;
}

// --- Render Loop ---
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Camera tracking centered on player
  const cameraX = canvas.width / 2 - player.x;
  const cameraY = canvas.height / 2 - player.y;

  ctx.save();
  ctx.translate(cameraX, cameraY);

  // 1. Draw Tiled Ground
  const groundImg = sprites['spr_ground_tile'];
  const tileSize = 64;
  const startCol = Math.floor((player.x - canvas.width / 2) / tileSize) - 1;
  const endCol = Math.ceil((player.x + canvas.width / 2) / tileSize) + 1;
  const startRow = Math.floor((player.y - canvas.height / 2) / tileSize) - 1;
  const endRow = Math.ceil((player.y + canvas.height / 2) / tileSize) + 1;

  for (let c = startCol; c <= endCol; c++) {
    for (let r = startRow; r <= endRow; r++) {
      if (groundImg && groundImg.complete) {
        ctx.drawImage(groundImg, c * tileSize, r * tileSize, tileSize, tileSize);
      } else {
        ctx.fillStyle = (c + r) % 2 === 0 ? '#1b202e' : '#141824';
        ctx.fillRect(c * tileSize, r * tileSize, tileSize, tileSize);
      }
    }
  }

  // 2. Draw XP Gems
  const gemImg = sprites['spr_gem_xp'];
  for (const g of gems) {
    if (gemImg && gemImg.complete) {
      ctx.drawImage(gemImg, g.x - 12, g.y - 12, 24, 24);
    } else {
      ctx.fillStyle = '#00d2ff';
      ctx.beginPath();
      ctx.arc(g.x, g.y, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 3. Draw Projectiles
  const projImg = sprites['spr_projectile_magic'];
  for (const p of projectiles) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    if (projImg && projImg.complete) {
      ctx.drawImage(projImg, -14, -14, 28, 28);
    } else {
      ctx.fillStyle = '#00f2fe';
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 4. Draw Enemies
  for (const e of enemies) {
    const enemyImg = e.isBrute ? sprites['spr_enemy_brute'] : sprites['spr_enemy_basic'];
    const size = e.radius * 2;

    ctx.save();
    ctx.translate(e.x, e.y);

    if (e.hitFlash > 0) {
      ctx.filter = 'brightness(2.5) drop-shadow(0 0 8px #ff3366)';
    }

    if (enemyImg && enemyImg.complete) {
      ctx.drawImage(enemyImg, -size / 2, -size / 2, size, size);
    } else {
      ctx.fillStyle = e.isBrute ? '#8b0000' : '#e63946';
      ctx.beginPath();
      ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 5. Draw Player
  ctx.save();
  ctx.translate(player.x, player.y);

  if (player.invulnerableTime > 0 && Math.floor(Date.now() / 80) % 2 === 0) {
    ctx.globalAlpha = 0.4;
  }

  if (player.facingLeft) {
    ctx.scale(-1, 1);
  }

  const playerImg = sprites['spr_player_idle'];
  if (playerImg && playerImg.complete) {
    ctx.drawImage(playerImg, -28, -28, 56, 56);
  } else {
    ctx.fillStyle = '#4287f5';
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 6. Draw Particles
  for (const p of particles) {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.life / 0.25;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1.0;

  ctx.restore();
}

// --- Main Loop with Delta Time ---
let lastTime = performance.now();
function gameLoop(now) {
  const dt = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;

  update(dt);
  draw();

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
