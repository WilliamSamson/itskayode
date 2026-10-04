import { expect, it } from "vitest";
import { OrraScene } from "@/world/engine/scene";

/** Replays the scene's shadow bookkeeping over a camera path sampled at 60 Hz. */
const simulate = (speedMetresPerSecond: number, moveSeconds: number, totalSeconds: number) => {
  let lastShadowMs = -Infinity;
  let lastMoveMs = 0;
  let shadowAt = 0; // target position the map was last centred on
  let target = 0;
  const renders: number[] = [];
  for (let now = 0; now <= totalSeconds * 1000; now += 1000 / 60) {
    const next = now <= moveSeconds * 1000 ? (speedMetresPerSecond * now) / 1000 : target;
    if (Math.abs(next - target) > 0.01) lastMoveMs = now;
    target = next;
    const due = OrraScene.shadowRefreshDue({
      nowMs: now, lastShadowMs, lastMoveMs, drift: Math.abs(target - shadowAt),
      coverage: 85, sunMoved: false, throttleMs: 40,
    });
    if (due) {
      renders.push(now);
      lastShadowMs = now;
      shadowAt = target;
    }
  }
  return renders;
};

it("keeps the stale shadow map during a pan and redraws once the view settles", () => {
  // A 2 s pan at 6 m/s stays inside the map's coverage: the old throttle drew ~50 passes.
  const renders = simulate(6, 2, 3);
  const duringPan = renders.filter((t) => t > 0 && t <= 2000);
  expect(duringPan).toHaveLength(0);
  const afterPan = renders.filter((t) => t > 2000);
  expect(afterPan).toHaveLength(1);
  expect(afterPan[0]).toBeLessThan(2000 + 250);
});

it("still redraws mid-pan before the view leaves the shadow map's coverage", () => {
  // 40 m/s for 3 s is 120 m, well past 0.4 x 85 m of coverage.
  const renders = simulate(40, 3, 3.5);
  const duringPan = renders.filter((t) => t > 0 && t <= 3000);
  expect(duringPan.length).toBeGreaterThanOrEqual(3);
  expect(duringPan.length).toBeLessThan(10);
});

it("never refreshes a still view, and respects the throttle for sun motion", () => {
  expect(OrraScene.shadowRefreshDue({ nowMs: 1000, lastShadowMs: 0, lastMoveMs: 0, drift: 0, coverage: 85, sunMoved: false, throttleMs: 40 })).toBe(false);
  expect(OrraScene.shadowRefreshDue({ nowMs: 1000, lastShadowMs: 980, lastMoveMs: 0, drift: 0, coverage: 85, sunMoved: true, throttleMs: 40 })).toBe(false);
  expect(OrraScene.shadowRefreshDue({ nowMs: 1000, lastShadowMs: 900, lastMoveMs: 0, drift: 0, coverage: 85, sunMoved: true, throttleMs: 40 })).toBe(true);
});
