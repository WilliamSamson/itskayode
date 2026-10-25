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
    [0, 88, 0],
    [360, 8, 280],
    [0, -80, 0]
  ),
  part(
    "deck",
    "Electronics deck",
    "Custom mounting layer",
    "plate",
    "structure",
    [0, 174, 0],
    [310, 6, 240],
    [0, 130, 0]
  ),
  part(
    "rail-left",
    "Left chassis rail",
    "Custom chassis rail",
    "rail",
    "structure",
    [0, 110, 128],
    [340, 40, 8],
    [0, 0, 100]
  ),
  part(
    "rail-right",
    "Right chassis rail",
    "Custom chassis rail",
    "rail",
    "structure",
    [0, 110, -128],
    [340, 40, 8],
    [0, 0, -100]
  ),
  part(
    "battery",
    "Battery",
    "BLF-1212AS LiFePO4, 12 V-class 12 Ah",
    "battery",
    "power",
    [-55, 127, 0],
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
    [-55, 164, 0],
    [160, 7, 94],
    [-90, 60, 0]
  ),
  part(
    "pi5",
    "Mapping computer",
    "Raspberry Pi 5, 8 GB",
    "board",
    "compute",
    [-64, 187, 20],
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
    [-64, 204, 20],
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
    [-110, 184, 20],
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
    [40, 185, -65],
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
    [85, 185, 2],
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
    [60, 105, -72],
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
    [60, 105, 72],
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
    [80, 231, 0],
    [110, 72, 100],
    [0, 360, 0]
  ),
  part(
    "servo",
    "Tilt actuator",
    "ST3215, 12 V variant",
    "servo",
    "sensing",
    [80, 230, -70],
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
    [80, 267, 0],
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
    [130, 198, 80],
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
    [125, 114, 0],
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
    [-140, 105, -65],
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
    [-140, 98, 65],
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
    [-85, 186, side * 82],
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
        [x, 68, sign * 126],
        [52, 46, 36],
        [away[0], 30, sign * 90]
      )
    );
  }
/** Removable concept bodywork. The shell's local origin sits on the deck top (y = 178 mm);
 * panels leave the side bays open and keep the tilting S2 LiDAR clear above the nose. */
const bodywork: AssemblyPart[] = [
  part(
    "shell",
    "Body shell",
    "Faceted panel shell and carry hoop, concept",
    "shell",
    "structure",
    [0, 178, 0],
    [362, 64, 250],
    [0, 240, 0],
    [],
    "concept",
    proposal,
    `Concept bodywork only: panel facets, hoop and fender geometry are styling envelopes, not released panel drawings or material selections. Panels must clear the LiDAR tilt arc and E-stop access. ${concept}`
  ),
  part(
    "bumper",
    "Front bumper",
    "Bumper bar on two arms, concept",
    "bumper",
    "structure",
    [212, 86, 0],
    [24, 34, 300],
    [120, 0, 0],
    [],
    "concept",
    proposal,
    `Concept protective bar; no contact sensing is claimed. Mounting arms and impact rating are unverified. ${concept}`
  )
];
export const assemblyParts: AssemblyPart[] = [...fixed, ...drivers, ...drivetrain, ...bodywork];

export interface PartProposalFacts {
  role: string;
  electrical: string;
  envelopeBasis: string;
  bedFit300: string;
  engineeringGate: string;
  mechanicalLinks: { partId: string; relation: string }[];
}

export const CANONICAL_HARNESS: AssemblyConnection[] = [
  { id: "h-bat-prot", fromPart: "battery", fromPort: "supply", toPart: "protection", toPort: "power-in" },
  { id: "h-prot-disc", fromPart: "protection", fromPort: "protected-out", toPart: "disconnect", toPort: "power-in" },
  { id: "h-disc-conva", fromPart: "disconnect", fromPort: "drive-supply", toPart: "converter-a", toPort: "power-in" },
  { id: "h-disc-convb", fromPart: "disconnect", fromPort: "drive-supply", toPart: "converter-b", toPort: "power-in" },
  { id: "h-disc-drv1", fromPart: "disconnect", fromPort: "drive-supply", toPart: "driver-1", toPort: "power-in" },
  { id: "h-disc-drv2", fromPart: "disconnect", fromPort: "drive-supply", toPart: "driver-2", toPort: "power-in" },
  { id: "h-disc-servo", fromPart: "disconnect", fromPort: "drive-supply", toPart: "servo", toPort: "power-in" },
  { id: "h-conva-pi5", fromPart: "converter-a", fromPort: "output", toPart: "pi5", toPort: "power-in" },
  { id: "h-conva-cool", fromPart: "converter-a", fromPort: "output", toPart: "cooler", toPort: "power-in" },
  { id: "h-conva-pico", fromPart: "converter-a", fromPort: "output", toPart: "pico", toPort: "power-in" },
  { id: "h-convb-lidar", fromPart: "converter-b", fromPort: "output", toPart: "lidar", toPort: "power-in" },
  { id: "h-convb-imu", fromPart: "converter-b", fromPort: "output", toPart: "imu", toPort: "power-in" },
  { id: "h-convb-mon", fromPart: "converter-b", fromPort: "output", toPart: "monitor", toPort: "power-in" },
  { id: "h-estop-disc", fromPart: "estop", fromPort: "stop-out", toPart: "disconnect", toPort: "stop-request" },
  { id: "h-lidar-pi5", fromPart: "lidar", fromPort: "scan-data", toPart: "pi5", toPort: "lidar" },
  { id: "h-pi5-pico", fromPart: "pi5", fromPort: "control", toPart: "pico", toPort: "host" },
  { id: "h-imu-pico", fromPart: "imu", fromPort: "orientation", toPart: "pico", toPort: "imu" },
  { id: "h-pico-drv1", fromPart: "pico", fromPort: "pwm-a", toPart: "driver-1", toPort: "pwm" },
  { id: "h-pico-drv2", fromPart: "pico", fromPort: "pwm-b", toPart: "driver-2", toPort: "pwm" },
  { id: "h-drv1-mfl", fromPart: "driver-1", fromPort: "motor-a", toPart: "motor-front-left", toPort: "drive-in" },
  { id: "h-drv1-mrl", fromPart: "driver-1", fromPort: "motor-b", toPart: "motor-rear-left", toPort: "drive-in" },
  { id: "h-drv2-mfr", fromPart: "driver-2", fromPort: "motor-a", toPart: "motor-front-right", toPort: "drive-in" },
  { id: "h-drv2-mrr", fromPart: "driver-2", fromPort: "motor-b", toPart: "motor-rear-right", toPort: "drive-in" },
  { id: "h-enc-pico", fromPart: "motor-front-left", fromPort: "encoder", toPart: "pico", toPort: "encoder" }
];

export function getPartProposalFacts(part: AssemblyPart): PartProposalFacts {
  const [w, h, d] = part.size;
  const fitsXY = Math.max(w, d) <= 300 && Math.min(w, d) <= 300;
  const bedFit300 =
    part.group === "structure" || part.kind === "bracket"
      ? fitsXY
        ? `Clears 300 × 300 mm XY bed (${w} × ${d} mm; Z=${h} mm unverified)`
        : `Exceeds 300 × 300 mm XY bed (${w} × ${d} mm) — requires split joint or CNC plate`
      : `Purchased module (${w} × ${d} × ${h} mm envelope)`;

  switch (part.id) {
    case "lidar":
      return {
        role: "Primary 2D laser rangefinder; swept across pitch planes by tilt gimbal for 3D reconstruction",
        electrical: "5 V DC regulated rail · UART scan stream to Raspberry Pi 5",
        envelopeBasis: "77 × 77 × 42 mm visual envelope (pending Slamtec S2 CAD verification)",
        bedFit300,
        engineeringGate: "Verify optical aperture keep-out and slip-free cable flex across tilt arc",
        mechanicalLinks: [
          { partId: "tilt-frame", relation: "Mounted on tilt gimbal yoke" },
          { partId: "servo", relation: "Pitched by ST3215 actuator" }
        ]
      };
    case "servo":
      return {
        role: "Steps and holds RPLIDAR S2 pitch angle across 2D scan planes",
        electrical: "12 V bus supply · Serial bus command link",
        envelopeBasis: "42 × 40 × 24 mm concept placeholder (ST3215 12 V variant)",
        bedFit300,
        engineeringGate: "Confirm horn coupling geometry, backlash, and serial bus interface board",
        mechanicalLinks: [
          { partId: "tilt-frame", relation: "Drives gimbal pitch axis" },
          { partId: "lidar", relation: "Tilts 2D scanner payload" }
        ]
      };
    case "tilt-frame":
      return {
        role: "Custom U-yoke and bearing mount supporting the tilting RPLIDAR S2 head",
        electrical: "Passive fabricated structure (no electrical terminals)",
        envelopeBasis: "110 × 72 × 100 mm concept layout envelope",
        bedFit300,
        engineeringGate: "Release bearing seat tolerances and shaft alignment CAD before print",
        mechanicalLinks: [
          { partId: "deck", relation: "Bolts to upper electronics deck" },
          { partId: "lidar", relation: "Carries RPLIDAR S2" },
          { partId: "servo", relation: "Coupled to ST3215 horn" }
        ]
      };
    case "pi5":
      return {
        role: "High-level mapping computer for 2D scan registration and 3D point cloud assembly",
        electrical: "5.1 V regulated compute rail · USB/UART host to Pico & RPLIDAR S2",
        envelopeBasis: "85 × 56 mm official Raspberry Pi 5 board outline; 12 mm height placeholder",
        bedFit300,
        engineeringGate: "Verify USB/Ethernet connector keep-outs and thermal headroom under load",
        mechanicalLinks: [
          { partId: "deck", relation: "Standoff-mounted on electronics deck" },
          { partId: "cooler", relation: "Cooled by top heatsink/blower" },
          { partId: "microsd", relation: "Boots from 128 GB microSD" }
        ]
      };
    case "cooler":
      return {
        role: "Active heatsink and blower preventing Raspberry Pi 5 thermal throttling",
        electrical: "5 V fan header from compute rail",
        envelopeBasis: "60 × 18 × 46 mm illustrative envelope (exact model unresolved)",
        bedFit300,
        engineeringGate: "Select exact cooler SKU and verify vertical clearance under tilt frame",
        mechanicalLinks: [{ partId: "pi5", relation: "Clips onto Pi 5 BCM2712 SoC" }]
      };
    case "microsd":
      return {
        role: "Non-volatile OS and local spatial scan log storage (128 GB per proposal)",
        electrical: "3.3 V SDIO slot on Raspberry Pi 5",
        envelopeBasis: "15 × 1 × 11 mm standard microSD form factor",
        bedFit300,
        engineeringGate: "Ensure chassis service opening allows card removal without deck disassembly",
        mechanicalLinks: [{ partId: "pi5", relation: "Inserted into Pi 5 underside slot" }]
      };
    case "pico":
      return {
        role: "Deterministic real-time motion controller for 4-wheel PWM and encoder polling",
        electrical: "5 V VBUS / 3.3 V logic · Dual PWM out to MDD10A drivers",
        envelopeBasis: "51 × 21 mm official Raspberry Pi Pico (RP2040) board outline",
        bedFit300,
        engineeringGate: "Verify quadrature encoder level-shifting and watchdog halt timeout",
        mechanicalLinks: [{ partId: "deck", relation: "Mounted on upper electronics deck" }]
      };
    case "imu":
      return {
        role: "9-DOF orientation sensor providing pitch/roll/yaw reference for scan alignment",
        electrical: "3.3 V / 5 V sensor rail · I2C/UART orientation stream to Pico",
        envelopeBasis: "28 × 5 × 22 mm concept breakout envelope (BNO085 SKU unresolved)",
        bedFit300,
        engineeringGate: "Select specific BNO085 breakout vendor and calibrate rigid offset to LiDAR",
        mechanicalLinks: [{ partId: "deck", relation: "Mounted near chassis centerline" }]
      };
    case "battery":
      return {
        role: "Primary onboard energy storage (Bioenno BLF-1212AS LiFePO4, 12 V-class 12 Ah)",
        electrical: "12.8 V nominal LiFePO4 chemistry · Feeds main fuse & disconnect bus",
        envelopeBasis: "150 × 70 × 85 mm concept placeholder; datasheet case dimensions pending",
        bedFit300,
        engineeringGate: "Verify usable discharge curve, charger interface, and CG placement on base",
        mechanicalLinks: [
          { partId: "base", relation: "Seated on lower chassis plate" },
          { partId: "battery-restraint", relation: "Secured by hold-down restraint" }
        ]
      };
    case "battery-restraint":
      return {
        role: "Mechanical hold-down strap and bracket preventing battery shift during motion",
        electrical: "Passive mechanical restraint",
        envelopeBasis: "160 × 7 × 94 mm concept geometry (design unresolved in proposal)",
        bedFit300,
        engineeringGate: "Size restraint after verifying physical BLF-1212AS battery casing dimensions",
        mechanicalLinks: [
          { partId: "battery", relation: "Clamps BLF-1212AS pack" },
          { partId: "base", relation: "Anchored to lower chassis plate" }
        ]
      };
    case "converter-a":
      return {
        role: "Step-down DC-DC regulator supplying 5 V compute and logic rail",
        electrical: "12 V bus input → Regulated compute rail output (model unresolved)",
        envelopeBasis: "65 × 25 × 40 mm placeholder envelope",
        bedFit300,
        engineeringGate: "Select buck converter rated for Pi 5 peak current (≥5 A @ 5.1 V)",
        mechanicalLinks: [{ partId: "base", relation: "Mounted on lower power bay" }]
      };
    case "converter-b":
      return {
        role: "Dedicated DC-DC regulator isolating RPLIDAR S2 and sensor rail from drive noise",
        electrical: "12 V bus input → Regulated sensor rail output (model unresolved)",
        envelopeBasis: "65 × 25 × 40 mm placeholder envelope",
        bedFit300,
        engineeringGate: "Specify output voltage/ripple rating and verify thermal dissipation",
        mechanicalLinks: [{ partId: "base", relation: "Mounted on lower power bay" }]
      };
    case "driver-1":
    case "driver-2":
      return {
        role: `Dual-channel 10 A H-bridge motor driver (${part.id === "driver-1" ? "Left" : "Right"} drivetrain pair)`,
        electrical: "5–30 V input (10 A continuous / 30 A peak per channel) · Logic PWM + DIR",
        envelopeBasis: "84.5 × 62 mm official Cytron MDD10A footprint; 15 mm height placeholder",
        bedFit300,
        engineeringGate: "Verify terminal wire gauge, heatsink airflow, and 12 V vs 24 V motor rail",
        mechanicalLinks: [{ partId: "deck", relation: "Mounted on electronics deck" }]
      };
    case "estop":
      return {
        role: "Externally accessible mushroom emergency stop for immediate drive cut-off",
        electrical: "Hardware interrupt / contactor trip loop (exact switch SKU unresolved)",
        envelopeBasis: "30 × 38 × 30 mm concept envelope",
        bedFit300,
        engineeringGate: "Verify hardwired series break with drive contactor independent of software",
        mechanicalLinks: [{ partId: "deck", relation: "Top-mounted for unobstructed hand access" }]
      };
    case "disconnect":
      return {
        role: "Main drive bus contactor / master isolation switch downstream of branch fuse",
        electrical: "12 V primary bus isolation controlled by E-Stop loop (model unresolved)",
        envelopeBasis: "45 × 45 × 40 mm concept envelope",
        bedFit300,
        engineeringGate: "Select contactor/switch rated for stall current and verify E-Stop wiring",
        mechanicalLinks: [{ partId: "base", relation: "Mounted on forward lower deck" }]
      };
    case "protection":
      return {
        role: "Primary overcurrent fuse block protecting battery and branch distribution",
        electrical: "In-line between battery positive terminal and disconnect (rating unresolved)",
        envelopeBasis: "48 × 25 × 45 mm concept placeholder",
        bedFit300,
        engineeringGate: "Size main and branch fuse ratings from worst-case motor + converter loads",
        mechanicalLinks: [{ partId: "base", relation: "Mounted adjacent to battery output" }]
      };
    case "monitor":
      return {
        role: "Onboard bus voltage and current sensor for battery state-of-charge telemetry",
        electrical: "12 V inline sense · Telemetry output to controller (model unresolved)",
        envelopeBasis: "35 × 12 × 35 mm concept placeholder",
        bedFit300,
        engineeringGate: "Select shunt monitor IC/breakout and define low-voltage cutoff threshold",
        mechanicalLinks: [{ partId: "base", relation: "Mounted on lower power bay" }]
      };
    case "shell":
      return {
        role: "Removable faceted body shell coupling the upper canopy, U-hood around the LiDAR well, armored side pods, nose/tail fairings, and carry hoop",
        electrical: "Passive bodywork (no electrical terminals); lifts off in exploded view or via Body toggle to expose internal bays",
        envelopeBasis: "362 × 156 × 264 mm coupled styling enclosure from lower base plate to canopy roof",
        bedFit300,
        engineeringGate: "Split into ≤300 mm bolted panels; verify LiDAR tilt arc (-30°..+60°), E-stop reach, and louver airflow",
        mechanicalLinks: [
          { partId: "deck", relation: "Canopy and U-hood bolt to upper electronics deck" },
          { partId: "base", relation: "Lower tub walls and nose/tail fairings couple to base plate" },
          { partId: "rail-left", relation: "Left armored side pod encloses side rail bay" },
          { partId: "rail-right", relation: "Right armored side pod encloses side rail bay" },
          { partId: "lidar", relation: "Recessed U-hood well keeps tilting scanner clear" },
          { partId: "estop", relation: "E-stop mushroom passes through left shoulder" }
        ]
      };
    case "bumper":
      return {
        role: "Front protective bar ahead of the mecanum wheels, absorbing low-speed knocks before the chassis",
        electrical: "Passive structure; no contact or ultrasonic sensing claimed",
        envelopeBasis: "24 × 36 × 300 mm concept bar with two mounting arms",
        bedFit300,
        engineeringGate: "Confirm arm stiffness, front wheel clearance during strafing, and fixings into base plate",
        mechanicalLinks: [{ partId: "base", relation: "Arms bolt to the front of the lower base plate" }]
      };
    case "base":
      return {
        role: "Main lower structural floor carrying drivetrain motors, battery, and power bay",
        electrical: "Passive structural plate",
        envelopeBasis: "360 × 8 × 280 mm concept layout plate",
        bedFit300,
        engineeringGate: "360 mm length exceeds 300 × 300 mm printer bed — split into keyed halves or CNC",
        mechanicalLinks: [
          { partId: "rail-left", relation: "Bolted to left chassis rail" },
          { partId: "rail-right", relation: "Bolted to right chassis rail" },
          { partId: "deck", relation: "Supports upper electronics deck via standoffs" }
        ]
      };
    case "deck":
      return {
        role: "Upper mounting platform for compute boards, motor drivers, IMU, and tilt gimbal",
        electrical: "Passive structural plate",
        envelopeBasis: "310 × 6 × 240 mm concept layout plate",
        bedFit300,
        engineeringGate: "Trim 310 mm length to ≤300 mm or split to fit verified 300 × 300 mm bed",
        mechanicalLinks: [
          { partId: "base", relation: "Supported above lower base plate" },
          { partId: "tilt-frame", relation: "Supports LiDAR tilt frame" },
          { partId: "pi5", relation: "Carries Raspberry Pi 5 & Pico" }
        ]
      };
    case "rail-left":
    case "rail-right":
      return {
        role: "Longitudinal side stiffening rail tying front and rear motor stations",
        electrical: "Passive structural member",
        envelopeBasis: "340 × 40 × 8 mm concept side rail",
        bedFit300,
        engineeringGate: "340 mm span exceeds 300 mm bed axis — use 2-piece spliced rail or extrusion",
        mechanicalLinks: [
          { partId: "base", relation: "Reinforces lower chassis plate edge" },
          { partId: "deck", relation: "Supports upper deck perimeter" }
        ]
      };
    default: {
      if (part.kind === "motor") {
        const corner = part.id.replace("motor-", "");
        return {
          role: `70:1 spur gearmotor with 64 CPR quadrature encoder (${corner.replace("-", " ")})`,
          electrical: "24 V nominal rating · Driven by Cytron MDD10A + 5 V encoder feedback",
          envelopeBasis: "Ø37 × 70 mm body + 16 mm D-shaft (86 mm total ref envelope; 205 g)",
          bedFit300,
          engineeringGate: "Proposal risk gate: 24 V nominal motor running on 12 V-class battery bus",
          mechanicalLinks: [
            { partId: `wheel-${corner}`, relation: "Drives 127 mm Mecanum wheel via 6 mm D-shaft" },
            { partId: `bracket-${corner}`, relation: "Clamped to base by motor bracket" }
          ]
        };
      }
      if (part.kind === "wheel") {
        const corner = part.id.replace("wheel-", "");
        return {
          role: `127 mm Mecanum wheel with 45° angled rollers for holonomic motion (${corner.replace("-", " ")})`,
          electrical: "Mechanical rolling element (driven by Pololu #4694 shaft)",
          envelopeBasis: "Ø127 mm proposed diameter × 45 mm placeholder width",
          bedFit300,
          engineeringGate: "Confirm left/right roller handedness pairing and 6 mm shaft hub coupling",
          mechanicalLinks: [
            { partId: `motor-${corner}`, relation: "Coupled to Pololu #4694 output shaft" }
          ]
        };
      }
      if (part.kind === "bracket") {
        const corner = part.id.replace("bracket-", "");
        return {
          role: `90° mounting bracket securing ${corner.replace("-", " ")} 37D gearmotor to base`,
          electrical: "Passive mounting hardware",
          envelopeBasis: "48 × 46 × 5 mm concept bracket envelope (model unresolved)",
          bedFit300,
          engineeringGate: "Verify M3 bolt pattern against Pololu 37D gearbox faceplate drawing",
          mechanicalLinks: [
            { partId: `motor-${corner}`, relation: "Mounts 37D gearmotor faceplate" },
            { partId: "base", relation: "Bolts to lower chassis plate" }
          ]
        };
      }
      return {
        role: part.label,
        electrical: "Unresolved in proposal",
        envelopeBasis: `${w} × ${h} × ${d} mm concept envelope`,
        bedFit300,
        engineeringGate: part.note,
        mechanicalLinks: []
      };
    }
  }
}
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
