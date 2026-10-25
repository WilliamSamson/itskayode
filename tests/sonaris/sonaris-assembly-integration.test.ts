import { readFileSync } from "node:fs";
import * as THREE from "three";
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

  const worldVertices = (partId: string) => {
    const part = assemblyParts.find((p) => p.id === partId)!;
    const model = createAssemblyModel(part);
    model.position.set(...part.home);
    model.updateMatrixWorld(true);
    const out: THREE.Vector3[] = [];
    model.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;
      const pos = node.geometry.getAttribute("position");
      for (let i = 0; i < pos.count; i++) {
        out.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(node.matrixWorld));
      }
    });
    return out;
  };

  it("keeps the body shell out of the LiDAR tilt volume while covering the compute bay", () => {
    const verts = worldVertices("shell");
    expect(verts.length).toBeGreaterThan(100);
    const tiltFrame = assemblyParts.find((p) => p.id === "tilt-frame")!;
    const cooler = assemblyParts.find((p) => p.id === "cooler")!;
    const tiltBottomY = tiltFrame.home[1] - tiltFrame.size[1] / 2;
    const coolerTopY = cooler.home[1] + cooler.size[1] / 2;

    // Tilt frame + scanner keep-out (world mm): x 25..135, |z| < 55, y above tiltBottomY
    const inLidarVolume = verts.filter(
      (v) => v.x > 25 && v.x < 135 && Math.abs(v.z) < 55 && v.y > tiltBottomY
    );
    expect(inLidarVolume).toHaveLength(0);
    // ...and it actually roofs the Pi 5 + cooler rather than floating elsewhere
    const overCompute = verts.filter(
      (v) => v.x > -100 && v.x < -30 && Math.abs(v.z) < 40 && v.y > coolerTopY
    );
    expect(overCompute.length).toBeGreaterThan(0);
  });

  it("mechanically couples the lower base plate, motor brackets, 37D gearmotors, and Mecanum wheel hubs", () => {
    const baseVerts = worldVertices("base");
    const bracketVerts = worldVertices("bracket-front-left");
    const motorVerts = worldVertices("motor-front-left");
    const wheelVerts = worldVertices("wheel-front-left");

    // Base plate drops a protective belly pan below axle height (63.5 mm) while maintaining >= 44 mm ground clearance
    const baseMinY = Math.min(...baseVerts.map((v) => v.y));
    expect(baseMinY).toBeLessThan(60);
    expect(baseMinY).toBeGreaterThanOrEqual(44);

    // Bracket bolts up to base plate (y >= 84 mm) and supports the axle outboard to z >= 138 mm
    expect(Math.max(...bracketVerts.map((v) => v.y))).toBeGreaterThanOrEqual(84);
    expect(Math.max(...bracketVerts.map((v) => v.z))).toBeGreaterThanOrEqual(138);

    // Motor output shaft coupling reaches into the Mecanum wheel hub (z >= 160 mm) and wheel inboard collar meets the bracket (z <= 140 mm)
    expect(Math.max(...motorVerts.map((v) => v.z))).toBeGreaterThanOrEqual(160);
    expect(Math.min(...wheelVerts.map((v) => v.z))).toBeLessThanOrEqual(140);
  });

  it("keeps the bumper ahead of the front mecanum wheels across its full span", () => {
    const verts = worldVertices("bumper");
    const frontWheelEdge = 130 + 63.5;
    const inWheelTrack = verts.filter((v) => Math.abs(v.z) > 143);
    expect(inWheelTrack.length).toBeGreaterThan(0);
    for (const v of inWheelTrack) expect(v.x).toBeGreaterThan(frontWheelEdge);
  });

  it("sculpts the shell with a tapered V-prow nose and flared mid-body sponsons rather than a flat box", () => {
    const verts = worldVertices("shell");
    const centerProwMaxX = Math.max(
      ...verts.filter((v) => Math.abs(v.z) < 25).map((v) => v.x)
    );
    const outerShoulderMaxX = Math.max(
      ...verts.filter((v) => Math.abs(v.z) > 85).map((v) => v.x)
    );
    expect(centerProwMaxX).toBeGreaterThan(outerShoulderMaxX + 30);

    const midBodyMaxZ = Math.max(
      ...verts.filter((v) => Math.abs(v.x) < 55).map((v) => Math.abs(v.z))
    );
    const wheelArchMaxZ = Math.max(
      ...verts.filter((v) => v.x > 120 && v.x < 160).map((v) => Math.abs(v.z))
    );
    expect(midBodyMaxZ).toBeGreaterThan(wheelArchMaxZ + 20);
  });
});
