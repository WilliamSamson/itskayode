/** Workbench visual coordinates: millimetres, +X forward, +Y up, +Z left; rotations degrees XYZ.
 * Concept sizes and positions are composition geometry, never released manufacturing dimensions.
 */
export interface AssemblyPort {
  id: string;
  label: string;
  kind: "power" | "signal" | "drive";
  role: "in" | "out";
  voltage: number | null;
  position: [number, number, number];
}
export interface AssemblyPart {
  id: string;
  label: string;
  model: string;
  kind: string;
  group: "structure" | "drive" | "compute" | "sensing" | "power" | "safety";
  home: [number, number, number];
  explode: [number, number, number];
  size: [number, number, number];
  rotation: [number, number, number];
  evidence: "manufacturer drawing" | "proposal" | "concept";
  source: string;
  note: string;
  ports: AssemblyPort[];
}
export interface AssemblyConnection {
  id: string;
  fromPart: string;
  fromPort: string;
  toPart: string;
  toPort: string;
}
export interface AssemblyState {
  positions: Record<string, [number, number, number]>;
  connections: AssemblyConnection[];
}
const proposal = "Approved SONARIS proposal; no physical assembly verification";
const concept =
  "Concept visual geometry and layout only; not manufacturing dimensions or a mechanically validated assembly.";
const powerIn = (
  position: [number, number, number] = [0, 5, 0],
  voltage: number | null = null
): AssemblyPort => ({
  id: "power-in",
  label: "Supply input (logical)",
  kind: "power",
  role: "in",
  voltage,
  position
});
const signal = (
  id: string,
  role: "in" | "out",
  position: [number, number, number] = [10, 5, 0]
): AssemblyPort => ({
  id,
  label: `${id} (logical)`,
  kind: "signal",
  role,
  voltage: null,
  position
});
function part(
  id: string,
  label: string,
  model: string,
  kind: string,
  group: AssemblyPart["group"],
  home: AssemblyPart["home"],
  size: AssemblyPart["size"],
  explode: AssemblyPart["explode"],
  ports: AssemblyPort[] = [],
  evidence: AssemblyPart["evidence"] = "concept",
  source = proposal,
  note = concept
): AssemblyPart {
  return {
    id,
    label,
    model,
    kind,
    group,
    home,
    size,
    explode,
    ports,
    evidence,
    source,
    note,
    rotation: [0, 0, 0]
  };
}
const fixed: AssemblyPart[] = [
  part(
    "base",
    "Lower chassis plate",
    "Custom lower chassis",
    "plate",
    "structure",
    [0, 110, 0],
    [360, 8, 280],
    [0, -80, 0]
  ),
  part(
    "deck",
    "Electronics deck",
    "Custom mounting layer",
    "plate",
    "structure",
    [0, 210, 0],
    [310, 6, 240],
    [0, 130, 0]
  ),
  part(
    "rail-left",
    "Left chassis rail",
    "Custom chassis rail",
    "rail",
    "structure",
    [0, 135, 128],
    [340, 40, 8],
    [0, 0, 100]
  ),
  part(
    "rail-right",
    "Right chassis rail",
    "Custom chassis rail",
    "rail",
    "structure",
    [0, 135, -128],
    [340, 40, 8],
    [0, 0, -100]
  ),
  part(
    "battery",
    "Battery",
    "BLF-1212AS LiFePO4, 12 V-class 12 Ah",
    "battery",
    "power",
    [-55, 152, 0],
    [150, 70, 85],
    [-90, 0, 0],
    [
      {
        id: "supply",
        label: "Battery output (logical)",
        kind: "power",
        role: "out",
        voltage: null,
        position: [60, 35, 0]
      }
    ],
    "proposal",
    proposal,
    `Battery envelope is unverified placeholder geometry; only battery model and capacity class follow the proposal. ${concept}`
  ),
  part(
    "battery-restraint",
    "Battery restraint",
    "Custom strap and restraint",
    "restraint",
    "structure",
    [-55, 190, 0],
    [160, 7, 94],
    [-90, 60, 0]
  ),
  part(
    "pi5",
    "Mapping computer",
    "Raspberry Pi 5, 8 GB",
    "board",
    "compute",
    [-64, 223, 20],
    [85, 12, 56],
    [-60, 220, 0],
    [powerIn([-38, 3, -20]), signal("control", "out"), signal("lidar", "in")],
    "manufacturer drawing",
    "https://datasheets.raspberrypi.com/rpi5/raspberry-pi-5-mechanical-drawing.pdf",
    "Board footprint 85 × 56 mm from official reference drawing; all drawing dimensions approximate, not production data. 12 mm visual envelope height is a concept placeholder; connectors and full keep-outs unverified."
  ),
  part(
    "cooler",
    "Active cooler",
    "Pi 5 active cooler, exact model unresolved",
    "cooler",
    "compute",
    [-64, 242, 20],
    [60, 18, 46],
    [-60, 290, 0],
    [powerIn()],
    "concept",
    proposal,
    `Cooler geometry is illustrative, not a sourced accessory envelope. ${concept}`
  ),
  part(
    "microsd",
    "Storage",
    "128 GB microSD",
    "storage",
    "compute",
    [-110, 220, 20],
    [15, 1, 11],
    [-130, 190, 0],
    [],
    "proposal",
    proposal,
    `Storage capacity from proposal; card and slot placement are visual placeholders. ${concept}`
  ),
  part(
    "pico",
    "Motion controller",
    "Raspberry Pi Pico (original)",
    "board",
    "compute",
    [40, 222, -65],
    [51, 7, 21],
    [80, 210, -60],
    [
      powerIn(),
      signal("host", "in"),
      signal("pwm-a", "out"),
      signal("pwm-b", "out"),
      signal("encoder", "in"),
      signal("imu", "in")
    ],
    "manufacturer drawing",
    "https://datasheets.raspberrypi.com/pico/RPi-Pico-R3-PUBLIC-20200119.zip",
    "Original Pico 51 × 21 mm board outline reference. 7 mm visual height is an unverified concept envelope; pins/connectors and keep-outs not certified."
  ),
  part(
    "imu",
    "Orientation sensor",
    "BNO085 breakout, board model unresolved",
    "board",
    "sensing",
    [85, 223, 2],
    [28, 5, 22],
    [120, 220, 0],
    [powerIn(), signal("orientation", "out")],
    "proposal",
    proposal,
    `BNO085 sensor from proposal; breakout envelope and electrical variant unresolved. ${concept}`
  ),
  part(
    "converter-a",
    "Compute rail converter",
    "DC-DC converter, model unresolved",
    "converter",
    "power",
    [60, 150, -72],
    [65, 25, 40],
    [100, 70, -80],
    [
      powerIn([-30, 0, 0]),
      {
        id: "output",
        label: "Regulated rail (unresolved)",
        kind: "power",
        role: "out",
        voltage: null,
        position: [30, 0, 0]
      }
    ]
  ),
  part(
    "converter-b",
    "Sensor rail converter",
    "DC-DC converter, model unresolved",
    "converter",
    "power",
    [60, 150, 72],
    [65, 25, 40],
    [100, 70, 80],
    [
      powerIn([-30, 0, 0]),
      {
        id: "output",
        label: "Regulated rail (unresolved)",
        kind: "power",
        role: "out",
        voltage: null,
        position: [30, 0, 0]
      }
    ]
  ),
  part(
    "tilt-frame",
    "LiDAR tilt frame",
    "Custom frame and bearing mounts",
    "tilt-frame",
    "sensing",
    [80, 269, 0],
    [110, 72, 100],
    [0, 360, 0]
  ),
  part(
    "servo",
    "Tilt actuator",
    "ST3215, 12 V variant",
    "servo",
    "sensing",
    [80, 268, -70],
    [42, 40, 24],
    [0, 350, -120],
    [powerIn([0, 15, -10], 12), signal("tilt-command", "in")],
    "proposal",
    proposal,
    `Actuator model and 12 V variant from proposal; case size, horn and axis placement are visual placeholders. ${concept}`
  ),
  part(
    "lidar",
    "2D scanner",
    "RPLIDAR S2",
    "lidar",
    "sensing",
    [80, 305, 0],
    [77, 42, 77],
    [0, 450, 0],
    [powerIn([-28, -15, 0]), signal("scan-data", "out")],
    "proposal",
    "https://www.slamtec.com/en/support",
    `Tilting 2D scanner, not native 3D LiDAR. 77 mm diameter × 42 mm high is a visual placeholder pending vendor STL measurement/drawing verification; never a datasheet dimension. ${concept}`
  ),
  part(
    "estop",
    "Physical emergency stop",
    "Hardware stop, exact part unresolved",
    "estop",
    "safety",
    [130, 235, 80],
    [30, 38, 30],
    [110, 220, 100],
    [
      {
        id: "stop-out",
        label: "Hardware stop request (logical)",
        kind: "signal",
        role: "out",
        voltage: null,
        position: [0, -15, 0]
      }
    ]
  ),
  part(
    "disconnect",
    "Drive disconnect",
    "Contactor / disconnect, model unresolved",
    "disconnect",
    "safety",
    [125, 153, 0],
    [45, 45, 40],
    [140, 70, 0],
    [
      powerIn([-20, 0, 0]),
      {
        id: "drive-supply",
        label: "Isolated supply (logical)",
        kind: "power",
        role: "out",
        voltage: null,
        position: [20, 0, 0]
      },
      signal("stop-request", "in")
    ]
  ),
  part(
    "protection",
    "Branch protection",
    "Fuse and protection selection unresolved",
    "protection",
    "safety",
    [-140, 150, -65],
    [48, 25, 45],
    [-130, 40, -80],
    [
      powerIn(),
      {
        id: "protected-out",
        label: "Protected branch (logical)",
        kind: "power",
        role: "out",
        voltage: null,
        position: [20, 0, 0]
      }
    ]
  ),
  part(
    "monitor",
    "Power monitor",
    "Current/voltage monitor, model unresolved",
    "board",
    "power",
    [-140, 150, 65],
    [35, 12, 35],
    [-130, 50, 90],
    [powerIn(), signal("measurement", "out")]
  )
];
const drivers: AssemblyPart[] = [-1, 1].map((side, i) =>
  part(
    `driver-${i + 1}`,
    `Motor driver ${i + 1}`,
    "Cytron MDD10A",
    "driver",
    "drive",
    [-85, 222, side * 82],
    [84.5, 15, 62],
    [-140, 170, side * 110],
    [
      powerIn([-36, 5, 0]),
      signal("pwm", "in"),
      {
        id: "motor-a",
        label: "Channel A motor output",
        kind: "drive",
        role: "out",
        voltage: null,
        position: [36, 5, -18]
      },
      {
        id: "motor-b",
        label: "Channel B motor output",
        kind: "drive",
        role: "out",
        voltage: null,
        position: [36, 5, 18]
      }
    ],
    "manufacturer drawing",
    "https://sg.cytron.io/p-10amp-5v-30v-dc-motor-driver-2-channels",
    "Official footprint 84.5 × 62 mm. 15 mm height is an unverified visual envelope; connector pin mapping, screw keep-outs and thermal clearance unresolved."
  )
);
const drivetrain: AssemblyPart[] = [];
for (const [end, x] of [
  ["front", 130],
  ["rear", -130]
] as const)
  for (const [side, z, sign] of [
    ["left", 166, 1],
    ["right", -166, -1]
  ] as const) {
    const tag = `${end}-${side}`,
      away: [number, number, number] = [x > 0 ? 60 : -60, 0, sign * 150];
    drivetrain.push(
      part(
        `wheel-${tag}`,
        `${end} ${side} mecanum wheel`,
        "127 mm mecanum wheel, handed pair",
        "wheel",
        "drive",
        [x, 63.5, z],
        [127, 127, 45],
        away,
        [],
        "proposal",
        proposal,
        `127 mm diameter is proposed; 45 mm width and hub geometry are concept placeholders. Alternating roller handedness is illustrative pending exact wheel selection. ${concept}`
      )
    );
    drivetrain.push(
      part(
        `motor-${tag}`,
        `${end} ${side} encoder gearmotor`,
        "Pololu #4694, 70:1, nominal 24 V",
        "motor",
        "drive",
        [x, 63.5, sign * 102],
        [37, 37, 86],
        [away[0], -30, sign * 100],
        [
          {
            id: "drive-in",
            label: "Motor terminals (logical)",
            kind: "drive",
            role: "in",
            voltage: 24,
            position: [0, 0, -sign * 35]
          },
          signal("encoder", "out", [0, 10, -sign * 35])
        ],
        "manufacturer drawing",
        "https://www.pololu.com/product/4694/specs",
        `Manufacturer body diameter 37 mm × 70 mm long excluding 16 mm output shaft; 6 mm shaft diameter and 205 g listed. Size Z=86 mm includes shaft as a reference envelope, not detailed collision geometry. Motor shaft axis points ${side}; encoder/pinout and bracket clearance require drawings. 24 V is nominal motor rating, not a claim that proposed 12 V-class operation is incompatible.`
      )
    );
    drivetrain.push(
      part(
        `bracket-${tag}`,
        `${end} ${side} motor bracket`,
        "Motor mounting bracket, selection unresolved",
        "bracket",
        "drive",
        [x, 87, sign * 130],
        [48, 46, 5],
        [away[0], 30, sign * 90]
      )
    );
  }
export const assemblyParts: AssemblyPart[] = [...fixed, ...drivers, ...drivetrain];
export function createAssemblyState(): AssemblyState {
  return {
    positions: Object.fromEntries(
      assemblyParts.map((p) => [p.id, [...p.home] as [number, number, number]])
    ),
    connections: []
  };
}
const validPosition = (p: unknown): p is [number, number, number] =>
  Array.isArray(p) &&
  p.length === 3 &&
  p.every((n) => typeof n === "number" && Number.isFinite(n) && Math.abs(n) <= 3000);
export function snapPosition(
  partId: string,
  position: [number, number, number],
  threshold = 35
): [number, number, number] {
  const part = assemblyParts.find((p) => p.id === partId);
  if (!part || !validPosition(position) || !Number.isFinite(threshold) || threshold < 0)
    throw new RangeError(
      "Known part, bounded finite position and nonnegative snap radius required"
    );
  return Math.hypot(...position.map((n, i) => n - part.home[i])) <= threshold
    ? [...part.home]
    : (position.map((n) => Math.round(n / 5) * 5) as [number, number, number]);
}
/** Null means nominal logical screening only: physical pinout, ratings, protection, cable routing and safety function remain unverified. Unknown voltages remain unknown. */
export function connectionIssue(
  link: AssemblyConnection,
  parts: AssemblyPart[] = assemblyParts
): string | null {
  const a = parts.find((p) => p.id === link.fromPart),
    b = parts.find((p) => p.id === link.toPart);
  if (!a || !b) return "Unknown part endpoint";
  if (a.id === b.id) return "A connection requires two different parts";
  const from = a.ports.find((p) => p.id === link.fromPort),
    to = b.ports.find((p) => p.id === link.toPort);
  if (!from || !to) return "Unknown port endpoint";
  if (from.role === to.role) return "Port role mismatch: connect an output to an input";
  if (from.kind !== to.kind) return "Port kind mismatch";
  if (from.voltage !== null && to.voltage !== null && from.voltage !== to.voltage)
    return "Known nominal voltage mismatch";
  return null;
}
export function validateAssemblyState(value: unknown): value is AssemblyState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const { positions, connections } = value as Partial<AssemblyState>;
  if (
    !positions ||
    typeof positions !== "object" ||
    Array.isArray(positions) ||
    !Array.isArray(connections) ||
    connections.length > 200
  )
    return false;
  const ids = assemblyParts.map((p) => p.id),
    entries = Object.entries(positions);
  if (
    entries.length !== ids.length ||
    entries.some(([id, p]) => !ids.includes(id) || !validPosition(p))
  )
    return false;
  const seenIds = new Set<string>(),
    seenEndpoints = new Set<string>();
  for (const c of connections) {
    if (
      !c ||
      typeof c !== "object" ||
      !["id", "fromPart", "fromPort", "toPart", "toPort"].every(
        (k) => typeof (c as unknown as Record<string, unknown>)[k] === "string"
      ) ||
      !c.id.trim() ||
      c.id.length > 200 ||
      connectionIssue(c) !== null
    )
      return false;
    const endpoint = [`${c.fromPart}:${c.fromPort}`, `${c.toPart}:${c.toPort}`].sort().join("|");
    if (seenIds.has(c.id) || seenEndpoints.has(endpoint)) return false;
    seenIds.add(c.id);
    seenEndpoints.add(endpoint);
  }
  return true;
}
