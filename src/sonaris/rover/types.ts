/**
 * SONARIS Autonomous Rover Type Definitions
 * Unified data models for world perception, traversability, kinematics, and mission state.
 */

export interface Pose2D {
  x: number;
  z: number;
  headingDeg: number;
}

export interface Attitude3D {
  elevationM: number;
  pitchDeg: number;
  rollDeg: number;
}

export interface Twist2D {
  vx: number;       // Forward velocity (m/s)
  vy: number;       // Lateral strafe velocity (m/s)
  omegaDeg: number; // Yaw angular rate (deg/s)
}

export type WheelRPMs = [number, number, number, number]; // [FL, FR, RL, RR]

export interface RoverChassisSpecs {
  readonly wheelRadiusM: number;     // e.g. 0.05m (100mm Mecanum diameter)
  readonly halfLengthM: number;      // e.g. 0.17m (wheelbase / 2)
  readonly halfWidthM: number;       // e.g. 0.14m (track width / 2)
  readonly massKg: number;           // e.g. 6.8kg
  readonly footprintRadiusM: number; // e.g. 0.28m safety radius
  readonly maxStepHeightM: number;   // e.g. 0.035m (max rollable step height)
  readonly maxTraversableSlopeDeg: number; // e.g. 18°
  readonly lateralSlipCoeff: number; // e.g. 0.78 (anisotropic roller friction)
}

export const DEFAULT_ROVER_SPECS: RoverChassisSpecs = {
  wheelRadiusM: 0.05,
  halfLengthM: 0.17,
  halfWidthM: 0.14,
  massKg: 6.8,
  footprintRadiusM: 0.28,
  maxStepHeightM: 0.035,
  maxTraversableSlopeDeg: 18.0,
  lateralSlipCoeff: 0.78
};

export type TraversabilityClass =
  | "clear_flat"
  | "traversable_slope"
  | "rollable_step"
  | "lethal_obstacle"
  | "lethal_pit"
  | "head_overhang_clear";

export interface TerrainHazardAssessment {
  classification: TraversabilityClass;
  isNavigable: boolean;
  stepHeightM: number;
  slopeDeg: number;
  clearanceM: number;
  recommendedAction: "continue" | "slow_approach" | "strafe_bypass" | "halt_replan";
  reason: string;
}

export type CostmapValue = number; // 0 = Free, 253 = Inscribed, 254 = Lethal, 255 = Unknown

export const COSTMAP_FREE = 0;
export const COSTMAP_INSCRIBED = 253;
export const COSTMAP_LETHAL = 254;
export const COSTMAP_UNKNOWN = 255;

export type RoverMissionState =
  | "uninitialized"
  | "anchor_localizing"
  | "global_planning"
  | "corridor_transit"
  | "dynamic_recovery"
  | "settle_interlock"
  | "volumetric_3d_scan"
  | "gap_evaluation";
