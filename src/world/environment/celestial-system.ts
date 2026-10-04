/**
 * ORRA — A Living World
 * =====================
 * Copyright (c) 2026 Kayode. All rights reserved.
 *
 * Celestial Orbit, Diurnal Lighting & Atmospheric Scattering
 */

import * as THREE from "three";
import { WorldTime } from "../life/world-clock";

/**
 * ORRA Celestial System (§04)
 * ===========================
 *
 * Implements a genuine physical/environmental diurnal celestial arc.
 * `WorldClock.dayFraction` drives sun elevation, azimuth, physical color temperature,
 * solar intensity, atmospheric scattering, and star visibility.
 *
 * Direct solar illumination is modulated by atmospheric conditions and cloud occlusion,
 * so storms suppress sunlight and fog diffuses illumination.
 */

export interface CelestialLightingState {
  sunDirection: THREE.Vector3;
  sunPosition: THREE.Vector3;
  sunColor: THREE.Color;
  sunIntensity: number;
  ambientColor: THREE.Color;
  ambientIntensity: number;
  starVisibility: number;
  crepuscularIntensity: number;
  cloudOcclusion: number;
}

export class CelestialSystem {
  private sunPos = new THREE.Vector3();
  private sunDir = new THREE.Vector3();
  private sunColor = new THREE.Color();
  private ambientColor = new THREE.Color();

  // Celestial anchor colors
  private readonly COLOR_DAWN = new THREE.Color(0xff7a45); // Warm sunrise coral / amber
  private readonly COLOR_NOON = new THREE.Color(0xfff8ee); // Crisp high-noon solar white
  private readonly COLOR_DUSK = new THREE.Color(0xdf6e2d); // Warm copper / rose red-shift
  private readonly COLOR_NIGHT = new THREE.Color(0x7688a8); // Cool celestial moonlight

  private readonly AMBIENT_DAY = new THREE.Color(0xdce7f2);
  private readonly AMBIENT_DUSK = new THREE.Color(0x9a6858);
  private readonly AMBIENT_NIGHT = new THREE.Color(0x0e1422);

  // Cached state
  private currentState: CelestialLightingState = {
    sunDirection: new THREE.Vector3(0.5, 0.8, 0.3).normalize(),
    sunPosition: new THREE.Vector3(350, 560, 210),
    sunColor: new THREE.Color(0xfff8ee),
    sunIntensity: 2.4,
    ambientColor: new THREE.Color(0xdce7f2),
    ambientIntensity: 0.6,
    starVisibility: 0.0,
    crepuscularIntensity: 0.0,
    cloudOcclusion: 0.0,
  };

  /**
   * Updates celestial geometry and lighting from world time, weather, and theme.
   */
  public update(
    time: WorldTime,
    weather: { precipitation: number; visibility: number; surfaceWetness: number },
    cloudCover = 0.2,
    isDarkTheme = false
  ): CelestialLightingState {
    const dayFraction = time.dayFraction;
    const sunElevation = time.sunElevation; // -1 to 1

    // Physical solar orbit: azimuth revolves 360 deg around the 5 km continent
    const azimuth = time.sunAzimuth;
    const celestialRadius = 5500.0;

    // Smooth sun altitude: clamped above subterranean floor for directional key
    const effectiveElev = Math.max(0.08, (sunElevation + 0.15) * 0.85);
    const cosElev = Math.cos(Math.asin(THREE.MathUtils.clamp(effectiveElev, 0, 1)));

    this.sunPos.set(
      Math.cos(azimuth) * cosElev * celestialRadius,
      Math.max(350, effectiveElev * celestialRadius),
      Math.sin(azimuth) * cosElev * celestialRadius
    );
    this.sunDir.copy(this.sunPos).normalize();

    // Calculate base solar color and intensity along the diurnal arc
    let baseIntensity = 2.4;
    let starVis = 0.0;
    let crepuscular = 0.0;

    if (time.diurnalPhase === "dawn") {
      // 0.20 - 0.32: Sunrise transition
      const t = (dayFraction - 0.2) / 0.12;
      this.sunColor.copy(this.COLOR_DAWN).lerp(this.COLOR_NOON, t);
      this.ambientColor.copy(this.AMBIENT_NIGHT).lerp(this.AMBIENT_DAY, t);
      baseIntensity = THREE.MathUtils.lerp(0.8, 2.4, t);
      crepuscular = Math.sin(t * Math.PI) * 0.85;
      starVis = (1 - t) * 0.6;
    } else if (time.diurnalPhase === "noon") {
      // 0.32 - 0.68: Peak solar daylight
      this.sunColor.copy(this.COLOR_NOON);
      this.ambientColor.copy(this.AMBIENT_DAY);
      baseIntensity = 2.4;
      starVis = 0.0;
      crepuscular = 0.1;
    } else if (time.diurnalPhase === "dusk") {
      // 0.68 - 0.80: Golden hour into twilight
      const t = (dayFraction - 0.68) / 0.12;
      this.sunColor.copy(this.COLOR_NOON).lerp(this.COLOR_DUSK, t * 0.75).lerp(this.COLOR_NIGHT, t * 0.25);
      this.ambientColor.copy(this.AMBIENT_DAY).lerp(this.AMBIENT_DUSK, t * 0.6).lerp(this.AMBIENT_NIGHT, t * 0.4);
      baseIntensity = THREE.MathUtils.lerp(2.4, 0.7, t);
      crepuscular = Math.sin(t * Math.PI) * 1.0;
      starVis = t * 0.8;
    } else {
      // Night: celestial moonlight & starlight
      this.sunColor.copy(this.COLOR_NIGHT);
      this.ambientColor.copy(this.AMBIENT_NIGHT);
      baseIntensity = isDarkTheme ? 0.65 : 0.5;
      starVis = 1.0;
      crepuscular = 0.0;
    }

    // Cloud & Storm Occlusion (§04):
    // Rain and thick cloud cover actively suppress direct sunlight and soften ambient light
    const stormAttenuation = 1.0 - Math.min(0.85, weather.precipitation * 0.95 + cloudCover * 0.55);
    const finalSunIntensity = baseIntensity * stormAttenuation;
    const finalAmbientIntensity = THREE.MathUtils.lerp(0.65, 0.35, weather.precipitation);

    // Attenuate stars during overcast or dense storms
    const cloudStarMask = Math.max(0, 1.0 - cloudCover * 1.4 - weather.precipitation);
    starVis *= cloudStarMask;

    this.currentState = {
      sunDirection: this.sunDir,
      sunPosition: this.sunPos,
      sunColor: this.sunColor,
      sunIntensity: finalSunIntensity,
      ambientColor: this.ambientColor,
      ambientIntensity: finalAmbientIntensity,
      starVisibility: starVis,
      crepuscularIntensity: crepuscular * stormAttenuation,
      cloudOcclusion: 1.0 - stormAttenuation,
    };

    return this.currentState;
  }

  public getState(): CelestialLightingState {
    return this.currentState;
  }
}
