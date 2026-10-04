import { STUDIO_ISLAND_BOUND } from "../studio/island";
import { LANDMASS_OUTER_BOUND } from "../space/space-environment";

/**
 * ORRA's space, cloud, god-ray and storm-cell systems were calibrated against
 * the retired 5 km landmass, whose rim bound was LANDMASS_OUTER_BOUND. Every
 * one of their constants is a proportion of that rim: asteroid lanes sit a
 * fixed multiple outside it, clouds circulate inside it, storm cells span it.
 *
 * Scaling those systems by (new rim / old rim) keeps every one of those
 * relationships exactly, instead of hand-editing hundreds of constants and
 * losing the calibration. Human-scale effects (rain streaks, splashes, lens
 * drops) are NOT scaled: a raindrop is the same size on any island.
 */
export const WORLD_SCALE = STUDIO_ISLAND_BOUND / LANDMASS_OUTER_BOUND;
