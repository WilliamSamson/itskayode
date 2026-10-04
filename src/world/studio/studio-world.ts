import * as THREE from "three";
import type { StudioObjectId } from "./stations";
import { createAdvancedTechLab, LAB_BOUNDS } from "./advanced-tech-lab";
import { createPowerPlant, type PowerPlant } from "./power-plant";
import { batchStaticMeshes } from "./static-mesh-batcher";
import { TerrainEngine, GrassInstance } from "./terrain";
import { rand } from "./rand";
import { COMPANION_ISLET_CENTERS } from "./island";
import { buildIslandMass } from "./terrain/island-mass";
import { buildIslandVines, type IslandVines } from "./terrain/island-vines";
import { createRockMaterial } from "./terrain/rock-material";
export { MAIN_ISLAND_FOOTPRINT_SCALE, COMPANION_ISLET_CENTERS } from "./island";

/** Grow the cliff footprint while keeping the rooms and furnishings at human scale. */
export class EstateTerrainGenerator {
  private scene: THREE.Object3D;
  private mSeed = 1;
  public terrainEngine = new TerrainEngine();

  constructor(scene: THREE.Object3D) {
    this.scene = scene;
  }
  
  private rand(): number {
    this.mSeed = (this.mSeed * 16807) % 2147483647; 
    return (this.mSeed - 1) / 2147483646;
  }

  /** Ground height on the main island top, set once the mass is built. */
  public surfaceY: (x: number, z: number) => number | null = () => null;
  public vines?: IslandVines;

  public generate() {
    this.generateCliffBase();
    this.generateVolumetricLawnGrass();
  }

  private generateCliffBase() {
    // Plateau, rolled turf shoulder, soil band and rock keel: see island-mass.ts.
    const lawnTurfMat = this.terrainEngine.mainTurfMaterial;
    const companionTurfMat = this.terrainEngine.companionTurfMaterial;
    const companionCliffMat = this.terrainEngine.companionConcreteMaterial;
    // Dark topsoil and root band between the turf lip and the rock.
    const soilMat = new THREE.MeshStandardMaterial({ color: 0x3b2b1f, roughness: 0.96, metalness: 0 });

    const mass = buildIslandMass([lawnTurfMat, createRockMaterial(), soilMat]);
    const terraceMesh = mass.mesh;
    terraceMesh.name = "terrace-main-island";
    terraceMesh.userData.isTerrain = true;
    terraceMesh.receiveShadow = true;
    this.scene.add(terraceMesh);
    this.surfaceY = mass.surfaceY;

    this.vines = buildIslandVines(mass);
    this.scene.add(this.vines.group);

    // ── 5. Sculpted Companion Floating Sky Islets (Safely placed in distant sky corridors) ──
    // The islets clear the 100 m cliff and stay inside the 120 m orbital bound.
    this.generateCompanionIslet(COMPANION_ISLET_CENTERS[0].x, -8.5, COMPANION_ISLET_CENTERS[0].z, 4.0, 8.5, 0.45, companionCliffMat, companionTurfMat);
    this.generateCompanionIslet(COMPANION_ISLET_CENTERS[1].x, -10.0, COMPANION_ISLET_CENTERS[1].z, 3.4, 7.8, -0.35, companionCliffMat, companionTurfMat);
  }

  // ── PROCEDURAL COMPANION FLOATING SKY ISLETS (Stratified geology, asymmetric keel, mossy plateau) ──
  private generateCompanionIslet(
    cx: number,
    topY: number,
    cz: number,
    baseRadius: number,
    isletHeight: number,
    rotationY: number,
    cliffMat: THREE.Material,
    lawnTurfMat: THREE.Material
  ) {
    const rawAngles = [0, 0.62, 1.25, 1.88, 2.50, 3.14, 3.76, 4.38, 5.02, 5.65];
    const shapePoints: THREE.Vector2[] = [];
    rawAngles.forEach((ang, idx) => {
      const rNoise = 1.0 + Math.sin(ang * 3.0 + idx * 0.7) * 0.24 + Math.cos(ang * 2.0) * 0.16;
      const r = baseRadius * rNoise;
      shapePoints.push(new THREE.Vector2(Math.cos(ang) * r, Math.sin(ang) * r));
    });

    const isletShape = new THREE.Shape();
    shapePoints.forEach((p, idx) => {
      if (idx === 0) isletShape.moveTo(p.x, p.y);
      else isletShape.lineTo(p.x, p.y);
    });
    isletShape.closePath();

    const isletGeo = new THREE.ExtrudeGeometry(isletShape, {
      depth: isletHeight,
      bevelEnabled: false,
      steps: 22,
    });

    const pos = isletGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);

      const depthFromTop = isletHeight - z;
      const depthP = Math.max(0, Math.min(1.0, depthFromTop / isletHeight));

      if (depthFromTop > 0.06) {
        const keelTaper = 1.0 - Math.pow(depthP, 1.28) * 0.56;
        const shelf = Math.sin(depthFromTop * 2.4) * 0.05;
        const angle = Math.atan2(y, x);
        const cleft = Math.sin(angle * 7.0) * 0.07 * depthP;
        const totalTaper = Math.max(0.16, keelTaper + shelf + cleft);

        pos.setXY(i, x * totalTaper, y * totalTaper);

        if (z < 1.4) {
          const distCore = Math.hypot(x - 0.3, y + 0.25);
          const coreFactor = Math.max(0, 1.0 - distCore / (baseRadius * 1.35));
          const drop = Math.pow(coreFactor, 1.6) * (isletHeight * 0.40) + Math.sin(angle * 5.0) * 0.30;
          pos.setZ(i, z - Math.max(0, drop));
        }
      } else {
        const mound = Math.cos(x * 0.7) * Math.sin(y * 0.7) * 0.10;
        pos.setZ(i, z + mound);
      }
    }

    isletGeo.computeVertexNormals();

    const totalVerts = pos.count;
    const indices = new Uint32Array(totalVerts);
    let writeIdx = 0;
    let grassCount = 0;

    for (let i = 0; i < totalVerts; i += 3) {
      if (
        pos.getZ(i) >= isletHeight - 0.08 &&
        pos.getZ(i + 1) >= isletHeight - 0.08 &&
        pos.getZ(i + 2) >= isletHeight - 0.08
      ) {
        indices[writeIdx++] = i;
        indices[writeIdx++] = i + 1;
        indices[writeIdx++] = i + 2;
      }
    }
    grassCount = writeIdx;

    for (let i = 0; i < totalVerts; i += 3) {
      if (
        !(
          pos.getZ(i) >= isletHeight - 0.08 &&
          pos.getZ(i + 1) >= isletHeight - 0.08 &&
          pos.getZ(i + 2) >= isletHeight - 0.08
        )
      ) {
        indices[writeIdx++] = i;
        indices[writeIdx++] = i + 1;
        indices[writeIdx++] = i + 2;
      }
    }
    const cliffCount = totalVerts - grassCount;

    isletGeo.setIndex(new THREE.BufferAttribute(indices, 1));
    isletGeo.clearGroups();
    isletGeo.addGroup(0, grassCount, 0);
    isletGeo.addGroup(grassCount, cliffCount, 1);

    const mesh = new THREE.Mesh(isletGeo, [lawnTurfMat, cliffMat]);
    mesh.name = "terrace-companion-islet";
    mesh.userData.isTerrain = true;
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(cx, topY - isletHeight, cz);
    mesh.rotation.y = rotationY;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    // Weathered boulder feature on islet plateau
    const rockGeo = new THREE.DodecahedronGeometry(baseRadius * 0.22, 1);
    const rockMesh = new THREE.Mesh(rockGeo, cliffMat);
    rockMesh.name = "pebble-islet-boulder";
    rockMesh.position.set(cx + baseRadius * 0.22, topY + 0.08, cz - baseRadius * 0.18);
    rockMesh.scale.set(1.1, 0.7, 0.9);
    rockMesh.receiveShadow = true;
    this.scene.add(rockMesh);

    // Stylized botanical shrub cluster on plateau
    const foliageMat = new THREE.MeshStandardMaterial({
      color: 0x325824,
      roughness: 0.82,
      flatShading: true,
    });
    const foliage = new THREE.Mesh(new THREE.IcosahedronGeometry(baseRadius * 0.26, 1), foliageMat);
    foliage.position.set(cx - baseRadius * 0.28, topY + baseRadius * 0.22, cz + baseRadius * 0.12);
    foliage.scale.set(1.2, 0.85, 1.1);
    foliage.castShadow = true;
    this.scene.add(foliage);
  }

  /**
   * Registers any custom structure, building, plinth, or signage into the exclusion registry.
   */
  public registerStructure(object: THREE.Object3D, margin = 0.35, id?: string) {
    this.terrainEngine.registerStructure(object, margin, id);
  }

  // ── 3D VOLUMETRIC FRESH-CUT LAWN BLADE TUFTS (Smart Structure-Aware Grass System) ──
  // ── 3D VOLUMETRIC FRESH-CUT LAWN BLADE TUFTS (Brush-Bristle Landscape Topography) ──
  public generateVolumetricLawnGrass() {
    const registry = this.terrainEngine.exclusionRegistry;

    // Scan active scene to automatically index all buildings, plinths, and signage
    registry.scanAndRegisterScene(this.scene);

    const instances: GrassInstance[] = [];

    // Prevailing brush stroke vector aligned with world wind flow
    const strokeBaseAngle = Math.atan2(0.54, 0.82);

    // Island bounding domain: covers the full 100m scaled island
    // minX = -58, maxX = 50, minZ = -78, maxZ = 39
    // Calibrated grid step ensuring high-density visual lushness within a strict 60 FPS GPU budget
    const minX = -58;
    const maxX = 50;
    const minZ = -78;
    const maxZ = 39;
    const gridStep = 1.35;

    for (let gx = minX; gx <= maxX; gx += gridStep) {
      for (let gz = minZ; gz <= maxZ; gz += gridStep) {
        // Natural jitter within cell
        const jx = gx + (this.rand() - 0.5) * (gridStep * 0.75);
        const jz = gz + (this.rand() - 0.5) * (gridStep * 0.75);

        // Smart check: must be safely inside the island plateau AND completely clear of all structures
        // Planting reaches the lip (the registry's perimeter), so the lawn rolls
        // over the shoulder instead of stopping short of a bare edge.
        const groundY = this.surfaceY(jx, jz);
        if (groundY === null || !registry.isPlantable(jx, jz, 0.35)) {
          continue;
        }

        const distToPerimeter = registry.getDistanceToPerimeter(jx, jz);
        const isRim = distToPerimeter < 3.2;
        const isNearStruct = registry.isNearStructure(jx, jz, 1.35);
        const isSouthLawn = jz >= 10.0 && jz <= 36.0 && jx >= -24.0 && jx <= 24.0;

        // Probability of vegetation: higher in lush south meadow
        const prob = isSouthLawn ? 0.95 : (isRim ? 0.85 : 0.80);

        if (this.rand() < prob) {
          let heightScale: number;
          let widthScale: number;
          let leanAngle: number;
          let leanDir: number;

          if (isRim) {
            // 1. Coastal Rim / Cliff Edge: outward brush stroke flick over the void
            const outwardAngle = Math.atan2(jz - (-18), jx);
            leanDir = outwardAngle + (this.rand() - 0.5) * 0.25;
            leanAngle = 0.18 + (1.0 - distToPerimeter / 3.2) * 0.18;
            heightScale = 1.15 + this.rand() * 0.35;
            widthScale = 0.95 + this.rand() * 0.18;
          } else if (isNearStruct) {
            // 2. Heavy Pressure / Manicured Trim: neat upright cropped bristle collar
            leanDir = this.rand() * Math.PI * 2;
            leanAngle = 0.03 + this.rand() * 0.04;
            heightScale = 0.68 + this.rand() * 0.18;
            widthScale = 0.82 + this.rand() * 0.12;
          } else if (isSouthLawn) {
            // 3. Light Feather Stroke / Tall South Meadow: tall wild brush with feathery wheat plume seedheads
            const meadowT = Math.sin(((jz - 10.0) / 26.0) * Math.PI);
            heightScale = 1.30 + meadowT * 0.45 + this.rand() * 0.25; // 55cm to 75cm meadow brush
            widthScale = 0.98 + this.rand() * 0.15; // Slender decorrelated girth
            leanAngle = 0.12 + this.rand() * 0.10;
            leanDir = strokeBaseAngle + (this.rand() - 0.5) * 0.35;
          } else {
            // 4. Undulating Lawn Waves: harmonic rolling brush strokes across central courtyards
            const wave =
              Math.sin(jx * 0.18 + jz * 0.12) * 0.16 +
              Math.cos(jx * 0.09 - jz * 0.15) * 0.12;
            heightScale = 0.95 + wave + (this.rand() - 0.5) * 0.14;
            widthScale = 0.92 + this.rand() * 0.18;
            leanAngle = 0.06 + this.rand() * 0.08;
            leanDir =
              strokeBaseAngle +
              Math.sin(jx * 0.12 + jz * 0.12) * 0.35 +
              (this.rand() - 0.5) * 0.25;
          }

          instances.push({
            x: jx,
            y: groundY,
            z: jz,
            scale: 1.18,
            heightScale,
            widthScale,
            leanAngle,
            leanDir,
          });

          // Organic companion micro-bristle cluster nestled along stroke direction
          if (this.rand() < 0.36) {
            const companionAngle = leanDir + (this.rand() - 0.5) * 0.8;
            const companionDist = 0.24 + this.rand() * 0.32;
            const cx = jx + Math.cos(companionAngle) * companionDist;
            const cz = jz + Math.sin(companionAngle) * companionDist;
            const companionY = this.surfaceY(cx, cz);
            if (companionY !== null && registry.isPlantable(cx, cz, 0.35)) {
              instances.push({
                x: cx,
                y: companionY,
                z: cz,
                scale: 1.18,
                heightScale: heightScale * (0.68 + this.rand() * 0.18),
                widthScale: widthScale * 0.80,
                leanAngle: leanAngle * (0.90 + this.rand() * 0.20),
                leanDir,
              });
            }
          }
        }
      }
    }

    // Companion sky islets: wind-sculpted radial islet brush at their true elevations (-8.5 and -10.0)
    const islets = [
      { x: COMPANION_ISLET_CENTERS[0].x, z: COMPANION_ISLET_CENTERS[0].z, y: -8.5, r: 3.8 },
      { x: COMPANION_ISLET_CENTERS[1].x, z: COMPANION_ISLET_CENTERS[1].z, y: -10.0, r: 3.4 },
    ];
    for (const islet of islets) {
      for (let ix = -islet.r; ix <= islet.r; ix += 0.85) {
        for (let iz = -islet.r; iz <= islet.r; iz += 0.85) {
          const d = Math.hypot(ix, iz);
          if (d <= islet.r - 0.4 && this.rand() < 0.78) {
            const px = islet.x + ix + (this.rand() - 0.5) * 0.3;
            const pz = islet.z + iz + (this.rand() - 0.5) * 0.3;
            const rimF = d / islet.r;
            const outwardAngle = Math.atan2(iz, ix);
            const isletLean = 0.08 + rimF * 0.22;
            const isletDir = outwardAngle + (this.rand() - 0.5) * 0.25;
            const isletH = 0.85 + rimF * 0.40 + this.rand() * 0.25;
            const isletW = 0.80 + this.rand() * 0.20;
            instances.push({
              x: px,
              y: islet.y,
              z: pz,
              scale: 1.0,
              heightScale: isletH,
              widthScale: isletW,
              leanAngle: isletLean,
              leanDir: isletDir,
            });
          }
        }
      }
    }

    this.terrainEngine.initVolumetricGrass(this.scene, instances);
  }
}



export interface WorldObjects {
  scene: THREE.Object3D;
  interactiveMeshes: Map<THREE.Mesh, StudioObjectId>;
  stationPins: Map<StudioObjectId, THREE.Group>;
  serverLeds: THREE.Mesh[];
  floorTags: Map<StudioObjectId, THREE.Group>;
  darknessOverlays?: Map<StudioObjectId, THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>>;
  lightControls: Map<StudioLightId, ControlledLightFixture[]>;
  setLightState: (id: StudioLightId, isOn: boolean) => void;
  getLightState: (id: StudioLightId) => boolean;
  updateLighting?: (deltaSeconds: number) => void;
  updateWater?: (time: number, delta: number) => void;
  updateGrassLod?: (eye: THREE.Vector3, farDistance: number, cullDistance: number) => void;
  updateKitchenMarker?: (text: string | null, type?: "run" | "out") => void;
  togglePowerPlantArc?: () => boolean;
  isPowerPlantArcActive?: () => boolean;
  setPowerPlantLevel?: (kw: number) => void;
  getPowerPlantLevel?: () => number;
  toggleScientificUpgrade?: () => boolean;
  isScientificUpgraded?: () => boolean;
}

export type StudioLightCircuitId =
  | "command-desk"
  | "engineering-desk"
  | "intelligence-desk"
  | "implementation-desk"
  | "legal-desk"
  | "ambassador-desk"
  | "talent-desk"
  | "venture-wall"
  | "boardroom"
  | "lounge"
  | "break-room"
  | "advanced-tech-lab"
  | "outside";

export type StudioLightId = StudioLightCircuitId;

export interface ControlledLightFixture {
  group: THREE.Group;
  bulb: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  light: THREE.Light;
  floorPool?: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  floorPoolBaseOpacity?: number;
  onColor?: THREE.Color;
  offColor?: THREE.Color;
  onEmissive?: THREE.Color;
  offEmissive?: THREE.Color;
  onIntensity?: number;
  onEmissiveIntensity?: number;
}

/**
 * Option A: Seamless Honed Architectural Limestone & Fine Sand Terrazzo.
 * Monolithic, calm, and grounded foundation:
 * - Subtle tone-on-tone ivory-sand and dove limestone contour transitions
 * - Delicate champagne-bronze dividing strip lines
 * - Over 16,000 fine multi-tonal micro-aggregate chips
 * - Tactile micro-relief bump map with satin architectural finish
 */
function createCurvilinearTerrazzoTexture(): { diffuse: THREE.CanvasTexture; bump: THREE.CanvasTexture } {
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  const bumpCanvas = document.createElement("canvas");
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bctx = bumpCanvas.getContext("2d")!;

  // Neutral mid-grey for bump map base
  bctx.fillStyle = "#808080";
  bctx.fillRect(0, 0, size, size);

  // 1. Primary Field: Warm Honed Limestone Matrix (Japandi Option A)
  ctx.fillStyle = "#ece8e1";
  ctx.fillRect(0, 0, size, size);

  // 2. Very Subtle, Low-Contrast Tonal Curves (Tone-on-tone ivory and dune stone)
  interface WaveBand {
    fill: string | CanvasGradient;
    path: (c: CanvasRenderingContext2D) => void;
  }

  // Band 1: Warm Ivory Limestone (delicate tonal highlight)
  const ivoryGrad = ctx.createLinearGradient(0, size, size * 0.8, 0);
  ivoryGrad.addColorStop(0, "#f4f2ec");
  ivoryGrad.addColorStop(0.5, "#f1eee7");
  ivoryGrad.addColorStop(1, "#f5f3ee");

  // Band 2: Soft Sand Limestone
  const sandGrad = ctx.createLinearGradient(size * 0.2, size, size, size * 0.2);
  sandGrad.addColorStop(0, "#eae6de");
  sandGrad.addColorStop(0.5, "#ece8e0");
  sandGrad.addColorStop(1, "#e6e2d9");

  // Band 3: Warm Dove Stone
  const doveGrad = ctx.createLinearGradient(0, size * 0.5, size, size * 0.5);
  doveGrad.addColorStop(0, "#e2ded6");
  doveGrad.addColorStop(0.5, "#dfdbd3");
  doveGrad.addColorStop(1, "#e4e0d8");

  // Band 4: Delicate River Pebble Accent
  const pebbleGrad = ctx.createLinearGradient(size * 0.1, 0, size, size * 0.9);
  pebbleGrad.addColorStop(0, "#dad5cb");
  pebbleGrad.addColorStop(1, "#ded9cf");

  const ribbons: WaveBand[] = [
    // Ribbon A: Sweeping gentle curve through the lower pavilion
    {
      fill: ivoryGrad,
      path: (c) => {
        c.beginPath();
        c.moveTo(0, size * 0.62);
        c.bezierCurveTo(size * 0.25, size * 0.45, size * 0.55, size * 0.78, size * 0.85, size * 0.42);
        c.bezierCurveTo(size * 0.95, size * 0.30, size * 1.0, size * 0.22, size, size * 0.18);
        c.lineTo(size, size * 0.46);
        c.bezierCurveTo(size * 0.88, size * 0.58, size * 0.72, size * 0.96, size * 0.38, size * 0.92);
        c.bezierCurveTo(size * 0.18, size * 0.90, size * 0.05, size * 0.82, 0, size * 0.78);
        c.closePath();
      },
    },
    // Ribbon B: Subtle dove stone flowing band
    {
      fill: doveGrad,
      path: (c) => {
        c.beginPath();
        c.moveTo(0, size * 0.32);
        c.bezierCurveTo(size * 0.28, size * 0.22, size * 0.48, size * 0.52, size * 0.72, size * 0.28);
        c.bezierCurveTo(size * 0.85, size * 0.15, size * 0.92, size * 0.08, size, 0);
        c.lineTo(size, size * 0.18);
        c.bezierCurveTo(size * 0.95, size * 0.22, size * 0.85, size * 0.30, size * 0.85, size * 0.42);
        c.bezierCurveTo(size * 0.55, size * 0.78, size * 0.25, size * 0.45, 0, size * 0.62);
        c.closePath();
      },
    },
    // Ribbon C: Dune sand contour band looping through the center
    {
      fill: sandGrad,
      path: (c) => {
        c.beginPath();
        c.moveTo(size * 0.15, 0);
        c.bezierCurveTo(size * 0.35, size * 0.18, size * 0.42, size * 0.32, size * 0.68, size * 0.18);
        c.bezierCurveTo(size * 0.82, size * 0.10, size * 0.92, size * 0.04, size, 0);
        c.lineTo(size * 0.72, size * 0.28);
        c.bezierCurveTo(size * 0.48, size * 0.52, size * 0.28, size * 0.22, 0, size * 0.32);
        c.lineTo(0, 0);
        c.closePath();
      },
    },
    // Ribbon D: Soft pebble accent ribbon in the upper quadrant
    {
      fill: pebbleGrad,
      path: (c) => {
        c.beginPath();
        c.moveTo(0, size * 0.12);
        c.bezierCurveTo(size * 0.20, size * 0.04, size * 0.38, size * 0.24, size * 0.58, size * 0.10);
        c.bezierCurveTo(size * 0.70, 0, size * 0.80, 0, size * 0.85, 0);
        c.lineTo(size * 0.15, 0);
        c.closePath();
      },
    },
    // Ribbon E: Warm ivory contour in lower-right
    {
      fill: ivoryGrad,
      path: (c) => {
        c.beginPath();
        c.moveTo(size * 0.45, size);
        c.bezierCurveTo(size * 0.60, size * 0.82, size * 0.80, size * 0.75, size, size * 0.72);
        c.lineTo(size, size);
        c.closePath();
      },
    },
  ];

  // Render low-contrast ribbons with fine champagne bronze delimiter lines
  ribbons.forEach(({ fill, path }) => {
    ctx.fillStyle = fill;
    path(ctx);
    ctx.fill();

    // Delicate Champagne Bronze architectural dividing strip
    ctx.strokeStyle = "rgba(175, 155, 125, 0.40)";
    ctx.lineWidth = 1.4;
    path(ctx);
    ctx.stroke();

    // Soft bevel highlight
    ctx.strokeStyle = "rgba(255, 255, 255, 0.30)";
    ctx.lineWidth = 0.8;
    path(ctx);
    ctx.stroke();

    // Bump map: gentle recessed groove
    bctx.strokeStyle = "#707070";
    bctx.lineWidth = 2.0;
    path(bctx);
    bctx.stroke();
  });

  // 3. Dense Multi-Tonal Fine Terrazzo Aggregate Chips (Calcite, Quartz, Amber Sand, River Stone)
  let seed = 51731;
  const prng = () => {
    seed = (seed * 16807 + 11) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  const chipColors = [
    { fill: "rgba(255, 255, 255, 0.85)", bump: "#949494" }, // Calcite white
    { fill: "rgba(245, 243, 238, 0.80)", bump: "#909090" }, // Pearl marble
    { fill: "rgba(215, 195, 170, 0.65)", bump: "#888888" }, // Warm honey quartz
    { fill: "rgba(195, 175, 150, 0.60)", bump: "#848484" }, // Amber sand
    { fill: "rgba(170, 162, 152, 0.55)", bump: "#828282" }, // Soft river pebble
    { fill: "rgba(135, 128, 120, 0.35)", bump: "#767676" }, // Delicate grey basalt fleck
    { fill: "rgba(235, 230, 222, 0.80)", bump: "#8e8e8e" }, // Honed limestone
  ];

  const totalChips = 3200;
  for (let i = 0; i < totalChips; i++) {
    const cx = prng() * size;
    const cy = prng() * size;
    const radius = 0.6 + prng() * 1.8;
    const color = chipColors[Math.floor(prng() * chipColors.length)];
    const sz = radius * 1.4;

    ctx.fillStyle = color.fill;
    ctx.fillRect(cx, cy, sz, sz);

    bctx.fillStyle = color.bump;
    bctx.fillRect(cx, cy, sz, sz);
  }

  const diffuse = new THREE.CanvasTexture(canvas);
  diffuse.colorSpace = THREE.SRGBColorSpace;
  diffuse.wrapS = THREE.RepeatWrapping;
  diffuse.wrapT = THREE.RepeatWrapping;
  diffuse.repeat.set(1.5, 1.5);
  diffuse.anisotropy = 16;
  diffuse.generateMipmaps = true;
  diffuse.minFilter = THREE.LinearMipmapLinearFilter;
  diffuse.magFilter = THREE.LinearFilter;

  const bump = new THREE.CanvasTexture(bumpCanvas);
  bump.wrapS = THREE.RepeatWrapping;
  bump.wrapT = THREE.RepeatWrapping;
  bump.repeat.set(1.5, 1.5);
  bump.anisotropy = 8;
  bump.generateMipmaps = true;
  bump.minFilter = THREE.LinearMipmapLinearFilter;
  bump.magFilter = THREE.LinearFilter;

  return { diffuse, bump };
}

/**
 * Procedural Honed Basalt / Dark Engineered Slate Texture (Option 1):
 * Deep volcanic charcoal/slate matrix with staggered rectangular architectural flagstones,
 * subtle tone variations per paver, and recessed precision grout lines.
 */
function createHonedBasaltTexture(): { diffuse: THREE.CanvasTexture; bump: THREE.CanvasTexture } {
  if (typeof document === "undefined") {
    const dummy = new THREE.DataTexture(new Uint8Array([20, 26, 34, 255]), 1, 1);
    dummy.needsUpdate = true;
    return { diffuse: dummy as unknown as THREE.CanvasTexture, bump: dummy as unknown as THREE.CanvasTexture };
  }
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  const bumpCanvas = document.createElement("canvas");
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bctx = bumpCanvas.getContext("2d")!;

  // Base deep charcoal
  ctx.fillStyle = "#121720";
  ctx.fillRect(0, 0, size, size);

  bctx.fillStyle = "#808080";
  bctx.fillRect(0, 0, size, size);

  // Large-format engineered slate flagstones (4 cols x 6 rows)
  const cols = 4;
  const rows = 6;
  const tileW = size / cols;
  const tileH = size / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * tileW;
      const y = r * tileH;
      const offsetX = (r % 2 === 1) ? tileW * 0.5 : 0;
      const finalX = (x + offsetX) % size;

      const toneOffset = ((r * 11 + c * 17) % 7) - 3;
      const rV = 22 + toneOffset;
      const gV = 28 + toneOffset;
      const bV = 36 + toneOffset;

      ctx.fillStyle = `rgb(${rV}, ${gV}, ${bV})`;
      ctx.fillRect(finalX + 2, y + 2, tileW - 4, tileH - 4);

      // Micro slate grain
      ctx.fillStyle = "rgba(255, 255, 255, 0.02)";
      ctx.fillRect(finalX + 4, y + 4, tileW - 8, (tileH - 8) * 0.45);

      // Bump map relief
      bctx.fillStyle = "#8c8c8c";
      bctx.fillRect(finalX + 2, y + 2, tileW - 4, tileH - 4);

      // Recessed dark grout joint
      bctx.fillStyle = "#555555";
      bctx.strokeRect(finalX + 1, y + 1, tileW - 2, tileH - 2);

      ctx.strokeStyle = "#0d1219";
      ctx.lineWidth = 3;
      ctx.strokeRect(finalX + 1, y + 1, tileW - 2, tileH - 2);
    }
  }

  const diffuse = new THREE.CanvasTexture(canvas);
  diffuse.colorSpace = THREE.SRGBColorSpace;
  diffuse.wrapS = THREE.RepeatWrapping;
  diffuse.wrapT = THREE.RepeatWrapping;
  diffuse.repeat.set(2, 2);
  diffuse.anisotropy = 16;
  diffuse.generateMipmaps = true;

  const bump = new THREE.CanvasTexture(bumpCanvas);
  bump.wrapS = THREE.RepeatWrapping;
  bump.wrapT = THREE.RepeatWrapping;
  bump.repeat.set(2, 2);
  bump.anisotropy = 8;
  bump.generateMipmaps = true;

  return { diffuse, bump };
}

/**
 * Architectural Contract Wool Carpet Texture:
 * Muted brand heather-slate with tactile loop-pile ribbed corduroy weave and cross-grain stippling.
 * Designed with low saturation and high roughness (0.94) to eliminate any resemblance to water.
 */
function createArchitecturalCarpetTexture(): { diffuse: THREE.CanvasTexture; bump: THREE.CanvasTexture } {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  const bumpCanvas = document.createElement("canvas");
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bctx = bumpCanvas.getContext("2d")!;

  // 1. Base muted architectural brand slate with subtle navy/heather undertone
  ctx.fillStyle = "#323c46";
  ctx.fillRect(0, 0, size, size);

  bctx.fillStyle = "#808080";
  bctx.fillRect(0, 0, size, size);

  // 2. Loop-pile ribbed corduroy weave texture
  const ribStep = 8;
  for (let y = 0; y < size; y += ribStep) {
    ctx.fillStyle = y % 16 === 0 ? "#3b4754" : "#2d3742";
    ctx.fillRect(0, y, size, ribStep / 2);

    bctx.fillStyle = y % 16 === 0 ? "#9c9c9c" : "#686868";
    bctx.fillRect(0, y, size, ribStep / 2);
  }

  ctx.fillStyle = "rgba(230, 235, 245, 0.08)";
  for (let i = 0; i < 1500; i++) {
    ctx.fillRect(Math.floor(rand() * size), Math.floor(rand() * size), 2, 2);
  }

  bctx.fillStyle = "#949494";
  for (let i = 0; i < 750; i++) {
    bctx.fillRect(Math.floor(rand() * size), Math.floor(rand() * size), 1, 1);
  }
  bctx.fillStyle = "#6c6c6c";
  for (let i = 0; i < 750; i++) {
    bctx.fillRect(Math.floor(rand() * size), Math.floor(rand() * size), 1, 1);
  }

  const diffuse = new THREE.CanvasTexture(canvas);
  diffuse.wrapS = THREE.RepeatWrapping;
  diffuse.wrapT = THREE.RepeatWrapping;
  diffuse.repeat.set(6, 6);
  diffuse.anisotropy = 4;

  const bump = new THREE.CanvasTexture(bumpCanvas);
  bump.wrapS = THREE.RepeatWrapping;
  bump.wrapT = THREE.RepeatWrapping;
  bump.repeat.set(6, 6);
  bump.anisotropy = 4;

  return { diffuse, bump };
}

/**
 * Builds the studio island into `scene`. Atmosphere, sky, fog, clouds and the
 * sun belong to ORRA (AGENTS.md 8.12.1); this only contributes the island,
 * its architecture and the room light fixtures.
 */
export function buildStudioWorld(scene: THREE.Object3D): WorldObjects {
  const interactiveMeshes = new Map<THREE.Mesh, StudioObjectId>();
  const stationPins = new Map<StudioObjectId, THREE.Group>();
  const floorTags = new Map<StudioObjectId, THREE.Group>();
  const darknessOverlays = new Map<
    StudioObjectId,
    THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>
  >();
  const lightControls = new Map<StudioLightId, ControlledLightFixture[]>();
  const lightStates = new Map<StudioLightId, boolean>();

  const registerLightFixture = (id: StudioLightId, fixture: ControlledLightFixture) => {
    const fixtures = lightControls.get(id) ?? [];
    fixtures.push(fixture);
    lightControls.set(id, fixtures);
    lightStates.set(id, true);
  };

  const setLightState = (id: StudioLightId, isOn: boolean) => {
    lightStates.set(id, isOn);
  };

  const getLightState = (id: StudioLightId) => lightStates.get(id) ?? false;

  const defaultBulbOnColor = new THREE.Color(0xfff1c7);
  const defaultBulbOffColor = new THREE.Color(0x22201e);
  const defaultBulbOnEmissive = new THREE.Color(0xffc86a);
  const defaultBulbOffEmissive = new THREE.Color(0x000000);

  const updateLighting = (deltaSeconds: number) => {
    const blend = 1 - Math.exp(-Math.max(0, deltaSeconds) * 8.5);

    lightControls.forEach((fixtures, id) => {
      const isOn = lightStates.get(id) ?? true;
      fixtures.forEach((fixture) => {
        const baseIntensity = Number(
          fixture.onIntensity ?? fixture.light.userData.onIntensity ?? 3.8
        );
        // Calibrated interior illumination for soft architectural elegance
        const targetIntensity = isOn ? baseIntensity * 0.52 : 0;
        fixture.light.intensity = THREE.MathUtils.lerp(
          fixture.light.intensity,
          targetIntensity,
          blend
        );

        const targetColor = isOn
          ? (fixture.onColor ?? defaultBulbOnColor)
          : (fixture.offColor ?? defaultBulbOffColor);
        const targetEmissive = isOn
          ? (fixture.onEmissive ?? defaultBulbOnEmissive)
          : (fixture.offEmissive ?? defaultBulbOffEmissive);
        const baseEmissiveIntensity = (fixture.onEmissiveIntensity ?? 1.85) * 0.60;
        const targetEmissiveIntensity = isOn ? baseEmissiveIntensity : 0;

        fixture.bulb.material.color.lerp(targetColor, blend);
        fixture.bulb.material.emissive.lerp(targetEmissive, blend);
        fixture.bulb.material.emissiveIntensity = THREE.MathUtils.lerp(
          fixture.bulb.material.emissiveIntensity,
          targetEmissiveIntensity,
          blend
        );

        if (fixture.floorPool) {
          const basePoolOpacity = (fixture.floorPoolBaseOpacity ?? 0.65) * 0.45;
          const targetPoolOpacity = isOn ? basePoolOpacity : 0;
          fixture.floorPool.material.opacity = THREE.MathUtils.lerp(
            fixture.floorPool.material.opacity,
            targetPoolOpacity,
            blend
          );
          fixture.floorPool.visible = fixture.floorPool.material.opacity > 0.003;
        }
      });
    });
  };
  const serverLeds: THREE.Mesh[] = [];
  const ambientUpdaters: Array<(time: number, delta: number) => void> = [];

  // ── High-Fidelity Materials: Option A "Nordic Japandi & Eco-Atelier" ──
  const { diffuse: terrazzoDiffuse, bump: terrazzoBump } = createCurvilinearTerrazzoTexture();
  const terrazzoFloorMat = new THREE.MeshStandardMaterial({
    map: terrazzoDiffuse,
    bumpMap: terrazzoBump,
    bumpScale: 0.006,
    color: 0xffffff,
    roughness: 0.36, // Calm satin honed limestone finish
    metalness: 0.02,
  });

  // Honed Basalt / Dark Engineered Slate for the Advanced Tech Lab (Option 1)
  const { diffuse: basaltDiffuse, bump: basaltBump } = createHonedBasaltTexture();
  const honedBasaltFloorMat = new THREE.MeshStandardMaterial({
    map: basaltDiffuse,
    bumpMap: basaltBump,
    bumpScale: 0.008,
    color: 0xffffff,
    roughness: 0.70, // Matte honed volcanic basalt finish
    metalness: 0.12,
  });

  // Champagne Bronze Anodized Metal for Cap & Base Rails
  const champagneBronzeMat = new THREE.MeshStandardMaterial({
    color: 0x8a7b6e,
    metalness: 0.55,
    roughness: 0.28,
  });

  // Natural Scandinavian White Oak
  const oakWoodMat = new THREE.MeshStandardMaterial({
    color: 0xd2b48c,
    roughness: 0.48,
    metalness: 0.02,
  });

  const walnutMat = new THREE.MeshStandardMaterial({
    color: 0x7c583a,
    roughness: 0.52,
    metalness: 0.04,
  });

  const deskBlotterMat = new THREE.MeshStandardMaterial({
    color: 0x2a2826,
    roughness: 0.95,
  });

  // Saddle leather reserved for executive boardroom seating and tabletop folios.
  const executiveLeatherMat = new THREE.MeshStandardMaterial({
    color: 0x34261f,
    roughness: 0.62,
    metalness: 0.04,
  });

  const castStoneMat = new THREE.MeshStandardMaterial({
    color: 0xe6e3dc,
    roughness: 0.50,
    metalness: 0.02,
  });

  const aluminumMat = new THREE.MeshStandardMaterial({
    color: 0xc8c6c2,
    metalness: 0.88,
    roughness: 0.20,
  });

  // Ultra-Clear Low-Iron Acoustic Glass with subtle neutral warmth (transmission-free for 60fps GPU performance)
  const smokedGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0xe8e4dc,
    transparent: true,
    opacity: 0.28,
    roughness: 0.06,
    metalness: 0.05,
    clearcoat: 0.9,
    clearcoatRoughness: 0.05,
    depthWrite: false,
  });

  // Perimeter Shell Glass: translucent boundary
  const shellGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0xe2ded7,
    transparent: true,
    opacity: 0.25,
    roughness: 0.05,
    metalness: 0.02,
    clearcoat: 0.8,
    clearcoatRoughness: 0.05,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const slatTimberMat = new THREE.MeshStandardMaterial({
    color: 0xc8a478,
    roughness: 0.58,
  });

  // ── Eco-Plant Materials (Derived from Reference Image media_1789313363968.jpg) ──
  // Warm lime/spring highlights for upper canopy crests
  const foliageLimeMat = new THREE.MeshStandardMaterial({
    color: 0x8cbd42,
    roughness: 0.88,
  });

  // Deep moss/olive forest for core and under-canopy
  const foliageMossMat = new THREE.MeshStandardMaterial({
    color: 0x486b2d,
    roughness: 0.90,
  });

  // Sage evergreen for layered architectural pine
  const foliageEvergreenMat = new THREE.MeshStandardMaterial({
    color: 0x385536,
    roughness: 0.88,
  });

  // Sculpted organic timber bark
  const treeBarkMat = new THREE.MeshStandardMaterial({
    color: 0x6e4a2d,
    roughness: 0.78,
    metalness: 0.02,
  });

  // Soft moss ground ring
  const mossPedestalMat = new THREE.MeshStandardMaterial({
    color: 0x517332,
    roughness: 0.95,
  });

  // Minimalist ceramic dish
  const potStoneMat = new THREE.MeshStandardMaterial({
    color: 0xd8d4cc,
    roughness: 0.65,
  });

  const monitorBezelMat = new THREE.MeshStandardMaterial({
    color: 0x2e2c2a,
    metalness: 0.75,
    roughness: 0.32,
  });

  const hitBoxMat = new THREE.MeshBasicMaterial({ visible: false });

  // ── Unified Architectural Palette (Aman Resort x PE Boardroom x Advanced Lab) ──
  const pebbleBasaltMat = new THREE.MeshStandardMaterial({
    color: 0x1c1d1f, // Tumbled matte charcoal river basalt
    roughness: 0.94,
    metalness: 0.04,
  });

  const flamedGraniteMat = new THREE.MeshStandardMaterial({
    color: 0x2e3034, // Honed Nordic flamed granite
    roughness: 0.85,
    metalness: 0.12,
  });

  const fumedOakSlatMat = new THREE.MeshStandardMaterial({
    color: 0x241d18, // Deep fumed Japanese oak
    roughness: 0.76,
    metalness: 0.05,
  });

  const basaltPlinthMat = new THREE.MeshStandardMaterial({
    color: 0x161719, // Monolithic black basalt
    roughness: 0.88,
    metalness: 0.08,
  });

  const telemetryGlowMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8, // Ambient cyan telemetry line
  });

  const inGroundBronzeMat = new THREE.MeshStandardMaterial({
    color: 0x2e2924,
    roughness: 0.50,
    metalness: 0.75,
  });

  const inGroundLensMat = new THREE.MeshBasicMaterial({
    color: 0xffedd5,
    transparent: true,
    opacity: 0.85,
  });

  // ── Kitchen & Break Amenities Materials ──
  const kitchenCabinetMat = new THREE.MeshStandardMaterial({
    color: 0x222428,
    roughness: 0.68,
    metalness: 0.08,
  });

  const quartzCountertopMat = new THREE.MeshStandardMaterial({
    color: 0xf5f3ee,
    roughness: 0.28,
    metalness: 0.04,
  });

  const samsungSteelMat = new THREE.MeshStandardMaterial({
    color: 0x1f2125,
    roughness: 0.32,
    metalness: 0.88,
  });

  const familyHubScreenMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
  });

  const chromeTrimMat = new THREE.MeshStandardMaterial({
    color: 0xeeeeee,
    roughness: 0.12,
    metalness: 0.96,
  });

  const microwaveGlassMat = new THREE.MeshStandardMaterial({
    color: 0x111317,
    roughness: 0.15,
    metalness: 0.50,
  });

  const digitalClockLedMat = new THREE.MeshBasicMaterial({
    color: 0x4ade80,
  });

  const ceramicMugSageMat = new THREE.MeshStandardMaterial({
    color: 0x5a7862,
    roughness: 0.40,
  });

  const ceramicMugTerracottaMat = new THREE.MeshStandardMaterial({
    color: 0xb4533c,
    roughness: 0.42,
  });

  const ceramicMugCreamMat = new THREE.MeshStandardMaterial({
    color: 0xf3ede2,
    roughness: 0.35,
  });

  const waterDispenserTowerMat = new THREE.MeshStandardMaterial({
    color: 0x2c2f35,
    roughness: 0.30,
    metalness: 0.72,
  });

  const ledHotMat = new THREE.MeshBasicMaterial({
    color: 0xef4444,
  });

  const ledColdMat = new THREE.MeshBasicMaterial({
    color: 0x3b82f6,
  });

  const pendantLightWarmGlow = new THREE.MeshBasicMaterial({
    color: 0xffedd5,
  });

  // ── Photorealistic Luminous Floor Light Pool Generator ──
  // Soft, radial additive floor luminance pool beneath fixtures
  // that provides immediate, dramatic visual feedback on the 3D model
  const floorPoolCanvas = document.createElement("canvas");
  floorPoolCanvas.width = 512;
  floorPoolCanvas.height = 512;
  const fpCtx = floorPoolCanvas.getContext("2d")!;
  const fpCenter = 256;
  const fpRad = 256;
  const fpGrad = fpCtx.createRadialGradient(fpCenter, fpCenter, 0, fpCenter, fpCenter, fpRad);
  fpGrad.addColorStop(0, "rgba(255, 244, 220, 0.95)");
  fpGrad.addColorStop(0.20, "rgba(255, 230, 185, 0.72)");
  fpGrad.addColorStop(0.48, "rgba(255, 210, 145, 0.35)");
  fpGrad.addColorStop(0.75, "rgba(255, 190, 110, 0.09)");
  fpGrad.addColorStop(1, "rgba(255, 180, 80, 0)");
  fpCtx.fillStyle = fpGrad;
  fpCtx.fillRect(0, 0, 512, 512);

  const floorPoolTexture = new THREE.CanvasTexture(floorPoolCanvas);
  floorPoolTexture.wrapS = THREE.ClampToEdgeWrapping;
  floorPoolTexture.wrapT = THREE.ClampToEdgeWrapping;

  const createFloorPool = (
    radius: number,
    baseOpacity = 0.65,
    scaleX = 1.0,
    scaleZ = 1.0
  ): THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> => {
    const mat = new THREE.MeshBasicMaterial({
      map: floorPoolTexture,
      transparent: true,
      opacity: baseOpacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(radius * 2, radius * 2),
      mat
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.scale.set(scaleX, scaleZ, 1);
    mesh.position.y = 0.024;
    return mesh;
  };

  // ── Architectural Lighting Fixtures Tailored by Zone ─────────────────────
  // Distinct lighting topologies reflecting functional character & Kelvin warmth:
  // 1. Boardroom: Linear architectural suspension fixture spanning the table (2700K Warm)
  // 2. Tech Core (MLOps, Data, Implementation): Recessed dual-gimbal track troffers (3500K Focus)
  // 3. Executive & Advisory (Command, Legal, Ambassador, Talent): Spun bronze cone pendants (2700K)
  // 4. Lounge & Atelier Kitchen: Sculptural multi-drop frosted glass orb clusters (2400K Amber)
  // 5. Venture Gallery: Linear wall-wash grazing fixture (2400K Amber)

  // 1. Boardroom Linear Suspension Chandelier
  const createBoardroomLinearPendant = (id: StudioLightId, x: number, z: number) => {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // Dual ceiling canopies
    [-1.05, 1.05].forEach((offsetX) => {
      const canopy = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 0.03, 16),
        champagneBronzeMat
      );
      canopy.position.set(offsetX, 3.22, 0);
      group.add(canopy);

      const cable = new THREE.Mesh(
        new THREE.CylinderGeometry(0.005, 0.005, 0.40, 8),
        monitorBezelMat
      );
      cable.position.set(offsetX, 3.02, 0);
      group.add(cable);
    });

    // Brushed champagne bronze linear beam
    const beam = new THREE.Mesh(
      new THREE.BoxGeometry(2.85, 0.045, 0.12),
      champagneBronzeMat
    );
    beam.position.y = 2.82;
    group.add(beam);

    // Frosted acrylic diffuser lens strip
    const diffuserMat = new THREE.MeshStandardMaterial({
      color: 0xffedd5,
      emissive: 0xffdcb0,
      emissiveIntensity: 1.85,
      roughness: 0.15,
      metalness: 0.05,
    });
    const diffuser = new THREE.Mesh(
      new THREE.BoxGeometry(2.72, 0.018, 0.08),
      diffuserMat
    );
    diffuser.position.y = 2.79;
    group.add(diffuser);

    // Warm architectural conference wash (2700K) with luminous presence
    const light = new THREE.PointLight(0xffedd5, 7.8, 16, 1.25);
    light.position.y = 2.70;
    light.userData.onIntensity = 7.8;
    group.add(light);

    // Warm luminous floor light pool washing the boardroom table & floor
    const floorPool = createFloorPool(4.2, 0.70, 1.45, 0.85);
    group.add(floorPool);

    scene.add(group);
    registerLightFixture(id, {
      group,
      bulb: diffuser,
      light,
      floorPool,
      floorPoolBaseOpacity: 0.70,
      onColor: new THREE.Color(0xffedd5),
      offColor: new THREE.Color(0x282624),
      onEmissive: new THREE.Color(0xffdcb0),
      offEmissive: new THREE.Color(0x000000),
      onIntensity: 7.8,
      onEmissiveIntensity: 1.85,
    });
  };

  // 2. Tech Core Recessed Track Troffer (MLOps, Data Studio, Implementation)
  const createTrackTroffer = (id: StudioLightId, x: number, z: number) => {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // Matte obsidian flush chassis
    const chassis = new THREE.Mesh(
      new THREE.BoxGeometry(1.65, 0.05, 0.32),
      monitorBezelMat
    );
    chassis.position.y = 3.08;
    group.add(chassis);

    // Dual gimbal bezels
    [-0.42, 0.42].forEach((offsetX) => {
      const bezel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.11, 0.03, 16),
        champagneBronzeMat
      );
      bezel.position.set(offsetX, 3.05, 0);
      group.add(bezel);
    });

    // Frosted focus lens bar
    const lensMat = new THREE.MeshStandardMaterial({
      color: 0xfff7ed,
      emissive: 0xffeedb,
      emissiveIntensity: 1.65,
      roughness: 0.15,
      metalness: 0.05,
    });
    const lens = new THREE.Mesh(
      new THREE.BoxGeometry(1.48, 0.015, 0.18),
      lensMat
    );
    lens.position.y = 3.04;
    group.add(lens);

    // Crisp 3500K daylight focus downlight
    const light = new THREE.PointLight(0xfff5ea, 6.8, 14, 1.25);
    light.position.y = 2.92;
    light.userData.onIntensity = 6.8;
    group.add(light);

    // Soft focus floor pool beneath desk suites
    const floorPool = createFloorPool(3.8, 0.62, 1.25, 0.95);
    group.add(floorPool);

    scene.add(group);
    registerLightFixture(id, {
      group,
      bulb: lens,
      light,
      floorPool,
      floorPoolBaseOpacity: 0.62,
      onColor: new THREE.Color(0xfff7ed),
      offColor: new THREE.Color(0x1a1a1a),
      onEmissive: new THREE.Color(0xffeedb),
      offEmissive: new THREE.Color(0x000000),
      onIntensity: 6.8,
      onEmissiveIntensity: 1.65,
    });
  };

  // 3. Executive & Advisory Spun Bronze Cone Pendant (Executive, Legal, Ambassador, Talent)
  const createArchitecturalConePendant = (
    id: StudioLightId,
    x: number,
    z: number,
    intensity = 6.8
  ) => {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // Canopy
    const canopy = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.11, 0.03, 16),
      champagneBronzeMat
    );
    canopy.position.y = 3.12;
    group.add(canopy);

    // Slender cord
    const cord = new THREE.Mesh(
      new THREE.CylinderGeometry(0.007, 0.007, 0.48, 8),
      monitorBezelMat
    );
    cord.position.y = 2.88;
    group.add(cord);

    // Spun champagne bronze shade
    const shade = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.32, 0.22, 24),
      champagneBronzeMat
    );
    shade.position.y = 2.62;
    group.add(shade);

    // Recessed frosted diffuser plate
    const diffuserMat = new THREE.MeshStandardMaterial({
      color: 0xffedd5,
      emissive: 0xffdcb0,
      emissiveIntensity: 1.7,
      roughness: 0.15,
      metalness: 0,
    });
    const diffuser = new THREE.Mesh(
      new THREE.CylinderGeometry(0.30, 0.30, 0.02, 24),
      diffuserMat
    );
    diffuser.position.y = 2.51;
    group.add(diffuser);

    // Warm downlight (2700K)
    const light = new THREE.PointLight(0xffedd5, intensity, 13, 1.25);
    light.position.y = 2.42;
    light.userData.onIntensity = intensity;
    group.add(light);

    // Soft architectural floor pool
    const floorPool = createFloorPool(3.6, 0.60, 1.0, 1.0);
    group.add(floorPool);

    scene.add(group);
    registerLightFixture(id, {
      group,
      bulb: diffuser,
      light,
      floorPool,
      floorPoolBaseOpacity: 0.60,
      onColor: new THREE.Color(0xffedd5),
      offColor: new THREE.Color(0x242220),
      onEmissive: new THREE.Color(0xffdcb0),
      offEmissive: new THREE.Color(0x000000),
      onIntensity: intensity,
      onEmissiveIntensity: 1.7,
    });
  };

  // 4. Living Lounge & Atelier Sculptural Multi-Drop Glass Orb Cluster (2400K Amber)
  const createSculpturalClusterPendant = (
    id: StudioLightId,
    x: number,
    z: number,
    intensity = 7.2
  ) => {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // Bronze rosette
    const rosette = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 0.03, 18),
      champagneBronzeMat
    );
    rosette.position.y = 3.12;
    group.add(rosette);

    // 3 Staggered drops
    const drops = [
      { ox: -0.15, oz: 0.09, cordH: 0.54, orbY: 2.56, radius: 0.115 },
      { ox: 0.16, oz: 0.10, cordH: 0.70, orbY: 2.40, radius: 0.095 },
      { ox: 0.00, oz: -0.16, cordH: 0.62, orbY: 2.48, radius: 0.105 },
    ];

    const orbMat = new THREE.MeshStandardMaterial({
      color: 0xfed7aa,
      emissive: 0xfba94c,
      emissiveIntensity: 1.75,
      roughness: 0.12,
      metalness: 0,
    });

    let primaryOrbMesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial> | null = null;

    drops.forEach(({ ox, oz, cordH, orbY, radius }, idx) => {
      const cord = new THREE.Mesh(
        new THREE.CylinderGeometry(0.006, 0.006, cordH, 8),
        monitorBezelMat
      );
      cord.position.set(ox, 3.12 - cordH / 2, oz);
      group.add(cord);

      const collar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.035, 0.045, 12),
        champagneBronzeMat
      );
      collar.position.set(ox, orbY + radius + 0.015, oz);
      group.add(collar);

      const orb = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 16, 14),
        orbMat
      );
      orb.position.set(ox, orbY, oz);
      group.add(orb);
      if (idx === 0) primaryOrbMesh = orb;
    });

    // Cozy hospitality amber illumination (2400K)
    const light = new THREE.PointLight(0xfed7aa, intensity, 14, 1.25);
    light.position.y = 2.44;
    light.userData.onIntensity = intensity;
    group.add(light);

    // Radial hospitality light pool
    const floorPool = createFloorPool(4.0, 0.65, 1.0, 1.0);
    group.add(floorPool);

    scene.add(group);
    if (primaryOrbMesh) {
      registerLightFixture(id, {
        group,
        bulb: primaryOrbMesh,
        light,
        floorPool,
        floorPoolBaseOpacity: 0.65,
        onColor: new THREE.Color(0xfed7aa),
        offColor: new THREE.Color(0x25201a),
        onEmissive: new THREE.Color(0xfba94c),
        offEmissive: new THREE.Color(0x000000),
        onIntensity: intensity,
        onEmissiveIntensity: 1.75,
      });
    }
  };

  // 5. Venture Gallery Linear Wall-Wash Grazing Bar
  const createGalleryWallWashFixture = (id: StudioLightId, x: number, z: number) => {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(1.85, 0.045, 0.10),
      champagneBronzeMat
    );
    bar.position.y = 2.94;
    group.add(bar);

    const diffuserMat = new THREE.MeshStandardMaterial({
      color: 0xfed7aa,
      emissive: 0xfba94c,
      emissiveIntensity: 1.6,
      roughness: 0.15,
      metalness: 0,
    });
    const diffuser = new THREE.Mesh(
      new THREE.BoxGeometry(1.75, 0.015, 0.06),
      diffuserMat
    );
    diffuser.position.y = 2.91;
    group.add(diffuser);

    const light = new THREE.PointLight(0xfed7aa, 5.8, 11, 1.25);
    light.position.y = 2.82;
    light.userData.onIntensity = 5.8;
    group.add(light);

    // Wall-wash floor pool
    const floorPool = createFloorPool(3.2, 0.55, 1.35, 0.75);
    group.add(floorPool);

    scene.add(group);
    registerLightFixture(id, {
      group,
      bulb: diffuser,
      light,
      floorPool,
      floorPoolBaseOpacity: 0.55,
      onColor: new THREE.Color(0xfed7aa),
      offColor: new THREE.Color(0x25201a),
      onEmissive: new THREE.Color(0xfba94c),
      offEmissive: new THREE.Color(0x000000),
      onIntensity: 5.8,
      onEmissiveIntensity: 1.6,
    });
  };

  // 6. The Grand West Pavilion Monumental Room-Centered Chandelier (Multi-Tier Sculptural Bronze Rings & Frosted Luminous Halo)
  const createMonumentalPavilionChandelier = (
    id: StudioLightId,
    x: number,
    z: number,
    intensity = 8.5
  ) => {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // Ceiling Mount: Fluted Champagne Bronze Canopy (diameter 1.4m at high ceiling plane Y = 4.15m)
    const canopy = new THREE.Mesh(
      new THREE.CylinderGeometry(0.70, 0.70, 0.04, 32),
      champagneBronzeMat
    );
    canopy.position.y = 4.15;
    group.add(canopy);

    const canopyRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.70, 0.02, 16, 32),
      champagneBronzeMat
    );
    canopyRim.position.y = 4.15;
    canopyRim.rotation.x = Math.PI / 2;
    group.add(canopyRim);

    // Suspension tension cables dropping from ceiling to the tiered chandelier
    const cableMat = monitorBezelMat;
    const cableAngles = [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3];
    cableAngles.forEach((ang) => {
      const cx = Math.cos(ang) * 0.65;
      const cz = Math.sin(ang) * 0.65;
      const cable = new THREE.Mesh(
        new THREE.CylinderGeometry(0.004, 0.004, 0.55, 8),
        cableMat
      );
      cable.position.set(cx, 3.875, cz);
      group.add(cable);
    });

    // Luminous halo material
    const haloMat = new THREE.MeshStandardMaterial({
      color: 0xfed7aa,
      emissive: 0xfba94c,
      emissiveIntensity: 1.85,
      roughness: 0.12,
      metalness: 0,
    });

    // Tier 1: Outer Champagne Bronze Halo Ring (diameter 2.4m, Y = 3.65m, slight architectural tilt)
    const tier1Group = new THREE.Group();
    tier1Group.position.set(0, 3.65, 0);
    tier1Group.rotation.set(0.06, 0.2, 0.04);
    group.add(tier1Group);

    const ring1 = new THREE.Mesh(
      new THREE.TorusGeometry(1.20, 0.028, 16, 48),
      champagneBronzeMat
    );
    tier1Group.add(ring1);

    const halo1 = new THREE.Mesh(
      new THREE.TorusGeometry(1.18, 0.018, 16, 48),
      haloMat
    );
    tier1Group.add(halo1);

    // Tier 2: Mid Dark Bronze Elliptical Ring (diameter 1.7m, Y = 3.38m)
    const tier2Group = new THREE.Group();
    tier2Group.position.set(0, 3.38, 0);
    tier2Group.rotation.set(-0.08, -0.4, -0.05);
    group.add(tier2Group);

    const ring2 = new THREE.Mesh(
      new THREE.TorusGeometry(0.85, 0.025, 16, 48),
      champagneBronzeMat
    );
    tier2Group.add(ring2);

    const halo2 = new THREE.Mesh(
      new THREE.TorusGeometry(0.83, 0.016, 16, 48),
      haloMat
    );
    tier2Group.add(halo2);

    // Tier 3: Inner Satin Bronze Ring (diameter 1.1m, Y = 3.16m)
    const tier3Group = new THREE.Group();
    tier3Group.position.set(0, 3.16, 0);
    tier3Group.rotation.set(0.04, 0.8, -0.06);
    group.add(tier3Group);

    const ring3 = new THREE.Mesh(
      new THREE.TorusGeometry(0.55, 0.022, 16, 36),
      champagneBronzeMat
    );
    tier3Group.add(ring3);

    const halo3 = new THREE.Mesh(
      new THREE.TorusGeometry(0.53, 0.014, 16, 36),
      haloMat
    );
    tier3Group.add(halo3);

    // Central cluster of 5 staggered warm glass drop orbs cascading through the rings (lowest Y = 2.88m)
    const dropOffsets = [
      { ox: 0.00, oz: 0.00, y: 2.88, r: 0.11 },
      { ox: -0.20, oz: 0.12, y: 2.98, r: 0.09 },
      { ox: 0.22, oz: 0.10, y: 2.94, r: 0.085 },
      { ox: 0.10, oz: -0.18, y: 3.02, r: 0.08 },
      { ox: -0.16, oz: -0.14, y: 3.06, r: 0.085 },
    ];
    dropOffsets.forEach(({ ox, oz, y, r }) => {
      const dropCord = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0035, 0.0035, 4.15 - y, 8),
        cableMat
      );
      dropCord.position.set(ox, (4.15 + y) / 2, oz);
      group.add(dropCord);

      const orb = new THREE.Mesh(
        new THREE.SphereGeometry(r, 16, 14),
        haloMat
      );
      orb.position.set(ox, y, oz);
      group.add(orb);
    });

    // Radiant hospitality illumination (2400K warm amber)
    const light = new THREE.PointLight(0xfed7aa, intensity, 16, 1.2);
    light.position.y = 3.10;
    light.userData.onIntensity = intensity;
    group.add(light);

    // Broad architectural light pool on the floor beneath the sculpture
    const floorPool = createFloorPool(6.0, 0.70, 1.0, 1.0);
    group.add(floorPool);

    scene.add(group);
    registerLightFixture(id, {
      group,
      bulb: halo1,
      light,
      floorPool,
      floorPoolBaseOpacity: 0.70,
      onColor: new THREE.Color(0xfed7aa),
      offColor: new THREE.Color(0x25201a),
      onEmissive: new THREE.Color(0xfba94c),
      offEmissive: new THREE.Color(0x000000),
      onIntensity: intensity,
      onEmissiveIntensity: 1.85,
    });
  };

  // Register architectural fixtures per zone:
  // The Grand West Pavilion (Zone 1-5 integrated lighting on "command-desk" circuit):
  createArchitecturalConePendant("command-desk", -21.2, 0.0, 7.2);
  createTrackTroffer("command-desk", -16.5, -8.0);
  createBoardroomLinearPendant("command-desk", -10.8, 7.2);
  createTrackTroffer("command-desk", -9.5, -8.0);
  createMonumentalPavilionChandelier("command-desk", -11.8, 0.0, 8.5);
  createSculpturalClusterPendant("talent-desk", 5.9, 8.85, 7.0);
  createGalleryWallWashFixture("venture-wall", -0.55, 4.8);
  createBoardroomLinearPendant("boardroom", 16.6, 6.6);
  createSculpturalClusterPendant("lounge", 10.8, 0.8, 6.8);
  createSculpturalClusterPendant("break-room", 6.0, -4.3, 7.0);

  // ── Contact Shadow for Expanded Envelope ──
  const shadowCanvas = document.createElement("canvas");
  shadowCanvas.width = shadowCanvas.height = 256;
  const sctx = shadowCanvas.getContext("2d")!;
  const gradient = sctx.createRadialGradient(128, 128, 24, 128, 128, 128);
  gradient.addColorStop(0, "rgba(42, 38, 34, 0.45)");
  gradient.addColorStop(0.55, "rgba(42, 38, 34, 0.16)");
  gradient.addColorStop(1, "rgba(42, 38, 34, 0)");
  sctx.fillStyle = gradient;
  sctx.fillRect(0, 0, 256, 256);

  const contactShadowMat = new THREE.MeshBasicMaterial({
    map: new THREE.CanvasTexture(shadowCanvas),
    transparent: true,
    opacity: 0.60,
    depthWrite: false,
  });

  const contactShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(68, 44),
    contactShadowMat
  );
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.scale.set(1.08, 1.08, 1);
  contactShadow.position.set(-2.8, -0.44, 2.5);
  scene.add(contactShadow);

  // ── Architectural Plinth Material Mapping ──
  const plinthSideMat = new THREE.MeshStandardMaterial({
    color: 0x36322c, // Warm honed limestone & dark basalt foundation skirt
    roughness: 0.82,
    metalness: 0.04,
  });

  const floorMaterials = [
    plinthSideMat,
    plinthSideMat,
    terrazzoFloorMat,
    plinthSideMat,
    plinthSideMat,
    plinthSideMat,
  ];

  // Foundation skirt material that merges into the terrain
  const stylobateMat = new THREE.MeshStandardMaterial({
    color: 0x463e36, // Flamed architectural granite terrace stylobate
    roughness: 0.86,
    metalness: 0.05,
    flatShading: true,
  });

  const createPlinthWing = (w: number, d: number, x: number, z: number) => {
    const geo = new THREE.BoxGeometry(w, 0.4, d);
    const mesh = new THREE.Mesh(geo, floorMaterials);
    mesh.position.set(x, -0.2, z);
    mesh.receiveShadow = true;
    scene.add(mesh);
  };

  const createPolygonPlinth = (
    points: Array<[number, number]>,
    hole?: { cx: number; cz: number; radius: number },
    floorMaterial: THREE.Material = terrazzoFloorMat
  ) => {
    const shape = new THREE.Shape();
    points.forEach(([x, z], index) => index === 0 ? shape.moveTo(x, z) : shape.lineTo(x, z));
    shape.closePath();
    if (hole) {
      const holePath = new THREE.Path();
      holePath.absarc(hole.cx, hole.cz, hole.radius, 0, Math.PI * 2, true);
      shape.holes.push(holePath);
    }
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.4, bevelEnabled: false });
    const mesh = new THREE.Mesh(geometry, [floorMaterial, plinthSideMat]);
    mesh.rotation.x = Math.PI / 2;
    mesh.receiveShadow = true;
    scene.add(mesh);
  };

  // One generous, chamfered office campus: five similarly spacious team suites and a larger CEO suite.
  createPolygonPlinth([
    [-22.2, -11.5], [-4.8, -11.5], [-4.8, 10.5], [-16.4, 10.5],
    [-16.9, 10.0], [-16.9, 4.6], [-25.5, 4.6], [-25.5, -4.2], [-22.2, -4.2],
  ]);
  // A broad tapered gallery joins the office campus to the oasis without a disconnected floor seam.
  const connectorFootprint: Array<[number, number]> = [
    [-4.8, -2.8], [-2.8, -3.1], [-0.9, -2.4],
    [-0.9, 3.6], [-2.8, 4.3], [-4.8, 3.8],
  ];
  createPolygonPlinth(connectorFootprint);
  // Matching terrazzo aprons bridge the office connector, kitchen threshold, and oasis slab.
  createPolygonPlinth([[-0.9, -2.4], [0.9, -2.0], [0.9, 3.6], [-0.9, 3.6]]);
  createPolygonPlinth([[-0.9, -2.35], [0.7, -2.35], [0.7, -1.65], [-0.9, -1.65]]);
  createPlinthWing(11.9, 8.3, 5.05, 2.15);  // Central Oasis & Living Lounge: X in [-0.9, 11.0], Z in [-2.0, 6.3]
  createPlinthWing(19.3, 5.0, 8.15, -4.5);  // Kitchen Space Wing: X in [-1.5, 17.8], Z in [-7.0, -2.0]
  createPlinthWing(11.2, 9.6, 16.6, 6.6);   // The Study & Tech Library: X in [11.0, 22.2], Z in [1.8, 11.4] (Double Area)
  createPlinthWing(10.2, 5.1, 5.9, 8.85);   // Expanded Southern Oasis Garden Terrace: X in [0.8, 11.0], Z in [6.3, 11.4]

  // ── TECH LAB: FACETED ARCHITECTURAL PLINTH & APPROACH ──────────────
  const approachDepth = LAB_BOUNDS.corridorStart - LAB_BOUNDS.south;
  createPlinthWing(
    LAB_BOUNDS.corridorWidth,
    approachDepth,
    LAB_BOUNDS.spineX,
    (LAB_BOUNDS.corridorStart + LAB_BOUNDS.south) / 2
  );

  const labDepth = LAB_BOUNDS.south - LAB_BOUNDS.north;
  const labWidth = LAB_BOUNDS.east - LAB_BOUNDS.west;
  const labCenterX = (LAB_BOUNDS.west + LAB_BOUNDS.east) / 2;
  const labChamfer = 2.4;
  const labFootprint: Array<[number, number]> = [
    [LAB_BOUNDS.west + labChamfer, LAB_BOUNDS.north], // North edge west
    [LAB_BOUNDS.east - labChamfer, LAB_BOUNDS.north], // North edge east
    [LAB_BOUNDS.east, LAB_BOUNDS.north + labChamfer], // North-east facet
    [LAB_BOUNDS.east, LAB_BOUNDS.south - labChamfer], // East edge
    [LAB_BOUNDS.east - labChamfer, LAB_BOUNDS.south], // South-east facet
    [LAB_BOUNDS.west + labChamfer, LAB_BOUNDS.south], // South edge
    [LAB_BOUNDS.west, LAB_BOUNDS.south - labChamfer], // South-west facet
    [LAB_BOUNDS.west, LAB_BOUNDS.north + labChamfer], // West edge
  ];
  createPolygonPlinth(
    labFootprint,
    {
      cx: LAB_BOUNDS.spineX,
      cz: (LAB_BOUNDS.south + LAB_BOUNDS.north) / 2,
      radius: 4.2,
    },
    honedBasaltFloorMat
  );
  // so they stay planted on the correct floor plane through orbit, pan, zoom,
  // and first-person movement. The artwork uses only solid colors—no glow,
  // gradient, transparency, billboard rotation, or screen-space tracking.
  const createFloorTag = (
    id: StudioObjectId,
    label: string,
    x: number,
    z: number,
    width: number,
    rotationY = 0
  ) => {
    const group = new THREE.Group();
    group.position.set(x, 0.026, z);
    group.rotation.y = rotationY;

    const canvas = document.createElement("canvas");
    canvas.width = 768;
    canvas.height = 224;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#b88b5a";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#26221e";
    context.fillRect(0, 0, 28, canvas.height);
    context.strokeStyle = "#26221e";
    context.lineWidth = 10;
    context.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
    context.fillStyle = "#181512";
    context.font = "800 86px Arial, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(label.toUpperCase(), canvas.width / 2 + 10, canvas.height / 2, 660);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.025, 0.78),
      new THREE.MeshStandardMaterial({
        color: 0xb88b5a,
        roughness: 0.94,
        metalness: 0,
      })
    );
    base.position.y = 0.0125;
    base.receiveShadow = true;
    group.add(base);

    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(width - 0.035, 0.745),
      new THREE.MeshBasicMaterial({ map: texture, toneMapped: false })
    );
    face.rotation.x = -Math.PI / 2;
    face.position.y = 0.026;
    group.add(face);

    interactiveMeshes.set(base, id);
    interactiveMeshes.set(face, id);

    scene.add(group);
    floorTags.set(id, group);
  };

  // Room floor mats / tags have been retired across all studio rooms for clean architectural flooring.

  const createPinMarker = (id: StudioObjectId, x: number, y: number, z: number) => {
    const pin = new THREE.Group();
    pin.position.set(x, y, z);

    const isOnline = true;

    const bulbGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const bulbMat = new THREE.MeshStandardMaterial({
      color: isOnline ? 0x8b5cf6 : 0x71717a,
      emissive: isOnline ? 0x7c3aed : 0x27272a,
      emissiveIntensity: isOnline ? 0.85 : 0.2,
      roughness: 0.2,
      metalness: 0.1,
    });
    const bulb = new THREE.Mesh(bulbGeo, bulbMat);
    bulb.position.y = 0.08;
    pin.add(bulb);

    const coneGeo = new THREE.ConeGeometry(0.12, 0.22, 16);
    const cone = new THREE.Mesh(coneGeo, bulbMat);
    cone.rotation.x = Math.PI;
    cone.position.y = -0.03;
    pin.add(cone);

    const ringGeo = new THREE.RingGeometry(0.14, 0.20, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: isOnline ? 0x8b5cf6 : 0x71717a,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: isOnline ? 0.45 : 0.2,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.85;
    pin.add(ring);

    return pin;
  };

  const WALL_H = 4.25;

  const makeShellWall = (
    w: number,
    d: number,
    x: number,
    z: number,
    railAlongX: boolean
  ) => {
    const pane = new THREE.Mesh(new THREE.BoxGeometry(w, WALL_H, d), shellGlassMat);
    pane.position.set(x, WALL_H / 2, z);
    pane.receiveShadow = true;
    scene.add(pane);

    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(railAlongX ? w : 0.16, 0.06, railAlongX ? 0.16 : d),
      champagneBronzeMat
    );
    cap.position.set(x, WALL_H, z);
    scene.add(cap);

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(railAlongX ? w : 0.16, 0.04, railAlongX ? 0.16 : d),
      champagneBronzeMat
    );
    base.position.set(x, 0.02, z);
    scene.add(base);
  };

  const makeInteriorPartition = (
    w: number,
    d: number,
    x: number,
    z: number,
    railAlongX: boolean,
    h: number = WALL_H
  ) => {
    const pane = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), smokedGlassMat);
    pane.position.set(x, h / 2, z);
    pane.receiveShadow = true;
    scene.add(pane);

    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(railAlongX ? w : 0.12, 0.05, railAlongX ? 0.12 : d),
      champagneBronzeMat
    );
    cap.position.set(x, h, z);
    scene.add(cap);

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(railAlongX ? w : 0.12, 0.03, railAlongX ? 0.12 : d),
      champagneBronzeMat
    );
    base.position.set(x, 0.015, z);
    scene.add(base);
  };

  const solidOakPanelMat = new THREE.MeshStandardMaterial({
    color: 0x241e18, // Rich architectural fumed oak panel (100% opaque, non-see-through)
    roughness: 0.76,
    metalness: 0.04,
  });

  const makeSolidWall = (
    w: number,
    d: number,
    x: number,
    z: number,
    railAlongX: boolean,
    h: number = WALL_H
  ) => {
    const pane = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), solidOakPanelMat);
    pane.position.set(x, h / 2, z);
    pane.castShadow = true;
    pane.receiveShadow = true;
    scene.add(pane);

    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(railAlongX ? w : 0.14, 0.05, railAlongX ? 0.14 : d),
      champagneBronzeMat
    );
    cap.position.set(x, h, z);
    scene.add(cap);

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(railAlongX ? w : 0.14, 0.04, railAlongX ? 0.14 : d),
      champagneBronzeMat
    );
    base.position.set(x, 0.02, z);
    scene.add(base);
  };

  const makeAngledSolidWall = (
    startX: number,
    startZ: number,
    endX: number,
    endZ: number,
    h: number = WALL_H
  ) => {
    const dx = endX - startX;
    const dz = endZ - startZ;
    const length = Math.hypot(dx, dz);
    const wall = new THREE.Group();
    wall.position.set((startX + endX) / 2, 0, (startZ + endZ) / 2);
    wall.rotation.y = -Math.atan2(dz, dx);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(length, h, 0.12), solidOakPanelMat);
    panel.position.y = h / 2;
    panel.castShadow = true;
    panel.receiveShadow = true;
    wall.add(panel);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(length, 0.05, 0.14), champagneBronzeMat);
    cap.position.y = h;
    wall.add(cap);
    scene.add(wall);
  };

  const makeAngledInteriorPane = (
    startX: number,
    startZ: number,
    endX: number,
    endZ: number,
    h: number = WALL_H
  ) => {
    const dx = endX - startX;
    const dz = endZ - startZ;
    const length = Math.hypot(dx, dz);
    const paneGroup = new THREE.Group();
    paneGroup.position.set((startX + endX) / 2, 0, (startZ + endZ) / 2);
    paneGroup.rotation.y = -Math.atan2(dz, dx);
    const pane = new THREE.Mesh(new THREE.BoxGeometry(length, h, 0.08), smokedGlassMat);
    pane.position.y = h / 2;
    pane.receiveShadow = true;
    paneGroup.add(pane);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(length, 0.05, 0.10), champagneBronzeMat);
    cap.position.y = h;
    paneGroup.add(cap);
    scene.add(paneGroup);
  };

  // 1. Exterior Perimeter Shell Walls (Clean continuous architectural envelope)
  makeShellWall(17.4, 0.14, -13.5, -11.5, true);        // Three 5.8m-wide northern team suites
  makeShellWall(0.14, 7.3, -22.2, -7.85, false);        // North-west return to CEO volume
  makeShellWall(3.3, 0.14, -23.85, -4.2, true);         // CEO north exterior
  makeShellWall(0.14, 8.8, -25.5, 0.2, false);          // CEO west exterior
  makeShellWall(8.6, 0.14, -21.2, 4.6, true);           // CEO south exterior
  makeShellWall(0.14, 5.4, -16.9, 7.3, false);          // Connected law-office west wall
  makeAngledSolidWall(-16.9, 10.0, -16.4, 10.5);        // Chamfered south-west corner
  makeShellWall(11.6, 0.14, -10.6, 10.5, true);         // Two equally generous southern suites
  makeShellWall(0.14, 1.9, -1.5, -6.05, false);         // West step connecting to Kitchen North wall: X = -1.5, Z in [-7.0, -5.1]
  makeShellWall(0.14, 3.1, -1.5, -3.55, false);         // Closes unintended west opening: Z in [-5.1, -2.0]
  makeShellWall(19.3, 0.14, 8.15, -7.0, true);          // Kitchen North Exterior Wall: Z = -7.0, X in [-1.5, 17.8]
  makeShellWall(0.14, 8.8, 17.8, -2.6, false);          // East Exterior Wall: X = 17.8, Z in [-7.0, 1.8]
  makeShellWall(4.4, 0.14, 20.0, 1.8, true);            // The Study North exterior step: Z = 1.8, X in [17.8, 22.2]
  makeShellWall(0.14, 9.6, 22.2, 6.6, false);           // The Study East exterior glass wall: X = 22.2, Z in [1.8, 11.4] (Floor-to-ceiling glass)
  makeShellWall(11.2, 0.14, 16.6, 11.4, true);          // The Study South exterior glass wall: Z = 11.4, X in [11.0, 22.2]
  makeShellWall(10.2, 0.14, 5.9, 11.4, true);           // Expanded Oasis South continuous floor-to-ceiling glass wall: X in [0.8, 11.0], Z = 11.4
  makeShellWall(0.14, 5.1, 0.8, 8.85, false);           // West return wall of expanded Oasis: X = 0.8, Z in [6.3, 11.4]
  makeShellWall(5.6, 0.14, -2.0, 6.3, true);            // Atrium south wall west of expanded Oasis (X in [-4.8, 0.8], Z = 6.3)
  makeInteriorPartition(0.08, 5.1, 11.0, 8.85, false);  // Glazed interior partition between Central Oasis and The Study: X = 11.0, Z in [6.3, 11.4]

  // Demarcation Wall separating Central Oasis & Kitchen along Z = -2.0:
  // A framed 1.6m opening merges the office connector directly into the kitchen.
  makeInteriorPartition(0.6, 0.08, -1.2, -2.0, true);   // Left return: X in [-1.5, -0.9]
  makeInteriorPartition(0.6, 0.08, 1.0, -2.0, true);    // Right return: X in [0.7, 1.3]
  const kitchenEntryTransom = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.30, 0.08),
    smokedGlassMat
  );
  kitchenEntryTransom.position.set(-0.1, 2.20, -2.0);
  kitchenEntryTransom.receiveShadow = true;
  scene.add(kitchenEntryTransom);
  const kitchenEntryCap = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.05, 0.10),
    champagneBronzeMat
  );
  kitchenEntryCap.position.set(-0.1, 2.35, -2.0);
  scene.add(kitchenEntryCap);
  makeInteriorPartition(10.5, 0.08, 6.55, -2.0, true);  // Main backdrop partition directly behind Oasis rocks: X in [1.3, 11.8]
  // Board-wing entrance remains X in [11.8, 13.2]

  // Solid Opaque South Wall of Walk-In Pantry (Shields pantry interior completely from Boardroom Hallway):
  makeSolidWall(4.6, 0.12, 15.5, -2.0, true);   // X in [13.2, 17.8]

  // Walk-In Pantry Room Solid Architectural Partition along X = 13.2:
  makeSolidWall(0.12, 2.4, 13.2, -5.8, false);  // Pantry West Solid Wall North Segment: Z in [-7.0, -4.6]
  makeSolidWall(0.12, 1.4, 13.2, -2.7, false);  // Pantry West Solid Wall South Segment: Z in [-3.4, -2.0]
  // Doorway opening into Walk-In Pantry at Z in [-4.6, -3.4]

  // 2. Private Office Wing: five spacious peer suites around a broad gallery.
  // East envelope opens into a generous polygonal gallery at Z in [-1.8, 2.8].
  makeSolidWall(0.12, 9.7, -4.8, -6.65, false);
  makeSolidWall(0.12, 7.7, -4.8, 6.65, false);

  // Kitchen / Northern Wing junction: open 2.6m doorway threshold into Northern Connector Gallery
  makeAngledInteriorPane(-4.8, -2.8, -3.4, -3.0);
  makeAngledInteriorPane(-0.8, -2.6, -0.8, -2.0);
  // Talent side stays open; its existing rear pane already defines that edge.

  // 2. The Grand West Pavilion: all interior office divider walls removed to create
  // one expansive 450 m² open-concept architectural residence overlooking the cosmic void.

  // Central Oasis connects seamlessly southwards to the floor-to-ceiling glass terrace.

  // 3. Central Oasis, East Lounge & Boardroom Partitions (Wooden wall slabs removed)
  makeInteriorPartition(0.08, 4.5, 11.0, 4.05, false); // Boardroom West interior partition: X = 11.0, Z in [1.8, 6.3]
  makeInteriorPartition(2.6, 0.08, 12.3, 1.8, true);   // Boardroom North Left: Z = 1.8, X in [11.0, 13.6]
  makeInteriorPartition(2.2, 0.08, 16.7, 1.8, true);   // Boardroom North Right: Z = 1.8, X in [15.6, 17.8]

  // 4. North Wing Partitions: Kitchen & Break room removed, space unified with Central Oasis

  // ─────────────────────────────────────────────────────────────────────────────
  // ── SEATING & FURNITURE BUILDERS (JAPANDI / SCANDINAVIAN STANDARDS) ──────────
  // ─────────────────────────────────────────────────────────────────────────────
  const createErgonomicChair = (
    cx: number,
    cz: number,
    rotY: number,
    isBoardroom: boolean = false,
    cy: number = 0
  ) => {
    const chair = new THREE.Group();
    chair.position.set(cx, cy, cz);
    chair.rotation.y = rotY;

    // 5-Star Arched Spider Base & Dual Casters
    const spokeCount = 5;
    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.048, 0.056, 0.05, 16),
      isBoardroom ? champagneBronzeMat : aluminumMat
    );
    hub.position.y = 0.05;
    chair.add(hub);

    for (let s = 0; s < spokeCount; s++) {
      const angle = (s * Math.PI * 2) / spokeCount;
      const spokeGeo = new THREE.BoxGeometry(0.24, 0.02, 0.035);
      const spoke = new THREE.Mesh(spokeGeo, isBoardroom ? champagneBronzeMat : aluminumMat);
      spoke.position.set(Math.cos(angle) * 0.12, 0.04, Math.sin(angle) * 0.12);
      spoke.rotation.y = -angle;
      chair.add(spoke);

      const wheelGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.022, 12);
      const wheel = new THREE.Mesh(wheelGeo, monitorBezelMat);
      wheel.position.set(Math.cos(angle) * 0.22, 0.02, Math.sin(angle) * 0.22);
      chair.add(wheel);
    }

    // Telescopic Pneumatic Cylinder
    const poleGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.36, 12);
    const pole = new THREE.Mesh(poleGeo, aluminumMat);
    pole.position.y = 0.22;
    chair.add(pole);

    const sleeveGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.14, 12);
    const sleeve = new THREE.Mesh(sleeveGeo, monitorBezelMat);
    sleeve.position.y = 0.16;
    chair.add(sleeve);

    // Harmonic Tilt Mechanism & Tension Adjustment
    const tiltMechanism = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.07, 0.22),
      monitorBezelMat
    );
    tiltMechanism.position.set(0, 0.38, -0.03);
    chair.add(tiltMechanism);

    const tensionKnob = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, 0.04, 12),
      isBoardroom ? champagneBronzeMat : aluminumMat
    );
    tensionKnob.rotation.z = Math.PI / 2;
    tensionKnob.position.set(0.12, 0.37, -0.03);
    chair.add(tensionKnob);

    // Contoured Seat Pan with Waterfall Front Edge
    const seatMat = isBoardroom ? executiveLeatherMat : monitorBezelMat;
    const seatGeo = new THREE.BoxGeometry(0.48, 0.06, 0.44);
    const seat = new THREE.Mesh(seatGeo, seatMat);
    seat.position.set(0, 0.44, 0);
    seat.castShadow = true;
    chair.add(seat);

    const waterfall = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.478, 16),
      seatMat
    );
    waterfall.rotation.z = Math.PI / 2;
    waterfall.position.set(0, 0.42, 0.22);
    waterfall.castShadow = true;
    chair.add(waterfall);

    // Architectural Lumbar Spine (PostureFit SL / Cosm Suspension Spine)
    const spineMat = isBoardroom ? champagneBronzeMat : aluminumMat;
    const spine = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.58, 0.025), spineMat);
    spine.position.set(0, 0.72, -0.22);
    spine.castShadow = true;
    chair.add(spine);

    // Lumbar Support Pad
    const lumbarPad = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.02), monitorBezelMat);
    lumbarPad.position.set(0, 0.62, -0.19);
    chair.add(lumbarPad);

    // Contoured Backrest
    const backGeo = new THREE.BoxGeometry(0.44, 0.52, 0.03);
    const back = new THREE.Mesh(backGeo, seatMat);
    back.position.set(0, 0.74, -0.20);
    back.castShadow = true;
    chair.add(back);

    // Articulated Headrest with Twin Stalk (for Executive/Boardroom)
    if (isBoardroom) {
      const headrestStalk = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.14, 0.02), champagneBronzeMat);
      headrestStalk.position.set(0, 0.98, -0.23);
      chair.add(headrestStalk);

      const headrestGeo = new THREE.BoxGeometry(0.28, 0.14, 0.045);
      const headrest = new THREE.Mesh(headrestGeo, seatMat);
      headrest.position.set(0, 1.05, -0.22);
      headrest.castShadow = true;
      chair.add(headrest);
    }

    // 3D Cantilevered Armrests
    [-0.26, 0.26].forEach((ax) => {
      const armRestGeo = new THREE.BoxGeometry(0.06, 0.022, 0.22);
      const armRest = new THREE.Mesh(armRestGeo, monitorBezelMat);
      armRest.position.set(ax, 0.65, -0.02);
      chair.add(armRest);

      const armPoleGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.22, 10);
      const armPole = new THREE.Mesh(armPoleGeo, isBoardroom ? champagneBronzeMat : aluminumMat);
      armPole.position.set(ax, 0.54, -0.02);
      chair.add(armPole);
    });

    scene.add(chair);
    return chair;
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // ── ECO-PLANTS BUILDERS (DERIVED FROM REFERENCE IMAGE media_1789313363968.jpg) ──
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * 1. Broad Cloud-Canopy Tree (Rows 1 & 4 of reference image)
   * Organic fluted trunk with root flare on moss mound, branching limbs,
   * and voluminous clustered pillow/cloud lobes with two-tone green velvet lighting.
   */
  const createCloudTree = (
    tx: number,
    tz: number,
    scale: number = 1.0,
    rotY: number = 0
  ) => {
    const tree = new THREE.Group();
    tree.position.set(tx, 0, tz);
    tree.rotation.y = rotY;

    // Sculpted moss mound base
    const mossGeo = new THREE.CylinderGeometry(0.52 * scale, 0.64 * scale, 0.16 * scale, 24);
    const moss = new THREE.Mesh(mossGeo, mossPedestalMat);
    moss.position.y = 0.08 * scale;
    moss.receiveShadow = true;
    tree.add(moss);

    // Fluted organic trunk
    const trunkGeo = new THREE.CylinderGeometry(0.13 * scale, 0.22 * scale, 0.95 * scale, 12);
    const trunk = new THREE.Mesh(trunkGeo, treeBarkMat);
    trunk.position.y = 0.55 * scale;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    tree.add(trunk);

    // Root flare collars
    for (let r = 0; r < 4; r++) {
      const angle = (r * Math.PI * 2) / 4 + 0.3;
      const rootGeo = new THREE.ConeGeometry(0.08 * scale, 0.35 * scale, 8);
      const root = new THREE.Mesh(rootGeo, treeBarkMat);
      root.position.set(Math.cos(angle) * 0.16 * scale, 0.16 * scale, Math.sin(angle) * 0.16 * scale);
      root.rotation.z = Math.cos(angle) * 0.35;
      root.rotation.x = Math.sin(angle) * 0.35;
      tree.add(root);
    }

    // Branching upper forks
    const branchLGeo = new THREE.CylinderGeometry(0.08 * scale, 0.11 * scale, 0.45 * scale, 8);
    const branchL = new THREE.Mesh(branchLGeo, treeBarkMat);
    branchL.position.set(-0.16 * scale, 1.10 * scale, 0);
    branchL.rotation.z = 0.42;
    tree.add(branchL);

    const branchR = new THREE.Mesh(branchLGeo, treeBarkMat);
    branchR.position.set(0.16 * scale, 1.10 * scale, 0);
    branchR.rotation.z = -0.42;
    tree.add(branchR);

    // Voluminous Clustered Cloud Canopy Lobes (Asymmetrical pillowy spheres)
    const lobes = [
      // [x, y, z, radius, isHighlight]
      [0.0, 1.55 * scale, 0.0, 0.48 * scale, true],      // Crown crest lobe
      [-0.32 * scale, 1.38 * scale, 0.12 * scale, 0.42 * scale, true],  // Upper left lobe
      [0.34 * scale, 1.40 * scale, -0.10 * scale, 0.44 * scale, true], // Upper right lobe
      [-0.24 * scale, 1.18 * scale, -0.22 * scale, 0.38 * scale, false], // Under left lobe
      [0.26 * scale, 1.16 * scale, 0.24 * scale, 0.40 * scale, false],  // Under right lobe
      [0.05 * scale, 1.12 * scale, -0.18 * scale, 0.36 * scale, false], // Core rear lobe
      [-0.05 * scale, 1.30 * scale, 0.28 * scale, 0.35 * scale, true],  // Front accent lobe
    ];

    lobes.forEach(([lx, ly, lz, lr, isLime]) => {
      const lobeGeo = new THREE.SphereGeometry(lr as number, 16, 16);
      const lobe = new THREE.Mesh(lobeGeo, isLime ? foliageLimeMat : foliageMossMat);
      lobe.position.set(lx as number, ly as number, lz as number);
      lobe.castShadow = true;
      lobe.receiveShadow = true;
      tree.add(lobe);
    });

    scene.add(tree);
    return tree;
  };

  /**
   * Indoor Specimen Oak Tree with Basalt Stone Plinth & Soil Bed
   *
   * A sculptural interior oak: honed basalt drum base with bronze chamfer rim,
   * recessed dark loam soil bed, gnarled trunk forking into 4 spreading boughs,
   * and 10 asymmetric foliage clusters (lime highlight + moss shadow).
   * Total height ≈ 2.8m at scale 1.0; base radius 0.85m.
   */
  const createIndoorOakTree = (
    tx: number,
    tz: number,
    scale: number = 1.0
  ) => {
    const oak = new THREE.Group();
    oak.position.set(tx, 0, tz);

    // ── BASALT STONE DRUM BASE ──────────────────────────────────────────────
    // Honed round basalt plinth (radius 0.85m, height 0.35m)
    const plinthGeo = new THREE.CylinderGeometry(
      0.82 * scale, 0.85 * scale, 0.35 * scale, 32
    );
    const plinth = new THREE.Mesh(plinthGeo, basaltPlinthMat);
    plinth.position.y = 0.175 * scale;
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    oak.add(plinth);

    // Champagne bronze chamfer rim at plinth top edge
    const rimGeo = new THREE.TorusGeometry(0.815 * scale, 0.015 * scale, 8, 48);
    const rim = new THREE.Mesh(rimGeo, champagneBronzeMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.35 * scale;
    oak.add(rim);

    // ── RECESSED DARK LOAM SOIL BED ─────────────────────────────────────────
    const soilMat = new THREE.MeshStandardMaterial({
      color: 0x2b1d0c, // Rich dark loam
      roughness: 0.95,
      metalness: 0.0,
    });
    const soilGeo = new THREE.CylinderGeometry(
      0.72 * scale, 0.72 * scale, 0.04 * scale, 24
    );
    const soil = new THREE.Mesh(soilGeo, soilMat);
    soil.position.y = 0.33 * scale;
    soil.receiveShadow = true;
    oak.add(soil);

    // Scattered pebble accents on the soil surface (3 small basalt stones)
    for (let p = 0; p < 3; p++) {
      const angle = p * 2.094 + 0.5; // ~120° apart, offset
      const pr = (0.35 + p * 0.12) * scale;
      const pebble = new THREE.Mesh(
        new THREE.SphereGeometry(0.04 * scale, 8, 6),
        basaltPlinthMat
      );
      pebble.position.set(
        Math.cos(angle) * pr,
        0.36 * scale,
        Math.sin(angle) * pr
      );
      pebble.scale.set(1.0, 0.5, 0.8);
      oak.add(pebble);
    }

    // ── GNARLED OAK TRUNK ───────────────────────────────────────────────────
    // Main trunk: slightly off-center, tapered, with character
    const trunkGeo = new THREE.CylinderGeometry(
      0.12 * scale, 0.22 * scale, 1.35 * scale, 10
    );
    const trunk = new THREE.Mesh(trunkGeo, treeBarkMat);
    trunk.position.set(0.04 * scale, 1.025 * scale, -0.02 * scale);
    trunk.rotation.z = 0.04; // Slight lean
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    oak.add(trunk);

    // Root buttresses radiating from trunk base into soil
    for (let r = 0; r < 5; r++) {
      const angle = r * 1.2566 + 0.4; // 5 roots, ~72° apart
      const rootGeo = new THREE.ConeGeometry(0.055 * scale, 0.4 * scale, 6);
      const root = new THREE.Mesh(rootGeo, treeBarkMat);
      root.position.set(
        Math.cos(angle) * 0.18 * scale,
        0.42 * scale,
        Math.sin(angle) * 0.18 * scale
      );
      root.rotation.z = Math.cos(angle) * 0.55;
      root.rotation.x = Math.sin(angle) * 0.55;
      oak.add(root);
    }

    // ── FORKING BOUGHS ──────────────────────────────────────────────────────
    // The trunk forks at ~1.5m into 4 spreading boughs at different angles
    const boughs = [
      // [angle, lean, length] — angle around Y, lean outward, bough length
      { angle: 0.3,    lean: 0.45, length: 0.65 },
      { angle: 1.85,   lean: 0.38, length: 0.72 },
      { angle: 3.4,    lean: 0.42, length: 0.58 },
      { angle: 5.0,    lean: 0.35, length: 0.68 },
    ];

    const boughTips: THREE.Vector3[] = [];

    boughs.forEach(({ angle, lean, length }) => {
      const boughGeo = new THREE.CylinderGeometry(
        0.04 * scale, 0.09 * scale, length * scale, 7
      );
      const bough = new THREE.Mesh(boughGeo, treeBarkMat);

      // Position at fork point, angled outward
      const cx = Math.cos(angle) * 0.14 * scale;
      const cz = Math.sin(angle) * 0.14 * scale;
      const tipX = Math.cos(angle) * (0.14 + Math.sin(lean) * length) * scale;
      const tipZ = Math.sin(angle) * (0.14 + Math.sin(lean) * length) * scale;
      const tipY = (1.55 + Math.cos(lean) * length) * scale;

      bough.position.set(
        (cx + tipX) / 2,
        (1.55 * scale + tipY) / 2,
        (cz + tipZ) / 2
      );

      // Orient bough from fork to tip
      const dir = new THREE.Vector3(tipX - cx, tipY - 1.55 * scale, tipZ - cz).normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
      bough.setRotationFromQuaternion(quat);

      bough.castShadow = true;
      oak.add(bough);

      boughTips.push(new THREE.Vector3(tipX, tipY, tipZ));
    });

    // ── FOLIAGE CLUSTERS ────────────────────────────────────────────────────
    // 10 asymmetric leaf clusters: larger at tips, smaller fill at forks
    const foliageClusters = [
      // [x, y, z, radius, isLime] — world-space offsets relative to oak group
      // Crown apex cluster
      { x: 0.06, y: 2.45, z: 0.0,   r: 0.42, lime: true  },
      // Bough-tip clusters (larger)
      { x: boughTips[0].x / scale, y: boughTips[0].y / scale + 0.15, z: boughTips[0].z / scale, r: 0.38, lime: true  },
      { x: boughTips[1].x / scale, y: boughTips[1].y / scale + 0.12, z: boughTips[1].z / scale, r: 0.40, lime: false },
      { x: boughTips[2].x / scale, y: boughTips[2].y / scale + 0.10, z: boughTips[2].z / scale, r: 0.35, lime: true  },
      { x: boughTips[3].x / scale, y: boughTips[3].y / scale + 0.14, z: boughTips[3].z / scale, r: 0.37, lime: false },
      // Mid-canopy fill clusters (smaller, between boughs)
      { x: 0.18,  y: 2.10, z: 0.22,  r: 0.30, lime: false },
      { x: -0.20, y: 2.15, z: -0.15, r: 0.32, lime: true  },
      { x: 0.12,  y: 1.90, z: -0.28, r: 0.28, lime: false },
      // Under-canopy accent lobes
      { x: -0.15, y: 1.78, z: 0.20,  r: 0.25, lime: false },
      { x: 0.22,  y: 2.30, z: -0.10, r: 0.26, lime: true  },
    ];

    foliageClusters.forEach(({ x, y, z, r, lime }) => {
      const lobeGeo = new THREE.IcosahedronGeometry(r * scale, 1);
      const lobe = new THREE.Mesh(lobeGeo, lime ? foliageLimeMat : foliageMossMat);
      lobe.position.set(x * scale, y * scale, z * scale);
      lobe.castShadow = true;
      lobe.receiveShadow = true;
      oak.add(lobe);
    });

    scene.add(oak);
    return oak;
  };

  /**
   * 2. Layered Architectural Pine (Rows 2 & 4 of reference image)
   * Tapered trunk with 4 stacked scalloped conical foliage skirts.
   */
  const createLayeredPine = (
    tx: number,
    tz: number,
    scale: number = 1.0
  ) => {
    const pine = new THREE.Group();
    pine.position.set(tx, 0, tz);

    // Moss base ring
    const mossGeo = new THREE.CylinderGeometry(0.44 * scale, 0.52 * scale, 0.14 * scale, 20);
    const moss = new THREE.Mesh(mossGeo, mossPedestalMat);
    moss.position.y = 0.07 * scale;
    moss.receiveShadow = true;
    pine.add(moss);

    // Central trunk
    const trunkGeo = new THREE.CylinderGeometry(0.06 * scale, 0.12 * scale, 1.8 * scale, 12);
    const trunk = new THREE.Mesh(trunkGeo, treeBarkMat);
    trunk.position.y = 0.9 * scale;
    trunk.castShadow = true;
    pine.add(trunk);

    // 4 Stacked Scalloped Conical Skirts
    const tiers = [
      { y: 0.65 * scale, radius: 0.68 * scale, height: 0.58 * scale }, // Tier 1 (bottom)
      { y: 1.00 * scale, radius: 0.54 * scale, height: 0.52 * scale }, // Tier 2
      { y: 1.34 * scale, radius: 0.40 * scale, height: 0.46 * scale }, // Tier 3
      { y: 1.66 * scale, radius: 0.26 * scale, height: 0.42 * scale }, // Tier 4 (top)
    ];

    tiers.forEach(({ y, radius, height }) => {
      const coneGeo = new THREE.ConeGeometry(radius, height, 16);
      const cone = new THREE.Mesh(coneGeo, foliageEvergreenMat);
      cone.position.y = y;
      cone.castShadow = true;
      cone.receiveShadow = true;
      pine.add(cone);

      // Scalloped skirt base rim
      const rimGeo = new THREE.TorusGeometry(radius * 0.92, 0.024 * scale, 8, 20);
      const rim = new THREE.Mesh(rimGeo, foliageEvergreenMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = y - height * 0.44;
      pine.add(rim);
    });

    scene.add(pine);
    return pine;
  };

  /**
   * 3. Mini-Bonsai Desk / Credenza Planter (Reference Row 2 Column 2)
   * Minimalist ceramic dish with a sculpted gnarled branch and dual cloud-puff foliage.
   */
  const createBonsaiPlanter = (
    bx: number,
    by: number,
    bz: number,
    rotY: number = 0
  ) => {
    const bonsai = new THREE.Group();
    bonsai.position.set(bx, by, bz);
    bonsai.rotation.y = rotY;

    // Ceramic stone dish
    const dishGeo = new THREE.CylinderGeometry(0.12, 0.09, 0.05, 16);
    const dish = new THREE.Mesh(dishGeo, potStoneMat);
    dish.position.y = 0.025;
    dish.castShadow = true;
    bonsai.add(dish);

    // Dark soil disk
    const soilGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.015, 16);
    const soil = new THREE.Mesh(soilGeo, mossPedestalMat);
    soil.position.y = 0.05;
    bonsai.add(soil);

    // Gnarled woody stem
    const stemGeo = new THREE.CylinderGeometry(0.015, 0.022, 0.18, 8);
    const stem = new THREE.Mesh(stemGeo, treeBarkMat);
    stem.position.set(0.02, 0.13, 0);
    stem.rotation.z = -0.25;
    stem.castShadow = true;
    bonsai.add(stem);

    // Dual cloud-puff foliage lobes
    const lobe1Geo = new THREE.SphereGeometry(0.095, 14, 14);
    const lobe1 = new THREE.Mesh(lobe1Geo, foliageLimeMat);
    lobe1.position.set(-0.03, 0.24, 0.02);
    lobe1.castShadow = true;
    bonsai.add(lobe1);

    const lobe2Geo = new THREE.SphereGeometry(0.07, 12, 12);
    const lobe2 = new THREE.Mesh(lobe2Geo, foliageMossMat);
    lobe2.position.set(0.07, 0.20, -0.02);
    lobe2.castShadow = true;
    bonsai.add(lobe2);

    scene.add(bonsai);
    return bonsai;
  };

  /** Low walnut storage with a pair of small sculptural flower pots. */
  const createExecutiveCredenza = (
    cx: number,
    cz: number,
    rotY: number = 0,
    width: number = 2.1
  ) => {
    const credenza = new THREE.Group();
    credenza.position.set(cx, 0, cz);
    credenza.rotation.y = rotY;

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.62, 0.38),
      walnutMat
    );
    body.position.y = 0.38;
    body.castShadow = true;
    body.receiveShadow = true;
    credenza.add(body);

    const stoneTop = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.06, 0.045, 0.44),
      castStoneMat
    );
    stoneTop.position.y = 0.715;
    stoneTop.castShadow = true;
    credenza.add(stoneTop);

    [-width * 0.24, width * 0.24].forEach((x) => {
      const handle = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.018, 0.03),
        champagneBronzeMat
      );
      handle.position.set(x, 0.43, -0.205);
      credenza.add(handle);
    });

    [-width * 0.36, width * 0.36].forEach((x) => {
      const leg = new THREE.Mesh(
        new THREE.BoxGeometry(0.045, 0.18, 0.28),
        champagneBronzeMat
      );
      leg.position.set(x, 0.09, 0);
      credenza.add(leg);
    });

    scene.add(credenza);
    createBonsaiPlanter(cx - Math.cos(rotY) * width * 0.27, 0.74, cz + Math.sin(rotY) * width * 0.27, rotY + 0.25);
    createBonsaiPlanter(cx + Math.cos(rotY) * width * 0.27, 0.74, cz - Math.sin(rotY) * width * 0.27, rotY - 0.25);
    return credenza;
  };

  /** Compact hospitality joinery for coffee, chilled water and glassware. */
  const createRefreshmentCabinet = (x: number, z: number, rotY: number, width = 2.2) => {
    const cabinet = new THREE.Group();
    cabinet.position.set(x, 0, z);
    cabinet.rotation.y = rotY;
    const body = new THREE.Mesh(new THREE.BoxGeometry(width, 0.84, 0.48), walnutMat);
    body.position.y = 0.42;
    body.castShadow = true;
    cabinet.add(body);
    const top = new THREE.Mesh(new THREE.BoxGeometry(width + 0.08, 0.05, 0.54), castStoneMat);
    top.position.y = 0.865;
    cabinet.add(top);
    [-0.28, 0.28].forEach((offset) => {
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.025, 0.025), champagneBronzeMat);
      handle.position.set(offset * width, 0.48, -0.255);
      cabinet.add(handle);
    });
    const coffeeMachine = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.38, 0.34), monitorBezelMat);
    coffeeMachine.position.set(-width * 0.25, 1.08, 0);
    coffeeMachine.castShadow = true;
    cabinet.add(coffeeMachine);
    [0, 1, 2].forEach((index) => {
      const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.045, 0.18, 12), shellGlassMat);
      glass.position.set(width * 0.12 + index * 0.16, 0.98, 0);
      cabinet.add(glass);
    });
    scene.add(cabinet);
  };

  /** Raised floor planter: a slim bronze stand keeps foliage off circulation lines. */
  const createFloorPlanterStand = (x: number, z: number, scale = 1) => {
    const stand = new THREE.Group();
    stand.position.set(x, 0, z);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.54 * scale, 10), champagneBronzeMat);
    stem.position.y = 0.27 * scale;
    stand.add(stem);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.25 * scale, 0.28 * scale, 0.05, 20), champagneBronzeMat);
    base.position.y = 0.025;
    stand.add(base);
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.24 * scale, 0.18 * scale, 0.38 * scale, 20), potStoneMat);
    pot.position.y = 0.68 * scale;
    pot.castShadow = true;
    stand.add(pot);
    [[-0.12, 0.94, 0], [0.10, 1.05, 0.04], [0.04, 0.90, -0.10]].forEach(([px, py, pz], i) => {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry((0.20 - i * 0.025) * scale, 14, 12), i === 1 ? foliageLimeMat : foliageMossMat);
      leaf.scale.set(0.75, 1.35, 0.65);
      leaf.position.set(px * scale, py * scale, pz * scale);
      leaf.castShadow = true;
      stand.add(leaf);
    });
    scene.add(stand);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // ── PRIVATE SINGLE OFFICES BUILDER ───────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────────
  interface PrivateOfficeConfig {
    id: StudioObjectId;
    desk: [number, number];
    rotation: number;
    credenza: [number, number, number];
    art: [number, number, number];
    ac: [number, number, number];
    feature: [number, number];
    specialty: "founder" | "mlops" | "prototype" | "data" | "legal" | "ambassador";
    accent: number;
    isCeo?: boolean;
  }

  const createOfficeArt = (
    x: number,
    z: number,
    rotY: number,
    accent: number,
    isCeo: boolean
  ) => {
    const art = new THREE.Group();
    art.position.set(x, 1.58, z);
    art.rotation.y = rotY;
    const width = isCeo ? 2.5 : 1.5;
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(width, 1.22, 0.08),
      walnutMat
    );
    frame.castShadow = true;
    art.add(frame);

    // Museum Matboard (warm ivory)
    const matboard = new THREE.Mesh(
      new THREE.BoxGeometry(width - 0.08, 1.14, 0.015),
      new THREE.MeshStandardMaterial({ color: 0xf5f2eb, roughness: 0.92 })
    );
    matboard.position.z = 0.02;
    art.add(matboard);

    // Canvas facing INSIDE the room (positive local Z)
    const canvas = new THREE.Mesh(
      new THREE.BoxGeometry(width - 0.20, 1.02, 0.015),
      new THREE.MeshStandardMaterial({ color: 0xe6dfd2, roughness: 0.86 })
    );
    canvas.position.z = 0.032;
    art.add(canvas);

    // Expressive strokes facing INSIDE the room (positive local Z)
    [-0.28, 0.05, 0.33].forEach((offset, index) => {
      const stroke = new THREE.Mesh(
        new THREE.BoxGeometry(width * (0.16 + index * 0.05), 0.08, 0.02),
        new THREE.MeshStandardMaterial({
          color: index === 1 ? 0x171412 : accent,
          roughness: 0.52,
        })
      );
      stroke.position.set(offset * width, 0.25 - index * 0.24, 0.045);
      stroke.rotation.z = index === 1 ? -0.45 : 0.25 + index * 0.18;
      art.add(stroke);
    });

    // Gallery brass picture light above frame
    const sconceArm = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.08, 8), champagneBronzeMat);
    sconceArm.position.set(0, 0.69, 0.08);
    sconceArm.rotation.x = Math.PI / 4;
    art.add(sconceArm);

    const sconceBar = new THREE.Mesh(new THREE.BoxGeometry(width * 0.45, 0.025, 0.04), champagneBronzeMat);
    sconceBar.position.set(0, 0.72, 0.11);
    sconceBar.castShadow = true;
    art.add(sconceBar);

    scene.add(art);
  };

  const createWallAc = (x: number, z: number, rotY: number) => {
    const ac = new THREE.Group();
    ac.position.set(x, 2.23, z);
    ac.rotation.y = rotY;
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.08, 0.30, 0.18),
      new THREE.MeshStandardMaterial({ color: 0xe8e5df, roughness: 0.48 })
    );
    body.castShadow = true;
    ac.add(body);
    for (let i = 0; i < 6; i++) {
      const vent = new THREE.Mesh(
        new THREE.BoxGeometry(0.11, 0.018, 0.012),
        monitorBezelMat
      );
      vent.position.set(-0.40 + i * 0.16, -0.09, -0.10);
      ac.add(vent);
    }
    scene.add(ac);
  };

  const createRoleFeature = (
    specialty: PrivateOfficeConfig["specialty"],
    x: number,
    z: number,
    accent: number
  ) => {
    const feature = new THREE.Group();
    feature.position.set(x, 0, z);
    const pedestal = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.58, 0.50),
      castStoneMat
    );
    pedestal.position.y = 0.29;
    pedestal.castShadow = true;
    feature.add(pedestal);
    const accentMat = new THREE.MeshStandardMaterial({
      color: accent,
      roughness: 0.34,
      metalness: 0.42,
    });

    if (specialty === "mlops") {
      const rack = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.90, 0.36), monitorBezelMat);
      rack.position.y = 1.02;
      rack.castShadow = true;
      feature.add(rack);
      for (let i = 0; i < 4; i++) {
        const slot = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.055, 0.02), accentMat);
        slot.position.set(0, 1.28 - i * 0.18, -0.20);
        feature.add(slot);
      }
    } else if (specialty === "data") {
      [0.28, 0.50, 0.72].forEach((height, i) => {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.12, height, 0.12), accentMat);
        bar.position.set(-0.20 + i * 0.20, 0.58 + height / 2, 0);
        feature.add(bar);
      });
    } else if (specialty === "prototype") {
      const cube = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.34), accentMat);
      cube.position.set(-0.10, 0.83, 0);
      cube.rotation.set(0.2, 0.5, 0.18);
      feature.add(cube);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.20, 0.035, 10, 24), accentMat);
      ring.position.set(0.16, 1.15, 0);
      ring.rotation.y = Math.PI / 3;
      feature.add(ring);
    } else if (specialty === "legal") {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.62, 12), accentMat);
      post.position.y = 0.92;
      feature.add(post);
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.035, 0.035), accentMat);
      beam.position.y = 1.18;
      feature.add(beam);
      [-0.21, 0.21].forEach((px) => {
        const scale = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.08, 0.025, 20), accentMat);
        scale.position.set(px, 1.02, 0);
        feature.add(scale);
      });
    } else if (specialty === "ambassador") {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.30, 0.035, 10, 28), accentMat);
      ring.position.y = 1.02;
      feature.add(ring);
      for (let i = 0; i < 5; i++) {
        const node = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 12), accentMat);
        const angle = (i / 5) * Math.PI * 2;
        node.position.set(Math.cos(angle) * 0.30, 1.02 + Math.sin(angle) * 0.30, 0);
        feature.add(node);
      }
    } else {
      const sculpture = new THREE.Mesh(new THREE.TorusKnotGeometry(0.22, 0.055, 48, 8), accentMat);
      sculpture.position.y = 1.0;
      sculpture.scale.set(1.15, 1.15, 1.15);
      feature.add(sculpture);
    }
    scene.add(feature);
  };

  const makePrivateOffice = (config: PrivateOfficeConfig) => {
    const { desk, rotation, credenza, art, ac, feature, specialty, accent, isCeo = false } = config;
    const [deskX, deskZ] = desk;
    const group = new THREE.Group();
    group.position.set(deskX, 0, deskZ);
    group.rotation.y = rotation;

    const deskWidth = isCeo ? 2.75 : 2.05;
    const top = new THREE.Mesh(
      new THREE.BoxGeometry(deskWidth, isCeo ? 0.10 : 0.075, isCeo ? 1.08 : 0.92),
      isCeo ? walnutMat : oakWoodMat
    );
    top.position.y = 0.78;
    top.castShadow = true;
    top.receiveShadow = true;
    group.add(top);

    const inlay = new THREE.Mesh(
      new THREE.BoxGeometry(deskWidth * 0.72, 0.014, 0.08),
      champagneBronzeMat
    );
    inlay.position.set(0, 0.84, 0.02);
    group.add(inlay);

    [-deskWidth * 0.36, deskWidth * 0.36].forEach((x) => {
      const plinth = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.74, 0.72),
        isCeo ? champagneBronzeMat : aluminumMat
      );
      plinth.position.set(x, 0.38, 0);
      plinth.castShadow = true;
      group.add(plinth);
    });

    const monitorCount = specialty === "data" || specialty === "mlops" || isCeo ? 2 : 1;
    for (let i = 0; i < monitorCount; i++) {
      const monitor = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.43, 0.035), monitorBezelMat);
      monitor.position.set((i - (monitorCount - 1) / 2) * 0.78, 1.13, -0.30);
      monitor.castShadow = true;
      group.add(monitor);
    }
    scene.add(group);

    const localToWorld = (localX: number, localZ: number): [number, number] => {
      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);
      return [deskX + cos * localX + sin * localZ, deskZ - sin * localX + cos * localZ];
    };
    const staffChair = localToWorld(0, 0.86);
    createErgonomicChair(staffChair[0], staffChair[1], rotation + Math.PI);
    [[-0.58, -1.08], [0.58, -1.08]].forEach(([localX, localZ]) => {
      const guest = localToWorld(localX, localZ);
      createErgonomicChair(guest[0], guest[1], rotation, isCeo);
    });
    createExecutiveCredenza(credenza[0], credenza[1], credenza[2], isCeo ? 2.8 : 1.9);
    createOfficeArt(art[0], art[1], art[2], accent, isCeo);
    createWallAc(ac[0], ac[1], ac[2]);
    createRoleFeature(specialty, feature[0], feature[1], accent);

    if (isCeo) {
      // Private strategy setting: a soft-rectangle table with three executive chairs.
      const strategyTable = new THREE.Mesh(
        new THREE.BoxGeometry(1.75, 0.08, 0.82),
        castStoneMat
      );
      strategyTable.position.set(-21.2, 0.70, 2.75);
      strategyTable.castShadow = true;
      scene.add(strategyTable);
      createErgonomicChair(-21.85, 2.75, Math.PI / 2, true);
      createErgonomicChair(-20.55, 2.75, -Math.PI / 2, true);
      createErgonomicChair(-21.2, 3.45, Math.PI, true);

      const executiveRug = new THREE.Mesh(
        new THREE.BoxGeometry(5.7, 0.018, 5.15),
        new THREE.MeshStandardMaterial({ color: 0xc8bba8, roughness: 0.88 })
      );
      executiveRug.position.set(-21.7, 0.025, 0.2);
      executiveRug.receiveShadow = true;
      scene.add(executiveRug);
    }


  };

  // ── ARCHITECTURAL CORRIDOR CARPET: TAILORED BRAND SLATE WOOL RUNNER ──
  // Muted brand heather-slate with tactile loop-pile ribbed corduroy weave and cross-grain stippling.
  // Tailored 1.6m width leaves generous reveals of honed limestone terrazzo on both sides,
  // with dedicated threshold spurs leading directly to the door openings of all 5 rooms.
  const { diffuse: carpetDiffuse, bump: carpetBump } = createArchitecturalCarpetTexture();
  const galleryPathMat = new THREE.MeshStandardMaterial({
    map: carpetDiffuse,
    bumpMap: carpetBump,
    bumpScale: 0.008,
    color: 0xffffff,
    roughness: 0.94,
    metalness: 0.02,
  });

  // Main Gallery Spine: an elegant 1.6m-wide central runner
  // With mesh rotation.x = -Math.PI / 2, Shape Y maps to -World Z (North is positive Y, South is negative Y)
  // Leads directly from the central campus spine up to the entrance threshold of The West Pavilion at X = -5.0.
  const galleryShape = new THREE.Shape();
  galleryShape.moveTo(-5.0, 0.80);    // Threshold to The West Pavilion
  galleryShape.lineTo(-4.8, 0.80);    // North corridor edge (World Z = -0.80)
  galleryShape.lineTo(-3.6, 1.20);    // Connector north step (World Z = -1.20)
  galleryShape.lineTo(-1.2, 0.90);    // Threshold to kitchen (World Z = -0.90)
  galleryShape.lineTo(-1.2, -1.20);   // Threshold to talent (World Z = 1.20)
  galleryShape.lineTo(-3.6, -1.60);   // Connector south step (World Z = 1.60)
  galleryShape.lineTo(-4.8, -0.80);   // South corridor edge (World Z = 0.80)
  galleryShape.lineTo(-5.0, -0.80);   // Threshold to The West Pavilion
  galleryShape.closePath();

  const mainGalleryPath = new THREE.Mesh(new THREE.ShapeGeometry(galleryShape), galleryPathMat);
  mainGalleryPath.rotation.x = -Math.PI / 2;
  mainGalleryPath.position.y = 0.022;
  mainGalleryPath.receiveShadow = true;
  scene.add(mainGalleryPath);

  // ─────────────────────────────────────────────────────────────────────────────
  // ── THE GRAND WEST PAVILION: ARCHITECTURAL LIVING RESIDENCE & PANORAMA ──────
  // ── 450 m² unified open-concept luxury pavilion overlooking the cosmic void ──
  // ─────────────────────────────────────────────────────────────────────────────
  const createWestPavilion = () => {
    const pavilionGroup = new THREE.Group();
    pavilionGroup.name = "the-grand-west-pavilion";
    scene.add(pavilionGroup);

    // 1. Tactile Materials Palette
    const neroMarquinaMat = new THREE.MeshStandardMaterial({
      color: 0x111316,
      roughness: 0.18,
      metalness: 0.28,
    });
    const flutedBasaltMat = new THREE.MeshStandardMaterial({
      color: 0x1d2125,
      roughness: 0.82,
      metalness: 0.12,
    });
    const charcoalBoucleMat = new THREE.MeshStandardMaterial({
      color: 0x181c20,
      roughness: 0.88,
      metalness: 0.02,
    });
    const tobaccoWoolMat = new THREE.MeshStandardMaterial({
      color: 0x52361e,
      roughness: 0.85,
      metalness: 0.02,
    });
    const saddleLeatherMat = new THREE.MeshStandardMaterial({
      color: 0x6a3f1d,
      roughness: 0.45,
      metalness: 0.08,
    });
    const hearthEmberMat = new THREE.MeshStandardMaterial({
      color: 0xff5500,
      emissive: 0xff2a00,
      emissiveIntensity: 2.4,
      roughness: 0.35,
    });
    const darkBronzeMat = new THREE.MeshStandardMaterial({
      color: 0x7a5525,
      roughness: 0.30,
      metalness: 0.82,
    });
    const graniteMat = new THREE.MeshStandardMaterial({
      color: 0x15181b,
      roughness: 0.24,
      metalness: 0.35,
    });
    const fumedOakMat = new THREE.MeshStandardMaterial({
      color: 0x241d18,
      roughness: 0.72,
      metalness: 0.05,
    });
    const pavilionRugMat = new THREE.MeshStandardMaterial({
      color: 0x1a1e22,
      roughness: 0.94,
    });
    const sageRugMat = new THREE.MeshStandardMaterial({
      color: 0x24282c,
      roughness: 0.94,
    });

    const monographMats = [
      new THREE.MeshStandardMaterial({ color: 0xded8ce, roughness: 0.45 }), // Bone White
      new THREE.MeshStandardMaterial({ color: 0x1e3a5f, roughness: 0.50 }), // Deep Navy
      new THREE.MeshStandardMaterial({ color: 0x9e4732, roughness: 0.55 }), // Terracotta
      new THREE.MeshStandardMaterial({ color: 0x242a30, roughness: 0.60 }), // Charcoal
      new THREE.MeshStandardMaterial({ color: 0xc4822f, roughness: 0.50 }), // Amber
    ];

    // Helper: Throw Pillows
    const createPillow = (parent: THREE.Group, x: number, y: number, z: number, rotY: number, mat: THREE.Material) => {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.36, 0.14), mat);
      p.position.set(x, y, z);
      p.rotation.y = rotY;
      p.rotation.x = -0.15;
      p.castShadow = true;
      parent.add(p);
    };

    // ─────────────────────────────────────────────────────────────────────────
    // ZONE 1: SUNSET COSMIC LOUNGE (Center-West, [-21.5, 0, 0.0])
    // ─────────────────────────────────────────────────────────────────────────
    const loungeGroup = new THREE.Group();
    loungeGroup.name = "pavilion-zone1-lounge";
    pavilionGroup.add(loungeGroup);

    // Foundation Wool Rug (7.4m x 6.4m) with champagne bronze border reveal
    const rug1 = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.022, 6.4), pavilionRugMat);
    rug1.position.set(-21.5, 0.025, 0.0);
    rug1.receiveShadow = true;
    loungeGroup.add(rug1);

    const rugBorder1 = new THREE.Mesh(new THREE.BoxGeometry(7.46, 0.015, 6.46), champagneBronzeMat);
    rugBorder1.position.set(-21.5, 0.016, 0.0);
    loungeGroup.add(rugBorder1);

    // Massive Low-Profile L-Sectional in charcoal cashmere boucle
    const sofaGroup = new THREE.Group();
    sofaGroup.position.set(-19.6, 0, -0.2);
    loungeGroup.add(sofaGroup);

    const sofaPlinth = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.08, 4.4), monitorBezelMat);
    sofaPlinth.position.set(0, 0.04, 0);
    sofaPlinth.castShadow = true;
    sofaGroup.add(sofaPlinth);

    for (let c = 0; c < 3; c++) {
      const zOffset = -1.4 + c * 1.4;
      const cushion = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.26, 1.34), charcoalBoucleMat);
      cushion.position.set(0, 0.21, zOffset);
      cushion.castShadow = true;
      cushion.receiveShadow = true;
      sofaGroup.add(cushion);

      const crown = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.04, 1.30), charcoalBoucleMat);
      crown.position.set(0, 0.35, zOffset);
      sofaGroup.add(crown);
    }

    const backrest = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.44, 4.4), charcoalBoucleMat);
    backrest.position.set(0.50, 0.44, 0);
    backrest.castShadow = true;
    sofaGroup.add(backrest);

    // Chaise Lounge Return (extending West along South edge)
    const chaiseGroup = new THREE.Group();
    chaiseGroup.position.set(-21.25, 0, 1.55);
    loungeGroup.add(chaiseGroup);

    const chaisePlinth = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.08, 1.3), monitorBezelMat);
    chaisePlinth.position.set(0, 0.04, 0);
    chaiseGroup.add(chaisePlinth);

    const chaiseCushion = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.26, 1.25), charcoalBoucleMat);
    chaiseCushion.position.set(0, 0.21, 0);
    chaiseCushion.castShadow = true;
    chaiseCushion.receiveShadow = true;
    chaiseGroup.add(chaiseCushion);

    // Accent Pillows
    const pillowMatAmber = new THREE.MeshStandardMaterial({ color: 0x8a5522, roughness: 0.65 });
    const pillowMatSlate = new THREE.MeshStandardMaterial({ color: 0x242a30, roughness: 0.75 });
    createPillow(sofaGroup, 0.32, 0.45, -1.6, 0.1, pillowMatAmber);
    createPillow(sofaGroup, 0.34, 0.44, 0.0, -0.05, pillowMatSlate);
    createPillow(sofaGroup, 0.32, 0.45, 1.4, 0.15, pillowMatAmber);
    createPillow(chaiseGroup, -0.85, 0.44, 0.35, Math.PI / 2 + 0.1, pillowMatSlate);

    // Warm amber under-sofa LED float illumination
    const underSofaGlow = new THREE.PointLight(0xffb21a, 0.85, 4.5, 1.6);
    underSofaGlow.position.set(-20.5, 0.12, 0.2);
    loungeGroup.add(underSofaGlow);

    // Monolithic Nero Marquina Marble Slab Coffee Table
    const tableGroup = new THREE.Group();
    tableGroup.position.set(-21.8, 0, -0.35);
    loungeGroup.add(tableGroup);

    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.26, 1.35), neroMarquinaMat);
    tableTop.position.y = 0.22;
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    tableGroup.add(tableTop);

    const tablePlinth = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.09, 1.05), darkBronzeMat);
    tablePlinth.position.y = 0.045;
    tableGroup.add(tablePlinth);

    // Tabletop Objet d'Art: Stacked monographs & bronze bowl
    const book1 = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.045, 0.34), monographMats[0]);
    book1.position.set(-0.48, 0.37, 0.12);
    book1.rotation.y = 0.08;
    book1.castShadow = true;
    tableGroup.add(book1);

    const book2 = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.038, 0.31), monographMats[3]);
    book2.position.set(-0.46, 0.41, 0.14);
    book2.rotation.y = -0.04;
    book2.castShadow = true;
    tableGroup.add(book2);

    const bronzeBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.14, 0.10, 24), darkBronzeMat);
    bronzeBowl.position.set(0.42, 0.40, -0.10);
    bronzeBowl.castShadow = true;
    tableGroup.add(bronzeBowl);

    const candlePlinth = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.14), castStoneMat);
    candlePlinth.position.set(0.42, 0.41, 0.32);
    candlePlinth.castShadow = true;
    tableGroup.add(candlePlinth);

    // Iconic Architectural Arc Floor Lamp (Sculptural Flos-inspired Nero Marquina plinth & smooth curving bronze arch)
    const lampGroup = new THREE.Group();
    lampGroup.position.set(-18.6, 0, -2.4);
    loungeGroup.add(lampGroup);

    // Bevelled Monolithic Nero Marquina Marble Base
    const lampBase = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.52, 0.36), neroMarquinaMat);
    lampBase.position.y = 0.26;
    lampBase.castShadow = true;
    lampBase.receiveShadow = true;
    lampGroup.add(lampBase);

    // Iconic horizontal cylinder hole in marble base (characteristic Castiglioni detail)
    const holeCylinder = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 0.25, 16),
      flutedBasaltMat
    );
    holeCylinder.rotation.z = Math.PI / 2;
    holeCylinder.position.set(0, 0.38, 0);
    lampGroup.add(holeCylinder);

    // Champagne Bronze Base Mount Collar
    const collar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.032, 0.036, 0.06, 16),
      champagneBronzeMat
    );
    collar.position.y = 0.55;
    lampGroup.add(collar);

    // Smooth Sweeping Telescopic Bronze Arch Mast (Catmull-Rom 3D Spline)
    const arcPoints = [
      new THREE.Vector3(0, 0.56, 0),
      new THREE.Vector3(-0.05, 1.45, 0.10),
      new THREE.Vector3(-0.25, 2.15, 0.35),
      new THREE.Vector3(-0.65, 2.62, 0.75),
      new THREE.Vector3(-1.25, 2.82, 1.25),
      new THREE.Vector3(-1.95, 2.72, 1.70),
      new THREE.Vector3(-2.45, 2.38, 1.95),
      new THREE.Vector3(-2.65, 2.05, 2.05),
    ];
    const arcCurve = new THREE.CatmullRomCurve3(arcPoints);
    const mastMesh = new THREE.Mesh(
      new THREE.TubeGeometry(arcCurve, 36, 0.013, 10, false),
      champagneBronzeMat
    );
    mastMesh.castShadow = true;
    lampGroup.add(mastMesh);

    // Telescopic Coupler Rings
    [0.35, 0.68].forEach((t) => {
      const pt = arcCurve.getPoint(t);
      const ring = new THREE.Mesh(
        new THREE.CylinderGeometry(0.022, 0.022, 0.035, 12),
        champagneBronzeMat
      );
      ring.position.copy(pt);
      lampGroup.add(ring);
    });

    // Sculptural Two-Piece Spun-Dome Luminaire Head (suspended over coffee table at [-21.25, 2.05, -0.35])
    const headGroup = new THREE.Group();
    headGroup.position.set(-2.65, 2.05, 2.05);
    lampGroup.add(headGroup);

    // Swivel knuckle
    const knuckle = new THREE.Mesh(
      new THREE.SphereGeometry(0.032, 12, 12),
      monitorBezelMat
    );
    headGroup.add(knuckle);

    // Perforated upper cap
    const shadeCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.08, 0.05, 18),
      champagneBronzeMat
    );
    shadeCap.position.y = -0.04;
    headGroup.add(shadeCap);

    // Elegant Spun Dome Reflector (hemisphere in champagne bronze)
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.20, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5),
      champagneBronzeMat
    );
    dome.position.y = -0.06;
    dome.rotation.x = Math.PI;
    dome.castShadow = true;
    headGroup.add(dome);

    // Frosted Lens Diffuser
    const diffuserMat = new THREE.MeshStandardMaterial({
      color: 0xfff4e6,
      emissive: 0xfed7aa,
      emissiveIntensity: 1.4,
      roughness: 0.15,
    });
    const diffuserLens = new THREE.Mesh(
      new THREE.CircleGeometry(0.185, 24),
      diffuserMat
    );
    diffuserLens.position.y = -0.07;
    diffuserLens.rotation.x = Math.PI / 2;
    headGroup.add(diffuserLens);

    // Warm Directional Reading Light Pool
    const lampLight = new THREE.SpotLight(0xffeed6, 2.4, 6.5, 0.65, 0.45, 1.4);
    lampLight.position.set(-2.65, 1.95, 2.05);
    lampLight.target.position.set(-2.65, 0.22, 2.05);
    lampGroup.add(lampLight);
    lampGroup.add(lampLight.target);

    // ─────────────────────────────────────────────────────────────────────────
    // ZONE 2: GRAND LINEAR HEARTH SALON (North-West, [-16.5, 0, -8.5])
    // ─────────────────────────────────────────────────────────────────────────
    const hearthZoneGroup = new THREE.Group();
    hearthZoneGroup.name = "pavilion-zone2-hearth";
    pavilionGroup.add(hearthZoneGroup);

    // 8.4m Monumental Fluted Basalt Feature Wall along North edge (Z = -11.35)
    const hearthWallGroup = new THREE.Group();
    hearthWallGroup.position.set(-16.5, 0, -11.35);
    hearthZoneGroup.add(hearthWallGroup);

    const chimneyBreast = new THREE.Mesh(new THREE.BoxGeometry(8.4, 3.2, 0.22), flutedBasaltMat);
    chimneyBreast.position.set(0, 1.60, 0.11);
    chimneyBreast.castShadow = true;
    hearthWallGroup.add(chimneyBreast);

    // Champagne bronze rhythmic fins across the 8.4m span
    for (let f = -4.0; f <= 4.0; f += 0.35) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.035, 3.18, 0.03), champagneBronzeMat);
      rib.position.set(f, 1.60, 0.23);
      hearthWallGroup.add(rib);
    }

    // 6.2m Continuous Horizontal Ribbon Flame Firebox
    const firebox = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.50, 0.40), monitorBezelMat);
    firebox.position.set(0, 0.72, 0.24);
    hearthWallGroup.add(firebox);

    const emberBed = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.09, 0.28), hearthEmberMat);
    emberBed.position.set(0, 0.52, 0.24);
    hearthWallGroup.add(emberBed);

    const fireGlass = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.44, 0.02), smokedGlassMat);
    fireGlass.position.set(0, 0.72, 0.42);
    hearthWallGroup.add(fireGlass);

    // Ambient Hearth Illumination
    const hearthLight1 = new THREE.PointLight(0xff7722, 2.6, 9.5, 1.4);
    hearthLight1.position.set(-1.8, 0.76, 0.65);
    hearthWallGroup.add(hearthLight1);

    const hearthLight2 = new THREE.PointLight(0xff8833, 2.6, 9.5, 1.4);
    hearthLight2.position.set(1.8, 0.76, 0.65);
    hearthWallGroup.add(hearthLight2);

    // Hearth Conversation Salon: 5.2m x 4.4m wool foundation rug
    const hearthRug = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.020, 4.4), pavilionRugMat);
    hearthRug.position.set(-16.5, 0.024, -7.2);
    hearthRug.receiveShadow = true;
    hearthZoneGroup.add(hearthRug);

    // Circular Nero Marquina marble plinth table (1.3m diameter)
    const hearthPlinth = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.28, 32), neroMarquinaMat);
    hearthPlinth.position.set(-16.5, 0.16, -7.2);
    hearthPlinth.castShadow = true;
    hearthPlinth.receiveShadow = true;
    hearthZoneGroup.add(hearthPlinth);

    const plinthCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.66, 0.03, 32), darkBronzeMat);
    plinthCollar.position.set(-16.5, 0.035, -7.2);
    hearthZoneGroup.add(plinthCollar);

    // Circular tray and crystal on hearth table
    const hearthTray = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.02, 24), darkBronzeMat);
    hearthTray.position.set(-16.5, 0.31, -7.2);
    hearthTray.castShadow = true;
    hearthZoneGroup.add(hearthTray);

    // Pair of curved sculptural club chairs in warm tobacco wool
    const createCurvedClubChair = (x: number, z: number, rotY: number) => {
      const chairGroup = new THREE.Group();
      chairGroup.position.set(x, 0, z);
      chairGroup.rotation.y = rotY;

      const baseCylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.52, 0.36, 24), tobaccoWoolMat);
      baseCylinder.position.y = 0.20;
      baseCylinder.castShadow = true;
      chairGroup.add(baseCylinder);

      const seatPad = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.08, 24), tobaccoWoolMat);
      seatPad.position.y = 0.40;
      chairGroup.add(seatPad);

      const curvedBack = new THREE.Mesh(new THREE.CylinderGeometry(0.50, 0.52, 0.34, 24, 1, true, -Math.PI * 0.45, Math.PI * 0.9), tobaccoWoolMat);
      curvedBack.position.y = 0.55;
      curvedBack.rotation.y = Math.PI;
      curvedBack.castShadow = true;
      chairGroup.add(curvedBack);

      const bronzePedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.40, 0.44, 0.04, 24), darkBronzeMat);
      bronzePedestal.position.y = 0.02;
      chairGroup.add(bronzePedestal);

      hearthZoneGroup.add(chairGroup);
    };

    createCurvedClubChair(-18.4, -7.0, Math.PI * 0.32);
    createCurvedClubChair(-14.6, -7.0, -Math.PI * 0.32);

    // ─────────────────────────────────────────────────────────────────────────
    // ─────────────────────────────────────────────────────────────────────────
    // ZONE 3: MONUMENTAL DINING & SOLARIUM (South Bay, [-10.8, 0, 7.2])
    // ─────────────────────────────────────────────────────────────────────────
    const diningZoneGroup = new THREE.Group();
    diningZoneGroup.name = "pavilion-zone3-dining";
    pavilionGroup.add(diningZoneGroup);

    // 6.4m x 4.2m Deep Slate Wool Foundation Rug
    const diningRug = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.020, 4.2), pavilionRugMat);
    diningRug.position.set(-10.8, 0.024, 7.2);
    diningRug.receiveShadow = true;
    diningZoneGroup.add(diningRug);

    const diningRugBorder = new THREE.Mesh(new THREE.BoxGeometry(6.46, 0.014, 4.26), champagneBronzeMat);
    diningRugBorder.position.set(-10.8, 0.015, 7.2);
    diningZoneGroup.add(diningRugBorder);

    // Monumental 10-Seater Dining Monolith Table
    const table10Group = new THREE.Group();
    table10Group.position.set(-10.8, 0, 7.2);
    diningZoneGroup.add(table10Group);

    const table10Top = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.08, 1.25), graniteMat);
    table10Top.position.y = 0.74;
    table10Top.castShadow = true;
    table10Top.receiveShadow = true;
    table10Group.add(table10Top);

    // Twin Cylindrical Fluted Basalt & Bronze Pedestal Columns
    [-1.25, 1.25].forEach((dx) => {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.68, 24), darkBronzeMat);
      col.position.set(dx, 0.35, 0);
      col.castShadow = true;
      table10Group.add(col);
    });

    // Centerpiece: Low fluted basalt trough with polished stone spheres
    const trough = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.06, 0.22), flutedBasaltMat);
    trough.position.set(0, 0.81, 0);
    trough.castShadow = true;
    table10Group.add(trough);

    for (let s = -0.6; s <= 0.6; s += 0.3) {
      const stoneSphere = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 12), castStoneMat);
      stoneSphere.position.set(s, 0.86, 0);
      table10Group.add(stoneSphere);
    }

    // 10 Minimalist Refined Dining Chairs (4 slender legs, saddle leather cushion, fumed oak back)
    const createDiningChair = (x: number, z: number, rotY: number) => {
      const chair = new THREE.Group();
      chair.position.set(x, 0, z);
      chair.rotation.y = rotY;

      // 4 Tapered slender legs
      const legH = 0.44;
      const legOffsets = [
        [-0.20, -0.18],
        [0.20, -0.18],
        [-0.19, 0.18],
        [0.19, 0.18],
      ];
      legOffsets.forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(
          new THREE.CylinderGeometry(0.016, 0.012, legH, 8),
          darkBronzeMat
        );
        leg.position.set(lx, legH / 2, lz);
        leg.castShadow = true;
        chair.add(leg);
      });

      // Upholstered seat cushion in warm saddle leather
      const seat = new THREE.Mesh(
        new THREE.BoxGeometry(0.50, 0.08, 0.46),
        saddleLeatherMat
      );
      seat.position.y = 0.46;
      seat.castShadow = true;
      chair.add(seat);

      // Low-slung curved ergonomic backrest in fumed oak
      const back = new THREE.Mesh(
        new THREE.BoxGeometry(0.50, 0.32, 0.045),
        fumedOakMat
      );
      back.position.set(0, 0.63, -0.21);
      back.castShadow = true;
      chair.add(back);

      // Inner leather backrest cushion
      const backCushion = new THREE.Mesh(
        new THREE.BoxGeometry(0.44, 0.24, 0.025),
        saddleLeatherMat
      );
      backCushion.position.set(0, 0.62, -0.18);
      chair.add(backCushion);

      diningZoneGroup.add(chair);
    };

    // 4 chairs along North side facing South
    [-12.3, -11.3, -10.3, -9.3].forEach((cx) => createDiningChair(cx, 6.00, 0));
    // 4 chairs along South side facing North
    [-12.3, -11.3, -10.3, -9.3].forEach((cx) => createDiningChair(cx, 8.40, Math.PI));
    // 2 Captain chairs at table heads
    createDiningChair(-13.5, 7.2, Math.PI / 2);
    createDiningChair(-8.1, 7.2, -Math.PI / 2);

    // Floating Hospitality Bar & Credenza along South perimeter wall (Z = 10.32, centered at X = -10.8)
    const barCredenza = new THREE.Group();
    barCredenza.position.set(-10.8, 0, 10.32);
    diningZoneGroup.add(barCredenza);

    const barBody = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.62, 0.50), fumedOakMat);
    barBody.position.set(0, 0.64, -0.25);
    barBody.castShadow = true;
    barCredenza.add(barBody);

    const barTop = new THREE.Mesh(new THREE.BoxGeometry(4.26, 0.04, 0.54), neroMarquinaMat);
    barTop.position.set(0, 0.97, -0.25);
    barTop.castShadow = true;
    barCredenza.add(barTop);

    const barReveal = new THREE.Mesh(new THREE.BoxGeometry(4.24, 0.015, 0.02), champagneBronzeMat);
    barReveal.position.set(0, 0.94, -0.01);
    barCredenza.add(barReveal);

    // Curated crystal decanters and smoked tumblers
    const decanterMat = new THREE.MeshPhysicalMaterial({
      color: 0xf6d8a8,
      transparent: true,
      opacity: 0.65,
      roughness: 0.08,
      metalness: 0.1,
    });
    [-0.9, -0.45, 0.0].forEach((dx) => {
      const decanter = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.08, 0.28, 16), decanterMat);
      decanter.position.set(dx, 1.13, -0.25);
      decanter.castShadow = true;
      barCredenza.add(decanter);

      const stopper = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 12), champagneBronzeMat);
      stopper.position.set(dx, 1.29, -0.25);
      barCredenza.add(stopper);
    });

    for (let t = 0; t < 5; t++) {
      const tumbler = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.038, 0.09, 12), smokedGlassMat);
      tumbler.position.set(0.45 + t * 0.15, 1.035, -0.25);
      barCredenza.add(tumbler);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ZONE 4: CURATED LIBRARY & ACOUSTIC LOUNGE (North-East, [-9.5, 0, -7.5])
    // ─────────────────────────────────────────────────────────────────────────
    const libraryZoneGroup = new THREE.Group();
    libraryZoneGroup.name = "pavilion-zone4-library";
    pavilionGroup.add(libraryZoneGroup);

    // 4.8m x 4.2m Muted Sage/Slate Wool Rug
    const libRug = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.020, 4.2), sageRugMat);
    libRug.position.set(-9.5, 0.024, -7.5);
    libRug.receiveShadow = true;
    libraryZoneGroup.add(libRug);

    // 6.6m Wide Floating Full-Height Monograph Shelving along North wall (Z = -11.35)
    const shelfGroup = new THREE.Group();
    shelfGroup.position.set(-9.5, 0, -11.35);
    libraryZoneGroup.add(shelfGroup);

    const shelfBack = new THREE.Mesh(new THREE.BoxGeometry(6.6, 3.2, 0.12), fumedOakMat);
    shelfBack.position.set(0, 1.60, 0.06);
    shelfGroup.add(shelfBack);

    // 4 Floating Tiers with warm concealed LED wash
    for (let t = 0; t < 4; t++) {
      const sy = 0.55 + t * 0.75;
      const shelfPlank = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.04, 0.36), fumedOakMat);
      shelfPlank.position.set(0, sy, 0.22);
      shelfPlank.castShadow = true;
      shelfGroup.add(shelfPlank);

      // Book clusters on each shelf
      for (let b = -2.8; b <= 2.8; b += 0.85) {
        const bookCount = 4 + Math.floor((b + 3) % 4);
        for (let k = 0; k < bookCount; k++) {
          const matIdx = Math.floor((k + Math.abs(b * 3)) % monographMats.length);
          const book = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.30 + (k % 3) * 0.04, 0.24), monographMats[matIdx]);
          book.position.set(b + k * 0.05, sy + 0.17 + (k % 3) * 0.02, 0.22);
          book.castShadow = true;
          shelfGroup.add(book);
        }
      }
    }

    // Shelf accent artifacts in open bays
    const polyArtifact = new THREE.Mesh(new THREE.IcosahedronGeometry(0.14, 0), darkBronzeMat);
    polyArtifact.position.set(0.2, 2.22, 0.22);
    polyArtifact.castShadow = true;
    shelfGroup.add(polyArtifact);

    const stoneBust = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.32, 16), castStoneMat);
    stoneBust.position.set(-1.6, 2.22, 0.22);
    stoneBust.castShadow = true;
    shelfGroup.add(stoneBust);

    // Minimalist Leather Reading Daybed / Chaise
    const daybedGroup = new THREE.Group();
    daybedGroup.position.set(-9.5, 0, -6.8);
    libraryZoneGroup.add(daybedGroup);

    const daybedPlinth = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.10, 1.0), monitorBezelMat);
    daybedPlinth.position.y = 0.05;
    daybedPlinth.castShadow = true;
    daybedGroup.add(daybedPlinth);

    const daybedMattress = new THREE.Mesh(new THREE.BoxGeometry(2.10, 0.32, 0.95), saddleLeatherMat);
    daybedMattress.position.y = 0.26;
    daybedMattress.castShadow = true;
    daybedMattress.receiveShadow = true;
    daybedGroup.add(daybedMattress);

    const bolster = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.90, 20), saddleLeatherMat);
    bolster.rotation.x = Math.PI / 2;
    bolster.position.set(0.85, 0.46, 0);
    bolster.castShadow = true;
    daybedGroup.add(bolster);

    const throwBlanket = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.025, 0.92), castStoneMat);
    throwBlanket.position.set(-0.75, 0.43, 0);
    daybedGroup.add(throwBlanket);

    // Honed Basalt Side Cylinder Reading Table
    const libTable = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.48, 24), flutedBasaltMat);
    libTable.position.set(-8.0, 0.24, -6.8);
    libTable.castShadow = true;
    libraryZoneGroup.add(libTable);

    const openBook = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.03, 0.24), monographMats[0]);
    openBook.position.set(-8.0, 0.50, -6.8);
    libraryZoneGroup.add(openBook);

    // ─────────────────────────────────────────────────────────────────────────
    // ZONE 5: ROOM-CENTERED MONUMENTAL ART PIECE & ATRIUM PORTAL ([-11.8, 0, 0.0])
    // ─────────────────────────────────────────────────────────────────────────
    const galleryZoneGroup = new THREE.Group();
    galleryZoneGroup.name = "pavilion-zone5-gallery";
    pavilionGroup.add(galleryZoneGroup);

    // Flush Champagne Bronze Threshold Datum Line at Atrium Entry (X = -5.0)
    const thresholdDatum = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.015, 4.8), champagneBronzeMat);
    thresholdDatum.position.set(-5.0, 0.018, 0.5);
    galleryZoneGroup.add(thresholdDatum);

    // Stepped Monolithic Cast Stone & Bronze Sculptural Plinth (Room Geometric Center: [-11.8, 0, 0.0])
    const plinthBase = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.04, 1.4), darkBronzeMat);
    plinthBase.position.set(-11.8, 0.02, 0.0);
    plinthBase.receiveShadow = true;
    galleryZoneGroup.add(plinthBase);

    const plinthMesh = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.44, 1.1), castStoneMat);
    plinthMesh.position.set(-11.8, 0.26, 0.0);
    plinthMesh.castShadow = true;
    plinthMesh.receiveShadow = true;
    galleryZoneGroup.add(plinthMesh);

    const plinthReveal = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.02, 1.12), champagneBronzeMat);
    plinthReveal.position.set(-11.8, 0.49, 0.0);
    galleryZoneGroup.add(plinthReveal);

    // 1.9m Modern Abstract Dark Bronze Sculpture (Clears overhead chandelier with 0.98m air gap)
    const sculptureGroup = new THREE.Group();
    sculptureGroup.position.set(-11.8, 0.50, 0.0);
    galleryZoneGroup.add(sculptureGroup);

    const bronzeRing1 = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.05, 16, 36), darkBronzeMat);
    bronzeRing1.position.set(0, 0.44, 0);
    bronzeRing1.rotation.set(0.4, 0.6, 0.2);
    bronzeRing1.castShadow = true;
    sculptureGroup.add(bronzeRing1);

    const bronzeRing2 = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.045, 16, 36), darkBronzeMat);
    bronzeRing2.position.set(0, 0.82, 0);
    bronzeRing2.rotation.set(-0.5, -0.3, 0.8);
    bronzeRing2.castShadow = true;
    sculptureGroup.add(bronzeRing2);

    const bronzeRibbon = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, 1.15, 16), darkBronzeMat);
    bronzeRibbon.position.set(0, 0.58, 0);
    bronzeRibbon.rotation.set(0.2, 0.1, -0.3);
    bronzeRibbon.castShadow = true;
    sculptureGroup.add(bronzeRibbon);

    const bronzeCrown = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.03, 16, 32), champagneBronzeMat);
    bronzeCrown.position.set(0, 1.12, 0);
    bronzeCrown.rotation.set(0.8, -0.2, 0.5);
    bronzeCrown.castShadow = true;
    sculptureGroup.add(bronzeCrown);

    // 4 In-ground perimeter uplights grazing the stone plinth and bronze sculpture
    const uplightOffsets = [
      [0.75, 0.0],
      [-0.75, 0.0],
      [0.0, 0.75],
      [0.0, -0.75],
    ];
    uplightOffsets.forEach(([ox, oz]) => {
      const well = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 16), darkBronzeMat);
      well.position.set(-11.8 + ox, 0.015, oz);
      galleryZoneGroup.add(well);

      const uplight = new THREE.PointLight(0xffe4b5, 1.6, 4.5, 1.5);
      uplight.position.set(-11.8 + ox, 0.12, oz);
      galleryZoneGroup.add(uplight);
    });
  };

  createWestPavilion();






  // The former office suites are fully unified into The Grand West Pavilion above.

  // ─────────────────────────────────────────────────────────────────────────────
  // ── TECH ROOM: FACETED PANORAMIC ENVELOPE (NO PRISON BARS) ───────────────────
  // ─────────────────────────────────────────────────────────────────────────────
  // Helper for 45-degree chamfered glass facet walls (clean glass, no cage bars/mullions)
  const makeAngledShellWall = (
    x1: number,
    z1: number,
    x2: number,
    z2: number,
    wallHeight: number = WALL_H
  ) => {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    const midX = (x1 + x2) / 2;
    const midZ = (z1 + z2) / 2;
    const angle = Math.atan2(dz, dx);

    const segment = new THREE.Group();
    segment.position.set(midX, 0, midZ);
    segment.rotation.y = -angle;
    scene.add(segment);

    const pane = new THREE.Mesh(
      new THREE.BoxGeometry(len, wallHeight, 0.08),
      shellGlassMat
    );
    pane.position.set(0, wallHeight / 2, 0);
    pane.receiveShadow = true;
    segment.add(pane);

    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(len, 0.06, 0.16),
      champagneBronzeMat
    );
    cap.position.set(0, wallHeight, 0);
    segment.add(cap);

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(len, 0.04, 0.16),
      champagneBronzeMat
    );
    base.position.set(0, 0.02, 0);
    segment.add(base);
  };

  // 1. Narrow glazed arrival gallery connecting main campus to the lab
  const approachZ = (LAB_BOUNDS.corridorStart + LAB_BOUNDS.south) / 2;
  makeShellWall(0.12, approachDepth, LAB_BOUNDS.spineX - LAB_BOUNDS.corridorWidth / 2, approachZ, false);
  makeShellWall(0.12, approachDepth, LAB_BOUNDS.spineX + LAB_BOUNDS.corridorWidth / 2, approachZ, false);

  // 2. Faceted room perimeter walls with open doorless south entrance
  const doorWest = LAB_BOUNDS.spineX - LAB_BOUNDS.corridorWidth / 2;
  const doorEast = LAB_BOUNDS.spineX + LAB_BOUNDS.corridorWidth / 2;

  // South wall flanks (door opening between doorWest and doorEast remains completely open)
  const southWestFlankW = doorWest - (LAB_BOUNDS.west + labChamfer);
  makeShellWall(southWestFlankW, 0.14, ((LAB_BOUNDS.west + labChamfer) + doorWest) / 2, LAB_BOUNDS.south, true);

  const southEastFlankW = (LAB_BOUNDS.east - labChamfer) - doorEast;
  makeShellWall(southEastFlankW, 0.14, (doorEast + (LAB_BOUNDS.east - labChamfer)) / 2, LAB_BOUNDS.south, true);

  // 4 Corner Chamfer Facets (45-degree angled walls - clean glass, no vertical bars)
  makeAngledShellWall(LAB_BOUNDS.west, LAB_BOUNDS.south - labChamfer, LAB_BOUNDS.west + labChamfer, LAB_BOUNDS.south);
  makeAngledShellWall(LAB_BOUNDS.east - labChamfer, LAB_BOUNDS.south, LAB_BOUNDS.east, LAB_BOUNDS.south - labChamfer);
  makeAngledShellWall(LAB_BOUNDS.east, LAB_BOUNDS.north + labChamfer, LAB_BOUNDS.east - labChamfer, LAB_BOUNDS.north);
  makeAngledShellWall(LAB_BOUNDS.west + labChamfer, LAB_BOUNDS.north, LAB_BOUNDS.west, LAB_BOUNDS.north + labChamfer);

  // East & West long facades
  const eastSpanZ = (LAB_BOUNDS.south - labChamfer) - (LAB_BOUNDS.north + labChamfer);
  makeShellWall(0.14, eastSpanZ, LAB_BOUNDS.east, (LAB_BOUNDS.south + LAB_BOUNDS.north) / 2, false);

  const westSpanZ = (LAB_BOUNDS.south - labChamfer) - (LAB_BOUNDS.north + labChamfer);
  makeShellWall(0.14, westSpanZ, LAB_BOUNDS.west, (LAB_BOUNDS.south + LAB_BOUNDS.north) / 2, false);

  // North panoramic facade
  const northSpanW = (LAB_BOUNDS.east - labChamfer) - (LAB_BOUNDS.west + labChamfer);
  makeShellWall(northSpanW, 0.14, labCenterX, LAB_BOUNDS.north, true);

  const advancedTechLab = createAdvancedTechLab();
  scene.add(advancedTechLab.group);
  ambientUpdaters.push(advancedTechLab.update);
  advancedTechLab.lights.forEach(({ group, bulb, light }) => {
    registerLightFixture("advanced-tech-lab", {
      group, bulb, light,
      onColor: new THREE.Color(0x38bdf8),
      offColor: new THREE.Color(0x0a1c29),
      onEmissive: new THREE.Color(0x38bdf8),
      offEmissive: new THREE.Color(0x000000),
      onIntensity: 3.8,
      onEmissiveIntensity: 1.6,
    });
  });

  const powerPlant = createPowerPlant();
  scene.add(powerPlant.group);
  ambientUpdaters.push(powerPlant.update);
  interactiveMeshes.set(powerPlant.hitMesh, "power-grid");

  // Hospitality stays at the edge of circulation; the new connector remains a clean, continuous arrival.
  createRefreshmentCabinet(-22.0, 4.12, 0, 2.35);
  createRefreshmentCabinet(-5.35, 8.7, Math.PI / 2, 2.15);
  createFloorPlanterStand(-4.45, -2.52, 0.9);
  createFloorPlanterStand(-1.30, 3.42, 0.9);
  createFloorPlanterStand(-24.65, -3.25, 1.05);

  // ─────────────────────────────────────────────────────────────────────────────
  // ── ARCHITECTURAL HALLWAY GALLERY: CABINETS, FRAMED ART & FLOWER POTS ─────────
  // ─────────────────────────────────────────────────────────────────────────────
  const bookMats = [
    new THREE.MeshStandardMaterial({ color: 0x1e3a5f, roughness: 0.60 }), // Navy
    new THREE.MeshStandardMaterial({ color: 0xc4822f, roughness: 0.55 }), // Warm Amber
    new THREE.MeshStandardMaterial({ color: 0x9e4732, roughness: 0.65 }), // Terracotta
    new THREE.MeshStandardMaterial({ color: 0x4a6351, roughness: 0.60 }), // Sage Green
    new THREE.MeshStandardMaterial({ color: 0xded8ce, roughness: 0.70 }), // Bone White
    new THREE.MeshStandardMaterial({ color: 0x282a30, roughness: 0.50 }), // Charcoal
    new THREE.MeshStandardMaterial({ color: 0x7a2828, roughness: 0.60 }), // Crimson
    new THREE.MeshStandardMaterial({ color: 0x234433, roughness: 0.65 }), // Forest
  ];

  /** Low-profile architectural book cabinet with open shelving, books, stone top and artifacts. */
  const createHallwayBookCabinet = (
    cx: number,
    cz: number,
    rotY: number,
    width = 2.2,
    height = 0.88,
    depth = 0.32
  ) => {
    const cabinet = new THREE.Group();
    cabinet.position.set(cx, 0, cz);
    cabinet.rotation.y = rotY;

    // Recessed bronze kickplate
    const plinth = new THREE.Mesh(
      new THREE.BoxGeometry(width - 0.08, 0.08, depth - 0.06),
      inGroundBronzeMat
    );
    plinth.position.y = 0.04;
    plinth.receiveShadow = true;
    cabinet.add(plinth);

    const wallThick = 0.03;
    const bodyH = height - 0.08 - 0.035;
    const bodyY = 0.08 + bodyH / 2;

    // Side panels
    [-width / 2 + wallThick / 2, width / 2 - wallThick / 2].forEach((sx) => {
      const side = new THREE.Mesh(new THREE.BoxGeometry(wallThick, bodyH, depth), walnutMat);
      side.position.set(sx, bodyY, 0);
      side.castShadow = true;
      side.receiveShadow = true;
      cabinet.add(side);
    });

    // Bottom shelf
    const bottom = new THREE.Mesh(new THREE.BoxGeometry(width - wallThick * 2, wallThick, depth), walnutMat);
    bottom.position.set(0, 0.08 + wallThick / 2, 0);
    bottom.receiveShadow = true;
    cabinet.add(bottom);

    // Middle shelf
    const midShelf = new THREE.Mesh(new THREE.BoxGeometry(width - wallThick * 2, wallThick, depth - 0.02), walnutMat);
    midShelf.position.set(0, 0.08 + bodyH * 0.52, 0);
    midShelf.receiveShadow = true;
    cabinet.add(midShelf);

    // Back panel
    const back = new THREE.Mesh(new THREE.BoxGeometry(width - wallThick * 2, bodyH, 0.015), walnutMat);
    back.position.set(0, bodyY, -depth / 2 + 0.01);
    cabinet.add(back);

    // Top slab: Honed cast stone / travertine slab
    const stoneTop = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.06, 0.035, depth + 0.04),
      castStoneMat
    );
    stoneTop.position.set(0, height - 0.0175, 0);
    stoneTop.castShadow = true;
    stoneTop.receiveShadow = true;
    cabinet.add(stoneTop);

    // Books on bottom shelf
    const shelf1Y = 0.11;
    const shelf2Y = 0.08 + bodyH * 0.52 + wallThick / 2;

    const populateShelf = (shelfY: number, startXRatio: number, count: number, startMatIdx: number) => {
      let currentX = -width * 0.42 + startXRatio * (width * 0.84);
      for (let i = 0; i < count; i++) {
        const bW = 0.032 + (i % 3) * 0.012;
        const bH = 0.22 + ((i * 7) % 5) * 0.022;
        const bD = depth * 0.72 - ((i * 3) % 4) * 0.015;
        const mat = bookMats[(startMatIdx + i) % bookMats.length];
        const book = new THREE.Mesh(new THREE.BoxGeometry(bW, bH, bD), mat);
        book.position.set(currentX + bW / 2, shelfY + bH / 2, 0.01);
        book.castShadow = true;
        cabinet.add(book);
        currentX += bW + 0.005;
      }
    };

    populateShelf(shelf1Y, 0.02, 7, 0);
    populateShelf(shelf1Y, 0.55, 6, 3);

    // Bronze bookend on shelf 1
    const bookend1 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.14, 0.16), champagneBronzeMat);
    bookend1.position.set(-width * 0.42 + 0.32, shelf1Y + 0.07, 0.01);
    cabinet.add(bookend1);

    // Ceramic artifact vase on shelf 1 center
    const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.045, 0.22, 16), potStoneMat);
    vase.position.set(0.04, shelf1Y + 0.11, 0.02);
    vase.castShadow = true;
    cabinet.add(vase);

    // Shelf 2 (Middle)
    populateShelf(shelf2Y, 0.04, 8, 2);

    // Stack of 3 horizontal art monographs
    [0, 1, 2].forEach((stackIdx) => {
      const stackBook = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.036, 0.20),
        bookMats[(stackIdx * 2 + 1) % bookMats.length]
      );
      stackBook.position.set(width * 0.26, shelf2Y + 0.018 + stackIdx * 0.036, 0.02);
      stackBook.castShadow = true;
      cabinet.add(stackBook);
    });

    // Small bronze geometric ring sculpture atop stacked books
    const ringGeo = new THREE.TorusGeometry(0.045, 0.014, 8, 20);
    const ringMesh = new THREE.Mesh(ringGeo, champagneBronzeMat);
    ringMesh.position.set(width * 0.26, shelf2Y + 0.108 + 0.05, 0.02);
    ringMesh.rotation.x = Math.PI / 2;
    cabinet.add(ringMesh);

    // Top surface accents:
    // Minimalist brass table lamp
    const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.02, 16), champagneBronzeMat);
    lampBase.position.set(-width * 0.32, height + 0.01, 0);
    cabinet.add(lampBase);
    const lampPole = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.26, 8), champagneBronzeMat);
    lampPole.position.set(-width * 0.32, height + 0.14, 0);
    cabinet.add(lampPole);
    const lampShade = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.09, 16), castStoneMat);
    lampShade.position.set(-width * 0.32, height + 0.26, 0);
    lampShade.castShadow = true;
    cabinet.add(lampShade);

    // Ceramic succulent dish on top surface
    const potTop = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.065, 0.055, 16), potStoneMat);
    potTop.position.set(width * 0.30, height + 0.0275, 0);
    potTop.castShadow = true;
    cabinet.add(potTop);
    [[-0.025, 0.05, 0.01], [0.025, 0.06, -0.015], [0.01, 0.045, 0.025]].forEach(([fx, fy, fz], idx) => {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.04 - idx * 0.006, 10, 10), idx === 0 ? foliageLimeMat : foliageMossMat);
      leaf.scale.set(1.2, 0.7, 1.2);
      leaf.position.set(width * 0.30 + fx, height + fy, fz);
      cabinet.add(leaf);
    });

    scene.add(cabinet);
    return cabinet;
  };

  /** Curated wall art frame with museum matboard, modern composition, and linear brass downlight sconce. */
  const createHallwayArtFrame = (
    cx: number,
    cz: number,
    rotY: number,
    width = 1.2,
    height = 0.95,
    variant: "arch" | "blueprint" | "horizon" | "triptych" = "arch"
  ) => {
    const artGroup = new THREE.Group();
    artGroup.position.set(cx, 1.62, cz);
    artGroup.rotation.y = rotY;

    // Frame moulding
    const frameBorder = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, 0.045),
      walnutMat
    );
    frameBorder.castShadow = true;
    artGroup.add(frameBorder);

    // Museum Matboard
    const matboard = new THREE.Mesh(
      new THREE.BoxGeometry(width - 0.08, height - 0.08, 0.015),
      new THREE.MeshStandardMaterial({ color: 0xf5f2eb, roughness: 0.92 })
    );
    matboard.position.z = 0.02;
    artGroup.add(matboard);

    // Inner Canvas
    const innerW = width - 0.24;
    const innerH = height - 0.24;
    const canvasMesh = new THREE.Mesh(
      new THREE.BoxGeometry(innerW, innerH, 0.01),
      new THREE.MeshStandardMaterial({ color: 0xede8df, roughness: 0.88 })
    );
    canvasMesh.position.z = 0.026;
    artGroup.add(canvasMesh);

    if (variant === "arch") {
      const archMat = new THREE.MeshStandardMaterial({ color: 0xb4533c, roughness: 0.65 });
      const circleMat = new THREE.MeshStandardMaterial({ color: 0x2c3539, roughness: 0.60 });
      const arch = new THREE.Mesh(new THREE.CylinderGeometry(innerW * 0.22, innerW * 0.22, 0.01, 24, 1, false, 0, Math.PI), archMat);
      arch.position.set(0, -innerH * 0.05, 0.033);
      arch.rotation.x = Math.PI / 2;
      artGroup.add(arch);

      const disc = new THREE.Mesh(new THREE.CylinderGeometry(innerW * 0.14, innerW * 0.14, 0.012, 20), circleMat);
      disc.position.set(innerW * 0.16, innerH * 0.15, 0.034);
      disc.rotation.x = Math.PI / 2;
      artGroup.add(disc);

      const bar = new THREE.Mesh(new THREE.BoxGeometry(innerW * 0.65, 0.018, 0.012), champagneBronzeMat);
      bar.position.set(-innerW * 0.05, -innerH * 0.22, 0.034);
      artGroup.add(bar);
    } else if (variant === "blueprint") {
      const lineMat = new THREE.MeshStandardMaterial({ color: 0x3b4a54, roughness: 0.50 });
      [-0.2, 0, 0.2].forEach((offsetY) => {
        const hLine = new THREE.Mesh(new THREE.BoxGeometry(innerW * 0.75, 0.012, 0.012), lineMat);
        hLine.position.set(0, offsetY * innerH, 0.033);
        artGroup.add(hLine);
      });
      [-0.25, 0.25].forEach((offsetX) => {
        const vLine = new THREE.Mesh(new THREE.BoxGeometry(0.012, innerH * 0.65, 0.012), lineMat);
        vLine.position.set(offsetX * innerW, 0, 0.033);
        artGroup.add(vLine);
      });
      const accentBlock = new THREE.Mesh(new THREE.BoxGeometry(innerW * 0.22, innerH * 0.26, 0.012), new THREE.MeshStandardMaterial({ color: 0xc4822f, roughness: 0.60 }));
      accentBlock.position.set(innerW * 0.12, -innerH * 0.08, 0.034);
      artGroup.add(accentBlock);
    } else if (variant === "horizon") {
      const colors = [0x4a5d52, 0x8a927a, 0xd4a373, 0x2e3532];
      colors.forEach((col, idx) => {
        const strip = new THREE.Mesh(
          new THREE.BoxGeometry(innerW * 0.85, innerH * 0.18, 0.012),
          new THREE.MeshStandardMaterial({ color: col, roughness: 0.75 })
        );
        strip.position.set(0, (idx - 1.5) * (innerH * 0.21), 0.033);
        artGroup.add(strip);
      });
    } else {
      const b1 = new THREE.Mesh(new THREE.BoxGeometry(innerW * 0.32, innerH * 0.65, 0.012), new THREE.MeshStandardMaterial({ color: 0x35424a, roughness: 0.60 }));
      b1.position.set(-innerW * 0.20, 0.02, 0.033);
      artGroup.add(b1);
      const b2 = new THREE.Mesh(new THREE.BoxGeometry(innerW * 0.32, innerH * 0.42, 0.012), new THREE.MeshStandardMaterial({ color: 0x9c6b2f, roughness: 0.55 }));
      b2.position.set(innerW * 0.18, -innerH * 0.10, 0.033);
      artGroup.add(b2);
      const disc2 = new THREE.Mesh(new THREE.CylinderGeometry(innerW * 0.12, innerW * 0.12, 0.014, 18), new THREE.MeshStandardMaterial({ color: 0xded8ce, roughness: 0.70 }));
      disc2.position.set(innerW * 0.15, innerH * 0.22, 0.034);
      disc2.rotation.x = Math.PI / 2;
      artGroup.add(disc2);
    }

    // Linear brass gallery sconce mounted above frame
    const sconceArm = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.08, 8), champagneBronzeMat);
    sconceArm.position.set(0, height / 2 + 0.12, 0.08);
    sconceArm.rotation.x = Math.PI / 4;
    artGroup.add(sconceArm);

    const sconceBar = new THREE.Mesh(new THREE.BoxGeometry(width * 0.45, 0.025, 0.04), champagneBronzeMat);
    sconceBar.position.set(0, height / 2 + 0.15, 0.11);
    sconceBar.castShadow = true;
    artGroup.add(sconceBar);

    const sconceLens = new THREE.Mesh(new THREE.BoxGeometry(width * 0.40, 0.008, 0.025), inGroundLensMat);
    sconceLens.position.set(0, height / 2 + 0.135, 0.11);
    artGroup.add(sconceLens);

    scene.add(artGroup);
    return artGroup;
  };

  /** Architectural indoor flower pots in 3 curated styles. */
  const createHallwayFlowerPot = (
    px: number,
    pz: number,
    style: "fluted-fig" | "tripod-snake" | "stone-monstera",
    scale = 1.0
  ) => {
    const potGroup = new THREE.Group();
    potGroup.position.set(px, 0, pz);

    if (style === "fluted-fig") {
      // Style 1: Tall Fluted Ceramic Planter with Fiddle-Leaf Fig (Ficus Lyrata)
      const potHeight = 0.62 * scale;
      const potRadius = 0.22 * scale;
      const potGeo = new THREE.CylinderGeometry(potRadius, potRadius * 0.85, potHeight, 20);
      const potMesh = new THREE.Mesh(potGeo, potStoneMat);
      potMesh.position.y = potHeight / 2;
      potMesh.castShadow = true;
      potMesh.receiveShadow = true;
      potGroup.add(potMesh);

      const soil = new THREE.Mesh(new THREE.CylinderGeometry(potRadius * 0.95, potRadius * 0.95, 0.02, 16), mossPedestalMat);
      soil.position.y = potHeight - 0.01;
      potGroup.add(soil);

      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.022 * scale, 0.03 * scale, 0.85 * scale, 8), treeBarkMat);
      trunk.position.set(0, potHeight + 0.42 * scale, 0);
      trunk.castShadow = true;
      potGroup.add(trunk);

      const leafAngles = [0, 1.25, 2.5, 3.75, 5.0];
      leafAngles.forEach((angle, idx) => {
        const leafStem = new THREE.Mesh(new THREE.CylinderGeometry(0.008 * scale, 0.012 * scale, 0.16 * scale, 6), treeBarkMat);
        const leafY = potHeight + (0.35 + idx * 0.12) * scale;
        leafStem.position.set(Math.cos(angle) * 0.06 * scale, leafY, Math.sin(angle) * 0.06 * scale);
        leafStem.rotation.z = Math.PI / 4;
        leafStem.rotation.y = angle;
        potGroup.add(leafStem);

        const leafBlade = new THREE.Mesh(
          new THREE.SphereGeometry(0.14 * scale, 12, 10),
          idx % 2 === 0 ? foliageLimeMat : foliageMossMat
        );
        leafBlade.scale.set(0.65, 1.4, 0.3);
        leafBlade.position.set(Math.cos(angle) * 0.16 * scale, leafY + 0.06 * scale, Math.sin(angle) * 0.16 * scale);
        leafBlade.rotation.y = angle;
        leafBlade.rotation.x = 0.25;
        leafBlade.castShadow = true;
        potGroup.add(leafBlade);
      });
    } else if (style === "tripod-snake") {
      // Style 2: Sculptural Tripod Base with Sansevieria / Snake Plant
      const standH = 0.36 * scale;
      const baseRadius = 0.20 * scale;
      for (let l = 0; l < 3; l++) {
        const a = (l * Math.PI * 2) / 3;
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.012 * scale, 0.012 * scale, standH, 8), champagneBronzeMat);
        leg.position.set(Math.cos(a) * baseRadius * 0.7, standH / 2, Math.sin(a) * baseRadius * 0.7);
        leg.rotation.z = Math.sin(a) * 0.08;
        leg.rotation.x = -Math.cos(a) * 0.08;
        potGroup.add(leg);
      }
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.24 * scale, 0.18 * scale, 0.28 * scale, 18), castStoneMat);
      bowl.position.y = standH + 0.14 * scale;
      bowl.castShadow = true;
      potGroup.add(bowl);

      const soil2 = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * scale, 0.22 * scale, 0.02, 16), mossPedestalMat);
      soil2.position.y = standH + 0.27 * scale;
      potGroup.add(soil2);

      const bladeCount = 7;
      for (let b = 0; b < bladeCount; b++) {
        const ba = (b * Math.PI * 2) / bladeCount + 0.2;
        const bDist = 0.07 * scale + (b % 2) * 0.04 * scale;
        const bH = (0.42 + (b % 4) * 0.08) * scale;
        const sword = new THREE.Mesh(
          new THREE.BoxGeometry(0.045 * scale, bH, 0.012 * scale),
          b % 2 === 0 ? foliageEvergreenMat : foliageMossMat
        );
        sword.position.set(
          Math.cos(ba) * bDist,
          standH + 0.28 * scale + bH / 2,
          Math.sin(ba) * bDist
        );
        sword.rotation.y = ba;
        sword.rotation.z = Math.sin(ba) * 0.08;
        sword.castShadow = true;
        potGroup.add(sword);
      }
    } else {
      // Style 3: Honed Charcoal Stone Planter with Monstera Deliciosa
      const potGeo3 = new THREE.CylinderGeometry(0.25 * scale, 0.22 * scale, 0.44 * scale, 20);
      const potMesh3 = new THREE.Mesh(potGeo3, pebbleBasaltMat);
      potMesh3.position.y = 0.22 * scale;
      potMesh3.castShadow = true;
      potMesh3.receiveShadow = true;
      potGroup.add(potMesh3);

      const soil3 = new THREE.Mesh(new THREE.CylinderGeometry(0.23 * scale, 0.23 * scale, 0.02, 16), mossPedestalMat);
      soil3.position.y = 0.43 * scale;
      potGroup.add(soil3);

      const fanAngles = [0.4, 1.8, 3.2, 4.6, 5.8];
      fanAngles.forEach((fa, i) => {
        const archStem = new THREE.Mesh(new THREE.CylinderGeometry(0.012 * scale, 0.016 * scale, 0.32 * scale, 6), treeBarkMat);
        archStem.position.set(Math.cos(fa) * 0.08 * scale, 0.43 * scale + 0.14 * scale, Math.sin(fa) * 0.08 * scale);
        archStem.rotation.y = fa;
        archStem.rotation.x = 0.45;
        potGroup.add(archStem);

        const leafFan = new THREE.Mesh(
          new THREE.SphereGeometry(0.18 * scale, 12, 10),
          i % 2 === 0 ? foliageLimeMat : foliageEvergreenMat
        );
        leafFan.scale.set(1.3, 0.35, 1.1);
        leafFan.position.set(Math.cos(fa) * 0.24 * scale, 0.43 * scale + 0.26 * scale, Math.sin(fa) * 0.24 * scale);
        leafFan.rotation.y = fa;
        leafFan.castShadow = true;
        potGroup.add(leafFan);
      });
    }

    scene.add(potGroup);
    return potGroup;
  };

  /** Sculptural museum gallery plinth with geometric bronze artwork in hallway niches. */
  const createHallwayPedestalArt = (px: number, pz: number) => {
    const pedestalGroup = new THREE.Group();
    pedestalGroup.position.set(px, 0, pz);

    const plinth = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.82, 0.38),
      basaltPlinthMat
    );
    plinth.position.y = 0.41;
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    pedestalGroup.add(plinth);

    const sculptureGeo = new THREE.TorusKnotGeometry(0.12, 0.035, 48, 12);
    const sculpture = new THREE.Mesh(sculptureGeo, champagneBronzeMat);
    sculpture.position.y = 0.82 + 0.16;
    sculpture.castShadow = true;
    pedestalGroup.add(sculpture);

    scene.add(pedestalGroup);
    return pedestalGroup;
  };



  // ── 4. EAST CORRIDOR THRESHOLD / OASIS PORTAL TRANSITION (X = -4.8) ──
  createHallwayArtFrame(-4.71, -2.3, -Math.PI / 2, 1.1, 0.90, "arch");
  createHallwayFlowerPot(-4.40, -1.8, "stone-monstera", 1.05);
  createHallwayFlowerPot(-4.40, 1.8, "tripod-snake", 1.05);

  // ── 5. ARCHITECTURAL INTERIOR FLOOR LAMPS (HALLWAYS & OASIS) ─────────────────
  const createArchitecturalFloorLamp = (
    x: number,
    z: number,
    id?: StudioLightId,
    height = 1.95
  ) => {
    const lampGroup = new THREE.Group();
    lampGroup.position.set(x, 0, z);

    // Cast bronze plinth base
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.20, 0.05, 20),
      champagneBronzeMat
    );
    base.position.y = 0.025;
    base.castShadow = true;
    lampGroup.add(base);

    // Slender vertical bronze pole
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.016, height - 0.45, 12),
      champagneBronzeMat
    );
    stem.position.y = (height - 0.45) / 2 + 0.05;
    stem.castShadow = true;
    lampGroup.add(stem);

    // Architectural pleated diffuser shade
    const shade = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.22, 0.38, 20),
      castStoneMat
    );
    shade.position.y = height - 0.19;
    shade.castShadow = true;
    lampGroup.add(shade);

    // Interior warm bulb
    const bulbMat = new THREE.MeshStandardMaterial({
      color: 0xfff3dc,
      emissive: 0xffe8c8,
      emissiveIntensity: 1.2,
      roughness: 0.3,
    });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), bulbMat);
    bulb.position.y = height - 0.19;
    lampGroup.add(bulb);

    // Soft warm point light
    const lampLight = new THREE.PointLight(0xffe8c8, 5.2, 9.5, 1.3);
    lampLight.position.y = height - 0.19;
    lampLight.userData.onIntensity = 5.2;
    lampGroup.add(lampLight);

    const floorPool = createFloorPool(2.4, 0.45, 1.0, 1.0);
    lampGroup.add(floorPool);

    if (id) {
      registerLightFixture(id, {
        group: lampGroup,
        bulb,
        light: lampLight,
        floorPool,
        floorPoolBaseOpacity: 0.45,
        onIntensity: 5.2,
      });
    }

    scene.add(lampGroup);
    return lampGroup;
  };

  // 1. West Pavilion Library Niche Lamp
  createArchitecturalFloorLamp(-9.5, -5.2, "command-desk");

  // 2. Central Oasis Section Lamp
  createArchitecturalFloorLamp(1.8, 1.2, "lounge");

  // 3. Boardroom Hallway Lamp
  createArchitecturalFloorLamp(10.6, 1.2, "boardroom");

  // ─────────────────────────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────────
  // ── 2. CENTRAL INDOOR OASIS & LIVING PAVILION (EXPANDED OPTION A) ─────────────
  // ─────────────────────────────────────────────────────────────────────────────

  // ── OASIS MATERIALS (STYLED AFTER USER REFERENCE IMAGE) ─────────────────────
  const rockGreyBrownMat = new THREE.MeshStandardMaterial({
    color: 0x6e635b, // Warm earthy grey-brown granite / river stone (Reference image)
    roughness: 0.88,
    metalness: 0.05,
    flatShading: true,
  });

  const rockSlateMat = new THREE.MeshStandardMaterial({
    color: 0x54504b, // Deep mineral slate / dark charcoal stone
    roughness: 0.90,
    metalness: 0.05,
    flatShading: true,
  });

  const rockEarthMat = new THREE.MeshStandardMaterial({
    color: 0x827568, // Weathered sandstone / taupe mineral block
    roughness: 0.85,
    metalness: 0.04,
    flatShading: true,
  });

  const rockCreviceMat = new THREE.MeshStandardMaterial({
    color: 0x3d3935, // Deep shadow / crevice tone
    roughness: 0.92,
    metalness: 0.04,
    flatShading: true,
  });

  const oasisGrassBladeMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e, // Fresh vibrant green matching reference image
    roughness: 0.55,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });

  const grassDarkMat = new THREE.MeshStandardMaterial({
    color: 0x15803d, // Base shadow forest green
    roughness: 0.65,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });

  const pondBasinMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7, // Deep turquoise / azure pool basin floor (eliminates grey cast)
    roughness: 0.25,
    metalness: 0.15,
  });

  const pondRimMat = new THREE.MeshStandardMaterial({
    color: 0x8a5a36, // Warm Scandinavian oiled oak / teak wood coping (matches wooden aesthetic)
    roughness: 0.42,
    metalness: 0.08,
  });

  // ── PROCEDURAL OASIS BUILDERS ───────────────────────────────────────────────

  // Grass Tuft Generator (Curved fan blades hugging rock bases)
  const createGrassTuft = (
    gx: number,
    gy: number,
    gz: number,
    scale: number = 1.0,
    bladeCount: number = 5
  ) => {
    const tuft = new THREE.Group();
    tuft.position.set(gx, gy, gz);

    for (let b = 0; b < bladeCount; b++) {
      const bladeH = (0.22 + (b % 3) * 0.08) * scale;
      const bladeW = (0.045 + (b % 2) * 0.015) * scale;
      const bladeGeo = new THREE.ConeGeometry(bladeW, bladeH, 4);
      const isAlt = b % 2 === 0;
      const blade = new THREE.Mesh(bladeGeo, isAlt ? oasisGrassBladeMat : grassDarkMat);

      const fanAngle = (b - (bladeCount - 1) / 2) * 0.28;
      blade.position.set(Math.sin(fanAngle) * 0.06 * scale, bladeH / 2, 0);
      blade.rotation.z = fanAngle;
      blade.rotation.y = b * 0.6;
      blade.castShadow = true;
      tuft.add(blade);
    }
    return tuft;
  };

  // Stylized 3D Rock Generator (Reference-accurate faceted geometry with grass)
  const createStylizedRock = (
    rx: number,
    ry: number,
    rz: number,
    sx: number,
    sy: number,
    sz: number,
    rotY: number = 0,
    style: "pillar" | "block" | "slab" | "boulder" = "boulder",
    addGrass: boolean = true
  ) => {
    const group = new THREE.Group();
    group.position.set(rx, ry, rz);
    group.rotation.y = rotY;

    let rockGeo: THREE.BufferGeometry;
    if (style === "pillar") {
      // Tall standing monolith with beveled cuts (Reference Row 1 Col 1 & Row 5 Col 1)
      rockGeo = new THREE.CylinderGeometry(0.52, 0.72, 2.0, 7);
    } else if (style === "block") {
      // Faceted cube / prism (Reference Row 2 Col 4)
      rockGeo = new THREE.DodecahedronGeometry(0.8, 1);
    } else if (style === "slab") {
      // Flat tabular stepping stone (Reference Row 3 Col 1 & Row 6 Col 4)
      rockGeo = new THREE.CylinderGeometry(0.78, 0.92, 0.26, 8);
    } else {
      // Angular natural boulder (Reference Row 2 Col 1 & Row 4 Col 1)
      rockGeo = new THREE.IcosahedronGeometry(0.85, 0);
    }

    // Varied multi-tonal palette (grey-brown, mineral slate, weathered earth, crevice shadow)
    const rockPalette = [rockGreyBrownMat, rockSlateMat, rockEarthMat, rockCreviceMat];
    const matIndex =
      Math.abs(
        Math.floor(
          rx * 7.3 + rz * 11.1 + (style === "pillar" ? 1 : style === "slab" ? 2 : 0)
        )
      ) % rockPalette.length;
    const chosenMat = rockPalette[matIndex];

    const rockMesh = new THREE.Mesh(rockGeo, chosenMat);
    rockMesh.scale.set(sx, sy, sz);
    rockMesh.castShadow = true;
    rockMesh.receiveShadow = true;
    group.add(rockMesh);

    // Add tufts of grass hugging rock base as seen in reference image
    if (addGrass) {
      const tuftCount = style === "pillar" ? 3 : style === "slab" ? 2 : 4;
      for (let i = 0; i < tuftCount; i++) {
        const angle = (i * Math.PI * 2) / tuftCount + rx * 1.5;
        const radius = Math.max(sx, sz) * 0.72 + 0.05;
        const gx = Math.cos(angle) * radius;
        const gz = Math.sin(angle) * radius;
        const tuft = createGrassTuft(gx, -ry, gz, 0.85 + rand() * 0.35);
        group.add(tuft);
      }
    }

    scene.add(group);
    return group;
  };

  // ── INDOOR OASIS: CURVED ROUND POND & WATERFALL ───────────────────────────
  const poolX = 4.0;
  const poolZ = 1.0;
  const poolR = 2.2; // Perfectly curved round circular radius

  // Sunken basin floor in rich azure-turquoise pebble finish
  const basinFloorGeo = new THREE.CircleGeometry(poolR - 0.05, 64);
  const basinFloor = new THREE.Mesh(basinFloorGeo, pondBasinMat);
  basinFloor.rotation.x = -Math.PI / 2;
  basinFloor.position.set(poolX, -0.05, poolZ);
  basinFloor.receiveShadow = true;
  scene.add(basinFloor);

  // Aman Resort Sunken Basalt Pebble Reveal Margin (recessed border around coping rim)
  const pebbleMarginGeo = new THREE.RingGeometry(poolR + 0.12, poolR + 0.54, 64);
  const pebbleMargin = new THREE.Mesh(pebbleMarginGeo, pebbleBasaltMat);
  pebbleMargin.rotation.x = -Math.PI / 2;
  pebbleMargin.position.set(poolX, 0.012, poolZ);
  pebbleMargin.receiveShadow = true;
  scene.add(pebbleMargin);

  // Smooth Architectural Curved Limestone Coping Ring Rim
  const rimTorusGeo = new THREE.TorusGeometry(poolR, 0.14, 24, 64);
  const pondRim = new THREE.Mesh(rimTorusGeo, pondRimMat);
  pondRim.rotation.x = -Math.PI / 2;
  pondRim.scale.set(1.0, 1.0, 0.55);
  pondRim.position.set(poolX, 0.06, poolZ);
  pondRim.receiveShadow = true;
  pondRim.castShadow = true;
  scene.add(pondRim);

  // Concealed Undercoping Ambient Warm Wash (2700K indirect micro-LED water reflection)
  const copingGlow = new THREE.PointLight(0xffedd5, 0.95, 4.0);
  copingGlow.position.set(poolX, 0.15, poolZ);
  scene.add(copingGlow);

  // Floating Flamed Granite Pavers (Stepping stones from West promenade toward Oasis)
  const paverConfigs: [number, number, number, number][] = [
    [-0.10, 0.65, 0.08, 1.35],
    [0.45, 0.95, -0.04, 1.30],
    [0.98, 1.25, 0.06, 1.25],
  ];
  paverConfigs.forEach(([px, pz, protY, plen]) => {
    const paver = new THREE.Mesh(
      new THREE.BoxGeometry(plen, 0.035, 0.55),
      flamedGraniteMat
    );
    paver.position.set(px, 0.018, pz);
    paver.rotation.y = protY;
    paver.castShadow = true;
    paver.receiveShadow = true;
    scene.add(paver);
  });

  // Architectural Champagne Bronze Floor Datums (Flush inlay lines in terrazzo)
  const makeFloorDatum = (x: number, z: number, length: number, isAlongZ: boolean) => {
    const datumGeo = new THREE.BoxGeometry(
      isAlongZ ? 0.018 : length,
      0.006,
      isAlongZ ? length : 0.018
    );
    const datum = new THREE.Mesh(datumGeo, champagneBronzeMat);
    datum.position.set(x, 0.003, z);
    datum.receiveShadow = true;
    scene.add(datum);
  };

  // Longitudinal Spine separating West Wing offices from Central Courtyard
  makeFloorDatum(-4.75, 0.6, 11.4, true);
  // North Cross Datum connecting West Wing to East promenade
  makeFloorDatum(2.62, -2.2, 14.75, false);
  // South Cross Datum framing Central Promenade
  makeFloorDatum(2.62, 4.8, 14.75, false);

  // Dynamic Serene Water Surface (Cartesian Plane with Circular Mask — No Radial Star Reflections)
  const waterGeo = new THREE.PlaneGeometry(poolR * 2.15, poolR * 2.15, 32, 32);
  const waterShaderMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPondCenter: { value: new THREE.Vector2(poolX, poolZ) },
      uWaterfallOrigin: { value: new THREE.Vector2(poolX, -0.6) },
      uRadius: { value: poolR - 0.04 },
      uBaseColor: { value: new THREE.Color(0x0ea5e9) }, // Luminous Mediterranean cyan
      uDeepColor: { value: new THREE.Color(0x0284c7) }, // Deep serene azure
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldPos;

      void main() {
        vUv = uv;
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec2 uPondCenter;
      uniform vec2 uWaterfallOrigin;
      uniform float uRadius;
      uniform vec3 uBaseColor;
      uniform vec3 uDeepColor;
      varying vec2 vUv;
      varying vec3 vWorldPos;

      void main() {
        float distFromCenter = length(vWorldPos.xz - uPondCenter);
        if (distFromCenter > uRadius) {
          discard;
        }

        // Gentle concentric ripples radiating smoothly from the waterfall cascade
        float d = distance(vWorldPos.xz, uWaterfallOrigin);
        float wave = sin(d * 8.5 - uTime * 3.0) * exp(-d * 0.45);

        // Smooth, serene color gradient (calm azure-turquoise, zero star sparkle)
        float rippleWeight = wave * 0.5 + 0.5;
        vec3 col = mix(uDeepColor, uBaseColor, 0.6 + 0.3 * rippleWeight);

        // Soft antialiased rim fade against the limestone coping
        float edgeAlpha = smoothstep(uRadius, uRadius - 0.05, distFromCenter);

        gl_FragColor = vec4(col, 0.90 * edgeAlpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const waterMesh = new THREE.Mesh(waterGeo, waterShaderMat);
  waterMesh.rotation.x = -Math.PI / 2;
  waterMesh.position.set(poolX, 0.055, poolZ);
  scene.add(waterMesh);

  // Waterfalls removed as requested - tranquil reflecting pond remains


  // ── 3D STYLIZED ROCKS: NATURAL CASCADE HEADWALL FORMATION ──────────────────
  // Subterranean Crevice Deep Shadow Backing (behind backdrop boulder)
  const creviceBacking = new THREE.Mesh(
    new THREE.BoxGeometry(1.70, 1.80, 0.35),
    rockCreviceMat
  );
  creviceBacking.position.set(poolX, 0.90, -1.35);
  creviceBacking.receiveShadow = true;
  scene.add(creviceBacking);

  // Note: addGrass is set to false so rock auto-grass does not drop into the waterfall pool
  // Rear backdrop boulder (water emerges naturally below its crest)
  createStylizedRock(poolX, 0.95, -1.18, 1.45, 1.25, 0.95, 0.05, "boulder", false);

  // Left & Right flanking monolith pillars framing the gorge
  createStylizedRock(3.18, 0.88, -0.98, 0.95, 1.35, 0.90, 0.25, "pillar", false);
  createStylizedRock(4.82, 0.88, -0.98, 0.95, 1.35, 0.90, -0.25, "pillar", false);

  // Stepped horizontal stone weir ledges (water flows over these rock bodies)
  createStylizedRock(poolX, 0.65, -0.90, 1.30, 0.35, 0.75, 0, "slab", false);
  createStylizedRock(poolX, 0.30, -0.74, 1.40, 0.28, 0.70, 0.05, "slab", false);

  // Flanking low foundation blocks
  createStylizedRock(2.45, 0.38, -0.76, 1.15, 0.75, 0.90, -0.35, "block", false);
  createStylizedRock(5.55, 0.38, -0.76, 1.15, 0.75, 0.90, 0.35, "block", false);

  // ── IN-GROUND ARCHITECTURAL STONE GRAZERS (WARM GRAZING CONES) ───────────
  const createInGroundGrazer = (
    gx: number,
    gz: number,
    targetX: number,
    targetY: number,
    targetZ: number,
    intensity: number = 0.85
  ) => {
    const fixtureGroup = new THREE.Group();
    fixtureGroup.position.set(gx, 0.005, gz);

    const bezel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.065, 0.012, 16),
      inGroundBronzeMat
    );
    bezel.position.y = 0.006;
    fixtureGroup.add(bezel);

    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.045, 16), inGroundLensMat);
    lens.rotation.x = -Math.PI / 2;
    lens.position.y = 0.013;
    fixtureGroup.add(lens);
    scene.add(fixtureGroup);

    const spot = new THREE.SpotLight(0xfffaed, intensity, 4.5, Math.PI / 5.5, 0.42, 1.2);
    spot.position.set(gx, 0.03, gz);
    spot.target.position.set(targetX, targetY, targetZ);
    scene.add(spot);
    scene.add(spot.target);
    return spot;
  };

  // Waterfall gorge rock face grazer
  createInGroundGrazer(poolX, -0.42, poolX, 0.85, -0.90, 0.95);
  // Flanking rock pillar grazers
  createInGroundGrazer(3.15, -0.82, 3.18, 1.20, -0.98, 0.80);
  createInGroundGrazer(4.85, -0.82, 4.82, 1.20, -0.98, 0.80);
  // West monolith arc grazers
  createInGroundGrazer(1.10, 0.20, 0.96, 0.80, 0.18, 0.75);
  createInGroundGrazer(1.10, 1.80, 0.96, 0.80, 1.82, 0.75);

  // ── 360-DEGREE ORNAMENTAL GRASS RING AROUND POND CURVES ───────────────────
  // Follows the circular coping rim curve (outer coping edge at R = 2.34m)
  // Grass sits strictly on dry floor, wrapping 360 degrees and flanking the rock formation
  const pondGrassTuftCount = 32;
  for (let i = 0; i < pondGrassTuftCount; i++) {
    const angle = (i / pondGrassTuftCount) * Math.PI * 2;
    const r = 2.48 + (Math.sin(i * 3.7) * 0.5 + 0.5) * 0.16;
    let gx = poolX + Math.cos(angle) * r;
    let gz = poolZ + Math.sin(angle) * r;

    // Rock formation occupies North quadrant: X in [2.0, 6.0], Z in [-1.5, -0.2]
    // Redirect northern grass tufts so they hug the dry outer base and flanks of the rocks, never in the water
    if (gz < -0.15) {
      if (gx < poolX) {
        gx = Math.min(gx, 2.15);
        gz = -0.55 - (i % 3) * 0.22;
      } else {
        gx = Math.max(gx, 5.85);
        gz = -0.55 - (i % 3) * 0.22;
      }
    }

    const scale = 0.85 + (Math.cos(i * 2.3) * 0.5 + 0.5) * 0.45;
    const bladeCount = 5 + (i % 3);
    const tuft = createGrassTuft(gx, 0.04, gz, scale, bladeCount);
    scene.add(tuft);
  }

  // ── PROCEDURAL SMALL MONOLITH GENERATOR (ZEN GARDEN ARC) ─────────────────
  const createSmallMonolith = (
    mx: number,
    mz: number,
    height: number,
    radius: number,
    rotY: number = 0,
    tiltZ: number = 0,
    matIndex: number = 0
  ) => {
    const monoGroup = new THREE.Group();
    monoGroup.position.set(mx, 0, mz);
    monoGroup.rotation.y = rotY;
    monoGroup.rotation.z = tiltZ;

    // Tapered hexagonal/heptagonal column body
    const colGeo = new THREE.CylinderGeometry(radius * 0.76, radius, height, 6);
    const colMat =
      matIndex === 1
        ? rockSlateMat
        : matIndex === 2
        ? rockEarthMat
        : rockGreyBrownMat;
    const colMesh = new THREE.Mesh(colGeo, colMat);
    colMesh.position.y = height / 2;
    colMesh.castShadow = true;
    colMesh.receiveShadow = true;
    monoGroup.add(colMesh);

    // Beveled faceted chisel cap
    const capGeo = new THREE.ConeGeometry(radius * 0.78, radius * 0.38, 6);
    const capMesh = new THREE.Mesh(capGeo, colMat);
    capMesh.position.y = height + radius * 0.18;
    capMesh.rotation.y = Math.PI / 6;
    capMesh.castShadow = true;
    monoGroup.add(capMesh);

    // Base accent grass tufts hugging the monolith base
    const tuft1 = createGrassTuft(
      radius * 0.85,
      0,
      0.05,
      0.75 + rand() * 0.25,
      4
    );
    monoGroup.add(tuft1);
    const tuft2 = createGrassTuft(
      -radius * 0.65,
      0,
      radius * 0.6,
      0.65 + rand() * 0.2,
      4
    );
    monoGroup.add(tuft2);

    scene.add(monoGroup);
    return monoGroup;
  };

  // ── FRONT OF POND (WEST END): SMALL MONOLITH GROUPS IN ARC FORMATION ─────
  // (Shorter standing stones curving concentric to the west edge of the pond)

  // Cluster 1: North-West Arc Anchor (X = 1.45, Z = -0.65)
  createSmallMonolith(1.45, -0.65, 0.68, 0.20, 0.35, 0.04, 0);
  createSmallMonolith(1.68, -0.52, 0.44, 0.16, -0.2, -0.05, 1);
  createSmallMonolith(1.30, -0.80, 0.28, 0.13, 0.8, 0.06, 2);

  // Cluster 2: West-North-West Mid Arc (X = 0.96, Z = 0.18)
  createSmallMonolith(0.96, 0.18, 0.76, 0.22, 0.15, -0.04, 1);
  createSmallMonolith(1.18, 0.35, 0.50, 0.17, 0.5, 0.05, 0);
  createSmallMonolith(0.82, 0.02, 0.32, 0.14, -0.4, -0.03, 2);

  // Cluster 3: West-South-West Mid Arc (X = 0.96, Z = 1.82)
  createSmallMonolith(0.96, 1.82, 0.72, 0.21, -0.25, 0.05, 0);
  createSmallMonolith(1.18, 1.65, 0.48, 0.17, 0.3, -0.04, 2);
  createSmallMonolith(0.82, 1.98, 0.30, 0.13, 0.9, 0.04, 1);

  // Cluster 4: South-West Arc Anchor (X = 1.45, Z = 2.65)
  createSmallMonolith(1.45, 2.65, 0.62, 0.19, -0.4, -0.05, 1);
  createSmallMonolith(1.68, 2.50, 0.40, 0.15, 0.6, 0.04, 0);
  createSmallMonolith(1.30, 2.82, 0.26, 0.12, -0.1, 0.03, 2);

  // ── HERO SCULPTED CLOUD-TREES IN OASIS ──────────────────────────────────────
  // South-west cloud tree retained; the north-west tree was removed from the office-wing kitchen approach.
  createCloudTree(0.4, 3.0, 1.15, -0.5);

  // East Promenade framing trees
  createCloudTree(7.6, 3.2, 1.1, 0.6);
  createLayeredPine(7.6, -1.2, 1.2);



  // East promenade kept free of freestanding plinths and lounge objects.

  // ─────────────────────────────────────────────────────────────────────────────
  // ── 3. EAST LIVING LOUNGE & GALLERY (SHIFTED EASTWARD) ───────────────────────
  // ─────────────────────────────────────────────────────────────────────────────

  // East promenade intentionally remains open between the oasis and boardroom wing.

  // ── SOUTHERN OASIS BOTANICAL SOLARIUM & REFLECTION TERRACE ───────────────
  // Expanded southern sanctuary (10.2m x 5.1m, X in [0.8, 11.0], Z in [6.3, 11.4])
  // flowing directly from the Central Oasis into a floor-to-ceiling glass solarium
  // overlooking cosmic space, perimeter waterfalls, and the floating island.
  // Featuring an architectural raked gravel bed, flamed basalt stepping stones,
  // monolithic white-oak contemplation bench with linen cushions & sketching desk set,
  // live animated basalt reflection water basin with bronze spout & ripple waves,
  // handcrafted stone andon floor lanterns with breathing amber glow,
  // a deep-space celestial observatory telescope, Tibetan singing bowl altar,
  // a west bamboo cane living wall, and sculptural ceiling pergola fins.

  // 1. Organic Raked Basalt & Granite River Gravel Bed
  const solariumGravelMat = new THREE.MeshStandardMaterial({
    color: 0x3e3c3a, // Deep slate-basalt crushed stone bed
    roughness: 0.94,
    metalness: 0.04,
  });
  const solariumBed = new THREE.Mesh(
    new THREE.BoxGeometry(9.6, 0.04, 4.5),
    solariumGravelMat
  );
  solariumBed.position.set(5.9, 0.02, 8.85);
  solariumBed.receiveShadow = true;
  scene.add(solariumBed);

  // Teak & Bronze Coping Border around the gravel bed
  const solariumRimMat = new THREE.MeshStandardMaterial({
    color: 0x5a4632, // Oiled architectural teak border
    roughness: 0.65,
    metalness: 0.1,
  });
  const solariumRim = new THREE.Mesh(
    new THREE.BoxGeometry(9.74, 0.05, 4.64),
    solariumRimMat
  );
  solariumRim.position.set(5.9, 0.015, 8.85);
  solariumRim.receiveShadow = true;
  scene.add(solariumRim);

  // 2. Flamed Basalt Stepping Pavers Path (curving south toward the glass facade)
  const steppingStoneMat = new THREE.MeshStandardMaterial({
    color: 0x4a4744, // Flamed granite paver
    roughness: 0.82,
    metalness: 0.08,
  });
  const solariumSteppingCoords = [
    { x: 4.2, z: 6.8, rot: 0.08, w: 0.76, d: 0.48 },
    { x: 4.8, z: 7.5, rot: -0.12, w: 0.82, d: 0.52 },
    { x: 5.6, z: 8.2, rot: 0.05, w: 0.88, d: 0.54 },
    { x: 5.8, z: 9.0, rot: -0.04, w: 0.84, d: 0.50 },
    { x: 5.8, z: 9.9, rot: 0.06, w: 0.90, d: 0.52 },
    { x: 5.8, z: 10.7, rot: 0.0, w: 0.86, d: 0.50 },
  ];
  solariumSteppingCoords.forEach(({ x, z, rot, w, d }) => {
    const paver = new THREE.Mesh(
      new THREE.BoxGeometry(w, 0.04, d),
      steppingStoneMat
    );
    paver.position.set(x, 0.045, z);
    paver.rotation.y = rot;
    paver.receiveShadow = true;
    paver.castShadow = true;
    scene.add(paver);
  });

  // 3. Monolithic Basalt & White Oak Contemplation Bench with Artisan Ensemble
  const solariumBench = new THREE.Group();
  solariumBench.position.set(5.8, 0, 9.6);
  // Dual honed basalt block pedestals
  [-0.95, 0.95].forEach((bx) => {
    const pedestal = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.38, 0.54),
      basaltPlinthMat
    );
    pedestal.position.set(bx, 0.19, 0);
    pedestal.castShadow = true;
    pedestal.receiveShadow = true;
    solariumBench.add(pedestal);
  });
  // Solid cantilevering white-oak bench plank
  const benchSlab = new THREE.Mesh(
    new THREE.BoxGeometry(2.65, 0.09, 0.58),
    oakWoodMat
  );
  benchSlab.position.y = 0.425;
  benchSlab.castShadow = true;
  benchSlab.receiveShadow = true;
  solariumBench.add(benchSlab);
  // Bronze joining brackets
  [-0.95, 0.95].forEach((bx) => {
    const bracket = new THREE.Mesh(
      new THREE.BoxGeometry(0.40, 0.02, 0.56),
      champagneBronzeMat
    );
    bracket.position.set(bx, 0.375, 0);
    solariumBench.add(bracket);
  });

  // Bench Accessory A: Heather Oat Linen Meditation Seat Pad & Bolster
  const linenPadMat = new THREE.MeshStandardMaterial({
    color: 0xd6cebe,
    roughness: 0.92,
  });
  const seatPad = new THREE.Mesh(
    new THREE.BoxGeometry(0.68, 0.035, 0.46),
    linenPadMat
  );
  seatPad.position.set(-0.65, 0.485, 0.02);
  seatPad.castShadow = true;
  solariumBench.add(seatPad);

  const bolster = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.055, 0.44, 16),
    linenPadMat
  );
  bolster.rotation.x = Math.PI / 2;
  bolster.position.set(-0.65, 0.535, 0.18);
  bolster.castShadow = true;
  solariumBench.add(bolster);

  // Bench Accessory B: Hand-Thrown Celadon Ceramic Tea Service & Smoked Teak Tray
  const teaTrayMat = new THREE.MeshStandardMaterial({
    color: 0x2e251e,
    roughness: 0.72,
  });
  const teaTray = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.018, 0.22),
    teaTrayMat
  );
  teaTray.position.set(0.72, 0.48, -0.04);
  teaTray.castShadow = true;
  solariumBench.add(teaTray);

  const teacupMat = new THREE.MeshStandardMaterial({
    color: 0x7da48b, // Celadon jade glaze
    roughness: 0.22,
    metalness: 0.08,
  });
  const teacup = new THREE.Mesh(
    new THREE.CylinderGeometry(0.042, 0.032, 0.065, 16),
    teacupMat
  );
  teacup.position.set(0.66, 0.525, -0.04);
  teacup.castShadow = true;
  solariumBench.add(teacup);

  const teaLiquor = new THREE.Mesh(
    new THREE.CylinderGeometry(0.038, 0.038, 0.008, 14),
    new THREE.MeshStandardMaterial({ color: 0x3d301b, roughness: 0.1, metalness: 0.1 })
  );
  teaLiquor.position.set(0.66, 0.552, -0.04);
  solariumBench.add(teaLiquor);

  // Bamboo tea whisk (chasen) & brass saucer
  const saucer = new THREE.Mesh(
    new THREE.CylinderGeometry(0.058, 0.048, 0.008, 16),
    champagneBronzeMat
  );
  saucer.position.set(0.66, 0.495, -0.04);
  solariumBench.add(saucer);

  const whisk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.022, 0.06, 10),
    new THREE.MeshStandardMaterial({ color: 0xc8a97e, roughness: 0.85 })
  );
  whisk.position.set(0.78, 0.52, -0.02);
  whisk.rotation.z = 0.3;
  solariumBench.add(whisk);

  // Bench Accessory C: Open Architect's Journal & Brass Drafting Pencil
  const journalCover = new THREE.Mesh(
    new THREE.BoxGeometry(0.30, 0.015, 0.21),
    new THREE.MeshStandardMaterial({ color: 0x1f2329, roughness: 0.88 })
  );
  journalCover.position.set(0.05, 0.478, -0.02);
  journalCover.rotation.y = 0.06;
  solariumBench.add(journalCover);

  const pageMat = new THREE.MeshStandardMaterial({ color: 0xf6f2e8, roughness: 0.95 });
  const journalPageL = new THREE.Mesh(new THREE.BoxGeometry(0.135, 0.006, 0.19), pageMat);
  journalPageL.position.set(-0.015, 0.487, -0.02);
  journalPageL.rotation.y = 0.06;
  journalPageL.rotation.z = -0.03;
  solariumBench.add(journalPageL);

  const journalPageR = new THREE.Mesh(new THREE.BoxGeometry(0.135, 0.006, 0.19), pageMat);
  journalPageR.position.set(0.115, 0.487, -0.015);
  journalPageR.rotation.y = 0.06;
  journalPageR.rotation.z = 0.03;
  solariumBench.add(journalPageR);

  const draftingPencil = new THREE.Mesh(
    new THREE.CylinderGeometry(0.004, 0.004, 0.14, 8),
    champagneBronzeMat
  );
  draftingPencil.rotation.z = Math.PI / 2;
  draftingPencil.rotation.y = 0.25;
  draftingPencil.position.set(0.05, 0.493, -0.02);
  solariumBench.add(draftingPencil);

  scene.add(solariumBench);

  // 4. Honed Basalt Reflection Basin with Cast Bronze Spout & Animated Ripples
  const basinGroup = new THREE.Group();
  basinGroup.position.set(7.8, 0, 7.8);
  // Outer honed basalt drum
  const basinRim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.88, 0.94, 0.18, 32),
    basaltPlinthMat
  );
  basinRim.position.y = 0.09;
  basinRim.castShadow = true;
  basinRim.receiveShadow = true;
  basinGroup.add(basinRim);
  // Bronze lip accent
  const basinLip = new THREE.Mesh(
    new THREE.TorusGeometry(0.87, 0.018, 8, 36),
    champagneBronzeMat
  );
  basinLip.rotation.x = Math.PI / 2;
  basinLip.position.y = 0.18;
  basinGroup.add(basinLip);
  // Interior reflecting water pool
  const basinWater = new THREE.Mesh(
    new THREE.CylinderGeometry(0.82, 0.82, 0.03, 32),
    new THREE.MeshStandardMaterial({
      color: 0x0a2636,
      roughness: 0.08,
      metalness: 0.35,
    })
  );
  basinWater.position.y = 0.16;
  basinWater.receiveShadow = true;
  basinGroup.add(basinWater);

  // Cast Bronze Water Spout Pillar & Spout Arm
  const spoutPillar = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.54, 0.16),
    basaltPlinthMat
  );
  spoutPillar.position.set(0.82, 0.27, 0);
  spoutPillar.castShadow = true;
  basinGroup.add(spoutPillar);

  const spoutArm = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.05, 0.06),
    champagneBronzeMat
  );
  spoutArm.position.set(0.66, 0.48, 0);
  spoutArm.castShadow = true;
  basinGroup.add(spoutArm);

  const waterStream = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.015, 0.32, 10),
    new THREE.MeshStandardMaterial({
      color: 0xa5f3fc,
      roughness: 0.05,
      metalness: 0.1,
      transparent: true,
      opacity: 0.72,
    })
  );
  waterStream.position.set(0.50, 0.32, 0);
  basinGroup.add(waterStream);

  // 3 Concentric Animated Water Ripples on Basin Surface
  const rippleRings: THREE.Mesh[] = [];
  for (let r = 0; r < 3; r++) {
    const ringGeo = new THREE.RingGeometry(0.08, 0.10, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(0.50, 0.176, 0);
    basinGroup.add(ring);
    rippleRings.push(ring);
  }

  // Smooth accent river pebbles on basin rim
  for (let p = 0; p < 4; p++) {
    const pAngle = p * 1.57 + 0.4;
    const pebble = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 8, 6),
      rockSlateMat
    );
    pebble.scale.set(1.1, 0.45, 0.8);
    pebble.position.set(Math.cos(pAngle) * 0.80, 0.19, Math.sin(pAngle) * 0.80);
    basinGroup.add(pebble);
  }
  scene.add(basinGroup);

  // 5. Handcrafted Stone Andon Floor Lanterns with Breathing Amber Light Core
  const andonLights: THREE.PointLight[] = [];
  const createAndonLantern = (lx: number, lz: number, seed: number) => {
    const lantern = new THREE.Group();
    lantern.position.set(lx, 0, lz);

    // Honed basalt base block
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.08, 0.32),
      basaltPlinthMat
    );
    base.position.y = 0.04;
    base.receiveShadow = true;
    base.castShadow = true;
    lantern.add(base);

    // 4 Corner bronze framing posts
    [-0.12, 0.12].forEach((px) => {
      [-0.12, 0.12].forEach((pz) => {
        const post = new THREE.Mesh(
          new THREE.BoxGeometry(0.02, 0.36, 0.02),
          champagneBronzeMat
        );
        post.position.set(px, 0.26, pz);
        lantern.add(post);
      });
    });

    // Translucent Washi Rice-Paper Inner Screen
    const washiMat = new THREE.MeshStandardMaterial({
      color: 0xfff2d4,
      roughness: 0.82,
      emissive: 0xd97706,
      emissiveIntensity: 0.35,
      transparent: true,
      opacity: 0.88,
    });
    const washi = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.32, 0.24),
      washiMat
    );
    washi.position.y = 0.24;
    lantern.add(washi);

    // Beveled Pyramid Stone Roof Cap
    const capGeo = new THREE.ConeGeometry(0.26, 0.12, 4);
    const cap = new THREE.Mesh(capGeo, basaltPlinthMat);
    cap.rotation.y = Math.PI / 4;
    cap.position.y = 0.48;
    cap.castShadow = true;
    lantern.add(cap);

    // Bronze finial spire
    const finial = new THREE.Mesh(
      new THREE.SphereGeometry(0.022, 10, 8),
      champagneBronzeMat
    );
    finial.position.y = 0.56;
    lantern.add(finial);

    // Interior Warm Breathing Point Light
    const lanternLight = new THREE.PointLight(0xffb347, 0.42, 4.0, 2);
    lanternLight.position.set(0, 0.25, 0);
    lantern.add(lanternLight);
    andonLights.push(lanternLight);

    scene.add(lantern);
  };
  createAndonLantern(3.8, 7.0, 0);
  createAndonLantern(8.6, 10.6, 1.8);

  // 6. West Architectural Bamboo Cane Trough & Living Green Wall
  const bambooGroup = new THREE.Group();
  bambooGroup.position.set(1.15, 0, 8.85);

  const troughBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 0.30, 4.1),
    basaltPlinthMat
  );
  troughBody.position.y = 0.15;
  troughBody.receiveShadow = true;
  troughBody.castShadow = true;
  bambooGroup.add(troughBody);

  const troughLip = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.02, 4.12),
    champagneBronzeMat
  );
  troughLip.position.y = 0.31;
  bambooGroup.add(troughLip);

  const troughSoil = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.02, 4.0),
    new THREE.MeshStandardMaterial({ color: 0x24180d, roughness: 0.95 })
  );
  troughSoil.position.y = 0.29;
  bambooGroup.add(troughSoil);

  // 10 Segmented Bamboo Canes with Nodes & Leaf Spray Tufts
  const bambooStalks: THREE.Group[] = [];
  const bambooCulmMat = new THREE.MeshStandardMaterial({
    color: 0x748f48, // Fresh natural bamboo green
    roughness: 0.58,
    metalness: 0.06,
  });
  const bambooNodeMat = new THREE.MeshStandardMaterial({
    color: 0xa3b18a, // Pale bamboo nodal band
    roughness: 0.62,
    metalness: 0.08,
  });

  for (let b = 0; b < 10; b++) {
    const bz = -1.75 + (b * 3.5) / 9 + (Math.sin(b * 2.1) * 0.06);
    const bx = Math.sin(b * 3.3) * 0.04;
    const bHeight = 2.4 + (b % 4) * 0.28;
    const stalk = new THREE.Group();
    stalk.position.set(bx, 0.30, bz);

    // Culm segments
    const segments = 6;
    const segH = bHeight / segments;
    for (let s = 0; s < segments; s++) {
      const seg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.016, 0.019, segH * 0.94, 8),
        bambooCulmMat
      );
      seg.position.y = s * segH + segH * 0.47;
      seg.castShadow = true;
      stalk.add(seg);

      const nodeRing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.021, 0.021, 0.014, 8),
        bambooNodeMat
      );
      nodeRing.position.y = s * segH;
      stalk.add(nodeRing);
    }

    // Top Leaf Spray Lobes
    [-0.08, 0.08, 0].forEach((lx, li) => {
      const leafLobe = new THREE.Mesh(
        new THREE.SphereGeometry(0.14 + (li === 2 ? 0.06 : 0), 8, 8),
        li % 2 === 0 ? foliageLimeMat : foliageMossMat
      );
      leafLobe.scale.set(1.4, 0.35, 0.9);
      leafLobe.position.set(lx, bHeight - 0.15 + li * 0.12, (li - 1) * 0.06);
      leafLobe.rotation.z = (lx > 0 ? -0.4 : 0.4);
      stalk.add(leafLobe);
    });

    bambooGroup.add(stalk);
    bambooStalks.push(stalk);
  }
  scene.add(bambooGroup);

  // Linear floor uplight grazing the bamboo wall
  const bambooWash = new THREE.PointLight(0xffeedb, 0.45, 6.0, 2);
  bambooWash.position.set(1.4, 0.45, 8.85);
  scene.add(bambooWash);

  // 7. Deep-Space Celestial Observatory Telescope
  const telescopeGroup = new THREE.Group();
  telescopeGroup.position.set(9.8, 0, 10.4);
  telescopeGroup.rotation.y = 0.32; // Aimed through the south-east panoramic window

  // Heavy tripod base hub
  const tripodHub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 0.08, 12),
    monitorBezelMat
  );
  tripodHub.position.y = 1.08;
  telescopeGroup.add(tripodHub);

  // 3 Extending tripod legs with champagne bronze collars
  for (let t = 0; t < 3; t++) {
    const tAngle = (t * Math.PI * 2) / 3;
    const legLength = 1.18;
    const legGeo = new THREE.CylinderGeometry(0.018, 0.014, legLength, 8);
    const leg = new THREE.Mesh(legGeo, champagneBronzeMat);
    leg.position.set(
      Math.sin(tAngle) * 0.22,
      0.54,
      Math.cos(tAngle) * 0.22
    );
    leg.rotation.z = Math.sin(tAngle) * 0.32;
    leg.rotation.x = -Math.cos(tAngle) * 0.32;
    leg.castShadow = true;
    telescopeGroup.add(leg);

    // Spiked foot pad
    const foot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.024, 0.024, 0.03, 8),
      monitorBezelMat
    );
    foot.position.set(Math.sin(tAngle) * 0.42, 0.015, Math.cos(tAngle) * 0.42);
    telescopeGroup.add(foot);
  }

  // Azimuth Equatorial Mount & Knurled Adjusters
  const mountBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.08, 0.16, 12),
    champagneBronzeMat
  );
  mountBase.position.y = 1.20;
  telescopeGroup.add(mountBase);

  // Main Optical Tube (Pitched upward 24 degrees towards the cosmic sky)
  const otaAssembly = new THREE.Group();
  otaAssembly.position.set(0, 1.30, 0);
  otaAssembly.rotation.x = -0.42; // ~24 degrees altitude elevation

  const opticalTube = new THREE.Mesh(
    new THREE.CylinderGeometry(0.068, 0.072, 1.15, 18),
    new THREE.MeshStandardMaterial({
      color: 0x181a1d, // Satin obsidian black
      roughness: 0.32,
      metalness: 0.85,
    })
  );
  opticalTube.rotation.x = Math.PI / 2;
  opticalTube.castShadow = true;
  otaAssembly.add(opticalTube);

  // Champagne Bronze Barrel Rings & Dew Shield
  [-0.42, 0.0, 0.42].forEach((ry) => {
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(0.074, 0.074, 0.025, 18),
      champagneBronzeMat
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.z = ry;
    otaAssembly.add(ring);
  });

  // Front Objective Lens with Anti-Reflective Cyan Coating
  const lens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.066, 0.066, 0.012, 24),
    new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      roughness: 0.1,
      metalness: 0.4,
      transparent: true,
      opacity: 0.85,
    })
  );
  lens.rotation.x = Math.PI / 2;
  lens.position.z = 0.58;
  otaAssembly.add(lens);

  // 90-degree Star Diagonal Eyepiece
  const diagonal = new THREE.Mesh(
    new THREE.BoxGeometry(0.055, 0.055, 0.07),
    monitorBezelMat
  );
  diagonal.position.set(0, 0, -0.62);
  otaAssembly.add(diagonal);

  const eyepiece = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.024, 0.09, 12),
    champagneBronzeMat
  );
  eyepiece.position.set(0, 0.06, -0.62);
  otaAssembly.add(eyepiece);

  telescopeGroup.add(otaAssembly);
  scene.add(telescopeGroup);

  // 8. Authentic Tibetan Singing Bowl Altar on Honed Basalt Pedestal
  const singingBowlGroup = new THREE.Group();
  singingBowlGroup.position.set(4.4, 0, 8.8);

  // Cylindrical basalt pedestal
  const bowlPedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.20, 0.22, 0.36, 24),
    basaltPlinthMat
  );
  bowlPedestal.position.y = 0.18;
  bowlPedestal.receiveShadow = true;
  bowlPedestal.castShadow = true;
  singingBowlGroup.add(bowlPedestal);

  const bowlPedestalRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.198, 0.012, 8, 32),
    champagneBronzeMat
  );
  bowlPedestalRim.rotation.x = Math.PI / 2;
  bowlPedestalRim.position.y = 0.36;
  singingBowlGroup.add(bowlPedestalRim);

  // Imperial Crimson Silk Ring Cushion
  const silkCushion = new THREE.Mesh(
    new THREE.TorusGeometry(0.11, 0.035, 12, 24),
    new THREE.MeshStandardMaterial({
      color: 0x991b1b, // Deep imperial crimson
      roughness: 0.72,
    })
  );
  silkCushion.rotation.x = Math.PI / 2;
  silkCushion.position.y = 0.395;
  silkCushion.castShadow = true;
  singingBowlGroup.add(silkCushion);

  // Hand-Hammered Bronze Singing Bowl
  const bowlGeo = new THREE.SphereGeometry(0.13, 24, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  const singingBowl = new THREE.Mesh(bowlGeo, champagneBronzeMat);
  singingBowl.rotation.x = Math.PI;
  singingBowl.position.y = 0.49;
  singingBowl.castShadow = true;
  singingBowlGroup.add(singingBowl);

  const bowlLip = new THREE.Mesh(
    new THREE.TorusGeometry(0.128, 0.012, 8, 32),
    champagneBronzeMat
  );
  bowlLip.rotation.x = Math.PI / 2;
  bowlLip.position.y = 0.49;
  singingBowlGroup.add(bowlLip);

  // Turned Hardwood Striking Mallet
  const striker = new THREE.Mesh(
    new THREE.CylinderGeometry(0.014, 0.016, 0.18, 10),
    new THREE.MeshStandardMaterial({ color: 0x3d2716, roughness: 0.65 })
  );
  striker.rotation.z = Math.PI / 3;
  striker.position.set(0.10, 0.46, 0.08);
  singingBowlGroup.add(striker);

  scene.add(singingBowlGroup);

  // 10. Sculptural Specimen Flora Framing the Cosmic Panorama
  // West corner layered pine framing the glass return
  createLayeredPine(2.3, 9.8, 1.25);
  // West promenade transition tree
  createCloudTree(2.0, 7.4, 0.95, -0.3);

  // 11. Natural Basalt Monoliths & Weathered Boulders with Grass Tufts
  createSmallMonolith(3.2, 10.4, 0.68, 0.22, 0.2, -0.05, 0);
  createSmallMonolith(8.5, 10.2, 0.58, 0.20, -0.3, 0.04, 1);
  createSmallMonolith(3.3, 7.6, 0.48, 0.18, 0.5, 0.03, 2);
  createSmallMonolith(9.2, 7.4, 0.52, 0.19, -0.4, -0.04, 0);

  // 12. Warm Atmospheric Terrace Lighting & Soft Floor Uplights
  const solariumUplight1 = new THREE.PointLight(0xffeed8, 0.55, 7.5, 2);
  solariumUplight1.position.set(7.8, 0.45, 7.8);
  scene.add(solariumUplight1);

  const solariumUplight2 = new THREE.PointLight(0xffeed8, 0.48, 7.0, 2);
  solariumUplight2.position.set(2.3, 0.5, 9.8);
  scene.add(solariumUplight2);

  // 13. Dynamic Ambient Animation Handler for Solarium Life
  ambientUpdaters.push((time: number) => {
    const sec = time * 0.001;

    // A. Expanding water ripples from the bronze spout
    rippleRings.forEach((ring, i) => {
      const cycle = ((sec * 0.45 + i * 0.33) % 1.0);
      const scale = 0.5 + cycle * 4.2;
      ring.scale.set(scale, scale, 1);
      const mat = ring.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, 0.55 * (1.0 - cycle));
    });

    // B. Breathing amber glow on andon floor lanterns
    andonLights.forEach((light, i) => {
      light.intensity = 0.38 + 0.14 * Math.sin(sec * 1.8 + i * 2.2);
    });

    // C. Gentle micro-sway on bamboo stalks
    bambooStalks.forEach((stalk, i) => {
      stalk.rotation.z = Math.sin(sec * 1.2 + i * 0.7) * 0.015;
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // ── 4. ARCHIVE & STUDY LIBRARY — MINIMALIST RESEARCH SANCTUARY ───────────
  // Expanded east wing sanctuary (11.2m x 9.6m) overlooking cosmic space & satellite orbits.
  // Combines monolithic smoked oak research desks, illuminated architectural bookcases,
  // space-observation reading nook, and precision tech instrumentation.
  const studyWoolRugMat = new THREE.MeshStandardMaterial({
    color: 0x222326, // Heather charcoal-basalt acoustic wool rug
    roughness: 0.92,
    metalness: 0.02,
  });

  const librarySlatMat = new THREE.MeshStandardMaterial({
    color: 0x1a1917, // Anodized matte black steel & smoked timber
    roughness: 0.55,
    metalness: 0.35,
  });

  const shelfLedTestMat = new THREE.MeshBasicMaterial({
    color: 0xfff4e6, // Soft 3000K shelf edge-lit glow
  });

  // Architectural bronze perimeter reveal grounding the study carpet to the terrazzo floor
  const studyRugBorder = new THREE.Mesh(
    new THREE.BoxGeometry(8.46, 0.008, 7.06),
    champagneBronzeMat
  );
  studyRugBorder.position.set(16.6, 0.004, 6.6);
  studyRugBorder.receiveShadow = true;
  scene.add(studyRugBorder);

  // Large acoustic floor rug grounding the central research study area (calibrated flush into border)
  const studyRug = new THREE.Mesh(
    new THREE.BoxGeometry(8.40, 0.014, 7.00),
    studyWoolRugMat
  );
  studyRug.position.set(16.6, 0.009, 6.6);
  studyRug.receiveShadow = true;
  scene.add(studyRug);

  // ── CENTRAL CANTILEVERED STUDY & RESEARCH DESK ───────────────────────────
  // Monolithic dark smoked oak study table with chamfered profile and bronze plinth legs.
  // Reoriented to face the room and entrance with the bookshelf at its back.
  const studyDesk = new THREE.Group();
  studyDesk.position.set(16.6, 0, 7.6);

  const deskTop = new THREE.Mesh(
    new THREE.BoxGeometry(3.40, 0.075, 1.45),
    walnutMat
  );
  deskTop.position.y = 0.80;
  deskTop.castShadow = true;
  deskTop.receiveShadow = true;
  studyDesk.add(deskTop);

  // Embedded champagne bronze reveal band running beneath the tabletop perimeter
  const deskReveal = new THREE.Mesh(
    new THREE.BoxGeometry(3.41, 0.008, 1.46),
    champagneBronzeMat
  );
  deskReveal.position.y = 0.7665;
  studyDesk.add(deskReveal);

  // Twin architectural champagne bronze plinth legs with grounding shoes (resting flush at carpet top Y = 0.016)
  [-1.25, 1.25].forEach((lx) => {
    const plinth = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.7465, 1.15),
      champagneBronzeMat
    );
    plinth.position.set(lx, 0.38925, 0);
    plinth.castShadow = true;
    studyDesk.add(plinth);

    const shoe = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 0.020, 1.16),
      champagneBronzeMat
    );
    shoe.position.set(lx, 0.026, 0);
    studyDesk.add(shoe);
  });

  // Structural modesty panel / cable management spine spanning flush between plinth legs
  const modestyPanel = new THREE.Mesh(
    new THREE.BoxGeometry(2.26, 0.44, 0.035),
    librarySlatMat
  );
  modestyPanel.position.set(0, 0.48, -0.32);
  modestyPanel.castShadow = true;
  studyDesk.add(modestyPanel);

  // Under-desk shielded cable raceway
  const cableRaceway = new THREE.Mesh(
    new THREE.BoxGeometry(2.0, 0.04, 0.16),
    monitorBezelMat
  );
  cableRaceway.position.set(0, 0.68, -0.22);
  studyDesk.add(cableRaceway);

  // CNC champagne bronze cable grommets flush on desktop
  [-1.10, 1.10].forEach((gx) => {
    const grommet = new THREE.Mesh(
      new THREE.CylinderGeometry(0.032, 0.032, 0.006, 16),
      champagneBronzeMat
    );
    grommet.position.set(gx, 0.838, -0.42);
    studyDesk.add(grommet);
  });

  // ── DESK SURFACE: TRIPLE MONITOR SUITE & PRECISION TOOLS ──────────────────
  // Clean executive desk blotter (centered under keyboard & mouse workspace, top Y = 0.8435)
  const blotter = new THREE.Mesh(
    new THREE.BoxGeometry(1.45, 0.006, 0.54),
    deskBlotterMat
  );
  blotter.position.set(0, 0.8405, 0.10);
  studyDesk.add(blotter);

  // 1. CLEAN ARCHITECTURAL TRIPLE MONITOR STAND
  // Low-profile matte aluminum plinth base clamped / seated at back of desk
  const standBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.50, 0.012, 0.18),
    aluminumMat
  );
  standBase.position.set(0, 0.8435, -0.42);
  standBase.castShadow = true;
  studyDesk.add(standBase);

  // Twin vertical anodized black riser columns
  [-0.10, 0.10].forEach((colX) => {
    const col = new THREE.Mesh(
      new THREE.BoxGeometry(0.034, 0.42, 0.024),
      monitorBezelMat
    );
    col.position.set(colX, 1.06, -0.42);
    col.castShadow = true;
    studyDesk.add(col);
  });

  // Sturdy horizontal cantilever crossbar beam
  const crossbar = new THREE.Mesh(
    new THREE.BoxGeometry(1.55, 0.026, 0.024),
    monitorBezelMat
  );
  crossbar.position.set(0, 1.23, -0.40);
  crossbar.castShadow = true;
  studyDesk.add(crossbar);

  // 2. TRIPLE CURVED/ANGLED MONITOR ARRAY (Mathematically non-overlapping with 2.5cm gap)
  const codeScreenMat = new THREE.MeshBasicMaterial({ color: 0x111624 });
  const docScreenMat = new THREE.MeshBasicMaterial({ color: 0x0f151c });
  const telemetryScreenMat = new THREE.MeshBasicMaterial({ color: 0x131a22 });

  // A. Center Display (32" Frameless 16:9, width 0.74m, edges at X = ±0.370)
  const centerDisplay = new THREE.Mesh(
    new THREE.BoxGeometry(0.74, 0.44, 0.016),
    monitorBezelMat
  );
  centerDisplay.position.set(0, 1.23, -0.36);
  centerDisplay.rotation.x = -0.04;
  centerDisplay.castShadow = true;
  studyDesk.add(centerDisplay);

  const centerScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.72, 0.42),
    codeScreenMat
  );
  centerScreen.position.set(0, 1.23, -0.351);
  centerScreen.rotation.x = -0.04;
  studyDesk.add(centerScreen);

  // VESA bracket for center monitor
  const centerVesa = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.08, 0.035),
    aluminumMat
  );
  centerVesa.position.set(0, 1.23, -0.38);
  studyDesk.add(centerVesa);

  // B. Left Display (27", width 0.68m, angled inward 24° towards user, inner edge at X = -0.395, 2.5cm clear of center)
  const leftDisplayGroup = new THREE.Group();
  leftDisplayGroup.position.set(-0.705, 1.23, -0.201);
  leftDisplayGroup.rotation.y = 0.42;
  leftDisplayGroup.rotation.x = -0.04;

  const leftDisplay = new THREE.Mesh(
    new THREE.BoxGeometry(0.68, 0.44, 0.016),
    monitorBezelMat
  );
  leftDisplay.castShadow = true;
  leftDisplayGroup.add(leftDisplay);

  const leftScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.66, 0.42),
    docScreenMat
  );
  leftScreen.position.z = 0.009;
  leftDisplayGroup.add(leftScreen);

  const leftVesa = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.08, 0.03),
    aluminumMat
  );
  leftVesa.position.z = -0.02;
  leftDisplayGroup.add(leftVesa);
  studyDesk.add(leftDisplayGroup);

  // C. Right Display (27", width 0.68m, angled inward 24° towards user, inner edge at X = +0.395, 2.5cm clear of center)
  const rightDisplayGroup = new THREE.Group();
  rightDisplayGroup.position.set(0.705, 1.23, -0.201);
  rightDisplayGroup.rotation.y = -0.42;
  rightDisplayGroup.rotation.x = -0.04;

  const rightDisplay = new THREE.Mesh(
    new THREE.BoxGeometry(0.68, 0.44, 0.016),
    monitorBezelMat
  );
  rightDisplay.castShadow = true;
  rightDisplayGroup.add(rightDisplay);

  const rightScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.66, 0.42),
    telemetryScreenMat
  );
  rightScreen.position.z = 0.009;
  rightDisplayGroup.add(rightScreen);

  const rightVesa = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.08, 0.03),
    aluminumMat
  );
  rightVesa.position.z = -0.02;
  rightDisplayGroup.add(rightVesa);
  studyDesk.add(rightDisplayGroup);

  // 3. LOGITECH KEYBOARD WITH ROUNDED BUTTONS (Logitech MX Keys / Pebble Signature)
  const keyboardGroup = new THREE.Group();
  keyboardGroup.position.set(-0.06, 0.8435, 0.16);

  const kbBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 0.013, 0.12),
    monitorBezelMat
  );
  kbBody.position.y = 0.0065;
  kbBody.castShadow = true;
  keyboardGroup.add(kbBody);

  const roundedKeyMat = new THREE.MeshStandardMaterial({
    color: 0x222326,
    roughness: 0.55,
    metalness: 0.15,
  });

  const keyCols = 12;
  const keyRows = 4;
  const keyGeo = new THREE.CylinderGeometry(0.0052, 0.0052, 0.004, 12);
  for (let r = 0; r < keyRows; r++) {
    for (let c = 0; c < keyCols; c++) {
      if (r === keyRows - 1 && c >= 3 && c <= 8) continue;
      const keyMesh = new THREE.Mesh(keyGeo, roundedKeyMat);
      const kx = -0.14 + c * 0.025;
      const kz = -0.04 + r * 0.026;
      keyMesh.position.set(kx, 0.0145, kz);
      keyboardGroup.add(keyMesh);
    }
  }

  const spacebarGeo = new THREE.CylinderGeometry(0.0045, 0.0045, 0.11, 12);
  const spacebar = new THREE.Mesh(spacebarGeo, roundedKeyMat);
  spacebar.rotation.z = Math.PI / 2;
  spacebar.position.set(0, 0.0145, -0.04 + (keyRows - 1) * 0.026);
  keyboardGroup.add(spacebar);

  studyDesk.add(keyboardGroup);

  // 4. ERGONOMIC CONTOURED MOUSE (Logitech MX Master Style)
  const mouseGroup = new THREE.Group();
  mouseGroup.position.set(0.26, 0.8435, 0.16);

  const mouseBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.065, 0.030, 0.105),
    monitorBezelMat
  );
  mouseBody.position.y = 0.015;
  mouseBody.castShadow = true;
  mouseGroup.add(mouseBody);

  const thumbRest = new THREE.Mesh(
    new THREE.BoxGeometry(0.020, 0.012, 0.055),
    monitorBezelMat
  );
  thumbRest.position.set(-0.034, 0.009, 0.01);
  mouseGroup.add(thumbRest);

  const scrollWheel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0045, 0.0045, 0.008, 16),
    champagneBronzeMat
  );
  scrollWheel.rotation.z = Math.PI / 2;
  scrollWheel.position.set(0, 0.030, -0.026);
  mouseGroup.add(scrollWheel);

  studyDesk.add(mouseGroup);

  // 5. ARCHITECTURAL HEADPHONE STAND WITH OVER-EAR HEADPHONES (Left peripheral zone)
  const hpGroup = new THREE.Group();
  hpGroup.position.set(-1.08, 0.8375, 0.02);

  const hpBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.065, 0.07, 0.014, 24),
    champagneBronzeMat
  );
  hpBase.position.y = 0.007;
  hpBase.castShadow = true;
  hpGroup.add(hpBase);

  const hpStem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.006, 0.006, 0.28, 16),
    aluminumMat
  );
  hpStem.position.y = 0.15;
  hpStem.castShadow = true;
  hpGroup.add(hpStem);

  const hpCradle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.016, 0.016, 0.08, 16),
    walnutMat
  );
  hpCradle.rotation.x = Math.PI / 2;
  hpCradle.position.y = 0.29;
  hpGroup.add(hpCradle);

  const hpBand = new THREE.Mesh(
    new THREE.TorusGeometry(0.075, 0.009, 8, 24, Math.PI),
    monitorBezelMat
  );
  hpBand.position.set(0, 0.28, 0);
  hpBand.castShadow = true;
  hpGroup.add(hpBand);

  [-0.075, 0.075].forEach((cupX) => {
    const cup = new THREE.Mesh(
      new THREE.CylinderGeometry(0.034, 0.034, 0.024, 20),
      executiveLeatherMat
    );
    cup.rotation.z = Math.PI / 2;
    cup.position.set(cupX, 0.21, 0);
    cup.castShadow = true;
    hpGroup.add(cup);
  });

  studyDesk.add(hpGroup);

  // 6. SOPHISTICATED MINIMALIST WATER BOTTLE (Stealth matte obsidian vacuum flask, left flank)
  const bottleGroup = new THREE.Group();
  bottleGroup.position.set(-0.58, 0.8375, 0.10);

  const bottleCoaster = new THREE.Mesh(
    new THREE.CylinderGeometry(0.038, 0.038, 0.006, 24),
    monitorBezelMat
  );
  bottleCoaster.position.y = 0.003;
  bottleGroup.add(bottleCoaster);

  const bottleBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.036, 0.036, 0.19, 24),
    new THREE.MeshStandardMaterial({
      color: 0x1c1e22,
      roughness: 0.40,
      metalness: 0.50,
    })
  );
  bottleBody.position.y = 0.10;
  bottleBody.castShadow = true;
  bottleGroup.add(bottleBody);

  const bottleShoulder = new THREE.Mesh(
    new THREE.CylinderGeometry(0.026, 0.036, 0.03, 24),
    monitorBezelMat
  );
  bottleShoulder.position.y = 0.21;
  bottleGroup.add(bottleShoulder);

  const bottleCap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.027, 0.027, 0.026, 24),
    champagneBronzeMat
  );
  bottleCap.position.y = 0.238;
  bottleCap.castShadow = true;
  bottleGroup.add(bottleCap);

  studyDesk.add(bottleGroup);

  // 7. DESK ACCESSORIES: ARCHITECTURAL NOTEBOOK, PEN TRAY & CANTILEVER LAMP
  const openNotebook = new THREE.Mesh(
    new THREE.BoxGeometry(0.26, 0.014, 0.19),
    castStoneMat
  );
  openNotebook.position.set(0.56, 0.8445, 0.10);
  openNotebook.rotation.y = -0.10;
  studyDesk.add(openNotebook);

  const penTray = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.012, 0.20),
    champagneBronzeMat
  );
  penTray.position.set(0.56, 0.8435, -0.06);
  studyDesk.add(penTray);

  const stylus = new THREE.Mesh(
    new THREE.CylinderGeometry(0.004, 0.004, 0.15, 12),
    aluminumMat
  );
  stylus.rotation.x = Math.PI / 2;
  stylus.position.set(0.56, 0.8525, -0.06);
  studyDesk.add(stylus);

  // Minimal cantilevered brass desk lamp on far right corner
  const deskLampArm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.008, 0.45, 12),
    champagneBronzeMat
  );
  deskLampArm.position.set(1.25, 1.06, -0.36);
  studyDesk.add(deskLampArm);

  const deskLampHead = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.02, 0.04),
    champagneBronzeMat
  );
  deskLampHead.position.set(1.15, 1.28, -0.36);
  studyDesk.add(deskLampHead);

  const deskLampLight = new THREE.PointLight(0xfff0dc, 2.2, 4.0, 1.5);
  deskLampLight.position.set(1.15, 1.23, -0.36);
  studyDesk.add(deskLampLight);

  scene.add(studyDesk);

  // Primary ergonomic reading chair behind desk: backs the south bookshelf, faces north into the room and entrance (grounded at carpet top Y = 0.016)
  createErgonomicChair(16.6, 8.65, Math.PI, true, 0.016);

  // ── SOUTH WALL: MONOLITHIC BACKLIT ARCHITECTURAL BOOKSHELF ────────────────
  // Expansive 7.2m wide architectural bookcase grid along Z = 11.1
  const shelfZ = 11.12;
  const shelfXStart = 13.0;
  const shelfWidth = 7.2;
  const shelfLevels = 5;

  // Bookcase outer backing panel
  const shelfBacking = new THREE.Mesh(
    new THREE.BoxGeometry(shelfWidth, 3.4, 0.06),
    librarySlatMat
  );
  shelfBacking.position.set(16.6, 1.75, shelfZ + 0.14);
  shelfBacking.castShadow = true;
  scene.add(shelfBacking);

  // Horizontal illuminated shelf slabs
  for (let l = 0; l < shelfLevels; l++) {
    const shelfY = 0.35 + l * 0.65;
    const shelfSlab = new THREE.Mesh(
      new THREE.BoxGeometry(shelfWidth + 0.08, 0.04, 0.42),
      librarySlatMat
    );
    shelfSlab.position.set(16.6, shelfY, shelfZ);
    shelfSlab.castShadow = true;
    scene.add(shelfSlab);

    // Warm recessed LED light line on underside of each shelf
    const ledStrip = new THREE.Mesh(
      new THREE.BoxGeometry(shelfWidth - 0.2, 0.01, 0.03),
      shelfLedTestMat
    );
    ledStrip.position.set(16.6, shelfY - 0.025, shelfZ + 0.12);
    scene.add(ledStrip);

    // Recessed warm lighting strip is positioned above each tier
  }

  // ── ARCHITECTURAL LIBRARY MATERIALS & ANATOMICAL BOOK DETAIL ─────────────
  const bookPaperMat = new THREE.MeshStandardMaterial({
    color: 0xf3eee3, // Warm creamy ivory paper text block
    roughness: 0.94,
    metalness: 0.0,
  });

  const bookGiltMat = new THREE.MeshStandardMaterial({
    color: 0xc8a478, // Gilt bronze spine cords & foil stamping
    roughness: 0.45,
    metalness: 0.72,
  });

  const bookCoverMats = [
    new THREE.MeshStandardMaterial({ color: 0x3d1b22, roughness: 0.65 }), // Oxblood leather
    new THREE.MeshStandardMaterial({ color: 0x182535, roughness: 0.72 }), // Deep indigo buckram
    new THREE.MeshStandardMaterial({ color: 0x223425, roughness: 0.70 }), // Dark forest cloth
    new THREE.MeshStandardMaterial({ color: 0x3e2819, roughness: 0.68 }), // Smoked cognac calfskin
    new THREE.MeshStandardMaterial({ color: 0x1c1e22, roughness: 0.62 }), // Matte obsidian cloth
    new THREE.MeshStandardMaterial({ color: 0x2a3642, roughness: 0.74 }), // Slate buckram
    new THREE.MeshStandardMaterial({ color: 0xc8bea8, roughness: 0.86 }), // Natural linen / parchment
  ];

  const stonewareMat = new THREE.MeshStandardMaterial({
    color: 0xb2a692, // Turned sand stoneware ceramic
    roughness: 0.92,
    metalness: 0.05,
  });

  const basaltArtifactMat = new THREE.MeshStandardMaterial({
    color: 0x1a1b1d, // Honed basalt stone
    roughness: 0.85,
    metalness: 0.12,
  });

  // Helper: Detailed anatomical upright / leaning book
  const addDetailedBook = (
    bx: number,
    yBase: number,
    bz: number,
    w: number,
    h: number,
    d: number,
    coverMat: THREE.Material,
    rotZ = 0,
    ribs = true,
    ribbon = false
  ) => {
    const bookGroup = new THREE.Group();
    bookGroup.position.set(bx, yBase, bz);
    if (rotZ !== 0) bookGroup.rotation.z = rotZ;

    // 1. Hardcover boards & spine casing
    const cover = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      coverMat
    );
    cover.position.y = h / 2;
    cover.castShadow = true;
    bookGroup.add(cover);

    // 2. Exposed cream paper text block (slightly recessed inside cover on top/bottom and fore-edge)
    const paper = new THREE.Mesh(
      new THREE.BoxGeometry(w - 0.003, h - 0.006, d - 0.006),
      bookPaperMat
    );
    paper.position.set(0, h / 2, 0.003); // Fore-edge towards wall, spine towards room
    bookGroup.add(paper);

    // 3. Raised embossed spine cords (3 horizontal bands facing room at -Z)
    if (ribs) {
      for (let r = 0; r < 3; r++) {
        const ribY = h * 0.25 + r * (h * 0.25);
        const rib = new THREE.Mesh(
          new THREE.BoxGeometry(w + 0.002, 0.005, 0.004),
          bookGiltMat
        );
        rib.position.set(0, ribY, -d / 2 - 0.001);
        bookGroup.add(rib);
      }
    }

    // 4. Silk ribbon bookmark dangling from top edge
    if (ribbon) {
      const ribbonMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.008, 0.08, 0.002),
        champagneBronzeMat
      );
      ribbonMesh.position.set(0, h * 0.75, -d / 2 - 0.003);
      bookGroup.add(ribbonMesh);
    }

    scene.add(bookGroup);
  };

  // Helper: Horizontal stack of oversized art & architectural monographs
  const addHorizontalStack = (
    sx: number,
    yBase: number,
    sz: number,
    count: number,
    hasArtifact: "none" | "basalt" | "bronze" = "none"
  ) => {
    let currentY = yBase;
    const stackW = 0.24 + (count % 2) * 0.03;
    const stackD = 0.27;

    for (let s = 0; s < count; s++) {
      const bookH = 0.040 + (s % 3) * 0.008;
      const cMat = bookCoverMats[(s + count) % bookCoverMats.length];

      // Book cover
      const cover = new THREE.Mesh(
        new THREE.BoxGeometry(stackW, bookH, stackD),
        cMat
      );
      cover.position.set(sx, currentY + bookH / 2, sz);
      cover.castShadow = true;
      scene.add(cover);

      // Exposed paper block edge (visible on fore-edge & side)
      const paper = new THREE.Mesh(
        new THREE.BoxGeometry(stackW - 0.006, bookH - 0.005, stackD - 0.006),
        bookPaperMat
      );
      paper.position.set(sx, currentY + bookH / 2, sz + 0.003);
      scene.add(paper);

      currentY += bookH + 0.002;
    }

    // Optional sculptural paperweight topping the stack
    if (hasArtifact === "basalt") {
      const basaltPaperweight = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.038, 0),
        basaltArtifactMat
      );
      basaltPaperweight.position.set(sx, currentY + 0.035, sz);
      basaltPaperweight.castShadow = true;
      scene.add(basaltPaperweight);
    } else if (hasArtifact === "bronze") {
      const bronzeRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.035, 0.012, 12, 24),
        champagneBronzeMat
      );
      bronzeRing.rotation.x = Math.PI / 2;
      bronzeRing.position.set(sx, currentY + 0.015, sz);
      bronzeRing.castShadow = true;
      scene.add(bronzeRing);
    }
  };

  // Helper: Cast bronze L-shaped architectural bookend
  const addBookend = (ex: number, yBase: number, ez: number, isLeft = true) => {
    const bookend = new THREE.Group();
    bookend.position.set(ex, yBase, ez);

    const baseFlange = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 0.006, 0.16),
      champagneBronzeMat
    );
    baseFlange.position.set(isLeft ? 0.035 : -0.035, 0.003, 0);
    bookend.add(baseFlange);

    const verticalFlange = new THREE.Mesh(
      new THREE.BoxGeometry(0.008, 0.16, 0.16),
      champagneBronzeMat
    );
    verticalFlange.position.set(0, 0.08, 0);
    verticalFlange.castShadow = true;
    bookend.add(verticalFlange);

    scene.add(bookend);
  };

  // Helper: Minimalist stoneware ceramic vessel / sculptural urn
  const addCeramicVessel = (vx: number, yBase: number, vz: number, r = 0.065, h = 0.22) => {
    const vase = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 0.65, r, h, 20),
      stonewareMat
    );
    vase.position.set(vx, yBase + h / 2, vz);
    vase.castShadow = true;
    scene.add(vase);
  };

  // ── POPULATE 30 CURATED SHELF CUBBIES (6 BAYS × 5 TIERS) ─────────────────
  // Shelves run along shelfZ = 11.12 from X = 13.0 to 20.2 in 6 bays of 1.2m
  for (let l = 0; l < shelfLevels; l++) {
    const yBase = 0.35 + l * 0.65 + 0.02; // Sits directly on shelf slab

    for (let u = 0; u < 6; u++) {
      const bayLeft = shelfXStart + u * 1.2 + 0.08;
      const bayRight = shelfXStart + (u + 1) * 1.2 - 0.08;
      const bayCenter = (bayLeft + bayRight) / 2;
      const bayPattern = (u + l * 2) % 5;

      if (bayPattern === 0) {
        // Pattern 0: Academic Run — bookend, upright sequence, and casual leaning books
        addBookend(bayLeft, yBase, shelfZ, true);
        let currX = bayLeft + 0.04;
        for (let b = 0; b < 8; b++) {
          const bw = 0.028 + (b % 3) * 0.010;
          const bh = 0.24 + (b % 4) * 0.035;
          const bd = 0.22 + (b % 2) * 0.025;
          const cMat = bookCoverMats[(b + u + l) % bookCoverMats.length];
          addDetailedBook(currX + bw / 2, yBase, shelfZ, bw, bh, bd, cMat, 0, true, b === 3);
          currX += bw + 0.002;
        }
        // 2 books leaning at end of row
        const leanW = 0.034;
        const leanH = 0.28;
        addDetailedBook(currX + 0.03, yBase, shelfZ, leanW, leanH, 0.23, bookCoverMats[(u + 2) % bookCoverMats.length], -0.22, true);
        addDetailedBook(currX + 0.07, yBase, shelfZ, leanW, leanH * 0.95, 0.22, bookCoverMats[(u + 4) % bookCoverMats.length], -0.22, true);
        addBookend(currX + 0.16, yBase, shelfZ, false);

      } else if (bayPattern === 1) {
        // Pattern 1: Monograph Stack + Minimalist Ceramic Vessel
        addHorizontalStack(bayLeft + 0.16, yBase, shelfZ, 3, "basalt");
        addCeramicVessel(bayRight - 0.18, yBase, shelfZ, 0.075, 0.24);

        // 4 upright slim volumes between stack and vessel
        let currX = bayCenter - 0.06;
        for (let b = 0; b < 4; b++) {
          const bw = 0.025 + (b % 2) * 0.008;
          const bh = 0.26 + (b % 3) * 0.03;
          const cMat = bookCoverMats[(b * 2 + l) % bookCoverMats.length];
          addDetailedBook(currX + bw / 2, yBase, shelfZ, bw, bh, 0.21, cMat, 0, true);
          currX += bw + 0.002;
        }

      } else if (bayPattern === 2) {
        // Pattern 2: Fine Leather Collection with Gilt Ribs & Silk Bookmark
        let currX = bayLeft + 0.06;
        addBookend(currX, yBase, shelfZ, true);
        currX += 0.02;
        for (let b = 0; b < 9; b++) {
          const bw = 0.032 + (b % 3) * 0.012;
          const bh = 0.25 + (b % 5) * 0.025;
          const bd = 0.23 + (b % 2) * 0.02;
          const cMat = bookCoverMats[(b + l * 3) % bookCoverMats.length];
          addDetailedBook(currX + bw / 2, yBase, shelfZ, bw, bh, bd, cMat, 0, true, b === 4);
          currX += bw + 0.002;
        }
        addBookend(currX + 0.02, yBase, shelfZ, false);

      } else if (bayPattern === 3) {
        // Pattern 3: Curated Sculptural Alcove with Negative Space
        addCeramicVessel(bayLeft + 0.14, yBase, shelfZ, 0.06, 0.20);
        addHorizontalStack(bayRight - 0.18, yBase, shelfZ, 2, "bronze");

        // 5 upright architectural books with contrasting paper blocks
        let currX = bayCenter - 0.10;
        for (let b = 0; b < 5; b++) {
          const bw = 0.030 + (b % 2) * 0.012;
          const bh = 0.28 + (b % 3) * 0.025;
          const cMat = bookCoverMats[(b + u) % bookCoverMats.length];
          addDetailedBook(currX + bw / 2, yBase, shelfZ, bw, bh, 0.22, cMat, 0, true, b === 1);
          currX += bw + 0.002;
        }

      } else {
        // Pattern 4: Technical & Research Archive Run
        let currX = bayLeft + 0.04;
        for (let b = 0; b < 10; b++) {
          if (b === 6) {
            // Mid-shelf leaning pair
            addDetailedBook(currX + 0.02, yBase, shelfZ, 0.035, 0.27, 0.22, bookCoverMats[(b + 1) % bookCoverMats.length], 0.18, true);
            currX += 0.08;
            continue;
          }
          const bw = 0.026 + (b % 4) * 0.009;
          const bh = 0.23 + (b % 3) * 0.035;
          const bd = 0.21 + (b % 2) * 0.03;
          const cMat = bookCoverMats[(b + l) % bookCoverMats.length];
          addDetailedBook(currX + bw / 2, yBase, shelfZ, bw, bh, bd, cMat, 0, true);
          currX += bw + 0.002;
        }
      }
    }
  }

  // Vertical steel bookcase divider uprights
  for (let u = 0; u <= 6; u++) {
    const ux = shelfXStart + u * 1.2;
    const upright = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 3.4, 0.44),
      librarySlatMat
    );
    upright.position.set(ux, 1.75, shelfZ);
    upright.castShadow = true;
    scene.add(upright);
  }

  // ── BOOKSHELF WALL SCONCES ────────────────────────────────────────────────
  // 4 architectural brass picture-light sconces mounted above the top shelf
  // along the south wall (Z ≈ 11.18), illuminating the book collection below.
  // Spaced evenly across the 7.2m bookcase: X = 14.2, 15.8, 17.4, 19.0
  const sconcePositions = [14.2, 15.8, 17.4, 19.0];
  sconcePositions.forEach((sx) => {
    // Wall-mount backplate
    const backplate = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.10, 0.02),
      champagneBronzeMat
    );
    backplate.position.set(sx, 3.42, shelfZ + 0.16);
    backplate.castShadow = true;
    scene.add(backplate);

    // Cantilevered arm extending forward from wall
    const arm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006, 0.006, 0.22, 8),
      champagneBronzeMat
    );
    arm.position.set(sx, 3.42, shelfZ + 0.04);
    arm.rotation.x = Math.PI / 2;
    scene.add(arm);

    // Slim rectangular light head (angled slightly downward)
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.018, 0.035),
      champagneBronzeMat
    );
    head.position.set(sx, 3.40, shelfZ - 0.06);
    head.castShadow = true;
    scene.add(head);

    // Warm 2700K downward point light (distance 2.8m covers the full shelf height)
    const sconeLight = new THREE.PointLight(0xffe4c4, 1.8, 2.8, 1.8);
    sconeLight.position.set(sx, 3.36, shelfZ - 0.06);
    scene.add(sconeLight);
  });

  // ── EAST WINDOW-FACING READING & SPACE-OBSERVATION NOOK ──────────────────
  // Placed in the expanded northeast sector (X ~ 20.5, Z ~ 4.2)
  const loungeArea = new THREE.Group();
  loungeArea.position.set(20.4, 0, 4.5);

  // Minimalist deep-cushion reading lounge chair (angled towards the cosmic glass window)
  const loungeBase = new THREE.Mesh(
    new THREE.BoxGeometry(1.05, 0.32, 1.15),
    executiveLeatherMat
  );
  loungeBase.position.set(0, 0.22, 0);
  loungeBase.rotation.y = -Math.PI / 4;
  loungeBase.castShadow = true;
  loungeArea.add(loungeBase);

  const loungeBack = new THREE.Mesh(
    new THREE.BoxGeometry(1.05, 0.75, 0.22),
    executiveLeatherMat
  );
  loungeBack.position.set(-0.25, 0.65, -0.25);
  loungeBack.rotation.y = -Math.PI / 4;
  loungeBack.castShadow = true;
  loungeArea.add(loungeBack);

  // Low stone side table for reading books & hot drink
  const sideTable = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.32, 0.42, 24),
    castStoneMat
  );
  sideTable.position.set(-0.85, 0.21, 0.55);
  sideTable.castShadow = true;
  loungeArea.add(sideTable);

  // Precision brass floor telescope pointed out toward the satellite orbits
  const telescopeBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.28, 1.15, 12),
    champagneBronzeMat
  );
  telescopeBase.position.set(0.95, 0.58, -0.65);
  loungeArea.add(telescopeBase);

  const telescopeTube = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.065, 0.95, 16),
    champagneBronzeMat
  );
  telescopeTube.position.set(0.95, 1.25, -0.65);
  telescopeTube.rotation.z = -Math.PI / 6;
  telescopeTube.rotation.y = -Math.PI / 4;
  telescopeTube.castShadow = true;
  loungeArea.add(telescopeTube);

  scene.add(loungeArea);

  // Architectural reading floor lamp beside the reading lounge
  createArchitecturalFloorLamp(19.2, 5.8, undefined, 2.1);

  // ── WEST WALL ARCHIVAL JOINERY & SCULPTURAL BOTANICAL ────────────────────
  // Low modular credenza for engineering archives and hardware devices along west wall
  createExecutiveCredenza(11.45, 4.6, Math.PI / 2, 3.2);

  // Sculptural indoor oak tree with basalt plinth & soil bed in spacious southeast corner
  createIndoorOakTree(20.8, 10.2, 1.35);

  // Architectural floor lamp in northwest entry alcove framing the credenza
  createArchitecturalFloorLamp(11.8, 2.5, undefined, 1.95);

  // ── INTERACTIVE HITBOX (CLICK TO FOCUS THE STUDY) ────────────────────────
  const studyHitGeo = new THREE.BoxGeometry(5.2, 2.2, 4.2);
  const studyHit = new THREE.Mesh(studyHitGeo, hitBoxMat);
  studyHit.position.set(16.6, 1.1, 6.6);
  scene.add(studyHit);
  interactiveMeshes.set(studyHit, "boardroom");



  // ── 6. WEST WING ──────────────────────────────────────────────────────────
  // Legacy corridor trees were removed: one pierced the research-office wall
  // and the other overlapped the law-office visitor chairs.

  // ── 7. ATELIER KITCHEN & ESPRESSO BAR (NORTH WING BEHIND DEMARCATION WALL) ───
  // 1. Kitchen Center Island with Hangs & Barstools
  const createKitchenCenterIsland = (cx: number, cz: number) => {
    const group = new THREE.Group();
    group.position.set(cx, 0, cz);

    const baseW = 3.6;
    const baseD = 1.2;
    const baseH = 0.88;
    const baseMesh = new THREE.Mesh(
      new THREE.BoxGeometry(baseW, baseH, baseD),
      kitchenCabinetMat
    );
    baseMesh.position.set(0, baseH / 2, 0);
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    group.add(baseMesh);

    // Fluted fumed oak slats along the front/back
    const fluteCount = 28;
    for (let i = 0; i < fluteCount; i++) {
      const fx = -baseW / 2 + 0.1 + (i / (fluteCount - 1)) * (baseW - 0.2);
      const flute = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, baseH - 0.08, 0.02),
        fumedOakSlatMat
      );
      flute.position.set(fx, baseH / 2, baseD / 2 + 0.01);
      group.add(flute);
    }

    // Waterfall Honed Quartz Countertop
    const topW = 3.8;
    const topD = 1.45;
    const topThick = 0.08;
    const topMesh = new THREE.Mesh(
      new THREE.BoxGeometry(topW, topThick, topD),
      quartzCountertopMat
    );
    topMesh.position.set(0, baseH + topThick / 2, 0.08);
    topMesh.castShadow = true;
    topMesh.receiveShadow = true;
    group.add(topMesh);

    // Waterfall side panels cascading down to floor
    const waterfallLeft = new THREE.Mesh(
      new THREE.BoxGeometry(topThick, baseH + topThick, topD),
      quartzCountertopMat
    );
    waterfallLeft.position.set(-topW / 2 + topThick / 2, (baseH + topThick) / 2, 0.08);
    waterfallLeft.castShadow = true;
    group.add(waterfallLeft);

    const waterfallRight = new THREE.Mesh(
      new THREE.BoxGeometry(topThick, baseH + topThick, topD),
      quartzCountertopMat
    );
    waterfallRight.position.set(topW / 2 - topThick / 2, (baseH + topThick) / 2, 0.08);
    waterfallRight.castShadow = true;
    group.add(waterfallRight);

    // Centerpiece Bowl with Botanical Limes
    const bowl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.26, 0.16, 0.08, 18),
      potStoneMat
    );
    bowl.position.set(0, baseH + topThick + 0.04, 0.08);
    group.add(bowl);

    const limeGeo = new THREE.SphereGeometry(0.045, 10, 10);
    const limeMat = new THREE.MeshStandardMaterial({ color: 0x65a30d, roughness: 0.5 });
    const lime1 = new THREE.Mesh(limeGeo, limeMat);
    lime1.position.set(-0.04, baseH + topThick + 0.08, 0.06);
    group.add(lime1);
    const lime2 = new THREE.Mesh(limeGeo, limeMat);
    lime2.position.set(0.05, baseH + topThick + 0.08, 0.10);
    group.add(lime2);

    // South Barstools (3 modern stools)
    const stoolPositions = [-1.0, 0.0, 1.0];
    stoolPositions.forEach((sx) => {
      const stool = new THREE.Group();
      stool.position.set(sx, 0, 0.95);

      const legGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.65, 8);
      const leg1 = new THREE.Mesh(legGeo, champagneBronzeMat);
      leg1.position.set(-0.14, 0.325, -0.14);
      stool.add(leg1);
      const leg2 = new THREE.Mesh(legGeo, champagneBronzeMat);
      leg2.position.set(0.14, 0.325, -0.14);
      stool.add(leg2);
      const leg3 = new THREE.Mesh(legGeo, champagneBronzeMat);
      leg3.position.set(-0.14, 0.325, 0.14);
      stool.add(leg3);
      const leg4 = new THREE.Mesh(legGeo, champagneBronzeMat);
      leg4.position.set(0.14, 0.325, 0.14);
      stool.add(leg4);

      const footrest = new THREE.Mesh(
        new THREE.TorusGeometry(0.16, 0.01, 8, 20),
        champagneBronzeMat
      );
      footrest.rotation.x = Math.PI / 2;
      footrest.position.y = 0.22;
      stool.add(footrest);

      const seat = new THREE.Mesh(
        new THREE.CylinderGeometry(0.20, 0.19, 0.05, 24),
        slatTimberMat
      );
      seat.position.y = 0.66;
      seat.castShadow = true;
      stool.add(seat);

      group.add(stool);
    });

    // ── HANGS: Overhead Linear Pendant Light & Suspended Rack ──
    const rackW = 2.8;
    const rackD = 0.55;
    const rackY = 2.30;
    const rack = new THREE.Mesh(
      new THREE.BoxGeometry(rackW, 0.04, rackD),
      champagneBronzeMat
    );
    rack.position.set(0, rackY, 0.08);
    group.add(rack);

    const cableGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.45, 6);
    const cableCoords = [
      [-rackW / 2 + 0.15, rackD / 2 - 0.05],
      [rackW / 2 - 0.15, rackD / 2 - 0.05],
      [-rackW / 2 + 0.15, -rackD / 2 + 0.05],
      [rackW / 2 - 0.15, -rackD / 2 + 0.05],
    ];
    cableCoords.forEach(([ccx, ccz]) => {
      const cable = new THREE.Mesh(cableGeo, champagneBronzeMat);
      cable.position.set(ccx, rackY + 0.225, 0.08 + ccz);
      group.add(cable);
    });

    const downlightPositions = [-0.9, 0.0, 0.9];
    downlightPositions.forEach((dx) => {
      const downlight = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.045, 0.18, 16),
        champagneBronzeMat
      );
      downlight.position.set(dx, rackY - 0.09, 0.08);
      group.add(downlight);

      const lens = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.015, 16),
        pendantLightWarmGlow
      );
      lens.position.set(dx, rackY - 0.18, 0.08);
      group.add(lens);
    });

    scene.add(group);
    return group;
  };

  // 2. North Wall Preparation Counter with Backsplash & Sink
  const createNorthKitchenCounter = (startX: number, endX: number, cz: number) => {
    const group = new THREE.Group();
    const length = endX - startX;
    const centerX = (startX + endX) / 2;
    group.position.set(centerX, 0, cz);

    const counterH = 0.90;
    const counterD = 0.70;

    const baseMesh = new THREE.Mesh(
      new THREE.BoxGeometry(length, counterH, counterD),
      kitchenCabinetMat
    );
    baseMesh.position.set(0, counterH / 2, 0);
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    group.add(baseMesh);

    const doorCount = Math.floor(length / 0.75);
    for (let i = 0; i < doorCount; i++) {
      const dx = -length / 2 + 0.375 + i * (length / doorCount);
      const handle = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.02, 0.025),
        champagneBronzeMat
      );
      handle.position.set(dx, counterH - 0.12, counterD / 2 + 0.015);
      group.add(handle);
    }

    const topMesh = new THREE.Mesh(
      new THREE.BoxGeometry(length + 0.04, 0.06, counterD + 0.04),
      quartzCountertopMat
    );
    topMesh.position.set(0, counterH + 0.03, 0.02);
    topMesh.castShadow = true;
    topMesh.receiveShadow = true;
    group.add(topMesh);

    const splashH = 0.75;
    const splashMesh = new THREE.Mesh(
      new THREE.BoxGeometry(length + 0.04, splashH, 0.04),
      smokedGlassMat
    );
    splashMesh.position.set(0, counterH + 0.06 + splashH / 2, -counterD / 2 + 0.02);
    group.add(splashMesh);

    // Undermount Stainless Sink & Gooseneck Faucet
    const sinkBasin = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.22, 0.44),
      basaltPlinthMat
    );
    sinkBasin.position.set(2.8, counterH - 0.08, 0.02);
    group.add(sinkBasin);

    const faucetBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.025, 0.30, 12),
      chromeTrimMat
    );
    faucetBase.position.set(2.8, counterH + 0.20, -0.16);
    group.add(faucetBase);

    const faucetSpout = new THREE.Mesh(
      new THREE.TorusGeometry(0.10, 0.016, 8, 16, Math.PI),
      chromeTrimMat
    );
    faucetSpout.rotation.z = Math.PI;
    faucetSpout.position.set(2.8, counterH + 0.35, -0.06);
    group.add(faucetSpout);

    // Soap Pump Dispenser
    const soapPump = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.024, 0.12, 10),
      chromeTrimMat
    );
    soapPump.position.set(3.35, counterH + 0.09, -0.14);
    group.add(soapPump);

    // Paper Towel Stand
    const paperStand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.065, 0.22, 14),
      ceramicMugCreamMat
    );
    paperStand.position.set(2.15, counterH + 0.14, -0.12);
    group.add(paperStand);

    // Culinary Utensil Crock with Spoons
    const utensilCrock = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.05, 0.14, 12),
      ceramicMugSageMat
    );
    utensilCrock.position.set(3.65, counterH + 0.10, -0.12);
    group.add(utensilCrock);

    // Integrated Undercounter Dishwasher
    const dwDoor = new THREE.Mesh(
      new THREE.BoxGeometry(0.68, counterH - 0.12, 0.02),
      samsungSteelMat
    );
    dwDoor.position.set(4.1, counterH / 2, counterD / 2 + 0.015);
    group.add(dwDoor);

    const dwHandle = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.025, 0.03),
      chromeTrimMat
    );
    dwHandle.position.set(4.1, counterH - 0.10, counterD / 2 + 0.035);
    group.add(dwHandle);

    const dwLed = new THREE.Mesh(
      new THREE.SphereGeometry(0.008, 8, 8),
      telemetryGlowMat
    );
    dwLed.position.set(4.38, counterH - 0.06, counterD / 2 + 0.028);
    group.add(dwLed);

    // Countertop 2-Slice Toaster
    const toaster = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.19, 0.18),
      chromeTrimMat
    );
    toaster.position.set(-1.8, counterH + 0.125, -0.05);
    toaster.castShadow = true;
    group.add(toaster);

    // Electric Gooseneck Pour-Over Kettle
    const kettle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.08, 0.20, 12),
      basaltPlinthMat
    );
    kettle.position.set(-1.3, counterH + 0.13, -0.05);
    kettle.castShadow = true;
    group.add(kettle);

    scene.add(group);
    return group;
  };

  // 3. Double-Door Samsung Bespoke Smart Refrigerator
  const createSamsungSmartFridge = (cx: number, cz: number) => {
    const fridge = new THREE.Group();
    fridge.position.set(cx, 0, cz);

    const w = 1.15;
    const h = 2.05;
    const d = 0.88;

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      samsungSteelMat
    );
    body.position.set(0, h / 2, 0);
    body.castShadow = true;
    body.receiveShadow = true;
    fridge.add(body);

    // Bottom Freezer Drawer
    const freezerH = 0.68;
    const freezer = new THREE.Mesh(
      new THREE.BoxGeometry(w - 0.04, freezerH - 0.04, 0.05),
      samsungSteelMat
    );
    freezer.position.set(0, freezerH / 2 + 0.04, d / 2 + 0.025);
    fridge.add(freezer);

    const freezerHandle = new THREE.Mesh(
      new THREE.BoxGeometry(0.60, 0.03, 0.03),
      chromeTrimMat
    );
    freezerHandle.position.set(0, freezerH - 0.08, d / 2 + 0.05);
    fridge.add(freezerHandle);

    // Top Section: Left French Door with Water/Ice Dispenser
    const doorH = 1.25;
    const doorW = (w - 0.06) / 2;
    const doorY = freezerH + 0.06 + doorH / 2;
    const leftDoor = new THREE.Mesh(
      new THREE.BoxGeometry(doorW, doorH, 0.05),
      samsungSteelMat
    );
    leftDoor.position.set(-doorW / 2 - 0.01, doorY, d / 2 + 0.025);
    fridge.add(leftDoor);

    const dispenserAlcove = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.32, 0.03),
      basaltPlinthMat
    );
    dispenserAlcove.position.set(-doorW / 2 - 0.01, doorY + 0.05, d / 2 + 0.045);
    fridge.add(dispenserAlcove);

    const dispenserSpout = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.02, 0.03),
      chromeTrimMat
    );
    dispenserSpout.position.set(-doorW / 2 - 0.01, doorY + 0.17, d / 2 + 0.055);
    fridge.add(dispenserSpout);

    // Top Section: Right French Door with Samsung Family Hub Screen
    const rightDoor = new THREE.Mesh(
      new THREE.BoxGeometry(doorW, doorH, 0.05),
      samsungSteelMat
    );
    rightDoor.position.set(doorW / 2 + 0.01, doorY, d / 2 + 0.025);
    fridge.add(rightDoor);

    const screenW = 0.34;
    const screenH = 0.62;
    const smartScreen = new THREE.Mesh(
      new THREE.BoxGeometry(screenW, screenH, 0.01),
      familyHubScreenMat
    );
    smartScreen.position.set(doorW / 2 + 0.01, doorY + 0.10, d / 2 + 0.055);
    fridge.add(smartScreen);

    const uiBar = new THREE.Mesh(
      new THREE.BoxGeometry(screenW - 0.06, 0.02, 0.005),
      telemetryGlowMat
    );
    uiBar.position.set(doorW / 2 + 0.01, doorY + 0.34, d / 2 + 0.062);
    fridge.add(uiBar);

    const uiWidget1 = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.08, 0.005),
      pendantLightWarmGlow
    );
    uiWidget1.position.set(doorW / 2 - 0.06, doorY + 0.16, d / 2 + 0.062);
    fridge.add(uiWidget1);

    // Vertical Pocket Handles
    const handleL = new THREE.Mesh(
      new THREE.BoxGeometry(0.025, 0.45, 0.03),
      champagneBronzeMat
    );
    handleL.position.set(-0.02, doorY - 0.15, d / 2 + 0.045);
    fridge.add(handleL);

    const handleR = new THREE.Mesh(
      new THREE.BoxGeometry(0.025, 0.45, 0.03),
      champagneBronzeMat
    );
    handleR.position.set(0.02, doorY - 0.15, d / 2 + 0.045);
    fridge.add(handleR);

    scene.add(fridge);
    return fridge;
  };

  // 4. Countertop Microwave
  const createMicrowave = (cx: number, cy: number, cz: number) => {
    const micro = new THREE.Group();
    micro.position.set(cx, cy, cz);

    const w = 0.62;
    const h = 0.38;
    const d = 0.42;

    const chassis = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      chromeTrimMat
    );
    chassis.position.set(0, h / 2, 0);
    chassis.castShadow = true;
    micro.add(chassis);

    const doorW = 0.42;
    const doorH = 0.32;
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(doorW, doorH, 0.02),
      microwaveGlassMat
    );
    door.position.set(-w / 2 + doorW / 2 + 0.03, h / 2, d / 2 + 0.01);
    micro.add(door);

    const controlPanel = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, doorH, 0.02),
      basaltPlinthMat
    );
    controlPanel.position.set(w / 2 - 0.08, h / 2, d / 2 + 0.01);
    micro.add(controlPanel);

    const ledDisplay = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 0.04, 0.005),
      digitalClockLedMat
    );
    ledDisplay.position.set(w / 2 - 0.08, h / 2 + 0.10, d / 2 + 0.022);
    micro.add(ledDisplay);

    const handle = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.22, 0.03),
      chromeTrimMat
    );
    handle.position.set(-w / 2 + doorW + 0.015, h / 2, d / 2 + 0.025);
    micro.add(handle);

    scene.add(micro);
    return micro;
  };

  // 5. Commercial Espresso Coffee Maker & Ceramic Cups
  const createCoffeeStation = (cx: number, cy: number, cz: number) => {
    const station = new THREE.Group();
    station.position.set(cx, cy, cz);

    const mW = 0.72;
    const mH = 0.46;
    const mD = 0.48;
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(mW, mH, mD),
      chromeTrimMat
    );
    body.position.set(0, mH / 2, 0);
    body.castShadow = true;
    station.add(body);

    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(mW - 0.04, 0.04, mD - 0.04),
      champagneBronzeMat
    );
    rail.position.set(0, mH + 0.02, 0);
    station.add(rail);

    const groupAlcove = new THREE.Mesh(
      new THREE.BoxGeometry(mW - 0.12, 0.22, 0.12),
      basaltPlinthMat
    );
    groupAlcove.position.set(0, 0.16, mD / 2 - 0.04);
    station.add(groupAlcove);

    [-0.14, 0.14].forEach((px) => {
      const groupHead = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.05, 12),
        chromeTrimMat
      );
      groupHead.position.set(px, 0.22, mD / 2 - 0.04);
      station.add(groupHead);

      const handle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.014, 0.016, 0.14, 8),
        fumedOakSlatMat
      );
      handle.rotation.x = Math.PI / 2;
      handle.position.set(px, 0.20, mD / 2 + 0.06);
      station.add(handle);
    });

    const wand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, 0.18, 8),
      chromeTrimMat
    );
    wand.rotation.z = 0.3;
    wand.position.set(-mW / 2 + 0.08, 0.16, mD / 2);
    station.add(wand);

    const gauge = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, 0.015, 16),
      champagneBronzeMat
    );
    gauge.rotation.x = Math.PI / 2;
    gauge.position.set(0.24, mH - 0.08, mD / 2 + 0.008);
    station.add(gauge);

    // Presentation Tray with Ceramic Coffee Cups
    const tray = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.025, 0.40),
      fumedOakSlatMat
    );
    tray.position.set(0.78, 0.015, 0.04);
    station.add(tray);

    const mugCoords: [number, number, THREE.Material][] = [
      [0.65, -0.06, ceramicMugSageMat],
      [0.78, -0.06, ceramicMugTerracottaMat],
      [0.91, -0.06, ceramicMugCreamMat],
      [0.70, 0.08, ceramicMugCreamMat],
      [0.85, 0.08, ceramicMugSageMat],
    ];

    mugCoords.forEach(([mx, mz, mat]) => {
      const mug = new THREE.Group();
      mug.position.set(mx, 0.03, mz);

      const mugBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.042, 0.036, 0.085, 14),
        mat
      );
      mugBody.position.y = 0.0425;
      mugBody.castShadow = true;
      mug.add(mugBody);

      const mugHandle = new THREE.Mesh(
        new THREE.TorusGeometry(0.022, 0.006, 6, 12, Math.PI),
        mat
      );
      mugHandle.rotation.y = Math.PI / 2;
      mugHandle.position.set(0.045, 0.045, 0);
      mug.add(mugHandle);

      station.add(mug);
    });

    scene.add(station);
    return station;
  };

  // 6. Bottleless Water Dispenser
  const createWaterDispenser = (cx: number, cz: number) => {
    const dispenser = new THREE.Group();
    dispenser.position.set(cx, 0, cz);

    const w = 0.36;
    const h = 1.25;
    const d = 0.38;

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      waterDispenserTowerMat
    );
    body.position.set(0, h / 2, 0);
    body.castShadow = true;
    body.receiveShadow = true;
    dispenser.add(body);

    const alcove = new THREE.Mesh(
      new THREE.BoxGeometry(w - 0.06, 0.32, 0.16),
      basaltPlinthMat
    );
    alcove.position.set(0, 0.76, d / 2 - 0.06);
    dispenser.add(alcove);

    const tray = new THREE.Mesh(
      new THREE.BoxGeometry(w - 0.08, 0.02, 0.14),
      chromeTrimMat
    );
    tray.position.set(0, 0.61, d / 2 - 0.06);
    dispenser.add(tray);

    [-0.045, 0.045].forEach((sx) => {
      const spout = new THREE.Mesh(
        new THREE.CylinderGeometry(0.008, 0.008, 0.04, 8),
        chromeTrimMat
      );
      spout.position.set(sx, 0.88, d / 2 - 0.06);
      dispenser.add(spout);
    });

    const ledCold = new THREE.Mesh(
      new THREE.SphereGeometry(0.01, 8, 8),
      ledColdMat
    );
    ledCold.position.set(-0.04, 1.08, d / 2 + 0.005);
    dispenser.add(ledCold);

    const ledHot = new THREE.Mesh(
      new THREE.SphereGeometry(0.01, 8, 8),
      ledHotMat
    );
    ledHot.position.set(0.04, 1.08, d / 2 + 0.005);
    dispenser.add(ledHot);

    scene.add(dispenser);
    return dispenser;
  };

  // 7. Dual-Compartment Recycling & Waste Station
  const createKitchenTrashStation = (cx: number, cz: number) => {
    const trash = new THREE.Group();
    trash.position.set(cx, 0, cz);

    const w = 0.52;
    const h = 0.74;
    const d = 0.38;

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      samsungSteelMat
    );
    body.position.set(0, h / 2, 0);
    body.castShadow = true;
    body.receiveShadow = true;
    trash.add(body);

    const lidW = (w - 0.04) / 2;
    const lidL = new THREE.Mesh(
      new THREE.BoxGeometry(lidW, 0.03, d + 0.02),
      basaltPlinthMat
    );
    lidL.position.set(-lidW / 2 - 0.01, h + 0.015, 0);
    trash.add(lidL);

    const lidR = new THREE.Mesh(
      new THREE.BoxGeometry(lidW, 0.03, d + 0.02),
      basaltPlinthMat
    );
    lidR.position.set(lidW / 2 + 0.01, h + 0.015, 0);
    trash.add(lidR);

    // Color indicators: Blue for dry mixed recycling, silver for general waste
    const recycleBadge = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.005, 0.08),
      ledColdMat
    );
    recycleBadge.position.set(-lidW / 2 - 0.01, h + 0.032, 0);
    trash.add(recycleBadge);

    const generalBadge = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.005, 0.08),
      chromeTrimMat
    );
    generalBadge.position.set(lidW / 2 + 0.01, h + 0.032, 0);
    trash.add(generalBadge);

    // Dual bottom foot pedals
    [-lidW / 2 - 0.01, lidW / 2 + 0.01].forEach((px) => {
      const pedal = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.02, 0.06),
        chromeTrimMat
      );
      pedal.position.set(px, 0.02, d / 2 + 0.03);
      trash.add(pedal);
    });

    scene.add(trash);
    return trash;
  };

  // 8. Walk-In Pantry Room with Multi-Tier Snack Shelves, South Credenza & Butcher-Block Island
  const createWalkInPantry = (cx: number, cz: number) => {
    const pantry = new THREE.Group();
    pantry.position.set(cx, 0, cz);

    // ── A. NORTH SHELVING UNIT (L = 3.8m along X, Z = -6.75) ──
    const northShelfGroup = new THREE.Group();
    northShelfGroup.position.set(0, 0, -2.15); // Relative to cx=15.5, cz=-4.5 -> Z = -6.65

    const nW = 3.8;
    const nD = 0.42;
    const tiers = [0.45, 0.95, 1.45, 1.95];

    // Slender vertical bronze uprights
    const uprightGeo = new THREE.BoxGeometry(0.035, 2.2, 0.035);
    [-nW / 2 + 0.05, -nW / 6, nW / 6, nW / 2 - 0.05].forEach((ux) => {
      const post = new THREE.Mesh(uprightGeo, champagneBronzeMat);
      post.position.set(ux, 1.1, 0);
      northShelfGroup.add(post);
    });

    // 4 tiers of White Oak Shelves with warm LED underglow
    tiers.forEach((ty, tIdx) => {
      const shelf = new THREE.Mesh(
        new THREE.BoxGeometry(nW, 0.035, nD),
        slatTimberMat
      );
      shelf.position.set(0, ty, 0);
      shelf.castShadow = true;
      shelf.receiveShadow = true;
      northShelfGroup.add(shelf);

      // Warm LED underglow strip beneath each shelf
      const ledStrip = new THREE.Mesh(
        new THREE.BoxGeometry(nW - 0.1, 0.01, 0.03),
        pendantLightWarmGlow
      );
      ledStrip.position.set(0, ty - 0.02, 0);
      northShelfGroup.add(ledStrip);

      if (tIdx === 0) {
        // Bottom Tier: Rows of chilled beverage cans & sparkling water
        const canCount = 12;
        for (let c = 0; c < canCount; c++) {
          const sx = -nW / 2 + 0.35 + c * ((nW - 0.7) / (canCount - 1));
          const canMat = c % 3 === 0 ? ledColdMat : c % 3 === 1 ? telemetryGlowMat : chromeTrimMat;
          const can = new THREE.Mesh(
            new THREE.CylinderGeometry(0.032, 0.032, 0.12, 10),
            canMat
          );
          can.position.set(sx, ty + 0.08, (c % 2 === 0 ? -0.06 : 0.06));
          can.castShadow = true;
          northShelfGroup.add(can);
        }
      } else if (tIdx === 1) {
        // Second Tier: Snack boxes (protein bars, artisanal granolas, chips)
        const boxCount = 9;
        const boxColors = [ceramicMugSageMat, ceramicMugTerracottaMat, ceramicMugCreamMat];
        for (let b = 0; b < boxCount; b++) {
          const bx = -nW / 2 + 0.35 + b * ((nW - 0.7) / (boxCount - 1));
          const bMat = boxColors[b % boxColors.length];
          const box = new THREE.Mesh(
            new THREE.BoxGeometry(0.18, 0.22, 0.12),
            bMat
          );
          box.position.set(bx, ty + 0.13, 0);
          box.castShadow = true;
          northShelfGroup.add(box);
        }
      } else if (tIdx === 2) {
        // Third Tier: Glass storage canisters with cork lids
        const jarCount = 8;
        for (let j = 0; j < jarCount; j++) {
          const jx = -nW / 2 + 0.4 + j * ((nW - 0.8) / (jarCount - 1));
          const jar = new THREE.Mesh(
            new THREE.CylinderGeometry(0.06, 0.06, 0.18, 12),
            smokedGlassMat
          );
          jar.position.set(jx, ty + 0.10, 0);
          jar.castShadow = true;
          northShelfGroup.add(jar);

          const cork = new THREE.Mesh(
            new THREE.CylinderGeometry(0.055, 0.055, 0.03, 10),
            treeBarkMat
          );
          cork.position.set(jx, ty + 0.205, 0);
          northShelfGroup.add(cork);
        }
      } else {
        // Top Tier: Artisanal tea caddies and decorative pantry baskets
        const basketCount = 5;
        for (let k = 0; k < basketCount; k++) {
          const kx = -nW / 2 + 0.5 + k * ((nW - 1.0) / (basketCount - 1));
          const basket = new THREE.Mesh(
            new THREE.BoxGeometry(0.32, 0.16, 0.24),
            fumedOakSlatMat
          );
          basket.position.set(kx, ty + 0.10, 0);
          northShelfGroup.add(basket);
        }
      }
    });

    // Sleek bronze library ladder leaning against north shelving
    const ladder = new THREE.Group();
    ladder.position.set(-1.1, 0, 0.12);
    ladder.rotation.x = -0.16;
    const railGeo = new THREE.CylinderGeometry(0.012, 0.012, 2.2, 8);
    [-0.18, 0.18].forEach((rx) => {
      const rail = new THREE.Mesh(railGeo, champagneBronzeMat);
      rail.position.set(rx, 1.1, 0);
      ladder.add(rail);
    });
    for (let r = 0; r < 6; r++) {
      const rung = new THREE.Mesh(
        new THREE.CylinderGeometry(0.008, 0.008, 0.36, 8),
        slatTimberMat
      );
      rung.rotation.z = Math.PI / 2;
      rung.position.set(0, 0.35 + r * 0.32, 0);
      ladder.add(rung);
    }
    northShelfGroup.add(ladder);

    pantry.add(northShelfGroup);

    // ── B. EAST SHELVING UNIT (L = 3.6m along Z, X = 17.4) ──
    const eastShelfGroup = new THREE.Group();
    eastShelfGroup.position.set(1.9, 0, 0); // Relative to cx=15.5 -> X = 17.4

    const eD = 3.6;
    const eW = 0.40;

    [-eD / 2 + 0.05, -eD / 6, eD / 6, eD / 2 - 0.05].forEach((uz) => {
      const post = new THREE.Mesh(uprightGeo, champagneBronzeMat);
      post.position.set(0, 1.1, uz);
      eastShelfGroup.add(post);
    });

    tiers.forEach((ty, tIdx) => {
      const shelf = new THREE.Mesh(
        new THREE.BoxGeometry(eW, 0.035, eD),
        slatTimberMat
      );
      shelf.position.set(0, ty, 0);
      shelf.castShadow = true;
      shelf.receiveShadow = true;
      eastShelfGroup.add(shelf);

      const ledStrip = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.01, eD - 0.1),
        pendantLightWarmGlow
      );
      ledStrip.position.set(0, ty - 0.02, 0);
      eastShelfGroup.add(ledStrip);

      const itemCount = 7;
      for (let i = 0; i < itemCount; i++) {
        const iz = -eD / 2 + 0.35 + i * ((eD - 0.7) / (itemCount - 1));
        if (tIdx === 1 || tIdx === 2) {
          const jar = new THREE.Mesh(
            new THREE.CylinderGeometry(0.05, 0.05, 0.16, 10),
            smokedGlassMat
          );
          jar.position.set(0, ty + 0.09, iz);
          eastShelfGroup.add(jar);
          const cork = new THREE.Mesh(
            new THREE.CylinderGeometry(0.045, 0.045, 0.025, 8),
            treeBarkMat
          );
          cork.position.set(0, ty + 0.18, iz);
          eastShelfGroup.add(cork);
        } else {
          const crate = new THREE.Mesh(
            new THREE.BoxGeometry(0.24, 0.14, 0.28),
            fumedOakSlatMat
          );
          crate.position.set(0, ty + 0.08, iz);
          eastShelfGroup.add(crate);
        }
      }
    });

    pantry.add(eastShelfGroup);

    // ── C. SOUTH CREDENZA COUNTER (L = 3.6m along X, Z = -2.35) ──
    const southCredenza = new THREE.Group();
    southCredenza.position.set(0, 0, 2.15); // Relative to cx=15.5, cz=-4.5 -> Z = -2.35

    const cW = 3.6;
    const cD = 0.50;
    const cH = 0.90;

    const credenzaBase = new THREE.Mesh(
      new THREE.BoxGeometry(cW, cH, cD),
      kitchenCabinetMat
    );
    credenzaBase.position.set(0, cH / 2, 0);
    credenzaBase.castShadow = true;
    credenzaBase.receiveShadow = true;
    southCredenza.add(credenzaBase);

    const credenzaTop = new THREE.Mesh(
      new THREE.BoxGeometry(cW + 0.04, 0.05, cD + 0.04),
      quartzCountertopMat
    );
    credenzaTop.position.set(0, cH + 0.025, 0);
    credenzaTop.castShadow = true;
    credenzaTop.receiveShadow = true;
    southCredenza.add(credenzaTop);

    // Undercounter Glass-Front Chilled Beverage & Kombucha Cooler (at X = -1.1)
    const coolerDoor = new THREE.Mesh(
      new THREE.BoxGeometry(0.65, cH - 0.10, 0.03),
      microwaveGlassMat
    );
    coolerDoor.position.set(-1.1, cH / 2, cD / 2 + 0.015);
    southCredenza.add(coolerDoor);

    const coolerGlow = new THREE.Mesh(
      new THREE.BoxGeometry(0.58, cH - 0.16, 0.01),
      telemetryGlowMat
    );
    coolerGlow.position.set(-1.1, cH / 2, cD / 2 - 0.05);
    southCredenza.add(coolerGlow);

    // Triple Gravity Dry-Snack Dispensers (mounted at X = 0.2)
    const dispenserBacking = new THREE.Mesh(
      new THREE.BoxGeometry(0.68, 0.04, 0.08),
      champagneBronzeMat
    );
    dispenserBacking.position.set(0.2, cH + 0.35, -0.12);
    southCredenza.add(dispenserBacking);

    [-0.20, 0.0, 0.20].forEach((dx, dIdx) => {
      const cylinder = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.055, 0.32, 14),
        smokedGlassMat
      );
      cylinder.position.set(0.2 + dx, cH + 0.32, -0.06);
      southCredenza.add(cylinder);

      const fillerMat = dIdx === 0 ? slatTimberMat : dIdx === 1 ? ceramicMugTerracottaMat : ceramicMugCreamMat;
      const filler = new THREE.Mesh(
        new THREE.CylinderGeometry(0.048, 0.048, 0.24, 12),
        fillerMat
      );
      filler.position.set(0.2 + dx, cH + 0.28, -0.06);
      southCredenza.add(filler);

      const knob = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.03, 10),
        champagneBronzeMat
      );
      knob.rotation.x = Math.PI / 2;
      knob.position.set(0.2 + dx, cH + 0.12, 0.02);
      southCredenza.add(knob);
    });

    // Specialty Coffee Chemex Pour-Over Bar (at X = 1.1)
    const chemexStand = new THREE.Mesh(
      new THREE.TorusGeometry(0.08, 0.012, 8, 16),
      champagneBronzeMat
    );
    chemexStand.rotation.x = Math.PI / 2;
    chemexStand.position.set(1.1, cH + 0.18, 0);
    southCredenza.add(chemexStand);

    const chemex = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.07, 0.20, 14),
      smokedGlassMat
    );
    chemex.position.set(1.1, cH + 0.14, 0);
    southCredenza.add(chemex);

    const chemexCollar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.046, 0.05, 0.04, 14),
      treeBarkMat
    );
    chemexCollar.position.set(1.1, cH + 0.14, 0);
    southCredenza.add(chemexCollar);

    pantry.add(southCredenza);

    // ── D. CENTRAL BUTCHER-BLOCK TASTING ISLAND ──
    const island = new THREE.Group();
    island.position.set(-0.1, 0, 0.05);

    const iW = 1.45;
    const iD = 0.90;
    const iH = 0.92;

    const blockTop = new THREE.Mesh(
      new THREE.BoxGeometry(iW, 0.09, iD),
      slatTimberMat
    );
    blockTop.position.set(0, iH - 0.045, 0);
    blockTop.castShadow = true;
    blockTop.receiveShadow = true;
    island.add(blockTop);

    const iLegGeo = new THREE.BoxGeometry(0.08, iH - 0.09, 0.08);
    [-iW / 2 + 0.08, iW / 2 - 0.08].forEach((lx) => {
      [-iD / 2 + 0.08, iD / 2 - 0.08].forEach((lz) => {
        const leg = new THREE.Mesh(iLegGeo, fumedOakSlatMat);
        leg.position.set(lx, (iH - 0.09) / 2, lz);
        leg.castShadow = true;
        island.add(leg);
      });
    });

    const lowerShelf = new THREE.Mesh(
      new THREE.BoxGeometry(iW - 0.12, 0.03, iD - 0.12),
      fumedOakSlatMat
    );
    lowerShelf.position.set(0, 0.24, 0);
    island.add(lowerShelf);

    [-0.32, 0.32].forEach((bx) => {
      const crate = new THREE.Mesh(
        new THREE.BoxGeometry(0.38, 0.16, 0.44),
        champagneBronzeMat
      );
      crate.position.set(bx, 0.34, 0);
      island.add(crate);
    });

    const fruitTierBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.03, 16),
      champagneBronzeMat
    );
    fruitTierBase.position.set(0.2, iH + 0.015, 0);
    island.add(fruitTierBase);

    const fruitTierTop = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.03, 16),
      champagneBronzeMat
    );
    fruitTierTop.position.set(0.2, iH + 0.16, 0);
    island.add(fruitTierTop);

    const tierPole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.01, 0.01, 0.24, 8),
      champagneBronzeMat
    );
    tierPole.position.set(0.2, iH + 0.12, 0);
    island.add(tierPole);

    const fruitGeo = new THREE.SphereGeometry(0.035, 8, 8);
    const fruitAppleMat = new THREE.MeshStandardMaterial({ color: 0x84cc16, roughness: 0.4 });
    const fruitOrangeMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.5 });
    [-0.07, 0.05].forEach((fx, idx) => {
      const f = new THREE.Mesh(fruitGeo, idx % 2 === 0 ? fruitAppleMat : fruitOrangeMat);
      f.position.set(0.2 + fx, iH + 0.045, 0.04);
      island.add(f);
    });

    const tastingDish1 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.05, 0.04, 12),
      ceramicMugTerracottaMat
    );
    tastingDish1.position.set(-0.35, iH + 0.02, -0.12);
    island.add(tastingDish1);

    const tastingDish2 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.05, 0.04, 12),
      ceramicMugSageMat
    );
    tastingDish2.position.set(-0.35, iH + 0.02, 0.12);
    island.add(tastingDish2);

    pantry.add(island);

    // ── E. OVERHEAD WARM SPOTLIGHTS ──
    [-0.8, 0.8].forEach((sz) => {
      const spot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.04, 12),
        champagneBronzeMat
      );
      spot.position.set(0, 2.65, sz);
      pantry.add(spot);

      const spotLens = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.035, 0.01, 12),
        pendantLightWarmGlow
      );
      spotLens.position.set(0, 2.62, sz);
      pantry.add(spotLens);
    });

    scene.add(pantry);
    return pantry;
  };

  // ── Instantiations for Atelier Kitchen & Walk-In Pantry ──
  createKitchenCenterIsland(6.0, -4.3);
  createNorthKitchenCounter(1.8, 11.2, -6.65);
  createKitchenTrashStation(1.35, -6.45);
  createSamsungSmartFridge(0.55, -6.35);
  createMicrowave(3.2, 0.92, -6.62);
  createCoffeeStation(5.8, 0.92, -6.62);
  createWaterDispenser(11.6, -6.48);
  createWalkInPantry(15.5, -4.5);

  // Interactive Hit Boxes for Atelier Kitchen & Pantry
  const kitchenHitGeo = new THREE.BoxGeometry(4.2, 1.8, 2.4);
  const kitchenHit = new THREE.Mesh(kitchenHitGeo, hitBoxMat);
  kitchenHit.position.set(6.0, 0.9, -4.3);
  scene.add(kitchenHit);
  interactiveMeshes.set(kitchenHit, "break-room");

  const coffeeHitGeo = new THREE.BoxGeometry(2.4, 1.8, 1.4);
  const coffeeHit = new THREE.Mesh(coffeeHitGeo, hitBoxMat);
  coffeeHit.position.set(5.8, 0.9, -6.62);
  scene.add(coffeeHit);
  interactiveMeshes.set(coffeeHit, "break-room");

  // Interactive Hit Box for Southern Garden Solarium (Expanded Oasis Terrace)
  const talentHitGeo = new THREE.BoxGeometry(9.6, 2.4, 4.8);
  const talentHit = new THREE.Mesh(talentHitGeo, hitBoxMat);
  talentHit.position.set(5.9, 1.1, 8.85);
  scene.add(talentHit);
  interactiveMeshes.set(talentHit, "talent-desk");

  // Precise Interactive Hit Volumes for The Grand West Pavilion
  // 1. Zone 1: West Pavilion Sunset Cosmic Lounge (modular cashmere sectional & marble slab)
  const westLoungeHitGeo = new THREE.BoxGeometry(5.2, 1.6, 4.6);
  const westLoungeHit = new THREE.Mesh(westLoungeHitGeo, hitBoxMat);
  westLoungeHit.position.set(-21.2, 0.75, 0.0);
  scene.add(westLoungeHit);
  interactiveMeshes.set(westLoungeHit, "desk-kayode");

  // 2. Zone 2: West Pavilion Grand Ribbon Hearth Salon (linear fireplace & curved club chairs)
  const westHearthHitGeo = new THREE.BoxGeometry(5.6, 1.8, 4.4);
  const westHearthHit = new THREE.Mesh(westHearthHitGeo, hitBoxMat);
  westHearthHit.position.set(-16.5, 0.9, -7.5);
  scene.add(westHearthHit);
  interactiveMeshes.set(westHearthHit, "ceo-strategy-table");

  // 3. Zone 3: West Pavilion Monumental Dining & Solarium (10-seater monolith table & bar credenza)
  const westDiningHitGeo = new THREE.BoxGeometry(6.4, 1.8, 4.4);
  const westDiningHit = new THREE.Mesh(westDiningHitGeo, hitBoxMat);
  westDiningHit.position.set(-10.8, 0.9, 7.2);
  scene.add(westDiningHit);
  interactiveMeshes.set(westDiningHit, "command-desk");

  // 4. Zone 4: West Pavilion Curated Library & Acoustic Lounge (monograph shelving & reading daybed)
  const westLibraryHitGeo = new THREE.BoxGeometry(4.8, 2.0, 4.2);
  const westLibraryHit = new THREE.Mesh(westLibraryHitGeo, hitBoxMat);
  westLibraryHit.position.set(-9.5, 1.0, -7.5);
  scene.add(westLibraryHit);
  interactiveMeshes.set(westLibraryHit, "command-desk");

  // 5. Zone 5: West Pavilion Room-Centered Sculptural Centerpiece (modern bronze sculpture & stone plinth)
  const westGalleryHitGeo = new THREE.BoxGeometry(2.6, 2.4, 2.6);
  const westGalleryHit = new THREE.Mesh(westGalleryHitGeo, hitBoxMat);
  westGalleryHit.position.set(-11.8, 1.2, 0.0);
  scene.add(westGalleryHit);
  interactiveMeshes.set(westGalleryHit, "command-desk");

  // The merged hall has one station rather than six obsolete room targets.
  const labHit = new THREE.Mesh(new THREE.BoxGeometry(6.0, 1.8, 2.0), hitBoxMat);
  labHit.position.set(LAB_BOUNDS.spineX, 0.9, LAB_BOUNDS.south - 0.8);
  scene.add(labHit);
  interactiveMeshes.set(labHit, "advanced-tech-lab");

  // Dynamic Spatial Marker for Kitchen & Pantry
  let updateKitchenMarker: ((text: string | null, type?: "run" | "out") => void) | undefined;
  if (typeof document !== "undefined") {
    const markerCanvas = document.createElement("canvas");
    markerCanvas.width = 512;
    markerCanvas.height = 128;
    const markerTexture = new THREE.CanvasTexture(markerCanvas);
    markerTexture.colorSpace = THREE.SRGBColorSpace;
    const markerMaterial = new THREE.SpriteMaterial({
      map: markerTexture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const kitchenMarkerSprite = new THREE.Sprite(markerMaterial);
    kitchenMarkerSprite.position.set(6.0, 2.35, -4.3);
    kitchenMarkerSprite.scale.set(3.4, 0.85, 1.0);
    kitchenMarkerSprite.visible = false;
    scene.add(kitchenMarkerSprite);

    updateKitchenMarker = (text: string | null, type: "run" | "out" = "run") => {
      if (!text) {
        kitchenMarkerSprite.visible = false;
        return;
      }
      const ctx = markerCanvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, markerCanvas.width, markerCanvas.height);

      const w = 490;
      const h = 88;
      const x = (markerCanvas.width - w) / 2;
      const y = (markerCanvas.height - h) / 2;
      const r = h / 2;

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      ctx.fillStyle = type === "run" ? "rgba(20, 20, 26, 0.94)" : "rgba(44, 20, 20, 0.94)";
      ctx.fill();

      ctx.lineWidth = 4;
      ctx.strokeStyle = type === "run" ? "#B87D4B" : "#E11D48";
      ctx.stroke();

      ctx.font = "bold 32px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillStyle = "#FFFFFF";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, markerCanvas.width / 2, markerCanvas.height / 2);
      ctx.restore();

      markerTexture.needsUpdate = true;
      kitchenMarkerSprite.visible = true;
    };
  }



  // ═══════════════════════════════════════════════════════════════════════════
  // ── EXTERIOR ENVIRONMENT: THREE RESTRAINED ARCHITECTURAL ZONES ─────────────
  // ═══════════════════════════════════════════════════════════════════════════

  // ---------------------------------------------------------------------------
  // 1. GENERATE THE MAIN FLOATING ISLAND TERRAIN (Cliffs, Grass, and Spikes)
  // ---------------------------------------------------------------------------
  const terrainGenerator = new EstateTerrainGenerator(scene);
  terrainGenerator.generate();

  // Register Volumetric Grass Wind Sway in ambientUpdaters
  ambientUpdaters.push((time: number) => {
    terrainGenerator.terrainEngine.update(time * 0.001);
    terrainGenerator.vines?.update(time * 0.001);
  });

  // Outdoor grounds are kept minimal and open: living terrain lawn and cliff perimeter only.

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════════════════════
  // ── 6. OUTDOOR REDESIGN: NEW "ORRA" MONUMENT & DISMANTLED "WS TECH" WRECKAGE ──
  // ═══════════════════════════════════════════════════════════════════════════

  // Monument typography letter shapes (monumental 1.85m–1.95m height, proportioned)
  const createSignageLetterShape = (char: string) => {
    const s = new THREE.Shape();
    if (char === 'W') {
      s.moveTo(0, 1.85);
      s.lineTo(0.28, 1.85);
      s.lineTo(0.56, 0.48);
      s.lineTo(0.78, 1.50);
      s.lineTo(0.92, 1.50);
      s.lineTo(1.14, 0.48);
      s.lineTo(1.42, 1.85);
      s.lineTo(1.70, 1.85);
      s.lineTo(1.28, 0);
      s.lineTo(1.05, 0);
      s.lineTo(0.85, 0.98);
      s.lineTo(0.65, 0);
      s.lineTo(0.42, 0);
      s.closePath();
    } else if (char === 'S') {
      s.moveTo(1.02, 1.48);
      s.lineTo(1.02, 1.85);
      s.lineTo(0.24, 1.85);
      s.lineTo(0.00, 1.05);
      s.lineTo(0.82, 0.90);
      s.lineTo(0.90, 0.30);
      s.lineTo(0.12, 0.30);
      s.lineTo(0.12, 0.00);
      s.lineTo(1.15, 0.00);
      s.lineTo(1.15, 0.82);
      s.lineTo(0.30, 0.98);
      s.lineTo(0.24, 1.48);
      s.closePath();
    } else if (char === 'T') {
      s.moveTo(0, 1.85);
      s.lineTo(1.15, 1.85);
      s.lineTo(1.15, 1.55);
      s.lineTo(0.72, 1.55);
      s.lineTo(0.72, 0);
      s.lineTo(0.43, 0);
      s.lineTo(0.43, 1.55);
      s.lineTo(0, 1.55);
      s.closePath();
    } else if (char === 'E') {
      s.moveTo(0, 1.85);
      s.lineTo(1.05, 1.85);
      s.lineTo(1.05, 1.55);
      s.lineTo(0.28, 1.55);
      s.lineTo(0.28, 1.08);
      s.lineTo(0.90, 1.08);
      s.lineTo(0.90, 0.80);
      s.lineTo(0.28, 0.80);
      s.lineTo(0.28, 0.30);
      s.lineTo(1.05, 0.30);
      s.lineTo(1.05, 0);
      s.lineTo(0, 0);
      s.closePath();
    } else if (char === 'C') {
      s.moveTo(1.10, 1.85);
      s.lineTo(1.10, 1.55);
      s.lineTo(0.30, 1.55);
      s.lineTo(0.28, 0.30);
      s.lineTo(1.10, 0.30);
      s.lineTo(1.10, 0);
      s.lineTo(0.25, 0);
      s.lineTo(0, 0.25);
      s.lineTo(0, 1.60);
      s.lineTo(0.25, 1.85);
      s.closePath();
    } else if (char === 'H') {
      s.moveTo(0, 1.85);
      s.lineTo(0.28, 1.85);
      s.lineTo(0.28, 1.05);
      s.lineTo(0.87, 1.05);
      s.lineTo(0.87, 1.85);
      s.lineTo(1.15, 1.85);
      s.lineTo(1.15, 0);
      s.lineTo(0.87, 0);
      s.lineTo(0.87, 0.78);
      s.lineTo(0.28, 0.78);
      s.lineTo(0.28, 0);
      s.lineTo(0, 0);
      s.closePath();
    } else if (char === 'O') {
      const W = 2.30, H = 2.85, r = 0.75;
      s.moveTo(r, 0);
      s.lineTo(W - r, 0);
      s.quadraticCurveTo(W, 0, W, r);
      s.lineTo(W, H - r);
      s.quadraticCurveTo(W, H, W - r, H);
      s.lineTo(r, H);
      s.quadraticCurveTo(0, H, 0, H - r);
      s.lineTo(0, r);
      s.quadraticCurveTo(0, 0, r, 0);
      s.closePath();

      const hole = new THREE.Path();
      const t = 0.52, hr = 0.35;
      hole.moveTo(t + hr, t);
      hole.quadraticCurveTo(t, t, t, t + hr);
      hole.lineTo(t, H - t - hr);
      hole.quadraticCurveTo(t, H - t, t + hr, H - t);
      hole.lineTo(W - t - hr, H - t);
      hole.quadraticCurveTo(W - t, H - t, W - t, H - t - hr);
      hole.lineTo(W - t, t + hr);
      hole.quadraticCurveTo(W - t, t, W - t - hr, t);
      hole.closePath();
      s.holes.push(hole);
    } else if (char === 'R') {
      const stemW = 0.50;
      s.moveTo(0, 0);
      s.lineTo(stemW, 0);
      s.lineTo(stemW, 1.20);
      s.lineTo(1.10, 1.20);
      s.lineTo(1.65, 0);
      s.lineTo(2.20, 0);
      s.lineTo(1.55, 1.30);
      s.quadraticCurveTo(2.15, 1.55, 2.15, 2.08);
      s.quadraticCurveTo(2.15, 2.85, 1.35, 2.85);
      s.lineTo(0, 2.85);
      s.closePath();

      const hole = new THREE.Path();
      hole.moveTo(stemW, 1.68);
      hole.lineTo(1.30, 1.68);
      hole.quadraticCurveTo(1.65, 1.68, 1.65, 2.08);
      hole.quadraticCurveTo(1.65, 2.42, 1.30, 2.42);
      hole.lineTo(stemW, 2.42);
      hole.closePath();
      s.holes.push(hole);
    } else if (char === 'A') {
      s.moveTo(0, 0);
      s.lineTo(0.56, 0);
      s.lineTo(0.78, 0.72);
      s.lineTo(1.58, 0.72);
      s.lineTo(1.80, 0);
      s.lineTo(2.36, 0);
      s.lineTo(1.45, 2.85);
      s.lineTo(0.91, 2.85);
      s.closePath();

      const hole = new THREE.Path();
      hole.moveTo(0.90, 1.15);
      hole.lineTo(1.46, 1.15);
      hole.lineTo(1.18, 2.18);
      hole.closePath();
      s.holes.push(hole);
    }
    return s;
  };

  // ─────────────────────────────────────────────────────────────────────────
  // A. NEW STANDING "ORRA" MONUMENT WITH ARCHITECTURAL SPOTLIGHTS
  // ─────────────────────────────────────────────────────────────────────────
  const createStandingOrraSignage = () => {
    const signGroup = new THREE.Group();

    // Bold Materials
    // 1. Radiant Solar Gold / Warm Amber letterface (ORRA signature solar accent)
    const letterFaceMat = new THREE.MeshStandardMaterial({
      color: 0xffb81a,
      roughness: 0.18,
      metalness: 0.38,
      emissive: 0x3d2502,
      emissiveIntensity: 0.22,
    });
    // 2. Brushed obsidian / dark champagne bronze returns & bevel trim
    const letterReturnMat = new THREE.MeshStandardMaterial({
      color: 0x24201c,
      roughness: 0.28,
      metalness: 0.85,
    });
    // 3. Darkened structural bronze/steel for rear A-frame masts
    const trussSteelMat = new THREE.MeshStandardMaterial({
      color: 0x2a2723,
      roughness: 0.58,
      metalness: 0.84,
    });
    // 4. Honed charcoal basalt foundation plinth
    const footingMat = new THREE.MeshStandardMaterial({
      color: 0x1d1c1a,
      roughness: 0.85,
      metalness: 0.08,
    });
    // 5. Spotlight housing
    const spotHousingMat = new THREE.MeshStandardMaterial({
      color: 0x161514,
      roughness: 0.38,
      metalness: 0.90,
    });
    // 6. Glowing warm tungsten spotlight lens
    const spotLensMat = new THREE.MeshBasicMaterial({
      color: 0xffeed4,
    });

    // Extra bold & monumental proportions (2.85m height, balanced ~10m span)
    const letterSpecs = [
      { char: 'O', w: 2.30 },
      { char: 'R', w: 2.10 },
      { char: 'R', w: 2.10 },
      { char: 'A', w: 2.36 },
    ];

    const kerning = 0.35;
    const totalSpan = letterSpecs.reduce((acc, l) => acc + l.w, 0) + (letterSpecs.length - 1) * kerning;

    // Placed together on the open southern promontory lawn
    const centerWorldX = 3.5;
    const centerWorldZ = 22.0;
    const baseElevationY = -0.155;
    const baseRotationY = Math.PI / 4; // Squarely facing camera reset/overview sightline

    // Continuous architectural plinth beneath the letters
    const plinthLength = totalSpan + 1.8;
    const plinthMesh = new THREE.Mesh(
      new THREE.BoxGeometry(plinthLength, 0.22, 1.80),
      footingMat
    );
    plinthMesh.position.set(0, 0.11, -0.20);
    plinthMesh.receiveShadow = true;
    signGroup.add(plinthMesh);

    // Warm linear plinth base reveal glow
    const plinthGlowMat = new THREE.MeshBasicMaterial({ color: 0xffeed0 });
    const plinthReveal = new THREE.Mesh(
      new THREE.BoxGeometry(plinthLength - 0.3, 0.02, 0.04),
      plinthGlowMat
    );
    plinthReveal.position.set(0, 0.03, 0.68);
    signGroup.add(plinthReveal);

    let accumulatedOffset = -totalSpan / 2;
    const spotlightTargets: THREE.Object3D[] = [];

    letterSpecs.forEach((item) => {
      const charWidth = item.w;
      const letterCenterX = accumulatedOffset + charWidth / 2;
      accumulatedOffset += charWidth + kerning;

      const letterUnit = new THREE.Group();
      letterUnit.position.set(letterCenterX, 0, 0);

      // ── 3D Monumental Letter Extrusion ──
      const shape = createSignageLetterShape(item.char);
      const extrudeGeo = new THREE.ExtrudeGeometry(shape, {
        depth: 0.44,
        bevelEnabled: true,
        bevelThickness: 0.045,
        bevelSize: 0.030,
        bevelSegments: 3,
      });

      const letterMesh = new THREE.Mesh(extrudeGeo, [letterFaceMat, letterReturnMat]);
      letterMesh.position.set(-charWidth / 2, 0.22, 0); // Resting cleanly atop basalt plinth
      letterMesh.castShadow = true;
      letterMesh.receiveShadow = true;
      letterUnit.add(letterMesh);

      // Target for spotlight aim
      const targetObj = new THREE.Object3D();
      targetObj.position.set(0, 1.65, 0.22);
      letterUnit.add(targetObj);
      spotlightTargets.push(targetObj);

      // ── Architectural Support Masts & Kickers (Rear) ──
      const postDist = charWidth * 0.28;
      const postX1 = -postDist;
      const postX2 = postDist;
      const postHeight = 2.40;
      const postGeo = new THREE.BoxGeometry(0.10, postHeight, 0.10);

      const post1 = new THREE.Mesh(postGeo, trussSteelMat);
      post1.position.set(postX1, postHeight / 2 + 0.18, -0.08);
      post1.castShadow = true;
      letterUnit.add(post1);

      const post2 = new THREE.Mesh(postGeo, trussSteelMat);
      post2.position.set(postX2, postHeight / 2 + 0.18, -0.08);
      post2.castShadow = true;
      letterUnit.add(post2);

      // Horizontal tension tie-bars
      const tieBarGeo = new THREE.BoxGeometry(postDist * 2 + 0.20, 0.06, 0.06);
      const tieBar1 = new THREE.Mesh(tieBarGeo, trussSteelMat);
      tieBar1.position.set(0, 1.10, -0.08);
      letterUnit.add(tieBar1);

      const tieBar2 = new THREE.Mesh(tieBarGeo, trussSteelMat);
      tieBar2.position.set(0, 2.10, -0.08);
      letterUnit.add(tieBar2);

      // Rear diagonal kickers
      const kickerGeo = new THREE.CylinderGeometry(0.040, 0.040, 2.10, 8);
      const kickerAngleX = -0.58;

      const kicker1 = new THREE.Mesh(kickerGeo, trussSteelMat);
      kicker1.position.set(postX1, 1.05, -0.62);
      kicker1.rotation.x = kickerAngleX;
      kicker1.castShadow = true;
      letterUnit.add(kicker1);

      const kicker2 = new THREE.Mesh(kickerGeo, trussSteelMat);
      kicker2.position.set(postX2, 1.05, -0.62);
      kicker2.rotation.x = kickerAngleX;
      kicker2.castShadow = true;
      letterUnit.add(kicker2);

      signGroup.add(letterUnit);
    });

    // ── Architectural Spotlighting System (Front Canisters) ──
    const spotlightOffsets = [-3.8, -1.3, 1.3, 3.8];
    spotlightOffsets.forEach((offsetX, idx) => {
      const fixture = new THREE.Group();
      const spotZ = 3.10;
      fixture.position.set(offsetX, 0, spotZ);

      const basePlate = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.25, 0.05, 16),
        footingMat
      );
      basePlate.position.y = 0.025;
      basePlate.receiveShadow = true;
      fixture.add(basePlate);

      const yoke = new THREE.Mesh(
        new THREE.BoxGeometry(0.07, 0.26, 0.07),
        spotHousingMat
      );
      yoke.position.y = 0.14;
      fixture.add(yoke);

      const canisterGroup = new THREE.Group();
      canisterGroup.position.set(0, 0.28, 0);
      canisterGroup.rotation.x = -0.78;

      const canisterBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.18, 0.44, 16),
        spotHousingMat
      );
      canisterBody.castShadow = true;
      canisterGroup.add(canisterBody);

      const lens = new THREE.Mesh(
        new THREE.CircleGeometry(0.13, 16),
        spotLensMat
      );
      lens.position.y = 0.221;
      lens.rotation.x = -Math.PI / 2;
      canisterGroup.add(lens);

      fixture.add(canisterGroup);
      signGroup.add(fixture);

      // Calibrated soft warm spotlight beam on bold ORRA letters
      const spotLight = new THREE.SpotLight(0xffeed6, 1.8, 12, 0.50, 0.55, 1.3);
      spotLight.position.set(offsetX, 0.45, spotZ);
      if (spotlightTargets[idx]) {
        spotLight.target = spotlightTargets[idx];
      }
      spotLight.castShadow = true;
      signGroup.add(spotLight);

      // Local ground pool wash
      const washLight = new THREE.PointLight(0xffe2b8, 0.45, 3.5, 1.8);
      washLight.position.set(offsetX, 0.38, spotZ - 0.35);
      signGroup.add(washLight);
    });

    // ── Rear Rim Halo Lights for Cosmic / Night Silhouette ──
    [-2.8, 0.0, 2.8].forEach((bx) => {
      const haloLight = new THREE.PointLight(0xffdfa8, 0.55, 7.0, 1.5);
      haloLight.position.set(bx, 1.60, -1.80);
      signGroup.add(haloLight);
    });

    signGroup.position.set(centerWorldX, baseElevationY, centerWorldZ);
    signGroup.rotation.y = baseRotationY;
    scene.add(signGroup);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // B. DISMANTLED "WS TECH" WRECKAGE WITH THICK VINES & EXTUDING BURIED LETTERS
  // ─────────────────────────────────────────────────────────────────────────
  const createWSTechWreckage = () => {
    const wreckGroup = new THREE.Group();

    // Weathered materials
    // 1. Weathered, moss-stained and cracked travertine face
    const weatheredFaceMat = new THREE.MeshStandardMaterial({
      color: 0x8a877e,
      roughness: 0.90,
      metalness: 0.04,
    });
    // 2. Rusted oxidized steel for returns and sheared brackets
    const rustedMetalMat = new THREE.MeshStandardMaterial({
      color: 0x483222,
      roughness: 0.94,
      metalness: 0.32,
    });
    // 3. Dark churned soil & moss mound
    const churnedSoilMat = new THREE.MeshStandardMaterial({
      color: 0x221f1b,
      roughness: 0.96,
      metalness: 0.02,
    });
    // 4. Thick organic climbing vine wood bark
    const vineBarkMat = new THREE.MeshStandardMaterial({
      color: 0x2c3b20,
      roughness: 0.82,
      metalness: 0.04,
    });
    // 5. Lush green ivy leaf foliage
    const ivyFoliageMat = new THREE.MeshStandardMaterial({
      color: 0x3d6325,
      roughness: 0.72,
      metalness: 0.06,
    });

    // Dismantled location: placed directly beside the new ORRA monument on the south lawn
    const centerWorldX = -4.5;
    const centerWorldZ = 22.0;
    const baseElevationY = -0.155;
    const baseRotationY = Math.PI / 4 + 0.10;

    // Helper to grow thick climbing vines with leaves along 3D splines
    const attachClimbingVines = (points: [number, number, number][], radius = 0.038) => {
      if (points.length < 2) return;
      const vPoints = points.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
      const curve = new THREE.CatmullRomCurve3(vPoints);
      const tubeGeo = new THREE.TubeGeometry(curve, 32, radius, 6, false);
      const vineMesh = new THREE.Mesh(tubeGeo, vineBarkMat);
      vineMesh.castShadow = true;
      wreckGroup.add(vineMesh);

      // Ivy leaf clusters sprouting along the vine path
      const leafCount = Math.floor(vPoints.length * 2.2);
      for (let i = 1; i <= leafCount; i++) {
        const t = i / (leafCount + 1);
        const pt = curve.getPoint(t);
        const leafGroup = new THREE.Group();
        leafGroup.position.copy(pt);

        for (let l = 0; l < 3; l++) {
          const leaf = new THREE.Mesh(
            new THREE.CircleGeometry(0.062, 5),
            ivyFoliageMat
          );
          leaf.position.set(
            (l - 1) * 0.045,
            (l % 2) * 0.035,
            ((l + 1) % 2) * 0.035
          );
          leaf.rotation.set(
            Math.sin(i * 3 + l) * 0.8,
            Math.cos(i * 2 + l) * 0.8,
            l * 0.6
          );
          leaf.scale.set(1.0, 1.3, 1.0);
          leafGroup.add(leaf);
        }
        wreckGroup.add(leafGroup);
      }
    };

    // Helper for extruded letters in wreckage
    const createWreckLetter = (char: string) => {
      const shape = createSignageLetterShape(char);
      const extrudeGeo = new THREE.ExtrudeGeometry(shape, {
        depth: 0.28,
        bevelEnabled: true,
        bevelThickness: 0.028,
        bevelSize: 0.018,
        bevelSegments: 2,
      });
      const mesh = new THREE.Mesh(extrudeGeo, [weatheredFaceMat, rustedMetalMat]);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      return mesh;
    };

    // Helper to spawn churned dirt mounds where letters emerge from earth
    const createSoilMound = (x: number, z: number, rx: number, rz: number, h: number) => {
      const mound = new THREE.Mesh(
        new THREE.SphereGeometry(rx, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        churnedSoilMat
      );
      mound.scale.set(1.0, h / rx, rz / rx);
      mound.position.set(x, 0.01, z);
      mound.receiveShadow = true;
      wreckGroup.add(mound);
    };

    // ── 1. LETTER 'W': Tilted, half-buried into earth mound, left strokes extruding ──
    const wUnit = new THREE.Group();
    wUnit.position.set(-3.6, -0.32, 0.35);
    wUnit.rotation.set(0.38, -0.32, 0.42);
    const wMesh = createWreckLetter('W');
    wMesh.position.set(-0.85, 0, 0);
    wUnit.add(wMesh);
    wreckGroup.add(wUnit);
    createSoilMound(-3.6, 0.4, 0.95, 0.80, 0.26);

    attachClimbingVines([
      [-4.4, 0.02, 0.1],
      [-3.9, 0.30, 0.35],
      [-3.4, 0.65, 0.42],
      [-3.1, 0.95, 0.25],
      [-2.8, 0.40, 0.50],
    ], 0.042);

    // ── 2. LETTER 'S': Snapped, fallen backward, sunken into soil ──
    const sUnit = new THREE.Group();
    sUnit.position.set(-2.0, -0.42, -0.15);
    sUnit.rotation.set(-0.62, 0.25, -0.35);
    const sMesh = createWreckLetter('S');
    sMesh.position.set(-0.55, 0, 0);
    sUnit.add(sMesh);
    wreckGroup.add(sUnit);
    createSoilMound(-2.0, -0.1, 0.85, 0.75, 0.22);

    attachClimbingVines([
      [-2.7, 0.02, -0.3],
      [-2.1, 0.22, -0.10],
      [-1.8, 0.52, -0.05],
      [-1.5, 0.28, 0.20],
      [-1.2, 0.04, 0.35],
    ], 0.038);

    // ── 3. LETTER 'T': Stem buried deep, crossbar tilted askew on the ground ──
    const tUnit = new THREE.Group();
    tUnit.position.set(-0.45, -0.48, 0.45);
    tUnit.rotation.set(0.70, 0.15, -0.22);
    const tMesh = createWreckLetter('T');
    tMesh.position.set(-0.55, 0, 0);
    tUnit.add(tMesh);
    wreckGroup.add(tUnit);
    createSoilMound(-0.45, 0.50, 0.90, 0.70, 0.28);

    attachClimbingVines([
      [-1.1, 0.02, 0.6],
      [-0.6, 0.35, 0.52],
      [-0.3, 0.72, 0.35],
      [ 0.1, 0.45, 0.20],
    ], 0.044);

    // ── 4. LETTER 'E': Fallen on its back/side, horizontal prongs extruding upward ──
    const eUnit = new THREE.Group();
    eUnit.position.set(1.10, -0.58, -0.10);
    eUnit.rotation.set(Math.PI / 2 - 0.28, 0.08, 0.45);
    const eMesh = createWreckLetter('E');
    eMesh.position.set(-0.52, 0, 0);
    eUnit.add(eMesh);
    wreckGroup.add(eUnit);
    createSoilMound(1.10, -0.05, 0.95, 0.85, 0.24);

    attachClimbingVines([
      [0.4, 0.02, 0.1],
      [0.9, 0.28, -0.05],
      [1.3, 0.48, 0.12],
      [1.6, 0.32, -0.25],
      [2.0, 0.02, -0.10],
    ], 0.040);

    // ── 5. LETTER 'C': Tilted like a broken monolith arch in the dirt ──
    const cUnit = new THREE.Group();
    cUnit.position.set(2.55, -0.38, 0.30);
    cUnit.rotation.set(0.22, -0.42, -0.32);
    const cMesh = createWreckLetter('C');
    cMesh.position.set(-0.55, 0, 0);
    cUnit.add(cMesh);
    wreckGroup.add(cUnit);
    createSoilMound(2.55, 0.35, 0.85, 0.75, 0.25);

    attachClimbingVines([
      [1.8, 0.02, 0.4],
      [2.3, 0.32, 0.35],
      [2.7, 0.68, 0.22],
      [3.0, 0.35, 0.15],
    ], 0.038);

    // ── 6. LETTER 'H': Collapsed, one vertical upright buried, crossbar twisted ──
    const hUnit = new THREE.Group();
    hUnit.position.set(3.85, -0.52, -0.05);
    hUnit.rotation.set(-0.45, 0.48, 0.30);
    const hMesh = createWreckLetter('H');
    hMesh.position.set(-0.55, 0, 0);
    hUnit.add(hMesh);
    wreckGroup.add(hUnit);
    createSoilMound(3.85, 0.0, 0.90, 0.80, 0.24);

    attachClimbingVines([
      [3.1, 0.02, 0.1],
      [3.6, 0.30, 0.02],
      [4.1, 0.62, -0.12],
      [4.5, 0.24, 0.10],
      [4.8, 0.02, -0.20],
    ], 0.042);

    // ── Twisted Rusted Steel Truss Scaffolding Wreckage ──
    // Fallen bent posts & sheared I-beams
    const trussDebris = [
      { p1: [-3.8, 0.05, -0.6], p2: [-2.2, 0.35, -0.4], r: 0.035 },
      { p1: [-1.4, 0.25, -0.8], p2: [ 0.2, 0.05, -0.5], r: 0.040 },
      { p1: [ 0.8, 0.05,  0.8], p2: [ 2.4, 0.28,  0.6], r: 0.035 },
      { p1: [ 2.6, 0.22, -0.6], p2: [ 4.2, 0.05, -0.4], r: 0.038 },
      { p1: [-0.8, 0.32,  0.3], p2: [-0.1, 0.05,  1.1], r: 0.032 },
    ];

    trussDebris.forEach((d) => {
      const v1 = new THREE.Vector3(d.p1[0], d.p1[1], d.p1[2]);
      const v2 = new THREE.Vector3(d.p2[0], d.p2[1], d.p2[2]);
      const dir = new THREE.Vector3().subVectors(v2, v1);
      const len = dir.length();
      const mid = new THREE.Vector3().addVectors(v1, v2).multiplyScalar(0.5);

      const beamGeo = new THREE.CylinderGeometry(d.r, d.r * 1.1, len, 8);
      const beam = new THREE.Mesh(beamGeo, rustedMetalMat);
      beam.position.copy(mid);
      beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
      beam.castShadow = true;
      wreckGroup.add(beam);
    });

    // Cracked, displaced basalt footing blocks
    [-3.2, -0.8, 1.6, 3.4].forEach((fx, i) => {
      const foot = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 0.18, 0.32),
        churnedSoilMat
      );
      foot.position.set(fx, 0.04, (i % 2 === 0 ? -0.8 : 0.7));
      foot.rotation.set((i * 0.3) % 0.4, (i * 0.7) % 0.8, (i * 0.2) % 0.5);
      foot.receiveShadow = true;
      wreckGroup.add(foot);
    });

    // Soft dim ambient moonlight on wreckage
    const wreckGlow = new THREE.PointLight(0x769578, 0.18, 5.0, 1.8);
    wreckGlow.position.set(0, 0.8, 0);
    wreckGroup.add(wreckGlow);

    wreckGroup.position.set(centerWorldX, baseElevationY, centerWorldZ);
    wreckGroup.rotation.y = baseRotationY;
    scene.add(wreckGroup);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // C. CARDINAL COMPASS EDGE SIGNAGE (N, E, S, W Visual Compass Monoliths)
  // ─────────────────────────────────────────────────────────────────────────
  const createCompassLetterShape = (char: string): THREE.Shape => {
    const s = new THREE.Shape();
    const H = 0.38;
    if (char === 'N') {
      s.moveTo(0, 0);
      s.lineTo(0.08, 0);
      s.lineTo(0.08, 0.24);
      s.lineTo(0.24, 0);
      s.lineTo(0.32, 0);
      s.lineTo(0.32, H);
      s.lineTo(0.24, H);
      s.lineTo(0.24, 0.14);
      s.lineTo(0.08, H);
      s.lineTo(0, H);
      s.closePath();
    } else if (char === 'E') {
      s.moveTo(0, 0);
      s.lineTo(0.26, 0);
      s.lineTo(0.26, 0.07);
      s.lineTo(0.08, 0.07);
      s.lineTo(0.08, 0.16);
      s.lineTo(0.22, 0.16);
      s.lineTo(0.22, 0.22);
      s.lineTo(0.08, 0.22);
      s.lineTo(0.08, H - 0.07);
      s.lineTo(0.26, H - 0.07);
      s.lineTo(0.26, H);
      s.lineTo(0, H);
      s.closePath();
    } else if (char === 'S') {
      s.moveTo(0.26, 0.31);
      s.lineTo(0.26, H);
      s.lineTo(0.06, H);
      s.lineTo(0, 0.22);
      s.lineTo(0.18, 0.19);
      s.lineTo(0.20, 0.07);
      s.lineTo(0.04, 0.07);
      s.lineTo(0.04, 0);
      s.lineTo(0.26, 0);
      s.lineTo(0.26, 0.17);
      s.lineTo(0.08, 0.20);
      s.lineTo(0.06, 0.31);
      s.closePath();
    } else if (char === 'W') {
      s.moveTo(0, H);
      s.lineTo(0.07, H);
      s.lineTo(0.12, 0.10);
      s.lineTo(0.18, 0.32);
      s.lineTo(0.22, 0.32);
      s.lineTo(0.28, 0.10);
      s.lineTo(0.33, H);
      s.lineTo(0.40, H);
      s.lineTo(0.31, 0);
      s.lineTo(0.24, 0);
      s.lineTo(0.20, 0.20);
      s.lineTo(0.16, 0);
      s.lineTo(0.09, 0);
      s.closePath();
    } else if (char === 'O') {
      const W = 0.32, r = 0.10;
      s.moveTo(r, 0);
      s.lineTo(W - r, 0);
      s.quadraticCurveTo(W, 0, W, r);
      s.lineTo(W, H - r);
      s.quadraticCurveTo(W, H, W - r, H);
      s.lineTo(r, H);
      s.quadraticCurveTo(0, H, 0, H - r);
      s.lineTo(0, r);
      s.quadraticCurveTo(0, 0, r, 0);
      s.closePath();
      const hole = new THREE.Path();
      const t = 0.075;
      hole.moveTo(t + 0.04, t);
      hole.quadraticCurveTo(t, t, t, t + 0.04);
      hole.lineTo(t, H - t - 0.04);
      hole.quadraticCurveTo(t, H - t, t + 0.04, H - t);
      hole.lineTo(W - t - 0.04, H - t);
      hole.quadraticCurveTo(W - t, H - t, W - t, H - t - 0.04);
      hole.lineTo(W - t, t + 0.04);
      hole.quadraticCurveTo(W - t, t, W - t - 0.04, t);
      hole.closePath();
      s.holes.push(hole);
    } else if (char === 'R') {
      const stemW = 0.08;
      s.moveTo(0, 0);
      s.lineTo(stemW, 0);
      s.lineTo(stemW, 0.17);
      s.lineTo(0.16, 0.17);
      s.lineTo(0.23, 0);
      s.lineTo(0.31, 0);
      s.lineTo(0.22, 0.18);
      s.quadraticCurveTo(0.30, 0.22, 0.30, 0.29);
      s.quadraticCurveTo(0.30, H, 0.20, H);
      s.lineTo(0, H);
      s.closePath();
      const hole = new THREE.Path();
      hole.moveTo(stemW, 0.23);
      hole.lineTo(0.18, 0.23);
      hole.quadraticCurveTo(0.23, 0.23, 0.23, 0.29);
      hole.quadraticCurveTo(0.23, 0.33, 0.18, 0.33);
      hole.lineTo(stemW, 0.33);
      hole.closePath();
      s.holes.push(hole);
    } else if (char === 'A') {
      s.moveTo(0, 0);
      s.lineTo(0.08, 0);
      s.lineTo(0.11, 0.10);
      s.lineTo(0.22, 0.10);
      s.lineTo(0.25, 0);
      s.lineTo(0.33, 0);
      s.lineTo(0.20, H);
      s.lineTo(0.13, H);
      s.closePath();
      const hole = new THREE.Path();
      hole.moveTo(0.13, 0.16);
      hole.lineTo(0.20, 0.16);
      hole.lineTo(0.165, 0.29);
      hole.closePath();
      s.holes.push(hole);
    } else if (char === 'T') {
      const W = 0.28, stemW = 0.08, barH = 0.07;
      s.moveTo((W - stemW) / 2, 0);
      s.lineTo((W + stemW) / 2, 0);
      s.lineTo((W + stemW) / 2, H - barH);
      s.lineTo(W, H - barH);
      s.lineTo(W, H);
      s.lineTo(0, H);
      s.lineTo(0, H - barH);
      s.lineTo((W - stemW) / 2, H - barH);
      s.closePath();
    } else if (char === 'H') {
      const W = 0.28, stemW = 0.075, crossH = 0.07, crossY = 0.16;
      s.moveTo(0, 0);
      s.lineTo(stemW, 0);
      s.lineTo(stemW, crossY);
      s.lineTo(W - stemW, crossY);
      s.lineTo(W - stemW, 0);
      s.lineTo(W, 0);
      s.lineTo(W, H);
      s.lineTo(W - stemW, H);
      s.lineTo(W - stemW, crossY + crossH);
      s.lineTo(stemW, crossY + crossH);
      s.lineTo(stemW, H);
      s.lineTo(0, H);
      s.closePath();
    } else if (char === 'U') {
      const W = 0.28, stemW = 0.075;
      s.moveTo(0, H);
      s.lineTo(0, 0.09);
      s.quadraticCurveTo(0, 0, 0.09, 0);
      s.lineTo(W - 0.09, 0);
      s.quadraticCurveTo(W, 0, W, 0.09);
      s.lineTo(W, H);
      s.lineTo(W - stemW, H);
      s.lineTo(W - stemW, 0.06);
      s.quadraticCurveTo(W - stemW, stemW, W - stemW - 0.04, stemW);
      s.lineTo(stemW + 0.04, stemW);
      s.quadraticCurveTo(stemW, stemW, stemW, 0.06);
      s.lineTo(stemW, H);
      s.closePath();
    }
    return s;
  };

  const createCardinalEdgeSignage = () => {
    const compassGroup = new THREE.Group();
    compassGroup.name = "cardinalCompassMarkers";

    const faceMat = new THREE.MeshStandardMaterial({
      color: 0xffb81a,
      roughness: 0.20,
      metalness: 0.40,
      emissive: 0x3d2502,
      emissiveIntensity: 0.20,
    });

    const returnMat = new THREE.MeshStandardMaterial({
      color: 0x221f1c,
      roughness: 0.32,
      metalness: 0.82,
    });

    const plinthMat = new THREE.MeshStandardMaterial({
      color: 0x32302d,
      roughness: 0.84,
      metalness: 0.08,
    });

    const needleMat = new THREE.MeshStandardMaterial({
      color: 0xffd84d,
      roughness: 0.15,
      metalness: 0.65,
      emissive: 0xffb81a,
      emissiveIntensity: 0.35,
    });

    const cardinalEdges = [
      { id: 'N', word: 'NORTH', x: -1.9,  z: -77.2, rotY: Math.PI },
      { id: 'S', word: 'SOUTH', x: 3.5,   z: 37.2,  rotY: 0 },
      { id: 'E', word: 'EAST',  x: 48.8,  z: 1.0,   rotY: Math.PI / 2 },
      { id: 'W', word: 'WEST',  x: -56.5, z: 1.0,   rotY: -Math.PI / 2 },
    ];

    const letterWidths: Record<string, number> = {
      N: 0.32,
      O: 0.32,
      R: 0.31,
      T: 0.28,
      H: 0.28,
      S: 0.26,
      U: 0.28,
      E: 0.26,
      A: 0.33,
      W: 0.40,
    };
    const letterSpacing = 0.055;

    cardinalEdges.forEach((card) => {
      const markerGroup = new THREE.Group();
      markerGroup.position.set(card.x, -0.16, card.z);
      markerGroup.rotation.y = card.rotY;

      // 1. Honed basalt plinth slab (2.4m length x 0.28m height x 0.50m depth)
      const plinthGeo = new THREE.BoxGeometry(2.4, 0.28, 0.50);
      const plinthMesh = new THREE.Mesh(plinthGeo, plinthMat);
      plinthMesh.position.y = 0.14;
      plinthMesh.receiveShadow = true;
      plinthMesh.castShadow = true;
      markerGroup.add(plinthMesh);

      terrainGenerator.registerStructure(plinthMesh, 0.35, `compass-${card.id}`);

      // 2. Brass cardinal needle pointing outward (+Z in local marker coordinates)
      const arrowGeo = new THREE.ConeGeometry(0.05, 0.18, 4);
      const arrowMesh = new THREE.Mesh(arrowGeo, needleMat);
      arrowMesh.rotation.x = Math.PI / 2;
      arrowMesh.position.set(-0.96, 0.282, 0);
      markerGroup.add(arrowMesh);

      // 3. Dimensional Typography: Full cardinal direction ("NORTH", "SOUTH", "EAST", "WEST")
      const chars = card.word.split('');
      const totalWordWidth = chars.reduce((sum, ch, idx) => {
        const w = letterWidths[ch] ?? 0.28;
        return sum + w + (idx < chars.length - 1 ? letterSpacing : 0);
      }, 0);

      let currentX = -totalWordWidth / 2;
      const letterY = 0.28;

      chars.forEach((char) => {
        const shape = createCompassLetterShape(char);
        const geo = new THREE.ExtrudeGeometry(shape, {
          depth: 0.06,
          bevelEnabled: true,
          bevelThickness: 0.008,
          bevelSize: 0.006,
          bevelSegments: 2,
        });
        const mesh = new THREE.Mesh(geo, [faceMat, returnMat]);
        mesh.position.set(currentX, letterY, -0.03);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        markerGroup.add(mesh);

        const charW = letterWidths[char] ?? 0.28;
        currentX += charW + letterSpacing;
      });

      // 4. Subtle warm architectural uplight
      const spot = new THREE.PointLight(0xffbe42, 0.38, 4.0, 1.8);
      spot.position.set(0, 0.45, 0.35);
      markerGroup.add(spot);

      compassGroup.add(markerGroup);
    });

    scene.add(compassGroup);
  };

  createStandingOrraSignage();
  createWSTechWreckage();
  createCardinalEdgeSignage();

  // ── 7. GENERATE SMART STRUCTURE-AWARE VOLUMETRIC LAWN GRASS ──
  // Automatically scans all buildings, plinths, signage, and wreckage to ensure
  // dense lush grass carpets the island without ever clipping through structures.
  terrainGenerator.generateVolumetricLawnGrass();

  // Freeze only truly static opaque details into spatial batches. Lighting,
  // interaction, weather and machine motion keep their original live objects.
  const preserveFromBatch = new Set<THREE.Object3D>([
    ...interactiveMeshes.keys(), ...serverLeds, ...rippleRings, ...bambooStalks,
    ...stationPins.values(), ...floorTags.values(), ...darknessOverlays.values(),
    advancedTechLab.group,
  ]);
  lightControls.forEach((fixtures) => fixtures.forEach((fixture) => {
    preserveFromBatch.add(fixture.group);
    preserveFromBatch.add(fixture.bulb);
    if (fixture.floorPool) preserveFromBatch.add(fixture.floorPool);
  }));
  scene.traverse((object) => {
    if (
      object.name === "height-adjustable-assembly" ||
      object.name === "lift-screw" ||
      object.name === "industrial-extruder-head" ||
      object.name === "turbine-tach-disc" ||
      object.name === "solar-tilt-assembly" ||
      object.name === "plasma-pinch-torus" ||
      object.name === "orbital-optical-power-beam" ||
      object.name === "condenser-fan-blade"
    ) preserveFromBatch.add(object.name === "condenser-fan-blade" ? object.parent! : object);
  });
  batchStaticMeshes(scene, preserveFromBatch, 20);

  // ── WATER & AMBIENT ANIMATION TICK HANDLER ───────────────────────────

  const updateWater = (time: number, delta: number = 0.016) => {
    const sec = time * 0.001;
    waterShaderMat.uniforms.uTime.value = sec;

    // Execute ambient spatial animations (rotations, pulses, fans, radar)
    ambientUpdaters.forEach((fn) => fn(time, delta));
  };

  return {
    scene,
    interactiveMeshes,
    stationPins,
    serverLeds,
    floorTags,
    darknessOverlays,
    lightControls,
    setLightState,
    getLightState,
    updateLighting,
    updateWater,
    updateGrassLod: (eye: THREE.Vector3, farDistance: number, cullDistance: number) =>
      terrainGenerator.terrainEngine.volumetricGrass?.updateLod(eye, farDistance, cullDistance),
    updateKitchenMarker,
    togglePowerPlantArc: powerPlant.toggleArc,
    isPowerPlantArcActive: powerPlant.isArcActive,
    setPowerPlantLevel: powerPlant.setPowerLevel,
    getPowerPlantLevel: powerPlant.getPowerLevel,
    toggleScientificUpgrade: powerPlant.toggleScientificUpgrade,
    isScientificUpgraded: powerPlant.isScientificUpgraded,
  };
}

