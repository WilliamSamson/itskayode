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
}
export interface ScanObstacle {
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
}
/** Synthetic room centred at origin. Sensor .5 m and room height 3 m are editable scenario assumptions, never hardware dimensions. */
export function scanRoom(
  roomWidth: number,
  roomDepth: number,
  x: number,
  z: number,
  headingDeg: number,
  tiltDeg: number,
  rays: number,
  range: number,
  noise: number,
  sensorHeight = 0.5,
  obstacles: ScanObstacle[] = [],
  wallHeight = 3
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
  // Rotate the full 2D scan plane about the local lateral axis, then apply rover yaw.
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2;
    const localX = Math.cos(a) * Math.cos(t),
      dy = Math.cos(a) * Math.sin(t),
      localZ = Math.sin(a);
    const dx = localX * Math.cos(h) - localZ * Math.sin(h),
      dz = localX * Math.sin(h) + localZ * Math.cos(h);
    const hits: number[] = [];
    if (Math.abs(dx) > 1e-10) hits.push(((dx > 0 ? roomWidth / 2 : -roomWidth / 2) - x) / dx);
    if (Math.abs(dz) > 1e-10) hits.push(((dz > 0 ? roomDepth / 2 : -roomDepth / 2) - z) / dz);
    if (Math.abs(dy) > 1e-10) hits.push(((dy > 0 ? wallHeight : 0) - sensorHeight) / dy);
    for (const o of obstacles) {
      let near = -Infinity,
        far = Infinity;
      const origin = [x, sensorHeight, z],
        direction = [dx, dy, dz],
        min = [o.x - o.width / 2, 0, o.z - o.depth / 2],
        max = [o.x + o.width / 2, o.height, o.z + o.depth / 2];
      for (let axis = 0; axis < 3; axis++) {
        if (Math.abs(direction[axis]) < 1e-10) {
          if (origin[axis] < min[axis] || origin[axis] > max[axis]) {
            far = -Infinity;
            break;
          }
        } else {
          const a = (min[axis] - origin[axis]) / direction[axis],
            b = (max[axis] - origin[axis]) / direction[axis];
          near = Math.max(near, Math.min(a, b));
          far = Math.min(far, Math.max(a, b));
        }
      }
      if (far >= near && far > 0) hits.push(near > 0 ? near : far);
    }
    const distance = Math.min(...hits.filter((v) => v > 0));
    if (!Number.isFinite(distance) || distance > range) continue;
    const hash = ((Math.imul(i + 1, 1664525) + 1013904223) >>> 0) / 4294967295;
    const measured = Math.max(0, Math.min(range, distance + (hash * 2 - 1) * noise));
    points.push({
      x: x + dx * measured,
      y: Math.max(0, Math.min(wallHeight, sensorHeight + dy * measured)),
      z: z + dz * measured
    });
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
