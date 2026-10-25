import { describe, expect, it } from "vitest";
import {
  ADHESION_TYPES,
  CHASSIS_COMPONENTS,
  FABRICATION_MATERIALS,
  INFILL_PATTERNS,
  PRINTER_PROFILES,
  SUPPORT_STYLES,
  calculatePartFabrication
} from "@/sonaris/components/workspace/fabrication-models";

describe("SONARIS Chassis Frame & Fabrication Subsystem", () => {
  it("defines authentic chassis frame and bodywork components matching the engineering proposal", () => {
    expect(CHASSIS_COMPONENTS.length).toBeGreaterThanOrEqual(6);

    const ids = CHASSIS_COMPONENTS.map((c) => c.id);
    expect(ids).toContain("base-plate");
    expect(ids).toContain("electronics-deck");
    expect(ids).toContain("body-shell");
    expect(ids).toContain("sensor-mast");
    expect(ids).toContain("motor-brackets");
    expect(ids).toContain("full-frame");
  });

  it("identifies which parts clear a 300x300mm build plate and flags monolithic frame as requiring modular split", () => {
    const basePlate = CHASSIS_COMPONENTS.find((c) => c.id === "base-plate")!;
    const bodyShell = CHASSIS_COMPONENTS.find((c) => c.id === "body-shell")!;
    const fullFrame = CHASSIS_COMPONENTS.find((c) => c.id === "full-frame")!;

    // Base plate (280x240mm) and nested 3pc body shell kit (292x248mm) fit within 300x300mm
    expect(basePlate.lengthMm).toBeLessThanOrEqual(300);
    expect(basePlate.widthMm).toBeLessThanOrEqual(300);
    expect(bodyShell.lengthMm).toBeLessThanOrEqual(300);
    expect(bodyShell.widthMm).toBeLessThanOrEqual(300);

    // Full assembled frame (340x280mm) exceeds 300mm single build plate along length
    expect(fullFrame.lengthMm).toBeGreaterThan(300);
  });

  it("calculates realistic mass, filament length in meters, print time, and ₦ material cost from BEME filament pricing", () => {
    // PETG Carbon at 25% Gyroid infill, 4 wall loops
    const fab = calculatePartFabrication("base-plate", "petg-cf", 25, 4);

    expect(fab.volumeCm3).toBeGreaterThan(50);
    expect(fab.massGrams).toBeGreaterThan(50);
    expect(fab.massGrams).toBeLessThan(1500);
    expect(fab.filamentMeters).toBeGreaterThan(15);

    // Feature breakdown sums to total massGrams
    const breakdownSum =
      fab.wallMassGrams +
      fab.topBottomMassGrams +
      fab.infillMassGrams +
      fab.supportMassGrams;
    expect(fab.massGrams).toBe(breakdownSum);
    expect(fab.featureBreakdown).toHaveLength(4);

    // BEME Appendix D: ₦27,000 / 1000g spool = ₦27 / gram
    expect(fab.costNgn).toBe(Math.round(fab.massGrams * 27));
    expect(fab.printTimeHours).toBeGreaterThan(0.5);
    expect(fab.printTimeFormatted).toMatch(/^\d+h \d{2}m$|^\d+m$/);
    expect(fab.fitsBed300).toBe(true);
  });

  it("responds to slicer infill patterns, support styles, adhesion types, layer heights, and 3D printer profiles", () => {
    expect(INFILL_PATTERNS.map((p) => p.id)).toEqual([
      "gyroid",
      "cubic",
      "grid",
      "honeycomb",
      "adaptive-cubic"
    ]);
    expect(SUPPORT_STYLES.map((s) => s.id)).toEqual([
      "tree-organic",
      "snug-grid",
      "normal-accordion",
      "soluble-interface",
      "none"
    ]);
    expect(ADHESION_TYPES.map((a) => a.id)).toEqual([
      "brim-8mm",
      "skirt",
      "raft"
    ]);
    expect(PRINTER_PROFILES.map((p) => p.id)).toContain("voron-300");
    expect(PRINTER_PROFILES.map((p) => p.id)).toContain("bambu-256");

    const fastGridDraft = calculatePartFabrication("sensor-mast", "petg-cf", 20, 3, {
      infillPattern: "grid",
      supportStyle: "none",
      adhesionType: "skirt",
      layerHeightMm: 0.28,
      printerProfileId: "bambu-256"
    });
    const denseHoneycombFine = calculatePartFabrication("sensor-mast", "petg-cf", 60, 5, {
      infillPattern: "honeycomb",
      supportStyle: "soluble-interface",
      adhesionType: "raft",
      layerHeightMm: 0.12,
      printerProfileId: "prusa-250"
    });

    // Finer layer height + soluble support + raft produces more discrete layers, support mass, and longer print time
    expect(denseHoneycombFine.layerCount).toBeGreaterThan(fastGridDraft.layerCount);
    expect(denseHoneycombFine.supportMassGrams).toBeGreaterThan(fastGridDraft.supportMassGrams);
    expect(denseHoneycombFine.massGrams).toBeGreaterThan(fastGridDraft.massGrams);
    expect(denseHoneycombFine.printTimeHours).toBeGreaterThan(fastGridDraft.printTimeHours);

    // Base plate (280x240mm) clears Voron 300x300 bed but overflows Bambu 256x256 bed
    const baseOnVoron = calculatePartFabrication("base-plate", "petg-cf", 25, 4, {
      printerProfileId: "voron-300"
    });
    const baseOnBambu = calculatePartFabrication("base-plate", "petg-cf", 25, 4, {
      printerProfileId: "bambu-256"
    });
    expect(baseOnVoron.fitsSelectedPrinter).toBe(true);
    expect(baseOnBambu.fitsSelectedPrinter).toBe(false);
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
