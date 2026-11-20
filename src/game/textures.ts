import * as THREE from 'three';

function makeSeededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * Zone A: Grand Foyer dark checkerboard marble & cracked stone tile floor.
 */
export function createFloorTextures(maxAnisotropy: number): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const size = 512;
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const ctx = colorCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d')!;

  const rand = makeSeededRandom(407);
  const tiles = 4;
  const tilePx = size / tiles;

  for (let ty = 0; ty < tiles; ty++) {
    for (let tx = 0; tx < tiles; tx++) {
      const alt = (tx + ty) % 2 === 0;
      const baseR = alt ? 52 : 34;
      const baseG = alt ? 60 : 41;
      const baseB = alt ? 54 : 37;
      const jitter = Math.floor((rand() - 0.5) * 9);
      ctx.fillStyle = `rgb(${baseR + jitter}, ${baseG + jitter}, ${baseB + jitter})`;
      ctx.fillRect(tx * tilePx, ty * tilePx, tilePx, tilePx);

      bCtx.fillStyle = alt ? '#c4c4c4' : '#b2b2b2';
      bCtx.fillRect(tx * tilePx, ty * tilePx, tilePx, tilePx);

      // Subtle marble veining & linear scuffs
      for (let i = 0; i < 16; i++) {
        const sx = tx * tilePx + rand() * tilePx;
        const sy = ty * tilePx + rand() * tilePx;
        const len = 8 + rand() * 26;
        const angle = (rand() - 0.5) * 1.1;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(angle);
        ctx.fillStyle = rand() > 0.45 ? 'rgba(14, 18, 15, 0.22)' : 'rgba(128, 138, 126, 0.08)';
        ctx.fillRect(-len / 2, -1, len, 1.3 + rand() * 1.4);
        ctx.restore();
      }
    }
  }

  // Grout lines
  ctx.strokeStyle = 'rgba(12, 16, 13, 0.85)';
  ctx.lineWidth = 4;
  bCtx.strokeStyle = '#262626';
  bCtx.lineWidth = 5;
  for (let i = 0; i <= tiles; i++) {
    const p = i * tilePx;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(size, p);
    ctx.stroke();

    bCtx.beginPath();
    bCtx.moveTo(p, 0);
    bCtx.lineTo(p, size);
    bCtx.stroke();
    bCtx.beginPath();
    bCtx.moveTo(0, p);
    bCtx.lineTo(size, p);
    bCtx.stroke();
  }

  // Grime blotches
  for (let i = 0; i < 7; i++) {
    const gx = rand() * size;
    const gy = rand() * size;
    const rad = 28 + rand() * 58;
    const grad = ctx.createRadialGradient(gx, gy, 4, gx, gy, rad);
    grad.addColorStop(0, 'rgba(14, 18, 13, 0.34)');
    grad.addColorStop(1, 'rgba(14, 18, 13, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = maxAnisotropy;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.anisotropy = maxAnisotropy;

  return { map, bumpMap };
}

/**
 * Zone B: Living Quarters rotted hardwood floorboards.
 */
export function createWoodFloorTextures(maxAnisotropy: number): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const size = 512;
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const ctx = colorCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d')!;

  const rand = makeSeededRandom(519);
  const planks = 8;
  const plankH = size / planks;

  for (let row = 0; row < planks; row++) {
    const y = row * plankH;
    const shade = Math.floor((rand() - 0.5) * 14);
    ctx.fillStyle = `rgb(${56 + shade}, ${44 + Math.floor(shade * 0.7)}, ${33 + Math.floor(shade * 0.5)})`;
    ctx.fillRect(0, y, size, plankH);

    bCtx.fillStyle = `rgb(${155 + shade}, ${155 + shade}, ${155 + shade})`;
    bCtx.fillRect(0, y, size, plankH);

    // Wood grain streaks
    for (let g = 0; g < 22; g++) {
      const gy = y + 3 + rand() * (plankH - 6);
      const gx = rand() * size;
      const len = 30 + rand() * 140;
      ctx.fillStyle = rand() > 0.5 ? 'rgba(24, 17, 11, 0.25)' : 'rgba(84, 68, 50, 0.14)';
      ctx.fillRect(gx, gy, len, 1.5);
    }

    // Plank seam
    ctx.fillStyle = 'rgba(14, 10, 7, 0.85)';
    ctx.fillRect(0, y, size, 3);
    bCtx.fillStyle = '#242424';
    bCtx.fillRect(0, y, size, 4);

    // Staggered vertical plank joint
    const jointX = ((row * 167 + 90) % (size - 40)) + 20;
    ctx.fillRect(jointX, y, 3, plankH);
    bCtx.fillRect(jointX, y, 4, plankH);
  }

  // Dark damp stain
  for (let i = 0; i < 4; i++) {
    const gx = rand() * size;
    const gy = rand() * size;
    const rad = 36 + rand() * 64;
    const grad = ctx.createRadialGradient(gx, gy, 4, gx, gy, rad);
    grad.addColorStop(0, 'rgba(14, 12, 9, 0.38)');
    grad.addColorStop(1, 'rgba(14, 12, 9, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = maxAnisotropy;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.anisotropy = maxAnisotropy;

  return { map, bumpMap };
}

/**
 * Zone C: Flooded Boiler Cellar dark wet concrete slab floor.
 */
export function createCellarFloorTextures(maxAnisotropy: number): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const size = 512;
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const ctx = colorCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d')!;

  const rand = makeSeededRandom(633);
  ctx.fillStyle = '#262d29';
  ctx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#8d8d8d';
  bCtx.fillRect(0, 0, size, size);

  for (let i = 0; i < 85; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const w = 12 + rand() * 52;
    const h = 10 + rand() * 44;
    ctx.fillStyle = rand() > 0.45 ? 'rgba(16, 22, 19, 0.3)' : 'rgba(65, 58, 46, 0.16)';
    ctx.fillRect(x, y, w, h);
    bCtx.fillStyle = rand() > 0.5 ? 'rgba(55,55,55,0.28)' : 'rgba(180,180,180,0.18)';
    bCtx.fillRect(x, y, w, h);
  }

  // Expansion slab joints
  ctx.strokeStyle = 'rgba(10, 14, 12, 0.78)';
  ctx.lineWidth = 4;
  bCtx.strokeStyle = '#262626';
  bCtx.lineWidth = 5;
  [0, size / 2, size].forEach((p) => {
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(size, p);
    ctx.stroke();

    bCtx.beginPath();
    bCtx.moveTo(p, 0);
    bCtx.lineTo(p, size);
    bCtx.stroke();
    bCtx.beginPath();
    bCtx.moveTo(0, p);
    bCtx.lineTo(size, p);
    bCtx.stroke();
  });

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = maxAnisotropy;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.anisotropy = maxAnisotropy;

  return { map, bumpMap };
}

/**
 * Peeling, mold-stained institutional wallpaper + dark wainscot wall texture.
 */
export function createWallTextures(maxAnisotropy: number): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const size = 512;
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const ctx = colorCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d')!;

  const rand = makeSeededRandom(812);

  // Upper decayed wallpaper (top 60%)
  const wainscotY = Math.floor(size * 0.6);
  ctx.fillStyle = '#475348';
  ctx.fillRect(0, 0, size, wainscotY);
  bCtx.fillStyle = '#999999';
  bCtx.fillRect(0, 0, size, wainscotY);

  // Faint faded vertical stripe wallpaper pattern
  for (let x = 0; x < size; x += 24) {
    ctx.fillStyle = 'rgba(30, 38, 31, 0.22)';
    ctx.fillRect(x, 0, 8, wainscotY);
  }

  // Peeled wallpaper patches showing raw gray plaster underneath
  for (let i = 0; i < 16; i++) {
    const px = rand() * (size - 60);
    const py = rand() * (wainscotY - 60);
    const pw = 18 + rand() * 58;
    const ph = 24 + rand() * 82;
    ctx.fillStyle = 'rgba(28, 31, 29, 0.72)';
    ctx.fillRect(px - 3, py - 2, pw + 6, ph + 4);
    ctx.fillStyle = '#5a5f58';
    ctx.fillRect(px, py, pw, ph);
    // Curled peeled edge highlight
    ctx.fillStyle = 'rgba(130, 142, 128, 0.35)';
    ctx.fillRect(px + pw - 4, py, 4, ph);

    bCtx.fillStyle = '#4a4a4a';
    bCtx.fillRect(px, py, pw, ph);
    bCtx.fillStyle = '#e0e0e0';
    bCtx.fillRect(px + pw - 4, py, 4, ph);
  }

  // Mold & damp mottling
  for (let i = 0; i < 55; i++) {
    const x = rand() * size;
    const y = rand() * wainscotY;
    const w = 10 + rand() * 44;
    const h = 8 + rand() * 34;
    ctx.fillStyle = rand() > 0.45 ? 'rgba(20, 27, 22, 0.22)' : 'rgba(96, 108, 92, 0.1)';
    ctx.fillRect(x, y, w, h);
  }

  // Dark chair rail
  ctx.fillStyle = '#1b221d';
  ctx.fillRect(0, wainscotY - 9, size, 18);
  bCtx.fillStyle = '#e5e5e5';
  bCtx.fillRect(0, wainscotY - 9, size, 18);

  // Lower dark timber/tile wainscoting
  ctx.fillStyle = '#28362e';
  ctx.fillRect(0, wainscotY + 9, size, size - wainscotY - 9);
  bCtx.fillStyle = '#c8c8c8';
  bCtx.fillRect(0, wainscotY + 9, size, size - wainscotY - 9);

  const cols = 8;
  const tileW = size / cols;
  const tileH = 38;
  ctx.strokeStyle = 'rgba(12, 16, 13, 0.78)';
  ctx.lineWidth = 2;
  bCtx.strokeStyle = '#363636';
  bCtx.lineWidth = 3;

  for (let x = 0; x <= size; x += tileW) {
    ctx.beginPath();
    ctx.moveTo(x, wainscotY + 9);
    ctx.lineTo(x, size);
    ctx.stroke();

    bCtx.beginPath();
    bCtx.moveTo(x, wainscotY + 9);
    bCtx.lineTo(x, size);
    bCtx.stroke();
  }
  for (let y = wainscotY + 9; y <= size; y += tileH) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();

    bCtx.beginPath();
    bCtx.moveTo(0, y);
    bCtx.lineTo(size, y);
    bCtx.stroke();
  }

  // Vertical water/rust drip streaks
  for (let i = 0; i < 22; i++) {
    const dx = rand() * size;
    const startY = rand() * (size * 0.65);
    const len = 45 + rand() * 165;
    const grad = ctx.createLinearGradient(dx, startY, dx, startY + len);
    grad.addColorStop(0, 'rgba(14, 19, 15, 0.34)');
    grad.addColorStop(1, 'rgba(14, 19, 15, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(dx - 2, startY, 3 + rand() * 4, len);
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.ClampToEdgeWrapping;
  map.anisotropy = maxAnisotropy;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.ClampToEdgeWrapping;
  bumpMap.anisotropy = maxAnisotropy;

  return { map, bumpMap };
}

/**
 * Grimy Boiler Cellar brick & concrete wall texture.
 */
export function createCellarWallTextures(maxAnisotropy: number): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const size = 512;
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const ctx = colorCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d')!;

  const rand = makeSeededRandom(947);
  ctx.fillStyle = '#2d322e';
  ctx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#888888';
  bCtx.fillRect(0, 0, size, size);

  const brickH = 32;
  const brickW = 64;
  for (let row = 0; row < size / brickH; row++) {
    const offset = (row % 2) * (brickW / 2);
    for (let col = -1; col < size / brickW + 1; col++) {
      const bx = col * brickW + offset;
      const by = row * brickH;
      const v = Math.floor((rand() - 0.5) * 14);
      ctx.fillStyle = `rgb(${54 + v}, ${50 + Math.floor(v * 0.7)}, ${45 + Math.floor(v * 0.6)})`;
      ctx.fillRect(bx + 2, by + 2, brickW - 4, brickH - 4);
      bCtx.fillStyle = `rgb(${155 + v}, ${155 + v}, ${155 + v})`;
      bCtx.fillRect(bx + 2, by + 2, brickW - 4, brickH - 4);
    }
  }

  // Rust & damp seepage near bottom
  const seep = ctx.createLinearGradient(0, size * 0.45, 0, size);
  seep.addColorStop(0, 'rgba(14, 18, 15, 0)');
  seep.addColorStop(1, 'rgba(12, 17, 14, 0.72)');
  ctx.fillStyle = seep;
  ctx.fillRect(0, size * 0.45, size, size * 0.55);

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.ClampToEdgeWrapping;
  map.anisotropy = maxAnisotropy;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.ClampToEdgeWrapping;
  bumpMap.anisotropy = maxAnisotropy;

  return { map, bumpMap };
}

export function createCeilingTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rand = makeSeededRandom(991);

  ctx.fillStyle = '#252b27';
  ctx.fillRect(0, 0, size, size);

  const step = size / 4;
  ctx.strokeStyle = '#141816';
  ctx.lineWidth = 3;
  for (let i = 0; i <= 4; i++) {
    ctx.beginPath();
    ctx.moveTo(i * step, 0);
    ctx.lineTo(i * step, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * step);
    ctx.lineTo(size, i * step);
    ctx.stroke();
  }

  for (let i = 0; i < 8; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 18 + rand() * 34;
    const g = ctx.createRadialGradient(x, y, 2, x, y, r);
    g.addColorStop(0, 'rgba(10, 14, 11, 0.5)');
    g.addColorStop(1, 'rgba(10, 14, 11, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Smeared dried blood drag trail decal (transparent background).
 */
export function createBloodDragDecalTexture(): THREE.CanvasTexture {
  const w = 256;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const rand = makeSeededRandom(314);

  ctx.clearRect(0, 0, w, h);

  // Main smeared drag path
  for (let s = 0; s < 5; s++) {
    const sx = w * (0.28 + s * 0.11) + (rand() - 0.5) * 14;
    const grad = ctx.createLinearGradient(sx, 20, sx, h - 20);
    grad.addColorStop(0, 'rgba(72, 10, 10, 0)');
    grad.addColorStop(0.2, 'rgba(84, 11, 11, 0.72)');
    grad.addColorStop(0.7, 'rgba(56, 7, 7, 0.55)');
    grad.addColorStop(1, 'rgba(42, 6, 6, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(sx - (6 + rand() * 8), 18, 12 + rand() * 14, h - 36);
  }

  // Smear splatters along edges
  for (let i = 0; i < 24; i++) {
    const bx = w * 0.2 + rand() * w * 0.6;
    const by = 40 + rand() * (h - 80);
    const rw = 4 + rand() * 18;
    const rh = 12 + rand() * 42;
    ctx.fillStyle = `rgba(68, 9, 9, ${0.22 + rand() * 0.35})`;
    ctx.fillRect(bx, by, rw, rh);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Bloody handprint + drag smear decal for doors and walls.
 */
export function createHandprintDecalTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);

  ctx.fillStyle = 'rgba(88, 12, 12, 0.78)';
  // Palm smear
  ctx.beginPath();
  ctx.ellipse(128, 148, 34, 42, -0.08, 0, Math.PI * 2);
  ctx.fill();

  // Four fingers + thumb smeared downward
  const fingers = [
    { x: 96, y: 74, w: 12, h: 52, rot: -0.14 },
    { x: 118, y: 58, w: 13, h: 62, rot: -0.04 },
    { x: 140, y: 64, w: 12, h: 58, rot: 0.05 },
    { x: 160, y: 82, w: 11, h: 48, rot: 0.14 },
    { x: 76, y: 124, w: 12, h: 38, rot: -0.45 },
  ];
  fingers.forEach((f) => {
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.rot);
    ctx.fillRect(-f.w / 2, 0, f.w, f.h);
    // Drag drip
    const g = ctx.createLinearGradient(0, f.h, 0, f.h + 52);
    g.addColorStop(0, 'rgba(72, 9, 9, 0.55)');
    g.addColorStop(1, 'rgba(72, 9, 9, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(-f.w * 0.35, f.h - 4, f.w * 0.7, 52);
    ctx.restore();
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Irregular specular water puddle texture (for drip puddles & flooded cellar).
 */
export function createWaterPuddleTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rand = makeSeededRandom(721);

  ctx.clearRect(0, 0, size, size);
  for (let i = 0; i < 6; i++) {
    const cx = size * 0.5 + (rand() - 0.5) * 44;
    const cy = size * 0.5 + (rand() - 0.5) * 44;
    const rx = 44 + rand() * 54;
    const ry = 38 + rand() * 48;
    const grad = ctx.createRadialGradient(cx, cy, 8, cx, cy, Math.max(rx, ry));
    grad.addColorStop(0, 'rgba(20, 32, 28, 0.78)');
    grad.addColorStop(0.7, 'rgba(24, 38, 34, 0.52)');
    grad.addColorStop(1, 'rgba(24, 38, 34, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Soft radial sprite texture for dust motes, leaking steam, and blade sparks.
 */
export function createParticleTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 1, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255, 255, 255, 1)');
  g.addColorStop(0.4, 'rgba(255, 255, 255, 0.45)');
  g.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(4, 7, 5, 0.78)');
  g.addColorStop(0.55, 'rgba(4, 7, 5, 0.35)');
  g.addColorStop(1, 'rgba(4, 7, 5, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createSignTexture(
  text: string,
  bgColor: string,
  textColor: string,
  borderColor: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);

  ctx.fillStyle = textColor;
  ctx.font = '700 42px "Barlow Condensed", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}
