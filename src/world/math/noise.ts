import { hash01 } from "./hash";

/** Quintic fade: C2-continuous, so normals do not crease under moving light (AGENTS.md 8.2). */
const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

function lattice(x: number, y: number, z: number, salt: number): number {
  return hash01(Math.imul(x, 0x27d4eb2d) ^ Math.imul(y, 0x165667b1) ^ Math.imul(z, 0x61c88647), salt);
}

/** Trilinear value noise on an integer-hashed lattice, in [0, 1). */
export function valueNoise3(x: number, y: number, z: number, salt = 0): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const u = fade(x - ix);
  const v = fade(y - iy);
  const w = fade(z - iz);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const c = (dx: number, dy: number, dz: number) => lattice(ix + dx, iy + dy, iz + dz, salt);
  return lerp(
    lerp(lerp(c(0, 0, 0), c(1, 0, 0), u), lerp(c(0, 1, 0), c(1, 1, 0), u), v),
    lerp(lerp(c(0, 0, 1), c(1, 0, 1), u), lerp(c(0, 1, 1), c(1, 1, 1), u), v),
    w
  );
}

/** Fractal value noise, normalised by accumulated amplitude to [0, 1). Lacunarity is irrational. */
export function fbm3(x: number, y: number, z: number, octaves = 4, salt = 0): number {
  let sum = 0;
  let amplitude = 1;
  let total = 0;
  let frequency = 1;
  for (let o = 0; o < octaves; o++) {
    sum += valueNoise3(x * frequency, y * frequency, z * frequency, salt + o) * amplitude;
    total += amplitude;
    amplitude *= 0.5;
    frequency *= 2.02;
  }
  return sum / total;
}

/**
 * Noise along a closed loop of length `loopLength`: seamless where the loop
 * joins, because it samples a circle rather than a line. `featureSize` is the
 * rough spacing of features along the loop, in the same units.
 */
export function loopNoise(position: number, loopLength: number, featureSize: number, salt = 0, octaves = 3): number {
  const phi = (position / loopLength) * Math.PI * 2;
  const radius = loopLength / (Math.PI * 2 * featureSize);
  return fbm3(radius * Math.cos(phi), radius * Math.sin(phi), salt * 7.31, octaves, salt);
}
