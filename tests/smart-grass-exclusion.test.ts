import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  SmartGrassExclusionRegistry,
  isPointInPolygon,
  ISLAND_PLATEAU_PERIMETER,
} from "@/world/studio/terrain/smart-grass-exclusion";

describe("Smart Grass Exclusion System", () => {
  it("keeps grass inside the island plateau perimeter", () => {
    const registry = new SmartGrassExclusionRegistry();

    // South promontory lawn point (inside island)
    expect(registry.isInsideIslandPlateau(0, 20.0, 0.8)).toBe(true);

    // Deep void beyond south rim
    expect(registry.isInsideIslandPlateau(0, 48.0, 0.8)).toBe(false);

    // Deep void beyond east rim
    expect(registry.isInsideIslandPlateau(70.0, 0, 0.8)).toBe(false);

    // Deep void beyond west rim
    expect(registry.isInsideIslandPlateau(-70.0, 0, 0.8)).toBe(false);
  });

  it("excludes known architectural buildings and rooms", () => {
    const registry = new SmartGrassExclusionRegistry();

    // Central Oasis lounge plinth: X in [-0.9, 17.8], Z in [-2.0, 6.3]
    expect(registry.isBlocked(8.0, 2.0)).toBe(true);
    expect(registry.isPlantable(8.0, 2.0)).toBe(false);

    // Boardroom: X in [11.0, 18.6], Z in [1.8, 8.0]
    expect(registry.isBlocked(14.5, 4.5)).toBe(true);

    // Kitchen Space Wing: X in [-1.5, 17.8], Z in [-7.0, -2.0]
    expect(registry.isBlocked(5.0, -4.5)).toBe(true);

    // Office Campus: e.g. (-10.0, 0)
    expect(registry.isBlocked(-10.0, 0)).toBe(true);
  });

  it("excludes standing ORRA signage and WS TECH wreckage", () => {
    const registry = new SmartGrassExclusionRegistry();

    // Standing ORRA monument plinth center: X = 3.5, Z = 22.0
    expect(registry.isBlocked(3.5, 22.0)).toBe(true);
    expect(registry.isPlantable(3.5, 22.0)).toBe(false);

    // WS TECH wreckage center: X = -4.5, Z = 22.0
    expect(registry.isBlocked(-4.5, 22.0)).toBe(true);
    expect(registry.isPlantable(-4.5, 22.0)).toBe(false);

    // Open south lawn between monument and edge (e.g. X = -12.0, Z = 22.0)
    expect(registry.isBlocked(-12.0, 22.0)).toBe(false);
    expect(registry.isPlantable(-12.0, 22.0)).toBe(true);
  });

  it("dynamically excludes new buildings or signage added to the scene", () => {
    const registry = new SmartGrassExclusionRegistry();

    const candidateX = -12.0;
    const candidateZ = 22.0;

    // Initially plantable on open lawn
    expect(registry.isPlantable(candidateX, candidateZ)).toBe(true);

    // User adds a new building or signage at this location
    const newBuilding = new THREE.Mesh(
      new THREE.BoxGeometry(6, 4, 6),
      new THREE.MeshStandardMaterial()
    );
    newBuilding.position.set(candidateX, 2.0, candidateZ);
    newBuilding.name = "new-pavilion-structure";

    // Register the new structure
    registry.registerStructure(newBuilding, 0.35);

    // Now grass is smartly blocked and will not grow on it!
    expect(registry.isBlocked(candidateX, candidateZ)).toBe(true);
    expect(registry.isPlantable(candidateX, candidateZ)).toBe(false);
  });

  it("auto-scans scene objects intersecting the ground level", () => {
    const registry = new SmartGrassExclusionRegistry();
    const testScene = new THREE.Scene();

    const customSignX = 12.0;
    const customSignZ = 24.0;
    expect(registry.isPlantable(customSignX, customSignZ)).toBe(true);

    // Add a custom structure mesh to the scene
    const customSignage = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 1.5, 0.8),
      new THREE.MeshStandardMaterial()
    );
    customSignage.position.set(customSignX, 0.5, customSignZ);
    customSignage.name = "custom-sculpture";
    testScene.add(customSignage);

    // Scan scene
    registry.scanAndRegisterScene(testScene);

    // Grass is smartly blocked from growing on the new sculpture
    expect(registry.isBlocked(customSignX, customSignZ)).toBe(true);
  });

  it("identifies proximity to structures for edge trimming and computes perimeter distance", () => {
    const registry = new SmartGrassExclusionRegistry();

    // Boardroom center is (14.5, 4.5) with bounds X [11.0, 18.6], Z [1.8, 8.0]
    // Point right on the perimeter collar (within 1.3m)
    expect(registry.isNearStructure(19.2, 4.5, 1.3)).toBe(true);

    // Deep in open south lawn away from any structure
    expect(registry.isNearStructure(0, 28.0, 1.3)).toBe(false);

    // Island perimeter distance: interior point has positive distance
    const distCenter = registry.getDistanceToPerimeter(0, -18);
    expect(distCenter).toBeGreaterThan(10);
  });
});
