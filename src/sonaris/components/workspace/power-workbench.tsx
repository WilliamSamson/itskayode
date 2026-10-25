"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  assemblyParts,
  type AssemblyConnection
} from "@/sonaris/lib/sonaris-assembly";
import { batteryCircuit, converter, thermal } from "@/sonaris/lib/sonaris-analysis";
import styles from "./power-workbench.module.css";

const AssemblyStage = dynamic(() => import("./assembly-stage"), {
  ssr: false,
  loading: () => (
    <div className="relative h-full min-h-[300px] w-full overflow-hidden rounded-[24px] bg-[#E5E1D8] flex flex-col items-center justify-center gap-3 font-mono text-[11px] text-[#68655E] select-none">
      <div className="flex items-center gap-2.5">
        <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#111319] animate-pulse" />
        <strong className="tracking-wider uppercase text-[#111319] text-[12px]">
          SONARIS · Power Subsystem 3D Twin
        </strong>
      </div>
      <div className="flex items-center gap-2 text-[10px] text-[#7A766E]">
        <span className="inline-block h-1.5 w-24 overflow-hidden rounded-full bg-[#D5D0C6]">
          <span className="block h-full w-2/3 animate-pulse rounded-full bg-[#111319]" />
        </span>
        <span>Loading 3D Electronics & Power Rails</span>
      </div>
    </div>
  )
});

// Full electrical power harness with color-coded power paths
export const POWER_CONNECTIONS: AssemblyConnection[] = [
  { id: "p1", fromPart: "battery", fromPort: "supply", toPart: "protection", toPort: "power-in" },
  { id: "p1b", fromPart: "protection", fromPort: "protected-out", toPart: "disconnect", toPort: "power-in" },
  { id: "p2", fromPart: "estop", fromPort: "stop-out", toPart: "disconnect", toPort: "stop-request" },
  { id: "p3", fromPart: "disconnect", fromPort: "drive-supply", toPart: "converter-a", toPort: "power-in" },
  { id: "p4", fromPart: "disconnect", fromPort: "drive-supply", toPart: "driver-1", toPort: "power-in" },
  { id: "p5", fromPart: "disconnect", fromPort: "drive-supply", toPart: "driver-2", toPort: "power-in" },
  { id: "p6", fromPart: "disconnect", fromPort: "drive-supply", toPart: "servo", toPort: "power-in" },
  { id: "p7", fromPart: "converter-a", fromPort: "output", toPart: "pi5", toPort: "power-in" },
  { id: "p8", fromPart: "converter-a", fromPort: "output", toPart: "pico", toPort: "power-in" },
  { id: "p9", fromPart: "converter-a", fromPort: "output", toPart: "lidar", toPort: "power-in" },
  { id: "p10", fromPart: "converter-a", fromPort: "output", toPart: "imu", toPort: "power-in" },
  { id: "p11", fromPart: "driver-1", fromPort: "motor-a", toPart: "motor-front-left", toPort: "drive-in" },
  { id: "p12", fromPart: "driver-1", fromPort: "motor-b", toPart: "motor-rear-left", toPort: "drive-in" },
  { id: "p13", fromPart: "driver-2", fromPort: "motor-a", toPart: "motor-front-right", toPort: "drive-in" },
  { id: "p14", fromPart: "driver-2", fromPort: "motor-b", toPart: "motor-rear-right", toPort: "drive-in" }
];

export interface ElectronicsNode {
  id: string;
  name: string;
  subsystem: "energy" | "protection" | "conversion" | "actuation" | "compute" | "sensing";
  rail: "12.8V Battery Bus" | "5.1V Logic Rail" | "3.3V Sensor Rail" | "Motor Drive Phases" | "Safety Loop";
  nominalV: string;
  voltageRange: string;
  quiescentW: number;
  nominalW: number;
  peakW: number;
  connector: string;
  wireGauge: string;
  wireLengthM: number;
  fuseProtection: string;
  thermalThetaJA: number;
  pinouts: { pin: string; function: string }[];
  researchNote: string;
  datasheetUrl?: string;
}

export const ROVER_ELECTRONICS: ElectronicsNode[] = [
  {
    id: "battery",
    name: "Bioenno LiFePO4 Battery Pack",
    subsystem: "energy",
    rail: "12.8V Battery Bus",
    nominalV: "12.8 V (Nominal)",
    voltageRange: "10.0 V (Cutoff) – 14.6 V (Charge)",
    quiescentW: 0.0,
    nominalW: 28.4,
    peakW: 240.0,
    connector: "XT60 High-Current Plug (Gold-Plated)",
    wireGauge: "14 AWG High-Flex Silicone (200°C rated)",
    wireLengthM: 0.25,
    fuseProtection: "Internal 30A PCM/BMS + 20A ATO Blade Fuse",
    thermalThetaJA: 1.2,
    pinouts: [
      { pin: "XT60 (+)", function: "12.8V Unregulated DC Output" },
      { pin: "XT60 (-)", function: "Primary Battery Return / Star GND" }
    ],
    researchNote:
      "Bioenno BLF-1212AS pack using 4S cylindrical 26650 LiFePO4 cells. Chemistry provides an exceptionally flat discharge voltage curve (3.20V/cell plateau) with 2000+ cycle life, zero thermal runaway hazard, and 153.6 Wh stored capacity.",
    datasheetUrl: "https://www.bioennopower.com"
  },
  {
    id: "fuse-block",
    name: "Master 20A In-Line Fuse Block",
    subsystem: "protection",
    rail: "12.8V Battery Bus",
    nominalV: "12.8 V Bus",
    voltageRange: "Up to 32 VDC",
    quiescentW: 0.05,
    nominalW: 0.15,
    peakW: 0.8,
    connector: "Weatherpack In-Line Blade Fuse Holder",
    wireGauge: "14 AWG High-Flex Silicone",
    wireLengthM: 0.1,
    fuseProtection: "20A Fast-Acting Blade Fuse (ATO/ATC)",
    thermalThetaJA: 15.0,
    pinouts: [
      { pin: "Terminal 1", function: "Battery Positive In" },
      { pin: "Terminal 2", function: "Fused Bus Output to Master Switch" }
    ],
    researchNote:
      "First line of overcurrent defence. Sized for 20A continuous to tolerate in-rush and transient mecanum stall spikes up to 40A for <100ms without false tripping."
  },
  {
    id: "protection",
    name: "Master 20A In-Line Fuse Block",
    subsystem: "protection",
    rail: "12.8V Battery Bus",
    nominalV: "12.8 V Bus",
    voltageRange: "Up to 32 VDC",
    quiescentW: 0.05,
    nominalW: 0.15,
    peakW: 0.8,
    connector: "Weatherpack In-Line Blade Fuse Holder",
    wireGauge: "14 AWG High-Flex Silicone",
    wireLengthM: 0.1,
    fuseProtection: "20A Fast-Acting Blade Fuse (ATO/ATC)",
    thermalThetaJA: 15.0,
    pinouts: [
      { pin: "Terminal 1", function: "Battery Positive In" },
      { pin: "Terminal 2", function: "Fused Bus Output to Master Switch" }
    ],
    researchNote:
      "First line of overcurrent defence. Sized for 20A continuous to tolerate in-rush and transient mecanum stall spikes up to 40A for <100ms without false tripping."
  },
  {
    id: "disconnect",
    name: "Master Battery Disconnect Switch",
    subsystem: "protection",
    rail: "12.8V Battery Bus",
    nominalV: "12.8 V Bus",
    voltageRange: "0 V – 32 V",
    quiescentW: 0.0,
    nominalW: 0.1,
    peakW: 0.4,
    connector: "M4 Brass Screw Lugs",
    wireGauge: "14 AWG High-Flex Silicone",
    wireLengthM: 0.15,
    fuseProtection: "Manual 50A mechanical contact rating",
    thermalThetaJA: 4.5,
    pinouts: [
      { pin: "LUG A", function: "Fused 12.8V Battery In" },
      { pin: "LUG B", function: "Switched 12.8V System Bus Out" }
    ],
    researchNote:
      "Heavy-duty mechanical rotary switch located at the rear lower chassis. Provides physical air-gap disconnection during storage, maintenance, and firmware flashing."
  },
  {
    id: "estop",
    name: "Hardware Emergency Stop (E-Stop)",
    subsystem: "protection",
    rail: "Safety Loop",
    nominalV: "Active-Low Safety Loop",
    voltageRange: "3.3 V – 12.8 V Signal Loop",
    quiescentW: 0.0,
    nominalW: 0.05,
    peakW: 0.1,
    connector: "Screw Terminals with Strain Relief",
    wireGauge: "22 AWG Twisted Pair",
    wireLengthM: 0.4,
    fuseProtection: "Normally Closed (NC) Dual-Contact Hardware Interlock",
    thermalThetaJA: 2.0,
    pinouts: [
      { pin: "Contact 1 (NC)", function: "Safety Interlock Loop High" },
      { pin: "Contact 2 (NC)", function: "Contactor Trigger Line" }
    ],
    researchNote:
      "Mushroom-head twist-to-reset emergency switch. Depressing mechanically breaks the safety loop, commanding the contactor to instantly kill motor drive power while keeping logic powered."
  },
  {
    id: "contactor",
    name: "Solid-State Drive Bus Contactor",
    subsystem: "protection",
    rail: "12.8V Battery Bus",
    nominalV: "12.8 V Drive Bus",
    voltageRange: "9 V – 24 V",
    quiescentW: 0.35,
    nominalW: 0.6,
    peakW: 1.5,
    connector: "High-Current PCB Screw Terminals",
    wireGauge: "14 AWG Power / 22 AWG Control",
    wireLengthM: 0.2,
    fuseProtection: "High-side P-channel MOSFET array with thermal foldback",
    thermalThetaJA: 8.0,
    pinouts: [
      { pin: "VIN", function: "12.8V Battery Rail In" },
      { pin: "VOUT_DRIVE", function: "Isolated 12.8V Actuation Bus (Killed on E-Stop)" },
      { pin: "CTRL", function: "Active-Low E-Stop Trigger" },
      { pin: "GND", function: "Logic Ground Reference" }
    ],
    researchNote:
      "Critical safety isolation: when E-Stop is triggered, VOUT_DRIVE de-energizes to 0.0V (stopping all 4 wheels and tilt servo), while the 5.1V logic rail stays live so Pi 5 logs incident telemetry without rebooting."
  },
  {
    id: "converter-a",
    name: "Synchronous 5.1V Buck Converter",
    subsystem: "conversion",
    rail: "5.1V Logic Rail",
    nominalV: "5.10 V Regulated",
    voltageRange: "Input: 9.0 V – 24.0 V → Output: 5.10 V ± 1%",
    quiescentW: 0.25,
    nominalW: 14.5,
    peakW: 40.8,
    connector: "M3 Screw Terminals In / Out",
    wireGauge: "16 AWG In / 18 AWG Out (Twisted)",
    wireLengthM: 0.2,
    fuseProtection: "Current-mode PWM with cycle-by-cycle limit (8.0A continuous)",
    thermalThetaJA: 14.0,
    pinouts: [
      { pin: "VIN (+)", function: "12.8V Switched Battery Input" },
      { pin: "VIN (-)", function: "Power Ground PGND" },
      { pin: "VOUT (+)", function: "+5.10V Clean Logic Rail" },
      { pin: "VOUT (-)", function: "Star Ground Reference AGND" }
    ],
    researchNote:
      "Wide-input synchronous step-down regulator operating at 94% efficiency. Powers Raspberry Pi 5, Pico RP2040, RPLIDAR S2 scanner, and IMU with <25mV ripple."
  },
  {
    id: "driver-1",
    name: "Cytron MDD10A Motor Driver (Left)",
    subsystem: "actuation",
    rail: "12.8V Battery Bus",
    nominalV: "12.8 V Actuation Rail",
    voltageRange: "7 V – 30 VDC",
    quiescentW: 0.2,
    nominalW: 12.0,
    peakW: 80.0,
    connector: "Heavy-Duty M3 Green Screw Terminals",
    wireGauge: "16 AWG Power / 18 AWG Motor Leads",
    wireLengthM: 0.3,
    fuseProtection: "10A Continuous per channel (30A peak for 10s)",
    thermalThetaJA: 7.2,
    pinouts: [
      { pin: "POWER (+)", function: "12.8V Isolated Drive Rail" },
      { pin: "POWER (-)", function: "Power Ground PGND" },
      { pin: "M1A / M1B", function: "Front-Left Mecanum Motor PWM Phase" },
      { pin: "M2A / M2B", function: "Rear-Left Mecanum Motor PWM Phase" },
      { pin: "PWM1 / DIR1", function: "Opto-Isolated Inputs from Pico (Ch A)" },
      { pin: "PWM2 / DIR2", function: "Opto-Isolated Inputs from Pico (Ch B)" }
    ],
    researchNote:
      "Full NMOS H-bridge with optocoupled logic inputs to isolate motor electrical noise from the RP2040 microcontroller. Features onboard test pushbuttons and status LEDs."
  },
  {
    id: "driver-2",
    name: "Cytron MDD10A Motor Driver (Right)",
    subsystem: "actuation",
    rail: "12.8V Battery Bus",
    nominalV: "12.8 V Actuation Rail",
    voltageRange: "7 V – 30 VDC",
    quiescentW: 0.2,
    nominalW: 12.0,
    peakW: 80.0,
    connector: "Heavy-Duty M3 Green Screw Terminals",
    wireGauge: "16 AWG Power / 18 AWG Motor Leads",
    wireLengthM: 0.3,
    fuseProtection: "10A Continuous per channel (30A peak for 10s)",
    thermalThetaJA: 7.2,
    pinouts: [
      { pin: "POWER (+)", function: "12.8V Isolated Drive Rail" },
      { pin: "POWER (-)", function: "Power Ground PGND" },
      { pin: "M1A / M1B", function: "Front-Right Mecanum Motor PWM Phase" },
      { pin: "M2A / M2B", function: "Rear-Right Mecanum Motor PWM Phase" },
      { pin: "PWM1 / DIR1", function: "Opto-Isolated Inputs from Pico (Ch A)" },
      { pin: "PWM2 / DIR2", function: "Opto-Isolated Inputs from Pico (Ch B)" }
    ],
    researchNote:
      "Mirrored right-side dual H-bridge driving front-right and rear-right mecanum wheels with independent PWM speed and DIR directional control up to 20 kHz."
  },
  {
    id: "servo",
    name: "ST3215 12V Serial Bus Servo",
    subsystem: "actuation",
    rail: "12.8V Battery Bus",
    nominalV: "12.0 V Raw Bus",
    voltageRange: "9.0 V – 12.6 V",
    quiescentW: 0.15,
    nominalW: 3.5,
    peakW: 28.0,
    connector: "JST-EH 3-Pin Locking Header",
    wireGauge: "20 AWG Power / 24 AWG Half-Duplex UART",
    wireLengthM: 0.35,
    fuseProtection: "Internal current foldback & over-temperature shutdown",
    thermalThetaJA: 12.0,
    pinouts: [
      { pin: "PIN 1 (VCC)", function: "12V Direct Rail Input" },
      { pin: "PIN 2 (GND)", function: "Ground Reference" },
      { pin: "PIN 3 (DATA)", function: "Single-Wire Half-Duplex UART @ 1 Mbps" }
    ],
    researchNote:
      "30 kg·cm steel-gear smart servo directly powered from the 12V bus. Drives the mechanical LiDAR tilt yoke across +45° to -45° elevations with 12-bit magnetic encoder feedback."
  },
  {
    id: "pi5",
    name: "Raspberry Pi 5 (8 GB RAM)",
    subsystem: "compute",
    rail: "5.1V Logic Rail",
    nominalV: "5.10 V Regulated",
    voltageRange: "5.00 V – 5.25 V (Strict USB-C PD Profile)",
    quiescentW: 3.8,
    nominalW: 12.5,
    peakW: 25.0,
    connector: "USB-C PD / 40-Pin GPIO Header (Pins 2 & 4)",
    wireGauge: "18 AWG Low-Resistance Power Leads",
    wireLengthM: 0.2,
    fuseProtection: "Onboard PMIC with overvoltage & reverse-polarity protection",
    thermalThetaJA: 4.8,
    pinouts: [
      { pin: "Pin 2 & 4", function: "+5.1V DC In (Paralleled for 5A capacity)" },
      { pin: "Pin 6 & 9", function: "GND Ground Return" },
      { pin: "Pin 14 & 15", function: "UART0 TX/RX to Pico RP2040" },
      { pin: "USB 3.0", function: "CP2102 Bridge from RPLIDAR S2 Scanner" }
    ],
    researchNote:
      "Host computer executing ROS 2 Jazzy, Cartographer 2D/3D slice integration, and telemetry streaming. Kept continuously powered during emergency stops so system logs never corrupt."
  },
  {
    id: "pico",
    name: "Raspberry Pi Pico (RP2040)",
    subsystem: "compute",
    rail: "5.1V Logic Rail",
    nominalV: "5.10 V VBUS",
    voltageRange: "1.8 V – 5.5 V VBUS (Onboard 3.3V RT6150 regulator)",
    quiescentW: 0.08,
    nominalW: 0.15,
    peakW: 0.35,
    connector: "Gold Castellated Edge Pads / 0.1\" Headers",
    wireGauge: "24 AWG Signal Wires",
    wireLengthM: 0.15,
    fuseProtection: "Schottky Diode Reverse Voltage Protection",
    thermalThetaJA: 22.0,
    pinouts: [
      { pin: "Pin 39 (VSYS)", function: "+5.1V Input from Buck Converter" },
      { pin: "Pin 36 (3V3)", function: "+3.3V Clean Output to BNO085 IMU" },
      { pin: "Pin 38 (GND)", function: "Clean AGND Ground" },
      { pin: "GP0–GP7", function: "4-Channel PWM & DIR to Cytron MDD10A" },
      { pin: "GP8–GP15", function: "8x Quad Encoder Interrupt Inputs" }
    ],
    researchNote:
      "Real-time microcontroller running PI velocity loops at 100 Hz for all 4 mecanum wheels. Generates hardware PWM outputs and reads 8 high-speed encoder channels without jitter."
  },
  {
    id: "lidar",
    name: "Slamtec RPLIDAR S2 Scanner",
    subsystem: "sensing",
    rail: "5.1V Logic Rail",
    nominalV: "5.00 V Regulated",
    voltageRange: "4.80 V – 5.25 V",
    quiescentW: 0.4,
    nominalW: 2.8,
    peakW: 7.5,
    connector: "JST-XH 7-Pin Locking Header",
    wireGauge: "22 AWG Power / 26 AWG Data",
    wireLengthM: 0.4,
    fuseProtection: "Integrated Optical Interlock & Current Limiter",
    thermalThetaJA: 9.0,
    pinouts: [
      { pin: "VCC (5V)", function: "+5V Optical Core & Core Logic" },
      { pin: "MOTO_VCC", function: "+5V Scanner Motor Phase" },
      { pin: "GND", function: "Sensor Ground Reference" },
      { pin: "RX / TX", function: "High-Speed Serial Scan Packet Feed" },
      { pin: "MOTO_PWM", function: "Motor Speed Control (Target: 10 Hz)" }
    ],
    researchNote:
      "Time-of-flight (ToF) scanner spinning at 10 Hz with 32,000 laser points per second. Power is supplied via the 5.1V buck rail through flexible cabling to permit tilt motion."
  },
  {
    id: "imu",
    name: "BNO085 9-DOF IMU Sensor Hub",
    subsystem: "sensing",
    rail: "3.3V Sensor Rail",
    nominalV: "3.30 V Clean",
    voltageRange: "2.40 V – 3.60 V",
    quiescentW: 0.02,
    nominalW: 0.05,
    peakW: 0.08,
    connector: "JST-SH 1.0mm Qwiic / Stemma QT",
    wireGauge: "26 AWG Shielded I2C Bus",
    wireLengthM: 0.2,
    fuseProtection: "ESD Clamping Diodes on I2C Lines",
    thermalThetaJA: 45.0,
    pinouts: [
      { pin: "VCC", function: "+3.3V Clean Power from Pico RT6150" },
      { pin: "GND", function: "Clean Analog Ground AGND" },
      { pin: "SCL / SDA", function: "400 kHz Fast-Mode I2C Bus" },
      { pin: "INT", function: "Data Ready Interrupt Line to Pico" }
    ],
    researchNote:
      "ARM Cortex-M0+ coprocessor running Hillcrest Labs SH-2 sensor fusion firmware. Produces gravity-compensated quaternions at 400 Hz to calculate pitch tilt angles."
  }
];

export const AWG_AREAS_MM2: Record<string, number> = {
  "14 AWG": 2.08,
  "16 AWG": 1.31,
  "18 AWG": 0.82,
  "20 AWG": 0.52,
  "22 AWG": 0.33,
  "24 AWG": 0.20,
  "26 AWG": 0.13
};

export function calculateWireDrop(wireGauge: string, lengthM: number, currentA: number) {
  const awgMatch = wireGauge.match(/\d+\s*AWG/)?.[0] || "18 AWG";
  const area = (AWG_AREAS_MM2[awgMatch] ?? 0.82) * 1e-6; // m^2
  const resistance = (2 * lengthM * 1.68e-8) / area; // loop resistance
  return {
    resistanceMilliOhms: resistance * 1000,
    voltageDropV: currentA * resistance,
    voltageDropMv: currentA * resistance * 1000
  };
}

export interface BatterySoCStage {
  soc: number;
  openCircuitV: number;
  label: string;
  desc: string;
}

export const BATTERY_SOC_CURVES: BatterySoCStage[] = [
  { soc: 100, openCircuitV: 14.2, label: "100% Full", desc: "3.55V / Cell · Fresh Off Charger" },
  { soc: 75, openCircuitV: 12.8, label: "Nominal 12.8V", desc: "3.20V / Cell · Operating Life Plateau" },
  { soc: 20, openCircuitV: 12.0, label: "20% Reserve", desc: "3.00V / Cell · Reserve Knee Begins" },
  { soc: 0, openCircuitV: 10.0, label: "BMS Cutoff", desc: "2.50V / Cell · BMS Cutoff Triggered" }
];

export interface SubCircuit {
  id: string;
  name: string;
  voltage: string;
  defaultClosed: boolean;
}

export const SUB_CIRCUITS: SubCircuit[] = [
  { id: "drive-bus", name: "12.8V Actuation Bus", voltage: "12.8 V", defaultClosed: true },
  { id: "logic-bus", name: "5.10V Host Compute Bus", voltage: "5.10 V", defaultClosed: true },
  { id: "lidar-rail", name: "5.0V LiDAR Scanner Rail", voltage: "5.00 V", defaultClosed: true },
  { id: "tilt-rail", name: "12.0V Tilt Servo Rail", voltage: "12.0 V", defaultClosed: true },
  { id: "estop-loop", name: "Hardware E-Stop Interlock Loop", voltage: "Signal", defaultClosed: true }
];

// Mission Operational State Profiles
export interface MissionProfile {
  id: string;
  label: string;
  description: string;
  powerW: number;
  driveRailV: number;
  logicRailV: number;
  eStopActive: boolean;
}

export const MISSION_PROFILES: MissionProfile[] = [
  {
    id: "boot",
    label: "Cold Boot & Logic Init",
    description: "Pi 5 boots, Pico initializes GPIO, motors unenergized",
    powerW: 8.2,
    driveRailV: 12.8,
    logicRailV: 5.1,
    eStopActive: false
  },
  {
    id: "standby",
    label: "Standby Telemetry",
    description: "ROS 2 running, zero wheel torque, LiDAR parked",
    powerW: 5.8,
    driveRailV: 12.8,
    logicRailV: 5.1,
    eStopActive: false
  },
  {
    id: "sweep",
    label: "Active Sensor Sweep",
    description: "ST3215 tilting ±45°, S2 spinning at 10 Hz, rover stationary",
    powerW: 14.6,
    driveRailV: 12.8,
    logicRailV: 5.1,
    eStopActive: false
  },
  {
    id: "cruise",
    label: "Autonomous Mapping Cruise",
    description: "4 mecanum wheels cruising at 0.35 m/s + Cartographer SLAM",
    powerW: 28.4,
    driveRailV: 12.8,
    logicRailV: 5.1,
    eStopActive: false
  },
  {
    id: "thrust",
    label: "Max Holonomic Thrust",
    description: "High-friction acceleration, all 4 wheels near peak torque",
    powerW: 68.5,
    driveRailV: 12.8,
    logicRailV: 5.1,
    eStopActive: false
  },
  {
    id: "estop",
    label: "Emergency Stop (E-Stop)",
    description: "Drive bus isolated (0V), Pi 5 logging failsafe telemetry",
    powerW: 5.2,
    driveRailV: 0.0,
    logicRailV: 5.1,
    eStopActive: true
  }
];

// 3D Benchtop Electronics Testbed Coordinates (mm)
export const BENCHTOP_POSITIONS: Record<string, [number, number, number]> = {
  // Row 1: Energy & Safety Disconnect (Back row, Z = -150)
  battery: [-180, 50, -150],
  "battery-restraint": [-180, 88, -150],
  protection: [-60, 25, -150],
  disconnect: [40, 25, -150],
  estop: [140, 25, -150],

  // Row 2: Voltage Conversion, Logic & Coprocessors (Middle row, Z = 0)
  "converter-a": [-160, 25, 0],
  "converter-b": [-80, 25, 0],
  monitor: [0, 20, 0],
  pi5: [80, 25, 0],
  cooler: [80, 44, 0],
  microsd: [35, 22, 0],
  pico: [180, 22, 0],
  imu: [250, 20, 0],

  // Row 3: Drivetrain Actuation & Optical Scanning (Front row, Z = 150)
  "driver-1": [-180, 25, 150],
  "driver-2": [-80, 25, 150],
  servo: [20, 30, 150],
  "tilt-frame": [120, 40, 150],
  lidar: [120, 80, 150],

  // Mecanum Drive Motors arranged along outer margins
  "motor-front-left": [-280, 40, 90],
  "motor-rear-left": [-280, 40, 200],
  "motor-front-right": [260, 40, 90],
  "motor-rear-right": [260, 40, 200],
  "wheel-front-left": [-340, 40, 90],
  "wheel-rear-left": [-340, 40, 200],
  "wheel-front-right": [320, 40, 90],
  "wheel-rear-right": [320, 40, 200],
  "bracket-front-left": [-280, 60, 90],
  "bracket-rear-left": [-280, 60, 200],
  "bracket-front-right": [260, 60, 90],
  "bracket-rear-right": [260, 60, 200],

  // Structural chassis decks positioned underneath as reference surface
  base: [0, -15, 0],
  deck: [0, -5, 0],
  "rail-left": [0, 0, 250],
  "rail-right": [0, 0, -250]
};

// 3D Chassis Installed Positions (Default physical mounting coordinates)
export const CHASSIS_POSITIONS: Record<string, [number, number, number]> = Object.fromEntries(
  assemblyParts.map((p) => [p.id, [...p.home] as [number, number, number]])
);

export function PowerWorkbench() {
  const [selectedId, setSelectedId] = useState("battery");
  const [layoutMode, setLayoutMode] = useState<"benchtop" | "chassis">("benchtop");
  const [currentProfileId, setCurrentProfileId] = useState("cruise");
  const [batterySoCV, setBatterySoCV] = useState(12.8); // Nominal plateau
  const [view3D, setView3D] = useState<"isometric" | "top" | "front">("isometric");
  const [mode, setMode] = useState<"orbit" | "move" | "connect">("orbit");
  const [explodeRatio, setExplodeRatio] = useState(0);

  // Dynamic simulation parameters
  const [simDemandW, setSimDemandW] = useState(28.4);
  const [customWireGauge, setCustomWireGauge] = useState<Record<string, string>>({});
  const [customWireLength, setCustomWireLength] = useState<Record<string, number>>({});
  const [ambientTempC] = useState(25);
  const [inspectorTab, setInspectorTab] = useState<"telemetry" | "wire" | "pinouts">("telemetry");
  const [inrushBurstActive, setInrushBurstActive] = useState(false);

  // Branch Circuit Breakers (Interactive Control)
  const [breakers, setBreakers] = useState({
    driveBus: true,
    tiltServo: true,
    lidarScanner: true,
    pi5Compute: true,
    estopClosed: true
  });

  const activePositions = useMemo(() => {
    return layoutMode === "benchtop" ? BENCHTOP_POSITIONS : CHASSIS_POSITIONS;
  }, [layoutMode]);

  const activeProfile = useMemo(
    () => MISSION_PROFILES.find((p) => p.id === currentProfileId) || MISSION_PROFILES[3],
    [currentProfileId]
  );

  const selectedNode = useMemo(() => {
    return (
      ROVER_ELECTRONICS.find((n) => n.id === selectedId) ||
      (selectedId === "protection" ? ROVER_ELECTRONICS.find((n) => n.id === "fuse-block") : null) ||
      ROVER_ELECTRONICS[0]
    );
  }, [selectedId]);

  const isEstopCutoff = activeProfile.eStopActive || !breakers.estopClosed;
  const basePowerW = inrushBurstActive ? 180.0 : simDemandW;

  const effectiveLoadW = useMemo(() => {
    if (isEstopCutoff) {
      return (breakers.pi5Compute ? 4.5 : 0) + 0.35 + (breakers.lidarScanner ? 0.35 : 0);
    }
    let total = 0;
    if (breakers.pi5Compute) total += basePowerW * 0.42;
    total += 0.2;
    if (breakers.lidarScanner) total += basePowerW * 0.12;
    if (breakers.tiltServo) total += basePowerW * 0.10;
    if (breakers.driveBus) total += basePowerW * 0.36;
    return Math.max(total, 0.5);
  }, [basePowerW, breakers, isEstopCutoff]);

  const batterySol = useMemo(
    () => batteryCircuit(batterySoCV, 0.08, effectiveLoadW),
    [batterySoCV, effectiveLoadW]
  );
  const loadedV = batterySol ? batterySol.loadedV : batterySoCV;
  const batteryCurrentA = batterySol ? batterySol.currentA : effectiveLoadW / batterySoCV;
  const estRuntimeHours = effectiveLoadW > 0 ? 153.6 / effectiveLoadW : 999;

  const logicLoadW = breakers.pi5Compute ? Math.min(effectiveLoadW * 0.45, 24.0) : 0.8;
  const logicA = logicLoadW / 5.1;
  const buckSol = useMemo(
    () => converter(loadedV, 5.1, logicA, 0.94, 8.0),
    [loadedV, logicA]
  );
  const buckLossW = buckSol ? buckSol.lossW : 0.8;
  const buckTemp = useMemo(() => thermal(ambientTempC, buckLossW, 14.0, 85), [ambientTempC, buckLossW]);

  const nodeCurrentA = useMemo(() => {
    if (
      isEstopCutoff &&
      selectedNode.rail === "12.8V Battery Bus" &&
      selectedNode.id !== "battery" &&
      selectedNode.id !== "fuse-block" &&
      selectedNode.id !== "protection" &&
      selectedNode.id !== "disconnect" &&
      selectedNode.id !== "converter-a"
    ) {
      return 0.0;
    }
    const nodeV = selectedNode.rail.startsWith("5.1V") ? 5.1 : selectedNode.rail.startsWith("3.3V") ? 3.3 : loadedV;
    const loadShareW = (selectedNode.nominalW / 28.4) * effectiveLoadW;
    return nodeV > 0 ? loadShareW / nodeV : 0;
  }, [isEstopCutoff, selectedNode, loadedV, effectiveLoadW]);

  const activeWireGauge = customWireGauge[selectedNode.id] || selectedNode.wireGauge;
  const activeWireLength = customWireLength[selectedNode.id] || selectedNode.wireLengthM;

  const wireCalc = useMemo(() => {
    return calculateWireDrop(activeWireGauge, activeWireLength, nodeCurrentA);
  }, [activeWireGauge, activeWireLength, nodeCurrentA]);

  const cableDropMv = wireCalc.voltageDropMv;
  const deliveredVoltageV = useMemo(() => {
    const nominalRailV = selectedNode.rail.startsWith("5.1V") ? 5.1 : selectedNode.rail.startsWith("3.3V") ? 3.3 : loadedV;
    return isEstopCutoff && selectedNode.rail === "12.8V Battery Bus" && selectedNode.id !== "battery"
      ? 0.0
      : Math.max(0, nominalRailV - wireCalc.voltageDropV);
  }, [isEstopCutoff, selectedNode, loadedV, wireCalc.voltageDropV]);

  const nodeTemp = useMemo(() => {
    const lossW = nodeCurrentA * nodeCurrentA * 0.05 + selectedNode.quiescentW;
    return thermal(ambientTempC, lossW, selectedNode.thermalThetaJA, 85);
  }, [ambientTempC, nodeCurrentA, selectedNode]);

  const active3DConnections = useMemo(() => {
    if (!isEstopCutoff) return POWER_CONNECTIONS;
    return POWER_CONNECTIONS.filter((c) => {
      const isDriveBus =
        c.toPart === "driver-1" ||
        c.toPart === "driver-2" ||
        c.toPart === "servo" ||
        c.fromPart === "driver-1" ||
        c.fromPart === "driver-2";
      return !isDriveBus;
    });
  }, [isEstopCutoff]);

  const isKinematicsRunning =
    !isEstopCutoff && (currentProfileId === "cruise" || currentProfileId === "sweep" || currentProfileId === "thrust");

  const DOCK_ITEMS = [
    { id: "battery", label: "Battery", rail: "12.8V" },
    { id: "protection", label: "20A Fuse", rail: "12.8V" },
    { id: "disconnect", label: "Switch", rail: "12.8V" },
    { id: "estop", label: "E-Stop", rail: "Safety" },
    { id: "converter-a", label: "5.1V Buck", rail: "5.1V" },
    { id: "pi5", label: "Pi 5", rail: "5.1V" },
    { id: "pico", label: "Pico", rail: "5.1V" },
    { id: "lidar", label: "S2 LiDAR", rail: "5.0V" },
    { id: "servo", label: "Tilt Servo", rail: "12.0V" },
    { id: "driver-1", label: "Driver 1", rail: "12.8V" },
    { id: "driver-2", label: "Driver 2", rail: "12.8V" },
    { id: "imu", label: "IMU", rail: "3.3V" }
  ];

  return (
    <div className={styles.workbench}>
      {/* ============================================================= */}
      {/* TOOLBAR CONTROLS (Decluttered & Studio Standard)              */}
      {/* ============================================================= */}
      <div className={styles.toolbar}>
        {/* Left tools: Layout Selection & Safety Interlock */}
        <div className={styles.tools}>
          <div className={styles.toolGroup}>
            <button
              type="button"
              aria-pressed={layoutMode === "benchtop"}
              onClick={() => setLayoutMode("benchtop")}
            >
              Benchtop Testbed
            </button>
            <button
              type="button"
              aria-pressed={layoutMode === "chassis"}
              onClick={() => setLayoutMode("chassis")}
            >
              Chassis Twin
            </button>
          </div>

          <div className={styles.toolGroup}>
            <button
              type="button"
              aria-pressed={isEstopCutoff}
              onClick={() => {
                const next = !breakers.estopClosed;
                setBreakers((b) => ({ ...b, estopClosed: next }));
                if (currentProfileId === "estop") setCurrentProfileId("cruise");
              }}
              className={
                isEstopCutoff
                  ? "!bg-[#991F1F] !text-white font-bold"
                  : "text-[#991F1F] hover:!bg-[#FDE8E8]"
              }
              title="Toggle emergency safety contactor"
            >
              {isEstopCutoff ? "E-Stop: Tripped (0V)" : "E-Stop: Energized"}
            </button>
          </div>
        </div>

        {/* Right tools: Modes & Mission Profiles */}
        <div className={styles.tools}>
          <div className={styles.toolGroup}>
            {(["orbit", "move", "connect"] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => setMode(m)}
              >
                {m === "orbit" ? "Orbit" : m === "move" ? "Move" : "Wire"}
              </button>
            ))}
          </div>

          <div className={styles.toolGroup}>
            {MISSION_PROFILES.slice(1, 5).map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={currentProfileId === p.id && !isEstopCutoff}
                onClick={() => {
                  setCurrentProfileId(p.id);
                  setSimDemandW(p.powerW);
                  setBreakers((b) => ({ ...b, estopClosed: true }));
                }}
              >
                {p.label.split(" ")[0]}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setBreakers({
                  driveBus: true,
                  tiltServo: true,
                  lidarScanner: true,
                  pi5Compute: true,
                  estopClosed: true
                });
                setCurrentProfileId("cruise");
                setBatterySoCV(12.8);
                setSimDemandW(28.4);
                setExplodeRatio(0);
                setLayoutMode("benchtop");
              }}
              title="Reset power architecture to nominal state"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================= */}
      {/* 3D COMPONENT STAGE & ELECTRONICS INSPECTOR                    */}
      {/* ============================================================= */}
      <div className={styles.canvasRow}>
        <div className={styles.stage}>
          <AssemblyStage
            parts={assemblyParts}
            positions={activePositions}
            connections={active3DConnections}
            selectedId={selectedId === "fuse-block" ? "protection" : selectedId}
            onSelect={setSelectedId}
            onMove={() => {}}
            onPort={() => {}}
            exploded={explodeRatio > 0.05}
            explodeAmount={explodeRatio}
            view={view3D}
            mode={mode}
            activeGroup="all"
            running={isKinematicsRunning}
          />

          {/* Compact Explode Separation Scrubbing Pill */}
          <div className={styles.explodeOverlay}>
            <span>Explode</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={explodeRatio}
              style={{ touchAction: "none" }}
              onChange={(e) => setExplodeRatio(parseFloat(e.target.value))}
              className={styles.explodeSlider}
            />
            <span className={styles.explodeVal}>{Math.round(explodeRatio * 100)}%</span>
          </div>

          {/* Live Stage Electrical Telemetry Pill */}
          <div className={styles.stageLabel}>
            <div className="flex items-center gap-2 font-mono text-[10px] text-[#68655E]">
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${
                  isEstopCutoff ? "bg-[#991F1F]" : "bg-[#1F6B42]"
                }`}
              />
              <span>
                {isEstopCutoff
                  ? "SAFETY CUTOFF: 12.8V Drive Bus Isolated (0.00 V) · Logic Preserved on 5.1V"
                  : `12.8V Bus: ${loadedV.toFixed(2)}V (${batteryCurrentA.toFixed(2)}A) · 5.1V Rail: ${logicA.toFixed(2)}A · Total: ${effectiveLoadW.toFixed(1)}W`}
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[10px] text-[#68655E]">
              <span>153.6 Wh LiFePO4</span>
              <span>·</span>
              <strong className="text-[#111319] tabular-nums">
                {isEstopCutoff ? "Failsafe Standby" : `${estRuntimeHours.toFixed(1)}h Runtime`}
              </strong>
            </div>
          </div>

          {/* 3D Component Quick-Jump Dock Strip */}
          <nav className={styles.componentDock} aria-label="3D Component Quick Selectors">
            {DOCK_ITEMS.map((item) => {
              const isSelected = selectedId === item.id || (item.id === "protection" && selectedId === "fuse-block");
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelectedId(item.id)}
                  className={styles.dockPill}
                >
                  <span>{item.label}</span>
                  <span className={styles.dockBadge}>{item.rail}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Electronics Specifications & Simulation HUD */}
        <aside className={styles.inspector} aria-label="Electronics node specifications">
          <p className={styles.kicker}>
            {selectedNode.subsystem.toUpperCase()} · {selectedNode.rail}
          </p>
          <h2>{selectedNode.name}</h2>
          <p className={styles.model}>{selectedNode.connector}</p>

          <div className={styles.provenance}>
            {isEstopCutoff &&
            selectedNode.rail === "12.8V Battery Bus" &&
            selectedNode.id !== "battery" &&
            selectedNode.id !== "fuse-block" &&
            selectedNode.id !== "protection" &&
            selectedNode.id !== "disconnect" &&
            selectedNode.id !== "converter-a"
              ? "DE-ENERGIZED BY E-STOP"
              : "NOMINAL OPERATING ENVELOPE"}
          </div>

          <p className={styles.note}>{selectedNode.researchNote}</p>

          {selectedNode.datasheetUrl && (
            <a
              href={selectedNode.datasheetUrl}
              target="_blank"
              rel="noreferrer"
              className={styles.source}
            >
              Datasheet reference
            </a>
          )}

          {/* Clean Inspector Mode Sub-Tabs */}
          <div className={styles.inspectorTabs}>
            <button
              type="button"
              aria-pressed={inspectorTab === "telemetry"}
              onClick={() => setInspectorTab("telemetry")}
            >
              Telemetry
            </button>
            <button
              type="button"
              aria-pressed={inspectorTab === "wire"}
              onClick={() => setInspectorTab("wire")}
            >
              Harness Sizing
            </button>
            <button
              type="button"
              aria-pressed={inspectorTab === "pinouts"}
              onClick={() => setInspectorTab("pinouts")}
            >
              Pinouts
            </button>
          </div>

          {/* TAB 1: LIVE TELEMETRY & PHYSICAL PERFORMANCE */}
          {inspectorTab === "telemetry" && (
            <>
              <div className={styles.placement}>
                <span>Terminal Voltage (Loaded)</span>
                <strong>
                  {isEstopCutoff &&
                  selectedNode.rail === "12.8V Battery Bus" &&
                  selectedNode.id !== "battery" &&
                  selectedNode.id !== "fuse-block" &&
                  selectedNode.id !== "protection" &&
                  selectedNode.id !== "disconnect" &&
                  selectedNode.id !== "converter-a"
                    ? "0.00 V (Isolated)"
                    : `${deliveredVoltageV.toFixed(2)} V (${(selectedNode.rail.startsWith("5.1V") ? 5.1 : loadedV).toFixed(2)}V bus)`}
                </strong>
              </div>

              <div className={styles.placement}>
                <span>Operating Current & Power</span>
                <strong>
                  {nodeCurrentA.toFixed(2)} A ({(nodeCurrentA * (selectedNode.rail.startsWith("5.1V") ? 5.1 : loadedV)).toFixed(1)} W)
                </strong>
              </div>

              <div className={styles.placement}>
                <span>Estimated Junction Temp</span>
                <strong>
                  {nodeTemp ? `${nodeTemp.estimatedTemp.toFixed(1)} °C (+${nodeTemp.margin.toFixed(0)}°C headroom)` : "Normal"}
                </strong>
              </div>

              {/* LiFePO4 State of Charge Selector (Compact Pill Group) */}
              <div className={styles.simBox}>
                <div className={styles.simHeader}>
                  <span>Battery Chemistry SoC</span>
                  <span className="font-mono text-[9px] text-[#111319]">{batterySoCV.toFixed(1)} V</span>
                </div>
                <div className={styles.socPills}>
                  {BATTERY_SOC_CURVES.map((item) => (
                    <button
                      key={item.openCircuitV}
                      type="button"
                      aria-pressed={batterySoCV === item.openCircuitV}
                      onClick={() => setBatterySoCV(item.openCircuitV)}
                      className={styles.socPill}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Mission Load Simulation Slider */}
              <div className={styles.simBox}>
                <div className={styles.simHeader}>
                  <span>Load Demand</span>
                  <span className="tabular-nums font-mono text-[9px] text-[#111319]">
                    {simDemandW.toFixed(1)} W
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="75"
                  step="0.5"
                  value={simDemandW}
                  onChange={(e) => setSimDemandW(parseFloat(e.target.value))}
                  className={styles.explodeSlider}
                />
              </div>

              {/* Inrush / Motor Stall Burst Test */}
              <button
                type="button"
                className={styles.seat}
                onClick={() => {
                  setInrushBurstActive(true);
                  setTimeout(() => setInrushBurstActive(false), 800);
                }}
              >
                {inrushBurstActive ? "Inrush Surge Active (180W)..." : "Simulate 24A Inrush / Stall Transient"}
              </button>
            </>
          )}

          {/* TAB 2: HARNESS SIZING & CABLE LOSS SIMULATOR */}
          {inspectorTab === "wire" && (
            <div className={styles.simBox}>
              <div className={styles.simHeader}>
                <span>Wire Gauge</span>
                <span className="font-mono text-[9px] text-[#111319]">{activeWireGauge}</span>
              </div>
              <div className={styles.awgGrid}>
                {["14 AWG", "16 AWG", "18 AWG", "20 AWG", "22 AWG", "24 AWG", "26 AWG"].map((awg) => (
                  <button
                    key={awg}
                    type="button"
                    aria-pressed={activeWireGauge === awg}
                    onClick={() => {
                      setCustomWireGauge((prev) => ({ ...prev, [selectedNode.id]: awg }));
                    }}
                    className={styles.awgPill}
                  >
                    {awg}
                  </button>
                ))}
              </div>

              <div className={styles.simHeader} style={{ marginTop: "6px" }}>
                <span>Run Length</span>
                <span className="font-mono text-[9px] text-[#111319]">
                  {activeWireLength.toFixed(2)} m
                </span>
              </div>
              <input
                type="range"
                min="0.05"
                max="1.50"
                step="0.05"
                value={activeWireLength}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setCustomWireLength((prev) => ({ ...prev, [selectedNode.id]: val }));
                }}
                className={styles.explodeSlider}
              />

              <div className={styles.placement}>
                <span>Loop Resistance</span>
                <strong>{wireCalc.resistanceMilliOhms.toFixed(1)} mΩ</strong>
              </div>
              <div className={styles.placement}>
                <span>Voltage Drop (ΔV)</span>
                <strong>{wireCalc.voltageDropMv.toFixed(1)} mV ({((wireCalc.voltageDropV / (loadedV || 12.8)) * 100).toFixed(2)}%)</strong>
              </div>
              <div className={styles.placement}>
                <span>I²R Cable Heat Loss</span>
                <strong>{(nodeCurrentA * nodeCurrentA * (wireCalc.resistanceMilliOhms / 1000)).toFixed(3)} W</strong>
              </div>
            </div>
          )}

          {/* TAB 3: TERMINAL PINOUT MATRIX */}
          {inspectorTab === "pinouts" && (
            <div className={styles.pinoutGrid}>
              {selectedNode.pinouts.map((p) => (
                <div key={p.pin} className={styles.pinoutRow}>
                  <span>{p.pin}</span>
                  <span>{p.function}</span>
                </div>
              ))}
            </div>
          )}

          {/* Interactive Branch Cutoff Control */}
          <button
            type="button"
            className={styles.seat}
            onClick={() => {
              if (selectedNode.id === "estop" || selectedNode.id === "contactor") {
                const next = !breakers.estopClosed;
                setBreakers((b) => ({ ...b, estopClosed: next }));
              } else if (selectedNode.id === "driver-1" || selectedNode.id === "driver-2") {
                setBreakers((b) => ({ ...b, driveBus: !b.driveBus }));
              } else if (selectedNode.id === "servo") {
                setBreakers((b) => ({ ...b, tiltServo: !b.tiltServo }));
              } else if (selectedNode.id === "lidar") {
                setBreakers((b) => ({ ...b, lidarScanner: !b.lidarScanner }));
              }
            }}
          >
            {selectedNode.id === "estop" || selectedNode.id === "contactor"
              ? isEstopCutoff
                ? "Reset Safety Interlock"
                : "Simulate E-Stop Tripping"
              : "Toggle Branch Breaker"}
          </button>
        </aside>
      </div>
    </div>
  );
}

export default PowerWorkbench;
