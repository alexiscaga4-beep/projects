const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Minimal pure Node PNG generator
function createPNG(width, height, getPixel) {
  // getPixel(x, y) returns [r, g, b, a] (0-255)
  const rowStride = 1 + width * 4; // 1 byte filter type (0) + 4 bytes per pixel
  const rawData = Buffer.alloc(height * rowStride);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowStride;
    rawData[rowOffset] = 0; // Filter type: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y);
      const pixelOffset = rowOffset + 1 + x * 4;
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData);

  // CRC32 table & calculator
  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[n] = c;
  }

  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const typeBuf = Buffer.from(type, 'ascii');
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(data.length, 0);

    const crcBuf = Buffer.alloc(4);
    const chunkData = Buffer.concat([typeBuf, data]);
    crcBuf.writeUInt32BE(crc32(chunkData), 0);

    return Buffer.concat([lenBuf, chunkData, crcBuf]);
  }

  // PNG Signature
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR Chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 6;  // color type: RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // IDAT Chunk
  const idatChunk = makeChunk('IDAT', compressedData);

  // IEND Chunk
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const outDir = path.join(__dirname, 'Assets', 'Sprites');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// 1. spr_player_idle.png (64x64) - Blue wizard with glowing eyes & robe
const playerBuf = createPNG(64, 64, (x, y) => {
  const dx = x - 32;
  const dy = y - 36;
  const distBody = Math.sqrt(dx * dx * 1.3 + dy * dy);

  // Wizard Hat (top triangle)
  if (y >= 8 && y <= 24 && Math.abs(x - 32) <= (y - 8) * 0.9) {
    if (Math.abs(x - 32) >= (y - 8) * 0.85 || y === 24) return [20, 25, 45, 255]; // outline
    if (y < 14) return [70, 110, 230, 255]; // hat tip
    return [40, 75, 180, 255]; // hat base
  }
  // Hat Brim
  if (y >= 23 && y <= 26 && Math.abs(x - 32) <= 18) {
    return [30, 40, 70, 255];
  }

  // Face / Eyes area
  if (y >= 27 && y <= 35 && Math.abs(x - 32) <= 10) {
    // Glowing cyan eyes
    if (y >= 30 && y <= 32 && (Math.abs(x - 29) <= 1 || Math.abs(x - 35) <= 1)) {
      return [100, 255, 255, 255];
    }
    return [30, 32, 45, 255]; // Dark shrouded face shadow
  }

  // Body / Robe
  if (distBody <= 18 && y >= 34 && y <= 56) {
    if (distBody >= 16 || y >= 55) return [20, 25, 40, 255]; // outline
    // Inner robe gradient
    const fold = Math.sin(x * 0.4) * 15;
    return [35 + fold, 80 + fold, 200 + fold, 255];
  }

  // Gold belt buckle
  if (y >= 43 && y <= 45 && Math.abs(x - 32) <= 4) {
    return [240, 195, 40, 255];
  }

  // Staff in right hand
  if (x >= 48 && x <= 50 && y >= 14 && y <= 54) {
    return [110, 70, 35, 255]; // wooden staff
  }
  if (Math.sqrt((x - 49) * (x - 49) + (y - 14) * (y - 14)) <= 5) {
    return [80, 220, 255, 240]; // magic crystal orb on staff
  }

  return [0, 0, 0, 0]; // Transparent
});
fs.writeFileSync(path.join(outDir, 'spr_player_idle.png'), playerBuf);

// 2. spr_enemy_basic.png (64x64) - Red Chaser Imp/Goblin with glowing eyes & horns
const enemyBasicBuf = createPNG(64, 64, (x, y) => {
  const dx = x - 32;
  const dy = y - 34;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Horns
  if (y >= 14 && y <= 26) {
    if (Math.abs(x - 20) <= (26 - y) * 0.4 && y + x > 34) return [240, 220, 180, 255];
    if (Math.abs(x - 44) <= (26 - y) * 0.4 && y + (64 - x) > 34) return [240, 220, 180, 255];
  }

  // Main Head/Body
  if (dist <= 18) {
    if (dist >= 16) return [60, 10, 15, 255]; // dark outline
    // Glowing sharp red/orange eyes
    if (y >= 30 && y <= 34 && (Math.abs(x - 25) <= 2 || Math.abs(x - 39) <= 2)) {
      return [255, 230, 60, 255]; // Evil yellow eyes
    }
    // Grin with fangs
    if (y === 42 && Math.abs(x - 32) <= 8) return [40, 5, 10, 255];
    if (y === 41 && (x === 28 || x === 36)) return [240, 240, 240, 255]; // fangs
    return [200 - dist * 3, 35, 45, 255]; // Red body
  }

  return [0, 0, 0, 0];
});
fs.writeFileSync(path.join(outDir, 'spr_enemy_basic.png'), enemyBasicBuf);

// 3. spr_enemy_brute.png (96x96) - Large armored tank golem
const bruteBuf = createPNG(96, 96, (x, y) => {
  const dx = x - 48;
  const dy = y - 50;
  const dist = Math.sqrt(dx * dx * 0.9 + dy * dy);

  // Spikes on shoulders
  if (y >= 20 && y <= 38 && (Math.abs(x - 22) <= 6 || Math.abs(x - 74) <= 6)) {
    return [100, 20, 30, 255];
  }

  if (dist <= 30) {
    if (dist >= 27) return [30, 5, 10, 255]; // outline
    // Armored plates shading
    if (y >= 36 && y <= 40 && Math.abs(x - 48) <= 16) return [255, 160, 40, 255]; // glowing visor slit
    const stripe = (Math.floor(x / 8) + Math.floor(y / 8)) % 2 === 0 ? 15 : 0;
    return [120 + stripe, 20 + stripe, 30, 255];
  }
  return [0, 0, 0, 0];
});
fs.writeFileSync(path.join(outDir, 'spr_enemy_brute.png'), bruteBuf);

// 4. spr_projectile_magic.png (32x32) - Glowing arcane missile
const projBuf = createPNG(32, 32, (x, y) => {
  const dx = x - 16;
  const dy = y - 16;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist <= 12) {
    if (dist <= 4) return [255, 255, 255, 255]; // white core
    if (dist <= 7) return [120, 235, 255, 255]; // cyan inner glow
    if (dist <= 10) return [40, 140, 255, 200]; // outer magic aura
    return [10, 80, 230, 100]; // soft edge
  }
  return [0, 0, 0, 0];
});
fs.writeFileSync(path.join(outDir, 'spr_projectile_magic.png'), projBuf);

// 5. spr_gem_xp.png (32x32) - Faceted cyan gem
const gemBuf = createPNG(32, 32, (x, y) => {
  const dx = Math.abs(x - 16);
  const dy = Math.abs(y - 16);

  // Octagonal diamond shape
  if (dx + dy <= 12 && dx <= 10 && dy <= 10) {
    if (dx + dy >= 11) return [10, 50, 80, 255]; // outline
    if (dx <= 4 && dy <= 4) return [210, 255, 255, 255]; // bright center
    if (x <= 16 && y <= 16) return [120, 230, 255, 255]; // top-left facet
    if (x > 16 && y > 16) return [30, 140, 210, 255];   // bottom-right shade
    return [60, 185, 240, 255];
  }
  return [0, 0, 0, 0];
});
fs.writeFileSync(path.join(outDir, 'spr_gem_xp.png'), gemBuf);

// 6. spr_ground_tile.png (64x64) - Dungeon flagstone texture
const groundBuf = createPNG(64, 64, (x, y) => {
  const isMortarX = (x === 0 || x === 32 || x === 63);
  const isMortarY = (y === 0 || y === 32 || y === 63);
  if (isMortarX || isMortarY) return [35, 38, 48, 255]; // mortar joint

  const noise = ((x * 17 + y * 31) % 19) - 9;
  const isLight = (x + y) % 16 === 0 ? 8 : 0;
  const base = 55 + noise + isLight;
  return [base, base + 4, base + 12, 255];
});
fs.writeFileSync(path.join(outDir, 'spr_ground_tile.png'), groundBuf);

// 7. spr_vfx_hit.png (48x48) - Starburst hit effect
const vfxBuf = createPNG(48, 48, (x, y) => {
  const dx = Math.abs(x - 24);
  const dy = Math.abs(y - 24);
  const dist = Math.sqrt(dx * dx + dy * dy);

  // 4-pointed cross star
  const isCross = (dx <= 3 && dy <= 20) || (dy <= 3 && dx <= 20);
  const isDiagonal = Math.abs(dx - dy) <= 2 && dist <= 14;

  if (isCross || isDiagonal) {
    if (dist <= 6) return [255, 255, 255, 255];
    if (dist <= 14) return [255, 220, 60, 240];
    return [255, 90, 30, 180];
  }
  return [0, 0, 0, 0];
});
fs.writeFileSync(path.join(outDir, 'spr_vfx_hit.png'), vfxBuf);

// 8. spr_hud_hp_bar_fill.png (256x32) - Glossy green health bar
const hpFillBuf = createPNG(256, 32, (x, y) => {
  if (y <= 2) return [120, 255, 150, 255]; // highlight
  if (y >= 29) return [20, 110, 40, 255]; // shadow
  const grad = Math.floor((x / 256) * 30);
  return [40 + grad, 200 - grad, 70, 255];
});
fs.writeFileSync(path.join(outDir, 'spr_hud_hp_bar_fill.png'), hpFillBuf);

// 9. spr_hud_hp_bar_bg.png (264x40) - Chiseled dark frame
const hpBgBuf = createPNG(264, 40, (x, y) => {
  const isOuter = (x < 3 || x >= 261 || y < 3 || y >= 37);
  if (isOuter) return [20, 22, 28, 255]; // outer border
  return [35, 40, 50, 255]; // inner recess
});
fs.writeFileSync(path.join(outDir, 'spr_hud_hp_bar_bg.png'), hpBgBuf);

// 10. spr_icon_xp.png (32x32) - HUD Gem Icon
fs.writeFileSync(path.join(outDir, 'spr_icon_xp.png'), gemBuf);

// 11. spr_btn_restart.png (192x64) - Stylized UI button
const btnBuf = createPNG(192, 64, (x, y) => {
  const isBorder = (x < 4 || x >= 188 || y < 4 || y >= 60);
  if (isBorder) return [220, 175, 45, 255]; // Gold trim
  if (y <= 10) return [65, 95, 170, 255]; // Top sheen
  return [35, 55, 115, 255]; // Royal blue core
});
fs.writeFileSync(path.join(outDir, 'spr_btn_restart.png'), btnBuf);

// 12. spr_game_over_banner.png (512x128) - Framed Banner
const bannerBuf = createPNG(512, 128, (x, y) => {
  const isBorder = (x < 6 || x >= 506 || y < 6 || y >= 122);
  if (isBorder) return [180, 40, 40, 255];
  return [25, 15, 20, 240];
});
fs.writeFileSync(path.join(outDir, 'spr_game_over_banner.png'), bannerBuf);

console.log('Successfully generated 12 game sprite PNGs in Assets/Sprites/');
