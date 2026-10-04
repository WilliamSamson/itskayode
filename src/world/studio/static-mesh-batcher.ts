import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export interface StaticBatchResult {
  sourceMeshes: number;
  batches: number;
  sourceTriangles: number;
  batchedTriangles: number;
}

type BatchMaterial = THREE.MeshStandardMaterial | THREE.MeshBasicMaterial;

/**
 * Standard-material properties that are moved onto vertex attributes, so
 * meshes differing only in these share one material and one draw. The island
 * builds ~280 inline material variants that reduce to ~13 looks this way.
 */
const BAKED = ["color", "roughness", "metalness", "emissive", "emissiveIntensity"];
const BAKED_ATTRIBUTES = new Set(["color", "surface", "emissiveTint"]);

/**
 * Merge only opaque, stationary meshes that share a material look and render
 * state. This keeps every vertex, UV, normal and triangle; it removes draw-call
 * overhead rather than lowering geometric or texture quality. Small spatial
 * cells retain frustum culling instead of baking the whole island into one mesh.
 */
export function batchStaticMeshes(
  root: THREE.Object3D,
  preserve: ReadonlySet<THREE.Object3D>,
  cellSize = 12,
): StaticBatchResult {
  root.updateMatrixWorld(true);
  const rootInverse = root.matrixWorld.clone().invert();
  const buckets = new Map<string, THREE.Mesh<THREE.BufferGeometry, BatchMaterial>[]>();
  const bucketMaterial = new Map<string, { material: BatchMaterial; baked: boolean }>();
  const bakedMaterials = new Map<string, THREE.MeshStandardMaterial>();
  const box = new THREE.Box3();
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  const protectedByAncestor = (object: THREE.Object3D): boolean => {
    for (let node: THREE.Object3D | null = object; node && node !== root; node = node.parent) {
      if (preserve.has(node)) return true;
    }
    return false;
  };

  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || object instanceof THREE.InstancedMesh || object instanceof THREE.SkinnedMesh) return;
    if (!object.visible || object.children.length || protectedByAncestor(object)) return;
    const material = object.material;
    const standard = material instanceof THREE.MeshStandardMaterial;
    if (!standard && !(material instanceof THREE.MeshBasicMaterial)) return;
    if (material.transparent || material.opacity < 1) return;
    if (object.userData && Object.keys(object.userData).length) return;
    if (object.customDepthMaterial || object.customDistanceMaterial) return;
    const geometry = object.geometry;
    if (!(geometry instanceof THREE.BufferGeometry) || !geometry.getAttribute("position")) return;
    if (Object.keys(geometry.morphAttributes).length || geometry.getAttribute("position").count > 5000) return;
    if (object.matrixWorld.determinant() < 0) return;
    box.setFromObject(object, true).getSize(size);
    if (size.x > cellSize || size.y > cellSize || size.z > cellSize) return;
    box.getCenter(center);
    if (Object.values(geometry.attributes).some((attribute) => !(attribute instanceof THREE.BufferAttribute))) return;

    const bakedKey = standard ? materialKey(material, BAKED) : null;
    const baked = bakedKey !== null;
    const look = bakedKey ?? materialKey(material, []) ?? material.uuid;
    const attributes = Object.entries(geometry.attributes)
      .filter(([name]) => !(baked && BAKED_ATTRIBUTES.has(name)))
      .map(([name, value]) => {
        const attr = value as THREE.BufferAttribute;
        return `${name}:${attr.itemSize}:${attr.normalized}:${attr.array.constructor.name}`;
      })
      .sort().join("|");
    const key = [
      look, object.castShadow, object.receiveShadow,
      object.renderOrder, object.layers.mask, geometry.index ? "indexed" : "unindexed",
      attributes,
      Math.floor(center.x / cellSize), Math.floor(center.y / cellSize), Math.floor(center.z / cellSize),
    ].join("/");
    const members = buckets.get(key) ?? [];
    members.push(object as THREE.Mesh<THREE.BufferGeometry, BatchMaterial>);
    buckets.set(key, members);
    if (!bucketMaterial.has(key)) {
      bucketMaterial.set(key, { material: baked ? bakedMaterial(bakedMaterials, look, material as THREE.MeshStandardMaterial) : material, baked });
    }
  });

  const result: StaticBatchResult = { sourceMeshes: 0, batches: 0, sourceTriangles: 0, batchedTriangles: 0 };
  for (const [key, members] of buckets) {
    const { material, baked } = bucketMaterial.get(key)!;
    // Bound each batch so one culled cell does not pull an unbounded number of
    // details into view. Any pair merged saves a draw call.
    for (let start = 0; start < members.length; start += 64) {
      const chunk = members.slice(start, start + 64);
      if (chunk.length < 2) continue;
      const transformed = chunk.map((mesh) => {
        const geometry = mesh.geometry.clone().applyMatrix4(rootInverse.clone().multiply(mesh.matrixWorld));
        if (baked) bakeSurface(geometry, mesh.material as THREE.MeshStandardMaterial);
        return geometry;
      });
      const merged = mergeGeometries(transformed, false);
      transformed.forEach((geometry) => geometry.dispose());
      if (!merged) continue;
      const first = chunk[0];
      const batch = new THREE.Mesh(merged, material);
      batch.name = "static-detail-batch";
      batch.castShadow = first.castShadow;
      batch.receiveShadow = first.receiveShadow;
      batch.renderOrder = first.renderOrder;
      batch.layers.mask = first.layers.mask;
      batch.userData.staticBatch = true;
      merged.computeBoundingBox();
      merged.computeBoundingSphere();
      root.add(batch);
      result.batches++;
      result.batchedTriangles += Math.floor((merged.index?.count ?? merged.getAttribute("position").count) / 3);
      for (const mesh of chunk) {
        result.sourceMeshes++;
        result.sourceTriangles += Math.floor((mesh.geometry.index?.count ?? mesh.geometry.getAttribute("position").count) / 3);
        mesh.parent?.remove(mesh);
      }
    }
  }
  return result;
}

const defaultOnBeforeCompile = THREE.Material.prototype.onBeforeCompile;
const defaultCacheKey = THREE.Material.prototype.customProgramCacheKey;

/**
 * Every own property except identity and `skip`, so two materials with the
 * same key render identically once the skipped values are supplied some other
 * way. Materials with shader hooks return null: their closures may capture
 * per-material uniforms that the source text cannot distinguish.
 */
function materialKey(material: THREE.Material, skip: readonly string[]): string | null {
  if (material.onBeforeCompile !== defaultOnBeforeCompile) return null;
  if (material.customProgramCacheKey !== defaultCacheKey) return null;
  const parts: string[] = [material.type];
  for (const [name, value] of Object.entries(material)) {
    if (name === "uuid" || name === "name" || name === "id" || name === "version" || name === "_listeners") continue;
    if (skip.includes(name)) continue;
    let text: string;
    if (value instanceof THREE.Color) text = value.getHexString();
    else if (value instanceof THREE.Texture) text = value.uuid;
    else if (value instanceof THREE.Vector2 || value instanceof THREE.Euler) text = value.toArray().join();
    else if (value && typeof value === "object") {
      try {
        text = JSON.stringify(value);
      } catch {
        return null;
      }
    } else text = String(value);
    parts.push(`${name}=${text}`);
  }
  return parts.join("|");
}

/** Per-vertex copies of the values `BAKED` removed from the material key. */
function bakeSurface(geometry: THREE.BufferGeometry, material: THREE.MeshStandardMaterial): void {
  const count = geometry.getAttribute("position").count;
  const existing = material.vertexColors ? geometry.getAttribute("color") : undefined;
  const color = new Float32Array(count * 3);
  const surface = new Float32Array(count * 2);
  const emissive = new Float32Array(count * 3);
  const c = material.color;
  const e = material.emissive;
  const ei = material.emissiveIntensity;
  for (let i = 0; i < count; i++) {
    color[i * 3] = c.r * (existing ? existing.getX(i) : 1);
    color[i * 3 + 1] = c.g * (existing ? existing.getY(i) : 1);
    color[i * 3 + 2] = c.b * (existing ? existing.getZ(i) : 1);
    surface[i * 2] = material.roughness;
    surface[i * 2 + 1] = material.metalness;
    emissive[i * 3] = e.r * ei;
    emissive[i * 3 + 1] = e.g * ei;
    emissive[i * 3 + 2] = e.b * ei;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(color, 3));
  geometry.setAttribute("surface", new THREE.BufferAttribute(surface, 2));
  geometry.setAttribute("emissiveTint", new THREE.BufferAttribute(emissive, 3));
}

/** One shared material per look; the baked values arrive as attributes. */
function bakedMaterial(
  cache: Map<string, THREE.MeshStandardMaterial>,
  key: string,
  source: THREE.MeshStandardMaterial
): THREE.MeshStandardMaterial {
  const cached = cache.get(key);
  if (cached) return cached;
  const material = source.clone();
  material.vertexColors = true;
  material.color.setRGB(1, 1, 1);
  material.roughness = 1;
  material.metalness = 1;
  material.emissive.setRGB(1, 1, 1);
  material.emissiveIntensity = 1;
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nattribute vec2 surface;\nattribute vec3 emissiveTint;\nvarying vec2 vSurface;\nvarying vec3 vEmissiveTint;"
      )
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvSurface = surface;\nvEmissiveTint = emissiveTint;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec2 vSurface;\nvarying vec3 vEmissiveTint;")
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor *= vSurface.x;")
      .replace("#include <metalnessmap_fragment>", "#include <metalnessmap_fragment>\nmetalnessFactor *= vSurface.y;")
      .replace("vec3 totalEmissiveRadiance = emissive;", "vec3 totalEmissiveRadiance = vEmissiveTint;");
  };
  material.customProgramCacheKey = () => "static-batch-baked-surface";
  cache.set(key, material);
  return material;
}
