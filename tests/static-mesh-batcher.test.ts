import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { batchStaticMeshes } from "@/world/studio/static-mesh-batcher";

const triangleCount = (root: THREE.Object3D) => {
  let total = 0;
  root.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      total += Math.floor((object.geometry.index?.count ?? object.geometry.getAttribute("position").count) / 3);
    }
  });
  return total;
};

it("batches stationary details without losing triangles, bounds or protected motion", () => {
  const root = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: 0x667788, metalness: 0.4 });
  const protectedGroup = new THREE.Group();
  protectedGroup.name = "moving-machine";
  root.add(protectedGroup);
  const dynamicPart = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
  protectedGroup.add(dynamicPart);
  for (let i = 0; i < 20; i++) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.5 + i * 0.01, 1, 1), material);
    mesh.position.set(i * 0.35, 0, 0);
    mesh.castShadow = true;
    root.add(mesh);
  }
  const beforeTriangles = triangleCount(root);
  const beforeBounds = new THREE.Box3().setFromObject(root);
  const result = batchStaticMeshes(root, new Set([protectedGroup]));
  expect(result.sourceMeshes).toBe(20);
  expect(result.batches).toBe(1);
  expect(result.sourceTriangles).toBe(result.batchedTriangles);
  expect(triangleCount(root)).toBe(beforeTriangles);
  expect(root.getObjectByName("moving-machine")).toBe(protectedGroup);
  expect(dynamicPart.parent).toBe(protectedGroup);
  const afterBounds = new THREE.Box3().setFromObject(root);
  expect(afterBounds.min.distanceTo(beforeBounds.min)).toBeLessThan(1e-5);
  expect(afterBounds.max.distanceTo(beforeBounds.max)).toBeLessThan(1e-5);
  protectedGroup.position.y = 2;
  expect(dynamicPart.getWorldPosition(new THREE.Vector3()).y).toBeCloseTo(2);
});

it("merges materials that differ only in baked surface values, and keeps other looks apart", () => {
  const root = new THREE.Group();
  const make = (params: THREE.MeshStandardMaterialParameters) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial(params));
    root.add(mesh);
    return mesh;
  };
  make({ color: 0x445566, roughness: 0.7 });
  make({ color: 0x445566, roughness: 0.7 });
  make({ color: 0xff0000, roughness: 0.2, metalness: 0.5, emissive: 0x00ff00, emissiveIntensity: 2 });
  const flat = make({ color: 0x445566, flatShading: true });
  const hooked = make({ color: 0x445566, roughness: 0.7 });
  hooked.material.onBeforeCompile = () => {};

  const result = batchStaticMeshes(root, new Set());
  expect(result.batches).toBe(1);
  expect(result.sourceMeshes).toBe(3);
  expect(flat.parent).toBe(root);
  expect(hooked.parent).toBe(root);

  // Per-mesh values survive as attributes: the red mesh's vertices carry its own surface.
  const batch = root.children.find((c) => c.userData.staticBatch) as THREE.Mesh;
  const color = batch.geometry.getAttribute("color");
  const surface = batch.geometry.getAttribute("surface");
  const emissive = batch.geometry.getAttribute("emissiveTint");
  const last = color.count - 1;
  expect(color.getX(last)).toBeCloseTo(1);
  expect(color.getY(last)).toBeCloseTo(0);
  expect(surface.getX(last)).toBeCloseTo(0.2);
  expect(surface.getY(last)).toBeCloseTo(0.5);
  expect(emissive.getY(last)).toBeCloseTo(2);
  expect(surface.getX(0)).toBeCloseTo(0.7);
  expect((batch.material as THREE.MeshStandardMaterial).vertexColors).toBe(true);
});
