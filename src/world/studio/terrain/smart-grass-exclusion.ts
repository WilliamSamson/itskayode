import * as THREE from "three";
import { LIP_OUTLINE } from "./island-mass";
import { LAB_BOUNDS } from "../advanced-tech-lab";

export interface BoundingBox2D {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  margin: number;
  id?: string;
}

export interface PolygonFootprint2D {
  points: Array<{ x: number; z: number }>;
  margin: number;
  id?: string;
}

export interface CircularFootprint2D {
  cx: number;
  cz: number;
  radius: number;
  margin: number;
  id?: string;
}

/**
 * Standard 2D point-in-polygon ray-casting test.
 */
export function isPointInPolygon(
  px: number,
  pz: number,
  polygon: ReadonlyArray<{ x: number; z: number }>
): boolean {
  let inside = false;
  const len = polygon.length;
  for (let i = 0, j = len - 1; i < len; j = i++) {
    const xi = polygon[i].x;
    const zi = polygon[i].z;
    const xj = polygon[j].x;
    const zj = polygon[j].z;
    const intersect =
      zi > pz !== zj > pz && px < ((xj - xi) * (pz - zi)) / (zj - zi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Calculates the shortest distance from point (px, pz) to a line segment (x1, z1)-(x2, z2).
 */
function distanceToSegment(
  px: number,
  pz: number,
  x1: number,
  z1: number,
  x2: number,
  z2: number
): number {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const lenSq = dx * dx + dz * dz;
  if (lenSq === 0) return Math.hypot(px - x1, pz - z1);
  let t = ((px - x1) * dx + (pz - z1) * dz) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), pz - (z1 + t * dz));
}

/**
 * Calculates the shortest distance from point (px, pz) to the perimeter of a polygon.
 */
export function distanceToPolygonPerimeter(
  px: number,
  pz: number,
  polygon: ReadonlyArray<{ x: number; z: number }>
): number {
  let minDist = Infinity;
  const len = polygon.length;
  for (let i = 0, j = len - 1; i < len; j = i++) {
    const d = distanceToSegment(
      px,
      pz,
      polygon[j].x,
      polygon[j].z,
      polygon[i].x,
      polygon[i].z
    );
    if (d < minDist) minDist = d;
  }
  return minDist;
}

/**
 * The island's plantable edge: the turf lip, past the flat plateau and over
 * the rolled shoulder. Shared with the landmass so they cannot drift apart.
 */
export const ISLAND_PLATEAU_PERIMETER: ReadonlyArray<{ x: number; z: number }> = LIP_OUTLINE;

/**
 * Smart Grass Exclusion Registry
 * Dynamically tracks all building plinths, rooms, pavilions, monuments, signage,
 * and newly placed structures to ensure volumetric grass never grows on or clips through them.
 */
export class SmartGrassExclusionRegistry {
  private boxes: BoundingBox2D[] = [];
  private polygons: PolygonFootprint2D[] = [];
  private circles: CircularFootprint2D[] = [];

  constructor() {
    this.registerKnownArchitecture();
  }

  /**
   * Pre-registers all known architectural buildings, rooms, plinths, and signage.
   */
  private registerKnownArchitecture() {
    // 1. Office Campus Complex (Chamfered polygon plinth)
    const officePoints = [
      { x: -22.2, z: -11.5 },
      { x: -4.8, z: -11.5 },
      { x: -4.8, z: 10.5 },
      { x: -16.4, z: 10.5 },
      { x: -16.9, z: 10.0 },
      { x: -16.9, z: 4.6 },
      { x: -25.5, z: 4.6 },
      { x: -25.5, z: -4.2 },
      { x: -22.2, z: -4.2 },
    ];
    this.registerPolygon(officePoints, 0.45, "office-campus");

    // 2. Connector Gallery Plinth
    const connectorPoints = [
      { x: -4.8, z: -2.8 },
      { x: -2.8, z: -3.1 },
      { x: -0.9, z: -2.4 },
      { x: -0.9, z: 3.6 },
      { x: -2.8, z: 4.3 },
      { x: -4.8, z: 3.8 },
    ];
    this.registerPolygon(connectorPoints, 0.45, "connector-gallery");

    // 3. Central Oasis & Living Lounge Plinth (X in [-0.9, 17.8], Z in [-2.0, 6.3])
    this.registerBox(-0.9, 17.8, -2.0, 6.3, 0.45, "central-oasis");

    // 4. Kitchen Space Wing Plinth (X in [-1.5, 17.8], Z in [-7.0, -2.0])
    this.registerBox(-1.5, 17.8, -7.0, -2.0, 0.45, "kitchen-wing");

    // 5. The Study & Tech Library Plinth (X in [11.0, 22.2], Z in [1.8, 11.4]) - Expanded Double Area
    this.registerBox(11.0, 22.2, 1.8, 11.4, 0.45, "boardroom");

    // 6. Expanded Southern Oasis Garden Plinth (X in [0.8, 11.0], Z in [6.3, 11.4])
    this.registerBox(0.8, 11.0, 6.3, 11.4, 0.45, "oasis-south-expansion");

    // 7. The expanded hall and merged lab are larger than the automatic scanner's
    // 28m structure cutoff, so exclude their full floorplates explicitly.
    this.registerBox(
      LAB_BOUNDS.spineX - 1.8, LAB_BOUNDS.spineX + 1.8,
      LAB_BOUNDS.south, LAB_BOUNDS.corridorStart, 0.45, "north-lab-approach"
    );
    this.registerBox(
      LAB_BOUNDS.west, LAB_BOUNDS.east,
      LAB_BOUNDS.north, LAB_BOUNDS.south, 0.45, "advanced-tech-lab"
    );

    // 8. 100 kW High-Voltage Power Plant & Micro-Grid Substation
    this.registerBox(26.0, 56.0, -72.0, -34.0, 0.45, "power-grid-substation");

    // 10. Standing ORRA Monument & Spotlights (X = 3.5, Z = 22.0)
    // Plinth: 3.2m x 1.6m + 4 directional spotlights
    this.registerBox(1.5, 5.5, 20.8, 23.2, 0.35, "orra-monument-plinth");

    // 11. Dismantled WS TECH Wreckage (X = -4.5, Z = 22.0)
    // Earth mounds, tilted letters, and steel trusses
    this.registerBox(-7.8, -1.2, 19.5, 24.5, 0.35, "ws-tech-wreckage");
  }

  /**
   * Registers an axis-aligned bounding box exclusion zone.
   */
  public registerBox(
    minX: number,
    maxX: number,
    minZ: number,
    maxZ: number,
    margin = 0.35,
    id?: string
  ): void {
    this.boxes.push({
      minX: Math.min(minX, maxX),
      maxX: Math.max(minX, maxX),
      minZ: Math.min(minZ, maxZ),
      maxZ: Math.max(minZ, maxZ),
      margin,
      id,
    });
  }

  /**
   * Registers a 2D polygonal footprint exclusion zone.
   */
  public registerPolygon(
    points: Array<{ x: number; z: number } | [number, number]>,
    margin = 0.35,
    id?: string
  ): void {
    const formatted = points.map((p) =>
      Array.isArray(p) ? { x: p[0], z: p[1] } : p
    );
    this.polygons.push({ points: formatted, margin, id });
  }

  /**
   * Registers a circular exclusion zone (e.g. spotlight base, gazebo, water basin).
   */
  public registerCircle(
    cx: number,
    cz: number,
    radius: number,
    margin = 0.35,
    id?: string
  ): void {
    this.circles.push({ cx, cz, radius, margin, id });
  }

  /**
   * Smart Structure Registration:
   * Accepts any THREE.Object3D (Mesh, Group, Building, Signage), computes its
   * world-space ground footprint bounding box, and registers it as an exclusion zone.
   */
  public registerStructure(object: THREE.Object3D, margin = 0.35, id?: string): void {
    object.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(object);
    if (!box.isEmpty()) {
      this.registerBox(
        box.min.x,
        box.max.x,
        box.min.z,
        box.max.z,
        margin,
        id || object.name || "custom-structure"
      );
    }
  }

  /**
   * Scans a scene graph for all structures, buildings, and signage intersecting ground level
   * and automatically adds them to the exclusion registry.
   */
  public scanAndRegisterScene(scene: THREE.Object3D, defaultMargin = 0.35): void {
    // Clear previously auto-scanned entries so repeated calls are clean and idempotent
    this.boxes = this.boxes.filter((b) => !b.id?.startsWith("scanned-"));
    this.polygons = this.polygons.filter((p) => !p.id?.startsWith("scanned-"));
    this.circles = this.circles.filter((c) => !c.id?.startsWith("scanned-"));

    scene.updateMatrixWorld(true);
    scene.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      if (!obj.visible) return;

      const name = (obj.name || "").toLowerCase();
      // Skip terrain surface, cliffs, skybox, particles, water, plants, and island geometry
      if (
        name.includes("terrace") ||
        name.includes("cliff") ||
        name.includes("grass") ||
        name.includes("pebble") ||
        name.includes("water") ||
        name.includes("sky") ||
        name.includes("star") ||
        name.includes("cloud") ||
        name.includes("island") ||
        name.includes("islet") ||
        name.includes("ground") ||
        name.includes("plateau") ||
        name.includes("vegetation") ||
        name.includes("foliage") ||
        name.includes("plant") ||
        name.includes("tree") ||
        obj.userData?.isTerrain === true
      ) {
        return;
      }

      // Compute bounding box
      const box = new THREE.Box3().setFromObject(obj);
      if (box.isEmpty()) return;

      // Check if mesh touches or sits on the island surface (Y between -0.30 and 1.5)
      if (box.min.y <= 0.6 && box.max.y >= -0.3) {
        const sizeX = box.max.x - box.min.x;
        const sizeZ = box.max.z - box.min.z;

        // Ignore macro-scale terrain/atmosphere meshes (no individual building on this island exceeds 28m)
        if (sizeX > 28 || sizeZ > 28) {
          return;
        }

        // Ignore tiny speckles (< 0.2m)
        if (sizeX >= 0.2 && sizeZ >= 0.2) {
          this.registerBox(
            box.min.x,
            box.max.x,
            box.min.z,
            box.max.z,
            defaultMargin,
            `scanned-${obj.name || obj.id}`
          );
        }
      }
    });
  }

  /**
   * Returns true if point (x, z) is blocked by any building, plinth, or signage.
   */
  public isBlocked(x: number, z: number): boolean {
    // 1. Check AABB boxes
    for (let i = 0; i < this.boxes.length; i++) {
      const b = this.boxes[i];
      if (
        x >= b.minX - b.margin &&
        x <= b.maxX + b.margin &&
        z >= b.minZ - b.margin &&
        z <= b.maxZ + b.margin
      ) {
        return true;
      }
    }

    // 2. Check circular zones
    for (let i = 0; i < this.circles.length; i++) {
      const c = this.circles[i];
      if (Math.hypot(x - c.cx, z - c.cz) <= c.radius + c.margin) {
        return true;
      }
    }

    // 3. Check polygon zones
    for (let i = 0; i < this.polygons.length; i++) {
      const p = this.polygons[i];
      if (
        isPointInPolygon(x, z, p.points) ||
        distanceToPolygonPerimeter(x, z, p.points) < p.margin
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Returns true if point (x, z) is near any structure within checkMargin.
   */
  public isNearStructure(x: number, z: number, checkMargin = 1.3): boolean {
    for (let i = 0; i < this.boxes.length; i++) {
      const b = this.boxes[i];
      if (
        x >= b.minX - checkMargin &&
        x <= b.maxX + checkMargin &&
        z >= b.minZ - checkMargin &&
        z <= b.maxZ + checkMargin
      ) {
        return true;
      }
    }
    for (let i = 0; i < this.circles.length; i++) {
      const c = this.circles[i];
      if (Math.hypot(x - c.cx, z - c.cz) <= c.radius + checkMargin) {
        return true;
      }
    }
    for (let i = 0; i < this.polygons.length; i++) {
      const p = this.polygons[i];
      if (
        isPointInPolygon(x, z, p.points) ||
        distanceToPolygonPerimeter(x, z, p.points) < checkMargin
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Returns the distance from point (x, z) to the perimeter of the island plateau.
   */
  public getDistanceToPerimeter(x: number, z: number): number {
    return distanceToPolygonPerimeter(x, z, ISLAND_PLATEAU_PERIMETER);
  }

  /**
   * Returns true if point (x, z) lies safely inside the island plateau perimeter.
   */
  public isInsideIslandPlateau(x: number, z: number, edgeMargin = 0.8): boolean {
    if (!isPointInPolygon(x, z, ISLAND_PLATEAU_PERIMETER)) {
      return false;
    }
    return distanceToPolygonPerimeter(x, z, ISLAND_PLATEAU_PERIMETER) >= edgeMargin;
  }

  /**
   * Smart Plantable Query:
   * Returns true if (x, z) is a valid location for grass to grow:
   * - It is within the island plateau perimeter (with safe edge clearance)
   * - It is completely clear of all buildings, structures, plinths, and signage
   */
  public isPlantable(x: number, z: number, edgeMargin = 0.8): boolean {
    if (!this.isInsideIslandPlateau(x, z, edgeMargin)) {
      return false;
    }
    return !this.isBlocked(x, z);
  }
}
