/**
 * SONARIS Mecanum Kinematics Engine
 * Provides authentic 4-wheel inverse and forward kinematics with anisotropic roller slip compensation.
 */

import {
  type RoverChassisSpecs,
  type Twist2D,
  type WheelRPMs,
  DEFAULT_ROVER_SPECS
} from "../types";

/**
 * Solves 4-wheel Mecanum angular speeds and motor RPMs from planar velocity commands.
 * Wheel sequence: [0: Front-Left, 1: Front-Right, 2: Rear-Left, 3: Rear-Right]
 */
export function solveMecanumWheelSpeeds(
  twist: Twist2D,
  specs: RoverChassisSpecs = DEFAULT_ROVER_SPECS
): {
  wheelRadPerSec: [number, number, number, number];
  wheelRPMs: WheelRPMs;
} {
  const { vx, vy, omegaDeg } = twist;
  const { wheelRadiusM, halfLengthM, halfWidthM, lateralSlipCoeff } = specs;

  // Compensate for passive 45° roller slip in the lateral direction
  const effectiveVy = vy / Math.max(0.2, lateralSlipCoeff);
  const omegaRad = (omegaDeg * Math.PI) / 180;
  const geomSum = halfLengthM + halfWidthM;

  // Mecanum Inverse Kinematics Matrix:
  // FL = (vx - vy - (Lx + Ly)*w) / R
  // FR = (vx + vy + (Lx + Ly)*w) / R
  // RL = (vx + vy - (Lx + Ly)*w) / R
  // RR = (vx - vy + (Lx + Ly)*w) / R
  const wTerm = geomSum * omegaRad;
  const invR = 1 / Math.max(0.01, wheelRadiusM);

  const fl = (vx - effectiveVy - wTerm) * invR;
  const fr = (vx + effectiveVy + wTerm) * invR;
  const rl = (vx + effectiveVy - wTerm) * invR;
  const rr = (vx - effectiveVy + wTerm) * invR;

  const toRPM = 30 / Math.PI;

  return {
    wheelRadPerSec: [fl, fr, rl, rr],
    wheelRPMs: [
      Math.round(fl * toRPM),
      Math.round(fr * toRPM),
      Math.round(rl * toRPM),
      Math.round(rr * toRPM)
    ]
  };
}

/**
 * Projects body-frame velocity into world-frame displacement delta over timestep dt.
 */
export function forwardMecanumIntegration(
  currentPose: { x: number; z: number; headingDeg: number },
  bodyTwist: Twist2D,
  dtSec: number
): { x: number; z: number; headingDeg: number } {
  const rad = (currentPose.headingDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  // Body frame: vx is forward along heading, vy is lateral (left positive)
  const worldVx = bodyTwist.vx * cos - bodyTwist.vy * sin;
  const worldVz = bodyTwist.vx * sin + bodyTwist.vy * cos;

  const nextX = currentPose.x + worldVx * dtSec;
  const nextZ = currentPose.z + worldVz * dtSec;
  const nextHeading = ((currentPose.headingDeg + bodyTwist.omegaDeg * dtSec + 540) % 360) - 180;

  return {
    x: Number(nextX.toFixed(4)),
    z: Number(nextZ.toFixed(4)),
    headingDeg: Number(nextHeading.toFixed(2))
  };
}
