import { describe, expect, it } from "vitest";
import {
  DAYS_PER_YEAR,
  REAL_SECONDS_PER_DAY,
  WorldClock,
  evaluateWorldTime,
  liveWorldSeconds,
} from "@/world/life/world-clock";

// Dates are built from local components, the way the live clock reads them.
const at = (month: number, day: number, h = 0, m = 0, s = 0) => evaluateWorldTime(liveWorldSeconds(new Date(2026, month - 1, day, h, m, s)));

describe("Live calendar", () => {
  it("counts days from the ORRA epoch and turns a season every eight days", () => {
    expect(at(1, 1)).toMatchObject({ day: 0, dayNumber: 1, year: 0, season: "spring" });
    expect(at(1, 9)).toMatchObject({ day: 8, dayNumber: 9, season: "summer" });
    expect(at(1, 17).season).toBe("autumn");
    expect(at(1, 25).season).toBe("winter");
    // Day 32 starts world year two, back in spring.
    expect(at(2, 2)).toMatchObject({ day: DAYS_PER_YEAR, dayNumber: 1, year: 1, season: "spring" });
  });

  it("starts a new world day at local midnight, and only then", () => {
    const before = at(9, 25, 23, 59, 59);
    const after = at(9, 26, 0, 0, 1);
    expect(after.day).toBe(before.day + 1);
    expect(before.dayFraction).toBeGreaterThan(0.999);
    expect(after.dayFraction).toBeLessThan(0.001);
    expect(at(9, 25, 12).day).toBe(before.day);
  });

  it("counts calendar days, so daylight-saving changes never gain or lose one", () => {
    // Spans the March and October/November clock changes in most time zones.
    expect(at(4, 1).day - at(3, 1).day).toBe(31);
    expect(at(11, 15).day - at(10, 15).day).toBe(31);
  });

  it("reads a device clock set before the epoch as day zero rather than a negative day", () => {
    expect(liveWorldSeconds(new Date(2025, 5, 1))).toBe(0);
  });
});

describe("Custom time", () => {
  it("returns to 1x from wherever the world got to, instead of snapping back to local time", () => {
    const clock = new WorldClock(10 * REAL_SECONDS_PER_DAY);
    clock.cycleTimeScale(); // 5x
    clock.advance(3600);
    const afterFastForward = clock.worldSeconds;
    expect(afterFastForward).toBe(10 * REAL_SECONDS_PER_DAY + 5 * 3600);

    clock.cycleTimeScale(); // 30x
    clock.cycleTimeScale(); // 120x
    clock.cycleTimeScale(); // 1x
    expect(clock.timeScale).toBe(1);
    expect(clock.isLiveSync).toBe(false);
    expect(clock.worldSeconds).toBe(afterFastForward);
    clock.advance(60);
    expect(clock.worldSeconds).toBe(afterFastForward + 60);
  });

  it("takes true elapsed time, so a long gap (a hidden tab) is not clipped", () => {
    const clock = new WorldClock(0);
    clock.setTimeScale(5);
    clock.advance(600);
    expect(clock.worldSeconds).toBe(3000);
  });
});

describe("Resuming a visit", () => {
  const t0 = Date.UTC(2026, 8, 25, 12);
  const twoHours = 2 * 3600 * 1000;

  it("keeps the day and speed, and lets time away pass at 1x", () => {
    const clock = new WorldClock(12.5 * REAL_SECONDS_PER_DAY);
    clock.setTimeScale(120);
    const saved = clock.snapshot(t0);

    const resumed = new WorldClock(0);
    resumed.restore(saved, t0 + twoHours);
    expect(resumed.worldSeconds).toBe(12.5 * REAL_SECONDS_PER_DAY + 7200);
    expect(resumed.getTime().day).toBe(12);
    expect(resumed.timeScale).toBe(120);
    expect(resumed.isLiveSync).toBe(false);
  });

  it("holds a paused world exactly where it was", () => {
    const clock = new WorldClock(3 * REAL_SECONDS_PER_DAY);
    clock.togglePause();
    const resumed = new WorldClock(0);
    resumed.restore(clock.snapshot(t0), t0 + twoHours);
    expect(resumed.worldSeconds).toBe(3 * REAL_SECONDS_PER_DAY);
    expect(resumed.paused).toBe(true);
  });

  it("returns a live world to live time at 1x", () => {
    const resumed = new WorldClock(0);
    resumed.restore({ worldSeconds: 5, savedAt: t0, timeScale: 30, paused: false, isLiveSync: true }, t0 + twoHours);
    expect(resumed.isLiveSync).toBe(true);
    expect(resumed.timeScale).toBe(1);
  });
});
