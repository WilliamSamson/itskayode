import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  cloudFlowPosition,
  cloudVisibility,
} from "@/world/weather/cloud-flow";
import { WeatherSystem } from "@/world/weather/weather-system";
import { WeatherStateManager } from "@/world/weather/weather-world-state";

describe("continuous renewing cloud flow", () => {
  it("moves monotonically downwind without a visible reversal", () => {
    let previous = -Infinity;
    for (let i = 0; i <= 100; i++) {
      const p = i / 100;
      const position = cloudFlowPosition(p, 140, 0.7, 0.68);
      expect(position.along).toBeGreaterThan(previous);
      expect(Math.hypot(position.x, position.z)).toBeLessThan(800);
      previous = position.along;
    }
  });

  it("curves around the island core rather than veiling it", () => {
    const left = cloudFlowPosition(0.5, -120, 0.7, 0.68);
    const right = cloudFlowPosition(0.5, 120, 0.7, 0.68);
    expect(Math.hypot(left.x, left.z)).toBeGreaterThan(400);
    expect(Math.hypot(right.x, right.z)).toBeGreaterThan(400);
    expect(left.x * right.x + left.z * right.z).toBeLessThan(0);
  });

  it("condenses at entry and dissolves before regeneration", () => {
    expect(cloudVisibility(0)).toBe(0);
    expect(cloudVisibility(0.12)).toBeCloseTo(1);
    expect(cloudVisibility(0.5)).toBeCloseTo(1);
    expect(cloudVisibility(1)).toBe(0);
    expect(cloudVisibility(0.999)).toBeLessThan(0.001);
  });

  it("renews its shape and lane invisibly at the downwind edge", () => {
    const manager = new WeatherStateManager();
    const system = new WeatherSystem(new THREE.Scene(), manager);
    const camera = new THREE.PerspectiveCamera(50, 1.5, 0.1, 5000);
    const formation = system.cloudFormations[0];
    const originalLane = formation.lane;
    const originalScale = formation.lobes[0].baseScale.x;
    formation.progress = 0.999;
    system.update(camera, 0, "dark", "oblique");
    expect(formation.material.opacity).toBeLessThan(0.001);
    manager.current.windAngle = 1.2;
    system.update(camera, 1, "dark", "oblique");
    expect(formation.generation).toBe(1);
    expect(formation.material.opacity).toBeLessThan(0.02);
    expect(formation.lane).not.toBe(originalLane);
    expect(formation.lobes[0].baseScale.x).not.toBe(originalScale);
    expect(formation.windAngle).toBeCloseTo(1.2, 0);
    system.dispose();
  });
});
