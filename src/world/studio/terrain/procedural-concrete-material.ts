import * as THREE from "three";
import { rand } from "../rand";

export interface ConcreteTextures {
  diffuse: THREE.CanvasTexture | THREE.DataTexture;
  bump: THREE.CanvasTexture | THREE.DataTexture;
  roughness: THREE.CanvasTexture | THREE.DataTexture;
}

export interface ConcreteMaterialOptions {
  repeatU?: number;
  repeatV?: number;
  bumpScale?: number;
  roughness?: number;
  metalness?: number;
}

/**
 * Procedural Architectural Concrete Texture Generator
 * Synthesizes high-fidelity board-formed architectural concrete:
 * - Horizontal formwork board plank seams with wood grain imprinting
 * - Tadao Ando style form tie-rod dimples along the seams
 * - Granular aggregate porosity, micro-bugholes, and mineral speckling
 * - Calibrated matte concrete tactile bump and roughness response
 */
export function createProceduralConcreteTextures(size = 1024): ConcreteTextures {
  if (typeof document === "undefined") {
    const dummy = new THREE.DataTexture(new Uint8Array([122, 121, 118, 255]), 1, 1);
    dummy.needsUpdate = true;
    return { diffuse: dummy, bump: dummy, roughness: dummy };
  }

  // 1. Diffuse Texture Canvas (Architectural Board-Formed Concrete)
  const diffCanvas = document.createElement("canvas");
  diffCanvas.width = size;
  diffCanvas.height = size;
  const dCtx = diffCanvas.getContext("2d")!;

  // Base architectural mineral stone-grey tone
  dCtx.fillStyle = "#797875";
  dCtx.fillRect(0, 0, size, size);

  // 8 Board-formed horizontal planks (128px each for seamless 1024 vertical height)
  const boardCount = 8;
  const boardHeight = size / boardCount;
  const boardTones = [
    "#7e7d7a",
    "#73726f",
    "#807f7c",
    "#72716e",
    "#7c7b78",
    "#757471",
    "#7d7c79",
    "#6f6e6b",
  ];

  for (let b = 0; b < boardCount; b++) {
    const by = b * boardHeight;
    dCtx.fillStyle = boardTones[b % boardTones.length];
    dCtx.fillRect(0, by, size, boardHeight);

    // Subtle horizontal timber formwork grain striations within each board
    for (let g = 0; g < 45; g++) {
      const gy = by + rand() * boardHeight;
      const gLen = 60 + rand() * 220;
      const gx = rand() * size;
      const isLight = rand() > 0.48;
      dCtx.strokeStyle = isLight
        ? "rgba(145, 143, 138, 0.12)"
        : "rgba(85, 84, 80, 0.14)";
      dCtx.lineWidth = 0.8 + rand() * 1.5;

      // Draw seamlessly wrapped grain lines
      for (let dx = -size; dx <= size; dx += size) {
        dCtx.beginPath();
        dCtx.moveTo(gx + dx, gy);
        dCtx.lineTo(gx + dx + gLen, gy + (rand() - 0.5) * 1.5);
        dCtx.stroke();
      }
    }

    // Formwork board joint seam (recessed hairline groove + bottom release bevel)
    dCtx.fillStyle = "rgba(40, 39, 37, 0.65)";
    dCtx.fillRect(0, by, size, 2.0); // Recessed seam line
    dCtx.fillStyle = "rgba(165, 163, 159, 0.35)";
    dCtx.fillRect(0, by + 2.0, size, 1.2); // Sunlit chamfer edge
  }

  // Architectural Form Tie-Rod Holes (iconic cast concrete signature)
  // Evenly spaced at horizontal intervals of 256px along the middle of each board
  const tieSpacingX = 256;
  for (let b = 0; b < boardCount; b++) {
    const cy = b * boardHeight + boardHeight * 0.5;
    for (let cx = 64; cx < size; cx += tieSpacingX) {
      // Outer circular dimple (recessed ring)
      dCtx.fillStyle = "rgba(42, 41, 39, 0.45)";
      dCtx.beginPath();
      dCtx.arc(cx, cy, 7.5, 0, Math.PI * 2);
      dCtx.fill();

      // Lower bevel highlight
      dCtx.fillStyle = "rgba(160, 158, 154, 0.40)";
      dCtx.beginPath();
      dCtx.arc(cx, cy + 1.2, 6.0, 0, Math.PI * 2);
      dCtx.fill();

      // Inner core pocket
      dCtx.fillStyle = "rgba(30, 29, 28, 0.85)";
      dCtx.beginPath();
      dCtx.arc(cx, cy, 4.5, 0, Math.PI * 2);
      dCtx.fill();

      // Center steel tie plug
      dCtx.fillStyle = "#5c554e";
      dCtx.beginPath();
      dCtx.arc(cx, cy, 2.0, 0, Math.PI * 2);
      dCtx.fill();
    }
  }

  // Concrete Mineral Aggregate & Porosity (fine quartz silica and dark basalt flecks)
  const aggregateCount = 6500;
  for (let i = 0; i < aggregateCount; i++) {
    const ax = rand() * size;
    const ay = rand() * size;
    const ar = 0.6 + rand() * 1.6;
    const isDark = rand() > 0.42;

    dCtx.fillStyle = isDark
      ? "rgba(48, 47, 45, 0.28)"
      : "rgba(182, 180, 175, 0.24)";

    dCtx.beginPath();
    dCtx.arc(ax, ay, ar, 0, Math.PI * 2);
    dCtx.fill();
  }

  // Micro-bugholes (small porous air voids typical of architectural cast concrete)
  const bugholeCount = 500;
  dCtx.fillStyle = "rgba(34, 33, 31, 0.55)";
  for (let i = 0; i < bugholeCount; i++) {
    const bx = rand() * size;
    const by = rand() * size;
    const br = 0.7 + rand() * 1.4;
    dCtx.beginPath();
    dCtx.arc(bx, by, br, 0, Math.PI * 2);
    dCtx.fill();
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

  const bBoardHeight = bSize / boardCount;
  for (let b = 0; b < boardCount; b++) {
    const by = b * bBoardHeight;

    // Recessed formwork plank seams
    bCtx.fillStyle = "#4a4a4a"; // Recessed groove
    bCtx.fillRect(0, by, bSize, 2);
    bCtx.fillStyle = "#b4b4b4"; // Protruding lower bevel
    bCtx.fillRect(0, by + 2, bSize, 1);

    // Tie-rod dimple indentations
    const cy = by + bBoardHeight * 0.5;
    const bTieSpacingX = tieSpacingX / 2;
    for (let cx = 32; cx < bSize; cx += bTieSpacingX) {
      bCtx.fillStyle = "#3c3c3c";
      bCtx.beginPath();
      bCtx.arc(cx, cy, 4.0, 0, Math.PI * 2);
      bCtx.fill();
    }
  }

  // Tactile concrete micro-stipple bump
  const bStippleCount = 8000;
  for (let i = 0; i < bStippleCount; i++) {
    const sx = rand() * bSize;
    const sy = rand() * bSize;
    const sr = 0.6 + rand() * 1.4;
    const val = rand() > 0.5 ? 155 + Math.floor(rand() * 45) : 85 + Math.floor(rand() * 35);
    bCtx.fillStyle = `rgb(${val}, ${val}, ${val})`;
    bCtx.beginPath();
    bCtx.arc(sx, sy, sr, 0, Math.PI * 2);
    bCtx.fill();
  }

  const bump = new THREE.CanvasTexture(bumpCanvas);
  bump.wrapS = THREE.RepeatWrapping;
  bump.wrapT = THREE.RepeatWrapping;
  bump.anisotropy = 4;

  // 3. Roughness Map (256x256 Seamless)
  const roughCanvas = document.createElement("canvas");
  const rSize = size / 4;
  roughCanvas.width = rSize;
  roughCanvas.height = rSize;
  const rCtx = roughCanvas.getContext("2d")!;

  // Base concrete roughness ~0.84
  rCtx.fillStyle = "#d6d6d6";
  rCtx.fillRect(0, 0, rSize, rSize);

  // Formwork plank subtle sheen modulation
  const rBoardHeight = rSize / boardCount;
  for (let b = 0; b < boardCount; b++) {
    const by = b * rBoardHeight;
    const rVal = 205 + Math.floor(rand() * 25);
    rCtx.fillStyle = `rgba(${rVal}, ${rVal}, ${rVal}, 0.35)`;
    rCtx.fillRect(0, by, rSize, rBoardHeight);
  }

  // Rough aggregate & porous pockets
  for (let i = 0; i < 400; i++) {
    const rx = rand() * rSize;
    const ry = rand() * rSize;
    const rr = 2 + rand() * 8;
    const rVal = 220 + Math.floor(rand() * 30);
    rCtx.fillStyle = `rgba(${rVal}, ${rVal}, ${rVal}, 0.30)`;
    rCtx.beginPath();
    rCtx.arc(rx, ry, rr, 0, Math.PI * 2);
    rCtx.fill();
  }

  const roughness = new THREE.CanvasTexture(roughCanvas);
  roughness.wrapS = THREE.RepeatWrapping;
  roughness.wrapT = THREE.RepeatWrapping;

  return { diffuse, bump, roughness };
}

/**
 * Creates an authentic architectural board-formed concrete material
 */
export function createProceduralConcreteMaterial(
  textures: ConcreteTextures,
  options: ConcreteMaterialOptions = {}
): THREE.MeshStandardMaterial {
  const {
    repeatU = 8.0,
    repeatV = 2.0,
    bumpScale = 0.038,
    roughness = 0.84,
    metalness = 0.04,
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
    flatShading: false,
  });
}
