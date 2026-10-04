import * as THREE from "three";
import { rand } from "../rand";
import { TerrainTextures, TerrainMaterialOptions } from "./terrain-types";

/**
 * Procedural Turf Texture Generator
 * Synthesizes high-fidelity manicured fresh-cut estate lawn textures:
 * - Rich natural chlorophyll lawn color palette with deep earthy soil thatch
 * - Subtle directional mower cylinder track nap (groomed estate aesthetic)
 * - Ultra-dense crisp micro-blade strokes with sheared cut tips
 * - High-detail directional bump micro-relief and velvety, completely non-glossy matte roughness
 */
export function createProceduralTurfTextures(size = 1024): TerrainTextures {
  if (typeof document === "undefined") {
    const dummy = new THREE.DataTexture(new Uint8Array([42, 88, 28, 255]), 1, 1);
    dummy.needsUpdate = true;
    return { diffuse: dummy, bump: dummy, roughness: dummy };
  }

  // 1. Diffuse Texture Canvas (Toroidally Seamless Fresh-Cut Manicured Lawn)
  const diffCanvas = document.createElement("canvas");
  diffCanvas.width = size;
  diffCanvas.height = size;
  const dCtx = diffCanvas.getContext("2d")!;

  // Base healthy, deep manicured lawn emerald tone (rich, earthy, authentic)
  dCtx.fillStyle = "#1e4016";
  dCtx.fillRect(0, 0, size, size);

  // Helper for drawing toroidally seamless circles
  const drawSeamlessCircle = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number,
    fillStyle: string
  ) => {
    ctx.fillStyle = fillStyle;
    for (let dx = -size; dx <= size; dx += size) {
      for (let dy = -size; dy <= size; dy += size) {
        const cx = x + dx;
        const cy = y + dy;
        if (cx + r >= 0 && cx - r <= size && cy + r >= 0 && cy - r <= size) {
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  };

  // Helper for drawing toroidally seamless lines
  const drawSeamlessLine = (
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    strokeStyle: string,
    lineWidth: number
  ) => {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    for (let dx = -size; dx <= size; dx += size) {
      for (let dy = -size; dy <= size; dy += size) {
        const sx1 = x1 + dx;
        const sy1 = y1 + dy;
        const sx2 = x2 + dx;
        const sy2 = y2 + dy;
        const minX = Math.min(sx1, sx2);
        const maxX = Math.max(sx1, sx2);
        const minY = Math.min(sy1, sy2);
        const maxY = Math.max(sy1, sy2);
        if (maxX >= 0 && minX <= size && maxY >= 0 && minY <= size) {
          ctx.beginPath();
          ctx.moveTo(sx1, sy1);
          ctx.lineTo(sx2, sy2);
          ctx.stroke();
        }
      }
    }
  };

  // Layer 1: Alternating Subtle Cylinder Mower Nap Bands (16 stripes across 1024 width = 64px width)
  // Replicates the distinct light/dark nap from cylinder mowing in luxury estate lawns without harsh neon contrast
  const stripeWidth = 64;
  const stripeCount = size / stripeWidth;
  for (let s = 0; s < stripeCount; s++) {
    const sx = s * stripeWidth;
    const isLightStripe = s % 2 === 0;

    if (isLightStripe) {
      // Light stripe: Blades rolled away, catching subtle diffuse sunlight
      dCtx.fillStyle = "rgba(72, 144, 52, 0.08)";
      dCtx.fillRect(sx, 0, stripeWidth, size);
      // Soft vertical roller nap
      dCtx.fillStyle = "rgba(86, 168, 62, 0.05)";
      dCtx.fillRect(sx + 10, 0, stripeWidth - 20, size);
    } else {
      // Dark stripe: Blades rolled toward viewer, deeper emerald nap shadow
      dCtx.fillStyle = "rgba(18, 42, 14, 0.10)";
      dCtx.fillRect(sx, 0, stripeWidth, size);
    }
  }

  // Layer 2: Organic Undergrowth Lawn Patches (Clover, deep root turf, moss, rich soil thatch)
  const patchCount = 420;
  const tones = [
    "rgba(38, 78, 25, 0.45)",  // Deep bluegrass shadow
    "rgba(48, 98, 32, 0.40)",  // Rich perennial ryegrass
    "rgba(60, 118, 40, 0.35)", // Vibrant emerald fescue
    "rgba(72, 138, 48, 0.28)", // Fresh cut blade wash
    "rgba(26, 56, 18, 0.42)",  // Deep soil-turf backing
  ];
  for (let i = 0; i < patchCount; i++) {
    const px = rand() * size;
    const py = rand() * size;
    const pr = 14 + rand() * 36;
    drawSeamlessCircle(dCtx, px, py, pr, tones[i % tones.length]);
  }

  // Layer 3: Ultra-Dense Micro Grass Blade Strokes (32,000+ seamless fibers)
  // Oriented primarily along the vertical cut with natural blade spread and sheared tips
  const fiberCount = 32000;
  const bladeTones = [
    "#224a17", // Deep stem root
    "#2b5b1e", // Dense turf body
    "#377227", // Rich lawn emerald
    "#438630", // Healthy upright blade
    "#4f9838", // Sunlit leaf
    "#5cae42", // Freshly sheared blade tip
    "#336623", // Cool perennial rye
  ];

  for (let i = 0; i < fiberCount; i++) {
    const fx = rand() * size;
    const fy = rand() * size;
    const flen = 3.2 + rand() * 5.0;
    // Angle aligned with cut direction (-PI/2) with fine fanning
    const fAngle = -Math.PI / 2 + (rand() - 0.5) * 0.65;
    const tx = fx + Math.cos(fAngle) * flen;
    const ty = fy + Math.sin(fAngle) * flen;
    const col = bladeTones[i % bladeTones.length];
    drawSeamlessLine(dCtx, fx, fy, tx, ty, col, 1.0);

    // Sheared tip cut highlight on fresh cut blades
    if (i % 4 === 0) {
      drawSeamlessCircle(dCtx, tx, ty, 0.65, "#6ec84e");
    }
  }

  const diffuse = new THREE.CanvasTexture(diffCanvas);
  diffuse.wrapS = THREE.RepeatWrapping;
  diffuse.wrapT = THREE.RepeatWrapping;
  diffuse.colorSpace = THREE.SRGBColorSpace;
  diffuse.anisotropy = 8;

  // 2. Bump / Micro-Relief Texture Canvas (512x512 Seamless)
  const bumpCanvas = document.createElement("canvas");
  const bSize = size / 2;
  bumpCanvas.width = bSize;
  bumpCanvas.height = bSize;
  const bCtx = bumpCanvas.getContext("2d")!;

  bCtx.fillStyle = "#808080";
  bCtx.fillRect(0, 0, bSize, bSize);

  // Mower roll height relief bands
  const bStripeWidth = stripeWidth / 2;
  const bStripeCount = bSize / bStripeWidth;
  for (let s = 0; s < bStripeCount; s++) {
    const bx = s * bStripeWidth;
    const val = s % 2 === 0 ? 134 : 122;
    bCtx.fillStyle = `rgb(${val}, ${val}, ${val})`;
    bCtx.fillRect(bx, 0, bStripeWidth, bSize);
  }

  // High-frequency directional blade grooves and sharp edges
  const bumpCount = 18000;
  for (let i = 0; i < bumpCount; i++) {
    const bx = rand() * bSize;
    const by = rand() * bSize;
    const blen = 2.0 + rand() * 3.8;
    const bAngle = -Math.PI / 2 + (rand() - 0.5) * 0.65;
    const tx = bx + Math.cos(bAngle) * blen;
    const ty = by + Math.sin(bAngle) * blen;
    const isRidge = rand() > 0.40;
    const hVal = isRidge ? 175 + Math.floor(rand() * 60) : 70 + Math.floor(rand() * 40);
    const col = `rgb(${hVal}, ${hVal}, ${hVal})`;
    drawSeamlessLine(bCtx, bx, by, tx, ty, col, 1.0);
  }

  const bump = new THREE.CanvasTexture(bumpCanvas);
  bump.wrapS = THREE.RepeatWrapping;
  bump.wrapT = THREE.RepeatWrapping;
  bump.anisotropy = 4;

  // 3. Roughness Map (256x256 Seamless)
  // Calibrated to completely velvety, non-glossy organic turf (roughness ~0.94 - 0.99)
  const roughCanvas = document.createElement("canvas");
  const rSize = size / 4;
  roughCanvas.width = rSize;
  roughCanvas.height = rSize;
  const rCtx = roughCanvas.getContext("2d")!;

  // High matte base turf roughness ~0.96 (no specular hotspots or shiny film)
  rCtx.fillStyle = "#f5f5f5";
  rCtx.fillRect(0, 0, rSize, rSize);

  // Mower stripe roughness modulation
  const rStripeWidth = stripeWidth / 4;
  const rStripeCount = rSize / rStripeWidth;
  for (let s = 0; s < rStripeCount; s++) {
    const rx = s * rStripeWidth;
    const rVal = s % 2 === 0 ? 242 : 252;
    rCtx.fillStyle = `rgb(${rVal}, ${rVal}, ${rVal})`;
    rCtx.fillRect(rx, 0, rStripeWidth, rSize);
  }

  // Micro organic blade scattering variations
  for (let i = 0; i < 400; i++) {
    const rx = rand() * rSize;
    const ry = rand() * rSize;
    const rr = 6 + rand() * 18;
    const rVal = 238 + Math.floor(rand() * 17);
    drawSeamlessCircle(rCtx, rx, ry, rr, `rgba(${rVal}, ${rVal}, ${rVal}, 0.35)`);
  }

  const roughness = new THREE.CanvasTexture(roughCanvas);
  roughness.wrapS = THREE.RepeatWrapping;
  roughness.wrapT = THREE.RepeatWrapping;

  return { diffuse, bump, roughness };
}

/**
 * Creates a high-fidelity living procedural turf material with seamless coverage
 */
export function createProceduralTurfMaterial(
  textures: TerrainTextures,
  options: TerrainMaterialOptions = {}
): THREE.MeshStandardMaterial {
  const {
    repeatU = 24.0,
    repeatV = 24.0,
    bumpScale = 0.065,
    roughness = 0.96,
    metalness = 0.0,
  } = options;

  textures.diffuse.repeat.set(repeatU, repeatV);
  textures.bump.repeat.set(repeatU, repeatV);
  textures.roughness.repeat.set(repeatU, repeatV);

  return new THREE.MeshStandardMaterial({
    map: textures.diffuse,
    bumpMap: textures.bump,
    bumpScale,
    roughnessMap: textures.roughness,
    roughness,
    metalness,
  });
}

