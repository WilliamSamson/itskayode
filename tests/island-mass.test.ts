import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  buildIslandMass, pointInPolygon, KEEL_DEPTH, LIP_OUTLINE, MASS_GRID, PLATEAU_OUTLINE, PLATEAU_Y,
} from "@/world/studio/terrain/island-mass";

const material = new THREE.MeshBasicMaterial();
const mass = buildIslandMass([material, material, material]);
const position = mass.mesh.geometry.getAttribute("position") as THREE.BufferAttribute;
const { columns, rings, shoulderRings } = MASS_GRID;
const at = (c: number, r: number) => new THREE.Vector3().fromBufferAttribute(position, r * columns + c);

const segmentsCross = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3) => {
  const orient = (p: THREE.Vector3, q: THREE.Vector3, r: THREE.Vector3) => (q.x - p.x) * (r.z - p.z) - (q.z - p.z) * (r.x - p.x);
  return orient(a, b, c) * orient(a, b, d) < 0 && orient(c, d, a) * orient(c, d, b) < 0;
};
const distanceToOutline = (x: number, z: number, outline: readonly { x: number; z: number }[]) => {
  let best = Infinity;
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i];
    const b = outline[(i + 1) % outline.length];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const t = THREE.MathUtils.clamp(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz), 0, 1);
    best = Math.min(best, Math.hypot(x - a.x - t * dx, z - a.z - t * dz));
  }
  return best;
};

describe("Island mass", () => {
  it("hangs a keel deep enough to read as a mountain, not a slab", () => {
    const xs = LIP_OUTLINE.map((p) => p.x);
    const zs = LIP_OUTLINE.map((p) => p.z);
    const width = Math.min(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs));
    const box = mass.mesh.geometry.boundingBox!;
    const depth = PLATEAU_Y - box.min.y;
    expect(depth / width).toBeGreaterThan(0.4);
    expect(depth / width).toBeLessThan(0.6);
    expect(depth).toBeGreaterThan(KEEL_DEPTH);
  });

  it("keeps rock under the turf: nothing below the lip reaches past it, and the wall hugs it", () => {
    const recess: number[] = [];
    for (let c = 0; c < columns; c++) {
      const lip = LIP_OUTLINE[c % LIP_OUTLINE.length];
      for (let r = shoulderRings + 1; r < rings; r++) {
        const v = at(c, r);
        expect(pointInPolygon(v.x, v.z, LIP_OUTLINE)).toBe(true);
        // The first rings below the lip: how far the wall is tucked in.
        if (r <= shoulderRings + 3) recess.push(Math.hypot(v.x - lip.x, v.z - lip.z));
      }
    }
    // Two-sided: a clamp that pulled the whole wall far inward would also pass
    // the first assertion while leaving the turf floating over a void.
    // Measured 2026-09-25: p50 0.28 m, p95 1.18 m, max 2.8 m (the long
    // northern promontory, where the early taper is largest).
    recess.sort((a, b) => a - b);
    expect(recess[Math.floor(recess.length * 0.95)]).toBeLessThan(1.5);
    expect(recess[recess.length - 1]).toBeLessThan(3.5);
  });

  it("builds every ring as a simple polygon, so the keel never folds through itself", () => {
    const crossings: string[] = [];
    for (let r = 0; r < rings; r++) {
      const ring = Array.from({ length: columns - 1 }, (_, c) => at(c, r));
      const n = ring.length;
      for (let i = 0; i < n; i++) {
        for (let j = i + 2; j < n; j++) {
          if (i === 0 && j === n - 1) continue;
          if (segmentsCross(ring[i], ring[(i + 1) % n], ring[j], ring[(j + 1) % n])) crossings.push(`ring ${r}: ${i}x${j}`);
        }
      }
    }
    expect(crossings).toEqual([]);
  });

  it("leaves the plateau flat and rolls the shoulder smoothly down to the lip", () => {
    for (let x = -50; x <= 50; x += 5) {
      for (let z = -70; z <= 30; z += 5) {
        if (pointInPolygon(x, z, PLATEAU_OUTLINE)) expect(mass.surfaceY(x, z)).toBe(PLATEAU_Y);
      }
    }
    // Walk outward across the shoulder at every tenth column.
    for (let c = 0; c < columns - 1; c += 10) {
      const inner = at(c, 0);
      const lip = at(c, shoulderRings);
      let previous = PLATEAU_Y;
      for (let k = 1; k < 20; k++) {
        const f = k / 20;
        const y = mass.surfaceY(inner.x + (lip.x - inner.x) * f, inner.z + (lip.z - inner.z) * f);
        expect(y).not.toBeNull();
        expect(y!).toBeLessThanOrEqual(previous + 1e-4);
        expect(previous - y!).toBeLessThan(0.45); // no steps along a ~0.15 m stride
        previous = y!;
      }
      expect(lip.y).toBeLessThan(PLATEAU_Y - 0.7);
      expect(distanceToOutline(lip.x, lip.z, PLATEAU_OUTLINE)).toBeGreaterThan(1.2);
    }
    expect(mass.surfaceY(200, 0)).toBeNull();
  });

  it("faces the keel outward", () => {
    const normal = mass.mesh.geometry.getAttribute("normal") as THREE.BufferAttribute;
    let outward = 0;
    let total = 0;
    const mid = shoulderRings + Math.floor((rings - shoulderRings) / 2);
    for (let c = 0; c < columns; c++) {
      const v = at(c, mid);
      const lip = at(c, shoulderRings);
      const ray = new THREE.Vector2(lip.x - v.x, lip.z - v.z).normalize();
      const n = new THREE.Vector3().fromBufferAttribute(normal, mid * columns + c);
      total++;
      if (n.x * ray.x + n.z * ray.y > 0) outward++;
    }
    expect(outward / total).toBeGreaterThan(0.95);
    const up = new THREE.Vector3().fromBufferAttribute(normal, 0);
    expect(up.y).toBe(1);
  });

  it("is deterministic", () => {
    const again = buildIslandMass([material, material, material]);
    expect(Array.from(again.mesh.geometry.getAttribute("position").array)).toEqual(Array.from(position.array));
  });
});
