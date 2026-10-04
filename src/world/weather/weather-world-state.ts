import * as THREE from "three";

/**
 * WeatherWorldState
 * Continuous shared physical state for the ORRA dynamic atmosphere.
 * Replaces disconnected particle presets with a unified atmospheric continuum.
 */

export interface WeatherWorldState {
  /** 0.0 (pure clear) to 1.0 (dense overcast/storm) */
  cloudCoverage: number;
  /** 0.0 (dry desert) to 1.0 (vapor saturation / mist) */
  humidity: number;
  /** 0.0 (calm air) to 1.0 (gale force winds / storm gusts) */
  wind: number;
  /** Wind direction angle in radians (where wind blows towards) */
  windAngle: number;
  /** Instantaneous gust strength multiplier (0.0 to 1.0) */
  gustFactor: number;
  /** 0.0 (dry) to 1.0 (torrential downpour / heavy precipitation) */
  precipitation: number;
  /** Type of airborne particle precipitation */
  precipitationType?: "rain" | "snow" | "sand" | "none";
  /** 0.0 (zero visibility / dense valley fog) to 1.0 (crystal alpine clarity) */
  visibility: number;
  /** 0.0 (fully occluded diffuse light) to 1.0 (intense direct sun) */
  sunExposure: number;
  /** 0.0 (bone dry) to 1.0 (saturated wet / reflective puddles) */
  surfaceWetness: number;
  /** 0.0 (dry ground) to 1.0 (deep standing basin water) */
  puddleDepth: number;
  /** 0.0 (overcast/diffuse) to 1.0 (crepuscular sunbeams piercing clouds) */
  crepuscularRays: number;
  /** Temperature in Celsius */
  temperature?: number;
  /** Volumetric ground mist & valley inversion density (0.0 to 1.0) */
  fogDensity?: number;
}

export type CoreWeatherPresetName = "clear" | "rain" | "snow" | "fog" | "sandstorm";

export type WeatherPresetName =
  | CoreWeatherPresetName
  | "partly_cloudy"
  | "passing_showers"
  | "thunderstorms"
  | "frost"
  | "light_snow";

export const CORE_WEATHER_PRESETS: CoreWeatherPresetName[] = [
  "clear",
  "rain",
  "snow",
  "fog",
  "sandstorm",
];

export const WEATHER_PRESETS: Record<WeatherPresetName, WeatherWorldState> = {
  // 1. Fair Sky (Clean sunshine / starlight with drifting cumulus and crepuscular rays)
  clear: {
    cloudCoverage: 0.22,
    humidity: 0.20,
    wind: 0.28,
    windAngle: 0.70,
    gustFactor: 0.15,
    precipitation: 0.0,
    precipitationType: "none",
    visibility: 1.0,
    sunExposure: 0.95,
    surfaceWetness: 0.0,
    puddleDepth: 0.0,
    crepuscularRays: 0.50,
    temperature: 23,
    fogDensity: 0.0,
  },

  // 2. Rain & Thunderstorm (Liquid rainfall, surface puddling, and lightning strikes)
  rain: {
    cloudCoverage: 0.95,
    humidity: 0.95,
    wind: 0.85,
    windAngle: 1.05,
    gustFactor: 0.88,
    precipitation: 0.90,
    precipitationType: "rain",
    visibility: 0.42,
    sunExposure: 0.10,
    surfaceWetness: 1.0,
    puddleDepth: 0.90,
    crepuscularRays: 0.05,
    temperature: 15,
    fogDensity: 0.40,
  },

  // 3. Frost & Snow (Sub-zero freeze, crystalline frost ground sheen, gentle swirling flurries)
  snow: {
    cloudCoverage: 0.70,
    humidity: 0.45,
    wind: 0.32,
    windAngle: 0.50,
    gustFactor: 0.22,
    precipitation: 0.60,
    precipitationType: "snow",
    visibility: 0.72,
    sunExposure: 0.45,
    surfaceWetness: 0.35,
    puddleDepth: 0.0,
    crepuscularRays: 0.25,
    temperature: -4,
    fogDensity: 0.15,
  },

  // 4. Valley Fog (Low inversion ground mist pooling in ravines and hollows, soft diffused light)
  fog: {
    cloudCoverage: 0.80,
    humidity: 0.98,
    wind: 0.08,
    windAngle: 0.35,
    gustFactor: 0.05,
    precipitation: 0.02,
    precipitationType: "none",
    visibility: 0.20,
    sunExposure: 0.30,
    surfaceWetness: 0.40,
    puddleDepth: 0.10,
    crepuscularRays: 0.75,
    temperature: 10,
    fogDensity: 0.95,
  },

  // 5. Gale Sandstorm (High-velocity desert wind, horizontal dust streaks, warm ochre haze)
  sandstorm: {
    cloudCoverage: 0.75,
    humidity: 0.05,
    wind: 0.98,
    windAngle: 1.40,
    gustFactor: 0.98,
    precipitation: 0.75,
    precipitationType: "sand",
    visibility: 0.24,
    sunExposure: 0.20,
    surfaceWetness: 0.0,
    puddleDepth: 0.0,
    crepuscularRays: 0.10,
    temperature: 36,
    fogDensity: 0.75,
  },

  // Legacy aliases
  get partly_cloudy() {
    return this.clear;
  },
  get passing_showers() {
    return this.rain;
  },
  get thunderstorms() {
    return this.rain;
  },
  get frost() {
    return this.snow;
  },
  get light_snow() {
    return this.snow;
  },
};

export class WeatherStateManager {
  public current: WeatherWorldState;
  public target: WeatherWorldState;
  public activePreset: WeatherPresetName = "clear";

  // Transition rate factor (per second)
  private transitionRate = 1.15;

  // Lightning simulation
  private nextLightningTime = 6.0;
  private lightningDuration = 0;
  private lightningIntensity = 0;
  private totalElapsed = 0;

  constructor(initialPreset: WeatherPresetName = "clear") {
    this.activePreset = initialPreset;
    this.current = { ...WEATHER_PRESETS[initialPreset] };
    this.target = { ...WEATHER_PRESETS[initialPreset] };
  }

  public setPreset(preset: WeatherPresetName): void {
    this.activePreset = preset;
    this.target = { ...WEATHER_PRESETS[preset] };
  }

  public setCustomTarget(state: Partial<WeatherWorldState>): void {
    this.target = { ...this.target, ...state };
  }

  /**
   * Updates state variables continuously with exponential decay toward target.
   */
  public update(dt: number): void {
    this.totalElapsed += dt;
    const blendFactor = 1 - Math.exp(-this.transitionRate * dt);

    this.current.cloudCoverage += (this.target.cloudCoverage - this.current.cloudCoverage) * blendFactor;
    this.current.humidity += (this.target.humidity - this.current.humidity) * blendFactor;
    this.current.wind += (this.target.wind - this.current.wind) * blendFactor;
    this.current.windAngle += (this.target.windAngle - this.current.windAngle) * blendFactor;
    this.current.precipitation += (this.target.precipitation - this.current.precipitation) * blendFactor;
    this.current.visibility += (this.target.visibility - this.current.visibility) * blendFactor;
    this.current.sunExposure += (this.target.sunExposure - this.current.sunExposure) * blendFactor;
    this.current.surfaceWetness += (this.target.surfaceWetness - this.current.surfaceWetness) * blendFactor;
    this.current.puddleDepth += (this.target.puddleDepth - this.current.puddleDepth) * blendFactor;
    this.current.crepuscularRays += (this.target.crepuscularRays - this.current.crepuscularRays) * blendFactor;

    if (this.target.temperature !== undefined) {
      this.current.temperature = THREE.MathUtils.lerp(
        this.current.temperature ?? 20,
        this.target.temperature,
        blendFactor
      );
    }

    if (this.target.fogDensity !== undefined) {
      this.current.fogDensity = THREE.MathUtils.lerp(
        this.current.fogDensity ?? 0,
        this.target.fogDensity,
        blendFactor
      );
    }

    if (this.target.precipitationType) {
      this.current.precipitationType = this.target.precipitationType;
    }

    // Dynamic gust oscillation based on wind strength
    const gustCycle = Math.sin(this.totalElapsed * (1.2 + this.current.wind * 2.5));
    const rawGust = Math.max(0, Math.pow(Math.max(0, gustCycle), 3.5));
    this.current.gustFactor = THREE.MathUtils.lerp(
      this.current.gustFactor,
      rawGust * this.current.wind * 1.25,
      Math.min(1.0, dt * 4.0)
    );

    const isThunderstorm =
      this.activePreset === "thunderstorms" ||
      (this.activePreset === "rain" && this.current.precipitation > 0.45) ||
      (this.current.precipitation > 0.45 && this.current.cloudCoverage > 0.65 && this.current.wind > 0.65);

    if (isThunderstorm) {
      this.nextLightningTime -= dt;
      if (this.nextLightningTime <= 0) {
        // Trigger multi-phase lightning flash (primary strike + secondary flicker)
        this.lightningDuration = 0.25;
        this.nextLightningTime = 4.0 + Math.random() * 7.0;
      }
    } else {
      this.lightningDuration = 0;
      this.lightningIntensity = 0;
    }

    if (this.lightningDuration > 0) {
      this.lightningDuration -= dt;
      // Double strike envelope: spike at start, brief dip, secondary strike
      const t = Math.max(0, this.lightningDuration / 0.25);
      if (t > 0.6) {
        this.lightningIntensity = Math.sin(((t - 0.6) / 0.4) * Math.PI);
      } else if (t > 0.15) {
        this.lightningIntensity = Math.sin(((t - 0.15) / 0.45) * Math.PI) * 0.85;
      } else {
        this.lightningIntensity = 0;
      }
    } else {
      this.lightningIntensity = 0;
    }
  }

  /**
   * Current instantaneous lightning illumination intensity (0.0 to 1.0).
   */
  public getLightningIntensity(): number {
    return this.lightningIntensity;
  }

  /**
   * Evaluates how close current state is to target (0.0 to 1.0).
   */
  public getTransitionProgress(): number {
    const diff =
      Math.abs(this.target.cloudCoverage - this.current.cloudCoverage) +
      Math.abs(this.target.humidity - this.current.humidity) +
      Math.abs(this.target.wind - this.current.wind) +
      Math.abs(this.target.precipitation - this.current.precipitation) +
      Math.abs(this.target.visibility - this.current.visibility) +
      Math.abs(this.target.sunExposure - this.current.sunExposure);
    return Math.max(0, Math.min(1, 1 - diff / 3.0));
  }
}
