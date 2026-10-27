/**
 * SONARIS Environmental Factor & Hazard Assessment Engine
 * Classifies arbitrary terrain geometry into traversability tiers without prior world assumptions.
 */

import {
  type RoverChassisSpecs,
  type TerrainHazardAssessment,
  DEFAULT_ROVER_SPECS
} from "../types";

export interface TerrainMeasurement {
  measuredElevationM: number;
  expectedElevationM: number;
  surfaceNormalY: number;    // Upward component of surface normal
  obstacleHeightM?: number;  // Height of detected surface feature
  obstacleBaseYM?: number;   // Base elevation of feature
  distanceToRoverM: number;
}

/**
 * Assesses an arbitrary perceived terrain measurement against the rover's physical chassis limits.
 */
export function assessTerrainHazard(
  measurement: TerrainMeasurement,
  specs: RoverChassisSpecs = DEFAULT_ROVER_SPECS
): TerrainHazardAssessment {
  const {
    measuredElevationM,
    expectedElevationM,
    surfaceNormalY,
    obstacleHeightM = 0,
    obstacleBaseYM = 0,
    distanceToRoverM
  } = measurement;

  const elevationDelta = measuredElevationM - expectedElevationM;

  // 1. Negative Obstacle Check (Pits, Cliffs, Floor Voids)
  // If the measured ground drops more than the rollable step threshold below expected terrain:
  if (elevationDelta < -specs.maxStepHeightM) {
    return {
      classification: "lethal_pit",
      isNavigable: false,
      stepHeightM: Math.abs(elevationDelta),
      slopeDeg: 90,
      clearanceM: Math.max(0, distanceToRoverM - specs.footprintRadiusM),
      recommendedAction: "halt_replan",
      reason: `Floor drop-off (${(Math.abs(elevationDelta) * 100).toFixed(1)} cm) exceeds rollable threshold (${(specs.maxStepHeightM * 100).toFixed(1)} cm).`
    };
  }

  // 2. High Overhead Clearances (Shelves, Tunnels, Cantilever Beams)
  // If an obstacle base starts higher than the rover's mast height (0.65m), the chassis passes safely underneath:
  if (obstacleBaseYM >= 0.65) {
    return {
      classification: "head_overhang_clear",
      isNavigable: true,
      stepHeightM: 0,
      slopeDeg: 0,
      clearanceM: obstacleBaseYM,
      recommendedAction: "continue",
      reason: `Overhead feature (base at ${obstacleBaseYM.toFixed(2)} m) clears rover chassis (0.65 m envelope).`
    };
  }

  // 3. Low Rollable Step (e.g. cable tray, door sill, low ramp lip < 35mm)
  if (elevationDelta > 0 && elevationDelta <= specs.maxStepHeightM && obstacleHeightM <= specs.maxStepHeightM) {
    return {
      classification: "rollable_step",
      isNavigable: true,
      stepHeightM: elevationDelta,
      slopeDeg: 0,
      clearanceM: Math.max(0, distanceToRoverM - specs.footprintRadiusM),
      recommendedAction: "slow_approach",
      reason: `Step height (${(elevationDelta * 100).toFixed(1)} cm) is within 100 mm Mecanum wheel rollable limit.`
    };
  }

  // 4. Ground Slope & Ramp Analysis
  // Calculate slope angle from surface normal Y component: cos(slope) = normal.y
  const clampedNormalY = Math.max(0, Math.min(1, surfaceNormalY));
  const slopeDeg = (Math.acos(clampedNormalY) * 180) / Math.PI;

  if (slopeDeg > 0 && slopeDeg <= specs.maxTraversableSlopeDeg) {
    return {
      classification: "traversable_slope",
      isNavigable: true,
      stepHeightM: elevationDelta,
      slopeDeg: Number(slopeDeg.toFixed(1)),
      clearanceM: Math.max(0, distanceToRoverM - specs.footprintRadiusM),
      recommendedAction: "continue",
      reason: `Terrain slope (${slopeDeg.toFixed(1)}°) is within stable climb envelope (≤ ${specs.maxTraversableSlopeDeg}°).`
    };
  }

  // 5. Rigid Vertical Obstacle or Excessive Slope
  return {
    classification: "lethal_obstacle",
    isNavigable: false,
    stepHeightM: obstacleHeightM > 0 ? obstacleHeightM : elevationDelta,
    slopeDeg: Number(slopeDeg.toFixed(1)),
    clearanceM: Math.max(0, distanceToRoverM - specs.footprintRadiusM),
    recommendedAction: distanceToRoverM < specs.footprintRadiusM * 1.5 ? "halt_replan" : "strafe_bypass",
    reason: slopeDeg > specs.maxTraversableSlopeDeg
      ? `Slope (${slopeDeg.toFixed(1)}°) exceeds rover tipping limit (${specs.maxTraversableSlopeDeg}°).`
      : `Rigid vertical obstacle (${(obstacleHeightM * 100).toFixed(1)} cm) blocks chassis traversal.`
  };
}
