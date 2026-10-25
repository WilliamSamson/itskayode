export type ChassisPartId =
  | "base-plate"
  | "electronics-deck"
  | "body-shell"
  | "sensor-mast"
  | "motor-brackets"
  | "full-frame";

export type FabricationMaterialId =
  | "petg-cf"
  | "plapro"
  | "alu-5052"
  | "abs-esun";

export type InfillPatternId =
  | "gyroid"
  | "cubic"
  | "grid"
  | "honeycomb"
  | "adaptive-cubic";

export type SupportStyleId =
  | "none"
  | "tree-organic"
  | "snug-grid"
  | "normal-accordion"
  | "soluble-interface";

export type AdhesionTypeId =
  | "skirt"
  | "brim-8mm"
  | "raft";

export type PrinterProfileId =
  | "voron-300"
  | "bambu-256"
  | "prusa-250"
  | "cnc-6040";

export type LayerHeightMm = 0.12 | 0.16 | 0.20 | 0.28;

export interface InfillPatternSpec {
  id: InfillPatternId;
  name: string;
  shortLabel: string;
  description: string;
  pathSpeedFactor: number; // < 1 means faster linear moves, > 1 means complex sinuous paths
  materialFactor: number;  // relative internal volume multiplier at same nominal %
  shearRating: string;
}

export interface SupportStyleSpec {
  id: SupportStyleId;
  name: string;
  shortLabel: string;
  overhangThresholdDeg: number;
  volumeMultiplier: number; // relative support filament consumption
  timeMultiplier: number;   // relative support print time
  description: string;
}

export interface AdhesionTypeSpec {
  id: AdhesionTypeId;
  name: string;
  shortLabel: string;
  extraMassGrams: number;
  description: string;
}

export interface PrinterProfileSpec {
  id: PrinterProfileId;
  name: string;
  shortLabel: string;
  kinematics: string;
  bedMm: [number, number, number]; // [X, Y, Z]
  nozzleMm: number;
  maxVolumetricFlowMm3s: number;
  outerWallSpeedMms: number;
  innerWallSpeedMms: number;
  infillSpeedMms: number;
  travelSpeedMms: number;
}

export interface ChassisComponent {
  id: ChassisPartId;
  name: string;
  shortTabLabel: string;
  subtitle: string;
  lengthMm: number; // X axis on bed
  widthMm: number;  // Y axis on bed
  heightMm: number; // Z axis
  solidVolumeCm3: number;
  surfaceAreaCm2: number;
  perimeterLengthPerLayerMm: number;
  horizontalProjectedAreaCm2: number;
  overhangSupportVolumeCm3: number;
  recommendedSupport: SupportStyleId;
  subPartCount: number;
  subPartNames: string[];
  mountingHoles: string;
  manufacturingMethod: string;
  description: string;
  fasteners: string[];
}

export interface FabricationMaterial {
  id: FabricationMaterialId;
  name: string;
  shortLabel: string;
  type: "fff-print" | "cnc-mill";
  densityGcm3: number;
  costPerKgNgn: number;
  nozzleTemp: string;
  bedTemp: string;
  chamberTemp: string;
  maxVolumetricSpeedMm3s: number;
  shrinkagePercent: number;
  tensileYieldMpa: number;
  flexuralModulusGpa: number;
  description: string;
}

export const INFILL_PATTERNS: InfillPatternSpec[] = [
  {
    id: "gyroid",
    name: "Gyroid (TPMS)",
    shortLabel: "Gyroid",
    description: "Triply periodic minimal surface with near-isotropic 3D shear strength and zero layer-crossing intersections. Ideal for vibration-damped rover decks.",
    pathSpeedFactor: 1.0,
    materialFactor: 1.0,
    shearRating: "Isotropic · 96% Multi-Axis"
  },
  {
    id: "cubic",
    name: "3D Cubic Truss",
    shortLabel: "Cubic",
    description: "Tilted 3D octahedron-tetrahedron spatial lattice. High compressive & torsional stiffness with fast straight-segment toolpaths.",
    pathSpeedFactor: 0.88,
    materialFactor: 0.98,
    shearRating: "Tri-Axial · 88% Stiffness"
  },
  {
    id: "grid",
    name: "Rectilinear Grid",
    shortLabel: "Grid",
    description: "High-speed orthogonal 45°/-45° planar cross-hatch. Fastest print times for flat plates under vertical bending loads.",
    pathSpeedFactor: 0.78,
    materialFactor: 0.94,
    shearRating: "Planar · 74% Z-Compression"
  },
  {
    id: "honeycomb",
    name: "3D Hex Honeycomb",
    shortLabel: "Honeycomb",
    description: "Corrugated hexagonal cell walls maximizing vertical crush resistance and energy absorption for bumpers and motor mounts.",
    pathSpeedFactor: 1.18,
    materialFactor: 1.08,
    shearRating: "Crush-Rated · 99% Axial"
  },
  {
    id: "adaptive-cubic",
    name: "Adaptive Cubic",
    shortLabel: "Adaptive",
    description: "Graduated octree subdivision: dense near top/bottom/perimeter shells and wider toward the core centroid to save ~18% mass.",
    pathSpeedFactor: 0.84,
    materialFactor: 0.82,
    shearRating: "Graded Core · 82% Mass-Opt"
  }
];

export const SUPPORT_STYLES: SupportStyleSpec[] = [
  {
    id: "tree-organic",
    name: "Organic Tree Branches",
    shortLabel: "Tree (Organic)",
    overhangThresholdDeg: 45,
    volumeMultiplier: 0.22,
    timeMultiplier: 1.05,
    description: "Tapered hollow trunks grow from the PEI plate and branch out to catch >45° overhangs (belly pan flanges, canopy roof arches, and bullbar wings) with minimal contact scarring."
  },
  {
    id: "snug-grid",
    name: "Snug Rectilinear Columns",
    shortLabel: "Snug Grid",
    overhangThresholdDeg: 42,
    volumeMultiplier: 0.31,
    timeMultiplier: 0.92,
    description: "Dense vertical lattice columns strictly bounded to the downward projection of flat overhangs and counter-bored screw pockets."
  },
  {
    id: "normal-accordion",
    name: "Normal Zig-Zag Accordion",
    shortLabel: "Accordion",
    overhangThresholdDeg: 40,
    volumeMultiplier: 0.27,
    timeMultiplier: 0.85,
    description: "Continuous single-wall zig-zag ribbons beneath long linear overhangs for rapid breakaway removal."
  },
  {
    id: "soluble-interface",
    name: "Dense Soluble Interface",
    shortLabel: "Soluble PVA/HIPS",
    overhangThresholdDeg: 35,
    volumeMultiplier: 0.36,
    timeMultiplier: 1.28,
    description: "Zero-Z-gap 100% dense breakaway/soluble interface roof layers supporting precision bearing bores and dovetail seams."
  },
  {
    id: "none",
    name: "No Overhang Supports",
    shortLabel: "None (Flat Only)",
    overhangThresholdDeg: 85,
    volumeMultiplier: 0,
    timeMultiplier: 0,
    description: "Suitable only for flat-on-bed plates (Middle Electronics Deck). Steep overhangs (>55°) will sag without support."
  }
];

export const ADHESION_TYPES: AdhesionTypeSpec[] = [
  {
    id: "brim-8mm",
    name: "8mm Anti-Warp Outer Brim",
    shortLabel: "8mm Brim",
    extraMassGrams: 3,
    description: "18-line single-layer perimeter flange anchoring part corners to the PEI plate."
  },
  {
    id: "skirt",
    name: "3-Loop Nozzle Prime Skirt",
    shortLabel: "3-Loop Skirt",
    extraMassGrams: 1,
    description: "Detached 3-loop outline around the nested print arrangement to stabilize nozzle pressure."
  },
  {
    id: "raft",
    name: "4-Layer Heavy Base Raft",
    shortLabel: "Base Raft",
    extraMassGrams: 14,
    description: "Thick sacrificial foundation mat compensating for uneven beds on large ABS+ prints."
  }
];

export const PRINTER_PROFILES: PrinterProfileSpec[] = [
  {
    id: "voron-300",
    name: "Voron 2.4 R2 / K1 Max (300³ CoreXY)",
    shortLabel: "300×300 CoreXY",
    kinematics: "Enclosed CoreXY · High-Flow 0.4mm Hardened Steel",
    bedMm: [300, 300, 350],
    nozzleMm: 0.4,
    maxVolumetricFlowMm3s: 18,
    outerWallSpeedMms: 120,
    innerWallSpeedMms: 180,
    infillSpeedMms: 220,
    travelSpeedMms: 450
  },
  {
    id: "bambu-256",
    name: "Bambu Lab X1C / P1S (256³ CoreXY)",
    shortLabel: "256×256 X1C",
    kinematics: "Carbon-Rod CoreXY · 0.4mm Hardened Nozzle",
    bedMm: [256, 256, 256],
    nozzleMm: 0.4,
    maxVolumetricFlowMm3s: 21,
    innerWallSpeedMms: 220,
    outerWallSpeedMms: 140,
    infillSpeedMms: 250,
    travelSpeedMms: 500
  },
  {
    id: "prusa-250",
    name: "Prusa MK4S / Ender-3 S1 (250×210 Bed)",
    shortLabel: "250×210 MK4S",
    kinematics: "Input-Shaper Bed-Slinger · 0.4mm ObXidian",
    bedMm: [250, 210, 220],
    nozzleMm: 0.4,
    maxVolumetricFlowMm3s: 15,
    outerWallSpeedMms: 95,
    innerWallSpeedMms: 140,
    infillSpeedMms: 170,
    travelSpeedMms: 350
  },
  {
    id: "cnc-6040",
    name: "6040 3-Axis Ball-Screw CNC Router",
    shortLabel: "600×400 CNC",
    kinematics: "2.2kW ER20 Spindle · 3.175mm Single-Flute Carbide",
    bedMm: [600, 400, 120],
    nozzleMm: 3.175,
    maxVolumetricFlowMm3s: 34,
    outerWallSpeedMms: 28,
    innerWallSpeedMms: 35,
    infillSpeedMms: 40,
    travelSpeedMms: 120
  }
];

export const LAYER_HEIGHT_OPTIONS: {
  value: LayerHeightMm;
  label: string;
  tag: string;
}[] = [
  { value: 0.12, label: "0.12 mm", tag: "Fine Detail" },
  { value: 0.16, label: "0.16 mm", tag: "Structural Opt" },
  { value: 0.20, label: "0.20 mm", tag: "Standard" },
  { value: 0.28, label: "0.28 mm", tag: "Rapid Draft" }
];

export const CHASSIS_COMPONENTS: ChassisComponent[] = [
  {
    id: "base-plate",
    name: "Lower Base Chassis & SkidTub",
    shortTabLabel: "Lower Base",
    subtitle: "8mm Structural Deck + Integrated Belly Skid Pan & Axle Saddles",
    lengthMm: 280,
    widthMm: 240,
    heightMm: 44,
    solidVolumeCm3: 165,
    surfaceAreaCm2: 1180,
    perimeterLengthPerLayerMm: 1420,
    horizontalProjectedAreaCm2: 520,
    overhangSupportVolumeCm3: 18,
    recommendedSupport: "tree-organic",
    subPartCount: 3,
    subPartNames: [
      "Octagonal 6mm Upper Base Plate (Supported Flange)",
      "Trapezoidal Lower Belly Pan & Skid Runners (On Bed y=0)",
      "4× Semi-Cylindrical 37D Axle Outrigger Saddles"
    ],
    mountingHoles: "16× M3 Motor Bulkhead Pattern, 4× LiFePO4 Standoffs, 6× M3 Skid Bosses",
    manufacturingMethod: "Additive Manufacturing (FFF with Outer Flange Supports) or 2.5D CNC",
    description:
      "Primary load-bearing lower tub transferring wheel reaction forces from the four Pololu 37D motor bulkheads into the 2020 extrusion rails. The central belly skid pan sits on y = 0 mm while support structures carry the cantilevered outer octagonal deck and motor outrigger pads at y = 38 mm.",
    fasteners: [
      "16× M3×10mm Socket Head Cap Screws (Motor C-Channel Bulkheads)",
      "8× M3×8mm Button Head Screws + T-Nuts (2020 Side Extrusion Rails)",
      "4× M3×5×4mm Heat-Set Brass Inserts (Battery Hold-Down Strap)"
    ]
  },
  {
    id: "electronics-deck",
    name: "Middle Electronics & Compute Deck",
    shortTabLabel: "Middle Deck",
    subtitle: "6mm Vibration-Isolated Control Bridge Seated Flat on PEI Bed",
    lengthMm: 260,
    widthMm: 200,
    heightMm: 8,
    solidVolumeCm3: 98,
    surfaceAreaCm2: 940,
    perimeterLengthPerLayerMm: 1280,
    horizontalProjectedAreaCm2: 440,
    overhangSupportVolumeCm3: 0,
    recommendedSupport: "none",
    subPartCount: 3,
    subPartNames: [
      "Chamfered Main Avionics Deck Plate (260 × 200 × 6 mm, Flat on y=0)",
      "Port & Starboard Perimeter Stiffening Trim Rails (Flat on y=0)",
      "6× M3×80mm Hex Standoff Pillars (Laid Horizontal Beside Deck on y=0)"
    ],
    mountingHoles: "Pi 5 M2.5 Pattern, Pico 2 + BNO085 Carrier, 2× MDD10A Driver Bosses",
    manufacturingMethod: "Flat-On-Bed FFF Print (Zero Supports, 100% First-Layer Contact)",
    description:
      "Elevated avionics bridge positioned 86 mm above the lower base when assembled. For fabrication, the 260 × 200 mm octagonal deck sits 100% flat on y = 0 mm of the PEI plate (zero overhangs), while its six hex standoff pillars nest horizontally alongside the plate edge.",
    fasteners: [
      "6× M3×80mm Anodized Hex Standoffs (Base-to-Deck Pillars)",
      "4× M2.5×6mm Black Nylon Standoffs (Raspberry Pi 5 Isolation)",
      "8× M3×6mm Button Head Screws (Dual MDD10A & Buck Converters)"
    ]
  },
  {
    id: "body-shell",
    name: "Faceted Polyhedral Body Shell & Bullbar",
    shortTabLabel: "Body Shell (3pc)",
    subtitle: "Non-Overlapping 3-Piece Nested Layout on 300×300mm Build Plate",
    lengthMm: 292,
    widthMm: 248,
    heightMm: 96,
    solidVolumeCm3: 214,
    surfaceAreaCm2: 1840,
    perimeterLengthPerLayerMm: 2150,
    horizontalProjectedAreaCm2: 580,
    overhangSupportVolumeCm3: 28,
    recommendedSupport: "tree-organic",
    subPartCount: 3,
    subPartNames: [
      "Zone 1 (Rear-Left): Faceted Tumblehome Canopy & Roof Ring",
      "Zone 2 (Front-Right): Multi-Plane V-Prow Nose & Headlamp Visor",
      "Zone 3 (Front-Left): 3-Segment Swept Chevron Front Bullbar"
    ],
    mountingHoles: "8× M3 Dovetail Split-Joiner Bolts, 4× M4 Bullbar Frame Mounts",
    manufacturingMethod: "3-Piece Nested FFF Print (Dovetail Split + Organic Tree Supports)",
    description:
      "Aerodynamic faceted exoskeleton split along a keyed mid-ship dovetail bulkhead so all three pieces (Rear Canopy, Forward V-Prow, and Swept Bullbar) nest into non-overlapping bounding boxes on a single 300 × 300 mm plate, with tree supports under the roof arch and visor.",
    fasteners: [
      "6× M3×12mm Socket Cap Screws (Mid-Body Dovetail Seam Joiners)",
      "4× M4×14mm Flanged Hex Bolts (Swept Chevron Bullbar to Frame)",
      "6× M3×8mm Countersunk Black Oxide Screws (Canopy Deck Latch)"
    ]
  },
  {
    id: "sensor-mast",
    name: "Upper Sensor Mast & Tilting Gimbal Yoke",
    shortTabLabel: "Sensor Mast",
    subtitle: "3-Piece Flat-Bed Nested Layout (Pedestal, U-Yoke & Servo Mount)",
    lengthMm: 140,
    widthMm: 110,
    heightMm: 180,
    solidVolumeCm3: 132,
    surfaceAreaCm2: 790,
    perimeterLengthPerLayerMm: 960,
    horizontalProjectedAreaCm2: 145,
    overhangSupportVolumeCm3: 14,
    recommendedSupport: "snug-grid",
    subPartCount: 3,
    subPartNames: [
      "Zone 1 (Center): Flanged Mast Pedestal Base & Twin Vertical Risers (y=0)",
      "Zone 2 (Front): U-Shaped Pitching Gimbal Yoke Seated Flat on Base (y=0)",
      "Zone 3 (Rear): ST3215 Servo Carrier & Bearing Pillow Block (y=0)"
    ],
    mountingHoles: "4× M3 Deck Flange Bolts, 4× M2.5 S2 LiDAR Mounts, Ø8mm Bearing Seat",
    manufacturingMethod: "Nested 3-Part Print on y=0 (Zero Floating Sub-Assemblies)",
    description:
      "Precision turret cradle elevating the RPLIDAR S2 optical plane to h = 232 mm. On the build plate, the pedestal base, U-shaped gimbal yoke, and ST3215 servo bracket are nested into three separate zones all resting directly on y = 0 mm so nothing prints in mid-air.",
    fasteners: [
      "4× M3×16mm Socket Cap Screws (Turret Base to Upper Roof Ring)",
      "4× M2.5×8mm Machine Screws (RPLIDAR S2 Bottom Flange)",
      "1× M4×20mm Precision Ground Shoulder Bolt + 688ZZ Bearing"
    ]
  },
  {
    id: "motor-brackets",
    name: "37D C-Channel Motor Mount Bulkheads (4×)",
    shortTabLabel: "Motor Mounts (4×)",
    subtitle: "2×2 Symmetric Grid of C-Channel Brackets Seated on y=0",
    lengthMm: 168,
    widthMm: 152,
    heightMm: 46,
    solidVolumeCm3: 84,
    surfaceAreaCm2: 620,
    perimeterLengthPerLayerMm: 1120,
    horizontalProjectedAreaCm2: 185,
    overhangSupportVolumeCm3: 8,
    recommendedSupport: "snug-grid",
    subPartCount: 4,
    subPartNames: [
      "Quadrant 1 (-X, +Z): Front-Left 37D C-Channel Bulkhead",
      "Quadrant 2 (-X, -Z): Front-Right 37D C-Channel Bulkhead",
      "Quadrant 3 (+X, +Z): Rear-Left 37D C-Channel Bulkhead",
      "Quadrant 4 (+X, -Z): Rear-Right 37D C-Channel Bulkhead"
    ],
    mountingHoles: "6× M3 Clocked Pololu 37D Faceplate Holes + 4× Base Deck Slots each",
    manufacturingMethod: "2×2 Nested Batch on y=0 (PETG-CF 60% Infill + Snug Bore Supports)",
    description:
      "Four structural C-channel motor bulkheads (52 × 46 × 36 mm each) arranged in a clean 2×2 grid on y = 0 mm with snug grid supports beneath the upper mounting flange and Ø20.5 mm bearing bore.",
    fasteners: [
      "24× M3×6mm Countersunk Alloy Screws (6 per 37D Gearmotor Faceplate)",
      "16× M3×12mm Socket Head Cap Screws + Nord-Lock Washers (Chassis Mount)"
    ]
  },
  {
    id: "full-frame",
    name: "Full Assembled Multi-Deck Rover Frame",
    shortTabLabel: "Full Frame (9pc)",
    subtitle: "Complete 9-Subassembly Structural Stack (340 × 280 × 220 mm)",
    lengthMm: 340,
    widthMm: 280,
    heightMm: 220,
    solidVolumeCm3: 479,
    surfaceAreaCm2: 3920,
    perimeterLengthPerLayerMm: 3850,
    horizontalProjectedAreaCm2: 880,
    overhangSupportVolumeCm3: 54,
    recommendedSupport: "tree-organic",
    subPartCount: 9,
    subPartNames: [
      "1. Lower Base Chassis & Belly Skid Pan",
      "2. Middle Avionics & Compute Deck",
      "3–4. Port & Starboard 2020 T-Slot Side Rails",
      "5–8. 4× 37D C-Channel Motor Bulkheads",
      "9. Faceted Polyhedral Body Shell, Bullbar & Gimbal Yoke"
    ],
    mountingHoles: "Complete 74-Fastener Structural Hierarchy",
    manufacturingMethod: "Modular Multi-Batch Build (Exceeds Single 300×300mm Bed)",
    description:
      "Complete spatial assembly of all structural decks, side extrusions, motor bulkheads, tilting LiDAR mast, swept chevron bumper, and faceted body shell. At 340 × 280 × 220 mm, the monolithic envelope overflows a 300 × 300 mm plate—proving why SONARIS separates into 5 print batches.",
    fasteners: [
      "36× M3 Structural Socket Cap Screws & Lock Washers",
      "14× Anodized Aluminium Hex Standoffs & 2020 T-Nuts",
      "24× M3×5×4mm Heat-Set Threaded Brass Inserts"
    ]
  }
];

export const FABRICATION_MATERIALS: FabricationMaterial[] = [
  {
    id: "petg-cf",
    name: "Carbon-Fiber Reinforced PETG (PETG-CF)",
    shortLabel: "PETG-CF",
    type: "fff-print",
    densityGcm3: 1.27,
    costPerKgNgn: 27000, // Matches BEME Appendix D Item 26
    nozzleTemp: "255°C",
    bedTemp: "80°C",
    chamberTemp: "45°C (Passive)",
    maxVolumetricSpeedMm3s: 14,
    shrinkagePercent: 0.25,
    tensileYieldMpa: 63,
    flexuralModulusGpa: 3.8,
    description:
      "15% chopped carbon-fiber reinforced PETG. Delivers 3.8 GPa flexural modulus, matte micro-textured surface finish, and near-zero warping across 280 mm flat decks."
  },
  {
    id: "plapro",
    name: "Engineering Grade PLA+ Pro",
    shortLabel: "PLA+ Pro",
    type: "fff-print",
    densityGcm3: 1.24,
    costPerKgNgn: 25000,
    nozzleTemp: "215°C",
    bedTemp: "60°C",
    chamberTemp: "Open / 28°C",
    maxVolumetricSpeedMm3s: 19,
    shrinkagePercent: 0.15,
    tensileYieldMpa: 55,
    flexuralModulusGpa: 2.9,
    description:
      "Impact-modified polylactic acid blend for high-speed prototyping, faceted body shell panels, and low-thermal-stress sensor brackets."
  },
  {
    id: "alu-5052",
    name: "5052-H32 Structural Aluminium Plate",
    shortLabel: "Alu 5052",
    type: "cnc-mill",
    densityGcm3: 2.68,
    costPerKgNgn: 45000,
    nozzleTemp: "N/A (18,000 RPM)",
    bedTemp: "Fixture Clamp",
    chamberTemp: "Mist Coolant",
    maxVolumetricSpeedMm3s: 30,
    shrinkagePercent: 0.0,
    tensileYieldMpa: 195,
    flexuralModulusGpa: 70.3,
    description:
      "CNC-milled 3mm/6mm marine-grade aluminium plate. Provides maximum torsional stiffness and passive thermal conduction for the dual Cytron MDD10A drivers."
  },
  {
    id: "abs-esun",
    name: "eSun ABS+ High Heat Structural",
    shortLabel: "ABS+",
    type: "fff-print",
    densityGcm3: 1.06,
    costPerKgNgn: 27000,
    nozzleTemp: "250°C",
    bedTemp: "100°C",
    chamberTemp: "55°C (Enclosed)",
    maxVolumetricSpeedMm3s: 16,
    shrinkagePercent: 0.6,
    tensileYieldMpa: 48,
    flexuralModulusGpa: 2.3,
    description:
      "Low-density (1.06 g/cm³), high heat-deflection (98°C HDT) engineering copolymer suited for enclosed CoreXY chambers and warm LiFePO4 battery bays."
  }
];

export interface SlicerFeatureBreakdown {
  feature: "Perimeter Walls" | "Top / Bottom Shells" | "Internal Infill" | "Supports & Brim";
  colorHex: string;
  massGrams: number;
  filamentMeters: number;
  timeHours: number;
  percentOfMass: number;
  percentOfTime: number;
}

export interface PartFabricationOptionOverrides {
  infillPattern?: InfillPatternId;
  supportStyle?: SupportStyleId;
  adhesionType?: AdhesionTypeId;
  layerHeightMm?: LayerHeightMm;
  printerProfileId?: PrinterProfileId;
  supportEnabled?: boolean;
  isRotated90?: boolean;
}

export interface PartFabricationMetrics {
  partId: ChassisPartId;
  materialId: FabricationMaterialId;
  infillPattern: InfillPatternId;
  supportStyle: SupportStyleId;
  adhesionType: AdhesionTypeId;
  printerProfileId: PrinterProfileId;
  layerHeightMm: LayerHeightMm;
  nozzleMm: number;
  lineWidthMm: number;
  layerCount: number;
  topBottomLayers: number;
  volumeCm3: number;
  massGrams: number;
  filamentMeters: number;
  spoolsRequired: number;
  wallMassGrams: number;
  topBottomMassGrams: number;
  infillMassGrams: number;
  supportMassGrams: number;
  costNgn: number;
  printTimeHours: number;
  printTimeFormatted: string;
  volumetricFlowMm3s: number;
  fitsBed300: boolean;
  fitsZ350: boolean;
  fitsSelectedPrinter: boolean;
  bedUtilizationPercent: number;
  zClearanceRemainingMm: number;
  featureBreakdown: SlicerFeatureBreakdown[];
}

export function formatPrintDuration(hours: number): string {
  const totalMinutes = Math.max(1, Math.round(hours * 60));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

export function calculatePartFabrication(
  partId: ChassisPartId,
  materialId: FabricationMaterialId,
  infillPercent = 25,
  wallLoops = 4,
  options: PartFabricationOptionOverrides = {}
): PartFabricationMetrics {
  const part = CHASSIS_COMPONENTS.find((c) => c.id === partId) || CHASSIS_COMPONENTS[0];
  const mat = FABRICATION_MATERIALS.find((m) => m.id === materialId) || FABRICATION_MATERIALS[0];

  const infillPatternId = options.infillPattern ?? "gyroid";
  const pattern =
    INFILL_PATTERNS.find((p) => p.id === infillPatternId) || INFILL_PATTERNS[0];

  const supportEnabled = options.supportEnabled ?? true;
  const supportStyleId: SupportStyleId =
    options.supportStyle ?? (supportEnabled ? part.recommendedSupport : "none");
  const supportSpec =
    SUPPORT_STYLES.find((s) => s.id === supportStyleId) || SUPPORT_STYLES[0];

  const adhesionTypeId: AdhesionTypeId = options.adhesionType ?? "brim-8mm";
  const adhesionSpec =
    ADHESION_TYPES.find((a) => a.id === adhesionTypeId) || ADHESION_TYPES[0];

  const printerProfileId = options.printerProfileId ?? "voron-300";
  const printer =
    PRINTER_PROFILES.find((p) => p.id === printerProfileId) || PRINTER_PROFILES[0];

  const layerHeightMm: LayerHeightMm = options.layerHeightMm ?? 0.20;
  const isRotated90 = options.isRotated90 ?? false;

  const effX = isRotated90 ? part.widthMm : part.lengthMm;
  const effY = isRotated90 ? part.lengthMm : part.widthMm;

  // Standard 300x300x350 benchmark + active printer profile check
  const fitsBed300 = effX <= 300 && effY <= 300;
  const fitsZ350 = part.heightMm <= 350;
  const fitsSelectedPrinter =
    effX <= printer.bedMm[0] &&
    effY <= printer.bedMm[1] &&
    part.heightMm <= printer.bedMm[2];

  // Bed footprint utilization against selected printer bed (default 300x300 = 90,000 mm²)
  const bedAreaMm2 = printer.bedMm[0] * printer.bedMm[1];
  const partAreaMm2 = part.lengthMm * part.widthMm;
  const bedUtilizationPercent = Number(((partAreaMm2 / bedAreaMm2) * 100).toFixed(1));
  const zClearanceRemainingMm = Math.max(0, printer.bedMm[2] - part.heightMm);

  const nozzleMm = printer.nozzleMm;
  const lineWidthMm = Number((nozzleMm * 1.05).toFixed(2)); // 0.42 mm for 0.4 mm nozzle
  const layerCount = Math.max(1, Math.ceil(part.heightMm / layerHeightMm));
  const topBottomLayers = Math.max(3, Math.round(1.0 / layerHeightMm)); // ~1.0 mm top & bottom skin

  // Physics-based FFF / CNC Volume Partitioning
  // 1. Outer & Inner Perimeter Walls Volume (cm³)
  const wallThicknessMm = wallLoops * lineWidthMm;
  const rawWallVolCm3 =
    (part.perimeterLengthPerLayerMm * layerCount * layerHeightMm * wallThicknessMm) / 1000;
  const wallVolCm3 = Math.min(part.solidVolumeCm3 * 0.52, rawWallVolCm3);

  // 2. Top & Bottom Solid Skin Shells Volume (cm³)
  const topBottomThicknessMm = Math.min(part.heightMm * 0.45, topBottomLayers * 2 * layerHeightMm);
  const rawTopBottomVolCm3 = (part.horizontalProjectedAreaCm2 * (topBottomThicknessMm / 10)) * 0.42;
  const topBottomVolCm3 = Math.min(
    Math.max(0, part.solidVolumeCm3 * 0.68 - wallVolCm3),
    rawTopBottomVolCm3
  );

  // 3. Internal Core Infill Volume (cm³) scaled by pattern material factor & infill %
  const coreCavityCm3 = Math.max(0, part.solidVolumeCm3 - wallVolCm3 - topBottomVolCm3);
  const effectiveInfillFraction =
    mat.type === "cnc-mill"
      ? 1.0
      : Math.min(1.0, (infillPercent / 100) * pattern.materialFactor);
  const infillVolCm3 = coreCavityCm3 * effectiveInfillFraction;

  // 4. Overhang Support & Bed Adhesion Brim Volume (cm³)
  const adhesionVolCm3 = adhesionSpec.extraMassGrams / mat.densityGcm3;
  const supportVolCm3 =
    mat.type === "cnc-mill"
      ? 0
      : supportSpec.id === "none"
        ? adhesionVolCm3
        : part.overhangSupportVolumeCm3 * supportSpec.volumeMultiplier + adhesionVolCm3;

  const effectiveVolumeCm3 = Number(
    (wallVolCm3 + topBottomVolCm3 + infillVolCm3 + supportVolCm3).toFixed(1)
  );

  // Component Masses (grams)
  const wallMassGrams = Math.round(wallVolCm3 * mat.densityGcm3);
  const topBottomMassGrams = Math.round(topBottomVolCm3 * mat.densityGcm3);
  const infillMassGrams = Math.round(infillVolCm3 * mat.densityGcm3);
  const supportMassGrams = Math.round(supportVolCm3 * mat.densityGcm3);
  const massGrams = Math.max(
    1,
    wallMassGrams + topBottomMassGrams + infillMassGrams + supportMassGrams
  );

  // 1.75 mm Filament Length (Meters)
  const FILAMENT_AREA_MM2 = Math.PI * 0.875 * 0.875;
  const totalVolumeMm3 = effectiveVolumeCm3 * 1000;
  const filamentMeters =
    mat.type === "cnc-mill"
      ? 0
      : Number((totalVolumeMm3 / FILAMENT_AREA_MM2 / 1000).toFixed(2));
  const spoolsRequired = Number((massGrams / 1000).toFixed(2));

  // Material cost in NGN: (mass / 1000) * costPerKgNgn
  const costNgn = Math.round((massGrams / 1000) * mat.costPerKgNgn);

  // Volumetric Flow & Print Time Physics
  const peakFlowMm3s = Math.min(mat.maxVolumetricSpeedMm3s, printer.maxVolumetricFlowMm3s);
  const layerSpeedFactor = 0.20 / layerHeightMm;

  const wallFlowMm3s = Math.min(
    peakFlowMm3s * 0.72,
    printer.outerWallSpeedMms * lineWidthMm * layerHeightMm * 0.85
  );
  const topBottomFlowMm3s = Math.min(
    peakFlowMm3s * 0.82,
    printer.innerWallSpeedMms * lineWidthMm * layerHeightMm * 0.85
  );
  const infillFlowMm3s = Math.min(
    peakFlowMm3s,
    (printer.infillSpeedMms * lineWidthMm * layerHeightMm) / pattern.pathSpeedFactor
  );

  const wallTimeHours =
    (wallVolCm3 * 1000) / Math.max(2.5, wallFlowMm3s) / 3600 * Math.pow(layerSpeedFactor, 0.35);
  const topBottomTimeHours =
    (topBottomVolCm3 * 1000) /
    Math.max(3.0, topBottomFlowMm3s) /
    3600 *
    Math.pow(layerSpeedFactor, 0.35);
  const infillTimeHours =
    (infillVolCm3 * 1000) /
    Math.max(3.5, infillFlowMm3s) /
    3600 *
    pattern.pathSpeedFactor *
    Math.pow(layerSpeedFactor, 0.35);
  const supportAndTravelHours =
    (((supportVolCm3 * 1000) / Math.max(3.0, wallFlowMm3s)) *
      Math.max(0.75, supportSpec.timeMultiplier) +
      layerCount * 1.35) /
    3600;

  const totalHoursRaw =
    wallTimeHours + topBottomTimeHours + infillTimeHours + supportAndTravelHours;
  const printTimeHours = Number(Math.max(0.2, totalHoursRaw).toFixed(1));
  const avgVolumetricFlowMm3s = Number(
    (totalVolumeMm3 / Math.max(60, totalHoursRaw * 3600)).toFixed(1)
  );

  const toMeters = (volCm3: number) =>
    mat.type === "cnc-mill" ? 0 : Number(((volCm3 * 1000) / FILAMENT_AREA_MM2 / 1000).toFixed(2));

  const featureBreakdown: SlicerFeatureBreakdown[] = [
    {
      feature: "Perimeter Walls",
      colorHex: "#C84B31",
      massGrams: wallMassGrams,
      filamentMeters: toMeters(wallVolCm3),
      timeHours: Number(wallTimeHours.toFixed(2)),
      percentOfMass: Math.round((wallMassGrams / massGrams) * 100),
      percentOfTime: Math.round((wallTimeHours / Math.max(0.05, totalHoursRaw)) * 100)
    },
    {
      feature: "Top / Bottom Shells",
      colorHex: "#D49B27",
      massGrams: topBottomMassGrams,
      filamentMeters: toMeters(topBottomVolCm3),
      timeHours: Number(topBottomTimeHours.toFixed(2)),
      percentOfMass: Math.round((topBottomMassGrams / massGrams) * 100),
      percentOfTime: Math.round((topBottomTimeHours / Math.max(0.05, totalHoursRaw)) * 100)
    },
    {
      feature: "Internal Infill",
      colorHex: "#1F6B42",
      massGrams: infillMassGrams,
      filamentMeters: toMeters(infillVolCm3),
      timeHours: Number(infillTimeHours.toFixed(2)),
      percentOfMass: Math.round((infillMassGrams / massGrams) * 100),
      percentOfTime: Math.round((infillTimeHours / Math.max(0.05, totalHoursRaw)) * 100)
    },
    {
      feature: "Supports & Brim",
      colorHex: "#3A6EA5",
      massGrams: supportMassGrams,
      filamentMeters: toMeters(supportVolCm3),
      timeHours: Number(supportAndTravelHours.toFixed(2)),
      percentOfMass: Math.max(
        0,
        100 -
          Math.round((wallMassGrams / massGrams) * 100) -
          Math.round((topBottomMassGrams / massGrams) * 100) -
          Math.round((infillMassGrams / massGrams) * 100)
      ),
      percentOfTime: Math.max(
        1,
        100 -
          Math.round((wallTimeHours / Math.max(0.05, totalHoursRaw)) * 100) -
          Math.round((topBottomTimeHours / Math.max(0.05, totalHoursRaw)) * 100) -
          Math.round((infillTimeHours / Math.max(0.05, totalHoursRaw)) * 100)
      )
    }
  ];

  return {
    partId,
    materialId,
    infillPattern: infillPatternId,
    supportStyle: supportStyleId,
    adhesionType: adhesionTypeId,
    printerProfileId,
    layerHeightMm,
    nozzleMm,
    lineWidthMm,
    layerCount,
    topBottomLayers,
    volumeCm3: effectiveVolumeCm3,
    massGrams,
    filamentMeters,
    spoolsRequired,
    wallMassGrams,
    topBottomMassGrams,
    infillMassGrams,
    supportMassGrams,
    costNgn,
    printTimeHours,
    printTimeFormatted: formatPrintDuration(printTimeHours),
    volumetricFlowMm3s: avgVolumetricFlowMm3s,
    fitsBed300,
    fitsZ350,
    fitsSelectedPrinter,
    bedUtilizationPercent,
    zClearanceRemainingMm,
    featureBreakdown
  };
}
