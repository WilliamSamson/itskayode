import { SEASON_COUNT } from "./world-clock";
import { hash01 } from "../math/hash";
import type { WeatherPresetName } from "../weather/weather-world-state";

/**
 * ORRA Climate-Driven Weather
 * ===========================
 *
 * Decides what the sky should be doing, from the season.
 *
 * Weather was previously only ever set by hand, so the world had a calendar and
 * a sky that knew nothing about each other: summer never rained, autumn never
 * fogged, and a season could pass without the weather acknowledging it. A world
 * with time in it has to have weather that follows that time.
 *
 * The model is a per-season probability mix rather than a fixed schedule. Each
 * season has a characteristic weather distribution; the actual sequence is drawn
 * deterministically from world time, so it is reproducible but never a loop the
 * visitor can predict.
 */

/**
 * Weather weights per season, indexed across all 5 active presets:
 * [clear, rain, fog, snow, sandstorm].
 *
 * These are climate, not decoration -- they are what makes each season feel
 * authentic:
 *  - spring: changeable, frequent showers, morning mist
 *  - summer: mostly clear, convective thunderstorms, arid solar gusts
 *  - autumn: deep valley fog inversions, steady rain fronts, first frost
 *  - winter: sub-zero alpine frost & snow flurries, freezing mist, crisp clear starlight
 */
const SEASON_WEATHER_WEIGHTS: Record<number, Partial<Record<WeatherPresetName, number>>> = {
  0: { clear: 0.45, rain: 0.35, fog: 0.20, snow: 0.00, sandstorm: 0.00 }, // spring
  1: { clear: 0.55, rain: 0.35, fog: 0.05, snow: 0.00, sandstorm: 0.05 }, // summer
  2: { clear: 0.30, fog: 0.40, rain: 0.25, snow: 0.05, sandstorm: 0.00 }, // autumn
  3: { snow: 0.45, fog: 0.30, clear: 0.20, rain: 0.05, sandstorm: 0.00 }, // winter
};

const PRESETS: WeatherPresetName[] = ["clear", "rain", "fog", "snow", "sandstorm"];

/**
 * How long one weather spell lasts, in world days. Short enough that a season
 * (8 world days) contains several distinct spells, so the weather visibly turns
 * over within a season rather than being a single state per season.
 */
export const SPELL_DAYS = 1.35;

/**
 * The weather this climate calls for at a point in world time.
 *
 * Deterministic: the same world time always yields the same sky, so scrubbing
 * time forward and back does not reshuffle the weather.
 *
 * @param totalDays   Cumulative world days (worldSeconds / REAL_SECONDS_PER_DAY).
 * @param seasonPhase Continuous season phase in [0, 4).
 */
export function climateWeatherAt(
  totalDays: number,
  seasonPhase: number
): WeatherPresetName {
  const spell = Math.floor(totalDays / SPELL_DAYS);

  const seasonIndex =
    ((Math.floor(seasonPhase) % SEASON_COUNT) + SEASON_COUNT) % SEASON_COUNT;
  const weights = SEASON_WEATHER_WEIGHTS[seasonIndex];

  // Draw from the season's distribution using the spell index as the seed, so
  // consecutive spells differ but the whole sequence is reproducible.
  const roll = hash01(spell, 91);
  let acc = 0;
  for (const preset of PRESETS) {
    acc += weights[preset] ?? 0;
    if (roll < acc) return preset;
  }
  return "clear";
}

/**
 * Fog is a dawn phenomenon: it forms overnight in the valley as the ground
 * cools, and burns off through the morning. A fog spell that persists through
 * a summer afternoon reads as broken, so the time of day gets a veto.
 *
 * @param dayFraction 0 (midnight) to 1.
 */
export function fogSurvivesTimeOfDay(
  dayFraction: number,
  seasonIndex: number
): boolean {
  // Autumn and winter fog is an all-day inversion; spring and summer fog burns
  // off after mid-morning.
  if (seasonIndex === 2 || seasonIndex === 3) return true;
  return dayFraction < 0.42 || dayFraction > 0.86;
}

/**
 * Resolves the climate's choice, applying the time-of-day veto.
 * Returns the preset the world should currently be in.
 */
export function resolveClimateWeather(
  totalDays: number,
  seasonPhase: number,
  dayFraction: number
): WeatherPresetName {
  const want = climateWeatherAt(totalDays, seasonPhase);
  const seasonIndex =
    ((Math.floor(seasonPhase) % SEASON_COUNT) + SEASON_COUNT) % SEASON_COUNT;
  if (want === "fog" && !fogSurvivesTimeOfDay(dayFraction, seasonIndex)) {
    return "clear";
  }
  return want;
}
