import * as THREE from "three";
import { hash01 } from "../../math/hash";

/**
 * Rock for the island keel. Macro colour comes from vertex colours baked by
 * island-mass (strata, depth, moss, crevices); this adds grain at a scale the
 * ~1.2 m vertex grid cannot carry.
 *
 * Detail is sampled triplanar in world space. The keel's UVs converge at the
 * underside's pole and stretch down tall walls, so UV-mapped texture would
 * swirl and smear exactly where the rock is most visible.
 */
export function createRockMaterial(): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.93,
    metalness: 0,
  });
  const detail = { value: createTileableGrain(128) };
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uRockGrain = detail;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vRockPos;\nvarying vec3 vRockNormal;")
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvRockPos = (modelMatrix * vec4(position, 1.0)).xyz;\nvRockNormal = normalize(mat3(modelMatrix) * normal);"
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
uniform sampler2D uRockGrain;
varying vec3 vRockPos;
varying vec3 vRockNormal;
float rockGrain(float scale) {
  vec3 w = pow(abs(vRockNormal), vec3(4.0));
  w /= (w.x + w.y + w.z);
  vec3 p = vRockPos * scale;
  return texture2D(uRockGrain, p.yz).r * w.x + texture2D(uRockGrain, p.xz).r * w.y + texture2D(uRockGrain, p.xy).r * w.z;
}`
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
// Two octaves, ~3 m and ~0.7 m, so grain holds up both across the keel and at the lip.
float grain = rockGrain(0.33) * 0.6 + rockGrain(1.4) * 0.4;
diffuseColor.rgb *= mix(0.72, 1.12, grain);`
      );
  };
  material.customProgramCacheKey = () => "island-rock-triplanar";
  return material;
}

/** Tileable value-noise fbm as a single-channel texture, from the integer hash (AGENTS.md 8.2). */
function createTileableGrain(size: number): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  const octaves = [
    { period: 8, amplitude: 0.5 },
    { period: 16, amplitude: 0.27 },
    { period: 32, amplitude: 0.15 },
    { period: 64, amplitude: 0.08 },
  ];
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const lattice = (x: number, y: number, period: number, salt: number) =>
    hash01(((x % period) + period) % period + (((y % period) + period) % period) * 4096, salt);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let value = 0;
      octaves.forEach(({ period, amplitude }, o) => {
        const fx = (px / size) * period;
        const fy = (py / size) * period;
        const ix = Math.floor(fx);
        const iy = Math.floor(fy);
        const u = fade(fx - ix);
        const v = fade(fy - iy);
        const a = lattice(ix, iy, period, o);
        const b = lattice(ix + 1, iy, period, o);
        const c = lattice(ix, iy + 1, period, o);
        const d = lattice(ix + 1, iy + 1, period, o);
        value += (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * amplitude;
      });
      const byte = Math.round(THREE.MathUtils.clamp(value, 0, 1) * 255);
      data.set([byte, byte, byte, 255], (py * size + px) * 4);
    }
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}
