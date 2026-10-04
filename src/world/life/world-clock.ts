/**
 * ORRA — A Living World
 * =====================
 * Copyright (c) 2026 Kayode. All rights reserved.
 *
 * ORRA World Clock
 * ================
 *
 * World time is one number, `worldSeconds`, counted from ORRA_EPOCH. Day,
 * season, year and the sun are pure functions of it (`evaluateWorldTime`), so
 * setting it puts the whole world in that moment: scrubbing, fast-forward and
 * deterministic tests all come from that.
 *
 * Two ways to run:
 * - Live (default): follows the visitor's local calendar and clock. A new
 *   world day starts at local midnight; seasons turn every eight real days.
 * - Custom (paused, sped up, scrubbed or skipped): accumulates real elapsed
 *   time times the speed, from wherever the visitor took it. Only `syncToLive`
 *   returns it to local time.
 */

/** Real seconds per world day at 1x: 86,400s (24 hours) for 1:1 live real-world tracking. */
export const REAL_SECONDS_PER_DAY = 86400;

/**
 * Days in a world year. 32 keeps a full seasonal cycle observable across
 * the 4 distinct seasons (8 world days per season).
 */
export const DAYS_PER_YEAR = 32;

export const SEASON_COUNT = 4;

export type SeasonName = "spring" | "summer" | "autumn" | "winter";

export const SEASON_NAMES: readonly SeasonName[] = [
  "spring",
  "summer",
  "autumn",
  "winter",
];

/**
 * Time-scale presets. 1x is true 1:1 live real time; 5x, 30x, and 120x are smooth
 * timelapse multipliers for observing solar shadows and seasonal atmospheric shifts.
 */
export const TIME_SCALES = [1, 5, 30, 120] as const;
export type TimeScale = (typeof TIME_SCALES)[number];

export type DiurnalPhase = "dawn" | "noon" | "dusk" | "night";

export interface WorldTime {
  /** Total elapsed world seconds since world epoch. */
  worldSeconds: number;
  /** Whole cumulative days elapsed since epoch. */
  day: number;
  /** 1-indexed day of the current world year (1 to 32). */
  dayNumber: number;
  /** Position within the current day, 0 (midnight) to 1. */
  dayFraction: number;
  /** Whole cumulative years elapsed. */
  year: number;
  /** 1-indexed world year number. */
  yearNumber: number;
  /** Position within the current year, 0 to 1. */
  yearFraction: number;
  /** Current season. */
  season: SeasonName;
  /** Position within the current season, 0 to 1. */
  seasonFraction: number;
  /**
   * Continuous season phase in [0, 4), where 0 is the start of spring.
   * Use this for interpolation; use `season` only for display.
   */
  seasonPhase: number;
  /**
   * Sun elevation, -1 (deep night) to 1 (noon). Derived from dayFraction so
   * lighting and growth agree about what time it is.
   */
  sunElevation: number;
  /**
   * Sun horizontal azimuth angle around the island in radians [0, 2*PI).
   */
  sunAzimuth: number;
  /** Discrete diurnal phase name. */
  diurnalPhase: DiurnalPhase;
  /** True between dawn and dusk (sunElevation > 0). */
  isDaylight: boolean;
  /** Active simulation timescale multiplier. */
  timeScale: number;
  /** Whether the world clock is currently paused. */
  paused: boolean;
  /** True when the world clock is locked 1:1 to the visitor's live local device time. */
  isLiveSync: boolean;
}

/**
 * Day zero of the ORRA calendar, as a local calendar date. Live time counts
 * whole local days since this date, so a live world's calendar advances with
 * the visitor's own: a new world day at local midnight, a new season every
 * eight days, and everyone on the same date sees the same day and season.
 */
export const ORRA_EPOCH = { year: 2026, month: 1, day: 1 } as const;

const MS_PER_DAY = 86_400_000;
const EPOCH_UTC_DAY = Date.UTC(ORRA_EPOCH.year, ORRA_EPOCH.month - 1, ORRA_EPOCH.day) / MS_PER_DAY;

/**
 * World seconds for a moment of real local time: whole local calendar days
 * since ORRA_EPOCH, plus the local time of day. Days are counted from calendar
 * dates, not by dividing elapsed milliseconds, so daylight-saving shifts never
 * gain or lose a day. A device clock set before the epoch reads as day zero.
 */
export function liveWorldSeconds(now: Date): number {
  const localDay = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / MS_PER_DAY - EPOCH_UTC_DAY;
  const secondsToday = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds() + now.getMilliseconds() / 1000;
  return Math.max(0, localDay * REAL_SECONDS_PER_DAY + secondsToday);
}

/** Where a new clock starts: live local time in a browser, late morning on day zero headless. */
export function initialWorldSeconds(): number {
  return typeof window === "undefined" ? REAL_SECONDS_PER_DAY * 0.48 : liveWorldSeconds(new Date());
}

/** What a clock needs to resume where it was left, written to storage by the viewport. */
export interface ClockSnapshot {
  worldSeconds: number;
  /** Real epoch milliseconds when the snapshot was taken. */
  savedAt: number;
  timeScale: number;
  paused: boolean;
  isLiveSync: boolean;
}

export class WorldClock {
  /** Elapsed world seconds. Assignable: setting it teleports the world in time. */
  public worldSeconds: number;

  /** Multiplier on real time. See TIME_SCALES. */
  public timeScale: number = 1;

  /** When true, `advance` is a no-op and the world holds its current state. */
  public paused = false;

  /** True when the clock directly mirrors the visitor's live local browser time. */
  public isLiveSync = true;

  /** Initial starting epoch for this client session. */
  public readonly defaultStartSeconds: number;

  constructor(startSeconds?: number) {
    this.defaultStartSeconds = startSeconds !== undefined ? startSeconds : initialWorldSeconds();
    this.worldSeconds = this.defaultStartSeconds;
    if (startSeconds !== undefined) {
      this.isLiveSync = false;
    }
  }

  /** Locks clock back to 1:1 live local time in the visitor's browser. */
  public syncToLive(): void {
    this.worldSeconds = initialWorldSeconds();
    this.timeScale = 1;
    this.paused = false;
    this.isLiveSync = true;
  }

  /** Resets world time back to live local time in browser, or canonical default. */
  public resetTime(): void {
    this.worldSeconds = typeof window !== "undefined" ? initialWorldSeconds() : this.defaultStartSeconds;
    this.timeScale = 1;
    this.paused = false;
    this.isLiveSync = typeof window !== "undefined";
  }

  /** Toggles pause state on/off. */
  public togglePause(): boolean {
    this.paused = !this.paused;
    if (this.paused) this.isLiveSync = false;
    return this.paused;
  }

  /** Sets time scale directly. */
  public setTimeScale(scale: number): void {
    this.timeScale = Math.max(0, scale);
    if (this.timeScale !== 1) this.isLiveSync = false;
  }

  /**
   * @param realDeltaSeconds Real seconds since the last call. Pass the true
   * elapsed time, not a frame delta capped for physics: a capped delta stops
   * the world while its tab is hidden.
   */
  public advance(realDeltaSeconds: number): void {
    if (this.paused) return;
    if (this.isLiveSync && typeof window !== "undefined") {
      this.worldSeconds = liveWorldSeconds(new Date());
      return;
    }
    this.worldSeconds += Math.max(0, realDeltaSeconds) * this.timeScale;
  }

  /**
   * Steps to the next preset scale, wrapping. Returning to 1x carries on from
   * wherever the world has got to; only `syncToLive` returns to local time.
   */
  public cycleTimeScale(): number {
    const idx = TIME_SCALES.indexOf(this.timeScale as TimeScale);
    this.timeScale = TIME_SCALES[(idx + 1) % TIME_SCALES.length];
    if (this.timeScale !== 1) this.isLiveSync = false;
    return this.timeScale;
  }

  public snapshot(nowMs: number): ClockSnapshot {
    return {
      worldSeconds: this.worldSeconds,
      savedAt: nowMs,
      timeScale: this.timeScale,
      paused: this.paused,
      isLiveSync: this.isLiveSync,
    };
  }

  /**
   * Resumes from a snapshot. A live clock simply follows local time again.
   * A custom clock keeps its day and speed, and the time the visitor was away
   * passes at 1x: fast-forward is for watching, and a world left at 120x for a
   * week should not come back four years older.
   */
  public restore(snapshot: ClockSnapshot, nowMs: number): void {
    this.timeScale = snapshot.isLiveSync ? 1 : snapshot.timeScale;
    this.paused = snapshot.paused;
    this.isLiveSync = snapshot.isLiveSync;
    if (snapshot.isLiveSync) {
      this.worldSeconds = initialWorldSeconds();
      return;
    }
    const away = snapshot.paused ? 0 : Math.max(0, (nowMs - snapshot.savedAt) / 1000);
    this.worldSeconds = snapshot.worldSeconds + away;
  }

  /** Jumps forward by whole world days. Used by the HUD scrub control. */
  public skipDays(days: number): void {
    this.isLiveSync = false;
    this.worldSeconds += days * REAL_SECONDS_PER_DAY;
  }

  /** Scrubs time to a specific fractional hour of the current day [0, 1). */
  public scrubToDayFraction(targetFraction: number): void {
    this.isLiveSync = false;
    const currentDays = Math.floor(this.worldSeconds / REAL_SECONDS_PER_DAY);
    const clamped = Math.max(0, Math.min(0.9999, targetFraction));
    this.worldSeconds = (currentDays + clamped) * REAL_SECONDS_PER_DAY;
  }

  /** Scrubs time to a specific seasonal phase [0, 4). */
  public scrubToSeasonPhase(targetPhase: number): void {
    this.isLiveSync = false;
    const currentTotalDays = this.worldSeconds / REAL_SECONDS_PER_DAY;
    const currentYear = Math.floor(currentTotalDays / DAYS_PER_YEAR);
    const clampedPhase = Math.max(0, Math.min(3.9999, targetPhase));
    const targetDayOfYear = (clampedPhase / SEASON_COUNT) * DAYS_PER_YEAR;
    this.worldSeconds =
      (currentYear * DAYS_PER_YEAR + targetDayOfYear) *
      REAL_SECONDS_PER_DAY;
  }

  public getTime(): WorldTime {
    return evaluateWorldTime(
      this.worldSeconds,
      this.timeScale,
      this.paused,
      this.isLiveSync
    );
  }
}

/**
 * Pure evaluation of world time. Separated from the clock so tests, the HUD and
 * the ecosystem can all ask "what would the world look like at T?" without
 * needing a running clock.
 */
export function evaluateWorldTime(
  worldSeconds: number,
  timeScale = 1,
  paused = false,
  isLiveSync = false
): WorldTime {
  const totalDays = worldSeconds / REAL_SECONDS_PER_DAY;
  const day = Math.floor(totalDays);
  const dayFraction = totalDays - day;
  const dayNumber = (day % DAYS_PER_YEAR) + 1;

  const totalYears = totalDays / DAYS_PER_YEAR;
  const year = Math.floor(totalYears);
  const yearNumber = year + 1;
  const yearFraction = totalYears - year;

  const seasonPhase = yearFraction * SEASON_COUNT;
  const seasonIndex = Math.min(SEASON_COUNT - 1, Math.floor(seasonPhase));
  const seasonFraction = seasonPhase - seasonIndex;

  // Sun rides a cosine through the day: -1 at midnight, +1 at noon. A single
  // smooth curve keeps lighting, growth and the HUD from disagreeing about
  // when "day" is.
  const sunElevation = -Math.cos(dayFraction * Math.PI * 2);
  const sunAzimuth = (dayFraction * Math.PI * 2) % (Math.PI * 2);

  // Diurnal phase categorization:
  // Dawn: 0.20 - 0.32 (~4:48 AM - 7:40 AM)
  // Noon/Day: 0.32 - 0.68 (~7:40 AM - 4:20 PM)
  // Dusk: 0.68 - 0.80 (~4:20 PM - 7:12 PM)
  // Night: 0.80 - 0.20 (~7:12 PM - 4:48 AM)
  let diurnalPhase: DiurnalPhase;
  if (dayFraction >= 0.2 && dayFraction < 0.32) {
    diurnalPhase = "dawn";
  } else if (dayFraction >= 0.32 && dayFraction < 0.68) {
    diurnalPhase = "noon";
  } else if (dayFraction >= 0.68 && dayFraction < 0.8) {
    diurnalPhase = "dusk";
  } else {
    diurnalPhase = "night";
  }

  return {
    worldSeconds,
    day,
    dayNumber,
    dayFraction,
    year,
    yearNumber,
    yearFraction,
    season: SEASON_NAMES[seasonIndex],
    seasonFraction,
    seasonPhase,
    sunElevation,
    sunAzimuth,
    diurnalPhase,
    isDaylight: sunElevation > -0.1,
    timeScale,
    paused,
    isLiveSync,
  };
}
