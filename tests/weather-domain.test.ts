import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  overIsland,
  inIslandRainVolume,
  cameraInIslandWeather,
  getBuildingRoofHeight,
  isPointUnderRoof,
  isInsideBuilding,
} from "@/world/weather/weather-domain";
import { WeatherStateManager } from "@/world/weather/weather-world-state";
import { WeatherSystem } from "@/world/weather/weather-system";
import { LivingRainEngine } from "@/world/weather/living-rain-engine";
import { CameraRainRenderer } from "@/world/weather/camera-rain-renderer";
import { SpaceEnvironment } from "@/world/space/space-environment";

const position = new THREE.Vector3();
const matrix = new THREE.Matrix4();

describe("island-only weather", () => {
  it("uses the cliff footprint, not the broad orbital radius", () => {
    expect(overIsland(0, 0)).toBe(true);
    expect(overIsland(0, -60)).toBe(true); // northern promontory
    expect(overIsland(0, 60)).toBe(false); // void beyond southern edge
    expect(overIsland(112, -6)).toBe(true); // companion islet
    expect(overIsland(140, 0)).toBe(false);
    expect(inIslandRainVolume(0, 12, -20)).toBe(true);
    expect(inIslandRainVolume(0, 100, -20)).toBe(false);
    expect(cameraInIslandWeather(250, 12, 0)).toBe(false);
  });

  it("enforces 100% building column exclusion for all weather elements", () => {
    // 1. The West Pavilion & Executive Suites: (-11.8, 0, 0)
    expect(getBuildingRoofHeight(-11.8, 0)).toBe(4.25);
    expect(isInsideBuilding(-11.8, 0)).toBe(true);
    expect(isPointUnderRoof(-11.8, 2.0, 0)).toBe(true);
    expect(inIslandRainVolume(-11.8, 2.0, 0)).toBe(false); // No weather inside
    expect(inIslandRainVolume(-11.8, 12.0, 0)).toBe(false); // No weather above building column either!

    // 2. Central Oasis / Kitchen: (8.0, 0, 0)
    expect(getBuildingRoofHeight(8.0, 0)).toBe(4.25);
    expect(isInsideBuilding(8.0, 0)).toBe(true);
    expect(isPointUnderRoof(8.0, 2.0, 0)).toBe(true);
    expect(inIslandRainVolume(8.0, 2.0, 0)).toBe(false);
    expect(inIslandRainVolume(8.0, 12.0, 0)).toBe(false);

    // 3. Advanced Tech Lab: (-3.15, 0, -42.138)
    expect(isInsideBuilding(-3.15, -42.138)).toBe(true);
    expect(inIslandRainVolume(-3.15, 2.0, -42.138)).toBe(false);
    expect(inIslandRainVolume(-3.15, 15.0, -42.138)).toBe(false);

    // 4. Outdoor open lawn/air (not under any building column): (0, 0, -20)
    expect(getBuildingRoofHeight(0, -20)).toBe(0.0);
    expect(isInsideBuilding(0, -20)).toBe(false);
    expect(isPointUnderRoof(0, 2.0, -20)).toBe(false);
    expect(inIslandRainVolume(0, 2.0, -20)).toBe(true);
  });

  it("keeps studio rain particles in island air and stops them in space", () => {
    const manager = new WeatherStateManager("rain");
    const system = new WeatherSystem(new THREE.Scene(), manager, 0.085, 80);
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(0, 12, 0);
    system.update(camera, 0.016);
    const mesh = system.rootGroup.children[2].children[0] as THREE.InstancedMesh;
    expect(mesh.visible).toBe(true);
    let active = 0;
    for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, matrix);
      position.setFromMatrixPosition(matrix);
      if (position.y < -1000) continue;
      expect(inIslandRainVolume(position.x, position.y, position.z)).toBe(true);
      active++;
    }
    expect(active).toBeGreaterThan(0);
    camera.position.set(250, 12, 0);
    system.update(camera, 0.016);
    expect(mesh.visible).toBe(false);
    system.dispose();
  });

  it("stops camera rain outside the island and restores it on re-entry", () => {
    const engine = new LivingRainEngine();
    engine.cell.x = 0;
    engine.cell.z = 0;
    engine.cell.radius = 5000;
    engine.cell.intensity = 1;
    const renderer = new CameraRainRenderer(engine, 0.085);
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(250, 12, 0);
    renderer.update(camera, 0.016, 30);
    expect(renderer.rootGroup.visible).toBe(false);
    camera.position.set(0, 12, 0);
    renderer.update(camera, 0.016, 30);
    expect(renderer.rootGroup.visible).toBe(true);
    expect(renderer.heroMesh.visible).toBe(true);
    let active = 0;
    for (let i = 0; i < renderer.heroMesh.count; i++) {
      renderer.heroMesh.getMatrixAt(i, matrix);
      position.setFromMatrixPosition(matrix);
      if (position.y < -1000) continue;
      expect(inIslandRainVolume(position.x, position.y, position.z)).toBe(true);
      active++;
    }
    expect(active).toBeGreaterThan(0);
    renderer.dispose();
  });

  it("keeps orbital meshes on space lighting and out of weather fog", () => {
    const space = new SpaceEnvironment();
    for (const mesh of [space.heroMesh, space.asteroidMesh, space.mediumMesh, space.dustMesh]) {
      expect(mesh.layers.isEnabled(1)).toBe(true);
      expect(mesh.layers.isEnabled(0)).toBe(false);
      expect((mesh.material as any).fog).toBe(false);
    }
    space.dispose();
  });

  it("simulates snow and sandstorm particles strictly inside island bounds", () => {
    const manager = new WeatherStateManager("light_snow");
    const system = new WeatherSystem(new THREE.Scene(), manager, 0.085, 80);
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(0, 12, 0);

    // 1. Snow test
    system.update(camera, 0.016);
    const snowMesh = system.rootGroup.children[8].children[0] as THREE.InstancedMesh;
    expect(snowMesh.visible).toBe(true);
    let activeSnow = 0;
    for (let i = 0; i < snowMesh.count; i++) {
      snowMesh.getMatrixAt(i, matrix);
      position.setFromMatrixPosition(matrix);
      if (position.y < -1000) continue;
      expect(inIslandRainVolume(position.x, position.y, position.z)).toBe(true);
      activeSnow++;
    }
    expect(activeSnow).toBeGreaterThan(0);

    // 2. Sandstorm test
    manager.setPreset("sandstorm");
    // Run an update step to apply target
    manager.update(1.0);
    system.update(camera, 0.016);
    const sandMesh = system.rootGroup.children[9].children[0] as THREE.InstancedMesh;
    expect(sandMesh.visible).toBe(true);
    let activeSand = 0;
    for (let i = 0; i < sandMesh.count; i++) {
      sandMesh.getMatrixAt(i, matrix);
      position.setFromMatrixPosition(matrix);
      if (position.y < -1000) continue;
      expect(inIslandRainVolume(position.x, position.y, position.z)).toBe(true);
      activeSand++;
    }
    expect(activeSand).toBeGreaterThan(0);

    // 3. Fog valley mist planes test
    manager.setPreset("fog");
    manager.update(1.0);
    system.update(camera, 0.016);
    const valleyGroup = system.rootGroup.children[6] as THREE.Group;
    expect(valleyGroup.visible).toBe(true);
    expect(valleyGroup.children.length).toBeGreaterThanOrEqual(7);

    // Clear weather: mist and precipitation meshes turn invisible
    manager.setPreset("clear");
    manager.update(2.0);
    system.update(camera, 0.016);
    expect(snowMesh.visible).toBe(false);
    expect(sandMesh.visible).toBe(false);

    system.dispose();
  });
});
