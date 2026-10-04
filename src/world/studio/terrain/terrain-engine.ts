import * as THREE from "three";
import { TerrainTextures } from "./terrain-types";
import {
  createProceduralTurfTextures,
  createProceduralTurfMaterial,
} from "./procedural-turf-material";
import {
  ConcreteTextures,
  createProceduralConcreteTextures,
  createProceduralConcreteMaterial,
} from "./procedural-concrete-material";
import {
  GrassInstance,
  VolumetricGrassSystem,
  createVolumetricGrassSystem,
} from "./volumetric-grass";
import { SmartGrassExclusionRegistry } from "./smart-grass-exclusion";

/**
 * Modular Terrain Engine
 * Encapsulates living procedural lawn turf, architectural board-formed concrete cliffs,
 * volumetric 3D grass blade clusters with dynamic wind motion, smart structure exclusion,
 * and seamless landscape integration.
 */
export class TerrainEngine {
  private textures: TerrainTextures;
  private concreteTextures: ConcreteTextures;
  public mainTurfMaterial: THREE.MeshStandardMaterial;
  public companionTurfMaterial: THREE.MeshStandardMaterial;
  public companionConcreteMaterial: THREE.MeshStandardMaterial;
  public volumetricGrass?: VolumetricGrassSystem;
  public exclusionRegistry: SmartGrassExclusionRegistry;

  constructor() {
    this.textures = createProceduralTurfTextures(1024);
    this.concreteTextures = createProceduralConcreteTextures(1024);
    this.exclusionRegistry = new SmartGrassExclusionRegistry();

    // Main island living manicured lawn turf with clean fresh-cut stripes and crisp blade detailing
    this.mainTurfMaterial = createProceduralTurfMaterial(this.textures, {
      repeatU: 24.0,
      repeatV: 24.0,
      bumpScale: 0.065,
      roughness: 0.96,
      metalness: 0.0,
    });

    // Companion islets turf (calibrated repeat for smaller surfaces ~12m radius)
    this.companionTurfMaterial = createProceduralTurfMaterial(this.textures, {
      repeatU: 2.8,
      repeatV: 2.8,
      bumpScale: 0.055,
      roughness: 0.96,
      metalness: 0.0,
    });

    // Companion islets concrete finish
    this.companionConcreteMaterial = createProceduralConcreteMaterial(this.concreteTextures, {
      repeatU: 2.5,
      repeatV: 1.0,
      bumpScale: 0.032,
      roughness: 0.86,
      metalness: 0.04,
    });
  }

  /**
   * Registers a structure, building, plinth, or signage into the exclusion registry
   * so grass will automatically avoid growing on or clipping through it.
   */
  public registerStructure(object: THREE.Object3D, margin = 0.35, id?: string): void {
    this.exclusionRegistry.registerStructure(object, margin, id);
  }

  /**
   * Initializes volumetric 3D grass blade clumps and nestled river stones
   */
  public initVolumetricGrass(
    scene: THREE.Object3D,
    instances: GrassInstance[]
  ): void {
    if (this.volumetricGrass) {
      this.volumetricGrass.dispose();
    }
    this.volumetricGrass = createVolumetricGrassSystem(instances);
    scene.add(this.volumetricGrass.tiles);
    scene.add(this.volumetricGrass.pebblesGroup);
  }

  /**
   * Updates wind sway animation on volumetric grass blades
   */
  public update(timeSeconds: number): void {
    this.volumetricGrass?.update(timeSeconds);
  }

  /**
   * Creates organic flowing micro-topography knolls (subtle rounded earth mounds)
   * that hug building curves and add natural organic relief to the lawn.
   */
  public createTerrainKnoll(
    cx: number,
    cz: number,
    radiusX: number,
    radiusZ: number,
    peakHeight = 0.12
  ): THREE.Mesh {
    const geo = new THREE.SphereGeometry(1.0, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);
    geo.scale(radiusX, peakHeight, radiusZ);

    const mesh = new THREE.Mesh(geo, this.mainTurfMaterial);
    mesh.position.set(cx, -0.16, cz);
    mesh.receiveShadow = true;
    return mesh;
  }

  public dispose(): void {
    this.textures.diffuse.dispose();
    this.textures.bump.dispose();
    this.textures.roughness.dispose();
    this.concreteTextures.diffuse.dispose();
    this.concreteTextures.bump.dispose();
    this.concreteTextures.roughness.dispose();
    this.mainTurfMaterial.dispose();
    this.companionTurfMaterial.dispose();
    this.companionConcreteMaterial.dispose();
    this.volumetricGrass?.dispose();
  }
}
