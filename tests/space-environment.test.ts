import { expect, it } from "vitest";
import { SpaceEnvironment } from "@/world/space/space-environment";

it("round-robin asteroid updates land every rock exactly where a full update would", () => {
  const every = new SpaceEnvironment();
  every.updateStride = 1;
  const strided = new SpaceEnvironment();
  strided.updateStride = 4;

  for (let frame = 0; frame < 37; frame++) {
    every.update(0.5);
    strided.update(0.5);
  }
  // Let each rock take its turn at the final time.
  for (let k = 0; k < 4; k++) strided.update(0);

  for (const key of ["heroMesh", "asteroidMesh", "mediumMesh", "dustMesh"] as const) {
    const a = every[key].instanceMatrix.array;
    const b = strided[key].instanceMatrix.array;
    for (let i = 0; i < a.length; i++) expect(b[i]).toBeCloseTo(a[i], 3);
  }
  // Rocks actually moved, so the comparison is not trivially equal.
  const fresh = new SpaceEnvironment();
  expect(fresh.dustMesh.instanceMatrix.array[12]).not.toBeCloseTo(every.dustMesh.instanceMatrix.array[12], 1);
});
