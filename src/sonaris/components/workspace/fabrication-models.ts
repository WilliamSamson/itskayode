export type ChassisPartId =
  | "base-plate"
  | "electronics-deck"
  | "sensor-mast"
  | "motor-brackets"
  | "full-frame";

export type FabricationMaterialId =
  | "petg-cf"
  | "plapro"
  | "alu-5052"
  | "abs-esun";

export interface ChassisComponent {
  id: ChassisPartId;
  name: string;
  subtitle: string;
  lengthMm: number; // X axis on bed
  widthMm: number;  // Y axis on bed
  heightMm: number; // Z axis
  solidVolumeCm3: number;
  mountingHoles: string;
  manufacturingMethod: string;
  description: string;
  fasteners: string[];
}

export interface FabricationMaterial {
  id: FabricationMaterialId;
  name: string;
  type: "fff-print" | "cnc-mill";
  densityGcm3: number;
  costPerKgNgn: number;
  nozzleTemp: string;
  bedTemp: string;
  tensileYieldMpa: number;
  description: string;
}

export const CHASSIS_COMPONENTS: ChassisComponent[] = [
  {
    id: "base-plate",
    name: "Lower Base Chassis Deck",
    subtitle: "3mm Structural Base with Motor & Battery Pockets",
    lengthMm: 280,
    widthMm: 240,
    heightMm: 8,
    solidVolumeCm3: 165,
    mountingHoles: "16x M3 Motor Pattern, 4x LiFePO4 Standoffs",
    manufacturingMethod: "Additive Manufacturing (FFF) or CNC Router",
    description: "Main structural floor plate transferring ground reaction loads from the four Pololu 37D motor brackets. Cutouts accommodate the Bioenno 12V 12Ah LiFePO4 battery pack and E-Stop disconnect routing.",
    fasteners: [
      "16x M3×8mm Button Head Hex Screws (Motor Brackets)",
      "4x M3 Heat-Set Threaded Brass Inserts (Battery Retainer)",
      "2x M4×12mm Socket Screws (E-Stop Bezel)"
    ]
  },
  {
    id: "electronics-deck",
    name: "Middle Electronics & Compute Deck",
    subtitle: "Standoff-Mounted Isolated Control Surface",
    lengthMm: 260,
    widthMm: 200,
    heightMm: 4,
    solidVolumeCm3: 98,
    mountingHoles: "Pi 5 M2.5 Pattern, Pico 2, Cytron MDD10A Mounts",
    manufacturingMethod: "Additive Manufacturing (FFF) or Laser Cut Acrylic",
    description: "Elevated vibration-isolated deck positioned 50 mm above the battery compartment. Provides dedicated mounting points and zip-tie channels for the Raspberry Pi 5, Pico 2, dual Cytron drivers, and step-down converters.",
    fasteners: [
      "8x M3×35mm Anodized Aluminium Hex Standoffs",
      "4x M2.5×6mm Nylon Screws (Raspberry Pi 5)",
      "4x M3×6mm Button Head Screws (MDD10A Dual Drivers)"
    ]
  },
  {
    id: "sensor-mast",
    name: "Upper Sensor Mast & Tilt Fork",
    subtitle: "ST3215 Servo Pivot & RPLIDAR S2 Turret Mount",
    lengthMm: 140,
    widthMm: 110,
    heightMm: 180,
    solidVolumeCm3: 132,
    mountingHoles: "4x M3 Mast Deck Bolts, 4x M2 Servo Mounts",
    manufacturingMethod: "High-Strength Additive Manufacturing (PETG-CF / ABS)",
    description: "Vertical cantilever fork raising the optical center of the RPLIDAR S2 to h = 0.50 m. Houses the ST3215 12V serial bus servo with reinforced bearing cups to resist inertial pitching loads during acceleration.",
    fasteners: [
      "4x M3×16mm Socket Cap Screws (Mast Footing)",
      "4x M2.5×8mm Machine Screws (RPLIDAR S2 Turret Flange)",
      "1x M3 Shoulder Bolt & Flanged Ball Bearing (Tilt Axis)"
    ]
  },
  {
    id: "motor-brackets",
    name: "37D Motor Mounting Bracket Set (4x)",
    subtitle: "Rigid Motor Mounts for Mecanum Drive Reversal",
    lengthMm: 65,
    widthMm: 48,
    heightMm: 40,
    solidVolumeCm3: 84,
    mountingHoles: "6x M3 Motor Faceplate Holes per Bracket",
    manufacturingMethod: "Machined Aluminium 6061 or Carbon-Reinforced PETG",
    description: "Four reinforced mounting blocks matching the Pololu #1995 bracket specification. Direct mechanical ground connection ensures zero deflection under rapid forward-reverse torque spikes of mecanum translation.",
    fasteners: [
      "24x M3×6mm Flat Head Countersunk Screws (Gearmotor Face)",
      "8x M3×12mm Button Head Screws with Nylon Locknuts"
    ]
  },
  {
    id: "full-frame",
    name: "Full Assembled Rover Chassis Frame",
    subtitle: "Complete Multi-Deck Assembled Structure",
    lengthMm: 340,
    widthMm: 280,
    heightMm: 220,
    solidVolumeCm3: 479,
    mountingHoles: "Complete Fastener Hierarchy",
    manufacturingMethod: "Modular Multi-Part Assembly (Exceeds Single 300mm Bed)",
    description: "Full spatial bounding envelope of the complete assembled rover chassis. At 340 × 280 × 220 mm, printing the frame as a single monolithic block exceeds a standard 300 × 300 mm build plate, demonstrating the necessity of the project's modular multi-deck design.",
    fasteners: [
      "32x M3 Structural Screws & Washers",
      "12x Anodized Aluminium Hex Standoffs",
      "16x Heat-Set Threaded Inserts"
    ]
  }
];

export const FABRICATION_MATERIALS: FabricationMaterial[] = [
  {
    id: "petg-cf",
    name: "Carbon-Fiber Reinforced PETG (PETG-CF)",
    type: "fff-print",
    densityGcm3: 1.27,
    costPerKgNgn: 27000, // Matches BEME Appendix D Item 26
    nozzleTemp: "250°C",
    bedTemp: "80°C",
    tensileYieldMpa: 63,
    description: "High stiffness and dimensional stability with 15% chopped carbon fibers. Minimizes warping and resists motor vibration."
  },
  {
    id: "plapro",
    name: "Engineering Grade PLA+ Pro",
    type: "fff-print",
    densityGcm3: 1.24,
    costPerKgNgn: 25000,
    nozzleTemp: "215°C",
    bedTemp: "60°C",
    tensileYieldMpa: 55,
    description: "High impact resistance polymer suitable for rapid iteration and non-structural electronics decks."
  },
  {
    id: "alu-5052",
    name: "5052-H32 Structural Aluminium Plate",
    type: "cnc-mill",
    densityGcm3: 2.68,
    costPerKgNgn: 45000,
    nozzleTemp: "N/A (CNC Router)",
    bedTemp: "N/A",
    tensileYieldMpa: 195,
    description: "CNC milled 3mm metal plate. Superior torsional rigidity and acts as a passive heatsink for high-current drivers."
  },
  {
    id: "abs-esun",
    name: "eSun ABS+ High Heat",
    type: "fff-print",
    densityGcm3: 1.06,
    costPerKgNgn: 27000,
    nozzleTemp: "245°C",
    bedTemp: "100°C",
    tensileYieldMpa: 48,
    description: "High glass-transition temperature (105°C) to withstand prolonged LiFePO4 battery discharge warmth."
  }
];

export interface PartFabricationMetrics {
  partId: ChassisPartId;
  materialId: FabricationMaterialId;
  volumeCm3: number;
  massGrams: number;
  costNgn: number;
  printTimeHours: number;
  fitsBed300: boolean;
  fitsZ350: boolean;
  bedUtilizationPercent: number;
  zClearanceRemainingMm: number;
}

export function calculatePartFabrication(
  partId: ChassisPartId,
  materialId: FabricationMaterialId,
  infillPercent = 25,
  wallLoops = 4
): PartFabricationMetrics {
  const part = CHASSIS_COMPONENTS.find((c) => c.id === partId) || CHASSIS_COMPONENTS[0];
  const mat = FABRICATION_MATERIALS.find((m) => m.id === materialId) || FABRICATION_MATERIALS[0];

  const fitsBed300 = part.lengthMm <= 300 && part.widthMm <= 300;
  const fitsZ350 = part.heightMm <= 350;

  // Bed footprint utilization (300 x 300 mm = 90,000 mm²)
  const partAreaMm2 = part.lengthMm * part.widthMm;
  const bedUtilizationPercent = Number(((partAreaMm2 / (300 * 300)) * 100).toFixed(1));
  const zClearanceRemainingMm = Math.max(0, 350 - part.heightMm);

  // Volume estimation: Wall perimeters are 100% solid, internal core scales with infill %
  const shellRatio = Math.min(0.65, (wallLoops * 0.4 * 2) / Math.max(2, part.heightMm));
  const effectiveVolumeFactor = shellRatio * 1.0 + (1 - shellRatio) * (infillPercent / 100);
  const effectiveVolumeCm3 = Number((part.solidVolumeCm3 * effectiveVolumeFactor).toFixed(1));

  // Mass in grams
  const massGrams = Math.round(effectiveVolumeCm3 * mat.densityGcm3);

  // Material cost in NGN: (mass / 1000) * costPerKgNgn
  const costNgn = Math.round((massGrams / 1000) * mat.costPerKgNgn);

  // Print time estimation (assuming modern CoreXY 150mm/s print speed, 0.2mm layer height)
  // Volumetric flow rate ~ 12 mm³/s = 0.012 cm³/s = 43.2 cm³/hour
  const printTimeHours = Number((effectiveVolumeCm3 / 28).toFixed(1));

  return {
    partId,
    materialId,
    volumeCm3: effectiveVolumeCm3,
    massGrams,
    costNgn,
    printTimeHours,
    fitsBed300,
    fitsZ350,
    bedUtilizationPercent,
    zClearanceRemainingMm
  };
}
