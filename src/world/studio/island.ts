/**
 * Geometry facts about the studio island that other systems depend on.
 *
 * The island is the studio portal's floating estate: a flat plateau whose lawn
 * rim sits at y = -0.16 with floors and paving just above it, plus two small
 * companion islets. Nothing on it is terrain in the height-field sense, so the
 * ground is a constant plateau height inside the footprint.
 */

/** Plateau walking height, in metres. */
export const STUDIO_GROUND_Y = 0;

/**
 * The expanded main cliff reaches approximately 100 m from the origin.
 * Companion islets sit beyond it; the navigation/orbital bound includes them.
 */
export const STUDIO_MAIN_ISLAND_RADIUS = 100;
export const MAIN_ISLAND_FOOTPRINT_SCALE = 1.9;

/** Unswept cliff outline; x/y are the Shape plane, with world z = -y. */
export const STUDIO_MAIN_FOOTPRINT = [
      { x: -24.5, y: 15.5,  r: 0.8 },
      { x: -16.5, y: 15.5,  r: 0.8 },
      // Grand Northern promontory & High-Voltage Power Plant sector:
      { x: -16.5, y: 41.5,  r: 0.8 },
      { x: 30.5,  y: 41.5,  r: 0.8 },
      { x: 30.5,  y: 16.5,  r: 0.8 },
      { x: 26.5,  y: 12.8,  r: 0.8 },
      { x: 26.5,  y: -14.0, r: 0.8 },
      { x: 11.5,  y: -14.0, r: 0.5 },
      { x: 11.5,  y: -20.5, r: 0.8 },
      { x: -7.5,  y: -20.5, r: 0.8 },
      { x: -7.5,  y: -14.5, r: 0.5 },
      { x: -24.5, y: -14.5, r: 0.8 },
      { x: -24.5, y: -5.5,  r: 0.5 },
      { x: -30.5, y: -5.5,  r: 0.8 },
      { x: -30.5, y: 4.5,   r: 0.8 },
      { x: -24.5, y: 4.5,   r: 0.5 },
] as const;



export const COMPANION_ISLET_CENTERS = [
  { x: -112, z: 14 },
  { x: 112, z: -6 },
] as const;

export const STUDIO_ISLAND_BOUND = 120;

/** Ground height under (x, z), or null over the void beyond the island. */
export function studioGroundHeight(x: number, z: number): number | null {
  return Math.hypot(x, z) <= STUDIO_ISLAND_BOUND ? STUDIO_GROUND_Y : null;
}
