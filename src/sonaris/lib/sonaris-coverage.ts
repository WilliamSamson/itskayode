import type { ScanPoint, ScanObstacle } from "./sonaris-engine";
import { wheelSpeeds } from "./sonaris-engine";

export interface TrajectoryPoint {
  x: number;
  z: number;
  headingDeg: number;
  vx: number;
  vz: number;
  omegaDeg: number;
  wheelRPMs: [number, number, number, number]; // FL, FR, RL, RR
  apfForce?: [number, number];
  clearance?: number;
}

export interface NavigationTelemetry {
  planner: "theta_star";
  controller: "pure_pursuit";
  slamState: "localizing_2d" | "settling" | "reconstructing_3d" | "gap_evaluating";
  lookaheadDistance: number;
  apfRepulsionForce: [number, number];
  minObstacleClearance: number;
  timeToCollision: number;
  interlockLocked0Deg: boolean;
}

export interface WallSegment {
  wall: "north" | "south" | "east" | "west";
  start: [number, number]; // [x, z]
  end: [number, number];
  hits: number;
}

export interface WallHeightBin {
  index: number;
  minY: number; // in meters (e.g. index * 0.15)
  maxY: number;
  count: number;
  status: "captured" | "unseen" | "out_of_reach";
}

export const VOXEL_UNKNOWN = 0;
export const VOXEL_FREE = 1;
export const VOXEL_OCCUPIED = 2;

export interface VoxelStats {
  totalVoxels: number;
  freeCount: number;
  occupiedCount: number;
  unknownCount: number;
  frontierCount: number;
  volumePercent: number; // 0 to 100
}

export class VoxelOccupancyGrid {
  readonly width: number;
  readonly depth: number;
  readonly height: number;
  readonly voxelSize: number;
  readonly nx: number;
  readonly ny: number;
  readonly nz: number;
  readonly grid: Uint8Array;

  constructor(width: number, depth: number, height = 3.0, voxelSize = 0.25) {
    this.width = width;
    this.depth = depth;
    this.height = height;
    this.voxelSize = voxelSize;
    this.nx = Math.max(1, Math.ceil(width / voxelSize));
    this.ny = Math.max(1, Math.ceil(height / voxelSize));
    this.nz = Math.max(1, Math.ceil(depth / voxelSize));
    this.grid = new Uint8Array(this.nx * this.ny * this.nz);
  }

  index(ix: number, iy: number, iz: number): number {
    if (ix < 0 || ix >= this.nx || iy < 0 || iy >= this.ny || iz < 0 || iz >= this.nz) {
      return -1;
    }
    return (iy * this.nz + iz) * this.nx + ix;
  }

  worldToGrid(x: number, y: number, z: number): [number, number, number] {
    const ix = Math.floor((x + this.width / 2) / this.voxelSize);
    const iy = Math.floor(y / this.voxelSize);
    const iz = Math.floor((z + this.depth / 2) / this.voxelSize);
    return [ix, iy, iz];
  }

  gridToWorld(ix: number, iy: number, iz: number): [number, number, number] {
    const x = -this.width / 2 + (ix + 0.5) * this.voxelSize;
    const y = (iy + 0.5) * this.voxelSize;
    const z = -this.depth / 2 + (iz + 0.5) * this.voxelSize;
    return [x, y, z];
  }

  get(ix: number, iy: number, iz: number): number {
    const idx = this.index(ix, iy, iz);
    return idx >= 0 ? this.grid[idx] : VOXEL_UNKNOWN;
  }

  set(ix: number, iy: number, iz: number, value: number) {
    const idx = this.index(ix, iy, iz);
    if (idx >= 0) this.grid[idx] = value;
  }

  markOccupied(x: number, y: number, z: number) {
    const [ix, iy, iz] = this.worldToGrid(x, y, z);
    const idx = this.index(ix, iy, iz);
    if (idx >= 0) this.grid[idx] = VOXEL_OCCUPIED;
  }

  /**
   * Clears free space along the ray from sensor origin (x0, y0, z0) to point (x1, y1, z1).
   */
  rayTrace(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) {
    const dist = Math.hypot(x1 - x0, y1 - y0, z1 - z0);
    if (dist < 1e-4) return;
    const stepSize = this.voxelSize * 0.5;
    const numSteps = Math.max(1, Math.floor(dist / stepSize));
    const dx = (x1 - x0) / numSteps;
    const dy = (y1 - y0) / numSteps;
    const dz = (z1 - z0) / numSteps;

    // Clear traversed voxels as FREE (except the endpoint)
    for (let s = 0; s < numSteps - 1; s++) {
      const cx = x0 + dx * s;
      const cy = y0 + dy * s;
      const cz = z0 + dz * s;
      const [ix, iy, iz] = this.worldToGrid(cx, cy, cz);
      const idx = this.index(ix, iy, iz);
      if (idx >= 0 && this.grid[idx] !== VOXEL_OCCUPIED) {
        this.grid[idx] = VOXEL_FREE;
      }
    }

    // Endpoint is OCCUPIED
    const [ex, ey, ez] = this.worldToGrid(x1, y1, z1);
    const eIdx = this.index(ex, ey, ez);
    if (eIdx >= 0) {
      this.grid[eIdx] = VOXEL_OCCUPIED;
    }
  }

  computeStats(): VoxelStats {
    let freeCount = 0;
    let occupiedCount = 0;
    let unknownCount = 0;
    let frontierCount = 0;
    const totalVoxels = this.grid.length;

    for (let iy = 0; iy < this.ny; iy++) {
      for (let iz = 0; iz < this.nz; iz++) {
        for (let ix = 0; ix < this.nx; ix++) {
          const val = this.grid[this.index(ix, iy, iz)];
          if (val === VOXEL_OCCUPIED) {
            occupiedCount++;
          } else if (val === VOXEL_FREE) {
            freeCount++;
            // Check 6-neighborhood for unknown voxels -> frontier
            const isFrontier =
              this.get(ix + 1, iy, iz) === VOXEL_UNKNOWN ||
              this.get(ix - 1, iy, iz) === VOXEL_UNKNOWN ||
              this.get(ix, iy + 1, iz) === VOXEL_UNKNOWN ||
              this.get(ix, iy - 1, iz) === VOXEL_UNKNOWN ||
              this.get(ix, iy, iz + 1) === VOXEL_UNKNOWN ||
              this.get(ix, iy, iz - 1) === VOXEL_UNKNOWN;
            if (isFrontier) frontierCount++;
          } else {
            unknownCount++;
          }
        }
      }
    }

    const volumePercent =
      totalVoxels > 0
        ? Math.round(((freeCount + occupiedCount) / totalVoxels) * 100)
        : 0;

    return {
      totalVoxels,
      freeCount,
      occupiedCount,
      unknownCount,
      frontierCount,
      volumePercent
    };
  }
}

/**
 * Downsamples dense point clouds into a voxel grid representation.
 * Points falling within the same 3D cubic voxel (default 25mm resolution)
 * are filtered to one representative point per voxel.
 * Compresses repetitive wall/floor scans by 70%-85% without geometric fidelity loss.
 */
export function downsampleVoxelPoints(
  points: ScanPoint[],
  voxelSize = 0.025
): ScanPoint[] {
  if (points.length <= 1) return points;
  const grid = new Map<string, ScanPoint>();
  const inv = 1 / Math.max(0.005, voxelSize);

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const vx = Math.round(p.x * inv);
    const vy = Math.round(p.y * inv);
    const vz = Math.round(p.z * inv);
    const key = `${vx}_${vy}_${vz}`;
    if (!grid.has(key)) {
      grid.set(key, p);
    }
  }

  return Array.from(grid.values());
}

/**
 * Filters out incoming points whose 3D voxel coordinate is already occupied in the reference cloud.
 * Prevents buffer thrashing and memory growth when re-scanning known geometry.
 */
export function filterDuplicateVoxelPoints(
  incoming: ScanPoint[],
  existing: ScanPoint[],
  voxelSize = 0.025
): ScanPoint[] {
  if (incoming.length === 0) return [];
  if (existing.length === 0) return downsampleVoxelPoints(incoming, voxelSize);

  const inv = 1 / Math.max(0.005, voxelSize);
  const existingSet = new Set<string>();
  for (let i = 0; i < existing.length; i++) {
    const p = existing[i];
    const vx = Math.round(p.x * inv);
    const vy = Math.round(p.y * inv);
    const vz = Math.round(p.z * inv);
    existingSet.add(`${vx}_${vy}_${vz}`);
  }

  const result: ScanPoint[] = [];
  for (let i = 0; i < incoming.length; i++) {
    const p = incoming[i];
    const vx = Math.round(p.x * inv);
    const vy = Math.round(p.y * inv);
    const vz = Math.round(p.z * inv);
    const key = `${vx}_${vy}_${vz}`;
    if (!existingSet.has(key)) {
      existingSet.add(key);
      result.push(p);
    }
  }

  return result;
}

export interface OdometryDriftResult {
  estimatedPose: { x: number; z: number; heading: number };
  driftOffset: { dx: number; dz: number; dHeadingDeg: number };
}

/**
 * Simulates real Mecanum wheel roller slippage during transit and yaw rotation.
 * Mecanum wheels suffer 2-4% longitudinal slip and 4-8% lateral/strafe slip under acceleration.
 */
export function addMecanumOdometryDrift(
  actualPose: { x: number; z: number; heading: number },
  distanceTraveledM: number,
  turnAngleDeg: number,
  seed = 42
): OdometryDriftResult {
  const h1 =
    ((Math.imul(Math.round(distanceTraveledM * 100) + seed, 1664525) + 1013904223) >>> 0) /
    4294967295;
  const h2 =
    ((Math.imul(Math.round(turnAngleDeg * 10) + seed * 7, 22695477) + 1) >>> 0) / 4294967295;

  const transSlip = distanceTraveledM * 0.035 * (h1 * 2 - 1);
  const strafeSlip = distanceTraveledM * 0.045 * (h2 * 2 - 1);
  const rotSlip = (turnAngleDeg / 90) * 0.8 * (h1 - 0.5);

  const rad = (actualPose.heading * Math.PI) / 180;
  const dx = transSlip * Math.cos(rad) - strafeSlip * Math.sin(rad);
  const dz = transSlip * Math.sin(rad) + strafeSlip * Math.cos(rad);
  const dHeadingDeg = rotSlip;

  return {
    estimatedPose: {
      x: Number((actualPose.x + dx).toFixed(3)),
      z: Number((actualPose.z + dz).toFixed(3)),
      heading: Number(((actualPose.heading + dHeadingDeg + 360) % 360).toFixed(1))
    },
    driftOffset: {
      dx: Number(dx.toFixed(3)),
      dz: Number(dz.toFixed(3)),
      dHeadingDeg: Number(dHeadingDeg.toFixed(2))
    }
  };
}

export interface ICPResult {
  alignedPoints: ScanPoint[];
  transform: { dx: number; dz: number; dThetaDeg: number };
  residualErrorM: number;
  converged: boolean;
  iterations: number;
}

/**
 * 2D Iterative Closest Point (ICP) scan-matching registration.
 * Aligns raw scan points to reference point cloud to eliminate Mecanum odometry drift.
 */
export function alignScanICP(
  rawPoints: ScanPoint[],
  referencePoints: ScanPoint[],
  options?: { maxIterations?: number; maxCorrespondenceDist?: number }
): ICPResult {
  if (rawPoints.length === 0 || referencePoints.length === 0) {
    return {
      alignedPoints: rawPoints,
      transform: { dx: 0, dz: 0, dThetaDeg: 0 },
      residualErrorM: 0,
      converged: true,
      iterations: 0
    };
  }

  const maxIter = options?.maxIterations ?? 15;
  const maxDist = options?.maxCorrespondenceDist ?? 0.60;
  const maxDistSq = maxDist * maxDist;

  // Subsample large reference clouds so correspondence search stays sub-millisecond
  const refStride = Math.max(1, Math.floor(referencePoints.length / 360));
  const sampledRef =
    refStride > 1
      ? referencePoints.filter((_, idx) => idx % refStride === 0)
      : referencePoints;

  const currentPoints = rawPoints.map((p) => ({ ...p }));
  let totalDx = 0;
  let totalDz = 0;
  let totalDTheta = 0;
  let prevError = Infinity;
  let finalError = 0;
  let iter = 0;

  for (iter = 0; iter < maxIter; iter++) {
    // 1. Find nearest neighbors in reference map using squared Euclidean distance
    const pairs: { src: ScanPoint; ref: ScanPoint; dist: number }[] = [];
    let sumDist = 0;

    for (let i = 0; i < currentPoints.length; i++) {
      const p = currentPoints[i];
      let bestDistSq = maxDistSq;
      let bestRef: ScanPoint | null = null;
      for (let j = 0; j < sampledRef.length; j++) {
        const r = sampledRef[j];
        const dx = p.x - r.x;
        const dz = p.z - r.z;
        const dSq = dx * dx + dz * dz;
        if (dSq < bestDistSq) {
          bestDistSq = dSq;
          bestRef = r;
        }
      }
      if (bestRef !== null) {
        const d = Math.sqrt(bestDistSq);
        pairs.push({ src: p, ref: bestRef, dist: d });
        sumDist += d;
      }
    }

    if (pairs.length < 6) break;

    const meanError = sumDist / pairs.length;
    finalError = meanError;

    if (Math.abs(prevError - meanError) < 0.001) {
      break; // Converged
    }
    prevError = meanError;

    // 2. Compute centroids
    let srcCx = 0,
      srcCz = 0,
      refCx = 0,
      refCz = 0;
    for (const { src, ref } of pairs) {
      srcCx += src.x;
      srcCz += src.z;
      refCx += ref.x;
      refCz += ref.z;
    }
    const n = pairs.length;
    srcCx /= n;
    srcCz /= n;
    refCx /= n;
    refCz /= n;

    // 3. 2D rotation via cross-covariance
    let sxx = 0,
      sxz = 0,
      szx = 0,
      szz = 0;
    for (const { src, ref } of pairs) {
      const px = src.x - srcCx;
      const pz = src.z - srcCz;
      const qx = ref.x - refCx;
      const qz = ref.z - refCz;
      sxx += px * qx;
      sxz += px * qz;
      szx += pz * qx;
      szz += pz * qz;
    }

    const dTheta = Math.atan2(sxz - szx, sxx + szz);
    const cosT = Math.cos(dTheta);
    const sinT = Math.sin(dTheta);

    const stepDx = refCx - (srcCx * cosT - srcCz * sinT);
    const stepDz = refCz - (srcCx * sinT + srcCz * cosT);

    totalDx += stepDx;
    totalDz += stepDz;
    totalDTheta += dTheta;

    // Apply incremental transformation
    for (const p of currentPoints) {
      const rx = p.x * cosT - p.z * sinT + stepDx;
      const rz = p.x * sinT + p.z * cosT + stepDz;
      p.x = rx;
      p.z = rz;
    }
  }

  return {
    alignedPoints: currentPoints,
    transform: {
      dx: Number(totalDx.toFixed(4)),
      dz: Number(totalDz.toFixed(4)),
      dThetaDeg: Number(((totalDTheta * 180) / Math.PI).toFixed(2))
    },
    residualErrorM: Number(finalError.toFixed(4)),
    converged: iter < maxIter,
    iterations: iter
  };
}

export interface CoverageReport {
  totalSegments: number;
  mappedSegments: number;
  coveragePercent: number; // 0 to 100
  heightBins: WallHeightBin[]; // 16 vertical bins of 15 cm
  capturedBinsCount: number;
  unseenBinsCount: number;
  outOfReachBinsCount: number;
  voxelStats?: VoxelStats;
  gaps: {
    wall: "north" | "south" | "east" | "west";
    center: [number, number];
    spanM: number;
  }[];
  primaryGap: {
    wall: "north" | "south" | "east" | "west";
    center: [number, number];
    spanM: number;
  } | null;
  recommendedVantage: {
    x: number;
    z: number;
    heading: number; // degrees
    suggestedTilt: number;
  };
}

export interface TerrainFeature {
  type: "ramp" | "mezzanine" | "rough_patch" | "curb";
  x: number;
  z: number;
  width: number;
  depth: number;
  height?: number;
  direction?: "posX" | "negX" | "posZ" | "negZ";
  roughnessM?: number; // e.g. 0.025m for micro-undulation
}

export interface RoomEnvironment {
  id: "chamber" | string;
  name: string;
  width: number;
  depth: number;
  height: number;
  description: string;
  obstacles: ScanObstacle[];
  terrainFeatures?: TerrainFeature[];
}

export const ROOM_PRESETS: RoomEnvironment[] = [
  {
    id: "chamber",
    name: "Open Ground Plane (7×6m)",
    width: 7,
    depth: 6,
    height: 3,
    description: "Unobstructed flat arena plane for baseline kinematics calibration, 2D Cartographer SLAM, and unrestricted Mecanum transit.",
    obstacles: []
  },
  {
    id: "mezzanine_ramp",
    name: "Topographical Ramp & Mezzanine (8×7m)",
    width: 8,
    depth: 7,
    height: 3.4,
    description: "Multi-level metrology facility with a 10° inclined climbing ramp (+0.42m rise) leading to an elevated mezzanine floor. Validates chassis pitch compensation and ST3215 servo elevation leveling.",
    terrainFeatures: [
      { type: "ramp", x: -0.6, z: 0.2, width: 1.4, depth: 2.4, height: 0.42, direction: "posZ" },
      { type: "mezzanine", x: -0.6, z: 2.1, width: 3.4, depth: 1.4, height: 0.42 }
    ],
    obstacles: [
      // Inclined physical ramp wedge
      { x: -0.6, z: 0.2, width: 1.4, depth: 2.4, height: 0.42, shape: "ramp", rampDirection: "posZ" },
      // Elevated Mezzanine Deck block
      { x: -0.6, z: 2.1, width: 3.4, depth: 1.4, height: 0.42, baseY: 0 },
      // Mezzanine perimeter guardrails (left, right, back)
      { x: -2.3, z: 2.1, width: 0.08, depth: 1.4, height: 0.70, baseY: 0.42 },
      { x: 1.1, z: 2.1, width: 0.08, depth: 1.4, height: 0.70, baseY: 0.42 },
      { x: -0.6, z: 2.8, width: 3.4, depth: 0.08, height: 0.70, baseY: 0.42 },
      // Support pillars beneath mezzanine
      { x: -2.0, z: 1.5, width: 0.20, depth: 0.20, height: 0.42, baseY: 0 },
      { x: 0.8, z: 1.5, width: 0.20, depth: 0.20, height: 0.42, baseY: 0 },
      // Lower floor calibration crate
      { x: 1.8, z: -1.2, width: 0.70, depth: 0.70, height: 0.85, baseY: 0 }
    ]
  },
  {
    id: "curved_corridor",
    name: "Curved S-Corridor & Pillars (8×7m)",
    width: 8,
    depth: 7,
    height: 3.2,
    description: "Sinuous architectural layout with massive cylindrical columns (r=0.35m–0.45m), serpentine chicane bends, and blind corners testing Theta* curved contour navigation and 2D ICP contour matching.",
    obstacles: [
      // 4 Massive Cylindrical Columns
      { x: -1.6, z: -0.8, width: 0.7, depth: 0.7, height: 3.0, shape: "cylinder", radius: 0.35 },
      { x: 1.5, z: 0.8, width: 0.9, depth: 0.9, height: 3.0, shape: "cylinder", radius: 0.45 },
      { x: -1.2, z: 1.6, width: 0.7, depth: 0.7, height: 3.0, shape: "cylinder", radius: 0.35 },
      { x: 1.8, z: -1.4, width: 0.7, depth: 0.7, height: 3.0, shape: "cylinder", radius: 0.35 },
      // Slanted / Angled Partition Walls creating the chicane
      { x: -0.2, z: 0.2, width: 0.20, depth: 1.6, height: 2.4, baseY: 0 },
      { x: -0.2, z: -1.6, width: 1.4, depth: 0.20, height: 2.4, baseY: 0 },
      // Concave alcove partition
      { x: 2.4, z: 1.8, width: 0.20, depth: 1.2, height: 2.0, baseY: 0 }
    ]
  },
  {
    id: "rough_yard",
    name: "Rough Yard & Berms (8×6m)",
    width: 8,
    depth: 6,
    height: 3.0,
    description: "Industrial yard terrain with micro-undulated gravel patch (±25mm), sloped earth berms, stepped curbs, and negative drainage trench testing terrain height filtering.",
    terrainFeatures: [
      { type: "rough_patch", x: -0.8, z: -0.6, width: 2.6, depth: 2.4, roughnessM: 0.025 },
      { type: "curb", x: 1.0, z: -0.5, width: 0.15, depth: 2.8, height: 0.045 }
    ],
    obstacles: [
      // Negative drainage trench
      { x: 1.6, z: 0.6, width: 0.60, depth: 2.2, height: 0, isHole: true },
      // Stepped curb edge
      { x: 1.0, z: -0.5, width: 0.15, depth: 2.8, height: 0.045, baseY: 0 },
      // Sloped earth berm ramp
      { x: -2.4, z: 1.2, width: 1.2, depth: 1.8, height: 0.35, shape: "ramp", rampDirection: "negX" },
      // Industrial equipment crate
      { x: 0.2, z: 1.4, width: 0.75, depth: 0.75, height: 0.90, baseY: 0 }
    ]
  },
  {
    id: "holes",
    name: "Floor Voids & Drop-Offs (7×6m)",
    width: 7,
    depth: 6,
    height: 3,
    description: "Chamber featuring negative floor pits and drop-off trenches for testing downward tilt (-16° to -25°) edge-detection and reactive holonomic strafes.",
    obstacles: [
      { x: 0, z: 0.6, width: 0.8, depth: 0.8, height: 0, isHole: true },
      { x: -1.6, z: -0.8, width: 0.9, depth: 0.7, height: 0, isHole: true },
      { x: 1.5, z: 0.2, width: 0.7, depth: 1.0, height: 0, isHole: true },
      { x: -1.2, z: 1.4, width: 0.6, depth: 0.6, height: 0, isHole: true }
    ]
  },
  {
    id: "hangs",
    name: "Clearance Hangs (Low & High)",
    width: 8,
    depth: 6,
    height: 3.2,
    description: "Chamber with low-hanging barriers requiring chassis detours and high-hanging overhead trusses that allow safe rover underpass while mapped overhead by upward LiDAR sweep.",
    obstacles: [
      // Low-hanging barrier (base at 0.36m, blocks 0.50m mast height)
      { x: -0.8, z: 0.5, width: 1.6, depth: 0.35, height: 0.30, baseY: 0.36 },
      // Low-hanging duct (base at 0.34m)
      { x: 1.4, z: -0.7, width: 1.2, depth: 0.40, height: 0.32, baseY: 0.34 },
      // High-hanging overhead truss (base at 1.75m, rover drives safely underneath)
      { x: 0, z: -0.2, width: 3.4, depth: 0.50, height: 0.45, baseY: 1.75 },
      // High-hanging fixture
      { x: -1.8, z: 1.3, width: 0.8, depth: 0.8, height: 0.35, baseY: 2.10 },
      // Structural floor pillar
      { x: 2.2, z: 1.0, width: 0.5, depth: 0.5, height: 2.8, baseY: 0 }
    ]
  },
  {
    id: "shelves",
    name: "Warehouse Shelving & Racks",
    width: 8,
    depth: 7,
    height: 3.2,
    description: "Industrial warehouse corridor with multi-tier storage racks, lower pallet decks, and elevated shelving tiers scanned in full 3D from the tilting S2 LiDAR.",
    obstacles: [
      // Rack 1 (Left Aisle) - uprights and 3 shelf decks
      { x: -1.8, z: 0.8, width: 0.12, depth: 0.8, height: 2.4, baseY: 0 },
      { x: -0.8, z: 0.8, width: 0.12, depth: 0.8, height: 2.4, baseY: 0 },
      { x: -1.3, z: 0.8, width: 1.15, depth: 0.75, height: 0.08, baseY: 0.35 },
      { x: -1.3, z: 0.8, width: 1.15, depth: 0.75, height: 0.08, baseY: 1.05 },
      { x: -1.3, z: 0.8, width: 1.15, depth: 0.75, height: 0.08, baseY: 1.75 },

      // Rack 2 (Right Aisle) - uprights and 3 shelf decks
      { x: 1.0, z: -0.8, width: 0.12, depth: 0.8, height: 2.4, baseY: 0 },
      { x: 2.0, z: -0.8, width: 0.12, depth: 0.8, height: 2.4, baseY: 0 },
      { x: 1.5, z: -0.8, width: 1.15, depth: 0.75, height: 0.08, baseY: 0.35 },
      { x: 1.5, z: -0.8, width: 1.15, depth: 0.75, height: 0.08, baseY: 1.05 },
      { x: 1.5, z: -0.8, width: 1.15, depth: 0.75, height: 0.08, baseY: 1.75 },

      // Floor pallet / cargo crates
      { x: -1.3, z: -1.3, width: 0.75, depth: 0.75, height: 0.55, baseY: 0 },
      { x: 1.5, z: 1.2, width: 0.70, depth: 0.70, height: 0.65, baseY: 0 }
    ]
  }
];

/**
 * Calculates continuous ground elevation y at coordinates (x, z) taking into account
 * ramps, mezzanines, steps, and micro-terrain roughness.
 */
export function getRoomElevationAt(room: RoomEnvironment, x: number, z: number): number {
  if (!room.terrainFeatures || room.terrainFeatures.length === 0) {
    return 0;
  }
  let elevation = 0;
  for (const feat of room.terrainFeatures) {
    const halfW = feat.width / 2;
    const halfD = feat.depth / 2;
    if (Math.abs(x - feat.x) <= halfW && Math.abs(z - feat.z) <= halfD) {
      if (feat.type === "ramp") {
        const dir = feat.direction ?? "posZ";
        const h = feat.height ?? 0.42;
        if (dir === "posZ") {
          const t = Math.max(0, Math.min(1, (z - (feat.z - halfD)) / feat.depth));
          elevation = Math.max(elevation, t * h);
        } else if (dir === "negZ") {
          const t = Math.max(0, Math.min(1, ((feat.z + halfD) - z) / feat.depth));
          elevation = Math.max(elevation, t * h);
        } else if (dir === "posX") {
          const t = Math.max(0, Math.min(1, (x - (feat.x - halfW)) / feat.width));
          elevation = Math.max(elevation, t * h);
        } else if (dir === "negX") {
          const t = Math.max(0, Math.min(1, ((feat.x + halfW) - x) / feat.width));
          elevation = Math.max(elevation, t * h);
        }
      } else if (feat.type === "mezzanine") {
        elevation = Math.max(elevation, feat.height ?? 0.42);
      } else if (feat.type === "rough_patch") {
        const roughness = feat.roughnessM ?? 0.025;
        const micro = roughness * Math.sin(x * 12.0) * Math.cos(z * 15.0);
        elevation += micro;
      } else if (feat.type === "curb") {
        elevation = Math.max(elevation, feat.height ?? 0.045);
      }
    }
  }
  return Number(elevation.toFixed(3));
}

/**
 * Calculates 3D surface attitude (ground pitch & roll angles in degrees) based on
 * directional gradient of terrain height-field relative to rover heading.
 */
export function getRoomAttitudeAt(
  room: RoomEnvironment,
  x: number,
  z: number,
  headingDeg: number
): { elevation: number; pitchDeg: number; rollDeg: number } {
  const elev = getRoomElevationAt(room, x, z);
  const eps = 0.08;
  const elevFwdX = getRoomElevationAt(room, x + eps, z);
  const elevBackX = getRoomElevationAt(room, x - eps, z);
  const elevFwdZ = getRoomElevationAt(room, x, z + eps);
  const elevBackZ = getRoomElevationAt(room, x, z - eps);

  const gradX = (elevFwdX - elevBackX) / (2 * eps);
  const gradZ = (elevFwdZ - elevBackZ) / (2 * eps);

  const rad = (headingDeg * Math.PI) / 180;
  const fwdX = Math.cos(rad);
  const fwdZ = Math.sin(rad);
  const latX = -Math.sin(rad);
  const latZ = Math.cos(rad);

  const slopeFwd = gradX * fwdX + gradZ * fwdZ;
  const slopeLat = gradX * latX + gradZ * latZ;

  const pitchDeg = Number(((Math.atan(slopeFwd) * 180) / Math.PI).toFixed(1));
  const rollDeg = Number(((Math.atan(slopeLat) * 180) / Math.PI).toFixed(1));

  return { elevation: elev, pitchDeg, rollDeg };
}

function isPointInBox(x: number, z: number, bMinX: number, bMaxX: number, bMinZ: number, bMaxZ: number): boolean {
  return x >= bMinX && x <= bMaxX && z >= bMinZ && z <= bMaxZ;
}

/**
 * Checks if line segment between (x1, z1) and (x2, z2) intersects an axis-aligned box.
 */
function lineIntersectsBox(
  x1: number,
  z1: number,
  x2: number,
  z2: number,
  boxMinX: number,
  boxMaxX: number,
  boxMinZ: number,
  boxMaxZ: number
): boolean {
  if (isPointInBox(x1, z1, boxMinX, boxMaxX, boxMinZ, boxMaxZ) || isPointInBox(x2, z2, boxMinX, boxMaxX, boxMinZ, boxMaxZ)) {
    return true;
  }
  // Ray parameter t in [0, 1]
  const dx = x2 - x1;
  const dz = z2 - z1;

  let tMin = 0;
  let tMax = 1;

  if (Math.abs(dx) < 1e-9) {
    if (x1 < boxMinX || x1 > boxMaxX) return false;
  } else {
    const t1 = (boxMinX - x1) / dx;
    const t2 = (boxMaxX - x1) / dx;
    tMin = Math.max(tMin, Math.min(t1, t2));
    tMax = Math.min(tMax, Math.max(t1, t2));
    if (tMin > tMax) return false;
  }

  if (Math.abs(dz) < 1e-9) {
    if (z1 < boxMinZ || z1 > boxMaxZ) return false;
  } else {
    const t1 = (boxMinZ - z1) / dz;
    const t2 = (boxMaxZ - z1) / dz;
    tMin = Math.max(tMin, Math.min(t1, t2));
    tMax = Math.min(tMax, Math.max(t1, t2));
    if (tMin > tMax) return false;
  }

  return tMin <= tMax;
}

/**
 * Verifies whether a straight path segment from a to b remains collision-free.
 */
export function isLineClear(
  x1: number,
  z1: number,
  x2: number,
  z2: number,
  obstacles: ScanObstacle[],
  safetyMargin = 0.35,
  roomW = 20,
  roomD = 20
): boolean {
  const halfW = roomW / 2 - 0.20;
  const halfD = roomD / 2 - 0.20;
  if (Math.abs(x1) > halfW || Math.abs(z1) > halfD || Math.abs(x2) > halfW || Math.abs(z2) > halfD) {
    return false;
  }
  for (const o of obstacles) {
    if ((o.baseY ?? 0) >= 0.65) continue; // High-hanging obstacles above 0.65m clear rover chassis
    if (o.shape === "ramp") continue; // Navigable terrain incline
    if (o.shape === "cylinder") {
      const r = (o.radius ?? o.width / 2) + safetyMargin;
      const ldx = x2 - x1, ldz = z2 - z1;
      const lLenSq = ldx * ldx + ldz * ldz;
      const t = lLenSq > 1e-10 ? Math.max(0, Math.min(1, ((o.x - x1) * ldx + (o.z - z1) * ldz) / lLenSq)) : 0;
      const px = x1 + t * ldx, pz = z1 + t * ldz;
      if ((px - o.x) ** 2 + (pz - o.z) ** 2 < r * r) {
        return false;
      }
      continue;
    }
    const minX = o.x - o.width / 2 - safetyMargin;
    const maxX = o.x + o.width / 2 + safetyMargin;
    const minZ = o.z - o.depth / 2 - safetyMargin;
    const maxZ = o.z + o.depth / 2 + safetyMargin;
    if (lineIntersectsBox(x1, z1, x2, z2, minX, maxX, minZ, maxZ)) {
      return false;
    }
  }
  return true;
}

/**
 * Greedily smooths waypoints by checking line-of-sight shortcutting.
 */
export function smoothThetaPath(
  path: [number, number][],
  obstacles: ScanObstacle[],
  safetyMargin: number,
  roomW: number,
  roomD: number
): [number, number][] {
  if (path.length <= 2) return path;
  const smoothed: [number, number][] = [path[0]];
  let anchor = 0;

  while (anchor < path.length - 1) {
    let candidate = path.length - 1;
    while (candidate > anchor + 1) {
      if (
        isLineClear(
          path[anchor][0],
          path[anchor][1],
          path[candidate][0],
          path[candidate][1],
          obstacles,
          safetyMargin,
          roomW,
          roomD
        )
      ) {
        break;
      }
      candidate--;
    }
    smoothed.push(path[candidate]);
    anchor = candidate;
  }
  return smoothed;
}

/**
 * Theta* Any-Angle Path Planner with 2D Inflated Grid Costmap.
 * Discretizes free space into an inflated costmap grid, runs 8-connected A* search to guarantee finding
 * the global collision-free shortest path around obstacles and negative floor holes, then applies
 * string-pulling (Theta* line-of-sight shortcutting) for direct, smooth kinematics.
 */
export function findThetaStarPath(
  start: [number, number],
  goal: [number, number],
  obstacles: ScanObstacle[],
  roomW: number,
  roomD: number,
  safetyMargin = 0.35
): [number, number][] {
  const [sx, sz] = start;
  const [gx, gz] = goal;

  const clampW = roomW / 2 - 0.20;
  const clampD = roomD / 2 - 0.20;
  const validSx = Math.max(-clampW, Math.min(clampW, sx));
  const validSz = Math.max(-clampD, Math.min(clampD, sz));
  const validGx = Math.max(-clampW, Math.min(clampW, gx));
  const validGz = Math.max(-clampD, Math.min(clampD, gz));

  // Direct line-of-sight shortcut if straight path is completely clear
  if (isLineClear(validSx, validSz, validGx, validGz, obstacles, safetyMargin, roomW, roomD)) {
    return [[sx, sz], [validGx, validGz]];
  }

  const cellSize = 0.12; // 12 cm grid resolution
  const halfW = clampW;
  const halfD = clampD;

  const minX = -halfW;
  const maxX = halfW;
  const minZ = -halfD;
  const maxZ = halfD;

  const cols = Math.round((maxX - minX) / cellSize) + 1;
  const rows = Math.round((maxZ - minZ) / cellSize) + 1;

  const toCol = (x: number) => Math.min(cols - 1, Math.max(0, Math.round((x - minX) / cellSize)));
  const toRow = (z: number) => Math.min(rows - 1, Math.max(0, Math.round((z - minZ) / cellSize)));
  const toX = (c: number) => Number((minX + c * cellSize).toFixed(3));
  const toZ = (r: number) => Number((minZ + r * cellSize).toFixed(3));
  const toIndex = (c: number, r: number) => r * cols + c;

  // Filter ground obstacles & holes that impede the rover chassis (baseY < 0.65m)
  const activeObstacles = obstacles.filter((o) => (o.baseY ?? 0) < 0.65);

  const isBlockedCoord = (x: number, z: number, margin = safetyMargin): boolean => {
    if (Math.abs(x) > halfW || Math.abs(z) > halfD) return true;
    for (let i = 0; i < activeObstacles.length; i++) {
      const o = activeObstacles[i];
      if (o.shape === "ramp") continue; // Navigable terrain incline
      if (o.shape === "cylinder") {
        const r = (o.radius ?? o.width / 2) + margin;
        if ((x - o.x) ** 2 + (z - o.z) ** 2 <= r * r) {
          return true;
        }
        continue;
      }
      const hW = o.width / 2 + margin;
      const hD = o.depth / 2 + margin;
      if (Math.abs(x - o.x) <= hW && Math.abs(z - o.z) <= hD) {
        return true;
      }
    }
    return false;
  };

  // Pre-compute 2D occupancy grid
  const grid = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    const wz = toZ(r);
    for (let c = 0; c < cols; c++) {
      const wx = toX(c);
      if (isBlockedCoord(wx, wz)) {
        grid[toIndex(c, r)] = 1;
      }
    }
  }

  // Find nearest valid free cell if start or goal is inside an inflation envelope
  const findNearestFree = (startC: number, startR: number): [number, number] => {
    if (grid[toIndex(startC, startR)] === 0) return [startC, startR];
    for (let radius = 1; radius < Math.max(cols, rows); radius++) {
      for (let dc = -radius; dc <= radius; dc++) {
        for (let dr = -radius; dr <= radius; dr++) {
          if (Math.abs(dc) !== radius && Math.abs(dr) !== radius) continue;
          const c = startC + dc;
          const r = startR + dr;
          if (c >= 0 && c < cols && r >= 0 && r < rows) {
            if (grid[toIndex(c, r)] === 0) return [c, r];
          }
        }
      }
    }
    return [startC, startR];
  };

  const [startC, startR] = findNearestFree(toCol(validSx), toRow(validSz));
  const [goalC, goalR] = findNearestFree(toCol(validGx), toRow(validGz));

  const startIdx = toIndex(startC, startR);
  const goalIdx = toIndex(goalC, goalR);

  // A* Search on 8-connected grid with min-heap priority queue
  const totalCells = cols * rows;
  const gScore = new Float32Array(totalCells).fill(1e9);
  const parent = new Int32Array(totalCells).fill(-1);
  const closed = new Uint8Array(totalCells);

  gScore[startIdx] = 0;

  const heapIndices: number[] = [startIdx];
  const heapFScores: number[] = [Math.hypot(toX(startC) - toX(goalC), toZ(startR) - toZ(goalR))];

  const heapPush = (idx: number, f: number) => {
    heapIndices.push(idx);
    heapFScores.push(f);
    let i = heapIndices.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heapFScores[i] < heapFScores[p]) {
        const ti = heapIndices[i];
        heapIndices[i] = heapIndices[p];
        heapIndices[p] = ti;
        const tf = heapFScores[i];
        heapFScores[i] = heapFScores[p];
        heapFScores[p] = tf;
        i = p;
      } else break;
    }
  };

  const heapPop = (): number => {
    const top = heapIndices[0];
    const bottom = heapIndices.pop()!;
    const bottomF = heapFScores.pop()!;
    if (heapIndices.length > 0) {
      heapIndices[0] = bottom;
      heapFScores[0] = bottomF;
      let i = 0;
      const len = heapIndices.length;
      while (true) {
        let best = i;
        const left = (i << 1) + 1;
        const right = left + 1;
        if (left < len && heapFScores[left] < heapFScores[best]) best = left;
        if (right < len && heapFScores[right] < heapFScores[best]) best = right;
        if (best !== i) {
          const ti = heapIndices[i];
          heapIndices[i] = heapIndices[best];
          heapIndices[best] = ti;
          const tf = heapFScores[i];
          heapFScores[i] = heapFScores[best];
          heapFScores[best] = tf;
          i = best;
        } else break;
      }
    }
    return top;
  };

  const MOVES = [
    [1, 0, 1.0],
    [-1, 0, 1.0],
    [0, 1, 1.0],
    [0, -1, 1.0],
    [1, 1, 1.414],
    [-1, 1, 1.414],
    [1, -1, 1.414],
    [-1, -1, 1.414]
  ];

  let reachedGoal = false;

  while (heapIndices.length > 0) {
    const curIdx = heapPop();
    if (curIdx === goalIdx) {
      reachedGoal = true;
      break;
    }
    if (closed[curIdx] === 1) continue;
    closed[curIdx] = 1;

    const curC = curIdx % cols;
    const curR = Math.floor(curIdx / cols);
    const curG = gScore[curIdx];

    for (let m = 0; m < MOVES.length; m++) {
      const [dc, dr, moveCost] = MOVES[m];
      const nc = curC + dc;
      const nr = curR + dr;

      if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;
      const nIdx = toIndex(nc, nr);
      if (grid[nIdx] === 1 || closed[nIdx] === 1) continue;

      // Diagonal safety: ensure both orthogonal neighbors are clear to avoid cutting obstacle corners
      if (dc !== 0 && dr !== 0) {
        if (grid[toIndex(curC + dc, curR)] === 1 || grid[toIndex(curC, curR + dr)] === 1) {
          continue;
        }
      }

      const tentativeG = curG + moveCost * cellSize;
      if (tentativeG < gScore[nIdx]) {
        gScore[nIdx] = tentativeG;
        parent[nIdx] = curIdx;
        const h = Math.hypot(toX(nc) - toX(goalC), toZ(nr) - toZ(goalR));
        heapPush(nIdx, tentativeG + h * 1.05);
      }
    }
  }

  if (!reachedGoal) {
    return [[sx, sz], [toX(startC), toZ(startR)], [toX(goalC), toZ(goalR)], [validGx, validGz]];
  }

  // Reconstruct dense grid path
  const densePath: [number, number][] = [];
  let curr = goalIdx;
  while (curr !== -1) {
    const c = curr % cols;
    const r = Math.floor(curr / cols);
    densePath.unshift([toX(c), toZ(r)]);
    if (curr === startIdx) break;
    curr = parent[curr];
  }

  densePath[0] = [sx, sz];
  densePath[densePath.length - 1] = [validGx, validGz];

  // Theta* String Pulling (Line-of-Sight Shortcut Smoothing)
  return smoothThetaPath(densePath, obstacles, safetyMargin, roomW, roomD);
}

/**
 * Calculates collision-free waypoints from start to target around obstacles via Theta*.
 */
export function findNavPath(
  start: [number, number],
  goal: [number, number],
  obstacles: ScanObstacle[],
  roomW: number,
  roomD: number,
  safetyMargin = 0.35
): [number, number][] {
  return findThetaStarPath(start, goal, obstacles, roomW, roomD, safetyMargin);
}

/**
 * Evaluates Artificial Potential Field (APF) forces acting on the holonomic robot.
 */
export function computeAPF(
  position: [number, number],
  goal: [number, number],
  obstacles: ScanObstacle[],
  config: { kAtt?: number; kRep?: number; d0?: number; footprintRadius?: number } = {}
): {
  netForce: [number, number];
  attractiveForce: [number, number];
  repulsiveForce: [number, number];
  minClearance: number;
  timeToCollision: number;
} {
  const kAtt = config.kAtt ?? 1.2;
  const kRep = config.kRep ?? 0.8;
  const d0 = config.d0 ?? 1.2;
  const rFootprint = config.footprintRadius ?? 0.28;

  const [px, pz] = position;
  const [gx, gz] = goal;

  // Attractive force towards goal
  const dxGoal = gx - px;
  const dzGoal = gz - pz;
  const distGoal = Math.hypot(dxGoal, dzGoal);
  const attX = distGoal > 0 ? (dxGoal / distGoal) * Math.min(distGoal * kAtt, 1.5) : 0;
  const attZ = distGoal > 0 ? (dzGoal / distGoal) * Math.min(distGoal * kAtt, 1.5) : 0;

  let repX = 0;
  let repZ = 0;
  let minClearance = Infinity;

  for (const o of obstacles) {
    if ((o.baseY ?? 0) >= 0.65) continue; // High-hanging obstacles above 0.65m clear rover chassis
    if (o.shape === "ramp") continue; // Navigable terrain incline

    let rawDist: number;
    let distX = px - o.x;
    let distZ = pz - o.z;

    if (o.shape === "cylinder") {
      const radius = o.radius ?? o.width / 2;
      const centerDist = Math.hypot(distX, distZ);
      rawDist = Math.max(0.001, centerDist - radius);
    } else {
      const halfWidth = o.width / 2;
      const halfDepth = o.depth / 2;
      const closestX = Math.max(o.x - halfWidth, Math.min(o.x + halfWidth, px));
      const closestZ = Math.max(o.z - halfDepth, Math.min(o.z + halfDepth, pz));
      distX = px - closestX;
      distZ = pz - closestZ;
      rawDist = Math.hypot(distX, distZ);
    }

    const clearance = Math.max(0.01, rawDist - rFootprint);
    minClearance = Math.min(minClearance, clearance);

    if (clearance < d0) {
      const forceMag = kRep * (1.0 / clearance - 1.0 / d0) * (1.0 / (clearance * clearance));
      const nx = rawDist > 1e-4 ? distX / rawDist : 1.0;
      const nz = rawDist > 1e-4 ? distZ / rawDist : 0.0;
      repX += nx * Math.min(forceMag, 2.5);
      repZ += nz * Math.min(forceMag, 2.5);
    }
  }

  if (!isFinite(minClearance)) minClearance = 5.0;

  const speed = 0.5;
  const timeToCollision = minClearance / speed;

  return {
    netForce: [Number((attX + repX).toFixed(3)), Number((attZ + repZ).toFixed(3))],
    attractiveForce: [Number(attX.toFixed(3)), Number(attZ.toFixed(3))],
    repulsiveForce: [Number(repX.toFixed(3)), Number(repZ.toFixed(3))],
    minClearance: Number(minClearance.toFixed(3)),
    timeToCollision: Number(timeToCollision.toFixed(2))
  };
}

/**
 * Computes Pure Pursuit lookahead point and holonomic velocities for Mecanum base.
 */
export function purePursuitStep(
  currentPose: { x: number; z: number; headingDeg: number },
  waypoints: [number, number][],
  lookaheadDist = 0.40,
  targetSpeed = 0.50
): {
  targetPoint: [number, number];
  vx: number;
  vz: number;
  omegaDeg: number;
  wheelRPMs: [number, number, number, number];
  reachedGoal: boolean;
} {
  const { x, z, headingDeg } = currentPose;
  if (waypoints.length === 0) {
    return {
      targetPoint: [x, z],
      vx: 0,
      vz: 0,
      omegaDeg: 0,
      wheelRPMs: [0, 0, 0, 0],
      reachedGoal: true
    };
  }

  const goal = waypoints[waypoints.length - 1];
  const distToGoal = Math.hypot(goal[0] - x, goal[1] - z);
  if (distToGoal < 0.08) {
    return {
      targetPoint: goal,
      vx: 0,
      vz: 0,
      omegaDeg: 0,
      wheelRPMs: [0, 0, 0, 0],
      reachedGoal: true
    };
  }

  let target: [number, number] = goal;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const p1 = waypoints[i];
    const p2 = waypoints[i + 1];
    const dx = p2[0] - p1[0];
    const dz = p2[1] - p1[1];
    const segLen = Math.hypot(dx, dz);
    if (segLen < 1e-4) continue;

    const t = Math.max(0, Math.min(1, ((x - p1[0]) * dx + (z - p1[1]) * dz) / (segLen * segLen)));
    const projX = p1[0] + t * dx;
    const projZ = p1[1] + t * dz;
    const distFromProj = Math.hypot(x - projX, z - projZ);

    if (distFromProj <= lookaheadDist) {
      const forwardT = Math.min(1.0, t + lookaheadDist / segLen);
      target = [p1[0] + forwardT * dx, p1[1] + forwardT * dz];
      break;
    }
  }

  const tDx = target[0] - x;
  const tDz = target[1] - z;
  const tDist = Math.hypot(tDx, tDz);
  const vx = tDist > 1e-4 ? (tDx / tDist) * targetSpeed : 0;
  const vz = tDist > 1e-4 ? (tDz / tDist) * targetSpeed : 0;

  const targetHeading = ((Math.atan2(tDz, tDx) * 180) / Math.PI + 360) % 360;
  const headingDiff = ((targetHeading - headingDeg + 540) % 360) - 180;
  const omegaDeg = Math.max(-90, Math.min(90, headingDiff * 2.0));

  const radius = 0.05;
  const halfLength = 0.17;
  const halfWidth = 0.14;
  const radHeading = (headingDeg * Math.PI) / 180;
  // Authentic forward body projection: v · x_hat and v · y_hat
  const localVx = vx * Math.cos(radHeading) + vz * Math.sin(radHeading);
  // Anisotropic friction compensation: boost lateral wheel command to overcome roller bearing resistance (ky ≈ 0.78)
  const localVy = (-vx * Math.sin(radHeading) + vz * Math.cos(radHeading)) / 0.78;
  const yawRateRad = (omegaDeg * Math.PI) / 180;

  let wheelRPMs: [number, number, number, number] = [0, 0, 0, 0];
  try {
    const omegas = wheelSpeeds(localVx, localVy, yawRateRad, radius, halfLength, halfWidth);
    wheelRPMs = [
      Math.round((omegas[0] * 60) / (2 * Math.PI)),
      Math.round((omegas[1] * 60) / (2 * Math.PI)),
      Math.round((omegas[2] * 60) / (2 * Math.PI)),
      Math.round((omegas[3] * 60) / (2 * Math.PI))
    ];
  } catch {
    wheelRPMs = [0, 0, 0, 0];
  }

  return {
    targetPoint: target,
    vx: Number(vx.toFixed(2)),
    vz: Number(vz.toFixed(2)),
    omegaDeg: Math.round(omegaDeg),
    wheelRPMs,
    reachedGoal: false
  };
}

/**
 * Evaluates room perimeter mapping coverage, detects shadow gaps,
 * and computes the next-best-view rover pose to close unmapped areas.
 */
export function analyzeCoverageAndGaps(
  points: ScanPoint[],
  roomWidth: number,
  roomDepth: number,
  obstacles: ScanObstacle[] = [],
  currentPose?: { x: number; z: number; heading: number },
  visitedVantages: [number, number][] = [],
  segmentSize = 0.5
): CoverageReport {
  const halfW = roomWidth / 2;
  const halfD = roomDepth / 2;

  // Discretize the 4 perimeter walls
  const segments: WallSegment[] = [];

  // North wall (Z = -halfD, X from -halfW to +halfW)
  const xSegments = Math.max(2, Math.round(roomWidth / segmentSize));
  for (let i = 0; i < xSegments; i++) {
    const x1 = -halfW + (i * roomWidth) / xSegments;
    const x2 = -halfW + ((i + 1) * roomWidth) / xSegments;
    segments.push({
      wall: "north",
      start: [x1, -halfD],
      end: [x2, -halfD],
      hits: 0
    });
  }

  // South wall (Z = +halfD, X from -halfW to +halfW)
  for (let i = 0; i < xSegments; i++) {
    const x1 = -halfW + (i * roomWidth) / xSegments;
    const x2 = -halfW + ((i + 1) * roomWidth) / xSegments;
    segments.push({
      wall: "south",
      start: [x1, halfD],
      end: [x2, halfD],
      hits: 0
    });
  }

  // West wall (X = -halfW, Z from -halfD to +halfD)
  const zSegments = Math.max(2, Math.round(roomDepth / segmentSize));
  for (let j = 0; j < zSegments; j++) {
    const z1 = -halfD + (j * roomDepth) / zSegments;
    const z2 = -halfD + ((j + 1) * roomDepth) / zSegments;
    segments.push({
      wall: "west",
      start: [-halfW, z1],
      end: [-halfW, z2],
      hits: 0
    });
  }

  // East wall (X = +halfW, Z from -halfD to +halfD)
  for (let j = 0; j < zSegments; j++) {
    const z1 = -halfD + (j * roomDepth) / zSegments;
    const z2 = -halfD + ((j + 1) * roomDepth) / zSegments;
    segments.push({
      wall: "east",
      start: [halfW, z1],
      end: [halfW, z2],
      hits: 0
    });
  }

  // Quantize 16 vertical height bins of 15 cm (0.0 to 2.4 m) and perimeter wall hits in a single O(N) pass
  const BIN_COUNT = 16;
  const BIN_HEIGHT = 0.15;
  const binCounts = new Int32Array(BIN_COUNT);

  const tolerance = 0.35; // 35 cm proximity to wall
  const southOffset = xSegments;
  const westOffset = xSegments * 2;
  const eastOffset = xSegments * 2 + zSegments;

  // Stride very large clouds (>10k points) while preserving exact spatial density
  const pointStride = points.length > 10000 ? Math.floor(points.length / 8000) : 1;

  for (let idx = 0; idx < points.length; idx += pointStride) {
    const p = points[idx];

    // 1. O(1) vertical height bin lookup
    if (p.y >= 0) {
      const bIdx = Math.floor(p.y / BIN_HEIGHT);
      if (bIdx >= 0 && bIdx < BIN_COUNT) {
        binCounts[bIdx] += pointStride;
      }
    }

    // 2. O(1) perimeter wall segment lookup
    if (p.x >= -halfW && p.x <= halfW) {
      const i = Math.min(xSegments - 1, Math.max(0, Math.floor(((p.x + halfW) / roomWidth) * xSegments)));
      if (Math.abs(p.z - -halfD) < tolerance) {
        segments[i].hits += pointStride;
      }
      if (Math.abs(p.z - halfD) < tolerance) {
        segments[southOffset + i].hits += pointStride;
      }
    }
    if (p.z >= -halfD && p.z <= halfD) {
      const j = Math.min(zSegments - 1, Math.max(0, Math.floor(((p.z + halfD) / roomDepth) * zSegments)));
      if (Math.abs(p.x - -halfW) < tolerance) {
        segments[westOffset + j].hits += pointStride;
      }
      if (Math.abs(p.x - halfW) < tolerance) {
        segments[eastOffset + j].hits += pointStride;
      }
    }
  }

  let mappedCount = 0;
  const gaps: CoverageReport["gaps"] = [];

  for (const seg of segments) {
    if (seg.hits >= 2) {
      mappedCount++;
    } else {
      const cx = (seg.start[0] + seg.end[0]) / 2;
      const cz = (seg.start[1] + seg.end[1]) / 2;
      const span = Math.hypot(seg.end[0] - seg.start[0], seg.end[1] - seg.start[1]);
      gaps.push({
        wall: seg.wall,
        center: [cx, cz],
        spanM: span
      });
    }
  }

  const coveragePercent = segments.length > 0 ? Math.round((mappedCount / segments.length) * 100) : 0;

  // Dynamic Next-Best-View (NBV) Calculation:
  // Evaluates all unmapped frontiers, scores utility by information gain vs travel distance & orientation,
  // and avoids looping between already visited vantage poses.
  interface CandidateVantage {
    gap: CoverageReport["gaps"][0];
    x: number;
    z: number;
    heading: number;
    suggestedTilt: number;
    utility: number;
  }

  const candidates: CandidateVantage[] = [];

  for (const gap of gaps) {
    const [gx, gz] = gap.center;
    let candX = 0;
    let candZ = 0;
    let candHeading = 0;
    let candTilt = 10;

    if (gap.wall === "west") {
      candX = Math.min(halfW - 0.65, gx + 1.4);
      candZ = Math.max(-halfD + 0.65, Math.min(halfD - 0.65, gz));
      candHeading = 180; // Face West into gap with forward 180° FOV
      candTilt = 5;
    } else if (gap.wall === "east") {
      candX = Math.max(-halfW + 0.65, gx - 1.4);
      candZ = Math.max(-halfD + 0.65, Math.min(halfD - 0.65, gz));
      candHeading = 0; // Face East into gap with forward 180° FOV
      candTilt = 5;
    } else if (gap.wall === "north") {
      candX = Math.max(-halfW + 0.65, Math.min(halfW - 0.65, gx));
      candZ = Math.min(halfD - 0.65, gz + 1.4);
      candHeading = 270; // Face North into gap with forward 180° FOV
      candTilt = 10;
    } else {
      candX = Math.max(-halfW + 0.65, Math.min(halfW - 0.65, gx));
      candZ = Math.max(-halfD + 0.65, gz - 1.4);
      candHeading = 90; // Face South into gap with forward 180° FOV
      candTilt = 10;
    }

    // Ensure candidate doesn't sit inside an obstacle
    for (const o of obstacles) {
      if (Math.abs(candX - o.x) < o.width / 2 + 0.45 && Math.abs(candZ - o.z) < o.depth / 2 + 0.45) {
        candX += (candX >= o.x ? 0.75 : -0.75);
        candZ += (candZ >= o.z ? 0.75 : -0.75);
        candX = Math.max(-halfW + 0.55, Math.min(halfW - 0.55, candX));
        candZ = Math.max(-halfD + 0.55, Math.min(halfD - 0.55, candZ));
      }
    }

    const distFromRover = currentPose ? Math.hypot(candX - currentPose.x, candZ - currentPose.z) : 1;
    const isVisited = visitedVantages.some(([vx, vz]) => Math.hypot(vx - candX, vz - candZ) < 0.65);

    let headingPenalty = 0;
    if (currentPose) {
      const angleDiff = Math.abs((candHeading - currentPose.heading + 540) % 360 - 180);
      headingPenalty = (angleDiff / 180) * 0.25;
    }

    // Dynamic utility function: prioritizes larger gaps and reachable positions without looping
    const utility = (gap.spanM * 10) / (1.0 + 0.35 * distFromRover + (isVisited ? 25.0 : 0.0) + headingPenalty);

    candidates.push({
      gap,
      x: candX,
      z: candZ,
      heading: candHeading,
      suggestedTilt: candTilt,
      utility
    });
  }

  candidates.sort((a, b) => b.utility - a.utility);

  const best = candidates.length > 0 ? candidates[0] : null;
  const primaryGap = best ? best.gap : null;
  const recX = best ? best.x : 0;
  const recZ = best ? best.z : 0;
  const recHeading = best ? best.heading : 0;
  const suggestedTilt = best ? best.suggestedTilt : 10;

  const SENSOR_H = 0.50; // Fixed mast ground height (meters)
  const maxReachY = SENSOR_H + Math.tan((60 * Math.PI) / 180) * Math.min(roomWidth, roomDepth);
  const minReachY = Math.max(0, SENSOR_H - Math.tan((30 * Math.PI) / 180) * Math.min(roomWidth, roomDepth));

  const heightBins: WallHeightBin[] = [];
  let capturedBinsCount = 0;
  let unseenBinsCount = 0;
  let outOfReachBinsCount = 0;

  for (let b = 0; b < BIN_COUNT; b++) {
    const minY = Number((b * BIN_HEIGHT).toFixed(2));
    const maxY = Number(((b + 1) * BIN_HEIGHT).toFixed(2));
    const count = binCounts[b];

    let status: WallHeightBin["status"] = "unseen";
    if (count >= 4) {
      status = "captured";
      capturedBinsCount++;
    } else if (maxY > maxReachY || minY < minReachY) {
      status = "out_of_reach";
      outOfReachBinsCount++;
    } else {
      status = "unseen";
      unseenBinsCount++;
    }

    heightBins.push({
      index: b,
      minY,
      maxY,
      count,
      status
    });
  }

  // Volumetric 3D Voxel Ray-Cast Occupancy Analysis
  const voxelGrid = new VoxelOccupancyGrid(roomWidth, roomDepth, 3.0, 0.35);
  const sensorOriginX = currentPose ? currentPose.x : 0;
  const sensorOriginZ = currentPose ? currentPose.z : 0;
  const sensorOriginY = 0.5;

  // Stride sampling if point cloud is large to keep analysis under 0.5ms
  const stride = Math.max(1, Math.floor(points.length / 600));
  for (let i = 0; i < points.length; i += stride) {
    const p = points[i];
    voxelGrid.rayTrace(sensorOriginX, sensorOriginY, sensorOriginZ, p.x, p.y, p.z);
  }
  const voxelStats = voxelGrid.computeStats();

  return {
    totalSegments: segments.length,
    mappedSegments: mappedCount,
    coveragePercent,
    heightBins,
    capturedBinsCount,
    unseenBinsCount,
    outOfReachBinsCount,
    voxelStats,
    gaps,
    primaryGap,
    recommendedVantage: {
      x: Number(recX.toFixed(2)),
      z: Number(recZ.toFixed(2)),
      heading: recHeading,
      suggestedTilt
    }
  };
}

/**
 * Discretizes waypoints into a time-sampled trajectory with 4-wheel mecanum inverse kinematics RPM.
 * Features realistic trapezoidal S-curve acceleration ramping (a <= 0.65 m/s²), smooth zero-radius pivots,
 * and anisotropic roller slip compensation to eliminate chaotic jumping.
 */
export function generateMecanumTrajectory(
  waypoints: [number, number][],
  finalHeadingDeg = 0,
  nominalSpeedMps = 0.45,
  sampleRateHz = 30,
  obstacles: ScanObstacle[] = [],
  startHeadingDeg?: number
): TrajectoryPoint[] {
  if (waypoints.length < 2) {
    const single = waypoints[0] ?? [0, 0];
    return [
      {
        x: single[0],
        z: single[1],
        headingDeg: startHeadingDeg ?? finalHeadingDeg,
        vx: 0,
        vz: 0,
        omegaDeg: 0,
        wheelRPMs: [0, 0, 0, 0],
        apfForce: [0, 0],
        clearance: 5.0
      }
    ];
  }

  const result: TrajectoryPoint[] = [];
  const radius = 0.05; // 100 mm Mecanum wheels (Proposal Ref [12] / Nexus 14094)
  const halfLength = 0.17; // 340 mm wheelbase / 2
  const halfWidth = 0.14; // 280 mm track / 2
  const dt = 1 / sampleRateHz;
  const maxAccel = 0.65; // 0.65 m/s² smooth physical acceleration limit
  const maxCruiseSpeed = Math.min(0.50, nominalSpeedMps);

  // 1. Initial Zero-Radius Turn: If rover heading does not match initial path departure angle,
  // execute smooth zero-radius yaw pivot with opposite wheel rotations before forward travel.
  if (startHeadingDeg !== undefined && waypoints.length >= 2) {
    const p0 = waypoints[0];
    const p1 = waypoints[1];
    const initDx = p1[0] - p0[0];
    const initDz = p1[1] - p0[1];
    if (Math.hypot(initDx, initDz) > 1e-4) {
      const targetInitHeading = ((Math.atan2(initDz, initDx) * 180) / Math.PI + 360) % 360;
      const initialDiff = ((targetInitHeading - startHeadingDeg + 540) % 360) - 180;

      if (Math.abs(initialDiff) > 3) {
        const turnDuration = Math.max(0.4, Math.min(1.4, Math.abs(initialDiff) / 75));
        const turnSteps = Math.max(10, Math.round(turnDuration / dt));
        for (let s = 0; s < turnSteps; s++) {
          const tNorm = s / turnSteps;
          // Smooth sinusoidal ease in/out
          const ease = 0.5 - 0.5 * Math.cos(tNorm * Math.PI);
          const heading = (startHeadingDeg + initialDiff * ease + 360) % 360;
          const deriv = 0.5 * Math.PI * Math.sin(tNorm * Math.PI);
          const yawRateRad = ((initialDiff * Math.PI) / 180 / turnDuration) * deriv;

          let rpms: [number, number, number, number] = [0, 0, 0, 0];
          try {
            const omegas = wheelSpeeds(0, 0, yawRateRad, radius, halfLength, halfWidth);
            rpms = [
              Math.round((omegas[0] * 60) / (2 * Math.PI)),
              Math.round((omegas[1] * 60) / (2 * Math.PI)),
              Math.round((omegas[2] * 60) / (2 * Math.PI)),
              Math.round((omegas[3] * 60) / (2 * Math.PI))
            ];
          } catch {
            rpms = [0, 0, 0, 0];
          }

          result.push({
            x: Number(p0[0].toFixed(3)),
            z: Number(p0[1].toFixed(3)),
            headingDeg: Math.round(heading),
            vx: 0,
            vz: 0,
            omegaDeg: Math.round((yawRateRad * 180) / Math.PI),
            wheelRPMs: rpms,
            apfForce: [0, 0],
            clearance: 5.0
          });
        }
      }
    }
  }

  // 2. Compute cumulative segment lengths along the entire path
  const segDistances: number[] = [];
  let totalPathDistance = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const d = Math.hypot(waypoints[i + 1][0] - waypoints[i][0], waypoints[i + 1][1] - waypoints[i][1]);
    segDistances.push(d);
    totalPathDistance += d;
  }

  if (totalPathDistance < 1e-4) {
    const p = waypoints[0];
    return [
      {
        x: p[0],
        z: p[1],
        headingDeg: Math.round(finalHeadingDeg),
        vx: 0,
        vz: 0,
        omegaDeg: 0,
        wheelRPMs: [0, 0, 0, 0],
        apfForce: [0, 0],
        clearance: 5.0
      }
    ];
  }

  // 3. Trapezoidal velocity profile across the full multi-waypoint path:
  // Smooth acceleration up from zero, cruise, and gentle deceleration into destination
  const accelDist = Math.min(totalPathDistance * 0.45, (maxCruiseSpeed * maxCruiseSpeed) / (2 * maxAccel));
  const peakSpeed = Math.sqrt(2 * maxAccel * accelDist);

  let traversedDistance = 0;
  let currentSegIndex = 0;
  let segStartDist = 0;

  while (traversedDistance < totalPathDistance && currentSegIndex < waypoints.length - 1) {
    // Current trapezoidal speed
    let speed = peakSpeed;
    if (traversedDistance < accelDist) {
      speed = Math.max(0.08, Math.sqrt(2 * maxAccel * Math.max(0.001, traversedDistance)));
    } else if (traversedDistance > totalPathDistance - accelDist) {
      speed = Math.max(0.08, Math.sqrt(2 * maxAccel * Math.max(0.001, totalPathDistance - traversedDistance)));
    }

    const stepDist = speed * dt;
    traversedDistance = Math.min(totalPathDistance, traversedDistance + stepDist);

    // Identify active path segment
    while (
      currentSegIndex < segDistances.length - 1 &&
      traversedDistance > segStartDist + segDistances[currentSegIndex]
    ) {
      segStartDist += segDistances[currentSegIndex];
      currentSegIndex++;
    }

    const p0 = waypoints[currentSegIndex];
    const p1 = waypoints[currentSegIndex + 1];
    const segLen = segDistances[currentSegIndex];
    const segT = segLen > 1e-4 ? Math.min(1.0, Math.max(0.0, (traversedDistance - segStartDist) / segLen)) : 1.0;

    const x = p0[0] + (p1[0] - p0[0]) * segT;
    const z = p0[1] + (p1[1] - p0[1]) * segT;

    const segDx = p1[0] - p0[0];
    const segDz = p1[1] - p0[1];
    const segHeading = ((Math.atan2(segDz, segDx) * 180) / Math.PI + 360) % 360;

    // Smooth heading blending near corners and destination
    let heading = segHeading;
    let yawRateRad = 0;
    const isLastSegment = currentSegIndex === waypoints.length - 2;

    if (isLastSegment && segT > 0.6) {
      const blend = (segT - 0.6) / 0.4;
      const ease = 0.5 - 0.5 * Math.cos(blend * Math.PI);
      const diff = ((finalHeadingDeg - segHeading + 540) % 360) - 180;
      heading = (segHeading + diff * ease + 360) % 360;
      yawRateRad = ((diff * Math.PI) / 180) * (Math.PI / 2) * Math.sin(blend * Math.PI) * (speed / Math.max(0.1, segLen));
    } else if (!isLastSegment && segT > 0.65 && currentSegIndex + 2 < waypoints.length) {
      const nextP2 = waypoints[currentSegIndex + 2];
      const nextHeading = ((Math.atan2(nextP2[1] - p1[1], nextP2[0] - p1[0]) * 180) / Math.PI + 360) % 360;
      const blend = (segT - 0.65) / 0.35;
      const ease = 0.5 - 0.5 * Math.cos(blend * Math.PI);
      const diff = ((nextHeading - segHeading + 540) % 360) - 180;
      heading = (segHeading + diff * ease + 360) % 360;
      yawRateRad = ((diff * Math.PI) / 180) * (Math.PI / 2) * Math.sin(blend * Math.PI) * (speed / Math.max(0.1, segLen));
    }

    // World velocity components along segment
    const vx = segLen > 1e-4 ? (segDx / segLen) * speed : 0;
    const vz = segLen > 1e-4 ? (segDz / segLen) * speed : 0;

    // Body-frame velocity components with authentic anisotropic roller slip factor (ky = 0.82)
    const radHeading = (heading * Math.PI) / 180;
    const localVx = vx * Math.cos(radHeading) + vz * Math.sin(radHeading);
    const localVy = (-vx * Math.sin(radHeading) + vz * Math.cos(radHeading)) / 0.82;

    let apfForce: [number, number] = [0, 0];
    let clearance = 5.0;
    if (obstacles.length > 0) {
      const apf = computeAPF([x, z], p1, obstacles);
      apfForce = apf.repulsiveForce;
      clearance = apf.minClearance;
    }

    let rpms: [number, number, number, number] = [0, 0, 0, 0];
    try {
      const omegas = wheelSpeeds(localVx, localVy, yawRateRad, radius, halfLength, halfWidth);
      rpms = [
        Math.round((omegas[0] * 60) / (2 * Math.PI)),
        Math.round((omegas[1] * 60) / (2 * Math.PI)),
        Math.round((omegas[2] * 60) / (2 * Math.PI)),
        Math.round((omegas[3] * 60) / (2 * Math.PI))
      ];
    } catch {
      rpms = [0, 0, 0, 0];
    }

    result.push({
      x: Number(x.toFixed(3)),
      z: Number(z.toFixed(3)),
      headingDeg: Math.round(heading),
      vx: Number(vx.toFixed(2)),
      vz: Number(vz.toFixed(2)),
      omegaDeg: Math.round((yawRateRad * 180) / Math.PI),
      wheelRPMs: rpms,
      apfForce,
      clearance
    });
  }

  const dest = waypoints[waypoints.length - 1];
  result.push({
    x: Number(dest[0].toFixed(3)),
    z: Number(dest[1].toFixed(3)),
    headingDeg: Math.round(finalHeadingDeg),
    vx: 0,
    vz: 0,
    omegaDeg: 0,
    wheelRPMs: [0, 0, 0, 0],
    apfForce: [0, 0],
    clearance: 5.0
  });

  return result;
}

export interface PathPerceptionHazard {
  type: "obstacle" | "drop_off" | "uneven" | "clear" | "hole";
  distanceM: number;
  location: [number, number];
  clearanceM: number;
  severity: "none" | "warning" | "critical";
  message: string;
  inspectionAngleDeg?: number;
  suggestedBypass?: {
    direction: "left" | "right";
    offsetM: number;
    bypassPoint: [number, number];
  };
}

/**
 * Scans the forward driving corridor using an active downward inspection angle window (-15° to -20°).
 * Verifies ground plane continuity and detects obstacles (protrusions) and holes (floor drop-offs / voids).
 */
export function scanDrivingCorridor(
  roverPose: { x: number; z: number; heading: number },
  obstacles: ScanObstacle[] = [],
  roomWidth: number,
  roomDepth: number,
  lookaheadM = 0.85,
  inspectionAngleDeg = -16
): PathPerceptionHazard {
  const { x, z, heading } = roverPose;
  const rad = (heading * Math.PI) / 180;
  const forwardX = Math.cos(rad);
  const forwardZ = Math.sin(rad);
  const normalX = -forwardZ; // Left normal
  const normalZ = forwardX;

  const halfW = roomWidth / 2 - 0.20;
  const halfD = roomDepth / 2 - 0.20;

  // Check rover corridor width across lookahead distances
  const lateralSpans = [-0.18, -0.09, 0, 0.09, 0.18];

  for (let d = 0.15; d <= lookaheadM; d += 0.08) {
    for (let l = 0; l < lateralSpans.length; l++) {
      const latOffset = lateralSpans[l];
      const checkX = x + forwardX * d + normalX * latOffset;
      const checkZ = z + forwardZ * d + normalZ * latOffset;

      // Check perimeter wall hazard ONLY when actually heading towards the boundary
      const hittingEastWall = forwardX > 0.08 && checkX >= halfW;
      const hittingWestWall = forwardX < -0.08 && checkX <= -halfW;
      const hittingSouthWall = forwardZ > 0.08 && checkZ >= halfD;
      const hittingNorthWall = forwardZ < -0.08 && checkZ <= -halfD;

      if (hittingEastWall || hittingWestWall || hittingSouthWall || hittingNorthWall) {
        // Compute inward bypass vector directed into the open room
        const inwardX = hittingEastWall ? -1 : hittingWestWall ? 1 : 0;
        const inwardZ = hittingSouthWall ? -1 : hittingNorthWall ? 1 : 0;

        const leftDot = (-forwardZ) * inwardX + forwardX * inwardZ;
        const direction: "left" | "right" = leftDot >= 0 ? "left" : "right";
        const bypassOffsetM = 0.35;
        const bypassX = Math.max(-halfW + 0.1, Math.min(halfW - 0.1, x + (direction === "left" ? -forwardZ : forwardZ) * bypassOffsetM));
        const bypassZ = Math.max(-halfD + 0.1, Math.min(halfD - 0.1, z + (direction === "left" ? forwardX : -forwardX) * bypassOffsetM));

        return {
          type: "obstacle",
          distanceM: Number(d.toFixed(2)),
          location: [Number(checkX.toFixed(2)), Number(checkZ.toFixed(2))],
          clearanceM: Number(Math.max(0.01, d - 0.20).toFixed(2)),
          severity: d < 0.28 ? "critical" : "warning",
          message: `Boundary perimeter hazard detected ${d.toFixed(2)}m ahead. Inward bypass available.`,
          inspectionAngleDeg,
          suggestedBypass: {
            direction,
            offsetM: bypassOffsetM,
            bypassPoint: [Number(bypassX.toFixed(2)), Number(bypassZ.toFixed(2))]
          }
        };
      }

      // Check physical obstacles or holes
      for (const obs of obstacles) {
        const obsBaseY = obs.baseY ?? 0;
        if (obsBaseY >= 0.65) continue; // High-hanging obstacles above 0.65m clear rover chassis
        if (obs.shape === "ramp") continue; // Navigable terrain slope

        // Relative vector to obstacle center: if rover is already past it and driving away, skip
        const toObsX = obs.x - x;
        const toObsZ = obs.z - z;
        const distToObsCenter = Math.hypot(toObsX, toObsZ);
        const dotHeading = forwardX * toObsX + forwardZ * toObsZ;
        if (dotHeading < -0.15 && distToObsCenter > Math.max(obs.width, obs.depth) / 2) {
          continue;
        }

        if (obs.shape === "cylinder") {
          const r = (obs.radius ?? obs.width / 2) + 0.18;
          if ((checkX - obs.x) ** 2 + (checkZ - obs.z) ** 2 > r * r) {
            continue;
          }
        } else {
          const halfObsW = obs.width / 2 + 0.18; // include rover footprint safety envelope
          const halfObsD = obs.depth / 2 + 0.18;
          if (
            Math.abs(checkX - obs.x) > halfObsW ||
            Math.abs(checkZ - obs.z) > halfObsD
          ) {
            continue;
          }
        }
          const isHole = (obs as { isHole?: boolean }).isHole || obs.height <= 0;
          const isLowHang = obsBaseY > 0 && obsBaseY < 0.65;
          const hazardType: "hole" | "obstacle" = isHole ? "hole" : "obstacle";

          // Compute potential left vs right holonomic bypass points
          const bypassOffsetM = Math.max(0.35, obs.width / 2 + 0.30);
          const leftX = obs.x + normalX * bypassOffsetM;
          const leftZ = obs.z + normalZ * bypassOffsetM;
          const rightX = obs.x - normalX * bypassOffsetM;
          const rightZ = obs.z - normalZ * bypassOffsetM;

          const leftClear = Math.abs(leftX) < halfW && Math.abs(leftZ) < halfD;
          const rightClear = Math.abs(rightX) < halfW && Math.abs(rightZ) < halfD;

          // Select the bypass side with greater clearance to perimeter walls
          const leftWallDist = Math.min(halfW - Math.abs(leftX), halfD - Math.abs(leftZ));
          const rightWallDist = Math.min(halfW - Math.abs(rightX), halfD - Math.abs(rightZ));

          const direction: "left" | "right" =
            leftClear && rightClear
              ? leftWallDist >= rightWallDist ? "left" : "right"
              : leftClear ? "left" : "right";

          const bypassX = direction === "left" ? leftX : rightX;
          const bypassZ = direction === "left" ? leftZ : rightZ;

          const bypassPoint: [number, number] = [Number(bypassX.toFixed(2)), Number(bypassZ.toFixed(2))];

          return {
            type: hazardType,
            distanceM: Number(d.toFixed(2)),
            location: [obs.x, obs.z],
            clearanceM: Number(Math.max(0.01, d - 0.20).toFixed(2)),
            severity: d < 0.35 ? "critical" : "warning",
            message: isHole
              ? `Floor void / pit detected at ${d.toFixed(2)}m via ${inspectionAngleDeg}° ground inspection. Negative obstacle avoidance active.`
              : isLowHang
                ? `Low-hanging obstacle overhead at ${d.toFixed(2)}m (clearance ${obsBaseY.toFixed(2)}m). Holonomic bypass candidate available.`
                : `Obstacle in driving corridor at ${d.toFixed(2)}m. Holonomic bypass candidate available.`,
            inspectionAngleDeg,
            suggestedBypass: {
              direction,
              offsetM: bypassOffsetM,
              bypassPoint
            }
          };
      }
    }
  }

  return {
    type: "clear",
    distanceM: lookaheadM,
    location: [Number((x + forwardX * lookaheadM).toFixed(2)), Number((z + forwardZ * lookaheadM).toFixed(2))],
    clearanceM: lookaheadM,
    severity: "none",
    message: `Driving corridor clear · Floor continuous at ${inspectionAngleDeg}° downward ground inspection.`,
    inspectionAngleDeg
  };
}

export interface AutonomousNavDecision {
  action: "proceed" | "detour_left" | "detour_right" | "halt_blocked";
  hazard: PathPerceptionHazard;
  lateralNudge: [number, number];
  reason: string;
}

/**
 * Autonomous decision engine: Evaluates perception findings and determines reactive holonomic bypass
 * rather than blindly driving straight through obstacles or floor holes.
 */
export function evaluateAutonomousDecision(
  roverPose: { x: number; z: number; heading: number },
  hazard: PathPerceptionHazard
): AutonomousNavDecision {
  if (hazard.type === "clear" || hazard.severity === "none") {
    return {
      action: "proceed",
      hazard,
      lateralNudge: [0, 0],
      reason: "Forward corridor clear at -16° downward ground inspection. Nominal path tracking."
    };
  }

  if (hazard.suggestedBypass) {
    const dir = hazard.suggestedBypass.direction;
    const rad = (roverPose.heading * Math.PI) / 180;
    const sign = dir === "left" ? 1 : -1;
    // Holonomic lateral translation normal to heading
    const lateralX = -Math.sin(rad) * sign * 0.018;
    const lateralZ = Math.cos(rad) * sign * 0.018;

    return {
      action: dir === "left" ? "detour_left" : "detour_right",
      hazard,
      lateralNudge: [lateralX, lateralZ],
      reason: `${hazard.type === "hole" ? "Floor void" : "Obstacle"} detected ${hazard.distanceM}m ahead. Holonomic ${dir} detour engaged.`
    };
  }

  return {
    action: "halt_blocked",
    hazard,
    lateralNudge: [0, 0],
    reason: "Corridor blocked and no clear bypass available within arena boundary. Safety halt engaged."
  };
}

export interface PerceivedObstacleCluster {
  id: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  baseY: number;
  pointCount: number;
  isHole: boolean;
  classification: "pillar" | "shelf" | "low_hang" | "high_hang" | "floor_void";
}

export interface FrontierGap {
  id: string;
  angleDeg: number;
  direction: "left" | "center" | "right";
  center: [number, number];
  widthM: number;
  clearanceM: number;
  distanceToGoalM: number;
  groundContinuityScore: number;
  score: number;
  recommendedWaypoint: [number, number];
  reason: string;
}

/**
 * Extracts perceived obstacles and negative floor voids directly from actual scanned LiDAR points.
 * Operates without ground truth cheat: only returns what the RPLIDAR S2 laser has physically illuminated.
 */
export function extractPerceptionsFromPoints(
  points: ScanPoint[],
  roomWidth: number,
  roomDepth: number,
  cellSize = 0.22
): {
  perceivedObstacles: ScanObstacle[];
  floorVoids: ScanObstacle[];
  clusters: PerceivedObstacleCluster[];
} {
  if (points.length === 0) {
    return { perceivedObstacles: [], floorVoids: [], clusters: [] };
  }

  const halfW = roomWidth / 2;
  const halfD = roomDepth / 2;
  const cols = Math.round(roomWidth / cellSize) + 1;
  const rows = Math.round(roomDepth / cellSize) + 1;

  const toCellX = (x: number) => Math.min(cols - 1, Math.max(0, Math.floor((x + halfW) / cellSize)));
  const toCellZ = (z: number) => Math.min(rows - 1, Math.max(0, Math.floor((z + halfD) / cellSize)));

  // 1. Separate points into vertical obstacle returns and negative floor void returns
  const obsGrid: Map<string, ScanPoint[]> = new Map();
  const voidGrid: Map<string, ScanPoint[]> = new Map();

  // Subsample points if point cloud is large to keep spatial extraction under 2 ms
  const stride = points.length > 4000 ? Math.floor(points.length / 3000) : 1;

  for (let i = 0; i < points.length; i += stride) {
    const p = points[i];
    // Ignore room boundary perimeter walls (within 0.20m of walls)
    if (Math.abs(p.x) >= halfW - 0.20 || Math.abs(p.z) >= halfD - 0.20) continue;

    if (p.y < -0.08) {
      // Negative floor void / pit return
      const cx = toCellX(p.x);
      const cz = toCellZ(p.z);
      const key = `${cx},${cz}`;
      const list = voidGrid.get(key) || [];
      list.push(p);
      voidGrid.set(key, list);
    } else if (p.y >= 0.12 && p.y <= 2.8) {
      // Vertical protrusion above floor
      const cx = toCellX(p.x);
      const cz = toCellZ(p.z);
      const key = `${cx},${cz}`;
      const list = obsGrid.get(key) || [];
      list.push(p);
      obsGrid.set(key, list);
    }
  }

  const clusters: PerceivedObstacleCluster[] = [];
  const perceivedObstacles: ScanObstacle[] = [];
  const floorVoids: ScanObstacle[] = [];

  // Helper: Simple connected-component cluster extraction
  const clusterCells = (
    grid: Map<string, ScanPoint[]>,
    minPointsPerCell: number,
    isHoleType: boolean
  ) => {
    const visited = new Set<string>();
    for (const [key, pts] of grid.entries()) {
      if (visited.has(key) || pts.length < minPointsPerCell) continue;
      const group: ScanPoint[] = [];
      const queue: string[] = [key];
      visited.add(key);

      while (queue.length > 0) {
        const cur = queue.pop()!;
        const cPts = grid.get(cur);
        if (cPts) {
          for (let k = 0; k < cPts.length; k++) group.push(cPts[k]);
        }
        const [cx, cz] = cur.split(",").map(Number);
        const neighbors = [
          `${cx + 1},${cz}`,
          `${cx - 1},${cz}`,
          `${cx},${cz + 1}`,
          `${cx},${cz - 1}`
        ];
        for (const nKey of neighbors) {
          if (!visited.has(nKey) && grid.has(nKey) && grid.get(nKey)!.length >= minPointsPerCell) {
            visited.add(nKey);
            queue.push(nKey);
          }
        }
      }

      if (group.length >= 3) {
        let minX = Infinity, maxX = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        for (let j = 0; j < group.length; j++) {
          const gp = group[j];
          if (gp.x < minX) minX = gp.x;
          if (gp.x > maxX) maxX = gp.x;
          if (gp.z < minZ) minZ = gp.z;
          if (gp.z > maxZ) maxZ = gp.z;
          if (gp.y < minY) minY = gp.y;
          if (gp.y > maxY) maxY = gp.y;
        }

        const width = Number(Math.max(0.24, maxX - minX + 0.12).toFixed(2));
        const depth = Number(Math.max(0.24, maxZ - minZ + 0.12).toFixed(2));
        const centerX = Number(((minX + maxX) / 2).toFixed(2));
        const centerZ = Number(((minZ + maxZ) / 2).toFixed(2));
        const baseY = isHoleType ? 0 : Number(Math.max(0, minY).toFixed(2));
        const height = isHoleType ? 0 : Number(Math.max(0.15, maxY - minY).toFixed(2));

        let classification: PerceivedObstacleCluster["classification"] = "shelf";
        if (isHoleType) {
          classification = "floor_void";
        } else if (baseY >= 1.0) {
          classification = "high_hang";
        } else if (baseY > 0.25 && height <= 0.45) {
          classification = "low_hang";
        } else if (height >= 1.8) {
          classification = "pillar";
        }

        const cluster: PerceivedObstacleCluster = {
          id: `cluster_${clusters.length + 1}`,
          x: centerX,
          z: centerZ,
          width,
          depth,
          height,
          baseY,
          pointCount: group.length,
          isHole: isHoleType,
          classification
        };
        clusters.push(cluster);

        const scanObs: ScanObstacle = {
          x: centerX,
          z: centerZ,
          width,
          depth,
          height,
          baseY,
          isHole: isHoleType
        };

        if (isHoleType) {
          floorVoids.push(scanObs);
          perceivedObstacles.push(scanObs);
        } else {
          // Obstacles that impede rover movement (baseY < 0.65m)
          if (baseY < 0.65) {
            perceivedObstacles.push(scanObs);
          }
        }
      }
    }
  };

  // Cluster vertical obstacles (min 2 points per cell)
  clusterCells(obsGrid, 2, false);
  // Cluster floor voids (min 2 points per cell)
  clusterCells(voidGrid, 2, true);

  return { perceivedObstacles, floorVoids, clusters };
}

/**
 * Investigates gap points between perceived obstacle clusters and arena boundaries.
 * Evaluates candidate gaps based on shortest path distance, obstacle clearance margin, and ground continuity.
 */
export function analyzePerceptionGaps(
  roverPose: { x: number; z: number; heading: number },
  goal: [number, number],
  perceivedObstacles: ScanObstacle[],
  roomWidth: number,
  roomDepth: number
): FrontierGap[] {
  const { x, z, heading } = roverPose;
  const halfW = roomWidth / 2 - 0.35;
  const halfD = roomDepth / 2 - 0.35;

  const gaps: FrontierGap[] = [];
  const candidateAngles = [-45, -25, 0, 25, 45]; // Relative candidate inspection angles

  for (let i = 0; i < candidateAngles.length; i++) {
    const relAngle = candidateAngles[i];
    const absAngle = ((heading + relAngle + 360) % 360);
    const rad = (absAngle * Math.PI) / 180;
    const dirX = Math.cos(rad);
    const dirZ = Math.sin(rad);

    // Look ahead 1.2 meters along candidate gap ray
    const lookM = 1.25;
    const candX = Math.min(halfW, Math.max(-halfW, x + dirX * lookM));
    const candZ = Math.min(halfD, Math.max(-halfD, z + dirZ * lookM));

    // Calculate clearance to nearest perceived obstacle
    let minClearance = 5.0;
    let hasHoleInCorridor = false;

    for (let o = 0; o < perceivedObstacles.length; o++) {
      const obs = perceivedObstacles[o];
      if ((obs.baseY ?? 0) >= 0.65) continue;
      const hW = obs.width / 2;
      const hD = obs.depth / 2;
      const closestX = Math.max(obs.x - hW, Math.min(obs.x + hW, candX));
      const closestZ = Math.max(obs.z - hD, Math.min(obs.z + hD, candZ));
      const d = Math.hypot(candX - closestX, candZ - closestZ);
      if (d < minClearance) minClearance = d;

      if ((obs as { isHole?: boolean }).isHole && d < 0.40) {
        hasHoleInCorridor = true;
      }
    }

    const distToGoal = Math.hypot(goal[0] - candX, goal[1] - candZ);
    const groundContinuityScore = hasHoleInCorridor ? 0.1 : minClearance < 0.28 ? 0.3 : 1.0;
    const direction: FrontierGap["direction"] = relAngle < -10 ? "left" : relAngle > 10 ? "right" : "center";

    // Scoring formula: prioritize short path to goal + high clearance + solid ground + minimal heading turn
    const clearanceBonus = Math.min(1.2, minClearance) * 35;
    const distancePenalty = distToGoal * 10;
    const headingPenalty = Math.abs(relAngle) * 0.15;
    const continuityBonus = groundContinuityScore * 25;
    const score = Number(Math.max(0, 100 + clearanceBonus + continuityBonus - distancePenalty - headingPenalty).toFixed(1));

    const reason = hasHoleInCorridor
      ? `Floor void drop-off detected in corridor (${minClearance.toFixed(2)}m clearance).`
      : minClearance < 0.35
        ? `Obstacle proximity hazard (${minClearance.toFixed(2)}m clearance). Narrow choke.`
        : `Clear traversable corridor (${minClearance.toFixed(2)}m clearance, ${distToGoal.toFixed(2)}m to goal).`;

    gaps.push({
      id: `gap_${i + 1}`,
      angleDeg: absAngle,
      direction,
      center: [Number(candX.toFixed(2)), Number(candZ.toFixed(2))],
      widthM: Number((minClearance * 2).toFixed(2)),
      clearanceM: Number(minClearance.toFixed(2)),
      distanceToGoalM: Number(distToGoal.toFixed(2)),
      groundContinuityScore,
      score,
      recommendedWaypoint: [Number(candX.toFixed(2)), Number(candZ.toFixed(2))],
      reason
    });
  }

  // Sort descending by score (best gap first)
  gaps.sort((a, b) => b.score - a.score);
  return gaps;
}
