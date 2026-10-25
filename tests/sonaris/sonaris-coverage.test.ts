import { describe, expect, it } from "vitest";
import {
  analyzeCoverageAndGaps,
  computeAPF,
  findNavPath,
  findThetaStarPath,
  generateMecanumTrajectory,
  purePursuitStep,
  ROOM_PRESETS
} from "@/sonaris/lib/sonaris-coverage";
import { scanRoom } from "@/sonaris/lib/sonaris-engine";

describe("SONARIS Spatial Coverage and Gap Analysis", () => {
  it("reports 0% coverage and full gaps for empty point cloud", () => {
    const report = analyzeCoverageAndGaps([], 6, 5);
    expect(report.coveragePercent).toBe(0);
    expect(report.gaps.length).toBeGreaterThan(0);
    expect(report.primaryGap).not.toBeNull();
  });

  it("calculates coverage and recommends next-best-view vantage pose", () => {
    // Generate returns from center at tilt 0°
    const points = scanRoom(6, 5, 0, 0, 0, 0, 360, 30, 0, 0.5);
    const report = analyzeCoverageAndGaps(points, 6, 5);

    expect(report.coveragePercent).toBeGreaterThan(50);
    expect(report.recommendedVantage).toBeDefined();
    expect(typeof report.recommendedVantage.x).toBe("number");
    expect(typeof report.recommendedVantage.z).toBe("number");
    expect(typeof report.recommendedVantage.heading).toBe("number");
  });

  it("keeps recommended vantage coordinates within room boundaries", () => {
    const report = analyzeCoverageAndGaps([], 6, 5);
    const { x, z } = report.recommendedVantage;

    expect(Math.abs(x)).toBeLessThan(3.0);
    expect(Math.abs(z)).toBeLessThan(2.5);
  });

  it("provides clean benchmark room environment preset", () => {
    expect(ROOM_PRESETS.length).toBeGreaterThanOrEqual(1);
    expect(ROOM_PRESETS.some((r) => r.id === "chamber")).toBe(true);
    expect(ROOM_PRESETS.find((r) => r.id === "chamber")?.obstacles).toHaveLength(0);
  });

  it("finds collision-free paths around obstacles", () => {
    const obstacles = [{ x: 0, z: 0, width: 2, depth: 2, height: 1 }];
    const path = findNavPath([-2, 0], [2, 0], obstacles, 6, 5);
    expect(path.length).toBeGreaterThan(2); // detours around obstacle
  });

  it("generates time-series trajectory with 4-wheel mecanum inverse kinematics RPM", () => {
    const waypoints: [number, number][] = [[0, 0], [1, 1]];
    const traj = generateMecanumTrajectory(waypoints, 45, 0.5);
    expect(traj.length).toBeGreaterThan(5);
    const mid = traj[Math.floor(traj.length / 2)];
    expect(mid.wheelRPMs).toHaveLength(4);
    expect(mid.wheelRPMs.every((rpm) => typeof rpm === "number" && !isNaN(rpm))).toBe(true);
  });

  it("quantizes wall coverage into 16 height bins of 15 cm each", () => {
    const report = analyzeCoverageAndGaps([], 6, 5);
    expect(report.heightBins).toHaveLength(16);
    expect(report.heightBins[0].minY).toBe(0.0);
    expect(report.heightBins[0].maxY).toBe(0.15);
    expect(report.heightBins[15].maxY).toBe(2.4);
    expect(report.capturedBinsCount + report.unseenBinsCount + report.outOfReachBinsCount).toBe(16);
  });

  it("plans any-angle collision-free paths with Theta* line-of-sight shortcutting", () => {
    const obstacles = [{ x: 0, z: 0, width: 1.6, depth: 1.6, height: 1.2 }];
    const path = findThetaStarPath([-2.2, 0], [2.2, 0], obstacles, 6, 5, 0.35);
    expect(path.length).toBeGreaterThanOrEqual(2);
    // Waypoints must stay within room boundary
    for (const [x, z] of path) {
      expect(Math.abs(x)).toBeLessThanOrEqual(3.0);
      expect(Math.abs(z)).toBeLessThanOrEqual(2.5);
    }
  });

  it("evaluates Artificial Potential Field (APF) forces and time-to-collision", () => {
    const obstacles = [{ x: 0, z: 0, width: 1.0, depth: 1.0, height: 1.0 }];
    const apf = computeAPF([0, 0.9], [0, 2.5], obstacles);
    expect(apf.attractiveForce[1]).toBeGreaterThan(0); // Attracted towards +Z goal
    expect(apf.repulsiveForce[1]).toBeGreaterThan(0); // Repulsed away from obstacle at Z=0 (+Z direction)
    expect(apf.minClearance).toBeGreaterThan(0);
    expect(apf.timeToCollision).toBeGreaterThan(0);
  });

  it("calculates Pure Pursuit lookahead point and holonomic mecanum RPMs", () => {
    const waypoints: [number, number][] = [[0, 0], [1, 0], [2, 1]];
    const pose = { x: 0.2, z: 0, headingDeg: 0 };
    const step = purePursuitStep(pose, waypoints, 0.40, 0.50);
    expect(step.targetPoint).toBeDefined();
    expect(step.vx).toBeGreaterThan(0);
    expect(step.wheelRPMs).toHaveLength(4);
    expect(step.reachedGoal).toBe(false);
  });
});
