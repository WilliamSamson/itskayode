import { expect, it } from "vitest";
import * as THREE from "three";
import { LightPool } from "@/world/engine/light-pool";

const liveLights = (scene: THREE.Scene) => {
  const lights: THREE.Light[] = [];
  scene.traverseVisible((o) => {
    if (o instanceof THREE.PointLight || o instanceof THREE.SpotLight) lights.push(o);
  });
  return lights;
};

const run = (pool: LightPool, focus: THREE.Vector3, seconds: number) => {
  for (let t = 0; t < seconds; t += 0.05) pool.update(focus, 0.05);
};

it("keeps a fixed light count, follows the focus and honours animated source intensity", () => {
  const scene = new THREE.Scene();
  const sources = Array.from({ length: 20 }, (_, i) => {
    const light = new THREE.PointLight(0xffffff, 2, 8, 1.5);
    light.position.set(i * 20, 1, 0);
    scene.add(light);
    return light;
  });
  const pool = new LightPool(scene, sources, 3, 0);
  scene.updateMatrixWorld(true);

  const livePositions = () => liveLights(scene).filter((l) => l.intensity > 0).map((l) => l.position.x).sort((a, b) => a - b);

  run(pool, new THREE.Vector3(0, 0, 0), 2);
  expect(liveLights(scene)).toHaveLength(3);
  expect(livePositions()).toEqual([0, 20, 40]);

  // Animated sources are read every frame, not snapshotted.
  sources[1].intensity = 0.5;
  run(pool, new THREE.Vector3(0, 0, 0), 0.1);
  expect(liveLights(scene).find((l) => l.position.x === 20)!.intensity).toBeCloseTo(0.5);

  // Moving the focus hands the slots to the new neighbourhood without adding lights.
  run(pool, new THREE.Vector3(380, 0, 0), 3);
  expect(liveLights(scene)).toHaveLength(3);
  expect(livePositions()).toEqual([340, 360, 380]);

  // A switched-off fixture releases its slot.
  sources[19].intensity = 0;
  run(pool, new THREE.Vector3(380, 0, 0), 2);
  expect(livePositions()).toEqual([320, 340, 360]);
});
