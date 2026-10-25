import { describe, expect, it } from "vitest";
import {
  analyzeCoverageAndGaps,
  findNavPath,
  generateMecanumTrajectory,
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

  it("provides 3 room environment presets with obstacles", () => {
    expect(ROOM_PRESETS.length).toBe(3);
    expect(ROOM_PRESETS.some((r) => r.id === "chamber")).toBe(true);
    expect(ROOM_PRESETS.some((r) => r.id === "depot")).toBe(true);
    expect(ROOM_PRESETS.some((r) => r.id === "partitioned")).toBe(true);
    expect(ROOM_PRESETS.every((r) => r.obstacles.length > 0)).toBe(true);
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
});
