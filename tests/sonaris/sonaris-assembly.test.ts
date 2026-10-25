import { describe, it, expect } from "vitest";
import {
  assemblyParts,
  CANONICAL_HARNESS,
  createAssemblyState,
  getPartProposalFacts,
  snapPosition,
  connectionIssue,
  validateAssemblyState
} from "@/sonaris/lib/sonaris-assembly";
describe("concept assembly workbench", () => {
  it("provides distinct wheels and manufacturer source without approving concept envelope", () => {
    expect(assemblyParts.filter((p) => p.kind === "wheel")).toHaveLength(4);
    expect(assemblyParts.filter((p) => p.kind === "motor")).toHaveLength(4);
    expect(new Set(assemblyParts.map((p) => p.id)).size).toBe(assemblyParts.length);
    const motor = assemblyParts.find((p) => p.kind === "motor")!;
    expect(motor.source).toContain("pololu.com/product/4694");
    expect(motor.note).toContain("16 mm");
    expect(assemblyParts.find((p) => p.id === "base")!.evidence).toBe("concept");
  });
  it("creates independent empty-wiring state and snaps near home versus far grid", () => {
    const p = assemblyParts[0],
      a = createAssemblyState();
    expect(a.connections).toEqual([]);
    a.positions[p.id][0] += 1;
    expect(createAssemblyState().positions[p.id]).toEqual(p.home);
    expect(snapPosition(p.id, [p.home[0] + 10, p.home[1], p.home[2]])).toEqual(p.home);
    expect(snapPosition(p.id, [p.home[0] + 101, p.home[1] + 2, p.home[2] + 3])).toEqual([
      Math.round((p.home[0] + 101) / 5) * 5,
      Math.round((p.home[1] + 2) / 5) * 5,
      Math.round((p.home[2] + 3) / 5) * 5
    ]);
  });
  it("screens logical ports without implying physical pinout verification", () => {
    const parts = [
      {
        ...assemblyParts[0],
        id: "a",
        ports: [
          {
            id: "out",
            label: "out",
            kind: "power" as const,
            role: "out" as const,
            voltage: 5,
            position: [0, 0, 0] as [number, number, number]
          }
        ]
      },
      {
        ...assemblyParts[0],
        id: "b",
        ports: [
          {
            id: "in",
            label: "in",
            kind: "power" as const,
            role: "in" as const,
            voltage: 5,
            position: [0, 0, 0] as [number, number, number]
          }
        ]
      }
    ];
    const link = { id: "link", fromPart: "a", fromPort: "out", toPart: "b", toPort: "in" };
    expect(connectionIssue(link, parts)).toBeNull();
    expect(connectionIssue({ ...link, toPart: "a", toPort: "out" }, parts)).not.toBeNull();
    parts[1].ports[0].voltage = 12;
    expect(connectionIssue(link, parts)).toContain("voltage");
    parts[1].ports[0].voltage = 5;
    parts[1].ports[0].role = "out" as "in";
    expect(connectionIssue(link, parts)).toContain("role");
  });
  it("rejects malformed imports, out of bounds positions and duplicate wiring", () => {
    const s = createAssemblyState();
    expect(validateAssemblyState(s)).toBe(true);
    expect(validateAssemblyState(null)).toBe(false);
    s.positions[assemblyParts[0].id] = [Infinity, 0, 0];
    expect(validateAssemblyState(s)).toBe(false);
    const a = createAssemblyState();
    a.positions.unknown = [0, 0, 0];
    expect(validateAssemblyState(a)).toBe(false);
    expect(
      validateAssemblyState({
        ...createAssemblyState(),
        connections: [{ id: "bad", fromPart: "x", toPart: "x", fromPort: "a", toPort: "b" }]
      })
    ).toBe(false);
  });
});

it("rejects repeated endpoint links in either direction and missing positions", () => {
  const s = createAssemblyState();
  const link = {
    id: "one",
    fromPart: "battery",
    fromPort: "supply",
    toPart: "converter-a",
    toPort: "power-in"
  };
  s.connections = [link];
  expect(validateAssemblyState(s)).toBe(true);
  s.connections.push({ ...link, id: "two" });
  expect(validateAssemblyState(s)).toBe(false);
  s.connections = [
    link,
    {
      id: "reverse",
      fromPart: link.toPart,
      fromPort: link.toPort,
      toPart: link.fromPart,
      toPort: link.fromPort
    }
  ];
  expect(validateAssemblyState(s)).toBe(false);
  const missing = createAssemblyState();
  delete missing.positions.base;
  expect(validateAssemblyState(missing)).toBe(false);
  expect(() => snapPosition("unknown", [0, 0, 0])).toThrow();
  expect(() => snapPosition("base", [3001, 0, 0])).toThrow();
});
it("rejects different port kinds and allows explicitly unresolved voltages only as logical links", () => {
  const link = {
    id: "test",
    fromPart: "pico",
    fromPort: "pwm-a",
    toPart: "motor-front-left",
    toPort: "drive-in"
  };
  expect(connectionIssue(link)).toContain("kind");
  expect(connectionIssue({ ...link, fromPart: "driver-1", fromPort: "motor-a" })).toBeNull();
  expect(connectionIssue({ ...link, fromPart: "driver-1", fromPort: "absent" })).toContain(
    "Unknown port"
  );
});

it("validates every canonical harness link and provides fact-checked proposal facts for all 28 parts", () => {
  expect(
    validateAssemblyState({
      positions: createAssemblyState().positions,
      connections: CANONICAL_HARNESS
    })
  ).toBe(true);
  const partIds = new Set(assemblyParts.map((p) => p.id));
  for (const part of assemblyParts) {
    const facts = getPartProposalFacts(part);
    expect(facts.role.length).toBeGreaterThan(10);
    expect(facts.electrical.length).toBeGreaterThan(5);
    expect(facts.envelopeBasis.length).toBeGreaterThan(5);
    expect(facts.engineeringGate.length).toBeGreaterThan(5);
    for (const m of facts.mechanicalLinks) {
      expect(partIds.has(m.partId)).toBe(true);
    }
  }
});
