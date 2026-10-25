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

  it("computes volumetric 3D voxel occupancy grid with ray free-space clearing and frontiers", () => {
    const points = scanRoom(6, 5, 0, 0, 0, 0, 360, 30, 0, 0.5);
    const report = analyzeCoverageAndGaps(points, 6, 5);
    expect(report.voxelStats).toBeDefined();
    expect(report.voxelStats?.totalVoxels).toBeGreaterThan(100);
    expect(report.voxelStats?.occupiedCount).toBeGreaterThan(0);
    expect(report.voxelStats?.freeCount).toBeGreaterThan(0);
    expect(report.voxelStats?.volumePercent).toBeGreaterThan(0);
    expect(report.voxelStats?.frontierCount).toBeGreaterThanOrEqual(0);
  });

  it("models Mecanum wheel slip odometry drift and corrects it via 2D ICP registration", async () => {
    const { addMecanumOdometryDrift, alignScanICP } = await import("@/sonaris/lib/sonaris-coverage");
    const truePose = { x: 1.0, z: -0.5, heading: 45 };
    const drift = addMecanumOdometryDrift(truePose, 2.5, 90);
    
    expect(drift.estimatedPose).toBeDefined();
    expect(typeof drift.driftOffset.dx).toBe("number");
    expect(typeof drift.driftOffset.dz).toBe("number");
    expect(typeof drift.driftOffset.dHeadingDeg).toBe("number");

    // Scan reference from (0,0) and second scan from (0.05, 0.05)
    const refScan = scanRoom(6, 5, 0, 0, 0, 0, 180, 30, 0, 0.5);
    const driftedScan = refScan.map((p) => ({ x: p.x + 0.08, y: p.y, z: p.z - 0.05 }));

    const icp = alignScanICP(driftedScan, refScan, { maxIterations: 10 });
    expect(icp.converged).toBe(true);
    expect(icp.residualErrorM).toBeLessThan(0.02); // Snaps back within 2 cm error
    expect(icp.transform.dx).toBeCloseTo(-0.08, 1);
    expect(icp.transform.dz).toBeCloseTo(0.05, 1);
  });

  it("scans driving corridor at downward angle window to detect floor holes and obstacles with autonomous bypass decisions", async () => {
    const { scanDrivingCorridor, evaluateAutonomousDecision } = await import(
      "@/sonaris/lib/sonaris-coverage"
    );

    // 1. Clear floor corridor
    const clearHazard = scanDrivingCorridor({ x: 0, z: 0, heading: 0 }, [], 6, 5, 0.85, -16);
    expect(clearHazard.type).toBe("clear");
    expect(clearHazard.inspectionAngleDeg).toBe(-16);
    const clearDecision = evaluateAutonomousDecision({ x: 0, z: 0, heading: 0 }, clearHazard);
    expect(clearDecision.action).toBe("proceed");

    // 2. Physical Obstacle in path
    const obstacle = [{ x: 0.6, z: 0, width: 0.5, depth: 0.5, height: 1.0 }];
    const obsHazard = scanDrivingCorridor({ x: 0, z: 0, heading: 0 }, obstacle, 6, 5, 0.85, -16);
    expect(obsHazard.type).toBe("obstacle");
    expect(obsHazard.distanceM).toBeLessThanOrEqual(0.65);
    expect(obsHazard.suggestedBypass).toBeDefined();

    const obsDecision = evaluateAutonomousDecision({ x: 0, z: 0, heading: 0 }, obsHazard);
    expect(["detour_left", "detour_right"]).toContain(obsDecision.action);
    expect(obsDecision.lateralNudge[1]).not.toBe(0); // Applies lateral offset

    // 3. Negative Obstacle / Floor Void in path
    const hole = [{ x: 0.55, z: 0, width: 0.5, depth: 0.5, height: 0, isHole: true }];
    const holeHazard = scanDrivingCorridor({ x: 0, z: 0, heading: 0 }, hole, 6, 5, 0.85, -16);
    expect(holeHazard.type).toBe("hole");
    expect(holeHazard.suggestedBypass).toBeDefined();

    const holeDecision = evaluateAutonomousDecision({ x: 0, z: 0, heading: 0 }, holeHazard);
    expect(["detour_left", "detour_right"]).toContain(holeDecision.action);
    expect(holeDecision.reason).toContain("Floor void");
  });
});
