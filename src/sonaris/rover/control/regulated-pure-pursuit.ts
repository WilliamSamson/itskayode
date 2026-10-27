/**
 * SONARIS Regulated Pure Pursuit Controller (ROS 2 Nav2 RPPC Pattern)
 * Calculates velocity commands (geometry_msgs/Twist) to follow a global path while
 * regulating speed against path curvature, proximity to obstacles, and local corridor hazards.
 */

import { LocalRollingCostmap } from "../costmap/local-costmap";
import { solveMecanumWheelSpeeds } from "../kinematics/mecanum-drive";
import {
  type Pose2D,
  type Twist2D,
  type WheelRPMs,
  DEFAULT_ROVER_SPECS,
  type RoverChassisSpecs
} from "../types";

export interface ControllerConfig {
  cruiseSpeedMPerSec: number;
  minLookaheadM: number;
  maxLookaheadM: number;
  lookaheadTimeSec: number;
  maxAngularRateDegPerSec: number;
  goalToleranceM: number;
}

export const DEFAULT_CONTROLLER_CONFIG: ControllerConfig = {
  cruiseSpeedMPerSec: 0.45,
  minLookaheadM: 0.20,
  maxLookaheadM: 0.75,
  lookaheadTimeSec: 0.80,
  maxAngularRateDegPerSec: 90.0,
  goalToleranceM: 0.08
};

export interface LocalControlStepResult {
  cmdVel: Twist2D;
  wheelRPMs: WheelRPMs;
  targetPoint: [number, number];
  lookaheadDistanceM: number;
  isGoalReached: boolean;
  isCollisionImminent: boolean;
}

export class RegulatedPurePursuitController {
  private config: ControllerConfig;
  private specs: RoverChassisSpecs;
  private localCostmap: LocalRollingCostmap | null = null;

  constructor(
    config = DEFAULT_CONTROLLER_CONFIG,
    specs = DEFAULT_ROVER_SPECS
  ) {
    this.config = config;
    this.specs = specs;
  }

  setLocalCostmap(costmap: LocalRollingCostmap) {
    this.localCostmap = costmap;
  }

  /**
   * Executes a single control cycle at the given pose and global path.
   */
  computeControl(
    currentPose: Pose2D,
    pathWaypoints: [number, number][]
  ): LocalControlStepResult {
    const { x, z, headingDeg } = currentPose;

    if (pathWaypoints.length === 0) {
      return {
        cmdVel: { vx: 0, vy: 0, omegaDeg: 0 },
        wheelRPMs: [0, 0, 0, 0],
        targetPoint: [x, z],
        lookaheadDistanceM: 0,
        isGoalReached: true,
        isCollisionImminent: false
      };
    }

    const goal = pathWaypoints[pathWaypoints.length - 1];
    const distToGoal = Math.hypot(goal[0] - x, goal[1] - z);

    if (distToGoal <= this.config.goalToleranceM) {
      return {
        cmdVel: { vx: 0, vy: 0, omegaDeg: 0 },
        wheelRPMs: [0, 0, 0, 0],
        targetPoint: goal,
        lookaheadDistanceM: 0,
        isGoalReached: true,
        isCollisionImminent: false
      };
    }

    // 1. Approach velocity regulation: trapezoidal ramp into goal
    const approachSpeed = Math.min(
      this.config.cruiseSpeedMPerSec,
      Math.max(0.10, Math.sqrt(2 * 0.65 * distToGoal))
    );

    // 2. Adaptive lookahead distance: scales with speed
    const lookaheadDist = Math.max(
      this.config.minLookaheadM,
      Math.min(this.config.maxLookaheadM, approachSpeed * this.config.lookaheadTimeSec)
    );

    // 3. Find lookahead target point along path
    let target: [number, number] = goal;
    for (let i = 0; i < pathWaypoints.length - 1; i++) {
      const p1 = pathWaypoints[i];
      const p2 = pathWaypoints[i + 1];
      const dx = p2[0] - p1[0];
      const dz = p2[1] - p1[1];
      const segLen = Math.hypot(dx, dz);
      if (segLen < 1e-4) continue;

      const t = Math.max(0, Math.min(1, ((x - p1[0]) * dx + (z - p1[1]) * dz) / (segLen * segLen)));
      const projX = p1[0] + t * dx;
      const projZ = p1[1] + t * dz;
      const distFromProj = Math.hypot(x - projX, z - projZ);

      if (distFromProj <= lookaheadDist) {
        const forwardT = Math.min(1.0, t + lookaheadDist / segLen);
        target = [p1[0] + forwardT * dx, p1[1] + forwardT * dz];
        break;
      }
    }

    // 4. Arc collision checking on local costmap
    let isCollisionImminent = false;
    if (this.localCostmap) {
      const arcSteps = 5;
      for (let s = 1; s <= arcSteps; s++) {
        const checkX = x + (target[0] - x) * (s / arcSteps);
        const checkZ = z + (target[1] - z) * (s / arcSteps);
        if (this.localCostmap.isLethal(checkX, checkZ)) {
          isCollisionImminent = true;
          break;
        }
      }
    }

    // 5. Compute heading error and turning curvature
    const tDx = target[0] - x;
    const tDz = target[1] - z;
    const targetHeading = ((Math.atan2(tDz, tDx) * 180) / Math.PI + 360) % 360;
    const headingDiff = ((targetHeading - headingDeg + 540) % 360) - 180;

    // 6. Curvature regulation: slow down on sharp turns
    const curvatureFactor = 1.0 / (1.0 + Math.abs(headingDiff) / 45.0);
    const regulatedSpeed = isCollisionImminent ? 0.08 : approachSpeed * curvatureFactor;

    // 7. Body-frame velocity components
    const radHeading = (headingDeg * Math.PI) / 180;
    const cosH = Math.cos(radHeading);
    const sinH = Math.sin(radHeading);

    const worldDist = Math.hypot(tDx, tDz);
    const worldVx = worldDist > 1e-4 ? (tDx / worldDist) * regulatedSpeed : 0;
    const worldVz = worldDist > 1e-4 ? (tDz / worldDist) * regulatedSpeed : 0;

    // Local forward (vx) and lateral (vy) components
    const localVx = worldVx * cosH + worldVz * sinH;
    const localVy = -worldVx * sinH + worldVz * cosH;

    const omegaDeg = Math.max(
      -this.config.maxAngularRateDegPerSec,
      Math.min(this.config.maxAngularRateDegPerSec, headingDiff * 2.0)
    );

    const twist: Twist2D = {
      vx: Number(localVx.toFixed(3)),
      vy: Number(localVy.toFixed(3)),
      omegaDeg: Number(omegaDeg.toFixed(1))
    };

    // 8. Mecanum motor command generation
    const { wheelRPMs } = solveMecanumWheelSpeeds(twist, this.specs);

    return {
      cmdVel: twist,
      wheelRPMs,
      targetPoint: target,
      lookaheadDistanceM: Number(lookaheadDist.toFixed(3)),
      isGoalReached: false,
      isCollisionImminent
    };
  }
}
