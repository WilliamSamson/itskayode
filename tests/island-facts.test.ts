import { expect, it } from "vitest";
import * as THREE from "three";
import { OrraScene } from "@/world/engine/scene";

it("measures grass and landmass reach from the built scene instead of quoting constants", () => {
  const root = new THREE.Group();
  const grass = new THREE.Group();
  grass.name = "volumetric-grass";
  const blade = new THREE.BoxGeometry(0.1, 0.5, 0.1);
  const material = new THREE.MeshBasicMaterial();
  grass.add(new THREE.InstancedMesh(blade, material, 30), new THREE.InstancedMesh(blade, material, 12));
  const land = new THREE.Mesh(new THREE.BoxGeometry(100, 4, 60), material);
  land.name = "terrace-main-island";
  land.position.set(-8, 0, 5);
  root.add(grass, land);

  expect(OrraScene.measureIsland(root)).toEqual({ grassClumps: 42, islandReach: 58 });
  expect(OrraScene.measureIsland(new THREE.Group())).toEqual({ grassClumps: 0, islandReach: 0 });
});
