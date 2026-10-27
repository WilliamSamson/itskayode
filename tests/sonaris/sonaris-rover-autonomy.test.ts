import { describe, expect, it } from "vitest";
import {
  DEFAULT_ROVER_SPECS,
  solveMecanumWheelSpeeds,
  forwardMecanumIntegration,
  LayeredCostmap,
  assessTerrainHazard,
  COSTMAP_FREE,
  COSTMAP_LETHAL
} from "@/sonaris/rover";

describe("SONARIS World-Agnostic Rover Autonomy Stack", () => {
  describe("Mecanum Kinematics & Roller Slip Compensation", () => {
    it("computes positive symmetrical forward RPMs for pure longitudinal motion", () => {
      const { wheelRPMs } = solveMecanumWheelSpeeds({ vx: 0.5, vy: 0, omegaDeg: 0 });
      // FL, FR, RL, RR should all be identical positive values
      expect(wheelRPMs[0]).toBeGreaterThan(0);
      expect(wheelRPMs[0]).toBe(wheelRPMs[1]);
      expect(wheelRPMs[1]).toBe(wheelRPMs[2]);
      expect(wheelRPMs[2]).toBe(wheelRPMs[3]);
    });

    it("applies lateral slip compensation factor for pure strafe commands", () => {
      const normal = solveMecanumWheelSpeeds({ vx: 0, vy: 0.3, omegaDeg: 0 });
      // Diagonal wheel pairing for lateral strafe: FL & RR negative, FR & RL positive
      expect(normal.wheelRPMs[0]).toBeLessThan(0);
      expect(normal.wheelRPMs[1]).toBeGreaterThan(0);
      expect(normal.wheelRPMs[2]).toBeGreaterThan(0);
      expect(normal.wheelRPMs[3]).toBeLessThan(0);
    });

    it("generates differential RPMs for pure zero-radius yaw turns", () => {
      const { wheelRPMs } = solveMecanumWheelSpeeds({ vx: 0, vy: 0, omegaDeg: 45 });
      // Left side wheels negative, right side wheels positive for CCW rotation
      expect(wheelRPMs[0]).toBeLessThan(0);
      expect(wheelRPMs[1]).toBeGreaterThan(0);
      expect(wheelRPMs[2]).toBeLessThan(0);
      expect(wheelRPMs[3]).toBeGreaterThan(0);
    });

    it("integrates forward kinematics over timestep dt", () => {
      const initialPose = { x: 0, z: 0, headingDeg: 0 };
      const next = forwardMecanumIntegration(initialPose, { vx: 0.4, vy: 0, omegaDeg: 0 }, 0.5);
      expect(next.x).toBeCloseTo(0.2, 2);
      expect(next.z).toBeCloseTo(0, 2);
      expect(next.headingDeg).toBe(0);
    });
  });

  describe("Layered Costmap Engine", () => {
    it("initializes with free space across the arena bounds", () => {
      const costmap = new LayeredCostmap(6, 6, 0.1);
      expect(costmap.getCost(0, 0)).toBe(COSTMAP_FREE);
      expect(costmap.isFree(0, 0)).toBe(true);
    });

    it("marks lethal obstacle and propagates exponential inflation outward", () => {
      const costmap = new LayeredCostmap(6, 6, 0.1, 0.28, 0.60);
      costmap.markObstacle(0, 0);

      // Within inscribed radius: lethal
      expect(costmap.getCost(0, 0)).toBe(COSTMAP_LETHAL);
      expect(costmap.isLethal(0, 0)).toBe(true);
      expect(costmap.isFree(0, 0)).toBe(false);

      // Inscribed radius (0.28m)
      expect(costmap.isLethal(0.20, 0)).toBe(true);

      // Inflation zone (0.45m): inflated cost > 0 but < 253
      const inflatedCost = costmap.getCost(0.45, 0);
      expect(inflatedCost).toBeGreaterThan(0);
      expect(inflatedCost).toBeLessThan(253);

      // Outside inflation zone (> 0.60m): completely free
      expect(costmap.getCost(1.5, 0)).toBe(COSTMAP_FREE);
    });

    it("marks negative pits as lethal hazards", () => {
      const costmap = new LayeredCostmap(6, 6, 0.1);
      costmap.markNegativePit(1.0, 1.0, 0.25);
      expect(costmap.isLethal(1.0, 1.0)).toBe(true);
    });
  });

  describe("Environmental Factor & Hazard Assessment", () => {
    it("classifies floor drops > 35mm as lethal pits requiring replanning", () => {
      const assessment = assessTerrainHazard({
        measuredElevationM: -0.15, // 15 cm hole
        expectedElevationM: 0.0,
        surfaceNormalY: 1.0,
        distanceToRoverM: 0.6
      });
      expect(assessment.classification).toBe("lethal_pit");
      expect(assessment.isNavigable).toBe(false);
      expect(assessment.recommendedAction).toBe("halt_replan");
    });

    it("identifies high-hanging obstacles (> 0.65m) as safe overhead clearances", () => {
      const assessment = assessTerrainHazard({
        measuredElevationM: 1.2,
        expectedElevationM: 0.0,
        surfaceNormalY: 0.0,
        obstacleBaseYM: 0.85, // Shelf at 85 cm
        obstacleHeightM: 0.35,
        distanceToRoverM: 0.5
      });
      expect(assessment.classification).toBe("head_overhang_clear");
      expect(assessment.isNavigable).toBe(true);
      expect(assessment.recommendedAction).toBe("continue");
    });

    it("allows rolling over low steps within 35mm threshold", () => {
      const assessment = assessTerrainHazard({
        measuredElevationM: 0.02, // 20 mm door sill/lip
        expectedElevationM: 0.0,
        surfaceNormalY: 1.0,
        obstacleHeightM: 0.02,
        distanceToRoverM: 0.4
      });
      expect(assessment.classification).toBe("rollable_step");
      expect(assessment.isNavigable).toBe(true);
      expect(assessment.recommendedAction).toBe("slow_approach");
    });

    it("classifies gentle slopes (≤ 18°) as traversable ramps", () => {
      // Normal for a 10° slope: cos(10°) ≈ 0.9848
      const assessment = assessTerrainHazard({
        measuredElevationM: 0.10,
        expectedElevationM: 0.05,
        surfaceNormalY: Math.cos((10 * Math.PI) / 180),
        distanceToRoverM: 0.8
      });
      expect(assessment.classification).toBe("traversable_slope");
      expect(assessment.isNavigable).toBe(true);
      expect(assessment.slopeDeg).toBeCloseTo(10, 0);
    });

    it("flags vertical walls and steep slopes (> 18°) as lethal obstacles", () => {
      const assessment = assessTerrainHazard({
        measuredElevationM: 0.40,
        expectedElevationM: 0.0,
        surfaceNormalY: Math.cos((35 * Math.PI) / 180), // 35° slope
        obstacleHeightM: 0.5,
        distanceToRoverM: 0.5
      });
      expect(assessment.classification).toBe("lethal_obstacle");
      expect(assessment.isNavigable).toBe(false);
    });
  });

  describe("ROS Transform Tree (tf: map -> odom -> base_link -> laser)", () => {
    it("chains SLAM correction and wheel odometry into authoritative map_to_base pose", async () => {
      const { RoverTransformTree } = await import("@/sonaris/rover");
      const tf = new RoverTransformTree({
        mapToOdom: { x: 0.1, z: -0.05, yawDeg: 5 },
        odomToBase: { x: 1.0, z: 0.0, yawDeg: 40 }
      });

      const mapPose = tf.getMapToBase();
      expect(mapPose.headingDeg).toBeCloseTo(45, 1);
      expect(mapPose.x).toBeGreaterThan(1.0);
    });

    it("projects laser returns through ST3215 actuator tilt pitch and mast offset into world coordinates", async () => {
      const { RoverTransformTree } = await import("@/sonaris/rover");
      const tf = new RoverTransformTree({
        mapToOdom: { x: 0, z: 0, yawDeg: 0 },
        odomToBase: { x: 0, z: 0, yawDeg: 0 },
        tiltPitchDeg: 0,
        mastHeightM: 0.28
      });

      // Forward laser return (azimuth 0, range 2.0m)
      const hit = tf.laserToMap(2.0, 0);
      expect(hit[0]).toBeCloseTo(2.10, 1); // 2.0m + optical offset (0.02) + mast offset (0.08)
      expect(hit[1]).toBeCloseTo(0.298, 2); // Mast height (0.28) + optical height (0.018)
    });
  });

  describe("Local Rolling Costmap (4m x 4m Window)", () => {
    it("centers rolling window around rover and ingests local obstacles", async () => {
      const { LocalRollingCostmap } = await import("@/sonaris/rover");
      const localMap = new LocalRollingCostmap(4.0, 0.05);
      localMap.recenter({ x: 2.0, z: 3.0, headingDeg: 0 });

      expect(localMap.getCenter().x).toBe(2.0);
      expect(localMap.getCenter().z).toBe(3.0);

      // Ingest obstacle nearby
      localMap.ingestLaserHit(2.5, 3.2, 0.28);
      expect(localMap.isLethal(2.5, 3.2)).toBe(true);

      // Distant point outside window returns free
      expect(localMap.getCost(10.0, 10.0)).toBe(0);
    });
  });

  describe("Theta* Global Planner & RPPC Local Controller", () => {
    it("plans any-angle line-of-sight path around obstacles on the costmap", async () => {
      const { LayeredCostmap, ThetaStarGlobalPlanner } = await import("@/sonaris/rover");
      const costmap = new LayeredCostmap(6, 6, 0.1);
      // Place obstacle between start [-1.5, 0] and goal [1.5, 0]
      costmap.markObstacle(0, 0);

      const planner = new ThetaStarGlobalPlanner(costmap);
      const plan = planner.plan([-1.5, 0], [1.5, 0]);

      expect(plan.success).toBe(true);
      expect(plan.waypoints.length).toBeGreaterThanOrEqual(2);
      expect(plan.totalDistanceM).toBeGreaterThan(3.0);
    });

    it("generates regulated cmd_vel twist commands and Mecanum RPMs", async () => {
      const { RegulatedPurePursuitController } = await import("@/sonaris/rover");
      const rppc = new RegulatedPurePursuitController();
      const path: [number, number][] = [[0, 0], [1.0, 0], [2.0, 0.5]];

      const step = rppc.computeControl({ x: 0, z: 0, headingDeg: 0 }, path);
      expect(step.cmdVel.vx).toBeGreaterThan(0);
      expect(step.wheelRPMs[0]).toBeGreaterThan(0);
      expect(step.lookaheadDistanceM).toBeGreaterThanOrEqual(0.20);
      expect(step.isGoalReached).toBe(false);
    });
  });
});
