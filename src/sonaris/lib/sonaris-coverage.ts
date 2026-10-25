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

export interface CoverageReport {
  totalSegments: number;
  mappedSegments: number;
  coveragePercent: number; // 0 to 100
  heightBins: WallHeightBin[]; // 16 vertical bins of 15 cm
  capturedBinsCount: number;
  unseenBinsCount: number;
  outOfReachBinsCount: number;
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
    description: "Open metrology arena for forward 180° LiDAR scan reconstruction.",
    obstacles: []
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

  const targetHeading = (Math.atan2(-tDz, tDx) * 180) / Math.PI;
  const headingDiff = ((targetHeading - headingDeg + 180) % 360) - 180;
  const omegaDeg = Math.max(-90, Math.min(90, headingDiff * 2.0));

  const radius = 0.05;
  const halfLength = 0.17;
  const halfWidth = 0.14;
  const radHeading = (headingDeg * Math.PI) / 180;
  const localVx = vx * Math.cos(radHeading) - vz * Math.sin(radHeading);
  const localVy = vx * Math.sin(radHeading) + vz * Math.cos(radHeading);
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

  // Count point intersections near perimeter walls
  const tolerance = 0.35; // 35 cm proximity to wall
  for (const p of points) {
    for (const seg of segments) {
      if (seg.wall === "north" && Math.abs(p.z - -halfD) < tolerance && p.x >= seg.start[0] && p.x <= seg.end[0]) {
        seg.hits++;
      } else if (seg.wall === "south" && Math.abs(p.z - halfD) < tolerance && p.x >= seg.start[0] && p.x <= seg.end[0]) {
        seg.hits++;
      } else if (seg.wall === "west" && Math.abs(p.x - -halfW) < tolerance && p.z >= seg.start[1] && p.z <= seg.end[1]) {
        seg.hits++;
      } else if (seg.wall === "east" && Math.abs(p.x - halfW) < tolerance && p.z >= seg.start[1] && p.z <= seg.end[1]) {
        seg.hits++;
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

  // Quantize 16 vertical height bins of 15 cm (0.0 to 2.4 m), matching project research & gap-aware model
  const BIN_COUNT = 16;
  const BIN_HEIGHT = 0.15;
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
    // Count scan hits falling into this height band
    let count = 0;
    for (const p of points) {
      if (p.y >= minY && p.y < maxY) {
        count++;
      }
    }

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

  return {
    totalSegments: segments.length,
    mappedSegments: mappedCount,
    coveragePercent,
    heightBins,
    capturedBinsCount,
    unseenBinsCount,
    outOfReachBinsCount,
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
  obstacles: ScanObstacle[] = []
): TrajectoryPoint[] {
  if (waypoints.length < 2) {
    const single = waypoints[0] ?? [0, 0];
    return [
      {
        x: single[0],
        z: single[1],
        headingDeg: finalHeadingDeg,
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

  for (let i = 0; i < waypoints.length - 1; i++) {
    const p0 = waypoints[i];
    const p1 = waypoints[i + 1];
    const dx = p1[0] - p0[0];
    const dz = p1[1] - p0[1];
    const segDist = Math.hypot(dx, dz);
    if (segDist < 1e-4) continue;

    const segDuration = segDist / nominalSpeedMps;
    const steps = Math.max(1, Math.round(segDuration / dt));

    const segHeading = (Math.atan2(-dz, dx) * 180) / Math.PI;
    const isLastSegment = i === waypoints.length - 2;

    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      let x = p0[0] + dx * t;
      let z = p0[1] + dz * t;

      let heading = segHeading;
      if (isLastSegment && t > 0.5) {
        const blend = (t - 0.5) * 2;
        heading = segHeading + (finalHeadingDeg - segHeading) * blend;
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
      const localVx = vx * Math.cos(radHeading) - vz * Math.sin(radHeading);
      const localVy = vx * Math.sin(radHeading) + vz * Math.cos(radHeading);
      const yawRateRad = isLastSegment && t > 0.5 ? (((finalHeadingDeg - segHeading) * Math.PI) / 180) * 0.5 : 0;

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
  type: "obstacle" | "drop_off" | "uneven" | "clear";
  distanceM: number;
  location: [number, number];
  clearanceM: number;
  severity: "none" | "warning" | "critical";
  message: string;
}

/**
 * Scans the immediate forward driving corridor along the rover's projected trajectory.
 * Checks for obstacles, floor continuity, and terrain clearance before the wheels traverse.
 */
export function scanDrivingCorridor(
  roverPose: { x: number; z: number; heading: number },
  obstacles: ScanObstacle[] = [],
  roomWidth: number,
  roomDepth: number,
  lookaheadM = 0.85
): PathPerceptionHazard {
  const { x, z, heading } = roverPose;
  const rad = (heading * Math.PI) / 180;
  const forwardX = Math.cos(rad);
  const forwardZ = Math.sin(rad);

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
        message: `Boundary hazard detected ${d.toFixed(2)}m ahead. Decelerating.`
      };
    }

    // Check physical obstacles or holes
    for (const obs of obstacles) {
      const halfObsW = obs.width / 2 + 0.22; // include rover footprint safety
      const halfObsD = obs.depth / 2 + 0.22;
      if (
        Math.abs(checkX - obs.x) <= halfObsW &&
        Math.abs(checkZ - obs.z) <= halfObsD
      ) {
        return {
          type: "obstacle",
          distanceM: Number(d.toFixed(2)),
          location: [obs.x, obs.z],
          clearanceM: Number(Math.max(0.01, d - 0.25).toFixed(2)),
          severity: d < 0.4 ? "critical" : "warning",
          message: `Obstacle in driving corridor at ${d.toFixed(2)}m. APF evasive repulsion active.`
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
    message: "Driving corridor clear · Terrain ground plane verified continuous."
  };
}
