import * as THREE from "three";
import {
  RainPhase,
  UnifiedWindVector,
  RainCell,
  CanopyInterceptionState,
  WaterAccumulationState,
  CliffWaterfallChute,
  LivingRainTelemetry,
} from "./living-rain-types";

export const RAIN_PHASES: RainPhase[] = [
  "pressure_change",
  "front_approaching",
  "overcast",
  "first_drops",
  "rainfall",
  "heavy_storm",
  "weakening",
  "after_rain",
  "drying",
];

export const PHASE_DURATIONS: Record<RainPhase, number> = {
  pressure_change: 14.0,
  front_approaching: 18.0,
  overcast: 16.0,
  first_drops: 14.0,
  rainfall: 32.0,
  heavy_storm: 42.0,
  weakening: 22.0,
  after_rain: 32.0,
  drying: 36.0,
};

export class LivingRainEngine {
  public currentPhase: RainPhase = "pressure_change";
  public phaseTime = 0;
  public isPaused = false;

  /** Below this, the preset wants no rain and the lifecycle parks. */
  public static readonly AUTHORITY_EPSILON = 0.01;

  /** See setAuthority(). 1 = preset fully permits rain, 0 = preset forbids it. */
  public authority = 1.0;

  // Unified Environmental Wind Vector
  public wind: UnifiedWindVector = {
    direction: 0.68, // blowing toward South-East (~39°)
    dx: Math.cos(0.68),
    dz: Math.sin(0.68),
    speed: 4.2,
    gustStrength: 0.0,
    gustFrequency: 0.22,
    turbulence: 0.0,
  };

  // Traveling Localized Rain Cell
  public cell: RainCell = {
    x: -1200,
    z: -1200,
    radius: 2100,
    intensity: 0.0,
    vx: 18.0,
    vz: 14.0,
  };

  // Canopy Interception & Throughfall Dripping
  public canopy: CanopyInterceptionState = {
    waterStored: 0.0,
    dripRate: 0.0,
    isDripping: false,
  };

  // Water Accumulation & Runoff
  public accumulation: WaterAccumulationState = {
    surfaceWetness: 0.04,
    puddleDepth: 0.0,
    runoffRate: 0.0,
    soilSaturation: 0.05,
  };

  // 4 Signature Cliff Waterfall Drainage Chutes on 5 km Landmass Perimeter
  public chutes: CliffWaterfallChute[] = [
    {
      id: "chute_east_fjord",
      name: "East Fjord Chute",
      x: 2380,
      z: 410,
      rimY: 14.5,
      baseY: -380.0,
      width: 68.0,
      flowRate: 0.0,
    },
    {
      id: "chute_northeast_notch",
      name: "North-East Notch",
      x: 1350,
      z: -2050,
      rimY: 18.0,
      baseY: -410.0,
      width: 56.0,
      flowRate: 0.0,
    },
    {
      id: "chute_south_promontory",
      name: "South Promontory Gully",
      x: -580,
      z: 2350,
      rimY: 12.0,
      baseY: -360.0,
      width: 76.0,
      flowRate: 0.0,
    },
    {
      id: "chute_west_chasm",
      name: "West Chasm Drop",
      x: -2200,
      z: -710,
      rimY: 16.0,
      baseY: -390.0,
      width: 62.0,
      flowRate: 0.0,
    },
  ];

  // Lightning state
  private lightningTimer = 8.0;
  private lightningDuration = 0;
  private lightningIntensity = 0;
  public lightningOrigin = new THREE.Vector3(-120, 95, -160);

  // Cached telemetry
  public telemetry!: LivingRainTelemetry;

  // Time tracking
  private totalElapsed = 0;

  constructor(initialPhase: RainPhase = "pressure_change") {
    this.setPhase(initialPhase);
    this.telemetry = this.getTelemetry(new THREE.Vector3(0, 50, 100));
  }

  public setPhase(phase: RainPhase): void {
    this.currentPhase = phase;
    this.phaseTime = 0;
    this.applyPhaseParameters();
  }

  public setPhaseProgress(totalProgressFraction: number): void {
    const clamped = Math.max(0, Math.min(0.9999, totalProgressFraction));
    const totalCycle = Object.values(PHASE_DURATIONS).reduce((a, b) => a + b, 0);
    let targetTime = clamped * totalCycle;

    for (let i = 0; i < RAIN_PHASES.length; i++) {
      const p = RAIN_PHASES[i];
      const dur = PHASE_DURATIONS[p];
      if (targetTime <= dur || i === RAIN_PHASES.length - 1) {
        this.currentPhase = p;
        this.phaseTime = targetTime;
        this.applyPhaseParameters();
        break;
      }
      targetTime -= dur;
    }
  }

  public advanceToNextPhase(): void {
    const idx = RAIN_PHASES.indexOf(this.currentPhase);
    const nextIdx = (idx + 1) % RAIN_PHASES.length;
    this.setPhase(RAIN_PHASES[nextIdx]);
  }

  /**
   * Applies target parameters for the current lifecycle phase
   */
  private applyPhaseParameters(): void {
    switch (this.currentPhase) {
      case "pressure_change":
        this.wind.speed = 5.5;
        this.cell.intensity = 0.0;
        break;
      case "front_approaching":
        this.wind.speed = 9.5;
        this.cell.intensity = 0.08;
        break;
      case "overcast":
        this.wind.speed = 12.0;
        this.cell.intensity = 0.18;
        break;
      case "first_drops":
        this.wind.speed = 14.5;
        this.cell.intensity = 0.42;
        break;
      case "rainfall":
        this.wind.speed = 18.0;
        this.cell.intensity = 0.78;
        break;
      case "heavy_storm":
        this.wind.speed = 24.0;
        this.cell.intensity = 1.0;
        break;
      case "weakening":
        this.wind.speed = 12.0;
        this.cell.intensity = 0.35;
        break;
      case "after_rain":
        this.wind.speed = 6.0;
        this.cell.intensity = 0.05;
        break;
      case "drying":
        this.wind.speed = 4.0;
        this.cell.intensity = 0.0;
        break;
    }
  }

  /**
   * Evaluates rainfall intensity (0.0 to 1.0) at any world coordinate (x, z).
   * Models the traveling rain cell field so rain is not uniform across the 1 km² island.
   */
  public evaluateRainAt(x: number, z: number): number {
    // The active weather preset is the single authority on whether it rains.
    // This engine supplies the *structure* of rain (travelling cells, lifecycle
    // phases, gusts) but must never manufacture precipitation the preset did
    // not ask for -- that is what made it rain during "clear".
    const gated = this.cell.intensity * this.authority;
    if (gated <= 0.001) return 0.0;
    const dx = x - this.cell.x;
    const dz = z - this.cell.z;
    const dist = Math.hypot(dx, dz);

    if (dist >= this.cell.radius) return 0.0;
    const falloff = Math.pow(1 - dist / this.cell.radius, 1.8);
    return Math.max(0, Math.min(1, falloff * gated));
  }

  /**
   * Fraction of this engine's output the active weather preset permits (0..1).
   * Driven from the weather state's interpolated precipitation, so rain fades
   * with the transition instead of being cut off mid-storm.
   */
  public setAuthority(authority: number): void {
    this.authority = Math.max(0, Math.min(1, authority));
  }

  /** True when the preset permits no rain; the lifecycle parks and the world dries. */
  public get isDormant(): boolean {
    return this.authority <= LivingRainEngine.AUTHORITY_EPSILON;
  }

  /**
   * Main simulation tick.
   */
  public update(dt: number, cameraPos: THREE.Vector3): void {
    this.totalElapsed += dt;

    // 1. Advance Lifecycle Phase.
    // Parked while dormant: a preset that wants no rain must not have a storm
    // cycling invisibly behind it, only to pop into view on the next switch.
    if (!this.isPaused && !this.isDormant) {
      this.phaseTime += dt;
      const curDuration = PHASE_DURATIONS[this.currentPhase];
      if (this.phaseTime >= curDuration) {
        this.phaseTime -= curDuration;
        this.advanceToNextPhase();
      }
    }

    // 2. Update Unified Wind Vector
    // Gusts trigger with frequency
    const gustCycle = Math.sin(this.totalElapsed * this.wind.gustFrequency * Math.PI * 2);
    this.wind.gustStrength = Math.max(0, Math.pow(gustCycle, 4));
    this.wind.turbulence = Math.sin(this.totalElapsed * 7.5) * 0.18;

    // Wind direction unit components
    this.wind.dx = Math.cos(this.wind.direction);
    this.wind.dz = Math.sin(this.wind.direction);

    // 3. Move Traveling Rain Cell across 1 km² Landmass
    const cellSpeed = (this.wind.speed + this.wind.gustStrength * 8.0) * 1.1;
    this.cell.vx = this.wind.dx * cellSpeed;
    this.cell.vz = this.wind.dz * cellSpeed;

    this.cell.x += this.cell.vx * dt;
    this.cell.z += this.cell.vz * dt;

    // Wrap cell when it travels off downwind edge (> 3500m)
    const cellDist = Math.hypot(this.cell.x, this.cell.z);
    if (cellDist > 3500) {
      // Re-spawn upwind
      this.cell.x = -this.wind.dx * 3300;
      this.cell.z = -this.wind.dz * 3300;
    }

    // 4. Canopy Interception & Throughfall Dripping Simulation
    const rainAtCam = this.evaluateRainAt(cameraPos.x, cameraPos.z);
    // Rain fills canopy
    this.canopy.waterStored += rainAtCam * dt * 0.45;
    this.canopy.waterStored = Math.max(0, Math.min(1.0, this.canopy.waterStored));

    // When canopy water exceeds threshold, water drips to ground
    if (this.canopy.waterStored > 0.28) {
      this.canopy.isDripping = true;
      this.canopy.dripRate = (this.canopy.waterStored - 0.28) * 1.8;
      // Canopy water slowly drains
      this.canopy.waterStored = Math.max(0, this.canopy.waterStored - this.canopy.dripRate * dt * 0.12);
    } else {
      this.canopy.isDripping = false;
      this.canopy.dripRate = 0.0;
      // Slow evaporation during drying phase
      if (this.currentPhase === "drying" || this.currentPhase === "after_rain" || this.isDormant) {
        this.canopy.waterStored = Math.max(0, this.canopy.waterStored - dt * 0.04);
      }
    }

    // 5. Water Accumulation & Drainage Simulation
    if (rainAtCam > 0.05) {
      this.accumulation.surfaceWetness += rainAtCam * dt * 0.35;
      this.accumulation.puddleDepth += rainAtCam * dt * 0.28;
      this.accumulation.soilSaturation += rainAtCam * dt * 0.22;
    } else if (this.currentPhase === "after_rain") {
      // Slow drain & evaporation
      this.accumulation.puddleDepth = Math.max(0, this.accumulation.puddleDepth - dt * 0.015);
      this.accumulation.surfaceWetness = Math.max(0.2, this.accumulation.surfaceWetness - dt * 0.01);
    } else if (this.currentPhase === "drying" || this.isDormant) {
      // Rapid evaporation. Dormant counts as drying, otherwise a preset switch
      // away from rain would freeze puddles and wet ground on screen forever.
      this.accumulation.puddleDepth = Math.max(0, this.accumulation.puddleDepth - dt * 0.05);
      this.accumulation.surfaceWetness = Math.max(0.04, this.accumulation.surfaceWetness - dt * 0.03);
      this.accumulation.soilSaturation = Math.max(0.04, this.accumulation.soilSaturation - dt * 0.02);
    }

    this.accumulation.surfaceWetness = Math.max(0.04, Math.min(1.0, this.accumulation.surfaceWetness));
    this.accumulation.puddleDepth = Math.max(0.0, Math.min(1.0, this.accumulation.puddleDepth));
    this.accumulation.soilSaturation = Math.max(0.04, Math.min(1.0, this.accumulation.soilSaturation));

    // Runoff rate begins once puddles form
    this.accumulation.runoffRate = Math.min(1.0, this.accumulation.puddleDepth * 1.45);

    // 6. Cliff Waterfall Flow Rates
    for (const chute of this.chutes) {
      // Flow rate follows runoff with slight per-chute variance
      const targetFlow = Math.max(0, Math.min(1.0, this.accumulation.runoffRate * 1.15));
      chute.flowRate = THREE.MathUtils.lerp(chute.flowRate, targetFlow, dt * 1.2);
    }

    // 7. Environmental Lightning Simulation
    if (this.currentPhase === "heavy_storm" || (this.currentPhase === "rainfall" && Math.random() < 0.02)) {
      this.lightningTimer -= dt;
      if (this.lightningTimer <= 0) {
        this.lightningDuration = 0.24;
        this.lightningTimer = 5.0 + Math.random() * 8.0;
        // Directional strike point inside the storm cell
        this.lightningOrigin.set(
          this.cell.x + (Math.random() - 0.5) * 180,
          85 + Math.random() * 35,
          this.cell.z + (Math.random() - 0.5) * 180
        );
      }
    } else {
      this.lightningDuration = 0;
      this.lightningIntensity = 0;
    }

    if (this.lightningDuration > 0) {
      this.lightningDuration -= dt;
      const t = Math.max(0, this.lightningDuration / 0.24);
      // Double strike flash envelope
      if (t > 0.55) {
        this.lightningIntensity = Math.sin(((t - 0.55) / 0.45) * Math.PI);
      } else if (t > 0.15) {
        this.lightningIntensity = Math.sin(((t - 0.15) / 0.4) * Math.PI) * 0.7;
      } else {
        this.lightningIntensity = 0;
      }
    } else {
      this.lightningIntensity = 0;
    }

    // Cache latest telemetry snapshot
    this.telemetry = this.getTelemetry(cameraPos);
  }

  public getLightningIntensity(): number {
    // Gated too: lightning flashing out of a clear sky was part of the same bug.
    return this.lightningIntensity * this.authority;
  }

  public getTelemetry(cameraPos: THREE.Vector3): LivingRainTelemetry {
    const curDuration = PHASE_DURATIONS[this.currentPhase];
    const progress = Math.min(1.0, this.phaseTime / curDuration);
    const phaseIdx = RAIN_PHASES.indexOf(this.currentPhase);
    const cameraRain = this.evaluateRainAt(cameraPos.x, cameraPos.z);

    const avgWaterfallFlow =
      this.chutes.reduce((sum, c) => sum + c.flowRate, 0) / this.chutes.length;

    return {
      phase: this.currentPhase,
      phaseProgress: progress,
      phaseIndex: phaseIdx,
      windSpeed: this.wind.speed * (1 + this.wind.gustStrength * 0.45),
      windAngleDeg: Math.round((this.wind.direction * 180) / Math.PI),
      gustFactor: this.wind.gustStrength,
      cellPos: { x: Math.round(this.cell.x), z: Math.round(this.cell.z) },
      cellIntensity: this.cell.intensity,
      cameraLocalRain: cameraRain,
      canopyWater: this.canopy.waterStored,
      canopyDripRate: this.canopy.dripRate,
      surfaceWetness: this.accumulation.surfaceWetness,
      puddleDepth: this.accumulation.puddleDepth,
      runoffRate: this.accumulation.runoffRate,
      waterfallFlow: avgWaterfallFlow,
      lightningSurge: this.lightningIntensity,
    };
  }
}
