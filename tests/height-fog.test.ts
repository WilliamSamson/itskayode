import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { WEATHER_PRESETS } from "@/world/weather/weather-world-state";
import { DEFAULT_THREE_QUARTER } from "@/world/navigation/world-navigation";
import { STUDIO_ISLAND_BOUND } from "@/world/studio/island";
import {
  FOG_BASE_HEIGHT,
  fogFieldFor,
  fogTransmittance,
  heightFogUniforms,
  henyeyGreenstein,
  installHeightFog,
  visibilityMetres,
} from "@/world/engine/height-fog";

// The default 3/4 view, rebuilt from its spherical config.
const { radius, phi, theta } = DEFAULT_THREE_QUARTER;
const target = DEFAULT_THREE_QUARTER.target!;
const flat = radius * Math.sin(phi);
const camera = {
  x: target.x + flat * Math.cos(theta),
  y: target.y + radius * Math.cos(phi),
  z: target.z + flat * Math.sin(theta),
};
const along = (s: number) => ({
  x: target.x + Math.cos(theta) * s,
  y: target.y,
  z: target.z + Math.sin(theta) * s,
});
const frontRim = along(STUDIO_ISLAND_BOUND);
const farRim = along(-STUDIO_ISLAND_BOUND);
const preset = (name: keyof typeof WEATHER_PRESETS) =>
  fogFieldFor(WEATHER_PRESETS[name].visibility, WEATHER_PRESETS[name].fogDensity ?? 0);

describe("Height fog", () => {
  it("closes dense fog over the far rim but keeps the front of the island readable", () => {
    const fog = preset("fog");
    expect(fogTransmittance(fog, camera, farRim)).toBeLessThan(0.1);
    expect(fogTransmittance(fog, camera, frontRim)).toBeGreaterThan(0.5);
    // Permeable: nothing in the near field is veiled at all.
    expect(fogTransmittance(fog, camera, { x: camera.x, y: camera.y - 40, z: camera.z })).toBe(1);
  });

  it("orders presets by visibility and leaves clear air clear", () => {
    const t = (name: keyof typeof WEATHER_PRESETS) => fogTransmittance(preset(name), camera, farRim);
    expect(t("fog")).toBeLessThan(t("sandstorm"));
    expect(t("sandstorm")).toBeLessThan(t("rain"));
    expect(t("rain")).toBeLessThan(1);
    expect(t("clear")).toBe(1);
    // Clear air reaches past the starfield.
    expect(visibilityMetres(1)).toBeGreaterThan(2400);
  });

  it("is monotonic in visibility", () => {
    let prev = 0;
    for (let v = 0; v <= 1.0001; v += 0.05) {
      const t = fogTransmittance(fogFieldFor(v, 0.95), camera, target);
      expect(t).toBeGreaterThanOrEqual(prev);
      prev = t;
    }
  });

  it("pools under the inversion: the same path is clearer above the base than below it", () => {
    const pool = fogFieldFor(0.2, 0.3); // shallow: fair-weather mist
    const below = fogTransmittance(pool, { x: 0, y: 5, z: 0 }, { x: 300, y: 5, z: 0 });
    const above = fogTransmittance(pool, { x: 0, y: 150, z: 0 }, { x: 300, y: 150, z: 0 });
    expect(below).toBeLessThan(0.05);
    expect(above).toBeGreaterThan(0.9);
    // A bank (fogDensity high) is deep, so climbing does not escape it.
    const bank = fogFieldFor(0.2, 0.95);
    expect(fogTransmittance(bank, { x: 0, y: 150, z: 0 }, { x: 300, y: 150, z: 0 })).toBeLessThan(0.2);
  });

  it("integrates density continuously across the base and along level rays", () => {
    const pool = fogFieldFor(0.3, 0.3);
    const level = fogTransmittance(pool, { x: 0, y: FOG_BASE_HEIGHT + 10, z: 0 }, { x: 400, y: FOG_BASE_HEIGHT + 10, z: 0 });
    const tilted = fogTransmittance(pool, { x: 0, y: FOG_BASE_HEIGHT + 10, z: 0 }, { x: 400, y: FOG_BASE_HEIGHT + 10.01, z: 0 });
    expect(tilted).toBeCloseTo(level, 3);
  });

  it("scatters forward: mist is brightest toward the sun", () => {
    expect(henyeyGreenstein(1)).toBeGreaterThan(20 * henyeyGreenstein(0));
    expect(henyeyGreenstein(-1)).toBeLessThan(henyeyGreenstein(0));
  });

  it("shares its uniforms by reference with every compiled material", () => {
    installHeightFog();
    const cloned = THREE.UniformsUtils.clone(THREE.ShaderLib.standard.uniforms);
    expect(cloned.fogParams.value).toBe(heightFogUniforms.fogParams.value);
    expect(cloned.fogSunDir.value).toBe(heightFogUniforms.fogSunDir.value);
    expect(THREE.ShaderChunk.fog_fragment).toContain("fogParams");
  });
});
