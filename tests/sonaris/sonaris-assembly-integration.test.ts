import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { assemblyParts } from "@/sonaris/lib/sonaris-assembly";
import { createAssemblyModel } from "@/sonaris/components/workspace/assembly-models";

const page = readFileSync("src/sonaris/components/workspace/integrated-workspace.tsx", "utf8");
const navCss = readFileSync("src/sonaris/components/workspace/integrated-workspace.module.css", "utf8");
const workbench = readFileSync("src/sonaris/components/workspace/assembly-workbench.tsx", "utf8");
const workbenchCss = readFileSync("src/sonaris/components/workspace/assembly-workbench.module.css", "utf8");

describe("rover-first architecture & segmented assembly workbench", () => {
  it("keeps the user instrument shell, names the first tab Assembly, and replaces architecture charts with the workbench", () => {
    expect(page).toContain("bg-[#E5E1D8]");
    expect(page).toContain("rounded-[44px]");
    expect(page).toContain('label: "Assembly"');
    expect(page).toContain("<AssemblyWorkbench");
    expect(page).not.toContain("Motor load verification");
    expect(page).not.toContain("Bioenno 12.8V · Tilting S2 LiDAR");
  });

  it("uses segmented pill geometry (rounded-left/flat-right first, flat middle, flat-left/rounded-right last) and semantic color tokens", () => {
    expect(navCss).toContain("border-radius: 9999px 2px 2px 9999px;");
    expect(navCss).toContain("border-radius: 2px 9999px 9999px 2px;");
    expect(workbenchCss).toContain("border-radius: 9999px 2px 2px 9999px;");
    expect(workbenchCss).toContain("border-radius: 2px 9999px 9999px 2px;");
    expect(workbench).not.toContain("Auto-Wire Loom");
    expect(workbench).not.toContain("Point Connect");
  });

  it("batches Mecanum wheel rollers into merged draw calls and guards rAF from OrbitControls change amplification", () => {
    const wheelPart = assemblyParts.find((p) => p.kind === "wheel")!;
    const wheelGroup = createAssemblyModel(wheelPart);
    expect(wheelGroup.children.length).toBeLessThanOrEqual(6);
    const stageCode = readFileSync("src/sonaris/components/workspace/assembly-stage.tsx", "utf8");
    expect(stageCode).toContain("if (!frame && !inAnimate && !disposed)");
  });
});
