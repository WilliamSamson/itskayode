/**
 * SONARIS Layered Costmap Engine (ROS 2 Nav2 Architecture Pattern)
 * Maintains a flat Uint8Array costmap with master reduction and exponential inflation decay.
 */

import {
  COSTMAP_FREE,
  COSTMAP_INSCRIBED,
  COSTMAP_LETHAL,
  type CostmapValue
} from "../types";

export interface CostmapBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export class LayeredCostmap {
  readonly widthM: number;
  readonly depthM: number;
  readonly resolutionM: number;
  readonly cols: number;
  readonly rows: number;
  readonly masterGrid: Uint8Array;
  private readonly inflationRadiusM: number;
  private readonly inscribedRadiusM: number;

  constructor(
    widthM: number,
    depthM: number,
    resolutionM = 0.10,
    inscribedRadiusM = 0.28,
    inflationRadiusM = 0.60
  ) {
    this.widthM = widthM;
    this.depthM = depthM;
    this.resolutionM = resolutionM;
    this.inscribedRadiusM = inscribedRadiusM;
    this.inflationRadiusM = inflationRadiusM;

    this.cols = Math.max(1, Math.ceil(widthM / resolutionM));
    this.rows = Math.max(1, Math.ceil(depthM / resolutionM));
    this.masterGrid = new Uint8Array(this.cols * this.rows);
    this.clear();
  }

  clear() {
    this.masterGrid.fill(COSTMAP_FREE);
  }

  worldToGrid(x: number, z: number): [number, number] | null {
    const halfW = this.widthM / 2;
    const halfD = this.depthM / 2;
    if (x < -halfW || x > halfW || z < -halfD || z > halfD) return null;
    const col = Math.floor((x + halfW) / this.resolutionM);
    const row = Math.floor((z + halfD) / this.resolutionM);
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return null;
    return [col, row];
  }

  gridToWorld(col: number, row: number): [number, number] {
    const halfW = this.widthM / 2;
    const halfD = this.depthM / 2;
    const x = -halfW + (col + 0.5) * this.resolutionM;
    const z = -halfD + (row + 0.5) * this.resolutionM;
    return [Number(x.toFixed(3)), Number(z.toFixed(3))];
  }

  getIndex(col: number, row: number): number {
    return row * this.cols + col;
  }

  getCost(x: number, z: number): CostmapValue {
    const cell = this.worldToGrid(x, z);
    if (!cell) return COSTMAP_LETHAL;
    return this.masterGrid[this.getIndex(cell[0], cell[1])];
  }

  isFree(x: number, z: number): boolean {
    return this.getCost(x, z) < COSTMAP_INSCRIBED;
  }

  isLethal(x: number, z: number): boolean {
    return this.getCost(x, z) >= COSTMAP_INSCRIBED;
  }

  /**
   * Sets an obstacle hit in the costmap and inflates its cost footprint outward.
   */
  markObstacle(x: number, z: number) {
    const center = this.worldToGrid(x, z);
    if (!center) return;

    const [cCenter, rCenter] = center;
    const cellRadius = Math.ceil(this.inflationRadiusM / this.resolutionM);

    for (let dr = -cellRadius; dr <= cellRadius; dr++) {
      const r = rCenter + dr;
      if (r < 0 || r >= this.rows) continue;

      for (let dc = -cellRadius; dc <= cellRadius; dc++) {
        const c = cCenter + dc;
        if (c < 0 || c >= this.cols) continue;

        const distM = Math.hypot(dc, dr) * this.resolutionM;
        let cost: number;

        if (distM <= this.inscribedRadiusM) {
          cost = COSTMAP_LETHAL;
        } else if (distM <= this.inflationRadiusM) {
          // Exponential cost decay: 253 down to 0
          const factor = (distM - this.inscribedRadiusM) / (this.inflationRadiusM - this.inscribedRadiusM);
          cost = Math.round(COSTMAP_INSCRIBED * Math.exp(-3.0 * factor));
        } else {
          cost = COSTMAP_FREE;
        }

        const idx = this.getIndex(c, r);
        if (cost > this.masterGrid[idx]) {
          this.masterGrid[idx] = cost;
        }
      }
    }
  }

  /**
   * Directly marks a negative pit or open floor drop as lethal.
   */
  markNegativePit(x: number, z: number, pitRadiusM = 0.20) {
    const center = this.worldToGrid(x, z);
    if (!center) return;

    const [cCenter, rCenter] = center;
    const cellRadius = Math.ceil((pitRadiusM + this.inscribedRadiusM) / this.resolutionM);

    for (let dr = -cellRadius; dr <= cellRadius; dr++) {
      const r = rCenter + dr;
      if (r < 0 || r >= this.rows) continue;
      for (let dc = -cellRadius; dc <= cellRadius; dc++) {
        const c = cCenter + dc;
        if (c < 0 || c >= this.cols) continue;
        const dist = Math.hypot(dc, dr) * this.resolutionM;
        if (dist <= pitRadiusM + this.inscribedRadiusM) {
          this.masterGrid[this.getIndex(c, r)] = COSTMAP_LETHAL;
        }
      }
    }
  }
}
