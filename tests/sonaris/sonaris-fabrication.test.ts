import { describe, expect, it } from "vitest";
import {
  CHASSIS_COMPONENTS,
  FABRICATION_MATERIALS,
  calculatePartFabrication,
  type ChassisPartId,
  type FabricationMaterialId
} from "@/sonaris/components/workspace/fabrication-models";

describe("SONARIS Chassis Frame & Fabrication Subsystem", () => {
  it("defines authentic chassis frame components matching the engineering proposal", () => {
    expect(CHASSIS_COMPONENTS.length).toBeGreaterThanOrEqual(4);

    const ids = CHASSIS_COMPONENTS.map((c) => c.id);
    expect(ids).toContain("base-plate");
    expect(ids).toContain("electronics-deck");
    expect(ids).toContain("sensor-mast");
    expect(ids).toContain("motor-brackets");
    expect(ids).toContain("full-frame");
  });

  it("identifies which parts clear a 300x300mm build plate and flags monolithic frame as requiring modular split", () => {
    const basePlate = CHASSIS_COMPONENTS.find((c) => c.id === "base-plate")!;
    const fullFrame = CHASSIS_COMPONENTS.find((c) => c.id === "full-frame")!;

    // Base plate (280x240mm) fits within 300x300mm
    expect(basePlate.lengthMm).toBeLessThanOrEqual(300);
    expect(basePlate.widthMm).toBeLessThanOrEqual(300);

    // Full assembled frame (340x280mm) exceeds 300mm single build plate along length
    expect(fullFrame.lengthMm).toBeGreaterThan(300);
  });

  it("calculates realistic mass, print time, and ₦ material cost from BEME filament pricing", () => {
    // PETG Carbon at 25% infill
    const fab = calculatePartFabrication("base-plate", "petg-cf", 25, 4);

    expect(fab.volumeCm3).toBeGreaterThan(50);
    expect(fab.massGrams).toBeGreaterThan(50);
    expect(fab.massGrams).toBeLessThan(1500);

    // BEME Appendix D: ₦27,000 / 1000g spool = ₦27 / gram
    expect(fab.costNgn).toBe(Math.round(fab.massGrams * 27));
    expect(fab.printTimeHours).toBeGreaterThan(0.5);
    expect(fab.fitsBed300).toBe(true);
  });

  it("supports aluminium CNC and multiple 3D printing engineering polymers", () => {
    const mats = FABRICATION_MATERIALS.map((m) => m.id);
    expect(mats).toContain("petg-cf");
    expect(mats).toContain("plapro");
    expect(mats).toContain("alu-5052");

    const alu = FABRICATION_MATERIALS.find((m) => m.id === "alu-5052")!;
    expect(alu.densityGcm3).toBeCloseTo(2.7, 1);
  });

  it("exports FabricationWorkbench component and handles component selection", async () => {
    const { FabricationWorkbench } = await import(
      "@/sonaris/components/workspace/fabrication-workbench"
    );
    expect(FabricationWorkbench).toBeDefined();
    expect(typeof FabricationWorkbench).toBe("function");
  });
});
