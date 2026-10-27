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

  it("provides authentic proving ground preset with multi-terrain features", () => {
    expect(ROOM_PRESETS.length).toBe(1);
    expect(ROOM_PRESETS[0].id).toBe("proving_ground");
    expect(ROOM_PRESETS[0].name).toBe("Proving Ground");
    expect(ROOM_PRESETS[0].obstacles.length).toBeGreaterThan(0);
    expect(ROOM_PRESETS[0].terrainFeatures?.length).toBeGreaterThan(0);
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

  it("interpolates continuous elevation across ramps, mezzanines, and curbs", async () => {
    const { getRoomElevationAt, ROOM_PRESETS } = await import("@/sonaris/lib/sonaris-coverage");
    const rampRoom = ROOM_PRESETS.find((r) => r.id === "proving_ground")!;
    expect(rampRoom).toBeDefined();

    // At the start of the climb ramp (z = 0.60 - 0.84 = -0.24)
    const elevStart = getRoomElevationAt(rampRoom, 0.0, -0.24);
    expect(elevStart).toBeCloseTo(0, 2);

    // Halfway up the climb ramp (z = 0.60)
    const elevMid = getRoomElevationAt(rampRoom, 0.0, 0.60);
    expect(elevMid).toBeCloseTo(0.225, 2);

    // At the top of the climb ramp (z = 0.60 + 0.84 = 1.44)
    const elevTop = getRoomElevationAt(rampRoom, 0.0, 1.44);
    expect(elevTop).toBeCloseTo(0.45, 2);

    // On the elevated mezzanine floor (x = -0.60, z = 2.44)
    const elevMezzanine = getRoomElevationAt(rampRoom, -0.60, 2.44);
    expect(elevMezzanine).toBeCloseTo(0.45, 2);

    // Halfway down the 10° descent ramp (x = -3.475, z = 2.44)
    const elevDescent = getRoomElevationAt(rampRoom, -3.475, 2.44);
    expect(elevDescent).toBeCloseTo(0.225, 2);

    // Threshold curb step (z = -0.60)
    const elevCurb = getRoomElevationAt(rampRoom, 0.0, -0.60);
    expect(elevCurb).toBeCloseTo(0.025, 3);

    // Off the ramp on open ground
    const elevGround = getRoomElevationAt(rampRoom, 2.0, 0.0);
    expect(elevGround).toBe(0);
  });

  it("calculates 3D surface attitude (ground pitch & roll angles) from terrain elevation gradients", async () => {
    const { getRoomAttitudeAt, ROOM_PRESETS } = await import("@/sonaris/lib/sonaris-coverage");
    const rampRoom = ROOM_PRESETS.find((r) => r.id === "proving_ground")!;

    // Heading 90° (+Z, driving directly up the 15° ASTM climb ramp)
    // Ramp slope: 0.45m rise / 1.68m run ≈ 0.268 gradient -> atan(0.268) ≈ 15.0° pitch
    const uphillAttitude = getRoomAttitudeAt(rampRoom, 0.0, 0.60, 90);
    expect(uphillAttitude.elevation).toBeCloseTo(0.225, 2);
    expect(uphillAttitude.pitchDeg).toBeGreaterThan(13);
    expect(uphillAttitude.pitchDeg).toBeLessThan(17);
    expect(Math.abs(uphillAttitude.rollDeg)).toBeLessThan(1); // Straight uphill: roll is ~0

    // Heading 270° (-Z, driving down the 15° ramp)
    const downhillAttitude = getRoomAttitudeAt(rampRoom, 0.0, 0.60, 270);
    expect(downhillAttitude.pitchDeg).toBeLessThan(-13);
    expect(downhillAttitude.pitchDeg).toBeGreaterThan(-17);

    // Heading 0° (+X, driving across the ramp contour laterally)
    const traverseAttitude = getRoomAttitudeAt(rampRoom, 0.0, 0.60, 0);
    expect(Math.abs(traverseAttitude.pitchDeg)).toBeLessThan(1);
    expect(Math.abs(traverseAttitude.rollDeg)).toBeGreaterThan(13); // Lateral roll on side-slope

    // Heading 180° (-X, driving down the 10° descent ramp towards ground level)
    const descentAttitude = getRoomAttitudeAt(rampRoom, -3.475, 2.44, 180);
    expect(descentAttitude.elevation).toBeCloseTo(0.225, 2);
    expect(descentAttitude.pitchDeg).toBeLessThan(-8);
    expect(descentAttitude.pitchDeg).toBeGreaterThan(-12);
  });

  it("classifies multi-terrain sectors and calculates physical surface cause-and-effect parameters", async () => {
    const { getRoomTerrainAt, ROOM_PRESETS } = await import("@/sonaris/lib/sonaris-coverage");
    const room = ROOM_PRESETS.find((r) => r.id === "proving_ground")!;

    // 1. Central Runway (Smooth floor)
    const runway = getRoomTerrainAt(room, 0.0, -2.0);
    expect(runway.type).toBe("smooth");
    expect(runway.frictionCoeff).toBeCloseTo(0.95, 2);
    expect(runway.slipMultiplier).toBe(1.0);
    expect(runway.costWeight).toBe(1.0);

    // 2. East Gravel Bed (loose stones)
    const gravel = getRoomTerrainAt(room, 3.0, 0.5);
    expect(gravel.type).toBe("gravel");
    expect(gravel.frictionCoeff).toBeCloseTo(0.50, 2);
    expect(gravel.slipMultiplier).toBeGreaterThan(2.0); // High wheel slip
    expect(gravel.costWeight).toBeGreaterThan(2.0); // Higher traversal cost

    // 3. West Washboard Bumps Course (corrugated ridges)
    const bumps = getRoomTerrainAt(room, -2.8, -0.6);
    expect(bumps.type).toBe("bumps");
    expect(bumps.speedCapMs).toBeLessThanOrEqual(0.15); // Speed throttled for shock mitigation
    expect(bumps.costWeight).toBe(2.0);

    // 4. Central Climb Slope
    const slope = getRoomTerrainAt(room, 0.0, 0.6);
    expect(slope.type).toBe("ramp");
    expect(slope.costWeight).toBe(1.5);

    // 5. Southeast Sump Void (Drop-off Pit)
    const voidPit = getRoomTerrainAt(room, 2.8, -2.5);
    expect(voidPit.type).toBe("void");
    expect(voidPit.costWeight).toBeGreaterThanOrEqual(900); // Impassable fall hazard
  });

  it("oscillates pitch and calculates vibration across corrugated washboard bump crests", async () => {
    const { getRoomAttitudeAt, ROOM_PRESETS } = await import("@/sonaris/lib/sonaris-coverage");
    const room = ROOM_PRESETS.find((r) => r.id === "proving_ground")!;

    // On the washboard bumps course (x = -2.8, z starts at -1.72, wavelength 0.32m)
    // At quarter wavelength past start: climbing up the crest (positive pitch)
    const zQuarter = -1.72 + 0.08;
    const attUp = getRoomAttitudeAt(room, -2.8, zQuarter, 90);
    expect(attUp.pitchDeg).toBeGreaterThan(3);

    // At three-quarter wavelength past start: descending down the crest (negative pitch)
    const zThreeQuarter = -1.72 + 0.24;
    const attDown = getRoomAttitudeAt(room, -2.8, zThreeQuarter, 90);
    expect(attDown.pitchDeg).toBeLessThan(-3);
  });

  it("raycasts cylindrical pillars and inclined ramp wedges with authentic normals", async () => {
    const { scanRoom } = await import("@/sonaris/lib/sonaris-engine");

    // Test Cylinder Obstacle: cylinder at (0, 2) with radius 0.4m
    const cylinderObs = [{ x: 0, z: 2, width: 0.8, depth: 0.8, height: 2.0, shape: "cylinder" as const, radius: 0.4 }];
    // Rover at (0, 0) facing 90° (+Z)
    const pointsCyl = scanRoom(6, 6, 0, 0, 90, 0, 1, 10, 0, 0.26, cylinderObs, 3, 10, 0, { includeNormals: true });
    expect(pointsCyl.length).toBe(1);
    // Cylinder boundary is at z = 2.0 - 0.4 = 1.6m -> distance should be 1.6m
    expect(pointsCyl[0].z).toBeCloseTo(1.6, 1);
    // Normal facing back towards sensor (-Z)
    expect(pointsCyl[0].normal![2]).toBeCloseTo(-1, 1);

    // Test Ramp Obstacle: ramp at (0, 2) rising in posZ from 0 to 0.4m
    const rampObs = [{ x: 0, z: 2, width: 1.0, depth: 2.0, height: 0.4, shape: "ramp" as const, rampDirection: "posZ" as const }];
    // Rover at (0, 0) at sensorHeight 0.5m tilted downwards -10°
    const pointsRamp = scanRoom(6, 6, 0, 0, 90, -10, 1, 10, 0, 0.5, rampObs, 3, 10, 0, { includeNormals: true });
    expect(pointsRamp.length).toBe(1);
    // Ramp surface normal should have positive Y (upward) and negative Z (tilted back)
    expect(pointsRamp[0].normal![1]).toBeGreaterThan(0.9);
    expect(pointsRamp[0].normal![2]).toBeLessThan(0);
  });

  it("downsamples dense point clouds and filters duplicate voxels", async () => {
    const { downsampleVoxelPoints, filterDuplicateVoxelPoints } = await import(
      "@/sonaris/lib/sonaris-coverage"
    );

    // 10 points within a 2 cm radius (all fall inside the same 25 mm voxel)
    const densePoints = Array.from({ length: 10 }, (_, i) => ({
      x: 1.0 + i * 0.001,
      y: 0.5 + i * 0.001,
      z: 2.0 + i * 0.001
    }));

    const downsampled = downsampleVoxelPoints(densePoints, 0.025);
    expect(downsampled.length).toBe(1);
    expect(downsampled[0].x).toBeCloseTo(1.0, 2);

    // Points in distinct voxels remain intact
    const distinctPoints = [
      { x: 0.0, y: 0.0, z: 0.0 },
      { x: 0.1, y: 0.0, z: 0.0 },
      { x: 0.2, y: 0.0, z: 0.0 }
    ];
    expect(downsampleVoxelPoints(distinctPoints, 0.025).length).toBe(3);

    // filterDuplicateVoxelPoints ignores existing voxels
    const existing = [{ x: 1.0, y: 0.5, z: 2.0 }];
    const incoming = [
      { x: 1.002, y: 0.501, z: 2.001 }, // duplicate
      { x: 2.5, y: 0.5, z: 2.0 }         // new distinct voxel
    ];
    const filtered = filterDuplicateVoxelPoints(incoming, existing, 0.025);
    expect(filtered.length).toBe(1);
    expect(filtered[0].x).toBeCloseTo(2.5, 2);
  });

  it("enforces hard physical hitbox boundaries and non-penetration constraints", async () => {
    const { resolveRoverCollision, isPointCollisionFree, ROOM_PRESETS } = await import(
      "@/sonaris/lib/sonaris-coverage"
    );
    const room = ROOM_PRESETS[0];

    // 1. Arena Perimeter Wall Collision: trying to drive outside arena boundary (x = 5.5, z = -4.5)
    const wallCollision = resolveRoverCollision(5.5, -4.5, 0.22, room.obstacles, room.width, room.depth);
    expect(wallCollision.isColliding).toBe(true);
    expect(wallCollision.x).toBeCloseTo(room.width / 2 - 0.22, 2); // Clamped to East wall boundary
    expect(wallCollision.z).toBeCloseTo(-room.depth / 2 + 0.22, 2); // Clamped to North wall boundary
    expect(wallCollision.contactNormal).toBeDefined();

    // 2. Cylindrical Pillar Collision: Pillar A is at (1.80, 2.00) with radius 0.20m
    // Trying to place rover at (1.80, 1.95) with radius 0.22m -> distance is 0.05m < 0.42m
    const pillarCollision = resolveRoverCollision(1.80, 1.95, 0.22, room.obstacles, room.width, room.depth);
    expect(pillarCollision.isColliding).toBe(true);
    expect(pillarCollision.contactObstacle).toContain("Column");
    // Resolved distance must be >= (0.20 + 0.22) = 0.42m
    const distToCol = Math.hypot(pillarCollision.x - 1.80, pillarCollision.z - 2.00);
    expect(distToCol).toBeGreaterThanOrEqual(0.419);

    // 3. Partition Wall Collision: Safety wall at x = 0.90, z = -1.60, width = 0.18, depth = 1.80
    // Rover at x = 0.92, z = -1.60 (directly inside wall center)
    const wallPen = resolveRoverCollision(0.92, -1.60, 0.22, room.obstacles, room.width, room.depth);
    expect(wallPen.isColliding).toBe(true);
    // Ejected outside wall face (width / 2 + 0.22 = 0.09 + 0.22 = 0.31m away from center 0.90)
    expect(Math.abs(wallPen.x - 0.90)).toBeGreaterThanOrEqual(0.309);

    // 4. Free Space Validation
    expect(isPointCollisionFree(0.0, -2.4, 0.22, room.obstacles, room.width, room.depth)).toBe(true);
    // Pillar center must not be free
    expect(isPointCollisionFree(1.80, 2.00, 0.22, room.obstacles, room.width, room.depth)).toBe(false);
  });
});
