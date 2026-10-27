/** Proposal data and analytical scenarios, never physical measurements. */
export interface Component {
  id: string;
  name: string;
  model: string;
  quantity: number;
  kind: "purchased" | "fabricated";
  status: "concept" | "simulated" | "verified" | "physical";
  dimensions: [number, number, number] | null;
  massKg: number | null;
  position: [number, number, number];
  rotation: number;
  voltage: number | null;
  current: number | null;
  peakCurrent: number | null;
  source: string;
  cost: number | null;
  procurement: string;
  notes: string;
}
export interface Connection {
  id: string;
  from: string;
  to: string;
  voltage: number | null;
  current: number | null;
  rating: number | null;
  connector: string;
  protection: string;
  status: string;
}
export interface EngineeringRecord {
  id: string;
  title: string;
  detail: string;
  date: string;
}
export interface Trial {
  uncertainty?: number | null;
  id: string;
  metric: string;
  value: number;
  unit: string;
  date: string;
  protocol: string;
}
export interface Project {
  version: 1;
  components: Component[];
  connections: Connection[];
  decisions: EngineeringRecord[];
  risks: EngineeringRecord[];
  revisions: EngineeringRecord[];
  trials: Trial[];
}
const inventory: [string, string, number, Component["kind"]?, string?][] = [
  ["Main computer", "Raspberry Pi 5, 8 GB", 1],
  ["Active cooler", "Model unresolved", 1],
  ["Storage", "128 GB microSD", 1],
  ["Motion controller", "Raspberry Pi Pico", 1],
  [
    "2D scanner",
    "RPLIDAR S2",
    1,
    undefined,
    "Tilted 2D scan planes reconstruct 3D; not a native 3D LiDAR."
  ],
  ["Tilt actuator", "ST3215, 12 V variant", 1],
  ["Orientation sensor", "BNO085", 1],
  [
    "Encoder gearmotor",
    "Pololu #4694",
    4,
    undefined,
    "Proposal: 70:1, nominal 24 V. Rail and operating point remain unresolved."
  ],
  [
    "Mecanum wheel",
    "127 mm proposed diameter",
    4,
    undefined,
    "Two left-handed and two right-handed; full envelope unverified."
  ],
  ["Motor mounting brackets", "Model unresolved", 4],
  ["Wheel hubs and couplings", "Model unresolved", 4],
  ["Motor driver", "Cytron MDD10A", 2],
  [
    "Battery",
    "BLF-1212AS LiFePO4",
    1,
    undefined,
    "Proposal: 12 V-class, 12 Ah. Usable capacity and discharge characteristics unverified."
  ],
  ["Battery charger", "Model unresolved", 1],
  ["DC-DC converters", "Models unresolved", 2],
  ["Physical emergency stop", "Model unresolved", 1],
  ["Contactor / disconnect", "Model unresolved", 1],
  ["Current/voltage monitor", "Model unresolved", 1],
  ["Encoder interface", "Model unresolved", 1],
  [
    "Fuse and protection system",
    "Selection unresolved",
    0,
    undefined,
    "Quantity as required; zero records an unresolved quantity, not an omitted requirement."
  ],
  ["Local display", "3.5-inch HDMI display", 1],
  ["Mechanical chassis and enclosure", "Custom assembly", 1, "fabricated"],
  ["Tilt frame, bearings and mounts", "Custom assembly", 1, "fabricated"],
  ["Fasteners, cables and connectors", "Selection unresolved", 0],
  ["Cable glands", "Selection unresolved", 0],
  ["Strain relief", "Selection unresolved", 0],
  ["Cooling space", "Reserved clearance unresolved", 0, "fabricated"],
  ["Terminals", "Selection unresolved", 0],
  ["Mounting standoffs", "Selection unresolved", 0],
  ["Switches", "Selection unresolved", 0],
  ["Service openings", "Design unresolved", 0, "fabricated"],
  ["Battery restraint", "Design unresolved", 1, "fabricated"],
  ["Externally accessible connections", "Selection unresolved", 0]
];
export const initialComponents: Component[] = inventory.map(
  ([name, model, quantity, kind = "purchased", notes = ""]) => ({
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name,
    model,
    quantity,
    kind,
    status: "concept",
    dimensions: null,
    massKg: null,
    position: [0, 0, 0],
    rotation: 0,
    voltage: null,
    current: null,
    peakCurrent: null,
    source: "Approved proposal; manufacturer envelope and limits not yet verified",
    cost: null,
    procurement: "Not procured",
    notes:
      notes ||
      "Specification and placement unresolved. Zero placement is an unset origin, not an approved assembly."
  })
);
export function createProject(): Project {
  return {
    version: 1,
    components: initialComponents.map((c) => ({
      ...c,
      position: [...c.position],
      dimensions: c.dimensions ? [...c.dimensions] : null
    })),
    connections: [],
    decisions: [],
    risks: [
      {
        id: "motor-source-operating-point",
        title: "Motor and source operating point unresolved",
        detail:
          "Current approved brief proposes nominal 24 V motors and a 12 V-class battery. Establish motor operating point, available torque/speed, converter topology and drive current; this is not a categorical incompatibility finding."
      },
      {
        id: "cad-envelopes-unverified",
        title: "Component envelopes and CAD unverified",
        detail:
          "Current approved brief supplies no manufacturer-verified full envelopes or released assembly. Source dimensions, interfaces and clearances before mechanical validation."
      },
      {
        id: "printer-z-unverified",
        title: "Printer Z and process tolerances unresolved",
        detail:
          "Current approved brief verifies only the 300 × 300 mm XY bed. Establish usable Z, tolerances and material/process settings before fabrication approval."
      },
      {
        id: "physical-tests-not-started",
        title: "No physical test evidence",
        detail:
          "Current approved brief states no hardware or operational software implemented. Proposal acceptance targets and browser analytical results are not measured physical performance."
      }
    ].map((r) => ({ ...r, date: "2026-10-21T00:00:00.000Z" })),
    revisions: [],
    trials: []
  };
}
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const nullable = (v: unknown) => v === null || (finite(v) && v >= 0);
const tuple = (v: unknown, positive = false) =>
  Array.isArray(v) && v.length === 3 && v.every((n) => finite(n) && (!positive || n > 0));
const strings = (v: Record<string, unknown>, keys: string[]) =>
  keys.every((k) => typeof v[k] === "string");
const obj = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
export function validateProject(value: unknown): value is Project {
  if (!obj(value) || value.version !== 1) return false;
  const { components, connections, decisions, risks, revisions, trials } = value;
  if (
    !Array.isArray(components) ||
    components.length > 1000 ||
    !components.every(
      (c) =>
        obj(c) &&
        strings(c, ["id", "name", "model", "source", "procurement", "notes"]) &&
        String(c.id).trim().length > 0 &&
        (!["verified", "physical"].includes(String(c.status)) ||
          (String(c.source).trim().length > 0 &&
            !String(c.source).startsWith("Approved proposal"))) &&
        ["purchased", "fabricated"].includes(c.kind as string) &&
        ["concept", "simulated", "verified", "physical"].includes(c.status as string) &&
        Number.isInteger(c.quantity) &&
        Number(c.quantity) >= 0 &&
        (c.dimensions === null || tuple(c.dimensions, true)) &&
        tuple(c.position) &&
        finite(c.rotation) &&
        ["massKg", "voltage", "current", "peakCurrent", "cost"].every((k) => nullable(c[k]))
    )
  )
    return false;
  const ids = components.map((c) => c.id);
  if (new Set(ids).size !== ids.length) return false;
  if (
    !Array.isArray(connections) ||
    !connections.every(
      (c) =>
        obj(c) &&
        strings(c, ["id", "from", "to", "connector", "protection", "status"]) &&
        String(c.id).trim().length > 0 &&
        ids.includes(c.from) &&
        ids.includes(c.to) &&
        c.from !== c.to &&
        ["voltage", "current", "rating"].every((k) => nullable(c[k]))
    )
  )
    return false;
  if (new Set(connections.map((c) => c.id)).size !== connections.length) return false;
  if (
    ![decisions, risks, revisions].every(
      (list) =>
        Array.isArray(list) &&
        list.every((r) => obj(r) && strings(r, ["id", "title", "detail", "date"]))
    )
  )
    return false;
  return (
    Array.isArray(trials) &&
    trials.length <= 10000 &&
    trials.every(
      (r) =>
        obj(r) &&
        strings(r, ["id", "metric", "unit", "date", "protocol"]) &&
        finite(r.value) &&
        (r.uncertainty === undefined || nullable(r.uncertainty))
    )
  );
}
export function powerEstimate(
  components: Component[],
  batteryV: number,
  capacityAh: number,
  efficiency: number,
  duty: number
): { watts: number | null; runtimeHours: number | null; missing: string[]; reason: string } {
  const missing = components
    .filter(
      (c) =>
        !finite(c.voltage) ||
        c.voltage <= 0 ||
        !finite(c.current) ||
        c.current < 0 ||
        !Number.isInteger(c.quantity) ||
        c.quantity <= 0
    )
    .map((c) => c.name);
  if (!components.length || missing.length)
    return {
      watts: null,
      runtimeHours: null,
      missing,
      reason:
        "Incomplete electrical loads; no partial total is reported. Passive parts require an explicit zero current."
    };
  const watts = components.reduce((sum, c) => sum + c.voltage! * c.current! * c.quantity, 0);
  const valid =
    [batteryV, capacityAh, efficiency, duty].every((n) => finite(n) && n > 0) &&
    efficiency <= 1 &&
    duty <= 1;
  return {
    watts,
    runtimeHours: valid && watts > 0 ? (batteryV * capacityAh * efficiency) / (watts * duty) : null,
    missing: [],
    reason:
      valid && watts > 0
        ? "Analytical constant-load estimate; excludes sag, transients and capacity derating. Not measured runtime."
        : "Positive battery, capacity, load, efficiency and duty inputs required; efficiency and duty must not exceed one."
  };
}
/** Wheel order: front-left, front-right, rear-left, rear-right. vx forward, vy left, yaw counterclockwise. */
export function wheelSpeeds(
  vx: number,
  vy: number,
  yaw: number,
  radius: number,
  halfLength: number,
  halfWidth: number
): [number, number, number, number] {
  if (
    ![vx, vy, yaw, radius, halfLength, halfWidth].every(finite) ||
    radius <= 0 ||
    halfLength <= 0 ||
    halfWidth <= 0
  )
    throw new RangeError("Finite commands and positive measured geometry required");
  const w = (halfLength + halfWidth) * yaw;
  return [
    (vx - vy - w) / radius,
    (vx + vy + w) / radius,
    (vx + vy - w) / radius,
    (vx - vy + w) / radius
  ];
}
export function printFit(
  dimensions: [number, number, number],
  bedZ: number | null
): { fitsXY: boolean; zStatus: string } {
  if (!tuple(dimensions, true)) return { fitsXY: false, zStatus: "Invalid part dimensions" };
  return {
    fitsXY: dimensions[0] <= 300 && dimensions[1] <= 300,
    zStatus:
      bedZ === null
        ? "Unverified Z clearance"
        : !finite(bedZ) || bedZ <= 0
          ? "Invalid Z clearance"
          : dimensions[2] <= bedZ
            ? "Fits Z clearance"
            : "Exceeds Z clearance"
  };
}
export function validateConnection(c: Connection, components: Component[]): string {
  const from = components.find((v) => v.id === c.from),
    to = components.find((v) => v.id === c.to);
  if (!from || !to) return "Missing component endpoint";
  if ([c.voltage, from.voltage, to.voltage].some((v) => v === null || !finite(v) || v <= 0))
    return "Unresolved voltage requirements";
  if (c.voltage !== from.voltage || c.voltage !== to.voltage)
    return "Incompatible voltage requirements; converter/interface needed";
  if (
    c.current === null ||
    c.rating === null ||
    !finite(c.current) ||
    !finite(c.rating) ||
    c.current < 0 ||
    c.rating <= 0
  )
    return "Unresolved current or conductor rating";
  if (c.current > c.rating) return "Overloaded connection: expected current exceeds rating";
  if (!c.connector.trim() || !c.protection.trim()) return "Unresolved connector or protection";
  return "Compatible supplied nominal values only; polarity, pinout, logic levels, transient and fault limits require verification";
}
export interface ScanPoint {
  x: number;
  y: number;
  z: number;
  normal?: [number, number, number];
}
export interface ScanObstacle {
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  baseY?: number;
  isHole?: boolean;
  isDark?: boolean;
  shape?: "box" | "cylinder" | "ramp";
  radius?: number;
  rampDirection?: "posZ" | "negZ" | "posX" | "negX";
}
/** Slamtec RPLIDAR S2 DToF physical specifications */
export const RPLIDAR_S2_SPECS = {
  sampleRateHz: 32000,
  typicalScanHz: 10,
  minBlindRangeM: 0.05, // 50 mm minimum blind zone
  maxWhiteRangeM: 30.0, // >70% reflectivity
  maxDarkRangeM: 10.0,  // 10% black target
  rangeAccuracyM: 0.03, // ±30 mm
  distanceResolutionM: 0.013, // 13 mm
  opticalScanPlaneHeightM: 0.018 // 18 mm above S2 base
} as const;

/** Waveshare / Feetech ST3215 12V Serial Bus Servo specifications */
export const ST3215_SERVO_SPECS = {
  voltageV: 12,
  stallTorqueKgCm: 30,
  noLoadSpeedSecPer60Deg: 0.222, // 0.222 s / 60°
  speedDegPerSec: 270, // 45 RPM
  resolutionStepsPer360: 4096, // 12-bit magnetic encoder
  angularResolutionDeg: 0.088,
  minTiltDeg: -30,
  maxTiltDeg: 60
} as const;

export interface ScanRoomOptions {
  opticalOffset?: [number, number]; // [forwardOffset, verticalOffset] in meters relative to tilt pivot
  minBlindRange?: number; // S2 50 mm blind zone rejection
  reflectivityCutoff?: boolean; // Dark low-reflectivity targets capped at 10 m
  enableGrazingDropouts?: boolean; // Rejects grazing specular incidence (>82°)
  useGaussianNoise?: boolean; // Calibrated range-dependent DToF Gaussian noise
  includeNormals?: boolean;
}

/** 2D scan plane raycaster with S2 DToF sensor fidelity, ST3215 tilt kinematics, and deterministic noise. */
export function scanRoom(
  roomWidth: number,
  roomDepth: number,
  x: number,
  z: number,
  headingDeg = 0,
  tiltDeg = 0,
  rays = 360,
  range = 30,
  noise = 0,
  sensorHeight = 0.5,
  obstacles: ScanObstacle[] = [],
  wallHeight = 3,
  fovDeg = 360,
  fovStartDeg = 0,
  options?: ScanRoomOptions
): ScanPoint[] {
  if (
    ![roomWidth, roomDepth, x, z, headingDeg, tiltDeg, rays, range, noise, sensorHeight].every(
      finite
    ) ||
    wallHeight <= 0 ||
    !finite(wallHeight) ||
    sensorHeight < 0 ||
    sensorHeight > wallHeight ||
    obstacles.some(
      (o) =>
        ![o.x, o.z, o.width, o.depth, o.height].every(finite) ||
        o.width <= 0 ||
        o.depth <= 0 ||
        o.height <= 0
    ) ||
    roomWidth <= 0 ||
    roomDepth <= 0 ||
    range <= 0 ||
    noise < 0 ||
    tiltDeg < -30 ||
    tiltDeg > 60 ||
    rays < 1 ||
    rays > 10000 ||
    !Number.isInteger(rays) ||
    Math.abs(x) >= roomWidth / 2 ||
    Math.abs(z) >= roomDepth / 2
  )
    return [];

  const points: ScanPoint[] = [];
  const h = (headingDeg * Math.PI) / 180,
    t = (tiltDeg * Math.PI) / 180;

  // ST3215 Tilt Mount Kinematics: Calculate true optical center displaced from pitch pivot
  let rayOriginX = x;
  let rayOriginY = sensorHeight;
  let rayOriginZ = z;

  if (options?.opticalOffset) {
    const [optFwd, optVert] = options.opticalOffset;
    const localX_opt = optFwd * Math.cos(t) - optVert * Math.sin(t);
    const localY_opt = optFwd * Math.sin(t) + optVert * Math.cos(t);
    rayOriginX = x + localX_opt * Math.cos(h);
    rayOriginZ = z + localX_opt * Math.sin(h);
    rayOriginY = Math.max(0, Math.min(wallHeight, sensorHeight + localY_opt));
  }

  const minBlind = options?.minBlindRange ?? 0;

  // Rotate the scan plane about the local lateral axis, then apply rover yaw.
  for (let i = 0; i < rays; i++) {
    const a =
      fovDeg >= 360
        ? (i / rays) * Math.PI * 2
        : ((fovStartDeg + (rays > 1 ? (i / (rays - 1)) * fovDeg : 0)) * Math.PI) / 180;
    const localX = Math.cos(a) * Math.cos(t),
      dy = Math.cos(a) * Math.sin(t),
      localZ = Math.sin(a);
    const dx = localX * Math.cos(h) - localZ * Math.sin(h),
      dz = localX * Math.sin(h) + localZ * Math.cos(h);

    interface HitCandidate {
      dist: number;
      normal: [number, number, number];
      isDark?: boolean;
    }
    const hits: HitCandidate[] = [];

    if (Math.abs(dx) > 1e-10) {
      const isPos = dx > 0;
      const d = ((isPos ? roomWidth / 2 : -roomWidth / 2) - rayOriginX) / dx;
      if (d > 0) hits.push({ dist: d, normal: [isPos ? -1 : 1, 0, 0] });
    }
    if (Math.abs(dz) > 1e-10) {
      const isPos = dz > 0;
      const d = ((isPos ? roomDepth / 2 : -roomDepth / 2) - rayOriginZ) / dz;
      if (d > 0) hits.push({ dist: d, normal: [0, 0, isPos ? -1 : 1] });
    }
    if (Math.abs(dy) > 1e-10) {
      const isPos = dy > 0;
      const d = ((isPos ? wallHeight : 0) - rayOriginY) / dy;
      if (d > 0) {
        if (!isPos) {
          // Floor check: if ray hits inside a negative floor void / hole, ray drops into pit
          const hitX = rayOriginX + d * dx;
          const hitZ = rayOriginZ + d * dz;
          let insideHoleObstacle: typeof obstacles[0] | null = null;
          for (const o of obstacles) {
            if ((o as { isHole?: boolean }).isHole || o.height <= 0) {
              if (
                Math.abs(hitX - o.x) <= o.width / 2 &&
                Math.abs(hitZ - o.z) <= o.depth / 2
              ) {
                insideHoleObstacle = o;
                break;
              }
            }
          }
          if (insideHoleObstacle) {
            // Negative floor void: floor at y=0 is absent; ray hits pit bottom at y = -0.25m
            const pitY = -0.25;
            const pitD = (pitY - rayOriginY) / dy;
            if (pitD > 0) {
              const pitHitX = rayOriginX + pitD * dx;
              const pitHitZ = rayOriginZ + pitD * dz;
              if (
                Math.abs(pitHitX - insideHoleObstacle.x) <= insideHoleObstacle.width / 2 &&
                Math.abs(pitHitZ - insideHoleObstacle.z) <= insideHoleObstacle.depth / 2
              ) {
                hits.push({ dist: pitD, normal: [0, 1, 0] });
              }
            }
          } else {
            hits.push({ dist: d, normal: [0, 1, 0] });
          }
        } else {
          hits.push({ dist: d, normal: [0, -1, 0] });
        }
      }
    }

    for (const o of obstacles) {
      const baseY = o.baseY ?? 0;
      const isDark = (o as { isDark?: boolean }).isDark ?? false;

      // 1. Curvilinear Cylindrical Columns / Circular Pillars
      if (o.shape === "cylinder") {
        const radius = o.radius ?? o.width / 2;
        const ocx = o.x;
        const ocz = o.z;
        const topY = baseY + o.height;

        // Analytical quadratic ray-cylinder intersection in XZ plane
        const ox = rayOriginX - ocx;
        const oz = rayOriginZ - ocz;
        const aCoeff = dx * dx + dz * dz;
        if (aCoeff > 1e-10) {
          const bCoeff = 2 * (ox * dx + oz * dz);
          const cCoeff = ox * ox + oz * oz - radius * radius;
          const disc = bCoeff * bCoeff - 4 * aCoeff * cCoeff;
          if (disc >= 0) {
            const sqrtDisc = Math.sqrt(disc);
            const t0 = (-bCoeff - sqrtDisc) / (2 * aCoeff);
            const t1 = (-bCoeff + sqrtDisc) / (2 * aCoeff);
            const tCyl = t0 > 0 ? t0 : t1;
            if (tCyl > 0) {
              const hitY = rayOriginY + tCyl * dy;
              if (hitY >= baseY && hitY <= topY) {
                const hitX = rayOriginX + tCyl * dx;
                const hitZ = rayOriginZ + tCyl * dz;
                const normX = (hitX - ocx) / radius;
                const normZ = (hitZ - ocz) / radius;
                hits.push({ dist: tCyl, normal: [normX, 0, normZ], isDark });
              }
            }
          }
        }
        continue;
      }

      // 2. Sloped Inclined Ramps / Slanted Terrain Transitions
      if (o.shape === "ramp") {
        const dir = o.rampDirection ?? "posZ";
        const halfW = o.width / 2;
        const halfD = o.depth / 2;
        const minZ = o.z - halfD;
        const maxZ = o.z + halfD;
        const minX = o.x - halfW;
        const maxX = o.x + halfW;
        const hRamp = o.height;

        // Check inclined top face
        if (dir === "posZ" || dir === "negZ") {
          const sign = dir === "posZ" ? 1 : -1;
          const m = hRamp / o.depth;
          const zRef = dir === "posZ" ? minZ : maxZ;
          // y - baseY = sign * m * (z - zRef)
          const denom = dy - sign * m * dz;
          if (Math.abs(denom) > 1e-10) {
            const tRamp = (baseY - sign * m * zRef - (rayOriginY - sign * m * rayOriginZ)) / denom;
            if (tRamp > 0) {
              const hitX = rayOriginX + tRamp * dx;
              const hitZ = rayOriginZ + tRamp * dz;
              if (hitX >= minX && hitX <= maxX && hitZ >= minZ && hitZ <= maxZ) {
                const normLen = Math.sqrt(1 + m * m);
                hits.push({
                  dist: tRamp,
                  normal: [0, 1 / normLen, (-sign * m) / normLen],
                  isDark
                });
              }
            }
          }

          // Back vertical wall at elevated end
          const zBack = dir === "posZ" ? maxZ : minZ;
          if (Math.abs(dz) > 1e-10) {
            const tBack = (zBack - rayOriginZ) / dz;
            if (tBack > 0) {
              const hitX = rayOriginX + tBack * dx;
              const hitY = rayOriginY + tBack * dy;
              if (hitX >= minX && hitX <= maxX && hitY >= baseY && hitY <= baseY + hRamp) {
                hits.push({
                  dist: tBack,
                  normal: [0, 0, dir === "posZ" ? 1 : -1],
                  isDark
                });
              }
            }
          }

          // Triangular side walls (left & right)
          if (Math.abs(dx) > 1e-10) {
            for (const xSide of [minX, maxX]) {
              const tSide = (xSide - rayOriginX) / dx;
              if (tSide > 0) {
                const hitZ = rayOriginZ + tSide * dz;
                const hitY = rayOriginY + tSide * dy;
                if (hitZ >= minZ && hitZ <= maxZ) {
                  const yMax =
                    baseY +
                    (dir === "posZ"
                      ? ((hitZ - minZ) / o.depth) * hRamp
                      : ((maxZ - hitZ) / o.depth) * hRamp);
                  if (hitY >= baseY && hitY <= yMax) {
                    hits.push({
                      dist: tSide,
                      normal: [xSide === minX ? -1 : 1, 0, 0],
                      isDark
                    });
                  }
                }
              }
            }
          }
        } else {
          const sign = dir === "posX" ? 1 : -1;
          const m = hRamp / o.width;
          const xRef = dir === "posX" ? minX : maxX;
          const denom = dy - sign * m * dx;
          if (Math.abs(denom) > 1e-10) {
            const tRamp = (baseY - sign * m * xRef - (rayOriginY - sign * m * rayOriginX)) / denom;
            if (tRamp > 0) {
              const hitX = rayOriginX + tRamp * dx;
              const hitZ = rayOriginZ + tRamp * dz;
              if (hitX >= minX && hitX <= maxX && hitZ >= minZ && hitZ <= maxZ) {
                const normLen = Math.sqrt(1 + m * m);
                hits.push({
                  dist: tRamp,
                  normal: [(-sign * m) / normLen, 1 / normLen, 0],
                  isDark
                });
              }
            }
          }

          // Back vertical wall at elevated end
          const xBack = dir === "posX" ? maxX : minX;
          if (Math.abs(dx) > 1e-10) {
            const tBack = (xBack - rayOriginX) / dx;
            if (tBack > 0) {
              const hitZ = rayOriginZ + tBack * dz;
              const hitY = rayOriginY + tBack * dy;
              if (hitZ >= minZ && hitZ <= maxZ && hitY >= baseY && hitY <= baseY + hRamp) {
                hits.push({
                  dist: tBack,
                  normal: [dir === "posX" ? 1 : -1, 0, 0],
                  isDark
                });
              }
            }
          }

          // Triangular side walls (front & back in Z)
          if (Math.abs(dz) > 1e-10) {
            for (const zSide of [minZ, maxZ]) {
              const tSide = (zSide - rayOriginZ) / dz;
              if (tSide > 0) {
                const hitX = rayOriginX + tSide * dx;
                const hitY = rayOriginY + tSide * dy;
                if (hitX >= minX && hitX <= maxX) {
                  const yMax =
                    baseY +
                    (dir === "posX"
                      ? ((hitX - minX) / o.width) * hRamp
                      : ((maxX - hitX) / o.width) * hRamp);
                  if (hitY >= baseY && hitY <= yMax) {
                    hits.push({
                      dist: tSide,
                      normal: [0, 0, zSide === minZ ? -1 : 1],
                      isDark
                    });
                  }
                }
              }
            }
          }
        }
        continue;
      }

      // 3. Rectangular Box Envelopes & Partitions
      let near = -Infinity,
        far = Infinity;
      let nearNormal: [number, number, number] = [0, 0, 0];
      const origin = [rayOriginX, rayOriginY, rayOriginZ],
        direction = [dx, dy, dz],
        min = [o.x - o.width / 2, baseY, o.z - o.depth / 2],
        max = [o.x + o.width / 2, baseY + o.height, o.z + o.depth / 2];

      let miss = false;
      for (let axis = 0; axis < 3; axis++) {
        if (Math.abs(direction[axis]) < 1e-10) {
          if (origin[axis] < min[axis] || origin[axis] > max[axis]) {
            miss = true;
            break;
          }
        } else {
          let a = (min[axis] - origin[axis]) / direction[axis];
          let b = (max[axis] - origin[axis]) / direction[axis];
          let sign = -1;
          if (a > b) {
            const temp = a;
            a = b;
            b = temp;
            sign = 1;
          }
          if (a > near) {
            near = a;
            nearNormal = [0, 0, 0];
            nearNormal[axis] = sign;
          }
          far = Math.min(far, b);
        }
      }
      if (!miss && far >= near && far > 0) {
        const d = near > 0 ? near : far;
        hits.push({ dist: d, normal: nearNormal, isDark });
      }
    }

    const validHits = hits.filter((h) => h.dist > 0);
    if (validHits.length === 0) continue;

    validHits.sort((a, b) => a.dist - b.dist);
    const closest = validHits[0];
    const distance = closest.dist;

    // Minimum blind zone rejection (S2: 0.05 m)
    if (!Number.isFinite(distance) || distance < minBlind || distance > range) continue;

    // Surface reflectivity cutoff: Low-reflectivity targets cap range to 10 m (RPLIDAR S2 spec)
    if (options?.reflectivityCutoff && closest.isDark && distance > RPLIDAR_S2_SPECS.maxDarkRangeM) {
      continue;
    }

    // Grazing incidence dropouts: cos(incidence) < 0.14 (incidence > 82°) causes weak/scattered return
    if (options?.enableGrazingDropouts) {
      const cosIncidence = -(dx * closest.normal[0] + dy * closest.normal[1] + dz * closest.normal[2]);
      if (cosIncidence > 0 && cosIncidence < 0.14) {
        continue;
      }
    }

    // Range-dependent DToF noise model (calibrated ±30 mm accuracy + distance dispersion)
    let measured = distance;
    if (noise > 0) {
      if (options?.useGaussianNoise) {
        // Deterministic pseudo-Gaussian using Box-Muller on hash pairs
        const h1 = ((Math.imul(i + 1, 1664525) + 1013904223) >>> 0) / 4294967295;
        const h2 = ((Math.imul(i + 7, 22695477) + 1) >>> 0) / 4294967295;
        const u1 = Math.max(1e-7, h1);
        const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * h2);
        // Distance dispersion: sigma grows slightly at long ranges
        const sigma = noise * (1.0 + 0.015 * distance);
        measured = Math.max(minBlind, Math.min(range, distance + z0 * sigma));
      } else {
        const hash = ((Math.imul(i + 1, 1664525) + 1013904223) >>> 0) / 4294967295;
        measured = Math.max(0, Math.min(range, distance + (hash * 2 - 1) * noise));
      }
    }

    const pt: ScanPoint = {
      x: rayOriginX + dx * measured,
      y: Math.max(0, Math.min(wallHeight, rayOriginY + dy * measured)),
      z: rayOriginZ + dz * measured
    };
    if (options?.includeNormals) {
      pt.normal = closest.normal;
    }
    points.push(pt);
  }
  return points;
}

/** OBB envelope intersections, not mesh/fastener/clearance validation. Dimensions mm [X,Z,Y], placement metres at envelope centres. Touching counts as interference. */
export function collisionPairs(components: Component[]): [string, string][] {
  const known = components.filter(
    (c) => c.dimensions && tuple(c.dimensions, true) && tuple(c.position) && finite(c.rotation)
  );
  const pairs: [string, string][] = [];
  for (let i = 0; i < known.length; i++)
    for (let j = i + 1; j < known.length; j++) {
      const a = known[i],
        b = known[j],
        ad = a.dimensions!,
        bd = b.dimensions!;
      if (Math.abs(a.position[1] - b.position[1]) > (ad[2] + bd[2]) / 2000) continue;
      const axes = (c: Component) => {
        const t = (c.rotation * Math.PI) / 180;
        return [
          [Math.cos(t), Math.sin(t)],
          [-Math.sin(t), Math.cos(t)]
        ];
      };
      const aa = axes(a),
        ba = axes(b),
        delta = [b.position[0] - a.position[0], b.position[2] - a.position[2]];
      const dot = (u: number[], v: number[]) => u[0] * v[0] + u[1] * v[1];
      const intersects = [...aa, ...ba].every(
        (axis) =>
          Math.abs(dot(delta, axis)) <=
          (ad[0] / 2000) * Math.abs(dot(aa[0], axis)) +
            (ad[1] / 2000) * Math.abs(dot(aa[1], axis)) +
            (bd[0] / 2000) * Math.abs(dot(ba[0], axis)) +
            (bd[1] / 2000) * Math.abs(dot(ba[1], axis))
      );
      if (intersects) pairs.push([a.id, b.id]);
    }
  return pairs;
}
/** A threshold comparison alone never establishes hardware verification. Inputs use the unit named in each metric. */
export function assessTrial(metric: string, value: number): string {
  const limits: Record<string, [number, string, boolean]> = {
    "dimensional error": [5, "%", false],
    "data age p95": [1, "s", false],
    watchdog: [200, "ms", false],
    "watchdog initiation": [200, "ms", false],
    "finished mass": [20, "kg", false],
    runtime: [2, "h", true],
    mass: [20, "kg", false]
  };
  const rule = limits[metric.toLowerCase().trim()];
  if (!rule || !finite(value) || value < 0) return "Unresolved metric or invalid result";
  const [limit, unit, minimum] = rule;
  return `${(minimum ? value >= limit : value <= limit) ? "Meets" : "Does not meet"} proposal target (${minimum ? "≥" : "≤"}${limit}${unit}); evidence provenance remains separate`;
}

export interface CoverageStats {
  observedCells: number;
  totalCells: number;
  percent: number;
}
/** Declared wall grid only: four independent faces; corners map to the nearest face. Floor/ceiling and obstacle returns do not claim wall coverage. */
export function coverageStats(
  points: ScanPoint[],
  roomWidth: number,
  roomDepth: number,
  wallHeight = 3,
  cellSize = 0.25
): CoverageStats {
  if (![roomWidth, roomDepth, wallHeight, cellSize].every((v) => finite(v) && v > 0))
    return { observedCells: 0, totalCells: 0, percent: 0 };
  const nx = Math.ceil(roomWidth / cellSize),
    nz = Math.ceil(roomDepth / cellSize),
    ny = Math.ceil(wallHeight / cellSize);
  const totalCells = 2 * (nx + nz) * ny,
    seen = new Set<string>();
  for (const p of points) {
    if (
      ![p.x, p.y, p.z].every(finite) ||
      p.y <= 0 ||
      p.y >= wallHeight ||
      Math.abs(p.x) > roomWidth / 2 + 0.1 ||
      Math.abs(p.z) > roomDepth / 2 + 0.1
    )
      continue;
    const faces = [
      Math.abs(p.x - roomWidth / 2),
      Math.abs(p.x + roomWidth / 2),
      Math.abs(p.z - roomDepth / 2),
      Math.abs(p.z + roomDepth / 2)
    ];
    const nearest = Math.min(...faces);
    if (nearest > 0.1) continue;
    const face = faces.indexOf(nearest),
      count = face < 2 ? nz : nx,
      length = face < 2 ? roomDepth : roomWidth,
      position = face < 2 ? p.z : p.x;
    const column = Math.max(0, Math.min(count - 1, Math.floor((position + length / 2) / cellSize))),
      row = Math.min(ny - 1, Math.floor(p.y / cellSize));
    seen.add(`${face}:${column}:${row}`);
  }
  return { observedCells: seen.size, totalCells, percent: (seen.size / totalCells) * 100 };
}
export function suggestViewpoint(
  points: ScanPoint[],
  width: number,
  depth: number,
  obstacles: ScanObstacle[] = []
): { x: number; z: number; reason: string } {
  if (![width, depth].every((v) => finite(v) && v > 0))
    return { x: 0, z: 0, reason: "Unresolved room dimensions; no heuristic candidate" };
  const candidates: { x: number; z: number; gain: number }[] = [];
  const baseline = coverageStats(points, width, depth).observedCells;
  for (const x of [-width / 4, 0, width / 4])
    for (const z of [-depth / 4, 0, depth / 4]) {
      if (
        obstacles.some((o) => Math.abs(x - o.x) <= o.width / 2 && Math.abs(z - o.z) <= o.depth / 2)
      )
        continue;
      const hypothetical = Array.from({ length: 10 }, (_, i) =>
        scanRoom(
          width,
          depth,
          x,
          z,
          0,
          -30 + i * 10,
          144,
          Math.hypot(width, depth, 3),
          0,
          0.5,
          obstacles
        )
      ).flat();
      const gain =
        coverageStats([...points, ...hypothetical], width, depth).observedCells - baseline;
      candidates.push({ x, z, gain });
    }
  candidates.sort(
    (a, b) =>
      b.gain - a.gain || a.x * a.x + a.z * a.z - (b.x * b.x + b.z * b.z) || a.x - b.x || a.z - b.z
  );
  const best = candidates[0];
  return best
    ? {
        x: best.x,
        z: best.z,
        reason: `Simple heuristic: ${best.gain} additional declared wall cells predicted from a tilted sweep; not a validated optimum or navigation path`
      }
    : {
        x: 0,
        z: 0,
        reason: "No unoccupied heuristic grid candidate; revise scenario before moving"
      };
}
export function compareTrials(
  trials: Trial[],
  metric: string,
  protocol: string
): { count: number; median: number | null; unit: string | null; status: string } {
  const selected = trials.filter(
    (t) => t.metric === metric && t.protocol === protocol && finite(t.value)
  );
  const units = new Set(selected.map((t) => t.unit));
  if (units.size > 1)
    return {
      count: selected.length,
      median: null,
      unit: null,
      status: "Unresolved mixed units; trials not aggregated"
    };
  const values = selected.map((t) => t.value).sort((a, b) => a - b),
    n = values.length;
  return {
    count: n,
    median: n ? (values[Math.floor((n - 1) / 2)] + values[Math.floor(n / 2)]) / 2 : null,
    unit: selected[0]?.unit ?? null,
    status:
      n >= 3
        ? "Three or more repeated trials"
        : "Requires three repeated trials for this metric and protocol"
  };
}
