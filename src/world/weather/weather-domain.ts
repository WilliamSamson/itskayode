import {
  COMPANION_ISLET_CENTERS,
  MAIN_ISLAND_FOOTPRINT_SCALE,
  STUDIO_ISLAND_BOUND,
  STUDIO_MAIN_FOOTPRINT,
} from "../studio/island";

/** The same outline used by the extruded cliff, mapped from Shape y to world z. */
const rim = STUDIO_MAIN_FOOTPRINT.map(({ x, y }) => ({
  x: x * MAIN_ISLAND_FOOTPRINT_SCALE,
  z: -y * MAIN_ISLAND_FOOTPRINT_SCALE,
}));

/** Actual land footprint, with a small allowance for airborne droplets at the rim. */
export function overIsland(x: number, z: number, margin = 0): boolean {
  if (Math.hypot(x, z) > STUDIO_ISLAND_BOUND + margin) return false;
  for (const [i, islet] of COMPANION_ISLET_CENTERS.entries()) {
    if (Math.hypot(x - islet.x, z - islet.z) <= (i === 0 ? 4.8 : 4.2) + margin) return true;
  }
  let inside = false;
  for (let i = 0, j = rim.length - 1; i < rim.length; j = i++) {
    const a = rim[j];
    const b = rim[i];
    if ((a.z > z) !== (b.z > z) && x < (b.x - a.x) * (z - a.z) / (b.z - a.z) + a.x) {
      inside = !inside;
    }
    if (margin > 0) {
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
      if (Math.hypot(x - a.x - t * dx, z - a.z - t * dz) <= margin) return true;
    }
  }
  return inside;
}

/**
 * Polygons and bounding boxes for all indoor building roofs on the island.
 * Rain strikes these roofs at y = 4.25m and never penetrates into interior rooms.
 */
const OFFICE_POLYGON = [
  { x: -22.2, z: -11.5 },
  { x: -4.8, z: -11.5 },
  { x: -4.8, z: 10.5 },
  { x: -16.4, z: 10.5 },
  { x: -16.9, z: 10.0 },
  { x: -16.9, z: 4.6 },
  { x: -25.5, z: 4.6 },
  { x: -25.5, z: -4.2 },
  { x: -22.2, z: -4.2 },
];

const CONNECTOR_POLYGON = [
  { x: -4.8, z: -2.8 },
  { x: -2.8, z: -3.1 },
  { x: -0.9, z: -2.4 },
  { x: -0.9, z: 3.6 },
  { x: -2.8, z: 4.3 },
  { x: -4.8, z: 3.8 },
];

function pointInPolygon2D(x: number, z: number, poly: { x: number; z: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[j];
    const b = poly[i];
    if ((b.z > z) !== (a.z > z) && x < ((a.x - b.x) * (z - b.z)) / (a.z - b.z) + b.x) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Returns the roof elevation at (x, z) if under an indoor architectural structure,
 * or 0.0 if outdoor open air.
 */
export function getBuildingRoofHeight(x: number, z: number): number {
  // 1. The Grand West Pavilion & Executive Suites
  if (x >= -25.6 && x <= -4.7 && z >= -11.6 && z <= 10.6) {
    if (pointInPolygon2D(x, z, OFFICE_POLYGON)) return 4.25;
  }
  // 2. Connector Gallery
  if (x >= -4.9 && x <= -0.8 && z >= -3.2 && z <= 4.4) {
    if (pointInPolygon2D(x, z, CONNECTOR_POLYGON)) return 4.25;
  }
  // 3. Central Oasis & Kitchen Wing
  if (x >= -1.6 && x <= 17.9 && z >= -7.1 && z <= 6.4) return 4.25;
  // 4. The Study & Tech Library
  if (x >= 10.9 && x <= 22.3 && z >= 1.7 && z <= 11.5) return 4.25;
  // 5. Southern Oasis Garden Expansion
  if (x >= 0.7 && x <= 11.1 && z >= 6.2 && z <= 11.5) return 4.25;
  // 6. Advanced Tech Lab Pavilion & Enclosed Approach
  if (x >= -5.0 && x <= -1.3 && z >= -29.0 && z <= -2.3) return 4.25; // Narrow approach
  if (x >= -21.2 && x <= 15.2 && z >= -55.5 && z <= -28.0) return 4.25; // Main Lab Pavilion

  return 0.0;
}

/**
 * Returns true if a 2D coordinate is inside any indoor building footprint.
 * Enforces 100% column exclusion across all elevations for all weather types.
 */
export function isInsideBuilding(x: number, z: number): boolean {
  return getBuildingRoofHeight(x, z) > 0;
}

/**
 * Returns true if a point is inside an indoor building (below the roof).
 */
export function isPointUnderRoof(x: number, y: number, z: number): boolean {
  const roof = getBuildingRoofHeight(x, z);
  return roof > 0 && y < roof;
}

/** Weather elements occupy the low atmosphere over the island, never the surrounding void or building columns. */
export function inIslandRainVolume(x: number, y: number, z: number): boolean {
  return y >= -12 && y <= 48 && overIsland(x, z, 2.5) && !isInsideBuilding(x, z);
}

/**
 * Camera viewing envelope: weather remains visible while orbiting or viewing the
 * island from ground, local, district, and regional altitudes, but turns off when
 * traveling out into the deep cosmic void (e.g. x >= 250 m).
 */
export function cameraInIslandWeather(x: number, y: number, z: number): boolean {
  const maxViewRadius = STUDIO_ISLAND_BOUND + 95;
  const maxAltitude = STUDIO_ISLAND_BOUND * 1.6;
  return y >= -20 && y <= maxAltitude && Math.hypot(x, z) <= maxViewRadius;
}

/**
 * Deterministic golden-angle sampling across the island landmass footprint.
 * Dynamically scales with STUDIO_ISLAND_BOUND to self-replicate when the island expands.
 */
export function sampleIslandGround(
  index: number,
  total: number,
  radius = STUDIO_ISLAND_BOUND
): { x: number; z: number } {
  const goldenAngle = 2.3999632;
  const r = radius * 0.95 * Math.sqrt((index + 0.5) / total);
  const theta = index * goldenAngle;
  let x = r * Math.cos(theta);
  let z = r * Math.sin(theta);

  // If outside footprint, pull inward along ray toward center until inside
  let attempts = 0;
  while (!overIsland(x, z, 1.0) && attempts < 12) {
    x *= 0.84;
    z *= 0.84;
    attempts++;
  }
  if (!overIsland(x, z, 1.0)) {
    if (index % 4 === 0) {
      x = COMPANION_ISLET_CENTERS[0].x;
      z = COMPANION_ISLET_CENTERS[0].z;
    } else if (index % 4 === 1) {
      x = COMPANION_ISLET_CENTERS[1].x;
      z = COMPANION_ISLET_CENTERS[1].z;
    } else {
      x = (index % 7 - 3) * 5;
      z = ((index * 3) % 7 - 3) * 5;
    }
  }
  return { x, z };
}


