// textures.js — High-quality Procedural Texture Generator with Perlin Noise

import * as THREE from 'three';

// ============================================================
// SIMPLEX NOISE (compact 2D implementation)
// ============================================================
const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;
const GRAD = [[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];
const PERM = new Uint8Array(512);
(function seedPerm() {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
})();

function noise2D(x, y) {
  const s = (x + y) * F2;
  const i = Math.floor(x + s), j = Math.floor(y + s);
  const t = (i + j) * G2;
  const x0 = x - (i - t), y0 = y - (j - t);
  const i1 = x0 > y0 ? 1 : 0, j1 = x0 > y0 ? 0 : 1;
  const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
  const x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
  const ii = i & 255, jj = j & 255;
  let n0 = 0, n1 = 0, n2 = 0;
  let t0 = 0.5 - x0*x0 - y0*y0;
  if (t0 > 0) { t0 *= t0; const g = GRAD[PERM[ii + PERM[jj]] % 8]; n0 = t0 * t0 * (g[0]*x0 + g[1]*y0); }
  let t1 = 0.5 - x1*x1 - y1*y1;
  if (t1 > 0) { t1 *= t1; const g = GRAD[PERM[ii+i1 + PERM[jj+j1]] % 8]; n1 = t1 * t1 * (g[0]*x1 + g[1]*y1); }
  let t2 = 0.5 - x2*x2 - y2*y2;
  if (t2 > 0) { t2 *= t2; const g = GRAD[PERM[ii+1 + PERM[jj+1]] % 8]; n2 = t2 * t2 * (g[0]*x2 + g[1]*y2); }
  return 70 * (n0 + n1 + n2);
}

// Fractal Brownian Motion — stacking octaves of noise
function fbm(x, y, octaves = 6, lacunarity = 2.0, gain = 0.5) {
  let val = 0, amp = 0.5, freq = 1;
  for (let i = 0; i < octaves; i++) {
    val += amp * noise2D(x * freq, y * freq);
    freq *= lacunarity;
    amp *= gain;
  }
  return val;
}

function clamp(v, lo = 0, hi = 1) { return Math.max(lo, Math.min(hi, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function lerpColor(r1, g1, b1, r2, g2, b2, t) {
  return [lerp(r1, r2, t), lerp(g1, g2, t), lerp(b1, b2, t)];
}
function hexToRgb(hex) {
  hex = hex.replace('#', '');
  return [parseInt(hex.substring(0,2),16), parseInt(hex.substring(2,4),16), parseInt(hex.substring(4,6),16)];
}

function canvasToTexture(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  return tex;
}

// ============================================================
// 1. SUN — Churning plasma surface
// ============================================================
export function createSunTexture() {
  const W = 1024, H = 512;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(W, H);
  const d = img.data;

  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const u = px / W, v = py / H;
      // Multiple noise layers for churning plasma
      const n1 = fbm(u * 8, v * 4, 6);
      const n2 = fbm(u * 16 + 50, v * 8 + 50, 4);
      const n3 = fbm(u * 4 + n1 * 2, v * 2 + n2 * 2, 5); // warped noise

      let val = clamp((n3 + 0.5) * 0.8 + n1 * 0.3);

      // Color ramp: dark red -> bright orange -> white-yellow hotspots
      let r, g, b;
      if (val < 0.3) {
        const t = val / 0.3;
        [r, g, b] = lerpColor(120, 20, 0, 200, 60, 0, t);
      } else if (val < 0.6) {
        const t = (val - 0.3) / 0.3;
        [r, g, b] = lerpColor(200, 60, 0, 255, 180, 30, t);
      } else if (val < 0.85) {
        const t = (val - 0.6) / 0.25;
        [r, g, b] = lerpColor(255, 180, 30, 255, 230, 80, t);
      } else {
        const t = (val - 0.85) / 0.15;
        [r, g, b] = lerpColor(255, 230, 80, 255, 255, 200, t);
      }

      // Occasional bright flare spots
      const flare = fbm(u * 20 + 100, v * 10 + 100, 3);
      if (flare > 0.35) {
        const ft = clamp((flare - 0.35) * 4);
        r = lerp(r, 255, ft * 0.5);
        g = lerp(g, 255, ft * 0.4);
        b = lerp(b, 180, ft * 0.3);
      }

      const idx = (py * W + px) * 4;
      d[idx] = clamp(r, 0, 255);
      d[idx+1] = clamp(g, 0, 255);
      d[idx+2] = clamp(b, 0, 255);
      d[idx+3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvasToTexture(canvas);
}

// ============================================================
// 2. ROCKY PLANET — Craters, highlands, shadows (Mercury/Moon)
// ============================================================
export function createRockyTexture() {
  const W = 1024, H = 512;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(W, H);
  const d = img.data;

  // Pre-generate some crater positions
  const craters = [];
  for (let i = 0; i < 120; i++) {
    craters.push({
      cx: Math.random(), cy: Math.random(),
      r: 0.005 + Math.random() * 0.03,
      depth: 0.3 + Math.random() * 0.7
    });
  }

  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const u = px / W, v = py / H;

      // Base terrain elevation
      let elev = fbm(u * 10, v * 5, 6) * 0.5 + 0.5;
      // Fine surface detail
      elev += fbm(u * 30 + 200, v * 15 + 200, 4) * 0.15;

      // Apply craters
      for (const c of craters) {
        const dx = u - c.cx, dy = v - c.cy;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < c.r) {
          const t = dist / c.r;
          // Bowl shape: depress center, raise rim
          if (t < 0.7) {
            elev -= c.depth * (1 - t / 0.7) * 0.25;
          } else {
            elev += c.depth * ((t - 0.7) / 0.3) * 0.08;
          }
        }
      }

      elev = clamp(elev);

      // Color: purplish-grey rocky surface
      let r, g, b;
      if (elev < 0.35) {
        const t = elev / 0.35;
        [r, g, b] = lerpColor(25, 18, 35, 55, 40, 70, t);
      } else if (elev < 0.6) {
        const t = (elev - 0.35) / 0.25;
        [r, g, b] = lerpColor(55, 40, 70, 90, 70, 120, t);
      } else {
        const t = (elev - 0.6) / 0.4;
        [r, g, b] = lerpColor(90, 70, 120, 140, 120, 175, t);
      }

      // Lighting: simple directional from left
      const nx = fbm(u * 10 + 0.01, v * 5, 4) - fbm(u * 10 - 0.01, v * 5, 4);
      const shade = clamp(0.5 + nx * 4);
      r *= shade; g *= shade; b *= shade;

      const idx = (py * W + px) * 4;
      d[idx] = clamp(r, 0, 255);
      d[idx+1] = clamp(g, 0, 255);
      d[idx+2] = clamp(b, 0, 255);
      d[idx+3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvasToTexture(canvas);
}

// ============================================================
// 3. GAS GIANT — Banded cloud layers (Venus / Neptune-like)
// ============================================================
export function createCloudyTexture(baseHex, cloudHex) {
  const W = 1024, H = 512;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(W, H);
  const d = img.data;
  const baseC = hexToRgb(baseHex);
  const cloudC = hexToRgb(cloudHex);

  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const u = px / W, v = py / H;

      // Strong horizontal banding
      const band = Math.sin(v * Math.PI * 14) * 0.5 + 0.5;
      // Turbulence distortion of bands
      const turb = fbm(u * 12 + band * 2, v * 6, 5);
      const detail = fbm(u * 24 + turb * 3, v * 12, 4) * 0.3;
      const flow = fbm(u * 6 + turb, v * 20, 6); // east-west flow

      let val = clamp(band * 0.5 + turb * 0.35 + detail + flow * 0.15);

      // Storm vortexes
      const sx = u - 0.6, sy = v - 0.55;
      const stormDist = Math.sqrt(sx*sx + sy*sy);
      if (stormDist < 0.08) {
        const angle = Math.atan2(sy, sx);
        const spiral = fbm(angle * 3 + stormDist * 20, stormDist * 30, 3);
        val = clamp(val + spiral * 0.3 + (0.08 - stormDist) * 3);
      }

      const t = clamp(val);
      let [r, g, b] = lerpColor(baseC[0], baseC[1], baseC[2], cloudC[0], cloudC[1], cloudC[2], t);

      // Brighten band edges
      const edge = Math.abs(Math.sin(v * Math.PI * 14)) < 0.1 ? 1.15 : 1.0;
      r *= edge; g *= edge; b *= edge;

      const idx = (py * W + px) * 4;
      d[idx] = clamp(r, 0, 255);
      d[idx+1] = clamp(g, 0, 255);
      d[idx+2] = clamp(b, 0, 255);
      d[idx+3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvasToTexture(canvas);
}

// ============================================================
// 4. MARS — Red desert with valleys, dark regions, ice caps
// ============================================================
export function createMarsTexture() {
  const W = 1024, H = 512;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(W, H);
  const d = img.data;

  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const u = px / W, v = py / H;

      // Terrain
      const terrain = fbm(u * 8, v * 4, 6) * 0.5 + 0.5;
      const detail = fbm(u * 20 + 300, v * 10 + 300, 4) * 0.2;
      let elev = terrain + detail;

      // Polar caps (smooth gradient at poles)
      const polarN = clamp(1 - v * 6);          // top
      const polarS = clamp((v - 0.85) * 7);     // bottom

      // Color ramp: dark basalt -> rust orange -> light sand
      let r, g, b;
      if (elev < 0.35) {
        const t = elev / 0.35;
        [r, g, b] = lerpColor(60, 20, 15, 140, 55, 25, t);
      } else if (elev < 0.55) {
        const t = (elev - 0.35) / 0.2;
        [r, g, b] = lerpColor(140, 55, 25, 195, 95, 45, t);
      } else if (elev < 0.75) {
        const t = (elev - 0.55) / 0.2;
        [r, g, b] = lerpColor(195, 95, 45, 210, 140, 70, t);
      } else {
        const t = (elev - 0.75) / 0.25;
        [r, g, b] = lerpColor(210, 140, 70, 230, 180, 120, t);
      }

      // Dark volcanic regions
      const volcanic = fbm(u * 5 + 500, v * 3 + 500, 3);
      if (volcanic < -0.15) {
        const t = clamp((-0.15 - volcanic) * 4);
        [r, g, b] = lerpColor(r, g, b, 40, 25, 20, t);
      }

      // Ice caps overlay
      const polar = Math.max(polarN, polarS);
      if (polar > 0) {
        [r, g, b] = lerpColor(r, g, b, 230, 235, 245, polar * 0.9);
      }

      // Simple directional light
      const nx = fbm(u * 8 + 0.01, v * 4, 3) - fbm(u * 8 - 0.01, v * 4, 3);
      const shade = clamp(0.55 + nx * 3);
      r *= shade; g *= shade; b *= shade;

      const idx = (py * W + px) * 4;
      d[idx] = clamp(r, 0, 255);
      d[idx+1] = clamp(g, 0, 255);
      d[idx+2] = clamp(b, 0, 255);
      d[idx+3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvasToTexture(canvas);
}

// ============================================================
// 5. JUPITER — Iconic bands, Great Red Spot, turbulent eddies
// ============================================================
export function createJupiterTexture() {
  const W = 1024, H = 512;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(W, H);
  const d = img.data;

  // Band color palette
  const bandColors = [
    [75, 50, 30],    // dark brown zone
    [180, 120, 60],  // tan belt
    [220, 175, 100], // light cream zone
    [240, 200, 130], // pale yellow
    [195, 130, 70],  // medium brown
    [250, 210, 140], // light zone
    [160, 100, 55],  // dark belt
    [230, 190, 110], // cream
  ];

  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const u = px / W, v = py / H;

      // Band structure with noise distortion
      const bandFreq = v * 18;
      const distort = fbm(u * 8, v * 4, 4) * 0.8;
      const bandVal = Math.sin((bandFreq + distort) * Math.PI) * 0.5 + 0.5;
      const bandIdx = Math.floor((v * 18 + distort) % bandColors.length);
      const nextIdx = (bandIdx + 1) % bandColors.length;
      const bandFrac = ((v * 18 + distort) % 1);

      // Interpolate between adjacent band colors
      const c1 = bandColors[Math.abs(bandIdx) % bandColors.length];
      const c2 = bandColors[Math.abs(nextIdx) % bandColors.length];
      let [r, g, b] = lerpColor(c1[0], c1[1], c1[2], c2[0], c2[1], c2[2], bandFrac);

      // Turbulent eddies along band edges
      const eddy = fbm(u * 20 + v * 10, v * 30, 5) * 0.15;
      r += eddy * 40; g += eddy * 30; b += eddy * 15;

      // Great Red Spot (elliptical storm)
      const grsX = u - 0.35, grsY = v - 0.62;
      const grsDistX = grsX / 0.07, grsDistY = grsY / 0.04;
      const grsDist = Math.sqrt(grsDistX*grsDistX + grsDistY*grsDistY);
      if (grsDist < 1) {
        const t = 1 - grsDist;
        const spiral = fbm(Math.atan2(grsY, grsX) * 2 + grsDist * 10, grsDist * 5, 3) * 0.3;
        const stormR = 160 + spiral * 40, stormG = 50 + spiral * 20, stormB = 40;
        [r, g, b] = lerpColor(r, g, b, stormR, stormG, stormB, t * 0.85);
      }

      // White oval storms (smaller)
      const ovalX = u - 0.7, ovalY = v - 0.72;
      const ovalDist = Math.sqrt((ovalX/0.03)**2 + (ovalY/0.02)**2);
      if (ovalDist < 1) {
        const t = 1 - ovalDist;
        [r, g, b] = lerpColor(r, g, b, 240, 235, 210, t * 0.6);
      }

      const idx = (py * W + px) * 4;
      d[idx] = clamp(r, 0, 255);
      d[idx+1] = clamp(g, 0, 255);
      d[idx+2] = clamp(b, 0, 255);
      d[idx+3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvasToTexture(canvas);
}

// ============================================================
// 6. EARTH-LIKE — Oceans, continents, clouds (Contact planet)
// ============================================================
export function createEarthLikeTexture() {
  const W = 1024, H = 512;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(W, H);
  const d = img.data;

  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const u = px / W, v = py / H;

      // Continent shapes from noise
      const continent = fbm(u * 5 + 10, v * 3 + 10, 6);
      const detail = fbm(u * 15 + 20, v * 8 + 20, 4) * 0.2;
      const elev = continent + detail;

      let r, g, b;
      if (elev < -0.05) {
        // Deep ocean
        const t = clamp((elev + 0.5) / 0.45);
        [r, g, b] = lerpColor(5, 15, 45, 10, 60, 100, t);
      } else if (elev < 0.05) {
        // Shallow water / coast
        const t = clamp((elev + 0.05) / 0.1);
        [r, g, b] = lerpColor(10, 60, 100, 20, 110, 80, t);
      } else if (elev < 0.25) {
        // Lowland green
        const t = (elev - 0.05) / 0.2;
        [r, g, b] = lerpColor(20, 110, 80, 45, 140, 55, t);
      } else if (elev < 0.45) {
        // Highland / forest
        const t = (elev - 0.25) / 0.2;
        [r, g, b] = lerpColor(45, 140, 55, 90, 120, 50, t);
      } else {
        // Mountains / snow
        const t = clamp((elev - 0.45) / 0.3);
        [r, g, b] = lerpColor(90, 120, 50, 200, 200, 210, t);
      }

      // Cloud layer
      const cloud = fbm(u * 8 + 500, v * 4 + 500, 5);
      if (cloud > 0.05) {
        const ct = clamp((cloud - 0.05) * 3) * 0.6;
        [r, g, b] = lerpColor(r, g, b, 240, 245, 255, ct);
      }

      // Atmosphere glow at edges (limb darkening approximation)
      const latitude = Math.abs(v - 0.5) * 2;
      const atmo = clamp(latitude * 0.15);
      r = lerp(r, 60, atmo);
      g = lerp(g, 100, atmo);
      b = lerp(b, 180, atmo);

      const idx = (py * W + px) * 4;
      d[idx] = clamp(r, 0, 255);
      d[idx+1] = clamp(g, 0, 255);
      d[idx+2] = clamp(b, 0, 255);
      d[idx+3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvasToTexture(canvas);
}

// ============================================================
// 7. NEBULA TEXTURE (Deep space gas clouds)
// ============================================================
export function createNebulaTexture(colorHex1, colorHex2) {
  const W = 512, H = 512;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(W, H);
  const d = img.data;
  const c1 = hexToRgb(colorHex1.startsWith('rgba') ? 'aa44cc' : colorHex1.replace('#',''));
  const c2 = hexToRgb(colorHex2.startsWith('rgba') ? '4400aa' : colorHex2.replace('#',''));

  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const u = px / W, v = py / H;
      const cx = u - 0.5, cy = v - 0.5;
      const dist = Math.sqrt(cx*cx + cy*cy);

      const n = fbm(u * 4 + 700, v * 4 + 700, 5);
      const density = clamp((1 - dist * 2.2) * (n * 0.5 + 0.5));

      const t = clamp(n * 0.5 + 0.5);
      let [r, g, b] = lerpColor(c1[0], c1[1], c1[2], c2[0], c2[1], c2[2], t);

      const alpha = clamp(density * 180, 0, 255);

      const idx = (py * W + px) * 4;
      d[idx] = r; d[idx+1] = g; d[idx+2] = b; d[idx+3] = alpha;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvasToTexture(canvas);
}

// ============================================================
// 8. RING TEXTURE — Banded translucent ring for Saturn-like
// ============================================================
export function createRingTexture() {
  const W = 512, H = 64;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(W, H);
  const d = img.data;

  for (let px = 0; px < W; px++) {
    const u = px / W;
    // Multiple rings with gaps
    const ringBand = Math.sin(u * Math.PI * 40) * 0.5 + 0.5;
    const n = noise2D(u * 30, 0) * 0.3;
    const opacity = clamp((ringBand + n) * 0.7) * 200;

    // Color variation across rings
    const t = u;
    let [r, g, b] = lerpColor(220, 150, 80, 180, 120, 60, t);
    r += noise2D(u * 50, 1) * 20;
    g += noise2D(u * 50, 2) * 15;

    for (let py = 0; py < H; py++) {
      const idx = (py * W + px) * 4;
      d[idx] = clamp(r, 0, 255);
      d[idx+1] = clamp(g, 0, 255);
      d[idx+2] = clamp(b, 0, 255);
      d[idx+3] = clamp(opacity, 0, 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  return tex;
}
