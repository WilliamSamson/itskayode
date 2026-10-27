/**
 * SONARIS Local Rolling Costmap (ROS 2 Nav2 Local Costmap Pattern)
 * Maintains a rolling 4m x 4m high-resolution grid centered dynamically on the rover
 * for rapid local obstacle dodging and dynamic collision avoidance.
 */

import {
  COSTMAP_FREE,
  COSTMAP_INSCRIBED,
  COSTMAP_LETHAL,
  type CostmapValue,
  type Pose2D
} from "../types";

export class LocalRollingCostmap {
  readonly sizeM: number;       // e.g. 4.0m
  readonly resolutionM: number; // e.g. 0.05m (5cm per cell)
  readonly cellsPerAxis: number;
  readonly grid: Uint8Array;
  private centerPose: Pose2D;

  constructor(sizeM = 4.0, resolutionM = 0.05) {
    this.sizeM = sizeM;
    this.resolutionM = resolutionM;
    this.cellsPerAxis = Math.max(1, Math.ceil(sizeM / resolutionM));
    this.grid = new Uint8Array(this.cellsPerAxis * this.cellsPerAxis);
    this.centerPose = { x: 0, z: 0, headingDeg: 0 };
    this.clear();
  }

  clear() {
    this.grid.fill(COSTMAP_FREE);
  }

  /**
   * Re-centers the rolling window to the rover's current pose.
   */
  recenter(pose: Pose2D) {
    this.centerPose = { ...pose };
    this.clear();
  }

  getCenter(): Pose2D {
    return { ...this.centerPose };
  }

  worldToGrid(worldX: number, worldZ: number): [number, number] | null {
    const halfSize = this.sizeM / 2;
    const relX = worldX - this.centerPose.x;
    const relZ = worldZ - this.centerPose.z;

    if (Math.abs(relX) > halfSize || Math.abs(relZ) > halfSize) {
      return null;
    }

    const col = Math.floor((relX + halfSize) / this.resolutionM);
    const row = Math.floor((relZ + halfSize) / this.resolutionM);

    if (col < 0 || col >= this.cellsPerAxis || row < 0 || row >= this.cellsPerAxis) {
      return null;
    }

    return [col, row];
  }

  getIndex(col: number, row: number): number {
    return row * this.cellsPerAxis + col;
  }

  getCost(worldX: number, worldZ: number): CostmapValue {
    const cell = this.worldToGrid(worldX, worldZ);
    if (!cell) return COSTMAP_FREE; // Out of local window
    return this.grid[this.getIndex(cell[0], cell[1])];
  }

  isLethal(worldX: number, worldZ: number): boolean {
    return this.getCost(worldX, worldZ) >= COSTMAP_INSCRIBED;
  }

  /**
   * Ingests a live 2D laser hit point into the local rolling costmap with footprint inflation.
   */
  ingestLaserHit(worldX: number, worldZ: number, inflationRadiusM = 0.28) {
    const center = this.worldToGrid(worldX, worldZ);
    if (!center) return;

    const [cCenter, rCenter] = center;
    const cellRadius = Math.ceil(inflationRadiusM / this.resolutionM);

    for (let dr = -cellRadius; dr <= cellRadius; dr++) {
      const r = rCenter + dr;
      if (r < 0 || r >= this.cellsPerAxis) continue;

      for (let dc = -cellRadius; dc <= cellRadius; dc++) {
        const c = cCenter + dc;
        if (c < 0 || c >= this.cellsPerAxis) continue;

        const dist = Math.hypot(dc, dr) * this.resolutionM;
        let cost: number;

        if (dist <= 0.14) {
          cost = COSTMAP_LETHAL;
        } else if (dist <= inflationRadiusM) {
          cost = Math.round(COSTMAP_INSCRIBED * (1 - dist / inflationRadiusM));
        } else {
          continue;
        }

        const idx = this.getIndex(c, r);
        if (cost > this.grid[idx]) {
          this.grid[idx] = cost;
        }
      }
    }
  }

  /**
   * Rapidly clears free space along a laser beam ray in the local window using Bresenham marching.
   */
  rayTraceClear(originX: number, originZ: number, hitX: number, hitZ: number) {
    const oCell = this.worldToGrid(originX, originZ);
    const hCell = this.worldToGrid(hitX, hitZ);
    if (!oCell) return;

    let x0 = oCell[0];
    let y0 = oCell[1];
    const x1 = hCell ? hCell[0] : Math.max(0, Math.min(this.cellsPerAxis - 1, x0 + Math.sign(hitX - originX) * 20));
    const y1 = hCell ? hCell[1] : Math.max(0, Math.min(this.cellsPerAxis - 1, y0 + Math.sign(hitZ - originZ) * 20));

    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    // Ray march until just before hit cell
    while (!(x0 === x1 && y0 === y1)) {
      const idx = this.getIndex(x0, y0);
      if (this.grid[idx] < COSTMAP_INSCRIBED) {
        this.grid[idx] = COSTMAP_FREE;
      }
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }
  }
}
