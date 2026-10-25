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
  id: "chamber" | "depot" | "partitioned";
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
    name: "Benchmark Chamber (6×5m)",
    width: 6,
    depth: 5,
    height: 3,
    description: "Standard metrology room with central equipment console casting shadow gaps.",
    obstacles: [
      { x: 0, z: 0.8, width: 1.2, depth: 0.7, height: 1.1 }
    ]
  },
  {
    id: "depot",
    name: "Logistics Depot (8×6m)",
    width: 8,
    depth: 6,
    height: 3,
    description: "Expanded depot floor with stacked pallets and storage crates.",
    obstacles: [
      { x: -1.6, z: 0.4, width: 1.4, depth: 0.9, height: 1.6 },
      { x: 1.8, z: -0.7, width: 1.1, depth: 1.1, height: 1.0 }
    ]
  },
  {
    id: "partitioned",
    name: "Divided Lab (9×4.5m)",
    width: 9,
    depth: 4.5,
    height: 3,
    description: "Partition wall with doorway; requires navigating around the wall to map the second wing.",
    obstacles: [
      { x: 0, z: -0.6, width: 0.35, depth: 3.3, height: 2.6 },
      { x: -2.5, z: 0.8, width: 1.2, depth: 0.7, height: 0.85 }
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
 * Calculates collision-free waypoints from start to target around obstacles.
 */
export function findNavPath(
  start: [number, number],
  goal: [number, number],
  obstacles: ScanObstacle[],
  roomW: number,
  roomD: number,
  safetyMargin = 0.35
): [number, number][] {
  const [sx, sz] = start;
  const [gx, gz] = goal;

  const halfW = roomW / 2 - 0.3;
  const halfD = roomD / 2 - 0.3;

  // Check if direct line intersects any obstacle
  const blocking = obstacles.find((o) => {
    const minX = o.x - o.width / 2 - safetyMargin;
    const maxX = o.x + o.width / 2 + safetyMargin;
    const minZ = o.z - o.depth / 2 - safetyMargin;
    const maxZ = o.z + o.depth / 2 + safetyMargin;
    return lineIntersectsBox(sx, sz, gx, gz, minX, maxX, minZ, maxZ);
  });

  if (!blocking) {
    return [[sx, sz], [gx, gz]];
  }

  // Generate corner detour candidates around blocking obstacle
  const minX = blocking.x - blocking.width / 2 - safetyMargin;
  const maxX = blocking.x + blocking.width / 2 + safetyMargin;
  const minZ = blocking.z - blocking.depth / 2 - safetyMargin;
  const maxZ = blocking.z + blocking.depth / 2 + safetyMargin;

  const corners: [number, number][] = [
    [minX, minZ],
    [maxX, minZ],
    [minX, maxZ],
    [maxX, maxZ],
    [minX, (minZ + maxZ) / 2],
    [maxX, (minZ + maxZ) / 2],
    [(minX + maxX) / 2, minZ],
    [(minX + maxX) / 2, maxZ]
  ].filter(([x, z]) => Math.abs(x) <= halfW && Math.abs(z) <= halfD) as [number, number][];

  // Pick corner waypoint that has unobstructed lines to both start and goal
  let bestCorner: [number, number] | null = null;
  let bestDist = Infinity;

  for (const c of corners) {
    const startBlocked = obstacles.some((o) => {
      const bMinX = o.x - o.width / 2 - safetyMargin;
      const bMaxX = o.x + o.width / 2 + safetyMargin;
      const bMinZ = o.z - o.depth / 2 - safetyMargin;
      const bMaxZ = o.z + o.depth / 2 + safetyMargin;
      return lineIntersectsBox(sx, sz, c[0], c[1], bMinX, bMaxX, bMinZ, bMaxZ);
    });

    const goalBlocked = obstacles.some((o) => {
      const bMinX = o.x - o.width / 2 - safetyMargin;
      const bMaxX = o.x + o.width / 2 + safetyMargin;
      const bMinZ = o.z - o.depth / 2 - safetyMargin;
      const bMaxZ = o.z + o.depth / 2 + safetyMargin;
      return lineIntersectsBox(c[0], c[1], gx, gz, bMinX, bMaxX, bMinZ, bMaxZ);
    });

    if (!startBlocked && !goalBlocked) {
      const dist = Math.hypot(c[0] - sx, c[1] - sz) + Math.hypot(gx - c[0], gz - c[1]);
      if (dist < bestDist) {
        bestDist = dist;
        bestCorner = c;
      }
    }
  }

  if (bestCorner) {
    return [[sx, sz], bestCorner, [gx, gz]];
  }

  // Fallback: mid waypoint detour
  const midX = (sx + gx) / 2;
  const midZ = blocking.z + (blocking.z >= 0 ? -blocking.depth / 2 - safetyMargin : blocking.depth / 2 + safetyMargin);
  return [[sx, sz], [Math.max(-halfW, Math.min(halfW, midX)), Math.max(-halfD, Math.min(halfD, midZ))], [gx, gz]];
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
  const primaryGap = gaps.length > 0 ? gaps[0] : null;

  // Next-Best-View calculation avoiding obstacles
  let recX = 0;
  let recZ = 0;
  let recHeading = 0;
  let suggestedTilt = 10;

  if (primaryGap) {
    const [gx, gz] = primaryGap.center;
    if (primaryGap.wall === "west") {
      recX = Math.min(halfW - 0.6, gx + 1.5);
      recZ = Math.max(-halfD + 0.6, Math.min(halfD - 0.6, gz));
      recHeading = 180; // Face West
      suggestedTilt = 5;
    } else if (primaryGap.wall === "east") {
      recX = Math.max(-halfW + 0.6, gx - 1.5);
      recZ = Math.max(-halfD + 0.6, Math.min(halfD - 0.6, gz));
      recHeading = 0; // Face East
      suggestedTilt = 5;
    } else if (primaryGap.wall === "north") {
      recX = Math.max(-halfW + 0.6, Math.min(halfW - 0.6, gx));
      recZ = Math.min(halfD - 0.6, gz + 1.5);
      recHeading = 270; // Face North
      suggestedTilt = 10;
    } else {
      recX = Math.max(-halfW + 0.6, Math.min(halfW - 0.6, gx));
      recZ = Math.max(-halfD + 0.6, gz - 1.5);
      recHeading = 90; // Face South
      suggestedTilt = 10;
    }

    // Ensure candidate doesn't sit inside an obstacle
    for (const o of obstacles) {
      if (Math.abs(recX - o.x) < o.width / 2 + 0.4 && Math.abs(recZ - o.z) < o.depth / 2 + 0.4) {
        // Shift outward
        recX += (recX >= o.x ? 0.7 : -0.7);
        recZ += (recZ >= o.z ? 0.7 : -0.7);
        recX = Math.max(-halfW + 0.5, Math.min(halfW - 0.5, recX));
        recZ = Math.max(-halfD + 0.5, Math.min(halfD - 0.5, recZ));
      }
    }
  }

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
  sampleRateHz = 30
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
        wheelRPMs: [0, 0, 0, 0]
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
      const x = p0[0] + dx * t;
      const z = p0[1] + dz * t;

      let heading = segHeading;
      if (isLastSegment && t > 0.5) {
        const blend = (t - 0.5) * 2;
        heading = segHeading + (finalHeadingDeg - segHeading) * blend;
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
        wheelRPMs: rpms
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
    wheelRPMs: [0, 0, 0, 0]
  });

  return result;
}
