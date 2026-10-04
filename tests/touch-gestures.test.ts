import { describe, expect, it } from "vitest";
import { twoFingerGesture } from "@/world/navigation/touch-gestures";

const pose = (ax: number, ay: number, bx: number, by: number) => ({
  first: { x: ax, y: ay },
  second: { x: bx, y: by },
});

describe("restored world touch gestures", () => {
  it("pinches toward the camera when fingers spread", () => {
    const delta = twoFingerGesture(pose(-20, 0, 20, 0), pose(-30, 0, 30, 0), "pan");
    expect(delta.zoom).toBeLessThan(0);
    expect(delta.panX).toBe(0);
    expect(delta.orbitY).toBe(0);
  });

  it("twists the camera around its target", () => {
    const delta = twoFingerGesture(pose(-20, 0, 20, 0), pose(0, -20, 0, 20), "pan");
    expect(delta.orbitX).not.toBe(0);
  });

  it("uses two-finger slide as the opposite of the one-finger tool", () => {
    const before = pose(0, 0, 40, 0);
    const after = pose(8, 5, 48, 5);
    const panMode = twoFingerGesture(before, after, "pan");
    expect(panMode.orbitX).toBeGreaterThan(0);
    expect(panMode.orbitY).toBeGreaterThan(0);
    expect(panMode.panX).toBe(0);
    const orbitMode = twoFingerGesture(before, after, "orbit");
    expect(orbitMode.panX).toBe(8);
    expect(orbitMode.panY).toBe(5);
    expect(orbitMode.orbitY).toBe(0);
  });
});
