"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { assemblyParts, type AssemblyConnection } from "@/sonaris/lib/sonaris-assembly";
import { createAssemblyModel, createStudioEnvMap } from "./assembly-models";

export interface NodeLiveTelemetry {
  id: string;
  voltageV: number;
  currentA: number;
  powerW: number;
  tempC: number;
  isolated: boolean;
  overload: boolean;
}

export interface FaultPoint {
  nodeId: string;
  severity: "warning" | "critical";
  title: string;
  reason: string;
}

export interface WireConductorSpec {
  number: string;
  signal: string;
  colorHex: number;
}

export interface HarnessBundleSpec {
  connectionId: string;
  kind: "power" | "drive" | "signal" | "encoder";
  label: string;
  conductorCount: number;
  gauge: string;
  lengthM: number;
  connector: string;
  conductors: WireConductorSpec[];
}

export const HARNESS_BUNDLE_SPECS: Record<string, HarnessBundleSpec> = {
  // 1. Primary 12.8V Battery & Protection Bus
  p1: {
    connectionId: "p1",
    kind: "power",
    label: "BLF-1212AS Battery → 20A Fuse Block",
    conductorCount: 2,
    gauge: "12 AWG",
    lengthM: 0.22,
    connector: "Anderson Powerpole 30A → M5 Stud",
    conductors: [
      { number: "W1", signal: "+12.8V BATT POS (12 AWG)", colorHex: 0x991f1f },
      { number: "W2", signal: "BATT GND RETURN (12 AWG)", colorHex: 0x1e2026 }
    ]
  },
  p1b: {
    connectionId: "p1b",
    kind: "power",
    label: "20A Fuse Block → Main Contactor",
    conductorCount: 2,
    gauge: "12 AWG",
    lengthM: 0.16,
    connector: "M5 Ring Terminal Pair",
    conductors: [
      { number: "W1", signal: "+12.8V FUSED BUS (12 AWG)", colorHex: 0x991f1f },
      { number: "W2", signal: "COMMON GROUND (12 AWG)", colorHex: 0x1e2026 }
    ]
  },
  p1c: {
    connectionId: "p1c",
    kind: "signal",
    label: "20A Fuse Block → INA226 Bus Shunt Monitor",
    conductorCount: 3,
    gauge: "22 AWG",
    lengthM: 0.14,
    connector: "3-Pin Kelvin Sense Header",
    conductors: [
      { number: "W1", signal: "VBUS+ SENSE (12.8V)", colorHex: 0x991f1f },
      { number: "W2", signal: "VSHUNT- SENSE", colorHex: 0xd97724 },
      { number: "W3", signal: "SENSE GND", colorHex: 0x1e2026 }
    ]
  },
  p2: {
    connectionId: "p2",
    kind: "signal",
    label: "NC E-Stop Mushroom → Contactor Coil Loop",
    conductorCount: 2,
    gauge: "20 AWG",
    lengthM: 0.35,
    connector: "Spade Quick-Disconnect (NC Loop)",
    conductors: [
      { number: "W1", signal: "+12V COIL FEED (NC)", colorHex: 0xd97724 },
      { number: "W2", signal: "COIL HOLD RETURN", colorHex: 0x991f1f }
    ]
  },

  // 2. Switched 12.8V Distribution from Contactor
  p3: {
    connectionId: "p3",
    kind: "power",
    label: "Main Contactor → 5.1V Compute Buck (Conv-A)",
    conductorCount: 2,
    gauge: "16 AWG",
    lengthM: 0.2,
    connector: "Ferrule Screw Terminal (VIN+/VIN-)",
    conductors: [
      { number: "W1", signal: "+12.8V SWITCHED IN (16 AWG)", colorHex: 0x991f1f },
      { number: "W2", signal: "BUCK INPUT GND (16 AWG)", colorHex: 0x1e2026 }
    ]
  },
  p3b: {
    connectionId: "p3b",
    kind: "power",
    label: "Main Contactor → 5.0V Sensor Buck (Conv-B)",
    conductorCount: 2,
    gauge: "18 AWG",
    lengthM: 0.22,
    connector: "Ferrule Screw Terminal (VIN+/VIN-)",
    conductors: [
      { number: "W1", signal: "+12.8V SWITCHED IN (18 AWG)", colorHex: 0x991f1f },
      { number: "W2", signal: "SENSOR BUCK GND (18 AWG)", colorHex: 0x1e2026 }
    ]
  },
  p4: {
    connectionId: "p4",
    kind: "power",
    label: "Main Contactor → Cytron MDD10A #1 (Left)",
    conductorCount: 2,
    gauge: "14 AWG",
    lengthM: 0.28,
    connector: "Barrier Block (VMOT+ / GND)",
    conductors: [
      { number: "W1", signal: "+12.8V LEFT DRIVE (14 AWG)", colorHex: 0x991f1f },
      { number: "W2", signal: "LEFT BRIDGE PGND (14 AWG)", colorHex: 0x1e2026 }
    ]
  },
  p5: {
    connectionId: "p5",
    kind: "power",
    label: "Main Contactor → Cytron MDD10A #2 (Right)",
    conductorCount: 2,
    gauge: "14 AWG",
    lengthM: 0.28,
    connector: "Barrier Block (VMOT+ / GND)",
    conductors: [
      { number: "W1", signal: "+12.8V RIGHT DRIVE (14 AWG)", colorHex: 0x991f1f },
      { number: "W2", signal: "RIGHT BRIDGE PGND (14 AWG)", colorHex: 0x1e2026 }
    ]
  },
  p6: {
    connectionId: "p6",
    kind: "power",
    label: "Main Contactor → ST3215 12V Tilt Servo",
    conductorCount: 3,
    gauge: "20 AWG",
    lengthM: 0.42,
    connector: "5264-3P Serial Bus Servo Plug",
    conductors: [
      { number: "W1", signal: "+12.8V SERVO VDD", colorHex: 0x991f1f },
      { number: "W2", signal: "SERVO GROUND", colorHex: 0x1e2026 },
      { number: "W3", signal: "1Mbaud HALF-DUPLEX UART", colorHex: 0x2563eb }
    ]
  },

  // 3. Regulated 5.1V Compute Rail (from Converter-A)
  p7: {
    connectionId: "p7",
    kind: "power",
    label: "Compute Buck (Conv-A) → Raspberry Pi 5",
    conductorCount: 2,
    gauge: "18 AWG",
    lengthM: 0.18,
    connector: "USB-C PD / 5V1 High-Current Pair",
    conductors: [
      { number: "W1", signal: "+5.1V COMPUTE RAIL (5A)", colorHex: 0xa87914 },
      { number: "W2", signal: "LOGIC GROUND", colorHex: 0x1e2026 }
    ]
  },
  p7b: {
    connectionId: "p7b",
    kind: "power",
    label: "Compute Buck (Conv-A) → Pi 5 Active Cooler",
    conductorCount: 4,
    gauge: "26 AWG",
    lengthM: 0.12,
    connector: "JST-SH 4-Pin PWM Fan Header",
    conductors: [
      { number: "W1", signal: "+5.0V FAN VDD", colorHex: 0xa87914 },
      { number: "W2", signal: "FAN GND", colorHex: 0x1e2026 },
      { number: "W3", signal: "PWM SPEED CTRL", colorHex: 0x2563eb },
      { number: "W4", signal: "TACHOMETER RPM", colorHex: 0x1f6b42 }
    ]
  },
  p8: {
    connectionId: "p8",
    kind: "power",
    label: "Compute Buck (Conv-A) → Raspberry Pi Pico",
    conductorCount: 2,
    gauge: "22 AWG",
    lengthM: 0.2,
    connector: "Pin 39 VSYS / Pin 38 GND",
    conductors: [
      { number: "W1", signal: "+5.1V VSYS SUPPLY", colorHex: 0xa87914 },
      { number: "W2", signal: "DIGITAL GROUND", colorHex: 0x1e2026 }
    ]
  },

  // 4. Regulated 5.0V / 3.3V Sensor Rail (from Converter-B)
  p9: {
    connectionId: "p9",
    kind: "power",
    label: "Sensor Buck (Conv-B) → RPLIDAR S2 Power",
    conductorCount: 2,
    gauge: "22 AWG",
    lengthM: 0.36,
    connector: "ZH1.5-5P Power Pair (VCC/GND)",
    conductors: [
      { number: "W1", signal: "+5.0V SCANNER & MOTOR VCC", colorHex: 0xa87914 },
      { number: "W2", signal: "SCANNER GROUND", colorHex: 0x1e2026 }
    ]
  },
  p10: {
    connectionId: "p10",
    kind: "power",
    label: "Sensor Buck (Conv-B) → BNO085 9-DoF IMU Power",
    conductorCount: 2,
    gauge: "26 AWG",
    lengthM: 0.26,
    connector: "3.3V Filtered Sensor Feed",
    conductors: [
      { number: "W1", signal: "+3.3V IMU VIN", colorHex: 0xa87914 },
      { number: "W2", signal: "ANALOG/DIGITAL GND", colorHex: 0x1e2026 }
    ]
  },

  // 5. Data, Telemetry & PWM Control Harnesses
  s1: {
    connectionId: "s1",
    kind: "signal",
    label: "RPLIDAR S2 → Raspberry Pi 5 (1Mbaud UART)",
    conductorCount: 3,
    gauge: "24 AWG",
    lengthM: 0.42,
    connector: "ZH1.5 Data → Pi 5 UART0 Header",
    conductors: [
      { number: "W1", signal: "LIDAR TX → PI5 RX (3.3V)", colorHex: 0x2563eb },
      { number: "W2", signal: "LIDAR RX ← PI5 TX (3.3V)", colorHex: 0x1f6b42 },
      { number: "W3", signal: "SIGNAL REFERENCE GND", colorHex: 0x1e2026 }
    ]
  },
  s2: {
    connectionId: "s2",
    kind: "signal",
    label: "Raspberry Pi 5 → Pi Pico Host Command Bus",
    conductorCount: 4,
    gauge: "24 AWG",
    lengthM: 0.22,
    connector: "USB 2.0 / UART Control Link (4-Wire)",
    conductors: [
      { number: "W1", signal: "USB VBUS SENSE", colorHex: 0xa87914 },
      { number: "W2", signal: "USB D- / UART TX", colorHex: 0x2563eb },
      { number: "W3", signal: "USB D+ / UART RX", colorHex: 0x1f6b42 },
      { number: "W4", signal: "SIGNAL GND", colorHex: 0x1e2026 }
    ]
  },
  s3: {
    connectionId: "s3",
    kind: "signal",
    label: "BNO085 IMU → Pi Pico (400kHz STEMMA QT I2C)",
    conductorCount: 4,
    gauge: "26 AWG",
    lengthM: 0.24,
    connector: "STEMMA QT / JST-SH 4-Pin",
    conductors: [
      { number: "W1", signal: "+3.3V I2C PULLUP REF", colorHex: 0xa87914 },
      { number: "W2", signal: "I2C SHIELD GND", colorHex: 0x1e2026 },
      { number: "W3", signal: "I2C0 SDA (GP4)", colorHex: 0x2563eb },
      { number: "W4", signal: "I2C0 SCL (GP5)", colorHex: 0x1f6b42 }
    ]
  },
  s4: {
    connectionId: "s4",
    kind: "signal",
    label: "Pi Pico → Cytron MDD10A #1 (Left PWM + DIR)",
    conductorCount: 5,
    gauge: "24 AWG",
    lengthM: 0.28,
    connector: "5-Pin Logic Ribbon (GP2..GP5 + GND)",
    conductors: [
      { number: "W1", signal: "PWM1 (GP2 → FL SPEED)", colorHex: 0x2563eb },
      { number: "W2", signal: "DIR1 (GP3 → FL DIR)", colorHex: 0x1f6b42 },
      { number: "W3", signal: "PWM2 (GP4 → RL SPEED)", colorHex: 0xd97724 },
      { number: "W4", signal: "DIR2 (GP5 → RL DIR)", colorHex: 0x7c3aed },
      { number: "W5", signal: "LOGIC SIGNAL GND", colorHex: 0x1e2026 }
    ]
  },
  s5: {
    connectionId: "s5",
    kind: "signal",
    label: "Pi Pico → Cytron MDD10A #2 (Right PWM + DIR)",
    conductorCount: 5,
    gauge: "24 AWG",
    lengthM: 0.28,
    connector: "5-Pin Logic Ribbon (GP6..GP9 + GND)",
    conductors: [
      { number: "W1", signal: "PWM1 (GP6 → FR SPEED)", colorHex: 0x2563eb },
      { number: "W2", signal: "DIR1 (GP7 → FR DIR)", colorHex: 0x1f6b42 },
      { number: "W3", signal: "PWM2 (GP8 → RR SPEED)", colorHex: 0xd97724 },
      { number: "W4", signal: "DIR2 (GP9 → RR DIR)", colorHex: 0x7c3aed },
      { number: "W5", signal: "LOGIC SIGNAL GND", colorHex: 0x1e2026 }
    ]
  },

  // 6. 2-Wire High-Current Motor Output Pairs (MDD10A → Pololu #4694 M+/M-)
  p11: {
    connectionId: "p11",
    kind: "drive",
    label: "MDD10A #1 (OUTA) → Front-Left Motor M1+/M1-",
    conductorCount: 2,
    gauge: "16 AWG",
    lengthM: 0.32,
    connector: "Screw Terminal → Motor Spade Pair",
    conductors: [
      { number: "W1", signal: "MOTOR M1+ ARMATURE (16 AWG)", colorHex: 0x991f1f },
      { number: "W2", signal: "MOTOR M1- ARMATURE (16 AWG)", colorHex: 0x1e2026 }
    ]
  },
  p12: {
    connectionId: "p12",
    kind: "drive",
    label: "MDD10A #1 (OUTB) → Rear-Left Motor M2+/M2-",
    conductorCount: 2,
    gauge: "16 AWG",
    lengthM: 0.34,
    connector: "Screw Terminal → Motor Spade Pair",
    conductors: [
      { number: "W1", signal: "MOTOR M2+ ARMATURE (16 AWG)", colorHex: 0x991f1f },
      { number: "W2", signal: "MOTOR M2- ARMATURE (16 AWG)", colorHex: 0x1e2026 }
    ]
  },
  p13: {
    connectionId: "p13",
    kind: "drive",
    label: "MDD10A #2 (OUTA) → Front-Right Motor M3+/M3-",
    conductorCount: 2,
    gauge: "16 AWG",
    lengthM: 0.32,
    connector: "Screw Terminal → Motor Spade Pair",
    conductors: [
      { number: "W1", signal: "MOTOR M3+ ARMATURE (16 AWG)", colorHex: 0x991f1f },
      { number: "W2", signal: "MOTOR M3- ARMATURE (16 AWG)", colorHex: 0x1e2026 }
    ]
  },
  p14: {
    connectionId: "p14",
    kind: "drive",
    label: "MDD10A #2 (OUTB) → Rear-Right Motor M4+/M4-",
    conductorCount: 2,
    gauge: "16 AWG",
    lengthM: 0.34,
    connector: "Screw Terminal → Motor Spade Pair",
    conductors: [
      { number: "W1", signal: "MOTOR M4+ ARMATURE (16 AWG)", colorHex: 0x991f1f },
      { number: "W2", signal: "MOTOR M4- ARMATURE (16 AWG)", colorHex: 0x1e2026 }
    ]
  },

  // 7. 4-Wire Quadrature Encoder Feedback Harnesses (Pololu #4694 → Pi Pico PIO)
  e1: {
    connectionId: "e1",
    kind: "encoder",
    label: "Front-Left Encoder → Pi Pico PIO (GP10/GP11)",
    conductorCount: 4,
    gauge: "24 AWG",
    lengthM: 0.36,
    connector: "4-Pin Hall Quadrature Encoder Harness",
    conductors: [
      { number: "W1", signal: "ENC VCC (+3.3V)", colorHex: 0xa87914 },
      { number: "W2", signal: "ENC GND", colorHex: 0x1e2026 },
      { number: "W3", signal: "FL ENC CH-A (GP10)", colorHex: 0x2563eb },
      { number: "W4", signal: "FL ENC CH-B (GP11)", colorHex: 0x1f6b42 }
    ]
  },
  e2: {
    connectionId: "e2",
    kind: "encoder",
    label: "Rear-Left Encoder → Pi Pico PIO (GP12/GP13)",
    conductorCount: 4,
    gauge: "24 AWG",
    lengthM: 0.38,
    connector: "4-Pin Hall Quadrature Encoder Harness",
    conductors: [
      { number: "W1", signal: "ENC VCC (+3.3V)", colorHex: 0xa87914 },
      { number: "W2", signal: "ENC GND", colorHex: 0x1e2026 },
      { number: "W3", signal: "RL ENC CH-A (GP12)", colorHex: 0x2563eb },
      { number: "W4", signal: "RL ENC CH-B (GP13)", colorHex: 0x1f6b42 }
    ]
  },
  e3: {
    connectionId: "e3",
    kind: "encoder",
    label: "Front-Right Encoder → Pi Pico PIO (GP14/GP15)",
    conductorCount: 4,
    gauge: "24 AWG",
    lengthM: 0.36,
    connector: "4-Pin Hall Quadrature Encoder Harness",
    conductors: [
      { number: "W1", signal: "ENC VCC (+3.3V)", colorHex: 0xa87914 },
      { number: "W2", signal: "ENC GND", colorHex: 0x1e2026 },
      { number: "W3", signal: "FR ENC CH-A (GP14)", colorHex: 0x2563eb },
      { number: "W4", signal: "FR ENC CH-B (GP15)", colorHex: 0x1f6b42 }
    ]
  },
  e4: {
    connectionId: "e4",
    kind: "encoder",
    label: "Rear-Right Encoder → Pi Pico PIO (GP16/GP17)",
    conductorCount: 4,
    gauge: "24 AWG",
    lengthM: 0.38,
    connector: "4-Pin Hall Quadrature Encoder Harness",
    conductors: [
      { number: "W1", signal: "ENC VCC (+3.3V)", colorHex: 0xa87914 },
      { number: "W2", signal: "ENC GND", colorHex: 0x1e2026 },
      { number: "W3", signal: "RR ENC CH-A (GP16)", colorHex: 0x2563eb },
      { number: "W4", signal: "RR ENC CH-B (GP17)", colorHex: 0x1f6b42 }
    ]
  }
};

// Distinct physical terminal pin positions per part:port so wires never pile onto a single point
const PORT_PIN_OFFSETS: Record<string, [number, number, number]> = {
  "battery:supply": [62, 22, 0],
  "protection:power-in": [-22, 6, 0],
  "protection:protected-out": [22, 6, 0],
  "monitor:power-in": [-14, 5, 0],
  "monitor:measurement": [14, 5, 0],
  "estop:stop-out": [0, -12, 12],
  "disconnect:power-in": [-20, 6, 0],
  "disconnect:drive-supply": [20, 6, 0],
  "disconnect:stop-request": [0, 14, -16],
  "converter-a:power-in": [-30, 5, 0],
  "converter-a:output": [30, 5, 0],
  "converter-b:power-in": [-30, 5, 0],
  "converter-b:output": [30, 5, 0],
  "pi5:power-in": [-38, 5, -18],
  "pi5:lidar": [38, 5, -14],
  "pi5:control": [38, 5, 14],
  "cooler:power-in": [-22, 6, 0],
  "pico:power-in": [-24, 4, -8],
  "pico:host": [-24, 4, 8],
  "pico:imu": [0, 4, -10],
  "pico:pwm-a": [24, 4, -8],
  "pico:pwm-b": [24, 4, 8],
  "pico:encoder": [0, 4, 10],
  "imu:power-in": [-12, 3, -6],
  "imu:orientation": [-12, 3, 6],
  "lidar:power-in": [-28, -14, -10],
  "lidar:scan-data": [-28, -14, 10],
  "servo:power-in": [-18, 8, 0],
  "servo:tilt-command": [18, 8, 0],
  "driver-1:power-in": [-38, 6, -12],
  "driver-1:pwm": [-38, 6, 12],
  "driver-1:motor-a": [38, 6, -18],
  "driver-1:motor-b": [38, 6, 18],
  "driver-2:power-in": [-38, 6, -12],
  "driver-2:pwm": [-38, 6, 12],
  "driver-2:motor-a": [38, 6, -18],
  "driver-2:motor-b": [38, 6, 18],
  "motor-front-left:drive-in": [0, 6, -34],
  "motor-front-left:encoder": [0, 16, -26],
  "motor-rear-left:drive-in": [0, 6, -34],
  "motor-rear-left:encoder": [0, 16, -26],
  "motor-front-right:drive-in": [0, 6, 34],
  "motor-front-right:encoder": [0, 16, 26],
  "motor-rear-right:drive-in": [0, 6, 34],
  "motor-rear-right:encoder": [0, 16, 26]
};

export interface PowerStageProps {
  layoutMode: "benchtop" | "chassis";
  positions: Record<string, [number, number, number]>;
  connections: AssemblyConnection[];
  disconnectedIds?: string[];
  selectedId: string;
  selectedConnectionId?: string | null;
  onSelect: (id: string) => void;
  onSelectConnection?: (connId: string | null) => void;
  onToggleConnection?: (connId: string) => void;
  nodeTelemetry: Record<string, NodeLiveTelemetry>;
  motorEnergized?: Record<string, boolean>;
  faultPoints: FaultPoint[];
  heatmapMode: boolean;
  view: "isometric" | "top" | "front";
  activeFlow: boolean;
  sweepActive: boolean;
  selectedConnector: string;
  selectedWireGauge: string;
  selectedWireLength?: number;
  selectedDropMv: number;
}

const POWER_STAGE_PART_IDS = new Set([
  "battery",
  "protection",
  "disconnect",
  "estop",
  "converter-a",
  "converter-b",
  "monitor",
  "pi5",
  "cooler",
  "pico",
  "driver-1",
  "driver-2",
  "lidar",
  "servo",
  "imu",
  "motor-front-left",
  "motor-front-right",
  "motor-rear-left",
  "motor-rear-right"
]);

function tempToColor(tempC: number): THREE.Color {
  const t = Math.max(0, Math.min(1, (tempC - 25) / 60));
  const cold = new THREE.Color(0x2b303c);
  const warm = new THREE.Color(0xd49520);
  const hot = new THREE.Color(0xe34242);
  if (t < 0.5) {
    return cold.lerp(warm, t * 2);
  }
  return warm.lerp(hot, (t - 0.5) * 2);
}

export default function PowerStage({
  layoutMode,
  positions,
  connections,
  disconnectedIds = [],
  selectedId,
  selectedConnectionId = null,
  onSelect,
  onSelectConnection = () => {},
  onToggleConnection = () => {},
  nodeTelemetry,
  motorEnergized = {},
  faultPoints,
  heatmapMode,
  view,
  activeFlow,
  sweepActive,
  selectedConnector,
  selectedWireGauge,
  selectedWireLength = 0.25,
  selectedDropMv
}: PowerStageProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const onSelectConnRef = useRef(onSelectConnection);
  onSelectConnRef.current = onSelectConnection;

  const [selectedScreenPos, setSelectedScreenPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedConnScreenPos, setSelectedConnScreenPos] = useState<{ x: number; y: number } | null>(null);
  const [faultScreenMarkers, setFaultScreenMarkers] = useState<
    Array<FaultPoint & { x: number; y: number }>
  >([]);

  const runtimeRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    nodes: Map<string, THREE.Group>;
    basePads: Map<string, THREE.Mesh>;
    wireGroup: THREE.Group;
    wireMidpoints: Map<string, THREE.Vector3>;
    wirePickMeshes: THREE.Object3D[];
    partPickMeshes: THREE.Object3D[];
    pulseMeshes: Array<{
      mesh: THREE.Mesh;
      curve: THREE.CatmullRomCurve3;
      speed: number;
      offset: number;
    }>;
    faultGroup: THREE.Group;
    chassisGhostGroup: THREE.Group;
    motorModels: Map<string, THREE.Group>;
    scannerNode: THREE.Object3D | null;
    wake: () => void;
    syncOverlays: () => void;
  } | null>(null);

  const telemetryRef = useRef(nodeTelemetry);
  telemetryRef.current = nodeTelemetry;
  const faultPointsRef = useRef(faultPoints);
  faultPointsRef.current = faultPoints;
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;
  const selectedConnIdRef = useRef(selectedConnectionId);
  selectedConnIdRef.current = selectedConnectionId;
  const positionsRef = useRef(positions);
  positionsRef.current = positions;
  const activeFlowRef = useRef(activeFlow);
  activeFlowRef.current = activeFlow;
  const motorEnergizedRef = useRef(motorEnergized);
  motorEnergizedRef.current = motorEnergized;
  const sweepActiveRef = useRef(sweepActive);
  sweepActiveRef.current = sweepActive;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe5e1d8);

    const width = mount.clientWidth || 760;
    const height = mount.clientHeight || 460;
    const camera = new THREE.PerspectiveCamera(34, width / height, 5, 4500);
    camera.position.set(520, 420, 580);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance"
      });
    } catch {
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.domElement.style.touchAction = "none";
    mount.innerHTML = "";
    mount.appendChild(renderer.domElement);

    const envMap = createStudioEnvMap(renderer);
    if (envMap) {
      scene.environment = envMap;
    }

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.minDistance = 220;
    controls.maxDistance = 1800;
    controls.target.set(0, 35, 10);
    controls.update();

    const hemi = new THREE.HemisphereLight(0xfffcf5, 0xc7c0b4, 1.25);
    scene.add(hemi);
    const keyLight = new THREE.DirectionalLight(0xfff7eb, 1.35);
    keyLight.position.set(600, 950, 550);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0xdbe3f0, 0.55);
    rimLight.position.set(-600, 450, -500);
    scene.add(rimLight);

    const grid = new THREE.GridHelper(860, 18, 0xbab4a8, 0xd6d1c6);
    grid.position.y = -2;
    scene.add(grid);

    const benchBoard = new THREE.Mesh(
      new THREE.PlaneGeometry(800, 540),
      new THREE.MeshStandardMaterial({
        color: 0xdfdace,
        roughness: 0.94,
        metalness: 0.03
      })
    );
    benchBoard.rotation.x = -Math.PI / 2;
    benchBoard.position.set(0, -3, 10);
    scene.add(benchBoard);

    const chassisGhostGroup = new THREE.Group();
    const ghostSurfaceMat = new THREE.MeshStandardMaterial({
      color: 0xc8c2b4,
      roughness: 0.5,
      metalness: 0.2,
      transparent: true,
      opacity: 0.09,
      depthWrite: false
    });
    const ghostLineMat = new THREE.LineBasicMaterial({
      color: 0x6e695f,
      transparent: true,
      opacity: 0.28
    });
    const GHOST_PART_IDS = new Set([
      "base",
      "deck",
      "shell",
      "bumper",
      "wheel-front-left",
      "wheel-front-right",
      "wheel-rear-left",
      "wheel-rear-right"
    ]);
    assemblyParts.forEach((part) => {
      if (!GHOST_PART_IDS.has(part.id)) return;
      const ghostModel = createAssemblyModel(part);
      ghostModel.position.set(part.home[0], part.home[1], part.home[2]);
      ghostModel.rotation.set(
        THREE.MathUtils.degToRad(part.rotation[0]),
        THREE.MathUtils.degToRad(part.rotation[1]),
        THREE.MathUtils.degToRad(part.rotation[2])
      );
      ghostModel.traverse((child) => {
        child.raycast = () => {};
        if (child instanceof THREE.Mesh) {
          child.material = ghostSurfaceMat;
          child.castShadow = false;
          child.receiveShadow = false;
        } else if (child instanceof THREE.LineSegments) {
          child.material = ghostLineMat;
        }
      });
      chassisGhostGroup.add(ghostModel);
    });
    chassisGhostGroup.visible = false;
    scene.add(chassisGhostGroup);

    const nodes = new Map<string, THREE.Group>();
    const basePads = new Map<string, THREE.Mesh>();
    const partPickMeshes: THREE.Object3D[] = [];
    const motorModels = new Map<string, THREE.Group>();
    let scannerNode: THREE.Object3D | null = null;

    const portCylinder = new THREE.CylinderGeometry(2.8, 2.8, 4.5, 12);

    assemblyParts.forEach((part) => {
      if (!POWER_STAGE_PART_IDS.has(part.id)) return;
      const group = new THREE.Group();
      const model = createAssemblyModel(part);
      group.rotation.set(
        THREE.MathUtils.degToRad(part.rotation[0]),
        THREE.MathUtils.degToRad(part.rotation[1]),
        THREE.MathUtils.degToRad(part.rotation[2])
      );
      group.add(model);

      // Render distinct terminal pins at the exact port offsets used by the wire bundles
      part.ports.forEach((port) => {
        const key = `${part.id}:${port.id}`;
        const pinPos = PORT_PIN_OFFSETS[key] ?? port.position;
        const pinColor =
          port.kind === "power" ? 0x991f1f : port.kind === "drive" ? 0xa87914 : 0x2563eb;
        const pinMesh = new THREE.Mesh(
          portCylinder.clone(),
          new THREE.MeshStandardMaterial({
            color: pinColor,
            roughness: 0.28,
            metalness: 0.78
          })
        );
        pinMesh.position.set(pinPos[0], pinPos[1], pinPos[2]);
        pinMesh.userData.partId = part.id;
        group.add(pinMesh);
      });

      const pos = positionsRef.current[part.id] ?? part.home;
      group.position.set(pos[0], pos[1], pos[2]);
      group.traverse((obj: THREE.Object3D) => {
        obj.userData.partId = part.id;
        if (obj.userData.motion === "scanner") {
          scannerNode = obj;
        }
        if (obj instanceof THREE.Mesh) {
          partPickMeshes.push(obj);
        }
      });

      if (part.id.startsWith("motor-")) {
        motorModels.set(part.id, model);
      }

      const radius = Math.max(part.size[0], part.size[2]) * 0.58;
      const padGeo = new THREE.RingGeometry(radius * 0.8, radius, 28);
      padGeo.rotateX(-Math.PI / 2);
      const padMat = new THREE.MeshBasicMaterial({
        color: 0x68655e,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.4
      });
      const padMesh = new THREE.Mesh(padGeo, padMat);
      padMesh.position.set(0, -part.size[1] * 0.48, 0);
      group.add(padMesh);
      basePads.set(part.id, padMesh);

      nodes.set(part.id, group);
      scene.add(group);
    });

    portCylinder.dispose();

    const wireGroup = new THREE.Group();
    scene.add(wireGroup);

    const faultGroup = new THREE.Group();
    scene.add(faultGroup);

    const syncOverlays = () => {
      const w = renderer.domElement.clientWidth;
      const h = renderer.domElement.clientHeight;
      if (!w || !h) return;

      const rt = runtimeRef.current;
      const activeConnId = selectedConnIdRef.current;
      if (activeConnId && rt?.wireMidpoints.has(activeConnId)) {
        const mid = rt.wireMidpoints.get(activeConnId)!.clone().add(new THREE.Vector3(0, 14, 0));
        mid.project(camera);
        if (mid.z < 1) {
          setSelectedConnScreenPos({
            x: Math.max(120, Math.min(w - 120, (mid.x * 0.5 + 0.5) * w)),
            y: Math.max(52, Math.min(h - 52, (-mid.y * 0.5 + 0.5) * h))
          });
        } else {
          setSelectedConnScreenPos(null);
        }
      } else {
        setSelectedConnScreenPos(null);
      }

      const stageId =
        selectedIdRef.current === "fuse-block" || selectedIdRef.current === "contactor"
          ? "protection"
          : selectedIdRef.current;
      const selNode = nodes.get(stageId);
      if (selNode && !activeConnId) {
        const worldPos = selNode.position.clone().add(new THREE.Vector3(0, 44, 0));
        worldPos.project(camera);
        if (worldPos.z < 1) {
          setSelectedScreenPos({
            x: Math.max(100, Math.min(w - 100, (worldPos.x * 0.5 + 0.5) * w)),
            y: Math.max(40, Math.min(h - 40, (-worldPos.y * 0.5 + 0.5) * h))
          });
        }
      } else {
        setSelectedScreenPos(null);
      }

      const markers: Array<FaultPoint & { x: number; y: number }> = [];
      faultPointsRef.current.slice(0, 2).forEach((fp) => {
        const targetId =
          fp.nodeId === "fuse-block" || fp.nodeId === "contactor" ? "protection" : fp.nodeId;
        const n = nodes.get(targetId);
        if (!n) return;
        const p = n.position.clone().add(new THREE.Vector3(0, 58, 0));
        p.project(camera);
        if (p.z < 1) {
          markers.push({
            ...fp,
            x: Math.max(100, Math.min(w - 100, (p.x * 0.5 + 0.5) * w)),
            y: Math.max(32, Math.min(h - 32, (-p.y * 0.5 + 0.5) * h))
          });
        }
      });
      setFaultScreenMarkers(markers);
    };

    let frameId = 0;
    let inAnimate = false;
    let disposed = false;
    const clock = new THREE.Clock();

    const animate = () => {
      if (disposed) {
        frameId = 0;
        return;
      }
      inAnimate = true;
      const elapsed = clock.getElapsedTime();
      const unsettled = controls.update();

      const rt = runtimeRef.current;
      const hasFaults = faultPointsRef.current.length > 0;
      const anyMotorSpinning = Object.values(motorEnergizedRef.current).some(Boolean);
      const shouldLoop =
        activeFlowRef.current || hasFaults || anyMotorSpinning || sweepActiveRef.current;

      if (rt && rt.pulseMeshes.length > 0) {
        rt.pulseMeshes.forEach((item) => {
          if (!activeFlowRef.current || item.speed <= 0.01) {
            item.mesh.visible = false;
            return;
          }
          item.mesh.visible = true;
          const t = (elapsed * item.speed + item.offset) % 1;
          item.curve.getPointAt(t, item.mesh.position);
        });
      }

      if (rt) {
        rt.motorModels.forEach((model, motorId) => {
          if (motorEnergizedRef.current[motorId]) {
            const dir = motorId.includes("left") ? 5.5 : -5.5;
            model.rotation.z = elapsed * dir;
          }
        });
        if (sweepActiveRef.current && rt.scannerNode) {
          rt.scannerNode.rotation.y = elapsed * 8.0;
          rt.scannerNode.rotation.z = Math.sin(elapsed * 2.2) * 0.35;
        }
      }

      if (faultGroup.children.length > 0) {
        faultGroup.children.forEach((child, idx) => {
          const pulse = (elapsed * 1.6 + idx * 0.35) % 1;
          child.scale.setScalar(0.85 + pulse * 1.5);
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
            child.material.opacity = (1 - pulse) * 0.85;
          }
        });
      }

      renderer.render(scene, camera);
      syncOverlays();
      inAnimate = false;

      if (unsettled || shouldLoop) {
        frameId = requestAnimationFrame(animate);
      } else {
        frameId = 0;
      }
    };

    const wake = () => {
      if (!frameId && !inAnimate && !disposed) {
        frameId = requestAnimationFrame(animate);
      }
    };

    controls.addEventListener("change", wake);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let downX = 0;
    let downY = 0;

    const onPointerDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 5) return;
      const rt = runtimeRef.current;
      if (!rt) return;

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      // 1. Check if user clicked a 3D multi-conductor wire harness first
      const wireHits = raycaster.intersectObjects(rt.wirePickMeshes, false);
      if (wireHits.length > 0) {
        const connId = wireHits[0].object.userData.connectionId as string | undefined;
        if (connId) {
          onSelectConnRef.current(connId);
          wake();
          return;
        }
      }

      // 2. Otherwise check if user clicked a 3D electronics component
      const partHits = raycaster.intersectObjects(rt.partPickMeshes, false);
      if (partHits.length > 0) {
        const partId = partHits[0].object.userData.partId as string | undefined;
        if (partId) {
          onSelectConnRef.current(null);
          const mappedId =
            partId === "protection"
              ? "fuse-block"
              : partId === "motor-front-left" || partId === "motor-rear-left"
                ? "driver-1"
                : partId === "motor-front-right" || partId === "motor-rear-right"
                  ? "driver-2"
                  : partId === "cooler"
                    ? "pi5"
                    : partId;
          onSelectRef.current(mappedId);
          wake();
        }
      }
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointerup", onPointerUp);

    const resizeObserver = new ResizeObserver(() => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      wake();
    });
    resizeObserver.observe(mount);

    runtimeRef.current = {
      scene,
      camera,
      renderer,
      controls,
      nodes,
      basePads,
      wireGroup,
      wireMidpoints: new Map(),
      wirePickMeshes: [],
      partPickMeshes,
      pulseMeshes: [],
      faultGroup,
      chassisGhostGroup,
      motorModels,
      scannerNode,
      wake,
      syncOverlays
    };

    wake();

    return () => {
      disposed = true;
      if (frameId) cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      controls.removeEventListener("change", wake);
      controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.dispose();
      runtimeRef.current = null;
    };
  }, []);

  // Rebuild multi-conductor harnesses, current beads, thermal pads, and fault rings
  useEffect(() => {
    const rt = runtimeRef.current;
    if (!rt) return;

    rt.chassisGhostGroup.visible = layoutMode === "chassis";
    const stageSelectedId =
      selectedId === "fuse-block" || selectedId === "contactor" ? "protection" : selectedId;
    const faultNodeSet = new Set(
      faultPoints.map((f) =>
        f.nodeId === "fuse-block" || f.nodeId === "contactor" ? "protection" : f.nodeId
      )
    );
    const disconnectedSet = new Set(disconnectedIds);

    assemblyParts.forEach((part) => {
      const group = rt.nodes.get(part.id);
      if (!group) return;
      const pos = positions[part.id] ?? part.home;
      group.position.set(pos[0], pos[1], pos[2]);

      const telemetryId = part.id === "protection" ? "fuse-block" : part.id;
      const telem = nodeTelemetry[telemetryId];
      const isSelected = part.id === stageSelectedId && !selectedConnectionId;
      const isFaulted = faultNodeSet.has(part.id);

      const pad = rt.basePads.get(part.id);
      if (pad && pad.material instanceof THREE.MeshBasicMaterial) {
        if (isFaulted) {
          pad.material.color.setHex(0xe34242);
          pad.material.opacity = 0.92;
        } else if (isSelected) {
          pad.material.color.setHex(0x111319);
          pad.material.opacity = 0.85;
        } else if (heatmapMode && telem) {
          pad.material.color.copy(tempToColor(telem.tempC));
          pad.material.opacity = 0.78;
        } else {
          pad.material.color.setHex(telem?.isolated ? 0x9e988e : 0x1f6b42);
          pad.material.opacity = telem?.isolated ? 0.22 : 0.42;
        }
      }

      group.traverse((child: THREE.Object3D) => {
        if (child === pad) return;
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          if (isFaulted) {
            child.material.emissive.setHex(0xb81d1d);
            child.material.emissiveIntensity = 0.55;
          } else if (heatmapMode && telem) {
            child.material.emissive.copy(tempToColor(telem.tempC));
            child.material.emissiveIntensity = 0.38;
          } else if (isSelected) {
            child.material.emissive.setHex(0x991f1f);
            child.material.emissiveIntensity = 0.22;
          } else {
            child.material.emissive.setHex(0x000000);
            child.material.emissiveIntensity = 0;
          }
        }
      });
    });

    while (rt.wireGroup.children.length > 0) {
      const obj = rt.wireGroup.children[0];
      rt.wireGroup.remove(obj);
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (obj.material instanceof THREE.Material) obj.material.dispose();
      }
    }
    rt.pulseMeshes = [];
    rt.wirePickMeshes = [];
    rt.wireMidpoints.clear();

    const partMap = new Map(assemblyParts.map((p) => [p.id, p]));
    const pulseSphereGeo = new THREE.SphereGeometry(3.2, 10, 10);

    connections.forEach((conn, connIdx) => {
      const fromPart = partMap.get(conn.fromPart);
      const toPart = partMap.get(conn.toPart);
      if (!fromPart || !toPart) return;
      const fromPort = fromPart.ports.find((p) => p.id === conn.fromPort) ?? fromPart.ports[0];
      const toPort = toPart.ports.find((p) => p.id === conn.toPort) ?? toPart.ports[0];
      if (!fromPort || !toPort) return;

      const fromPos = positions[fromPart.id] ?? fromPart.home;
      const toPos = positions[toPart.id] ?? toPart.home;

      const fromOffset =
        PORT_PIN_OFFSETS[`${conn.fromPart}:${conn.fromPort}`] ?? fromPort.position;
      const toOffset = PORT_PIN_OFFSETS[`${conn.toPart}:${conn.toPort}`] ?? toPort.position;

      const start = new THREE.Vector3(
        fromPos[0] + fromOffset[0],
        fromPos[1] + fromOffset[1],
        fromPos[2] + fromOffset[2]
      );
      const end = new THREE.Vector3(
        toPos[0] + toOffset[0],
        toPos[1] + toOffset[1],
        toPos[2] + toOffset[2]
      );

      const bundleSpec = HARNESS_BUNDLE_SPECS[conn.id] ?? HARNESS_BUNDLE_SPECS.p1;
      const conductors = bundleSpec.conductors;
      const count = conductors.length;

      // Stratified arch heights by harness kind so power, signal, and encoder bundles never collide
      const archLift =
        bundleSpec.kind === "power"
          ? 20 + (connIdx % 3) * 4
          : bundleSpec.kind === "drive"
            ? 14
            : bundleSpec.kind === "encoder"
              ? 34 + (connIdx % 2) * 5
              : 28 + (connIdx % 3) * 4;

      const c1 = start.clone().lerp(end, 0.28);
      c1.y = Math.max(start.y, end.y) + archLift;
      const c2 = start.clone().lerp(end, 0.72);
      c2.y = Math.max(start.y, end.y) + archLift;
      const mid = c1.clone().lerp(c2, 0.5);
      rt.wireMidpoints.set(conn.id, mid.clone());

      // Compute perpendicular lateral vector so multi-conductor wires run side-by-side cleanly
      const dirVec = end.clone().sub(start);
      const perp = new THREE.Vector3(-dirVec.z, 0, dirVec.x);
      if (perp.lengthSq() < 1e-4) {
        perp.set(1, 0, 0);
      } else {
        perp.normalize();
      }

      const toTelemId =
        conn.toPart === "protection"
          ? "fuse-block"
          : conn.toPart === "cooler"
            ? "pi5"
            : conn.toPart.startsWith("motor-")
              ? conn.fromPart
              : conn.toPart;
      const fromTelemId =
        conn.fromPart === "protection"
          ? "fuse-block"
          : conn.fromPart.startsWith("motor-")
            ? "pico"
            : conn.fromPart;
      const toTelem = nodeTelemetry[toTelemId];
      const fromTelem = nodeTelemetry[fromTelemId];
      const isUnplugged = disconnectedSet.has(conn.id);
      const isIsolated =
        isUnplugged || Boolean(toTelem?.isolated) || Boolean(fromTelem?.isolated);
      const isFaulted = faultNodeSet.has(conn.fromPart) || faultNodeSet.has(conn.toPart);
      const isSelectedConn = selectedConnectionId === conn.id;
      const isConnectedToSelectedPart =
        !selectedConnectionId &&
        (conn.fromPart === stageSelectedId || conn.toPart === stageSelectedId);

      const spacing = count >= 5 ? 2.1 : count >= 4 ? 2.4 : 2.8;
      const wireRadius = isSelectedConn ? 1.65 : isConnectedToSelectedPart ? 1.35 : 1.05;

      // Render each numbered conductor in the multi-wire bundle
      conductors.forEach((cond, idx) => {
        const offsetScalar = (idx - (count - 1) / 2) * spacing;
        const offsetVec = perp.clone().multiplyScalar(offsetScalar);

        const pStart = start.clone().add(offsetVec);
        const pC1 = c1.clone().add(offsetVec);
        const pC2 = c2.clone().add(offsetVec);
        const pEnd = end.clone().add(offsetVec);
        const curve = new THREE.CatmullRomCurve3([pStart, pC1, pC2, pEnd]);

        const tubeGeo = new THREE.TubeGeometry(curve, 22, wireRadius, 7, false);
        const tubeMat = new THREE.MeshStandardMaterial({
          color: isFaulted ? 0xe34242 : isUnplugged ? 0x9e988e : cond.colorHex,
          roughness: 0.42,
          metalness: 0.12,
          transparent: true,
          opacity: isUnplugged
            ? 0.2
            : isIsolated
              ? 0.34
              : isSelectedConn || isConnectedToSelectedPart || isFaulted
                ? 0.98
                : 0.74,
          emissive: isSelectedConn ? new THREE.Color(0x991f1f) : new THREE.Color(0x000000),
          emissiveIntensity: isSelectedConn ? 0.25 : 0
        });
        const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
        tubeMesh.userData.connectionId = conn.id;
        rt.wireGroup.add(tubeMesh);
        rt.wirePickMeshes.push(tubeMesh);

        // Add current/signal pulse beads along conductor W1
        if (idx === 0 && !isIsolated && activeFlow) {
          const currentA = toTelem?.currentA ?? 0.6;
          const speed = Math.min(1.35, Math.max(0.22, 0.25 + currentA * 0.08));
          const beadColor =
            bundleSpec.kind === "signal" || bundleSpec.kind === "encoder"
              ? 0xdbeafe
              : isFaulted
                ? 0xff4d4d
                : 0xfff8e7;
          for (let b = 0; b < 2; b++) {
            const beadMat = new THREE.MeshBasicMaterial({ color: beadColor });
            const beadMesh = new THREE.Mesh(pulseSphereGeo, beadMat);
            rt.wireGroup.add(beadMesh);
            rt.pulseMeshes.push({
              mesh: beadMesh,
              curve,
              speed,
              offset: b * 0.5
            });
          }
        }
      });

      // Invisible wider hit-tube along the bundle centerline so clicking any harness in 3D is effortless
      const centerCurve = new THREE.CatmullRomCurve3([start, c1, c2, end]);
      const hitGeo = new THREE.TubeGeometry(centerCurve, 12, Math.max(8, count * 1.8), 6, false);
      const hitMat = new THREE.MeshBasicMaterial({ visible: false });
      const hitMesh = new THREE.Mesh(hitGeo, hitMat);
      hitMesh.userData.connectionId = conn.id;
      rt.wireGroup.add(hitMesh);
      rt.wirePickMeshes.push(hitMesh);
    });

    while (rt.faultGroup.children.length > 0) {
      const obj = rt.faultGroup.children[0];
      rt.faultGroup.remove(obj);
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (obj.material instanceof THREE.Material) obj.material.dispose();
      }
    }

    faultPoints.forEach((fp) => {
      const targetId =
        fp.nodeId === "fuse-block" || fp.nodeId === "contactor" ? "protection" : fp.nodeId;
      const targetGroup = rt.nodes.get(targetId);
      if (!targetGroup) return;

      const ringGeo = new THREE.RingGeometry(24, 34, 28);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: fp.severity === "critical" ? 0xe34242 : 0xd49520,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.copy(targetGroup.position).add(new THREE.Vector3(0, 12, 0));
      rt.faultGroup.add(ringMesh);
    });

    rt.syncOverlays();
    rt.wake();
  }, [
    layoutMode,
    positions,
    connections,
    disconnectedIds,
    selectedId,
    selectedConnectionId,
    nodeTelemetry,
    motorEnergized,
    faultPoints,
    heatmapMode,
    activeFlow,
    sweepActive
  ]);

  useEffect(() => {
    const rt = runtimeRef.current;
    if (!rt) return;
    if (view === "top") {
      rt.camera.position.set(0, 780, 0.1);
    } else if (view === "front") {
      rt.camera.position.set(0, 185, 700);
    } else {
      rt.camera.position.set(520, 420, 580);
    }
    rt.controls.target.set(0, 35, 10);
    rt.controls.update();
    rt.syncOverlays();
    rt.wake();
  }, [view]);

  const activeTelem = nodeTelemetry[selectedId] ?? nodeTelemetry.battery;
  const activeBundle = selectedConnectionId
    ? HARNESS_BUNDLE_SPECS[selectedConnectionId]
    : null;
  const isSelectedConnUnplugged = selectedConnectionId
    ? disconnectedIds.includes(selectedConnectionId)
    : false;

  return (
    <div className="relative h-full w-full overflow-hidden select-none">
      <div ref={mountRef} className="h-full w-full" />

      {/* Interactive 3D Multi-Conductor Harness Callout (when a 3D wire bundle is clicked) */}
      {selectedConnScreenPos && activeBundle && selectedConnectionId && (
        <div
          style={{
            left: `${selectedConnScreenPos.x}px`,
            top: `${selectedConnScreenPos.y}px`,
            transform: "translate(-50%, -115%)"
          }}
          className="absolute z-20 flex max-w-[320px] flex-col gap-1 rounded-md border border-[var(--sonaris-studio-ink)] bg-[var(--sonaris-panel)] px-2.5 py-1.5 font-mono text-[9.5px] text-[var(--sonaris-studio-ink)] shadow-md"
        >
          <div className="flex items-center justify-between gap-3 font-bold">
            <span className="truncate">{activeBundle.label}</span>
            <span className="shrink-0 text-[var(--sonaris-orange)]">
              {activeBundle.conductorCount}-Wire · {selectedWireGauge}
            </span>
          </div>
          <div className="text-[8.5px] text-[var(--sonaris-studio-muted)]">
            {activeBundle.connector} · {selectedWireLength.toFixed(2)}m (-{selectedDropMv.toFixed(1)}mV)
          </div>
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => onToggleConnection(selectedConnectionId)}
              className="pointer-events-auto cursor-pointer rounded bg-[var(--sonaris-studio-ink)] px-2 py-0.5 text-[8.5px] font-bold text-[var(--sonaris-ink)]"
            >
              {isSelectedConnUnplugged ? "Plug In Harness" : "Unplug Harness (Live Cut)"}
            </button>
            <button
              type="button"
              onClick={() => onSelectConnection(null)}
              className="pointer-events-auto cursor-pointer text-[8.5px] text-[var(--sonaris-studio-muted)] underline"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Selected 3D Component Floating Callout Tag */}
      {selectedScreenPos && activeTelem && !selectedConnectionId && (
        <div
          style={{
            left: `${selectedScreenPos.x}px`,
            top: `${selectedScreenPos.y}px`,
            transform: "translate(-50%, -115%)"
          }}
          className="pointer-events-none absolute z-10 rounded border border-[var(--sonaris-studio-ink)] bg-[var(--sonaris-panel)] px-2.5 py-1 font-mono text-[9.5px] text-[var(--sonaris-studio-ink)] shadow-sm"
        >
          <div className="flex items-center gap-2 font-bold">
            <span>
              {activeTelem.isolated
                ? "0.00V (ISOLATED)"
                : `${activeTelem.voltageV.toFixed(2)}V · ${activeTelem.currentA.toFixed(2)}A`}
            </span>
            <span>·</span>
            <span>{activeTelem.tempC.toFixed(1)}°C</span>
          </div>
          <div className="text-[8.5px] text-[var(--sonaris-studio-muted)]">
            {selectedConnector} · {selectedWireGauge} · {selectedWireLength.toFixed(2)}m (-
            {selectedDropMv.toFixed(1)}mV)
          </div>
        </div>
      )}

      {/* 3D Explosion / Overload Point Callouts */}
      {faultScreenMarkers.map((fp) => (
        <div
          key={`${fp.nodeId}-${fp.title}`}
          style={{
            left: `${fp.x}px`,
            top: `${fp.y}px`,
            transform: "translate(-50%, -135%)"
          }}
          className="pointer-events-none absolute z-20 rounded border border-[var(--sonaris-red)] bg-[var(--sonaris-red)] px-2 py-0.5 font-mono text-[9px] font-bold text-white shadow-md"
        >
          <div>! {fp.title}</div>
          <div className="text-[8px] font-normal opacity-90">{fp.reason}</div>
        </div>
      ))}
    </div>
  );
}
