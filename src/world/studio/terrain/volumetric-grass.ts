import * as THREE from "three";
import { rand } from "../rand";

/**
 * Volumetric 3D Grass Tufts System
 * Generates high-detail, stylized 3D grass clumps matching the vine quality standard:
 * - Creased 3D blade geometry with central midrib spine catching directional highlights
 * - 18 tiered blades per clump (tall upright, graceful mid-arch, low ground spreaders)
 * - Rich 4-stop vertical chlorophyll gradient: deep turf root -> rich lawn emerald -> fresh cut blade -> sunlit tip
 * - Multi-frequency GPU vertex wind simulation with rolling lawn waves and high-frequency flutter
 * - High-performance THREE.InstancedMesh scattering across the estate lawn
 * - Polished river pebbles nestled into select clumps
 */

export interface GrassInstance {
  x: number;
  y: number;
  z: number;
  scale?: number;
  heightScale?: number;
  widthScale?: number;
  leanAngle?: number;
  leanDir?: number;
}

export interface VolumetricGrassSystem {
  /** One InstancedMesh per spatial tile, so off-screen tiles are culled. */
  tiles: THREE.Group;
  pebblesGroup: THREE.Group;
  update: (timeSeconds: number) => void;
  /**
   * Tiles farther than `farDistance` from the eye use the 48-triangle clump;
   * tiles beyond `cullDistance` are hidden. Distances are to the tile's edge.
   */
  updateLod: (eye: THREE.Vector3, farDistance: number, cullDistance: number) => void;
  dispose: () => void;
}

/**
 * Generates a high-detail brush bristle grass clump geometry with 24 creased, curved blades.
 * Features:
 * - 6 Central guard bristles with soft feathery wheat seedhead plumes catching directional light
 * - 10 Flowing mid-arch body bristles providing lush green volume
 * - 8 Low ground sweep bristles creating a dense, springy brush base
 * - Creased 3D V-spine on each bristle producing crisp facet shading
 */
function createGrassClumpGeometry(bladeCount = 12, segments = 3): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];


  let vertexOffset = 0;

  // Rich 5-stop chlorophyll & wheat plume gradient
  const colRoot = new THREE.Color(0.09, 0.20, 0.05);   // Moist soil root & thatch
  const colMid = new THREE.Color(0.18, 0.42, 0.12);    // Healthy deep emerald lawn body
  const colUpper = new THREE.Color(0.28, 0.58, 0.18);  // Fresh-cut vibrant emerald
  const colTip = new THREE.Color(0.42, 0.72, 0.24);    // Soft sunlit sheared tip
  const colPlume = new THREE.Color(0.82, 0.78, 0.52);  // Feathery sunlit wheat plume seedhead

  for (let b = 0; b < bladeCount; b++) {
    // 3 Tiers: 0-2 Center Guard Bristles, 3-7 Mid-Arch Body, 8-11 Ground Spreaders
    // Tier by fraction so the far-LOD clump keeps the same guard/body/spreader mix.
    const isGuard = b < bladeCount / 4;
    const tier = isGuard ? 0 : b < (bladeCount * 2) / 3 ? 1 : 2;
    const azimuth = (b / bladeCount) * Math.PI * 2 + Math.sin(b * 3.4) * 0.22;

    const height =
      tier === 0
        ? 0.48 + Math.sin(b * 1.8) * 0.08
        : tier === 1
        ? 0.32 + Math.cos(b * 2.3) * 0.06
        : 0.20 + Math.sin(b * 1.2) * 0.04;

    const archFactor =
      tier === 0 ? 0.09 + (b % 3) * 0.02 : tier === 1 ? 0.22 + (b % 3) * 0.05 : 0.38 + (b % 3) * 0.06;

    const baseWidth = tier === 0 ? 0.038 : tier === 1 ? 0.046 : 0.042;
    const spineDepth = baseWidth * 0.40; // Depth of the central V-crease

    const cosAz = Math.cos(azimuth);
    const sinAz = Math.sin(azimuth);

    // Tangent perpendicular to azimuth in XZ plane
    const perpX = -sinAz;
    const perpZ = cosAz;

    // Outward radial normal
    const outX = cosAz;
    const outZ = sinAz;

    for (let s = 0; s <= segments; s++) {
      const t = s / segments;

      // Parabolic outward curvature
      const y = t * height;
      const rOut = Math.pow(t, 1.5) * archFactor;

      // Gentle natural blade twist along its length
      const twist = t * 0.25 * (b % 2 === 0 ? 1 : -1);
      const curCos = Math.cos(azimuth + twist);
      const curSin = Math.sin(azimuth + twist);
      const curPerpX = -curSin;
      const curPerpZ = curCos;
      const curOutX = curCos;
      const curOutZ = curSin;

      const cx = curOutX * rOut;
      const cz = curOutZ * rOut;

      // Width tapers toward tip, with gentle seed plume flare on guard bristles
      const plumeFlare = isGuard && t >= 0.65 ? 1.0 + Math.sin(((t - 0.65) / 0.35) * Math.PI) * 0.80 : 1.0;
      const curWidth = baseWidth * (1.0 - Math.pow(t, 1.3)) * plumeFlare;
      const halfW = curWidth * 0.5;
      const curSpineD = spineDepth * (1.0 - t * 0.75);

      // Color interpolation across the chlorophyll & plume stops
      const vColor = new THREE.Color();
      if (t < 0.25) {
        vColor.lerpColors(colRoot, colMid, t / 0.25);
      } else if (t < 0.65) {
        vColor.lerpColors(colMid, colUpper, (t - 0.25) / 0.40);
      } else if (isGuard && t >= 0.65) {
        vColor.lerpColors(colUpper, colPlume, (t - 0.65) / 0.35);
      } else {
        vColor.lerpColors(colUpper, colTip, (t - 0.65) / 0.35);
      }

      // 3 Vertices per slice: Left, Spine (Raised), Right
      // 1. Left Edge Vertex
      const lx = cx - curPerpX * halfW - curOutX * (curSpineD * 0.5);
      const lz = cz - curPerpZ * halfW - curOutZ * (curSpineD * 0.5);
      positions.push(lx, y, lz);
      normals.push(curOutX * 0.6 - curPerpX * 0.7, 0.3 * t, curOutZ * 0.6 - curPerpZ * 0.7);
      colors.push(vColor.r * 0.92, vColor.g * 0.92, vColor.b * 0.92);

      // 2. Center Spine Vertex (Protruding outward along normal, catching highlight)
      const sx = cx + curOutX * curSpineD;
      const sz = cz + curOutZ * curSpineD;
      positions.push(sx, y, sz);
      normals.push(curOutX, 0.4 * t, curOutZ);
      colors.push(vColor.r * 1.05, vColor.g * 1.05, vColor.b * 1.05);

      // 3. Right Edge Vertex
      const rx = cx + curPerpX * halfW - curOutX * (curSpineD * 0.5);
      const rz = cz + curPerpZ * halfW - curOutZ * (curSpineD * 0.5);
      positions.push(rx, y, rz);
      normals.push(curOutX * 0.6 + curPerpX * 0.7, 0.3 * t, curOutZ * 0.6 + curPerpZ * 0.7);
      colors.push(vColor.r * 0.92, vColor.g * 0.92, vColor.b * 0.92);

      // Form 2 Quads (4 Triangles) per segment; DoubleSide material handles backfaces
      if (s < segments) {
        const base = vertexOffset + s * 3;
        const next = base + 3;

        const l0 = base;
        const s0 = base + 1;
        const r0 = base + 2;

        const l1 = next;
        const s1 = next + 1;
        const r1 = next + 2;

        // Left Quad (l0, s0, s1, l1)
        indices.push(l0, s0, l1);
        indices.push(s0, s1, l1);

        // Right Quad (s0, r0, r1, s1)
        indices.push(s0, r0, s1);
        indices.push(r0, r1, s1);
      }
    }

    vertexOffset += (segments + 1) * 3;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

/**
 * Creates the Volumetric Grass System with InstancedMesh and nestled river stones.
 */
export function createVolumetricGrassSystem(
  instances: GrassInstance[]
): VolumetricGrassSystem {
  const geometry = createGrassClumpGeometry();
  // 6 blades x 2 segments = 48 triangles against 144: a clump past
  // FAR_DISTANCE covers a few pixels and the blade count cannot be read.
  const farGeometry = createGrassClumpGeometry(6, 2);

  const windUniforms = {
    uTime: { value: 0 },
  };

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.94,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });

  // Inject natural dynamic wind wave and blade flutter into vertex shader
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = windUniforms.uTime;
    shader.vertexShader = `
      uniform float uTime;
      ${shader.vertexShader}
    `;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `
      #include <begin_vertex>
      // Multi-harmonic physical wind simulation
      // Extract instance origin coordinate for world-space wind propagation
      #ifdef USE_INSTANCEMATRIX
        vec3 instOrigin = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
      #else
        vec3 instOrigin = position;
      #endif

      // Dynamic wind direction vector
      vec2 windDir = normalize(vec2(0.82, 0.54));
      float worldCoord = dot(instOrigin.xz, windDir);

      // 1. Traveling lawn wave: rolling wave propagating across the island lawn
      float wavePhase = uTime * 2.35 - worldCoord * 0.16;
      float macroWave = sin(wavePhase) * 0.12;
      float gustPulse = sin(wavePhase * 0.55 + 1.2) * 0.05;

      // 2. High-frequency blade flutter & tip resonance
      float microFlutter = sin(uTime * 5.6 + worldCoord * 0.85 + position.y * 7.5) * 0.032;

      // 3. Quadratic flex: root firmly planted (flex = 0), tip sways maximally (flex = 1)
      float hNorm = clamp(position.y / 0.52, 0.0, 1.0);
      float flex = hNorm * hNorm;

      float totalSway = (macroWave + gustPulse + microFlutter) * flex;
      transformed.x += totalSway * windDir.x;
      transformed.z += totalSway * windDir.y;

      // Natural downward dip as blades bend under wind force
      transformed.y -= abs(totalSway) * 0.22 * flex;
      `
    );
  };

  const count = instances.length;
  const matrices: THREE.Matrix4[] = [];
  const dummy = new THREE.Object3D();

  // Nestled polished river pebbles group
  const pebblesGroup = new THREE.Group();
  const pebbleGeo = new THREE.DodecahedronGeometry(0.12, 1);
  pebbleGeo.scale(1.3, 0.65, 1.0);

  const pebbleMatA = new THREE.MeshStandardMaterial({
    color: 0xdedad2, // Polished river limestone pebble
    roughness: 0.70,
    metalness: 0.04,
  });

  const pebbleMatB = new THREE.MeshStandardMaterial({
    color: 0x8a847b, // Weathered warm grey river basalt
    roughness: 0.82,
    metalness: 0.06,
  });

  const pebbleMatricesA: THREE.Matrix4[] = [];
  const pebbleMatricesB: THREE.Matrix4[] = [];
  const pebbleDummy = new THREE.Object3D();
  let pebbleCount = 0;

  for (let i = 0; i < count; i++) {
    const inst = instances[i];
    const s = inst.scale ?? 1.0;
    const h = (inst.heightScale ?? s);
    const w = (inst.widthScale ?? s);

    dummy.position.set(inst.x, inst.y, inst.z);
    
    // Directional brush sweep: yaw + natural stroke lean
    const yaw = inst.leanDir ?? (rand() * Math.PI * 2);
    const pitch = inst.leanAngle ?? (0.04 + rand() * 0.06);

    dummy.rotation.set(0, yaw, 0);
    dummy.rotateX(pitch);
    // Decorrelate height from girth
    dummy.scale.set(w, h, w);
    dummy.updateMatrix();

    matrices.push(dummy.matrix.clone());

    // Organically nestle a river stone into select grass clumps
    if (i % 24 === 0 && pebbleCount < 36) {
      pebbleDummy.position.set(
        inst.x + (rand() - 0.5) * 0.16,
        inst.y + 0.03,
        inst.z + (rand() - 0.5) * 0.16
      );
      pebbleDummy.rotation.set(
        rand() * 0.2,
        rand() * Math.PI * 2,
        rand() * 0.2
      );
      const ps = 0.80 + rand() * 0.40;
      pebbleDummy.scale.set(ps, ps * 0.6, ps);
      pebbleDummy.updateMatrix();

      if (pebbleCount % 2 === 0) {
        pebbleMatricesA.push(pebbleDummy.matrix.clone());
      } else {
        pebbleMatricesB.push(pebbleDummy.matrix.clone());
      }
      pebbleCount++;
    }
  }

  if (pebbleMatricesA.length > 0) {
    const meshA = new THREE.InstancedMesh(pebbleGeo, pebbleMatA, pebbleMatricesA.length);
    meshA.receiveShadow = true;
    pebbleMatricesA.forEach((mat, idx) => meshA.setMatrixAt(idx, mat));
    meshA.instanceMatrix.needsUpdate = true;
    pebblesGroup.add(meshA);
  }
  if (pebbleMatricesB.length > 0) {
    const meshB = new THREE.InstancedMesh(pebbleGeo, pebbleMatB, pebbleMatricesB.length);
    meshB.receiveShadow = true;
    pebbleMatricesB.forEach((mat, idx) => meshB.setMatrixAt(idx, mat));
    meshB.instanceMatrix.needsUpdate = true;
    pebblesGroup.add(meshB);
  }

  const tiles = buildGrassTiles(instances, matrices, geometry, material);
  const lodCenter = new THREE.Vector3();

  return {
    tiles,
    pebblesGroup,
    update: (timeSeconds: number) => {
      windUniforms.uTime.value = timeSeconds;
    },
    updateLod: (eye, farDistance, cullDistance) => {
      for (const child of tiles.children) {
        const tile = child as THREE.InstancedMesh;
        lodCenter.copy(tile.boundingSphere!.center).applyMatrix4(tile.matrixWorld);
        const distance = lodCenter.distanceTo(eye) - tile.boundingSphere!.radius;
        const visible = distance < cullDistance;
        if (tile.visible !== visible) {
          tile.visible = visible;
        }
        const targetGeometry = distance > farDistance ? farGeometry : geometry;
        if (tile.geometry !== targetGeometry) {
          tile.geometry = targetGeometry;
        }
      }
    },
    dispose: () => {
      tiles.removeFromParent();
      tiles.children.forEach((tile) => (tile as THREE.InstancedMesh).dispose());
      pebblesGroup.removeFromParent();
      pebblesGroup.children.forEach((c) => {
        if (c instanceof THREE.InstancedMesh) c.dispose();
      });
      geometry.dispose();
      farGeometry.dispose();
      material.dispose();
      pebbleGeo.dispose();
      pebbleMatA.dispose();
      pebbleMatB.dispose();
    },
  };
}

const TILE_SIZE = 16;

/**
 * A single InstancedMesh over the whole lawn has one bounding sphere, so all
 * ~4,000 clumps (585k triangles) were drawn whenever any grass was on screen.
 * Tiles give frustum culling something to cull and `updateLod` a unit to swap.
 */
function buildGrassTiles(
  instances: GrassInstance[],
  matrices: THREE.Matrix4[],
  nearGeometry: THREE.BufferGeometry,
  material: THREE.Material
): THREE.Group {
  const cells = new Map<string, number[]>();
  instances.forEach((inst, i) => {
    const key = `${Math.floor(inst.x / TILE_SIZE)},${Math.floor(inst.z / TILE_SIZE)}`;
    const members = cells.get(key) ?? [];
    members.push(i);
    cells.set(key, members);
  });

  const group = new THREE.Group();
  group.name = "volumetric-grass";
  for (const members of cells.values()) {
    const tile = new THREE.InstancedMesh(nearGeometry, material, members.length);
    tile.name = "volumetric-grass-tile";
    tile.receiveShadow = true;
    tile.castShadow = false;
    members.forEach((index, slot) => tile.setMatrixAt(slot, matrices[index]));
    tile.instanceMatrix.needsUpdate = true;
    tile.computeBoundingSphere();
    group.add(tile);
  }
  return group;
}
