/**
 * SONARIS Transform Tree (ROS `tf` Architecture Pattern)
 * Mathematically links coordinate frames:
 * map ──> odom ──> base_link ──> tilt_mount ──> laser_optical
 */

import { type Pose2D } from "../types";

export interface Transform2D {
  x: number;
  z: number;
  yawDeg: number;
}

export interface TransformTreeState {
  mapToOdom: Transform2D;   // Corrected continuously by Cartographer / 2D ICP
  odomToBase: Transform2D;  // Estimated by Mecanum wheel odometry + IMU
  tiltPitchDeg: number;     // Dynamic ST3215 actuator angle (-30° to +60°)
  mastHeightM: number;      // e.g. 0.28m sensor elevation
}

export const DEFAULT_MAST_OFFSET = { x: 0.08, y: 0.28, z: 0.0 };
export const DEFAULT_OPTICAL_OFFSET = { x: 0.02, y: 0.018, z: 0.0 };

export class RoverTransformTree {
  private state: TransformTreeState;

  constructor(initialState?: Partial<TransformTreeState>) {
    this.state = {
      mapToOdom: { x: 0, z: 0, yawDeg: 0 },
      odomToBase: { x: 0, z: 0, yawDeg: 0 },
      tiltPitchDeg: 0,
      mastHeightM: 0.28,
      ...initialState
    };
  }

  /**
   * Updates map -> odom transform via SLAM / ICP correction.
   */
  updateMapToOdom(correction: Transform2D) {
    this.state.mapToOdom = { ...correction };
  }

  /**
   * Updates odom -> base_link from wheel encoder odometry integration.
   */
  updateOdomToBase(pose: Transform2D) {
    this.state.odomToBase = { ...pose };
  }

  /**
   * Updates ST3215 actuator tilt angle.
   */
  updateTiltAngle(pitchDeg: number) {
    this.state.tiltPitchDeg = pitchDeg;
  }

  /**
   * Computes the robot's authoritative pose in the global map frame:
   * T_map_base = T_map_odom * T_odom_base
   */
  getMapToBase(): Pose2D {
    const { mapToOdom, odomToBase } = this.state;
    const radMap = (mapToOdom.yawDeg * Math.PI) / 180;
    const cosM = Math.cos(radMap);
    const sinM = Math.sin(radMap);

    // Rotate odom position into map frame, then translate
    const x = mapToOdom.x + (odomToBase.x * cosM - odomToBase.z * sinM);
    const z = mapToOdom.z + (odomToBase.x * sinM + odomToBase.z * cosM);
    const headingDeg = ((mapToOdom.yawDeg + odomToBase.yawDeg + 540) % 360) - 180;

    return {
      x: Number(x.toFixed(4)),
      z: Number(z.toFixed(4)),
      headingDeg: Number(headingDeg.toFixed(2))
    };
  }

  /**
   * Transforms a raw LiDAR point from the laser optical frame directly to the global map frame.
   * Accounts for optical offset, actuator tilt pitch, mast elevation, and chassis pose.
   */
  laserToMap(rangeM: number, azimuthRad: number): [number, number, number] {
    const pitchRad = (this.state.tiltPitchDeg * Math.PI) / 180;
    const cosPitch = Math.cos(pitchRad);
    const sinPitch = Math.sin(pitchRad);

    // 1. Raw point in laser optical frame (S2 rotates in 2D plane: X forward, Z right)
    const lx = rangeM * Math.cos(azimuthRad) + DEFAULT_OPTICAL_OFFSET.x;
    const lz = rangeM * Math.sin(azimuthRad);
    const ly = DEFAULT_OPTICAL_OFFSET.y;

    // 2. Rotate through actuator pitch (about chassis X axis)
    // Pitching down (-pitch): beams point forward-down
    const tiltX = lx + DEFAULT_MAST_OFFSET.x;
    const tiltY = ly * cosPitch - lz * sinPitch;
    const tiltZ = ly * sinPitch + lz * cosPitch;

    // 3. Transform into global map frame
    const basePose = this.getMapToBase();
    const yawRad = (basePose.headingDeg * Math.PI) / 180;
    const cosY = Math.cos(yawRad);
    const sinY = Math.sin(yawRad);

    const worldX = basePose.x + (tiltX * cosY + tiltZ * sinY);
    const worldY = this.state.mastHeightM + tiltY;
    const worldZ = basePose.z + (-tiltX * sinY + tiltZ * cosY);

    return [
      Number(worldX.toFixed(3)),
      Number(worldY.toFixed(3)),
      Number(worldZ.toFixed(3))
    ];
  }
}
