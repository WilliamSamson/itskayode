/**
 * SONARIS Theta* Any-Angle Global Planner (Nav2 Global Planner Pattern)
 * Calculates the Euclidean shortest collision-free path across the Global Costmap
 * using line-of-sight shortcutting (string-pulling) to eliminate grid-staircase artifacts.
 */

import { LayeredCostmap } from "../costmap/layered-costmap";
import { type Pose2D } from "../types";

export interface PathPlanResult {
  success: boolean;
  waypoints: [number, number][];
  totalDistanceM: number;
}

export class ThetaStarGlobalPlanner {
  private costmap: LayeredCostmap;

  constructor(costmap: LayeredCostmap) {
    this.costmap = costmap;
  }

  setCostmap(costmap: LayeredCostmap) {
    this.costmap = costmap;
  }

  /**
   * Tests whether a straight line between two world points is collision-free on the costmap.
   */
  isLineClear(x1: number, z1: number, x2: number, z2: number): boolean {
    const dist = Math.hypot(x2 - x1, z2 - z1);
    if (dist < 1e-4) return true;

    const stepSize = this.costmap.resolutionM * 0.5;
    const numSteps = Math.max(1, Math.ceil(dist / stepSize));
    const dx = (x2 - x1) / numSteps;
    const dz = (z2 - z1) / numSteps;

    for (let i = 0; i <= numSteps; i++) {
      const cx = x1 + i * dx;
      const cz = z1 + i * dz;
      if (this.costmap.isLethal(cx, cz)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Plans any-angle path from start to goal.
   */
  plan(start: Pose2D | [number, number], goal: [number, number]): PathPlanResult {
    const sx = Array.isArray(start) ? start[0] : start.x;
    const sz = Array.isArray(start) ? start[1] : start.z;
    const [gx, gz] = goal;

    // 1. Direct line-of-sight shortcut
    if (this.isLineClear(sx, sz, gx, gz)) {
      const totalDist = Math.hypot(gx - sx, gz - sz);
      return {
        success: true,
        waypoints: [[sx, sz], [gx, gz]],
        totalDistanceM: Number(totalDist.toFixed(3))
      };
    }

    const startCell = this.costmap.worldToGrid(sx, sz);
    const goalCell = this.costmap.worldToGrid(gx, gz);

    if (!startCell || !goalCell) {
      return { success: false, waypoints: [], totalDistanceM: 0 };
    }

    // A* graph search over costmap grid with 8-neighborhood
    const cols = this.costmap.cols;
    const rows = this.costmap.rows;
    const startIdx = this.costmap.getIndex(startCell[0], startCell[1]);
    const goalIdx = this.costmap.getIndex(goalCell[0], goalCell[1]);

    const gScores = new Float32Array(cols * rows).fill(Infinity);
    const parents = new Int32Array(cols * rows).fill(-1);
    const closed = new Uint8Array(cols * rows);

    gScores[startIdx] = 0;

    // Simple priority list (coordinate buckets)
    interface Node {
      idx: number;
      f: number;
    }
    const openSet: Node[] = [{ idx: startIdx, f: Math.hypot(gx - sx, gz - sz) }];

    const dirs = [
      [1, 0, 1.0], [-1, 0, 1.0], [0, 1, 1.0], [0, -1, 1.0],
      [1, 1, 1.414], [-1, 1, 1.414], [1, -1, 1.414], [-1, -1, 1.414]
    ];

    let found = false;

    while (openSet.length > 0) {
      // Extract minimum f-score node
      let bestIdx = 0;
      for (let i = 1; i < openSet.length; i++) {
        if (openSet[i].f < openSet[bestIdx].f) bestIdx = i;
      }
      const current = openSet.splice(bestIdx, 1)[0];
      const curIdx = current.idx;

      if (curIdx === goalIdx) {
        found = true;
        break;
      }

      closed[curIdx] = 1;
      const c = curIdx % cols;
      const r = Math.floor(curIdx / cols);

      for (let d = 0; d < dirs.length; d++) {
        const nc = c + dirs[d][0];
        const nr = r + dirs[d][1];
        if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;

        const nIdx = nr * cols + nc;
        if (closed[nIdx] === 1) continue;

        const cellCost = this.costmap.masterGrid[nIdx];
        if (cellCost >= 253) continue; // Inscribed or lethal

        const [nx, nz] = this.costmap.gridToWorld(nc, nr);

        // Theta* Line-of-Sight Check to parent
        const parentIdx = parents[curIdx];
        let tentativeG: number;
        let effectiveParent = curIdx;

        if (parentIdx !== -1) {
          const pc = parentIdx % cols;
          const pr = Math.floor(parentIdx / cols);
          const [px, pz] = this.costmap.gridToWorld(pc, pr);
          if (this.isLineClear(px, pz, nx, nz)) {
            tentativeG = gScores[parentIdx] + Math.hypot(nx - px, nz - pz) + (cellCost / 254) * 0.5;
            effectiveParent = parentIdx;
          } else {
            tentativeG = gScores[curIdx] + dirs[d][2] * this.costmap.resolutionM + (cellCost / 254) * 0.5;
          }
        } else {
          tentativeG = gScores[curIdx] + dirs[d][2] * this.costmap.resolutionM + (cellCost / 254) * 0.5;
        }

        if (tentativeG < gScores[nIdx]) {
          parents[nIdx] = effectiveParent;
          gScores[nIdx] = tentativeG;
          const h = Math.hypot(gx - nx, gz - nz);
          const f = tentativeG + h;

          const existing = openSet.find((item) => item.idx === nIdx);
          if (!existing) {
            openSet.push({ idx: nIdx, f });
          } else if (f < existing.f) {
            existing.f = f;
          }
        }
      }
    }

    if (!found) {
      return { success: false, waypoints: [], totalDistanceM: 0 };
    }

    // Reconstruct raw path
    const rawWaypoints: [number, number][] = [];
    let curr: number = goalIdx;
    while (curr !== -1) {
      const c = curr % cols;
      const r = Math.floor(curr / cols);
      rawWaypoints.push(this.costmap.gridToWorld(c, r));
      curr = parents[curr];
    }
    rawWaypoints.reverse();

    // Replace endpoints with exact start/goal
    rawWaypoints[0] = [sx, sz];
    rawWaypoints[rawWaypoints.length - 1] = [gx, gz];

    // Greedy string-pulling smoothing pass
    const smoothed: [number, number][] = [rawWaypoints[0]];
    let anchorIdx = 0;
    while (anchorIdx < rawWaypoints.length - 1) {
      let furthest = anchorIdx + 1;
      for (let next = rawWaypoints.length - 1; next > anchorIdx + 1; next--) {
        if (this.isLineClear(
          rawWaypoints[anchorIdx][0], rawWaypoints[anchorIdx][1],
          rawWaypoints[next][0], rawWaypoints[next][1]
        )) {
          furthest = next;
          break;
        }
      }
      smoothed.push(rawWaypoints[furthest]);
      anchorIdx = furthest;
    }

    let totalDist = 0;
    for (let i = 0; i < smoothed.length - 1; i++) {
      totalDist += Math.hypot(smoothed[i + 1][0] - smoothed[i][0], smoothed[i + 1][1] - smoothed[i][1]);
    }

    return {
      success: true,
      waypoints: smoothed,
      totalDistanceM: Number(totalDist.toFixed(3))
    };
  }
}
