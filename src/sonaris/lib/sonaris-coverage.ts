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

export interface RoomEnvironment {
  id: "chamber" | string;
  name: string;
  width: number;
  depth: number;
  height: number;
  description: string;
  obstacles: ScanObstacle[];
}

export const ROOM_PRESETS: RoomEnvironment[] = [
  {
    id: "chamber",
    name: "Benchmark Arena (6×5m)",
    width: 6,
    depth: 5,
    height: 3,
    description: "Open metrology arena for forward LiDAR scan reconstruction.",
    obstacles: []
  },
  {
    id: "hazard_course",
    name: "Hazard Course (Pillars & Floor Holes)",
    width: 6,
    depth: 5,
    height: 3,
    description: "Metrology arena with vertical obstacles and negative floor voids for autonomous reactive detour testing.",
    obstacles: [
      { x: 0, z: 1.0, width: 0.7, depth: 0.7, height: 1.2 },
      { x: -1.2, z: -0.6, width: 0.6, depth: 0.6, height: 0, isHole: true },
      { x: 1.2, z: -0.5, width: 0.6, depth: 0.6, height: 0.9 }
    ]
  }
];

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
  const halfW = roomW / 2 - 0.25;
  const halfD = roomD / 2 - 0.25;
  if (Math.abs(x1) > halfW || Math.abs(z1) > halfD || Math.abs(x2) > halfW || Math.abs(z2) > halfD) {
    return false;
  }
  for (const o of obstacles) {
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
 * Theta* Any-Angle Path Planner.
 * Computes an optimal, direct line-of-sight path around obstacles without grid-snapping zigzag.
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

  if (isLineClear(sx, sz, gx, gz, obstacles, safetyMargin, roomW, roomD)) {
    return [[sx, sz], [gx, gz]];
  }

  const halfW = roomW / 2 - 0.3;
  const halfD = roomD / 2 - 0.3;

  // Extract candidate visibility vertices from obstacle bounding corners
  const vertices: [number, number][] = [[sx, sz]];
  for (const o of obstacles) {
    const minX = o.x - o.width / 2 - safetyMargin;
    const maxX = o.x + o.width / 2 + safetyMargin;
    const minZ = o.z - o.depth / 2 - safetyMargin;
    const maxZ = o.z + o.depth / 2 + safetyMargin;

    const corners: [number, number][] = [
      [minX, minZ],
      [maxX, minZ],
      [minX, maxZ],
      [maxX, maxZ],
      [minX, (minZ + maxZ) / 2],
      [maxX, (minZ + maxZ) / 2],
      [(minX + maxX) / 2, minZ],
      [(minX + maxX) / 2, maxZ]
    ];

    for (const c of corners) {
      if (Math.abs(c[0]) <= halfW && Math.abs(c[1]) <= halfD) {
        vertices.push(c);
      }
    }
  }
  vertices.push([gx, gz]);

  // A* / Theta* graph search over vertices
  const n = vertices.length;
  const goalIdx = n - 1;
  const gScore = new Array(n).fill(Infinity);
  const parent = new Array(n).fill(-1);
  const openSet = new Set<number>([0]);
  gScore[0] = 0;

  while (openSet.size > 0) {
    let current = -1;
    let lowestF = Infinity;
    for (const idx of openSet) {
      const h = Math.hypot(vertices[idx][0] - gx, vertices[idx][1] - gz);
      const f = gScore[idx] + h;
      if (f < lowestF) {
        lowestF = f;
        current = idx;
      }
    }

    if (current === goalIdx) break;
    openSet.delete(current);

    const [cx, cz] = vertices[current];
    const pIdx = parent[current];

    for (let neighbor = 0; neighbor < n; neighbor++) {
      if (neighbor === current) continue;
      const [nx, nz] = vertices[neighbor];

      // Theta* Line-of-sight Check with Parent
      let tentativeG = Infinity;
      let newParent = current;

      if (
        pIdx !== -1 &&
        isLineClear(vertices[pIdx][0], vertices[pIdx][1], nx, nz, obstacles, safetyMargin, roomW, roomD)
      ) {
        tentativeG = gScore[pIdx] + Math.hypot(vertices[pIdx][0] - nx, vertices[pIdx][1] - nz);
        newParent = pIdx;
      } else if (isLineClear(cx, cz, nx, nz, obstacles, safetyMargin, roomW, roomD)) {
        tentativeG = gScore[current] + Math.hypot(cx - nx, cz - nz);
        newParent = current;
      }

      if (tentativeG < gScore[neighbor]) {
        gScore[neighbor] = tentativeG;
        parent[neighbor] = newParent;
        openSet.add(neighbor);
      }
    }
  }

  // Reconstruct path
  if (parent[goalIdx] === -1 && gScore[goalIdx] === Infinity) {
    const blocking = obstacles[0];
    const midX = (sx + gx) / 2;
    const midZ = blocking
      ? blocking.z >= 0
        ? blocking.z - blocking.depth / 2 - safetyMargin
        : blocking.z + blocking.depth / 2 + safetyMargin
      : (sz + gz) / 2;
    return [
      [sx, sz],
      [Math.max(-halfW, Math.min(halfW, midX)), Math.max(-halfD, Math.min(halfD, midZ))],
      [gx, gz]
    ];
  }

  const path: [number, number][] = [];
  let curr = goalIdx;
  while (curr !== -1) {
    path.unshift(vertices[curr]);
    if (curr === 0) break;
    curr = parent[curr];
  }

  return smoothThetaPath(path, obstacles, safetyMargin, roomW, roomD);
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
    const halfWidth = o.width / 2;
    const halfDepth = o.depth / 2;
    const closestX = Math.max(o.x - halfWidth, Math.min(o.x + halfWidth, px));
    const closestZ = Math.max(o.z - halfDepth, Math.min(o.z + halfDepth, pz));

    const distX = px - closestX;
    const distZ = pz - closestZ;
    const rawDist = Math.hypot(distX, distZ);
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
 */
export function generateMecanumTrajectory(
  waypoints: [number, number][],
  finalHeadingDeg = 0,
  nominalSpeedMps = 0.5,
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

  // Initial Zero-Radius Turn: If rover heading does not match initial path departure angle,
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
        const turnDuration = Math.max(0.3, Math.min(1.4, Math.abs(initialDiff) / 75));
        const turnSteps = Math.max(8, Math.round(turnDuration / dt));
        for (let s = 0; s < turnSteps; s++) {
          const tNorm = s / turnSteps;
          const ease =
            tNorm < 0.5
              ? 4 * tNorm * tNorm * tNorm
              : 1 - Math.pow(-2 * tNorm + 2, 3) / 2;
          const heading = (startHeadingDeg + initialDiff * ease + 360) % 360;
          const deriv =
            tNorm < 0.5
              ? 12 * tNorm * tNorm
              : 6 * Math.pow(-2 * tNorm + 2, 2);
          const yawRateRad = ((initialDiff * Math.PI) / 180 / turnDuration) * deriv * 0.5;

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

  for (let i = 0; i < waypoints.length - 1; i++) {
    const p0 = waypoints[i];
    const p1 = waypoints[i + 1];
    const dx = p1[0] - p0[0];
    const dz = p1[1] - p0[1];
    const segDist = Math.hypot(dx, dz);
    if (segDist < 1e-4) continue;

    const segDuration = segDist / nominalSpeedMps;
    const steps = Math.max(1, Math.round(segDuration / dt));

    const segHeading = ((Math.atan2(dz, dx) * 180) / Math.PI + 360) % 360;
    const isLastSegment = i === waypoints.length - 2;
    let nextSegHeading = segHeading;
    if (!isLastSegment && i + 2 < waypoints.length) {
      const nextDx = waypoints[i + 2][0] - p1[0];
      const nextDz = waypoints[i + 2][1] - p1[1];
      if (Math.hypot(nextDx, nextDz) > 1e-4) {
        nextSegHeading = ((Math.atan2(nextDz, nextDx) * 180) / Math.PI + 360) % 360;
      }
    }

    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      let x = p0[0] + dx * t;
      let z = p0[1] + dz * t;

      let heading = segHeading;
      let diffYaw = 0;
      if (isLastSegment && t > 0.5) {
        const blend = (t - 0.5) * 2;
        const diff = ((finalHeadingDeg - segHeading + 540) % 360) - 180;
        heading = (segHeading + diff * blend + 360) % 360;
        diffYaw = diff;
      } else if (!isLastSegment && t > 0.65) {
        const blend = (t - 0.65) / 0.35;
        const diff = ((nextSegHeading - segHeading + 540) % 360) - 180;
        heading = (segHeading + diff * blend + 360) % 360;
        diffYaw = diff;
      }

      // Compute APF force deflection if obstacles exist
      let apfForce: [number, number] = [0, 0];
      let clearance = 5.0;
      if (obstacles.length > 0) {
        const apf = computeAPF([x, z], p1, obstacles);
        apfForce = apf.repulsiveForce;
        clearance = apf.minClearance;
        // Mild physical repulsive nudge
        if (apf.repulsiveForce[0] !== 0 || apf.repulsiveForce[1] !== 0) {
          x += apf.repulsiveForce[0] * 0.015;
          z += apf.repulsiveForce[1] * 0.015;
        }
      }

      const vx = (dx / segDist) * nominalSpeedMps;
      const vz = (dz / segDist) * nominalSpeedMps;

      const radHeading = (heading * Math.PI) / 180;
      // Forward body projection with anisotropic roller slip compensation
      const localVx = vx * Math.cos(radHeading) + vz * Math.sin(radHeading);
      const localVy = (-vx * Math.sin(radHeading) + vz * Math.cos(radHeading)) / 0.78;
      const yawRateRad = ((diffYaw * Math.PI) / 180) * 0.5;

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

  const halfW = roomWidth / 2 - 0.25;
  const halfD = roomDepth / 2 - 0.25;

  // 1. Boundary / Wall check in front of vehicle corridor
  for (let d = 0.15; d <= lookaheadM; d += 0.1) {
    const checkX = x + forwardX * d;
    const checkZ = z + forwardZ * d;

    // Check perimeter wall hazard
    if (Math.abs(checkX) >= halfW || Math.abs(checkZ) >= halfD) {
      return {
        type: "obstacle",
        distanceM: Number(d.toFixed(2)),
        location: [Number(checkX.toFixed(2)), Number(checkZ.toFixed(2))],
        clearanceM: Number(Math.max(0.01, d - 0.25).toFixed(2)),
        severity: d < 0.45 ? "critical" : "warning",
        message: `Boundary perimeter hazard detected ${d.toFixed(2)}m ahead. Decelerating.`,
        inspectionAngleDeg
      };
    }

    // Check physical obstacles or holes
    for (const obs of obstacles) {
      const halfObsW = obs.width / 2 + 0.24; // include rover footprint safety envelope
      const halfObsD = obs.depth / 2 + 0.24;
      if (
        Math.abs(checkX - obs.x) <= halfObsW &&
        Math.abs(checkZ - obs.z) <= halfObsD
      ) {
        const isHole = (obs as { isHole?: boolean }).isHole || obs.height <= 0;
        const hazardType: "hole" | "obstacle" = isHole ? "hole" : "obstacle";

        // Compute potential left vs right holonomic bypass points
        const bypassOffsetM = Math.max(0.40, obs.width / 2 + 0.35);
        const leftX = obs.x + normalX * bypassOffsetM;
        const leftZ = obs.z + normalZ * bypassOffsetM;
        const rightX = obs.x - normalX * bypassOffsetM;
        const rightZ = obs.z - normalZ * bypassOffsetM;

        const leftClear = Math.abs(leftX) < halfW && Math.abs(leftZ) < halfD;
        const rightClear = Math.abs(rightX) < halfW && Math.abs(rightZ) < halfD;
        const direction: "left" | "right" =
          leftClear && !rightClear ? "left" : rightClear && !leftClear ? "right" : "left";

        const bypassPoint: [number, number] =
          direction === "left" ? [Number(leftX.toFixed(2)), Number(leftZ.toFixed(2))] : [Number(rightX.toFixed(2)), Number(rightZ.toFixed(2))];

        return {
          type: hazardType,
          distanceM: Number(d.toFixed(2)),
          location: [obs.x, obs.z],
          clearanceM: Number(Math.max(0.01, d - 0.25).toFixed(2)),
          severity: d < 0.38 ? "critical" : "warning",
          message: isHole
            ? `Floor void / pit detected at ${d.toFixed(2)}m via ${inspectionAngleDeg}° ground inspection. Negative obstacle avoidance active.`
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
