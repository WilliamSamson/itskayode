import { describe, expect, it } from "vitest";
import { createProject } from "@/sonaris/lib/sonaris-engine";
import { parseSnapshot, validateSnapshot } from "@/sonaris/lib/sonaris-workspace-state";

const snapshot = () => ({
  project: createProject(),
  settings: {
    batteryV: 12, capacity: 10, efficiency: 0.85, duty: 0.5,
    roomW: 6, roomD: 5, tilt: 0, height: 0.5, noise: 0.01, range: 30, bedZ: null,
    obstacles: [{ id: "desk", x: -1, z: 2, width: 1, depth: 0.5, height: 0.8 }],
    waypoints: [{ x: -2, z: 1 }],
    scenarioRecords: [{ name: "Cruise", watts: 15, runtime: null, date: "2026-10-21T12:00:00.000Z" }]
  }
});

describe("SONARIS workspace snapshots", () => {
  it("round-trips the actual workspace snapshot shape", () => {
    const value = snapshot();
    expect(validateSnapshot(value)).toBe(true);
    expect(parseSnapshot(JSON.stringify(value))).toEqual(value);
  });
  it("accepts legacy snapshots without settings and null numeric inputs", () => {
    expect(parseSnapshot(JSON.stringify({ project: createProject() }))).toEqual({ project: createProject(), settings: {} });
    expect(validateSnapshot({ project: createProject(), settings: { batteryV: null, roomW: null, duty: null, tilt: null } })).toBe(true);
  });
  it("rejects corrupt JSON and project data", () => {
    for (const raw of ["{", "null", "[]", '{}', JSON.stringify({ project: { version: 2 } })]) expect(parseSnapshot(raw)).toBeNull();
    expect(validateSnapshot({ project: createProject(), settings: [] })).toBe(false);
    expect(validateSnapshot({ project: createProject(), settings: null })).toBe(false);
  });
  it.each([
    ["batteryV", 0], ["capacity", -1], ["height", 0], ["bedZ", -5],
    ["roomW", 0], ["roomD", 101], ["tilt", -31], ["tilt", 61],
    ["range", 31], ["range", 0], ["efficiency", 1.1], ["duty", -0.1],
    ["noise", -1], ["noise", 1.1], ["batteryV", Infinity], ["height", NaN], ["range", "30"]
  ])("rejects invalid %s value %s", (key, value) => {
    expect(validateSnapshot({ project: createProject(), settings: { [key]: value } })).toBe(false);
  });
  it("accepts both ends of bounded ranges", () => {
    for (const values of [{ tilt: -30, range: 0.1, efficiency: 0, duty: 0, noise: 0 }, { tilt: 60, range: 30, efficiency: 1, duty: 1, noise: 1 }]) {
      expect(validateSnapshot({ project: createProject(), settings: values })).toBe(true);
    }
  });
  it("accepts array limits without silently dropping entries", () => {
    const value = snapshot();
    value.settings.obstacles = Array.from({ length: 100 }, (_, i) => ({ ...value.settings.obstacles[0], id: String(i) }));
    value.settings.waypoints = Array.from({ length: 1000 }, () => ({ x: 0, z: 0 }));
    value.settings.scenarioRecords = Array.from({ length: 1000 }, () => ({ ...value.settings.scenarioRecords[0] }));
    expect(validateSnapshot(value)).toBe(true);
    expect(parseSnapshot(JSON.stringify(value))).toEqual(value);
  });
  it("rejects unsupported settings rather than restoring unchecked state", () => {
    expect(validateSnapshot({ project: createProject(), settings: { range: 30, unknown: Infinity } })).toBe(false);
  });
  it("round-trips motion, fabrication, analysis and confirmation inputs", () => {
    const settings = { vx: -1, vy: 1, yaw: 2, radius: 0.1, halfLength: 0.2, halfWidth: 0.3, slip: 1, decel: 0.5, density: 1200, costKg: 0, volume: 0, flow: 8, analysis: { ambient: -20, maxTemp: 80, force: null, rInternal: 0, theta: 1, converterV: 12, converterA: 5, converterLimit: 10, span: 1, elasticity: 1, inertia: 1 }, confirmedPlacementIds: ["battery"] };
    const value = { project: createProject(), settings };
    expect(validateSnapshot(value)).toBe(true);
    expect(parseSnapshot(JSON.stringify(value))).toEqual(value);
  });
  it("rejects invalid extended inputs", () => {
    for (const settings of [{ vx: -1.1 }, { vy: 1.1 }, { yaw: 2.1 }, { radius: 0 }, { halfLength: -1 }, { halfWidth: Infinity }, { slip: -0.1 }, { decel: 0 }, { density: 0 }, { costKg: -1 }, { volume: -1 }, { flow: 0 }, { analysis: { force: -1 } }, { analysis: { ambient: Infinity } }, { analysis: { mystery: 5 } }, { analysis: [] }, { analysis: null }, { confirmedPlacementIds: [1] }, { confirmedPlacementIds: Array(1001).fill("battery") }]) {
      expect(validateSnapshot({ project: createProject(), settings })).toBe(false);
    }
  });
  it("rejects invalid geometry, paths, records and oversized arrays", () => {
    const invalidSettings = [
      { obstacles: [{ id: "bad", x: 0, z: 0, width: 0, depth: 1, height: 1 }] },
      { obstacles: [{ id: "bad", x: Infinity, z: 0, width: 1, depth: 1, height: 1 }] },
      { obstacles: Array(101).fill(snapshot().settings.obstacles[0]) },
      { waypoints: [{ x: 1, z: NaN }] }, { waypoints: Array(1001).fill({ x: 0, z: 0 }) },
      { scenarioRecords: [{ name: "Bad", watts: -1, runtime: 1, date: "2026-10-21T12:00:00.000Z" }] },
      { scenarioRecords: [{ name: "Bad", watts: 1, runtime: Infinity, date: "2026-10-21T12:00:00.000Z" }] },
      { scenarioRecords: [{ name: "Bad", watts: 1, runtime: 1, date: "yesterday" }] },
      { scenarioRecords: Array(1001).fill(snapshot().settings.scenarioRecords[0]) }
    ];
    for (const settings of invalidSettings) expect(validateSnapshot({ project: createProject(), settings })).toBe(false);
  });
});
