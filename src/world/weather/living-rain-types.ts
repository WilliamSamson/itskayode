/**
 * /ORRA WEATHER 01 — LIVING RAIN
 * Types and interfaces for the living rain and storm physical simulation.
 */

export type RainPhase =
  | "pressure_change"
  | "front_approaching"
  | "overcast"
  | "first_drops"
  | "rainfall"
  | "heavy_storm"
  | "weakening"
  | "after_rain"
  | "drying";

export interface UnifiedWindVector {
  /** Wind direction angle in radians (0 = East, PI/2 = South, PI = West, -PI/2 = North) */
  direction: number;
  /** Horizontal unit vector components */
  dx: number;
  dz: number;
  /** Base wind speed in m/s (typically 2 to 24 m/s) */
  speed: number;
  /** Instantaneous gust impulse multiplier (0.0 to 1.0) */
  gustStrength: number;
  /** Gust repetition frequency in Hz */
  gustFrequency: number;
  /** High-frequency micro-eddy turbulence oscillation */
  turbulence: number;
}

export interface RainCell {
  /** Current world-space center of the precipitation cell */
  x: number;
  z: number;
  /** Radius of the cell in meters (typically 250m to 480m) */
  radius: number;
  /** Peak rainfall intensity at center (0.0 to 1.0) */
  intensity: number;
  /** Drifting velocity vector in m/s */
  vx: number;
  vz: number;
}

export interface CanopyInterceptionState {
  /** Stored water in foliage volume (0.0 to 1.0 capacity) */
  waterStored: number;
  /** Current rate of water dripping from branches to ground (0.0 to 1.0) */
  dripRate: number;
  /** Active dripping particles flag */
  isDripping: boolean;
}

export interface WaterAccumulationState {
  /** Current surface wetness index (0.0 to 1.0) */
  surfaceWetness: number;
  /** Standing puddle volume in depressions (0.0 to 1.0) */
  puddleDepth: number;
  /** Rate of surface runoff draining toward island perimeter (0.0 to 1.0) */
  runoffRate: number;
  /** Soil saturation index (0.0 to 1.0) */
  soilSaturation: number;
}

export interface CliffWaterfallChute {
  id: string;
  name: string;
  /** Perimeter rim coordinate where stream plunges */
  x: number;
  z: number;
  rimY: number;
  /** Base depth where water plunges into mist void (e.g. -110m) */
  baseY: number;
  /** Width of the waterfall torrent in meters */
  width: number;
  /** Active flow volume (0.0 to 1.0) */
  flowRate: number;
}

export interface LivingRainTelemetry {
  phase: RainPhase;
  phaseProgress: number; // 0.0 to 1.0 in current phase
  phaseIndex: number; // 0 to 8
  windSpeed: number; // m/s
  windAngleDeg: number;
  gustFactor: number;
  cellPos: { x: number; z: number };
  cellIntensity: number;
  cameraLocalRain: number; // 0.0 to 1.0 at camera position
  canopyWater: number;
  canopyDripRate: number;
  surfaceWetness: number;
  puddleDepth: number;
  runoffRate: number;
  waterfallFlow: number;
  lightningSurge: number;
}
