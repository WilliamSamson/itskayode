import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { buildIslandMass, KEEL_CENTRE, LIP_OUTLINE, PLATEAU_Y } from "@/world/studio/terrain/island-mass";
import { buildIslandVines } from "@/world/studio/terrain/island-vines";

const material = new THREE.MeshBasicMaterial();
const mass = buildIslandMass([material, material, material]);
const vines = buildIslandVines(mass);

describe("Island vines", () => {
  it("hangs a clustered curtain of vine bundles, not a uniform fringe or a token few", () => {
    // Strands in a bundle share a root; count bundles, not strands.
    const bundles = new Set(vines.paths.map((p) => p.points[0].toArray().join()));
    expect(bundles.size).toBeGreaterThan(30);
    expect(bundles.size).toBeLessThan(110);
    expect(vines.paths.length).toBeGreaterThan(bundles.size * 1.8);
    const lengths = vines.paths.map((p) => p.points[1].y - p.points[p.points.length - 1].y);
    expect(Math.max(...lengths)).toBeGreaterThan(15);
    expect(Math.min(...lengths)).toBeLessThan(9);
  });

  it("roots every vine in the turf at the lip", () => {
    for (const { points } of vines.paths) {
      const [root] = points;
      const nearest = Math.min(...LIP_OUTLINE.map((p) => Math.hypot(p.x - root.x, p.z - root.z)));
      expect(nearest).toBeLessThan(2.5);
      expect(root.y).toBeLessThan(PLATEAU_Y + 0.4);
      expect(root.y).toBeGreaterThan(PLATEAU_Y - 1.6);
    }
  });

  it("never passes through rock", () => {
    // A point inside the solid sees the surface from behind when it looks outward.
    const solid = new THREE.Mesh(mass.mesh.geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
    const raycaster = new THREE.Raycaster();
    const pole = new THREE.Vector3(KEEL_CENTRE.x, 0, KEEL_CENTRE.z);
    let inside = 0;
    let checked = 0;
    for (const { points } of vines.paths) {
      for (const point of points.slice(2)) {
        const out = new THREE.Vector3(point.x - pole.x, 0, point.z - pole.z).normalize();
        raycaster.set(point, out);
        const hit = raycaster.intersectObject(solid, false)[0];
        checked++;
        if (hit && hit.face && hit.face.normal.dot(out) > 0) inside++;
      }
    }
    expect(checked).toBeGreaterThan(500);
    expect(inside).toBe(0);
  });

  it("is deterministic", () => {
    const again = buildIslandVines(mass);
    expect(again.paths.map((p) => p.points.map((v) => v.toArray()))).toEqual(vines.paths.map((p) => p.points.map((v) => v.toArray())));
  });
});
