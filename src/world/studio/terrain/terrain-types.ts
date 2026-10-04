import * as THREE from "three";

export type TerrainZoneType = "manicured-turf" | "wild-meadow" | "mossy-rim" | "zen-gravel";

export interface TerrainTextures {
  diffuse: THREE.Texture;
  bump: THREE.Texture;
  roughness: THREE.Texture;
}

export interface TerrainMaterialOptions {
  repeatU?: number;
  repeatV?: number;
  bumpScale?: number;
  roughness?: number;
  metalness?: number;
}
