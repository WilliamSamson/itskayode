import { describe, it, expect } from "vitest";
import {
  batteryCircuit,
  converter,
  thermal,
  beamDeflection,
  assemblyMassProperties
} from "@/sonaris/lib/sonaris-analysis";
import { createProject } from "@/sonaris/lib/sonaris-engine";
describe("user-input analytical engineering estimates", () => {
  it("solves low-current battery operating root and detects collapse", () => {
    expect(batteryCircuit(12, 0, 24)).toEqual({ currentA: 2, loadedV: 12, lossW: 0 });
    const result = batteryCircuit(12, 0.1, 24)!;
    expect(result.currentA * result.loadedV).toBeCloseTo(24);
    expect(result.currentA).toBeLessThan(3);
    expect(result.lossW).toBeCloseTo(result.currentA ** 2 * 0.1);
    expect(batteryCircuit(12, 1, 37)).toBeNull();
    expect(batteryCircuit(0, 0, 24)).toBeNull();
    expect(batteryCircuit(12, -1, 24)).toBeNull();
    expect(batteryCircuit(12, 0.1, 0)).toEqual({ currentA: 0, loadedV: 12, lossW: 0 });
  });
  it("estimates converter losses and screens output-current limits", () => {
    expect(converter(12, 5, 2, 0.8, 3)).toEqual({
      inputA: 10 / 9.6,
      lossW: 2.5,
      overloaded: false
    });
    expect(converter(12, 5, 4, 0.8, 3)?.overloaded).toBe(true);
    expect(converter(12, 5, 2, 1.1, 3)).toBeNull();
    expect(converter(12, 5, -2, 0.8, 3)).toBeNull();
  });
  it("uses supplied lumped thermal resistance without claiming transient temperatures", () => {
    expect(thermal(25, 5, 4, 60)).toEqual({ estimatedTemp: 45, margin: 15 });
    expect(thermal(25, 10, 4, 60)?.margin).toBe(-5);
    expect(thermal(25, -1, 4, 60)).toBeNull();
    expect(thermal(NaN, 5, 4, 60)).toBeNull();
  });
  it("evaluates simple-supported central point loading only", () => {
    expect(beamDeflection(100, 1, 200e9, 1e-6)).toBeCloseTo(100 / (48 * 200e9 * 1e-6));
    expect(beamDeflection(100, 0, 200e9, 1e-6)).toBeNull();
    expect(beamDeflection(100, 1, 0, 1e-6)).toBeNull();
    expect(beamDeflection(-1, 1, 1, 1)).toBeNull();
  });
  it("requires explicit placement and complete mass rather than origin placeholders", () => {
    const components = createProject().components.slice(0, 2);
    expect(assemblyMassProperties(components)).toBeNull();
    const placed = components.map((c, i) => ({
      ...c,
      massKg: 1,
      quantity: i + 1,
      position: [i, 0, 0] as [number, number, number]
    }));
    expect(assemblyMassProperties(placed)).toBeNull();
    expect(
      assemblyMassProperties(
        placed,
        placed.map((c) => c.id)
      )
    ).toEqual({ massKg: 3, centerOfMass: [2 / 3, 0, 0] });
    expect(assemblyMassProperties([], [])).toBeNull();
  });
});
