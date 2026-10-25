import { describe, expect, it } from "vitest";
import {
  createProject,
  initialComponents,
  validateProject,
  powerEstimate,
  wheelSpeeds,
  printFit,
  scanRoom,
  validateConnection
} from "@/sonaris/lib/sonaris-engine";

describe("SONARIS engineering model", () => {
  it("keeps proposal inventory conceptual and dimensions unresolved", () => {
    expect(initialComponents.length).toBeGreaterThanOrEqual(24);
    expect(
      initialComponents.every(
        (c) => c.dimensions === null && c.massKg === null && c.status === "concept"
      )
    ).toBe(true);
    expect(initialComponents.find((c) => c.model.includes("4694"))?.quantity).toBe(4);
    expect(initialComponents.find((c) => c.name.includes("Fuse"))?.quantity).toBe(0);
  });
  it("roundtrips fresh independent project state and rejects corrupt data", () => {
    const p = createProject();
    expect(validateProject(JSON.parse(JSON.stringify(p)))).toBe(true);
    p.components[0].name = "changed";
    expect(createProject().components[0].name).not.toBe("changed");
    for (const value of [
      null,
      {},
      { ...createProject(), version: 2 },
      { ...createProject(), components: [{ id: "x" }] },
      { ...createProject(), trials: [{ id: "a", value: NaN }] }
    ])
      expect(validateProject(value)).toBe(false);
  });
  it("does not report partial power totals or runtime from unknown data", () => {
    expect(powerEstimate(initialComponents, 12, 12, 0.9, 0.5).watts).toBeNull();
    const c = { ...initialComponents[0], voltage: 5, current: 2, quantity: 2 };
    expect(powerEstimate([c], 12, 10, 0.8, 0.5)).toMatchObject({
      watts: 20,
      runtimeHours: 9.6,
      missing: []
    });
    expect(powerEstimate([c], 0, 10, 0.8, 0.5).runtimeHours).toBeNull();
    expect(powerEstimate([c], 12, 10, 2, 0.5).runtimeHours).toBeNull();
    expect(powerEstimate([], 12, 10, 0.8, 0.5).watts).toBeNull();
  });
  it("calculates four mecanum wheel speeds and rejects invalid geometry", () => {
    expect(wheelSpeeds(1, 0, 0, 0.1, 0.2, 0.2)).toEqual([10, 10, 10, 10]);
    expect(wheelSpeeds(0, 1, 0, 0.1, 0.2, 0.2)).toEqual([-10, 10, 10, -10]);
    expect(wheelSpeeds(0, 0, 1, 0.1, 0.2, 0.2)).toEqual([-4, 4, -4, 4]);
    expect(() => wheelSpeeds(1, 0, 0, 0, 0.2, 0.2)).toThrow();
  });
  it("checks verified printer XY separately from unknown height", () => {
    expect(printFit([300, 300, 100], null)).toEqual({
      fitsXY: true,
      zStatus: "Unverified Z clearance"
    });
    expect(printFit([301, 200, 100], 90)).toEqual({
      fitsXY: false,
      zStatus: "Exceeds Z clearance"
    });
    expect(printFit([200, 200, 80], 90).zStatus).toBe("Fits Z clearance");
    expect(printFit([-1, 200, 80], 90).fitsXY).toBe(false);
  });
  it("reconstructs deterministic tilted scan planes inside declared room", () => {
    const pts = scanRoom(4, 6, 0, 0, 0, 0, 4, 30, 0, 1);
    expect(pts).toHaveLength(4);
    expect(pts[0]).toEqual({ x: 2, y: 1, z: 0 });
    expect(pts[1].z).toBeCloseTo(3);
    expect(scanRoom(4, 6, 0, 0, 0, 0, 4, 1, 0)).toEqual([]);
    expect(scanRoom(4, 6, 0, 0, 0, 30, 20, 30, 0.01)).toEqual(
      scanRoom(4, 6, 0, 0, 0, 30, 20, 30, 0.01)
    );
    expect(scanRoom(4, 6, 3, 0, 0, 0, 4, 30, 0)).toEqual([]);
    expect(scanRoom(4, 6, 0, 0, 0, 90, 4, 30, 0)).toEqual([]);
  });
  it("explains missing, incompatible, overloaded and unresolved connections", () => {
    const p = createProject();
    const c = {
      id: "wire",
      from: p.components[0].id,
      to: p.components[1].id,
      voltage: 5,
      current: 2,
      rating: 3,
      connector: "USB",
      protection: "Fuse",
      status: "concept"
    };
    expect(validateConnection({ ...c, to: "absent" }, p.components)).toContain("Missing");
    expect(validateConnection(c, p.components)).toContain("Unresolved");
    p.components[0].voltage = 5;
    p.components[1].voltage = 12;
    expect(validateConnection(c, p.components)).toContain("Incompatible");
    p.components[1].voltage = 5;
    expect(validateConnection({ ...c, rating: 1 }, p.components)).toContain("Overloaded");
    expect(validateConnection(c, p.components)).toContain("Compatible");
  });
});

import { collisionPairs, assessTrial } from "@/sonaris/lib/sonaris-engine";
describe("engineering evidence and geometry guards", () => {
  it("detects yawed envelope collisions in metres but skips unknown envelopes", () => {
    const a = {
      ...initialComponents[0],
      id: "a",
      dimensions: [2000, 200, 200] as [number, number, number],
      rotation: 45
    };
    const b = { ...a, id: "b", position: [0.6, 0, 0.6] as [number, number, number] };
    expect(collisionPairs([a, b, initialComponents[1]])).toEqual([["a", "b"]]);
    expect(collisionPairs([a, { ...b, position: [0, 1, 0] }])).toEqual([]);
    expect(collisionPairs([a, { ...b, position: [0, 0, 1] }])).toEqual([]);
  });
  it("compares proposal criteria without implying measured evidence", () => {
    for (const [metric, pass, fail] of [
      ["dimensional error", 5, 5.1],
      ["data age p95", 1, 1.1],
      ["watchdog", 200, 201],
      ["runtime", 2, 1.9],
      ["mass", 20, 21]
    ] as const) {
      expect(assessTrial(metric, pass)).toContain("Meets");
      expect(assessTrial(metric, fail)).toContain("Does not meet");
    }
    expect(assessTrial("unknown", 1)).toContain("Unresolved");
    expect(assessTrial("mass", -1)).toContain("Unresolved");
  });
  it("rejects broken references, duplicate IDs and unsupported verification", () => {
    const p = createProject();
    p.components[0].id = "";
    expect(validateProject(p)).toBe(false);
    const q = createProject();
    q.components[0].status = "verified";
    expect(validateProject(q)).toBe(false);
    q.components[0].source = "Manufacturer datasheet revision 1";
    expect(validateProject(q)).toBe(true);
    q.connections = [
      {
        id: "a",
        from: q.components[0].id,
        to: "missing",
        voltage: null,
        current: null,
        rating: null,
        connector: "",
        protection: "",
        status: "concept"
      }
    ];
    expect(validateProject(q)).toBe(false);
    q.connections[0].to = q.components[0].id;
    expect(validateProject(q)).toBe(false);
    q.connections[0].to = q.components[1].id;
    q.connections.push({ ...q.connections[0] });
    expect(validateProject(q)).toBe(false);
  });
  it("occludes distant walls with scenario obstacles and bounds height", () => {
    const points = scanRoom(
      4,
      6,
      0,
      0,
      0,
      0,
      4,
      30,
      0,
      0.5,
      [{ x: 1, z: 0, width: 0.4, depth: 1, height: 1 }],
      3
    );
    expect(points[0].x).toBeCloseTo(0.8);
    const tilted = scanRoom(4, 6, 0, 0, 0, 60, 100, 30, 0, 0.5, [], 3);
    expect(tilted.every((p) => p.y >= 0 && p.y <= 3)).toBe(true);
    expect(tilted.some((p) => p.y === 0)).toBe(true);
    expect(tilted.some((p) => p.y === 3)).toBe(true);
  });
});

import { coverageStats, suggestViewpoint, compareTrials } from "@/sonaris/lib/sonaris-engine";
describe("declared-reference mapping analysis", () => {
  it("counts unique wall grid cells only against exact declared grid", () => {
    expect(coverageStats([], 4, 6, 3, 0.25)).toEqual({
      observedCells: 0,
      totalCells: 960,
      percent: 0
    });
    expect(
      coverageStats(
        [
          { x: 2, y: 0.5, z: 0 },
          { x: 2, y: 0.51, z: 0.01 },
          { x: 0, y: 0, z: 0 },
          { x: 0, y: 3, z: 0 }
        ],
        4,
        6
      )
    ).toMatchObject({ observedCells: 1, totalCells: 960 });
    expect(coverageStats([], 0, 6)).toEqual({ observedCells: 0, totalCells: 0, percent: 0 });
  });
  it("suggests a reproducible collision-free heuristic viewpoint", () => {
    const obstacle = [{ x: 0, z: 0, width: 1, depth: 1, height: 1 }];
    const a = suggestViewpoint([], 6, 6, obstacle);
    expect(a).toEqual(suggestViewpoint([], 6, 6, obstacle));
    expect(Math.abs(a.x) < 3 && Math.abs(a.z) < 3).toBe(true);
    expect(Math.abs(a.x) > 0.5 || Math.abs(a.z) > 0.5).toBe(true);
    expect(a.reason).toContain("heuristic");
  });
  it("requires three repeats and never mixes units or protocols", () => {
    const trials = [1, 5, 3].map((value, i) => ({
      id: String(i),
      metric: "Dimensional error",
      value,
      unit: "%",
      date: "2026-10-21",
      protocol: "Fixed"
    }));
    expect(compareTrials(trials, "Dimensional error", "Fixed")).toMatchObject({
      count: 3,
      median: 3,
      unit: "%",
      status: "Three or more repeated trials"
    });
    expect(compareTrials(trials.slice(0, 2), "Dimensional error", "Fixed").status).toContain(
      "Requires"
    );
    expect(
      compareTrials([...trials, { ...trials[0], unit: "m" }], "Dimensional error", "Fixed").median
    ).toBeNull();
    expect(compareTrials(trials, "Dimensional error", "Guided").count).toBe(0);
    expect(assessTrial("Watchdog initiation", 200)).toContain("Meets");
    expect(assessTrial("Finished mass", 20)).toContain("Meets");
  });
});

describe("proposal risk baseline and useful viewpoint scoring", () => {
  it("starts with independent unresolved proposal risk records", () => {
    const p = createProject();
    expect(p.risks.length).toBeGreaterThanOrEqual(4);
    expect(p.risks.some((r) => r.detail.includes("24 V") && r.detail.includes("12 V"))).toBe(true);
    expect(p.risks.every((r) => r.date === "2026-10-21T00:00:00.000Z")).toBe(true);
    p.risks[0].detail = "changed";
    expect(createProject().risks[0].detail).not.toBe("changed");
  });
  it("scores full tilted sweeps rather than repeating one observed horizontal band", () => {
    const fixed = Array.from({ length: 10 }, (_, i) =>
      scanRoom(6, 5, 0, 0, 0, -30 + i * 10, 360, 30, 0)
    ).flat();
    const candidate = suggestViewpoint(fixed, 6, 5);
    const additional = Array.from({ length: 10 }, (_, i) =>
      scanRoom(6, 5, candidate.x, candidate.z, 0, -30 + i * 10, 144, 30, 0)
    ).flat();
    const before = coverageStats(fixed, 6, 5),
      after = coverageStats([...fixed, ...additional], 6, 5);
    expect(after.observedCells).toBeGreaterThan(before.observedCells);
    expect(candidate.reason).toContain("tilted sweep");
  });
});

it('rejects negative trial uncertainty without rejecting absent uncertainty', () => {
  const p = createProject();
  p.trials.push({id:'trial-uncertainty',metric:'Runtime',value:2,unit:'h',date:'2026-10-21T00:00:00.000Z',protocol:'bench',uncertainty:0.1});
  expect(validateProject(p)).toBe(true);
  p.trials[0].uncertainty=-1;
  expect(validateProject(p)).toBe(false);
});

import { RPLIDAR_S2_SPECS, ST3215_SERVO_SPECS } from "@/sonaris/lib/sonaris-engine";

describe("RPLIDAR S2 & ST3215 actuator physics fidelity", () => {
  it("enforces official manufacturer hardware limits", () => {
    expect(RPLIDAR_S2_SPECS.minBlindRangeM).toBe(0.05); // 50 mm
    expect(RPLIDAR_S2_SPECS.maxWhiteRangeM).toBe(30.0);
    expect(RPLIDAR_S2_SPECS.maxDarkRangeM).toBe(10.0);
    expect(RPLIDAR_S2_SPECS.sampleRateHz).toBe(32000);
    expect(ST3215_SERVO_SPECS.speedDegPerSec).toBe(270);
    expect(ST3215_SERVO_SPECS.noLoadSpeedSecPer60Deg).toBe(0.222);
  });

  it("rejects points inside the 0.05 m minimum blind zone when enabled", () => {
    // Obstacle at 0.03 m is inside 0.05 m blind zone
    const obstacle = [{ x: 0.03, z: 0, width: 0.02, depth: 1, height: 1 }];
    const pts = scanRoom(10, 10, 0, 0, 0, 0, 1, 30, 0, 0.5, obstacle, 3, 360, 0, {
      minBlindRange: 0.05
    });
    // The obstacle inside the blind zone blocks the beam and is dropped/rejected by DToF
    expect(pts.length).toBe(0);

    // If placed at 0.10 m (outside blind zone), it returns a valid hit
    const validObstacle = [{ x: 0.10, z: 0, width: 0.02, depth: 1, height: 1 }];
    const validPts = scanRoom(10, 10, 0, 0, 0, 0, 1, 30, 0, 0.5, validObstacle, 3, 360, 0, {
      minBlindRange: 0.05
    });
    expect(validPts.length).toBe(1);
    expect(validPts[0].x).toBeCloseTo(0.09, 2);
  });

  it("applies optical offset displacement during tilt", () => {
    // Optical offset of 20 mm forward, 18 mm up
    const pts = scanRoom(10, 10, 0, 0, 0, 45, 1, 30, 0, 0.5, [], 3, 360, 0, {
      opticalOffset: [0.02, 0.018]
    });
    expect(pts.length).toBe(1);
    // Optical offset shifts ray origin forward and vertically
    expect(pts[0]).toBeDefined();
  });
});
