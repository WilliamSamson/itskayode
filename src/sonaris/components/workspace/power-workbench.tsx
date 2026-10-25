"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { assemblyParts, type AssemblyConnection } from "@/sonaris/lib/sonaris-assembly";
import {
  HARNESS_BUNDLE_SPECS,
  type FaultPoint,
  type NodeLiveTelemetry
} from "./power-stage";
import styles from "./power-workbench.module.css";

const PowerStage = dynamic(() => import("./power-stage"), {
  ssr: false,
  loading: () => (
    <div className="relative flex h-full min-h-[280px] w-full flex-col items-center justify-center gap-1.5 overflow-hidden bg-[var(--sonaris-deck)] font-mono text-[10.5px] text-[var(--sonaris-studio-muted)] select-none">
      <strong className="text-[11px] tracking-wider text-[var(--sonaris-studio-ink)] uppercase">
        SONARIS · 3D Electrical &amp; Harness Bench
      </strong>
      <span className="text-[9.5px]">Initializing Multi-Conductor Harness &amp; Thermal Solver</span>
    </div>
  )
});

export interface PinoutEntry {
  pin: string;
  function: string;
}

export interface ElectronicsNode {
  id: string;
  name: string;
  subsystem: "Energy" | "Protection" | "Conversion" | "Actuation" | "Compute" | "Sensing";
  rail: "12.8V Raw Bus" | "12.8V Drive Bus" | "5.1V Logic Rail" | "5.0V Sensor Rail" | "3.3V I2C Bus";
  nominalV: number;
  nominalA: number;
  peakA: number;
  quiescentW: number;
  nominalW: number;
  peakW: number;
  connector: string;
  wireGauge: string;
  wireLengthM: number;
  pinouts: PinoutEntry[];
  thermalThetaJA: number;
  researchNote: string;
  datasheetUrl?: string;
}

export interface MissionProfile {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  powerW: number;
  driveRailV: number;
  logicRailV: number;
  eStopActive: boolean;
}

export interface BatterySoCPoint {
  soc: number;
  openCircuitV: number;
  loadedNominalV: number;
  internalResistanceMilliOhms: number;
  status: string;
}

export interface SubCircuitBreaker {
  id: string;
  label: string;
  fuseRatingA: number;
  rail: string;
  defaultClosed: boolean;
}

const AWG_MILLIOHMS_PER_METER: Record<string, number> = {
  "12 AWG": 5.21,
  "14 AWG": 8.28,
  "16 AWG": 13.17,
  "18 AWG": 20.95,
  "20 AWG": 33.31,
  "22 AWG": 52.96,
  "24 AWG": 84.22,
  "26 AWG": 133.9
};

const AWG_MAX_CONTINUOUS_AMPS: Record<string, number> = {
  "12 AWG": 25.0,
  "14 AWG": 15.0,
  "16 AWG": 10.0,
  "18 AWG": 7.0,
  "20 AWG": 5.0,
  "22 AWG": 3.0,
  "24 AWG": 2.0,
  "26 AWG": 1.0
};

export function calculateWireDrop(
  gauge: string,
  lengthMeters: number,
  currentAmps: number
): {
  resistanceMilliOhms: number;
  voltageDropV: number;
  powerLossW: number;
} {
  const rho = AWG_MILLIOHMS_PER_METER[gauge] ?? 13.17;
  const resistanceMilliOhms = Number((rho * lengthMeters).toFixed(3));
  const loopResistanceOhms = (resistanceMilliOhms * 2) / 1000;
  const voltageDropV = Number((currentAmps * loopResistanceOhms).toFixed(4));
  const powerLossW = Number((currentAmps * currentAmps * loopResistanceOhms).toFixed(4));
  return {
    resistanceMilliOhms,
    voltageDropV,
    powerLossW
  };
}

export const BATTERY_SOC_CURVES: BatterySoCPoint[] = [
  {
    soc: 100,
    openCircuitV: 14.2,
    loadedNominalV: 13.6,
    internalResistanceMilliOhms: 28,
    status: "Full Charge (LiFePO4 Absorption Complete)"
  },
  {
    soc: 75,
    openCircuitV: 12.8,
    loadedNominalV: 12.6,
    internalResistanceMilliOhms: 30,
    status: "Nominal Flat Plateau (4S LiFePO4 Operating Zone)"
  },
  {
    soc: 50,
    openCircuitV: 12.7,
    loadedNominalV: 12.4,
    internalResistanceMilliOhms: 33,
    status: "Mid-Mission Plateau"
  },
  {
    soc: 20,
    openCircuitV: 12.2,
    loadedNominalV: 11.8,
    internalResistanceMilliOhms: 42,
    status: "Low Reserve Warning (Return to Dock)"
  },
  {
    soc: 0,
    openCircuitV: 10.0,
    loadedNominalV: 9.6,
    internalResistanceMilliOhms: 68,
    status: "BMS Under-Voltage Cutoff (10.0V Trip)"
  }
];

export const SUB_CIRCUITS: SubCircuitBreaker[] = [
  {
    id: "drive-bus",
    label: "12.8V Mecanum Drive Bus (2x MDD10A)",
    fuseRatingA: 20,
    rail: "12.8V Drive Bus",
    defaultClosed: true
  },
  {
    id: "tilt-servo",
    label: "ST3215 12V Serial Bus Tilt Servo",
    fuseRatingA: 5,
    rail: "12.8V Drive Bus",
    defaultClosed: true
  },
  {
    id: "logic-bus",
    label: "5.1V Compute Rail (Pi 5 + Pico)",
    fuseRatingA: 5,
    rail: "5.1V Logic Rail",
    defaultClosed: true
  },
  {
    id: "lidar-rail",
    label: "5.0V Sensor Rail (RPLIDAR S2 + BNO085)",
    fuseRatingA: 3,
    rail: "5.0V Sensor Rail",
    defaultClosed: true
  }
];

export const ROVER_ELECTRONICS: ElectronicsNode[] = [
  {
    id: "battery",
    name: "Bioenno BLF-1212AS 4S LiFePO4 Pack (12.8V 12Ah)",
    subsystem: "Energy",
    rail: "12.8V Raw Bus",
    nominalV: 12.8,
    nominalA: 2.2,
    peakA: 24.0,
    quiescentW: 0.1,
    nominalW: 28.4,
    peakW: 153.6,
    connector: "Anderson Powerpole 30A (2-Wire)",
    wireGauge: "12 AWG",
    wireLengthM: 0.22,
    pinouts: [
      { pin: "W1 · BATT+ (Red)", function: "+12.8V Nominal (153.6Wh) to 20A Main Fuse" },
      { pin: "W2 · BATT- (Blk)", function: "Primary Chassis Star Ground Return" },
      { pin: "BMS Internal", function: "24A Cont. / 40A Peak Over-Current Protection" }
    ],
    thermalThetaJA: 3.2,
    researchNote:
      "Selected for intrinsic thermal stability (LiFePO4) and flat 12.8V discharge plateau across 85% of capacity. Integrated BMS provides cell balancing and short-circuit cutoff.",
    datasheetUrl: "https://www.bioennopower.com/pages/specification-sheet-for-blf-1212as"
  },
  {
    id: "fuse-block",
    name: "Primary 20A ATC Blade Fuse & Branch Block",
    subsystem: "Protection",
    rail: "12.8V Raw Bus",
    nominalV: 12.8,
    nominalA: 2.2,
    peakA: 20.0,
    quiescentW: 0.05,
    nominalW: 0.35,
    peakW: 2.4,
    connector: "M5 Stud Input / Quick-Disconnect (2-Wire)",
    wireGauge: "12 AWG",
    wireLengthM: 0.16,
    pinouts: [
      { pin: "W1 · IN+ Stud", function: "Unfused +12.8V from BLF-1212AS Pack" },
      { pin: "F1 · 20A Main", function: "Feeds Drive Disconnect & Contactor Bus" },
      { pin: "F2 · Sense Tap", function: "Feeds INA226 High-Side Bus Shunt Monitor" }
    ],
    thermalThetaJA: 8.5,
    researchNote:
      "Provides hard over-current protection within 15cm of the battery positive terminal. Sized at 20A continuous to clear nominal cruise while blowing before wiring insulation damage."
  },
  {
    id: "monitor",
    name: "INA226 High-Side Bus Voltage & Current Monitor",
    subsystem: "Sensing",
    rail: "5.0V Sensor Rail",
    nominalV: 12.8,
    nominalA: 0.015,
    peakA: 0.03,
    quiescentW: 0.04,
    nominalW: 0.08,
    peakW: 0.15,
    connector: "3-Pin Kelvin Shunt Tap + I2C Telemetry",
    wireGauge: "22 AWG",
    wireLengthM: 0.14,
    pinouts: [
      { pin: "W1 · VBUS+", function: "12.8V High-Side Voltage Sense Tap" },
      { pin: "W2 · VSHUNT-", function: "2mΩ Precision Shunt Differential Sense" },
      { pin: "W3 · GND", function: "Power & Telemetry Reference Ground" }
    ],
    thermalThetaJA: 35.0,
    researchNote:
      "Measures live 12.8V bus voltage, current draw, and accumulated coulomb state-of-charge so the rover can trigger low-reserve return before BMS cutoff."
  },
  {
    id: "disconnect",
    name: "Master Rotary Battery Isolation Switch",
    subsystem: "Protection",
    rail: "12.8V Raw Bus",
    nominalV: 12.8,
    nominalA: 2.2,
    peakA: 30.0,
    quiescentW: 0.02,
    nominalW: 0.2,
    peakW: 1.5,
    connector: "M6 Copper Terminal Studs (2-Wire)",
    wireGauge: "12 AWG",
    wireLengthM: 0.16,
    pinouts: [
      { pin: "W1 · LINE IN", function: "Fused +12.8V from 20A Main Fuse" },
      { pin: "W2 · LOAD OUT", function: "Switched +12.8V to Contactor & Buck Rails" }
    ],
    thermalThetaJA: 5.0,
    researchNote:
      "Physical lock-out / tag-out (LOTO) service disconnect enabling safe benchtop debugging and multimeter continuity checks with zero parasitic drain."
  },
  {
    id: "estop",
    name: "NC Mushroom Emergency-Stop Interlock Switch",
    subsystem: "Protection",
    rail: "12.8V Drive Bus",
    nominalV: 12.8,
    nominalA: 0.15,
    peakA: 1.0,
    quiescentW: 0.0,
    nominalW: 0.15,
    peakW: 0.5,
    connector: "Insulated Spade Terminals (2-Wire NC)",
    wireGauge: "20 AWG",
    wireLengthM: 0.35,
    pinouts: [
      { pin: "W1 · NC Pin 11", function: "+12.8V Control Loop Feed" },
      { pin: "W2 · NC Pin 12", function: "Contactor Coil Hold Signal (Opens on Strike)" }
    ],
    thermalThetaJA: 14.0,
    researchNote:
      "Wired Normally-Closed (NC) in series with the drive contactor coil. Striking the mushroom head physically severs power to all 4 Mecanum motors and the tilt servo while keeping Pi 5 + Pico alive to log diagnostics."
  },
  {
    id: "contactor",
    name: "High-Current Drive Bus Relay / Contactor",
    subsystem: "Protection",
    rail: "12.8V Drive Bus",
    nominalV: 12.8,
    nominalA: 1.8,
    peakA: 30.0,
    quiescentW: 0.9,
    nominalW: 1.2,
    peakW: 2.8,
    connector: "4-Pin High-Current Relay Socket",
    wireGauge: "14 AWG",
    wireLengthM: 0.2,
    pinouts: [
      { pin: "W1 · Pin 30 (COM)", function: "+12.8V Fused Supply Input" },
      { pin: "W2 · Pin 87 (NO)", function: "+12.8V Drive Bus to MDD10A #1/#2 & ST3215" },
      { pin: "W3 · Pin 85/86", function: "E-Stop Series Coil Hold & Return" }
    ],
    thermalThetaJA: 11.0,
    researchNote:
      "Provides galvanic isolation of the 12.8V actuator bus whenever the E-Stop loop opens, ensuring zero motor creep or back-EMF hazard during emergency stops."
  },
  {
    id: "converter-a",
    name: "Synchronous 5.1V 5A Buck Converter (Compute Rail)",
    subsystem: "Conversion",
    rail: "5.1V Logic Rail",
    nominalV: 5.1,
    nominalA: 2.1,
    peakA: 5.0,
    quiescentW: 0.35,
    nominalW: 10.7,
    peakW: 25.5,
    connector: "Screw Terminal Block (2-Wire In / 2-Wire Out)",
    wireGauge: "16 AWG",
    wireLengthM: 0.2,
    pinouts: [
      { pin: "W1/W2 · VIN+/VIN-", function: "+12.8V Switched Input & Ground (9–36V Wide)" },
      { pin: "W1/W2 · VOUT+/GND", function: "Regulated +5.1V ±1% to Pi 5, Cooler & Pico" }
    ],
    thermalThetaJA: 12.4,
    researchNote:
      "94% efficient synchronous step-down regulator tuned to 5.1V to compensate for USB-C / header cable drop under Raspberry Pi 5 peak compute bursts."
  },
  {
    id: "converter-b",
    name: "Isolated 5.0V / 3.3V Buck Converter (Sensor Rail)",
    subsystem: "Conversion",
    rail: "5.0V Sensor Rail",
    nominalV: 5.0,
    nominalA: 0.65,
    peakA: 2.5,
    quiescentW: 0.2,
    nominalW: 3.25,
    peakW: 12.5,
    connector: "Screw Terminal Block (2-Wire In / 2-Wire Out)",
    wireGauge: "18 AWG",
    wireLengthM: 0.22,
    pinouts: [
      { pin: "W1/W2 · VIN+/VIN-", function: "+12.8V Switched Input from Contactor" },
      { pin: "W1/W2 · VOUT+/GND", function: "Clean +5.0V Sensor Bus to RPLIDAR S2 & BNO085" }
    ],
    thermalThetaJA: 14.5,
    researchNote:
      "Separates optical rangefinder and IMU power from compute and H-bridge switching transients, preventing scan range jitter during Mecanum acceleration."
  },
  {
    id: "driver-1",
    name: "Cytron MDD10A Dual 10A H-Bridge #1 (Left Pair)",
    subsystem: "Actuation",
    rail: "12.8V Drive Bus",
    nominalV: 12.8,
    nominalA: 1.1,
    peakA: 20.0,
    quiescentW: 0.15,
    nominalW: 7.2,
    peakW: 120.0,
    connector: "Barrier Terminal (2-Wire Power + 2x 2-Wire Motor + 5-Pin PWM)",
    wireGauge: "14 AWG",
    wireLengthM: 0.28,
    pinouts: [
      { pin: "W1/W2 · VMOT / GND", function: "+12.8V Drive Bus Supply (14 AWG)" },
      { pin: "OUT1 · M1+/M1- (2W)", function: "Front-Left Pololu #4694 Armature (16 AWG)" },
      { pin: "OUT2 · M2+/M2- (2W)", function: "Rear-Left Pololu #4694 Armature (16 AWG)" },
      { pin: "W1..W5 · Logic", function: "PWM1, DIR1, PWM2, DIR2, GND from Pi Pico" }
    ],
    thermalThetaJA: 7.8,
    researchNote:
      "Drives the Front-Left and Rear-Left Pololu #4694 37D gearmotors via 20kHz sign-magnitude PWM. Note: Pololu #4694 motors are 24V-nominal running derated at 12.8V (~150 RPM, high thermal safety margin); 4-wire encoders route directly to Pi Pico PIO.",
    datasheetUrl: "https://www.cytron.io/p-10amp-5v-30v-dc-motor-driver-2-channels"
  },
  {
    id: "driver-2",
    name: "Cytron MDD10A Dual 10A H-Bridge #2 (Right Pair)",
    subsystem: "Actuation",
    rail: "12.8V Drive Bus",
    nominalV: 12.8,
    nominalA: 1.1,
    peakA: 20.0,
    quiescentW: 0.15,
    nominalW: 7.2,
    peakW: 120.0,
    connector: "Barrier Terminal (2-Wire Power + 2x 2-Wire Motor + 5-Pin PWM)",
    wireGauge: "14 AWG",
    wireLengthM: 0.28,
    pinouts: [
      { pin: "W1/W2 · VMOT / GND", function: "+12.8V Drive Bus Supply (14 AWG)" },
      { pin: "OUT1 · M3+/M3- (2W)", function: "Front-Right Pololu #4694 Armature (16 AWG)" },
      { pin: "OUT2 · M4+/M4- (2W)", function: "Rear-Right Pololu #4694 Armature (16 AWG)" },
      { pin: "W1..W5 · Logic", function: "PWM1, DIR1, PWM2, DIR2, GND from Pi Pico" }
    ],
    thermalThetaJA: 7.8,
    researchNote:
      "Drives the Front-Right and Rear-Right Pololu #4694 37D gearmotors. Paired with MDD10A #1 for full 4-wheel independent Mecanum holonomic vectoring.",
    datasheetUrl: "https://www.cytron.io/p-10amp-5v-30v-dc-motor-driver-2-channels"
  },
  {
    id: "servo",
    name: "Waveshare ST3215 12V Serial Bus Tilt Servo (30 kg·cm)",
    subsystem: "Actuation",
    rail: "12.8V Drive Bus",
    nominalV: 12.8,
    nominalA: 0.35,
    peakA: 2.2,
    quiescentW: 0.25,
    nominalW: 3.8,
    peakW: 24.0,
    connector: "5264-3P Serial Bus Connector (3-Wire)",
    wireGauge: "20 AWG",
    wireLengthM: 0.42,
    pinouts: [
      { pin: "W1 · VDD (+12.8V)", function: "12.8V Actuator Bus Supply" },
      { pin: "W2 · GND", function: "Power & Signal Return" },
      { pin: "W3 · DATA (TTL)", function: "1Mbps Half-Duplex UART Position & Load Telemetry" }
    ],
    thermalThetaJA: 18.0,
    researchNote:
      "Mechanically pitches the 2D RPLIDAR S2 across -30° to +60° with 12-bit (0.088°) magnetic encoder feedback to assemble 3D point clouds from tilted 2D scan planes."
  },
  {
    id: "pi5",
    name: "Raspberry Pi 5 (8GB) Host SLAM & Reconstruction SBC",
    subsystem: "Compute",
    rail: "5.1V Logic Rail",
    nominalV: 5.1,
    nominalA: 1.75,
    peakA: 4.2,
    quiescentW: 3.2,
    nominalW: 9.0,
    peakW: 21.4,
    connector: "USB-C PD (2-Wire) + UART0 (3-Wire) + USB Host (4-Wire)",
    wireGauge: "18 AWG",
    wireLengthM: 0.18,
    pinouts: [
      { pin: "W1/W2 · 5V1 / GND", function: "Dedicated 5.1V 5A Buck Supply Pair (Conv-A)" },
      { pin: "W1..W3 · UART0", function: "RPLIDAR S2 1Mbaud 3.3V TTL Scan Stream" },
      { pin: "W1..W4 · USB Host", function: "Pi Pico RP2040 Command & Telemetry Link" }
    ],
    thermalThetaJA: 9.5,
    researchNote:
      "Primary host compute node for 2D scan registration, 3D point-cloud assembly, and autonomous exploration. Cooled by top active PWM blower.",
    datasheetUrl: "https://www.raspberrypi.com/products/raspberry-pi-5/"
  },
  {
    id: "pico",
    name: "Raspberry Pi Pico (RP2040) Real-Time Motion Controller",
    subsystem: "Compute",
    rail: "5.1V Logic Rail",
    nominalV: 5.0,
    nominalA: 0.09,
    peakA: 0.25,
    quiescentW: 0.18,
    nominalW: 0.45,
    peakW: 1.25,
    connector: "VSYS (2-Wire) + 2x 5-Pin PWM + 4x 4-Pin Encoder PIO",
    wireGauge: "22 AWG",
    wireLengthM: 0.2,
    pinouts: [
      { pin: "W1/W2 · VSYS / GND", function: "5.1V Logic Supply Pair from Compute Buck" },
      { pin: "GP2..GP9 (2x 5W)", function: "Left & Right PWM + DIR Ribbons to MDD10A #1/#2" },
      { pin: "GP10..GP17 (4x 4W)", function: "4x Pololu #4694 Quadrature Encoder A/B Inputs" },
      { pin: "I2C0 · GP4/GP5 (4W)", function: "BNO085 400kHz Orientation Quaternion Bus" }
    ],
    thermalThetaJA: 32.0,
    researchNote:
      "Executes deterministic 200Hz Mecanum inverse kinematics, hardware PIO quadrature decoding for all 4 gearmotors, and IMU attitude fusion."
  },
  {
    id: "lidar",
    name: "Slamtec RPLIDAR S2 (30m DTOF 2D Laser Scanner)",
    subsystem: "Sensing",
    rail: "5.0V Sensor Rail",
    nominalV: 5.0,
    nominalA: 0.45,
    peakA: 1.2,
    quiescentW: 0.6,
    nominalW: 2.25,
    peakW: 6.0,
    connector: "ZH1.5-5P Split: 2-Wire 5V Power + 3-Wire UART Data",
    wireGauge: "22 AWG",
    wireLengthM: 0.36,
    pinouts: [
      { pin: "W1/W2 · VCC / GND", function: "+5.0V Scanner & Brushless Motor Supply (Conv-B)" },
      { pin: "W1 · UART TX", function: "1,000,000 Baud 3.3V Range Stream to Pi 5 RX" },
      { pin: "W2/W3 · RX / GND", function: "Scanner Command Input & Signal Ground" }
    ],
    thermalThetaJA: 16.5,
    researchNote:
      "32,000 samples/sec DTOF 2D laser scanner mounted on the tilting ST3215 cradle. Reconstructs 3D room geometry by stacking tilted 2D scan planes.",
    datasheetUrl: "https://www.slamtec.com/en/S2"
  },
  {
    id: "imu",
    name: "Adafruit BNO085 9-DoF Orientation IMU",
    subsystem: "Sensing",
    rail: "3.3V I2C Bus",
    nominalV: 3.3,
    nominalA: 0.035,
    peakA: 0.06,
    quiescentW: 0.05,
    nominalW: 0.12,
    peakW: 0.2,
    connector: "2-Wire 3.3V Power (Conv-B) + 4-Wire STEMMA QT I2C (Pico)",
    wireGauge: "26 AWG",
    wireLengthM: 0.24,
    pinouts: [
      { pin: "W1/W2 · VIN / GND", function: "Filtered +3.3V Sensor Supply from Conv-B" },
      { pin: "W3 · I2C SDA", function: "400kHz Quaternion Data to Pi Pico GP4" },
      { pin: "W4 · I2C SCL", function: "400kHz Clock from Pi Pico GP5" }
    ],
    thermalThetaJA: 45.0,
    researchNote:
      "Provides drift-compensated pitch/roll/yaw quaternions at 100Hz to transform tilted 2D RPLIDAR S2 slices into the global 3D rover frame."
  }
];

export const MISSION_PROFILES: MissionProfile[] = [
  {
    id: "boot",
    label: "Cold Boot / Inrush",
    shortLabel: "Cold Boot",
    description: "Initial capacitor charge, Pi 5 boot, and LiDAR spin-up.",
    powerW: 22.5,
    driveRailV: 12.6,
    logicRailV: 5.1,
    eStopActive: false
  },
  {
    id: "standby",
    label: "Idle Standby",
    shortLabel: "Standby",
    description: "Pi 5 + Pico active, motors idle, LiDAR parked.",
    powerW: 8.5,
    driveRailV: 12.8,
    logicRailV: 5.1,
    eStopActive: false
  },
  {
    id: "sweep",
    label: "Stationary 3D Sweep",
    shortLabel: "3D Sweep",
    description: "RPLIDAR S2 at 10Hz + ST3215 pitching across -30° to +60°.",
    powerW: 16.2,
    driveRailV: 12.7,
    logicRailV: 5.1,
    eStopActive: false
  },
  {
    id: "cruise",
    label: "Nominal Mecanum Cruise",
    shortLabel: "Cruise",
    description: "4x Pololu #4694 motors translating + 3D LiDAR mapping.",
    powerW: 28.4,
    driveRailV: 12.5,
    logicRailV: 5.1,
    eStopActive: false
  },
  {
    id: "thrust",
    label: "Peak Omni Strafe",
    shortLabel: "Peak Thrust",
    description: "High-torque diagonal Mecanum climb under full sensor load.",
    powerW: 64.0,
    driveRailV: 12.1,
    logicRailV: 5.08,
    eStopActive: false
  },
  {
    id: "estop",
    label: "E-Stop Tripped",
    shortLabel: "E-Stop",
    description: "Contactor open: 12.8V drive rail isolated to 0V; 5.1V logic alive.",
    powerW: 5.2,
    driveRailV: 0.0,
    logicRailV: 5.1,
    eStopActive: true
  }
];

// Complete 24-harness topology matching CANONICAL_HARNESS + all 4 motor encoders
export const POWER_CONNECTIONS: AssemblyConnection[] = [
  // Primary 12.8V Bus & Safety
  { id: "p1", fromPart: "battery", fromPort: "supply", toPart: "protection", toPort: "power-in" },
  { id: "p1b", fromPart: "protection", fromPort: "protected-out", toPart: "disconnect", toPort: "power-in" },
  { id: "p1c", fromPart: "protection", fromPort: "protected-out", toPart: "monitor", toPort: "power-in" },
  { id: "p2", fromPart: "estop", fromPort: "stop-out", toPart: "disconnect", toPort: "stop-request" },

  // Switched 12.8V Branches from Contactor (disconnect)
  { id: "p3", fromPart: "disconnect", fromPort: "drive-supply", toPart: "converter-a", toPort: "power-in" },
  { id: "p3b", fromPart: "disconnect", fromPort: "drive-supply", toPart: "converter-b", toPort: "power-in" },
  { id: "p4", fromPart: "disconnect", fromPort: "drive-supply", toPart: "driver-1", toPort: "power-in" },
  { id: "p5", fromPart: "disconnect", fromPort: "drive-supply", toPart: "driver-2", toPort: "power-in" },
  { id: "p6", fromPart: "disconnect", fromPort: "drive-supply", toPart: "servo", toPort: "power-in" },

  // Regulated 5.1V Compute Rail (from converter-a)
  { id: "p7", fromPart: "converter-a", fromPort: "output", toPart: "pi5", toPort: "power-in" },
  { id: "p7b", fromPart: "converter-a", fromPort: "output", toPart: "cooler", toPort: "power-in" },
  { id: "p8", fromPart: "converter-a", fromPort: "output", toPart: "pico", toPort: "power-in" },

  // Regulated 5.0V / 3.3V Sensor Rail (from converter-b)
  { id: "p9", fromPart: "converter-b", fromPort: "output", toPart: "lidar", toPort: "power-in" },
  { id: "p10", fromPart: "converter-b", fromPort: "output", toPart: "imu", toPort: "power-in" },

  // Data, UART, I2C & PWM Signal Harnesses
  { id: "s1", fromPart: "lidar", fromPort: "scan-data", toPart: "pi5", toPort: "lidar" },
  { id: "s2", fromPart: "pi5", fromPort: "control", toPart: "pico", toPort: "host" },
  { id: "s3", fromPart: "imu", fromPort: "orientation", toPart: "pico", toPort: "imu" },
  { id: "s4", fromPart: "pico", fromPort: "pwm-a", toPart: "driver-1", toPort: "pwm" },
  { id: "s5", fromPart: "pico", fromPort: "pwm-b", toPart: "driver-2", toPort: "pwm" },

  // 2-Wire High-Current Motor Armature Pairs (MDD10A -> Pololu #4694 drive-in)
  { id: "p11", fromPart: "driver-1", fromPort: "motor-a", toPart: "motor-front-left", toPort: "drive-in" },
  { id: "p12", fromPart: "driver-1", fromPort: "motor-b", toPart: "motor-rear-left", toPort: "drive-in" },
  { id: "p13", fromPart: "driver-2", fromPort: "motor-a", toPart: "motor-front-right", toPort: "drive-in" },
  { id: "p14", fromPart: "driver-2", fromPort: "motor-b", toPart: "motor-rear-right", toPort: "drive-in" },

  // 4-Wire Quadrature Encoder Feedback Harnesses (Pololu #4694 encoder -> Pi Pico PIO)
  { id: "e1", fromPart: "motor-front-left", fromPort: "encoder", toPart: "pico", toPort: "encoder" },
  { id: "e2", fromPart: "motor-rear-left", fromPort: "encoder", toPart: "pico", toPort: "encoder" },
  { id: "e3", fromPart: "motor-front-right", fromPort: "encoder", toPart: "pico", toPort: "encoder" },
  { id: "e4", fromPart: "motor-rear-right", fromPort: "encoder", toPart: "pico", toPort: "encoder" }
];

// Clean zonal benchtop layout:
// Row Z=-165 (Input & Safety): battery -> protection -> monitor / disconnect <- estop
// Row Z=-25 (Regulation & Compute/Sensing): converter-a -> pi5 (+cooler) -> pico <- imu <- converter-b -> lidar (+servo)
// Row Z=+145 (Drive Bridges & 4x Gearmotors): motor-FL/RL <- driver-1 | driver-2 -> motor-FR/RR
export const BENCHTOP_POSITIONS: Record<string, [number, number, number]> = {
  battery: [-240, 42, -165],
  "battery-restraint": [-240, 80, -165],
  protection: [-95, 22, -165],
  monitor: [-95, 18, -95],
  disconnect: [20, 26, -165],
  estop: [135, 26, -165],
  "converter-a": [-145, 22, -25],
  "converter-b": [145, 22, -25],
  pi5: [-40, 22, -25],
  cooler: [-40, 40, -25],
  microsd: [-85, 20, -25],
  pico: [55, 20, 35],
  imu: [145, 18, 45],
  servo: [245, 28, -95],
  "tilt-frame": [245, 38, -25],
  lidar: [245, 72, -25],
  "driver-1": [-125, 22, 135],
  "driver-2": [125, 22, 135],
  "motor-front-left": [-275, 36, 95],
  "motor-rear-left": [-275, 36, 185],
  "motor-front-right": [275, 36, 95],
  "motor-rear-right": [275, 36, 185],
  "wheel-front-left": [-335, 40, 95],
  "wheel-rear-left": [-335, 40, 185],
  "wheel-front-right": [335, 40, 95],
  "wheel-rear-right": [335, 40, 185],
  "bracket-front-left": [-275, 56, 95],
  "bracket-rear-left": [-275, 56, 185],
  "bracket-front-right": [275, 56, 95],
  "bracket-rear-right": [275, 56, 185],
  base: [0, -15, 0],
  deck: [0, -5, 0],
  "rail-left": [0, 0, 250],
  "rail-right": [0, 0, -250]
};

export const CHASSIS_POSITIONS: Record<string, [number, number, number]> = Object.fromEntries(
  assemblyParts.map((p) => [p.id, [...p.home] as [number, number, number]])
);

export function PowerWorkbench() {
  const [selectedId, setSelectedId] = useState("battery");
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [disconnectedIds, setDisconnectedIds] = useState<string[]>([]);

  const [layoutMode, setLayoutMode] = useState<"benchtop" | "chassis">("benchtop");
  const [currentProfileId, setCurrentProfileId] = useState("cruise");
  const [batterySoCV, setBatterySoCV] = useState(12.8);
  const [view3D, setView3D] = useState<"isometric" | "top" | "front">("isometric");
  const [activeLens, setActiveLens] = useState<"harness" | "thermal" | "faults">("harness");

  const [simMinutes, setSimMinutes] = useState(6.0);
  const [clockRunning, setClockRunning] = useState(false);

  const [simDemandW, setSimDemandW] = useState(28.4);
  const [customWireGauge, setCustomWireGauge] = useState<Record<string, string>>({});
  const [customWireLength, setCustomWireLength] = useState<Record<string, number>>({});
  const [ambientTempC] = useState(25);
  const [inrushBurstActive, setInrushBurstActive] = useState(false);

  const [buckBypassed, setBuckBypassed] = useState(false);
  const [fuseOmitted, setFuseOmitted] = useState(false);
  const [resistorOmitted, setResistorOmitted] = useState(false);

  const [breakers, setBreakers] = useState({
    driveBus: true,
    tiltServo: true,
    lidarScanner: true,
    pi5Compute: true,
    estopClosed: true
  });

  useEffect(() => {
    if (!clockRunning) return;
    const id = setInterval(() => {
      setSimMinutes((prev) => (prev >= 30 ? 0.5 : Number((prev + 0.5).toFixed(1))));
    }, 350);
    return () => clearInterval(id);
  }, [clockRunning]);

  const thermalSoakFactor = useMemo(() => {
    return Math.min(1, Math.max(0.08, 1 - Math.exp(-simMinutes / 4.0)));
  }, [simMinutes]);

  const activePositions = useMemo(() => {
    return layoutMode === "benchtop" ? BENCHTOP_POSITIONS : CHASSIS_POSITIONS;
  }, [layoutMode]);

  const selectedIndex = useMemo(() => {
    const idx = ROVER_ELECTRONICS.findIndex((n) => n.id === selectedId);
    return idx >= 0 ? idx : 0;
  }, [selectedId]);

  const selectedNode = ROVER_ELECTRONICS[selectedIndex] ?? ROVER_ELECTRONICS[0];

  const currentProfile = useMemo(
    () => MISSION_PROFILES.find((p) => p.id === currentProfileId) ?? MISSION_PROFILES[3],
    [currentProfileId]
  );

  // Graph reachability across POWER harnesses (kind === "power" or "drive") from battery
  const poweredPartsSet = useMemo(() => {
    const disconnected = new Set(disconnectedIds);
    const reachable = new Set<string>(["battery"]);
    const queue = ["battery"];

    while (queue.length > 0) {
      const curr = queue.shift()!;
      for (const conn of POWER_CONNECTIONS) {
        if (disconnected.has(conn.id)) continue;
        const spec = HARNESS_BUNDLE_SPECS[conn.id];
        if (spec && spec.kind !== "power" && spec.kind !== "drive") continue;
        if (conn.fromPart === "estop") continue;
        if (conn.fromPart === curr && !reachable.has(conn.toPart)) {
          reachable.add(conn.toPart);
          queue.push(conn.toPart);
        }
      }
    }
    return reachable;
  }, [disconnectedIds]);

  const isEstopWireUnplugged = disconnectedIds.includes("p2");

  const isEstopCutoff =
    currentProfile.eStopActive ||
    !breakers.estopClosed ||
    !breakers.driveBus ||
    isEstopWireUnplugged ||
    !poweredPartsSet.has("disconnect");

  // Harnesses attached to the currently selected component
  const attachedConnections = useMemo(() => {
    const stageId =
      selectedNode.id === "fuse-block" || selectedNode.id === "contactor"
        ? "protection"
        : selectedNode.id;
    return POWER_CONNECTIONS.filter(
      (c) =>
        c.fromPart === stageId ||
        c.toPart === stageId ||
        (selectedNode.id === "contactor" &&
          (c.fromPart === "disconnect" || c.toPart === "disconnect"))
    );
  }, [selectedNode.id]);

  // Active sizing target: either the clicked 3D wire bundle or the selected component
  const activeBundleSpec = selectedConnectionId
    ? HARNESS_BUNDLE_SPECS[selectedConnectionId] ?? null
    : null;
  const sizingKey = selectedConnectionId ?? selectedNode.id;
  const activeWireGauge =
    customWireGauge[sizingKey] ??
    (activeBundleSpec ? activeBundleSpec.gauge : selectedNode.wireGauge);
  const activeWireLength =
    customWireLength[sizingKey] ??
    (activeBundleSpec ? activeBundleSpec.lengthM : selectedNode.wireLengthM);
  const activeWireAmpacity = AWG_MAX_CONTINUOUS_AMPS[activeWireGauge] ?? 10.0;

  // Determine which motors are energized (requires 12.8V power + MDD10A power + Pico PWM ribbon + motor 2-wire lead)
  const motorEnergized = useMemo(() => {
    const driveProfileActive =
      (currentProfileId === "cruise" || currentProfileId === "thrust" || inrushBurstActive) &&
      !isEstopCutoff;
    const picoPowered = poweredPartsSet.has("pico") && breakers.pi5Compute;
    const leftPwmConnected = picoPowered && !disconnectedIds.includes("s4");
    const rightPwmConnected = picoPowered && !disconnectedIds.includes("s5");
    return {
      "motor-front-left":
        driveProfileActive &&
        leftPwmConnected &&
        poweredPartsSet.has("motor-front-left"),
      "motor-rear-left":
        driveProfileActive &&
        leftPwmConnected &&
        poweredPartsSet.has("motor-rear-left"),
      "motor-front-right":
        driveProfileActive &&
        rightPwmConnected &&
        poweredPartsSet.has("motor-front-right"),
      "motor-rear-right":
        driveProfileActive &&
        rightPwmConnected &&
        poweredPartsSet.has("motor-rear-right")
    };
  }, [currentProfileId, inrushBurstActive, isEstopCutoff, poweredPartsSet, breakers.pi5Compute, disconnectedIds]);

  const activeMotorCount = Object.values(motorEnergized).filter(Boolean).length;

  const effectiveLoadW = useMemo(() => {
    let w = simDemandW;
    if (isEstopCutoff) {
      w = Math.min(w, 6.2);
    } else if (currentProfileId === "cruise" || currentProfileId === "thrust") {
      const motorShareW = Math.max(0, w - 12.0);
      w = 12.0 + motorShareW * (activeMotorCount / 4);
    }
    if (!breakers.tiltServo || !poweredPartsSet.has("servo")) w = Math.max(4.5, w - 3.2);
    if (!breakers.lidarScanner || !poweredPartsSet.has("lidar")) w = Math.max(3.5, w - 2.4);
    if (!breakers.pi5Compute || !poweredPartsSet.has("pi5")) w = Math.max(0.8, w - 8.5);
    if (inrushBurstActive && !isEstopCutoff && activeMotorCount > 0) {
      w += 180.0 * (activeMotorCount / 4);
    }
    return Number(w.toFixed(1));
  }, [
    simDemandW,
    isEstopCutoff,
    currentProfileId,
    activeMotorCount,
    breakers,
    poweredPartsSet,
    inrushBurstActive
  ]);

  const currentSocCurve = useMemo(() => {
    return (
      BATTERY_SOC_CURVES.find((c) => Math.abs(c.openCircuitV - batterySoCV) < 0.25) ??
      BATTERY_SOC_CURVES[1]
    );
  }, [batterySoCV]);

  const batteryCurrentA = Number((effectiveLoadW / Math.max(9.5, batterySoCV)).toFixed(2));
  const internalDropV =
    (batteryCurrentA * currentSocCurve.internalResistanceMilliOhms) / 1000;
  const loadedV = Number(Math.max(9.0, batterySoCV - internalDropV).toFixed(2));

  const logicRailV =
    !breakers.pi5Compute || !poweredPartsSet.has("converter-a")
      ? 0.0
      : buckBypassed
        ? loadedV
        : currentProfile.logicRailV;

  const sensorRailV =
    !breakers.lidarScanner || !poweredPartsSet.has("converter-b")
      ? 0.0
      : buckBypassed
        ? loadedV
        : 5.0;

  const logicLoadW =
    breakers.pi5Compute && poweredPartsSet.has("converter-a")
      ? (poweredPartsSet.has("pi5") ? 9.0 : 0.4) + (poweredPartsSet.has("pico") ? 0.5 : 0)
      : 0;
  const logicA = logicRailV > 0 ? Number((logicLoadW / logicRailV).toFixed(2)) : 0;

  const sensorLoadW =
    breakers.lidarScanner && poweredPartsSet.has("converter-b")
      ? (poweredPartsSet.has("lidar") ? 2.25 : 0) + (poweredPartsSet.has("imu") ? 0.12 : 0)
      : 0;
  const sensorA = sensorRailV > 0 ? Number((sensorLoadW / sensorRailV).toFixed(2)) : 0;

  const estRuntimeHours =
    effectiveLoadW > 0.2 ? Number(((153.6 * 0.85) / effectiveLoadW).toFixed(1)) : 99.9;

  // Per-node live telemetry
  const nodeTelemetryMap = useMemo<Record<string, NodeLiveTelemetry>>(() => {
    const map: Record<string, NodeLiveTelemetry> = {};
    const loadScale = Math.max(0.2, effectiveLoadW / 28.4);

    ROVER_ELECTRONICS.forEach((node) => {
      const partKey =
        node.id === "fuse-block" || node.id === "contactor" ? "protection" : node.id;
      const isGraphDisconnected =
        node.id === "contactor"
          ? !poweredPartsSet.has("disconnect")
          : !poweredPartsSet.has(partKey);

      let isolated = isGraphDisconnected;
      if (node.rail === "12.8V Drive Bus" && isEstopCutoff) isolated = true;
      if (node.id === "servo" && (!breakers.tiltServo || isEstopCutoff)) isolated = true;
      if ((node.id === "lidar" || node.id === "imu" || node.id === "converter-b") && !breakers.lidarScanner)
        isolated = true;
      if ((node.id === "pi5" || node.id === "pico" || node.id === "converter-a") && !breakers.pi5Compute)
        isolated = true;

      let voltageV = loadedV;
      if (isolated) {
        voltageV = 0.0;
      } else if (node.rail === "5.1V Logic Rail") {
        voltageV = logicRailV;
      } else if (node.rail === "5.0V Sensor Rail") {
        voltageV = node.id === "monitor" ? loadedV : sensorRailV;
      } else if (node.rail === "3.3V I2C Bus") {
        voltageV = buckBypassed ? loadedV : 3.3;
      }

      let currentA = isolated ? 0.0 : Number((node.nominalA * loadScale).toFixed(2));
      if (node.id === "battery" || node.id === "fuse-block" || node.id === "disconnect") {
        currentA = batteryCurrentA;
      } else if (node.id === "contactor") {
        currentA = isEstopCutoff ? 0.0 : Number(Math.max(0, batteryCurrentA - 0.8).toFixed(2));
      } else if (node.id === "driver-1") {
        const leftCount =
          (motorEnergized["motor-front-left"] ? 1 : 0) +
          (motorEnergized["motor-rear-left"] ? 1 : 0);
        currentA = isolated
          ? 0
          : (inrushBurstActive ? 6.0 : node.nominalA * 0.5 * loadScale) * leftCount;
      } else if (node.id === "driver-2") {
        const rightCount =
          (motorEnergized["motor-front-right"] ? 1 : 0) +
          (motorEnergized["motor-rear-right"] ? 1 : 0);
        currentA = isolated
          ? 0
          : (inrushBurstActive ? 6.0 : node.nominalA * 0.5 * loadScale) * rightCount;
      } else if (node.id === "converter-a") {
        currentA = isolated ? 0 : logicA;
      } else if (node.id === "converter-b") {
        currentA = isolated ? 0 : sensorA;
      }

      const powerW = Number((voltageV * currentA).toFixed(2));
      const dissW =
        node.id === "converter-a" || node.id === "converter-b"
          ? powerW * 0.08
          : node.id === "driver-1" || node.id === "driver-2"
            ? powerW * 0.06
            : node.id === "battery" ||
                node.id === "fuse-block" ||
                node.id === "disconnect" ||
                node.id === "contactor"
              ? currentA * currentA * 0.015
              : powerW * 0.32;

      let steadyRiseC = dissW * node.thermalThetaJA;
      if (buckBypassed && (node.id === "pi5" || node.id === "pico" || node.id === "lidar" || node.id === "imu")) {
        steadyRiseC = 95;
      }
      if (resistorOmitted && (node.id === "pico" || node.id === "imu")) {
        steadyRiseC = Math.max(steadyRiseC, 68);
      }

      const tempC = Number((ambientTempC + steadyRiseC * thermalSoakFactor).toFixed(1));
      const nodeGauge = customWireGauge[node.id] ?? node.wireGauge;
      const maxAmps = AWG_MAX_CONTINUOUS_AMPS[nodeGauge] ?? 10.0;
      const overload =
        currentA > maxAmps ||
        tempC >= 80 ||
        (buckBypassed && (node.id === "pi5" || node.id === "pico" || node.id === "lidar" || node.id === "imu")) ||
        (resistorOmitted && (node.id === "pico" || node.id === "imu"));

      map[node.id] = {
        id: node.id,
        voltageV,
        currentA: Number(currentA.toFixed(2)),
        powerW,
        tempC,
        isolated,
        overload
      };
    });

    return map;
  }, [
    effectiveLoadW,
    poweredPartsSet,
    isEstopCutoff,
    breakers,
    loadedV,
    logicRailV,
    sensorRailV,
    buckBypassed,
    batteryCurrentA,
    motorEnergized,
    inrushBurstActive,
    logicA,
    sensorA,
    ambientTempC,
    resistorOmitted,
    thermalSoakFactor,
    customWireGauge
  ]);

  const selectedTelem = nodeTelemetryMap[selectedNode.id] ?? {
    id: selectedNode.id,
    voltageV: selectedNode.nominalV,
    currentA: selectedNode.nominalA,
    powerW: selectedNode.nominalW,
    tempC: ambientTempC,
    isolated: false,
    overload: false
  };

  // Current flowing through the active sizing target (selected harness or selected component)
  const activeSizingCurrentA = useMemo(() => {
    if (!selectedConnectionId) return selectedTelem.currentA;
    if (disconnectedIds.includes(selectedConnectionId)) return 0;
    const conn = POWER_CONNECTIONS.find((c) => c.id === selectedConnectionId);
    if (!conn) return selectedTelem.currentA;
    if (conn.toPart.startsWith("motor-")) {
      return motorEnergized[conn.toPart as keyof typeof motorEnergized]
        ? inrushBurstActive
          ? 6.0
          : 0.65
        : 0;
    }
    const targetId = conn.toPart === "protection" ? "fuse-block" : conn.toPart;
    return nodeTelemetryMap[targetId]?.currentA ?? 0.15;
  }, [
    selectedConnectionId,
    selectedTelem.currentA,
    disconnectedIds,
    motorEnergized,
    inrushBurstActive,
    nodeTelemetryMap
  ]);

  const wireCalc = useMemo(
    () => calculateWireDrop(activeWireGauge, activeWireLength, activeSizingCurrentA),
    [activeWireGauge, activeWireLength, activeSizingCurrentA]
  );
  const cableDropMv = Number((wireCalc.voltageDropV * 1000).toFixed(1));

  const buckTemp = nodeTelemetryMap["converter-a"]
    ? { estimatedTemp: nodeTelemetryMap["converter-a"].tempC }
    : null;

  const peakJunctionTempC = useMemo(() => {
    return Math.max(...Object.values(nodeTelemetryMap).map((n) => n.tempC), ambientTempC);
  }, [nodeTelemetryMap, ambientTempC]);

  // Fault / Explosion Point Detector
  const faultPoints = useMemo<FaultPoint[]>(() => {
    const pts: FaultPoint[] = [];

    if (buckBypassed && breakers.pi5Compute && poweredPartsSet.has("pi5")) {
      pts.push({
        nodeId: "pi5",
        severity: "critical",
        title: "PMIC / SoC Over-Voltage Blowout (12.8V on 5.1V Rail)",
        reason: "5.1V Buck Converter bypassed — raw 12.8V LiFePO4 bus applied directly to Pi 5."
      });
      pts.push({
        nodeId: "lidar",
        severity: "critical",
        title: "RPLIDAR S2 Optical Diode Burnout",
        reason: "12.8V surge on 5.0V laser & brushless motor rail."
      });
    }

    if (fuseOmitted && inrushBurstActive && !isEstopCutoff) {
      pts.push({
        nodeId: "fuse-block",
        severity: "critical",
        title: "Unfused 24A Stall Arc & Harness Melt",
        reason: "20A ATC blade fuse omitted during 4-motor stall surge (24.0A > 20A rating)."
      });
    } else if (!fuseOmitted && inrushBurstActive && !isEstopCutoff) {
      pts.push({
        nodeId: "fuse-block",
        severity: "warning",
        title: "20A ATC Fuse Blows (Protected Trip)",
        reason: "24.0A stall exceeds 20A main fuse rating — fuse clears to protect 12 AWG bus."
      });
    }

    if (resistorOmitted) {
      pts.push({
        nodeId: "pico",
        severity: "critical",
        title: "RP2040 GPIO Latch-Up (Missing 1kΩ / Level Shifter)",
        reason: "5V encoder & pull-up lines driven directly into 3.3V-only RP2040 PIO pins."
      });
    }

    if (activeSizingCurrentA > activeWireAmpacity) {
      pts.push({
        nodeId: selectedNode.id,
        severity: "critical",
        title: `${activeWireGauge} Insulation Melt (${activeSizingCurrentA.toFixed(1)}A > ${activeWireAmpacity}A)`,
        reason: `Undersized ${activeWireGauge} wire carrying ${activeSizingCurrentA.toFixed(1)}A continuous load.`
      });
    }

    return pts;
  }, [
    buckBypassed,
    breakers.pi5Compute,
    poweredPartsSet,
    fuseOmitted,
    inrushBurstActive,
    isEstopCutoff,
    resistorOmitted,
    activeSizingCurrentA,
    activeWireAmpacity,
    selectedNode.id,
    activeWireGauge
  ]);

  const applyProfile = (profile: MissionProfile) => {
    setCurrentProfileId(profile.id);
    setSimDemandW(profile.powerW);
    setInrushBurstActive(false);
    setBreakers((prev) => ({
      ...prev,
      estopClosed: !profile.eStopActive,
      driveBus: !profile.eStopActive
    }));
  };

  const toggleConnection = (connId: string) => {
    setDisconnectedIds((prev) =>
      prev.includes(connId) ? prev.filter((id) => id !== connId) : [...prev, connId]
    );
  };

  const sweepActive =
    (currentProfileId === "sweep" || currentProfileId === "cruise" || currentProfileId === "thrust") &&
    breakers.lidarScanner &&
    poweredPartsSet.has("lidar") &&
    !disconnectedIds.includes("s1");

  const isSelectedConnUnplugged = selectedConnectionId
    ? disconnectedIds.includes(selectedConnectionId)
    : false;

  return (
    <div className={styles.workbench}>
      {/* ============================================================= */}
      {/* 1. TOP OPERATIONAL BAR (Segmented Pill Islands + Live State)  */}
      {/* ============================================================= */}
      <div className={styles.topBar} role="toolbar" aria-label="Power bench operational controls">
        {/* Left: Operational Load Modes with Live Wattage */}
        <div className={styles.barCluster}>
          <div className={styles.segmentedGroup} role="group" aria-label="Rover operation state">
            {MISSION_PROFILES.filter((p) => p.id !== "boot").map((profile) => {
              const isEstopBtn = profile.id === "estop";
              const isActive =
                currentProfileId === profile.id || (isEstopBtn && isEstopCutoff);
              return (
                <button
                  key={profile.id}
                  type="button"
                  className={`${styles.segmentedBtn} ${isEstopBtn ? styles.segmentedBtnEstop : ""}`}
                  aria-pressed={isActive}
                  onClick={() => applyProfile(profile)}
                  title={profile.description}
                >
                  <span>{profile.shortLabel}</span>
                  <span className={styles.btnSubValue}>
                    {isEstopBtn ? "0V" : `${profile.powerW.toFixed(0)}W`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Center: Diagnostic Lens Switcher with Live State Readouts */}
        <div className={styles.barCluster}>
          <div className={styles.segmentedGroup} role="group" aria-label="Diagnostic lens">
            <button
              type="button"
              className={styles.segmentedBtn}
              aria-pressed={activeLens === "harness"}
              onClick={() => setActiveLens("harness")}
            >
              <span>Harness</span>
              <span className={styles.btnSubValue}>
                {activeWireGauge} · {activeWireLength.toFixed(2)}m
              </span>
            </button>
            <button
              type="button"
              className={styles.segmentedBtn}
              aria-pressed={activeLens === "thermal"}
              onClick={() => setActiveLens("thermal")}
            >
              <span>Thermal</span>
              <span className={styles.btnSubValue}>
                {simMinutes.toFixed(0)}m · {peakJunctionTempC.toFixed(0)}°C
              </span>
            </button>
            <button
              type="button"
              className={styles.segmentedBtn}
              aria-pressed={activeLens === "faults"}
              onClick={() => setActiveLens("faults")}
            >
              <span>Faults</span>
              {faultPoints.length > 0 ? (
                <span className={styles.lensBadgeAlert}>{faultPoints.length} Active</span>
              ) : (
                <span className={styles.btnSubValue}>OK</span>
              )}
            </button>
          </div>
        </div>

        {/* Right: Bench Layout, Camera View & Reset */}
        <div className={styles.barCluster}>
          <div className={styles.segmentedGroup} role="group" aria-label="3D harness layout">
            <button
              type="button"
              className={styles.segmentedBtn}
              aria-pressed={layoutMode === "benchtop"}
              onClick={() => setLayoutMode("benchtop")}
            >
              Benchtop
            </button>
            <button
              type="button"
              className={styles.segmentedBtn}
              aria-pressed={layoutMode === "chassis"}
              onClick={() => setLayoutMode("chassis")}
            >
              Chassis
            </button>
          </div>

          <div className={styles.segmentedGroup} role="group" aria-label="Camera orientation">
            {(["isometric", "top", "front"] as const).map((v) => (
              <button
                key={v}
                type="button"
                className={styles.segmentedBtn}
                aria-pressed={view3D === v}
                onClick={() => setView3D(v)}
              >
                {v === "isometric" ? "Iso" : v === "top" ? "Top" : "Front"}
              </button>
            ))}
          </div>

          <div className={styles.segmentedGroup} role="group" aria-label="Reset bench">
            <button
              type="button"
              className={styles.segmentedBtn}
              onClick={() => {
                setBuckBypassed(false);
                setFuseOmitted(false);
                setResistorOmitted(false);
                setInrushBurstActive(false);
                setClockRunning(false);
                setSimMinutes(6.0);
                setBatterySoCV(12.8);
                setDisconnectedIds([]);
                setSelectedConnectionId(null);
                setBreakers({
                  driveBus: true,
                  tiltServo: true,
                  lidarScanner: true,
                  pi5Compute: true,
                  estopClosed: true
                });
                applyProfile(MISSION_PROFILES[3]);
                setView3D("isometric");
                setLayoutMode("benchtop");
                setCustomWireGauge({});
                setCustomWireLength({});
              }}
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================= */}
      {/* 2. SPACIOUS 3D ELECTRICAL BENCH STAGE                         */}
      {/* ============================================================= */}
      <div className={styles.stageShell}>
        <div className={styles.stageCanvas}>
          <PowerStage
            layoutMode={layoutMode}
            positions={activePositions}
            connections={POWER_CONNECTIONS}
            disconnectedIds={disconnectedIds}
            selectedId={selectedNode.id}
            selectedConnectionId={selectedConnectionId}
            onSelect={setSelectedId}
            onSelectConnection={setSelectedConnectionId}
            onToggleConnection={toggleConnection}
            nodeTelemetry={nodeTelemetryMap}
            motorEnergized={motorEnergized}
            faultPoints={faultPoints}
            heatmapMode={activeLens === "thermal"}
            view={view3D}
            activeFlow={!isEstopCutoff || breakers.pi5Compute}
            sweepActive={sweepActive}
            selectedConnector={selectedNode.connector}
            selectedWireGauge={activeWireGauge}
            selectedWireLength={activeWireLength}
            selectedDropMv={cableDropMv}
          />

          <div className={styles.stageFooter}>
            <div className={styles.railKey}>
              <span className={styles.legendSwatch}>
                <span className={`${styles.swatchLine} ${styles.swatch12V}`} />
                12.8V Bus &amp; Motor Pairs (2W)
              </span>
              <span className={styles.legendSwatch}>
                <span className={`${styles.swatchLine} ${styles.swatch5V}`} />
                5.1V Compute &amp; 5.0V Sensor Buck Rails
              </span>
              <span className={styles.legendSwatch}>
                <span className={`${styles.swatchLine} ${styles.swatchSignal}`} />
                UART (3W) · I2C/Encoders (4W) · PWM (5W)
              </span>
            </div>
            <span>
              {POWER_CONNECTIONS.length - disconnectedIds.length}/{POWER_CONNECTIONS.length} Harnesses Connected · Click any 3D wire bundle or module
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================= */}
      {/* 3. RESPONSIVE, DYNAMIC BOTTOM INSTRUMENT ISLAND               */}
      {/* ============================================================= */}
      <div className={styles.deckGrid} aria-label="Power bench instrument strip">
        {/* COLUMN 1: LIVE BUS RAILS & SOC */}
        <section className={styles.flatCard}>
          <div className={styles.cardHeader}>
            <span className={styles.cardKicker}>01 · Live Power Rails &amp; SoC</span>
            <div className={styles.segmentedGroup} role="group" aria-label="Battery state of charge">
              {BATTERY_SOC_CURVES.map((socItem) => (
                <button
                  key={socItem.soc}
                  type="button"
                  className={styles.segmentedBtn}
                  aria-pressed={batterySoCV === socItem.openCircuitV}
                  onClick={() => setBatterySoCV(socItem.openCircuitV)}
                >
                  {socItem.soc}%
                </button>
              ))}
            </div>
          </div>

          <div className={styles.hairlineList}>
            <div className={styles.hairlineRow}>
              <span>12.8V Drive Bus ({activeMotorCount}/4 Motors)</span>
              <strong>
                {isEstopCutoff ? "0.00V (Isolated)" : `${loadedV.toFixed(2)}V · ${batteryCurrentA.toFixed(2)}A`}
              </strong>
            </div>
            <div className={styles.hairlineRow}>
              <span>5.1V Compute Buck (Conv-A)</span>
              <strong>
                {logicRailV.toFixed(2)}V · {logicA.toFixed(2)}A ·{" "}
                {buckTemp ? `${buckTemp.estimatedTemp.toFixed(1)}°C` : "25.0°C"}
              </strong>
            </div>
            <div className={styles.hairlineRow}>
              <span>5.0V Sensor Buck (Conv-B)</span>
              <strong>
                {sensorRailV.toFixed(2)}V · {sensorA.toFixed(2)}A ·{" "}
                {nodeTelemetryMap["converter-b"]
                  ? `${nodeTelemetryMap["converter-b"].tempC.toFixed(1)}°C`
                  : "25.0°C"}
              </strong>
            </div>
            <div className={styles.hairlineRow}>
              <span>Total Draw &amp; Harness State</span>
              <strong>
                {effectiveLoadW.toFixed(1)}W · {estRuntimeHours.toFixed(1)}h ·{" "}
                {disconnectedIds.length === 0
                  ? "All 24 Plugged"
                  : `${disconnectedIds.length} Cut`}
              </strong>
            </div>
          </div>
        </section>

        {/* COLUMN 2: ACTIVE LENS (Harness Sizing | Thermal Soak | Fault Stress) */}
        <section className={styles.flatCard}>
          {activeLens === "harness" && (
            <>
              <div className={styles.cardHeader}>
                <span className={styles.cardKicker}>
                  02 · Harness Sizing (
                  {activeBundleSpec ? activeBundleSpec.connectionId.toUpperCase() : selectedNode.id})
                </span>
                <span
                  className={`${styles.cardStatus} ${
                    activeSizingCurrentA > activeWireAmpacity ? styles.cardStatusAlert : ""
                  }`}
                >
                  {activeSizingCurrentA.toFixed(2)}A / {activeWireAmpacity}A Max
                </span>
              </div>

              <div className={styles.segmentedGroup} role="group" aria-label="Conductor wire gauge">
                {["12 AWG", "14 AWG", "16 AWG", "18 AWG", "20 AWG", "22 AWG", "24 AWG", "26 AWG"].map(
                  (awg) => (
                    <button
                      key={awg}
                      type="button"
                      className={styles.segmentedBtn}
                      aria-pressed={activeWireGauge === awg}
                      onClick={() =>
                        setCustomWireGauge((prev) => ({ ...prev, [sizingKey]: awg }))
                      }
                    >
                      {awg.replace(" AWG", "")}
                    </button>
                  )
                )}
              </div>

              <div className={styles.hairlineList}>
                <div className={styles.hairlineRow}>
                  <span>Harness Run Length</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0.05"
                      max="1.50"
                      step="0.05"
                      value={activeWireLength}
                      onChange={(e) =>
                        setCustomWireLength((prev) => ({
                          ...prev,
                          [sizingKey]: parseFloat(e.target.value)
                        }))
                      }
                      className={styles.rangeInput}
                      aria-label="Harness length in meters"
                    />
                    <strong>{activeWireLength.toFixed(2)} m</strong>
                  </div>
                </div>
                <div className={styles.hairlineRow}>
                  <span>Loop Resistance &amp; Drop (ΔV)</span>
                  <strong>
                    {wireCalc.resistanceMilliOhms.toFixed(1)} mΩ · -{cableDropMv.toFixed(1)} mV (
                    {(wireCalc.powerLossW * 1000).toFixed(1)} mW)
                  </strong>
                </div>
              </div>
            </>
          )}

          {activeLens === "thermal" && (
            <>
              <div className={styles.cardHeader}>
                <span className={styles.cardKicker}>02 · Heat Over Time</span>
                <button
                  type="button"
                  className={styles.stepBtn}
                  onClick={() => setClockRunning((r) => !r)}
                >
                  {clockRunning ? "Pause ΔT" : "Run ΔT Clock"}
                </button>
              </div>

              <div className={styles.hairlineList}>
                <div className={styles.hairlineRow}>
                  <span>Soak Duration (t)</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0.5"
                      max="30"
                      step="0.5"
                      value={simMinutes}
                      onChange={(e) => setSimMinutes(parseFloat(e.target.value))}
                      className={styles.rangeInput}
                      aria-label="Thermal soak duration in minutes"
                    />
                    <strong>{simMinutes.toFixed(0)} min</strong>
                  </div>
                </div>
                <div className={styles.hairlineRow}>
                  <span>Mission Load Trim</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="5"
                      max="75"
                      step="0.5"
                      value={simDemandW}
                      onChange={(e) => setSimDemandW(parseFloat(e.target.value))}
                      className={styles.rangeInput}
                      aria-label="Mission power demand"
                    />
                    <strong>{simDemandW.toFixed(1)} W</strong>
                  </div>
                </div>
                <div className={styles.hairlineRow}>
                  <span>Node / Peak Junction Temp</span>
                  <strong>
                    {selectedTelem.tempC.toFixed(1)}°C (Peak {peakJunctionTempC.toFixed(1)}°C / 85°C)
                  </strong>
                </div>
              </div>
            </>
          )}

          {activeLens === "faults" && (
            <>
              <div className={styles.cardHeader}>
                <span className={styles.cardKicker}>02 · Protection &amp; Fault Stress</span>
                <span
                  className={`${styles.cardStatus} ${
                    faultPoints.length > 0 ? styles.cardStatusAlert : styles.cardStatusOk
                  }`}
                >
                  {faultPoints.length > 0 ? `${faultPoints.length} Fault(s) Active` : "Protected"}
                </span>
              </div>

              <div className={styles.hairlineList}>
                <button
                  type="button"
                  className={styles.faultToggleRow}
                  onClick={() => setBuckBypassed((b) => !b)}
                  aria-pressed={buckBypassed}
                >
                  <span>5.1V / 5.0V Buck Regulators</span>
                  <span className={buckBypassed ? styles.badgeFault : styles.badgeOk}>
                    {buckBypassed ? "Bypassed → 12.8V Fault!" : "Active (5.1V / 5.0V)"}
                  </span>
                </button>
                <button
                  type="button"
                  className={styles.faultToggleRow}
                  onClick={() => setFuseOmitted((f) => !f)}
                  aria-pressed={fuseOmitted}
                >
                  <span>20A Main Blade Fuse</span>
                  <span className={fuseOmitted ? styles.badgeFault : styles.badgeOk}>
                    {fuseOmitted ? "Omitted → Unfused!" : "20A Installed"}
                  </span>
                </button>
                <button
                  type="button"
                  className={styles.faultToggleRow}
                  onClick={() => setResistorOmitted((r) => !r)}
                  aria-pressed={resistorOmitted}
                >
                  <span>3.3V Logic Level Resistor</span>
                  <span className={resistorOmitted ? styles.badgeFault : styles.badgeOk}>
                    {resistorOmitted ? "Omitted → 5V GPIO Fault!" : "1kΩ Installed"}
                  </span>
                </button>
                <button
                  type="button"
                  className={styles.faultToggleRow}
                  onClick={() => setInrushBurstActive((s) => !s)}
                  aria-pressed={inrushBurstActive}
                >
                  <span>24A 4-Motor Stall Surge</span>
                  <span className={inrushBurstActive ? styles.badgeFault : styles.badgeOk}>
                    {inrushBurstActive ? "Active (180W Surge!)" : "Inject 24A Stall"}
                  </span>
                </button>
              </div>
            </>
          )}
        </section>

        {/* COLUMN 3: SELECTED 3D HARNESS BUNDLE OR COMPONENT PINOUT & ATTACHED HARNESSES */}
        <section className={styles.flatCard}>
          {activeBundleSpec && selectedConnectionId ? (
            <>
              <div className={styles.cardHeader}>
                <span className={styles.cardKicker}>
                  03 · {activeBundleSpec.conductorCount}-Wire Harness ({activeWireGauge} ·{" "}
                  {activeWireLength.toFixed(2)}m)
                </span>
                <div className={styles.nodeStepBar}>
                  <button
                    type="button"
                    className={`${styles.stepBtn} ${
                      isSelectedConnUnplugged ? styles.stepBtnAlert : ""
                    }`}
                    onClick={() => toggleConnection(selectedConnectionId)}
                  >
                    {isSelectedConnUnplugged ? "Plug In" : "Unplug Live"}
                  </button>
                  <button
                    type="button"
                    className={styles.stepBtn}
                    onClick={() => setSelectedConnectionId(null)}
                  >
                    Node View
                  </button>
                </div>
              </div>

              <div className={styles.cardTitleRow}>
                <div className={styles.cardTitle}>{activeBundleSpec.label}</div>
                <span className={styles.cardSubtitle}>{activeBundleSpec.connector}</span>
              </div>

              {/* Render ALL conductors in a responsive grid without truncation */}
              <div className={styles.conductorGrid}>
                {activeBundleSpec.conductors.map((c) => (
                  <div key={c.number} className={styles.conductorItem}>
                    <span className={styles.conductorNumber}>{c.number}</span>
                    <span className={styles.conductorSignal} title={c.signal}>
                      {c.signal}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className={styles.cardHeader}>
                <span className={styles.cardKicker}>
                  03 · {selectedNode.subsystem} ({selectedIndex + 1}/{ROVER_ELECTRONICS.length}) ·{" "}
                  {selectedTelem.isolated
                    ? "0.00V"
                    : `${selectedTelem.voltageV.toFixed(2)}V · ${selectedTelem.currentA.toFixed(2)}A`}
                </span>
                <div className={styles.nodeStepBar}>
                  <button
                    type="button"
                    className={styles.stepBtn}
                    onClick={() => {
                      const prev =
                        (selectedIndex - 1 + ROVER_ELECTRONICS.length) % ROVER_ELECTRONICS.length;
                      setSelectedId(ROVER_ELECTRONICS[prev].id);
                    }}
                    aria-label="Previous electronics component"
                  >
                    ‹ Prev
                  </button>
                  <button
                    type="button"
                    className={styles.stepBtn}
                    onClick={() => {
                      const next = (selectedIndex + 1) % ROVER_ELECTRONICS.length;
                      setSelectedId(ROVER_ELECTRONICS[next].id);
                    }}
                    aria-label="Next electronics component"
                  >
                    Next ›
                  </button>
                </div>
              </div>

              <div className={styles.cardTitleRow}>
                <div className={styles.cardTitle}>{selectedNode.name}</div>
                <span className={styles.cardSubtitle}>{selectedNode.connector}</span>
              </div>

              {/* Render ALL component pinouts in a responsive grid without truncation */}
              <div className={styles.conductorGrid}>
                {selectedNode.pinouts.map((p) => (
                  <div key={p.pin} className={styles.conductorItem}>
                    <span className={styles.conductorNumber}>{p.pin}</span>
                    <span className={styles.conductorSignal} title={p.function}>
                      {p.function}
                    </span>
                  </div>
                ))}
              </div>

              {/* Interactive live harnesses attached to this component */}
              {attachedConnections.length > 0 && (
                <div className={styles.attachedHarnessBar}>
                  {attachedConnections.map((conn) => {
                    const spec = HARNESS_BUNDLE_SPECS[conn.id];
                    const isCut = disconnectedIds.includes(conn.id);
                    const peer =
                      conn.fromPart === selectedNode.id ||
                      (selectedNode.id === "fuse-block" && conn.fromPart === "protection")
                        ? `→ ${conn.toPart}`
                        : `← ${conn.fromPart}`;
                    return (
                      <button
                        key={conn.id}
                        type="button"
                        className={`${styles.harnessChip} ${isCut ? styles.harnessChipCut : ""}`}
                        onClick={() => setSelectedConnectionId(conn.id)}
                        title={
                          spec
                            ? `${spec.label} (${spec.conductorCount}-Wire ${spec.gauge}) — Click to inspect or unplug`
                            : conn.id
                        }
                      >
                        {spec ? `${spec.conductorCount}W` : conn.id} {peer}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export default PowerWorkbench;
