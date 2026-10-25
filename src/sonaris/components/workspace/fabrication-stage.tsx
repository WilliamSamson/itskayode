"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { assemblyParts } from "@/sonaris/lib/sonaris-assembly";
import { createAssemblyModel, createStudioEnvMap } from "./assembly-models";
import type {
  AdhesionTypeId,
  ChassisPartId,
  FabricationMaterialId,
  InfillPatternId,
  PrinterProfileId,
  SupportStyleId
} from "./fabrication-models";
import {
  CHASSIS_COMPONENTS,
  FABRICATION_MATERIALS,
  PRINTER_PROFILES
} from "./fabrication-models";

export interface FabricationStageProps {
  selectedPartId: ChassisPartId;
  selectedMaterialId: FabricationMaterialId;
  isRotated90: boolean;
  sliceHeightMm?: number;
  explodeAmount?: number; // 0 to 1 for part separation
  showBuildCage?: boolean;
  infillPattern?: InfillPatternId;
  supportStyle?: SupportStyleId;
  adhesionType?: AdhesionTypeId;
  infillPercent?: number;
  wallLoops?: number;
  printerProfileId?: PrinterProfileId;
  cameraView?: "isometric" | "top" | "front" | "side";
}

function disposeObject(obj: THREE.Object3D) {
  if (
    obj instanceof THREE.Mesh ||
    obj instanceof THREE.Line ||
    obj instanceof THREE.LineSegments
  ) {
    if (obj.geometry) obj.geometry.dispose();
    if (Array.isArray(obj.material)) {
      obj.material.forEach((m) => m.dispose());
    } else if (obj.material) {
      obj.material.dispose();
    }
  }
}

/**
 * Trims a Three.js Object3D in local X space (`keepSide === "rear"` keeps `x <= cutX`,
 * `keepSide === "front"` keeps `x >= cutX`) by filtering vertices/triangles and recomputing
 * bounding boxes. This guarantees `seatOnBuildPlate` measures only the kept half's true bottom!
 */
function trimModelByLocalX(
  root: THREE.Object3D,
  cutX: number,
  keepSide: "rear" | "front"
) {
  for (const child of [...root.children]) {
    if (child instanceof THREE.LineSegments || child instanceof THREE.Line) {
      root.remove(child);
      disposeObject(child);
      continue;
    }
    if (child instanceof THREE.Mesh) {
      const geo = child.geometry.index
        ? child.geometry.toNonIndexed()
        : child.geometry.clone();
      const pos = geo.getAttribute("position");
      const norm = geo.getAttribute("normal");
      if (!pos) continue;

      const keptPos: number[] = [];
      const keptNorm: number[] = [];
      for (let i = 0; i < pos.count; i += 3) {
        const x0 = pos.getX(i);
        const x1 = pos.getX(i + 1);
        const x2 = pos.getX(i + 2);
        const cx = (x0 + x1 + x2) / 3;
        const keep = keepSide === "rear" ? cx <= cutX : cx >= cutX;
        if (keep) {
          keptPos.push(
            x0,
            pos.getY(i),
            pos.getZ(i),
            x1,
            pos.getY(i + 1),
            pos.getZ(i + 1),
            x2,
            pos.getY(i + 2),
            pos.getZ(i + 2)
          );
          if (norm) {
            keptNorm.push(
              norm.getX(i),
              norm.getY(i),
              norm.getZ(i),
              norm.getX(i + 1),
              norm.getY(i + 1),
              norm.getZ(i + 1),
              norm.getX(i + 2),
              norm.getY(i + 2),
              norm.getZ(i + 2)
            );
          }
        }
      }

      child.geometry.dispose();
      if (keptPos.length === 0) {
        root.remove(child);
        continue;
      }

      const trimmedGeo = new THREE.BufferGeometry();
      trimmedGeo.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(keptPos, 3)
      );
      if (keptNorm.length === keptPos.length) {
        trimmedGeo.setAttribute(
          "normal",
          new THREE.Float32BufferAttribute(keptNorm, 3)
        );
      } else {
        trimmedGeo.computeVertexNormals();
      }
      trimmedGeo.computeBoundingBox();
      trimmedGeo.computeBoundingSphere();
      child.geometry = trimmedGeo;
    }
  }
}
function seatOnBuildPlate(
  obj: THREE.Object3D,
  targetMinY = 0,
  centerXZ?: [number, number]
): THREE.Box3 {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  if (!box.isEmpty()) {
    const dy = targetMinY - box.min.y;
    obj.position.y += dy;
    if (centerXZ) {
      const center = new THREE.Vector3();
      box.getCenter(center);
      obj.position.x += centerXZ[0] - center.x;
      obj.position.z += centerXZ[1] - center.z;
    }
    obj.updateMatrixWorld(true);
    box.setFromObject(obj);
  }
  return box;
}

/**
 * Resolves any X/Z bounding-box overlaps between sibling parts on the build plate
 * while ensuring a minimum `clearanceMm` gap between every pair of parts.
 */
function resolvePlanarCollisions(
  items: THREE.Object3D[],
  clearanceMm = 10
): THREE.Box3[] {
  const boxes = items.map((obj) => {
    obj.updateMatrixWorld(true);
    return new THREE.Box3().setFromObject(obj);
  });

  for (let pass = 0; pass < 6; pass++) {
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        if (a.isEmpty() || b.isEmpty()) continue;

        const overlapX =
          Math.min(a.max.x, b.max.x) - Math.max(a.min.x, b.min.x) + clearanceMm;
        const overlapZ =
          Math.min(a.max.z, b.max.z) - Math.max(a.min.z, b.min.z) + clearanceMm;

        if (overlapX > 0 && overlapZ > 0) {
          const ca = new THREE.Vector3();
          const cb = new THREE.Vector3();
          a.getCenter(ca);
          b.getCenter(cb);

          if (overlapX < overlapZ) {
            const sign = cb.x >= ca.x ? 1 : -1;
            const shift = overlapX * 0.52;
            items[i].position.x -= sign * shift;
            items[j].position.x += sign * shift;
          } else {
            const sign = cb.z >= ca.z ? 1 : -1;
            const shift = overlapZ * 0.52;
            items[i].position.z -= sign * shift;
            items[j].position.z += sign * shift;
          }
          items[i].updateMatrixWorld(true);
          items[j].updateMatrixWorld(true);
          a.setFromObject(items[i]);
          b.setFromObject(items[j]);
        }
      }
    }
  }
  return boxes;
}

interface OverhangZone {
  x: number;
  z: number;
  width: number;
  depth: number;
  topY: number;
}

/**
 * Generates authentic 3D Slicer Support Geometry (`tree-organic`, `snug-grid`, `normal-accordion`, `soluble-interface`)
 * rising from `y = 0` on the PEI build plate up to `zone.topY` so zero overhangs float in mid-air.
 */
function buildSupportStructureGeometry(
  zones: OverhangZone[],
  style: SupportStyleId,
  clipPlanes: THREE.Plane[]
): THREE.Group {
  const group = new THREE.Group();
  if (style === "none" || zones.length === 0) return group;

  const supportColor =
    style === "soluble-interface"
      ? 0xd49b27 // Amber PVA soluble support
      : style === "tree-organic"
        ? 0x2e856e // Teal-emerald organic tree support
        : 0x3a6ea5; // Slicer blue grid/accordion support

  const supportMat = new THREE.MeshStandardMaterial({
    color: supportColor,
    roughness: 0.65,
    metalness: 0.1,
    transparent: true,
    opacity: 0.68,
    clippingPlanes: clipPlanes,
    side: THREE.DoubleSide
  });

  const supportLineMat = new THREE.LineBasicMaterial({
    color: supportColor,
    transparent: true,
    opacity: 0.85,
    clippingPlanes: clipPlanes
  });

  for (const zone of zones) {
    const h = Math.max(4, zone.topY);
    if (style === "tree-organic") {
      // Organic branching trunks rising from bed y = 0 and forking to overhang contact points
      const colsX = Math.max(1, Math.round(zone.width / 26));
      const colsZ = Math.max(1, Math.round(zone.depth / 26));
      for (let ix = 0; ix < colsX; ix++) {
        for (let iz = 0; iz < colsZ; iz++) {
          const tx =
            zone.x +
            (colsX === 1 ? 0 : ((ix / (colsX - 1)) - 0.5) * zone.width * 0.72);
          const tz =
            zone.z +
            (colsZ === 1 ? 0 : ((iz / (colsZ - 1)) - 0.5) * zone.depth * 0.72);
          // Offset trunk base slightly outward so it looks like an organic slicer tree curving into the overhang
          const baseOffsetX = Math.sign(tx || 1) * Math.min(10, h * 0.16);
          const baseOffsetZ = Math.sign(tz || 1) * Math.min(8, h * 0.12);

          const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(tx + baseOffsetX, 0.2, tz + baseOffsetZ),
            new THREE.Vector3(
              tx + baseOffsetX * 0.55,
              h * 0.48,
              tz + baseOffsetZ * 0.55
            ),
            new THREE.Vector3(tx, h - 0.8, tz)
          ]);
          const tubeGeo = new THREE.TubeGeometry(curve, 14, 2.2, 8, false);
          const mesh = new THREE.Mesh(tubeGeo, supportMat);
          group.add(mesh);

          // Base brim pad at y = 0.2
          const footPad = new THREE.Mesh(
            new THREE.CylinderGeometry(5.2, 6.2, 0.6, 12),
            supportMat
          );
          footPad.position.set(tx + baseOffsetX, 0.3, tz + baseOffsetZ);
          group.add(footPad);

          // Forked upper twigs reaching left/right of the main branch tip
          if (h > 14) {
            for (const forkSign of [-1, 1]) {
              const twigCurve = new THREE.CatmullRomCurve3([
                new THREE.Vector3(
                  tx + baseOffsetX * 0.4,
                  h * 0.55,
                  tz + baseOffsetZ * 0.4
                ),
                new THREE.Vector3(
                  tx + forkSign * 5.5,
                  h - 0.6,
                  tz - forkSign * 4.5
                )
              ]);
              group.add(
                new THREE.Mesh(
                  new THREE.TubeGeometry(twigCurve, 8, 1.25, 6, false),
                  supportMat
                )
              );
            }
          }
        }
      }
    } else if (style === "snug-grid" || style === "soluble-interface") {
      // Vertical rectilinear support columns with dense top interface cap
      const pitch = 11;
      const hx = zone.width / 2;
      const hz = zone.depth / 2;
      const verts: number[] = [];

      for (let x = -hx; x <= hx; x += pitch) {
        verts.push(
          zone.x + x,
          0.2,
          zone.z - hz,
          zone.x + x,
          h - 0.6,
          zone.z - hz,
          zone.x + x,
          0.2,
          zone.z + hz,
          zone.x + x,
          h - 0.6,
          zone.z + hz
        );
      }
      for (let y = 4; y < h; y += 8) {
        verts.push(
          zone.x - hx,
          y,
          zone.z - hz,
          zone.x + hx,
          y,
          zone.z - hz,
          zone.x + hx,
          y,
          zone.z - hz,
          zone.x + hx,
          y,
          zone.z + hz,
          zone.x + hx,
          y,
          zone.z + hz,
          zone.x - hx,
          y,
          zone.z + hz,
          zone.x - hx,
          y,
          zone.z + hz,
          zone.x - hx,
          y,
          zone.z - hz
        );
      }

      const colBox = new THREE.Mesh(
        new THREE.BoxGeometry(zone.width, h - 0.4, zone.depth),
        supportMat
      );
      colBox.position.set(zone.x, h / 2, zone.z);
      group.add(colBox);

      if (verts.length > 0) {
        const lGeo = new THREE.BufferGeometry();
        lGeo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
        group.add(new THREE.LineSegments(lGeo, supportLineMat));
      }

      if (style === "soluble-interface") {
        // High-contrast dense PVA interface layer right under the overhang
        const cap = new THREE.Mesh(
          new THREE.BoxGeometry(zone.width + 1, 1.6, zone.depth + 1),
          new THREE.MeshBasicMaterial({
            color: 0xf2c200,
            clippingPlanes: clipPlanes
          })
        );
        cap.position.set(zone.x, h - 0.8, zone.z);
        group.add(cap);
      }
    } else if (style === "normal-accordion") {
      // Continuous zig-zag accordion curtain walls from y = 0 to zone.topY
      const stepX = 7;
      const hx = zone.width / 2;
      const hz = zone.depth / 2;
      const pts: THREE.Vector3[] = [];
      let side = 1;
      for (let x = -hx; x <= hx; x += stepX) {
        pts.push(new THREE.Vector3(zone.x + x, 0.2, zone.z + side * hz));
        pts.push(new THREE.Vector3(zone.x + x, h - 0.5, zone.z + side * hz));
        side *= -1;
      }
      const accGeo = new THREE.BufferGeometry().setFromPoints(pts);
      group.add(new THREE.Line(accGeo, supportLineMat));

      const coreCurtain = new THREE.Mesh(
        new THREE.BoxGeometry(zone.width * 0.94, h - 0.6, zone.depth * 0.82),
        supportMat
      );
      coreCurtain.position.set(zone.x, h / 2, zone.z);
      group.add(coreCurtain);
    }
  }

  return group;
}

/**
 * Renders 2D bed-adhesion outlines (`skirt`, `brim-8mm`, `raft`) and crisp non-overlapping
 * bounding-box alignment guides around each nested piece on `y = 0.18 mm`.
 */
function buildBedArrangementOutlines(
  partBoxes: THREE.Box3[],
  adhesionType: AdhesionTypeId,
  exceedsBed: boolean
): THREE.Group {
  const group = new THREE.Group();

  const guideMat = new THREE.LineBasicMaterial({
    color: exceedsBed ? 0x991f1f : 0x1da67a,
    transparent: true,
    opacity: 0.72
  });

  const brimMat = new THREE.LineBasicMaterial({
    color: 0xc84b31,
    transparent: true,
    opacity: 0.65
  });

  const raftMat = new THREE.MeshStandardMaterial({
    color: 0x3b424d,
    roughness: 0.8,
    metalness: 0.2
  });

  for (const box of partBoxes) {
    if (box.isEmpty()) continue;
    const minX = box.min.x;
    const maxX = box.max.x;
    const minZ = box.min.z;
    const maxZ = box.max.z;

    // 1. Tight part footprint boundary outline + corner alignment ticks
    const pad = 2.0;
    const rectPts = [
      new THREE.Vector3(minX - pad, 0.22, minZ - pad),
      new THREE.Vector3(maxX + pad, 0.22, minZ - pad),
      new THREE.Vector3(maxX + pad, 0.22, maxZ + pad),
      new THREE.Vector3(minX - pad, 0.22, maxZ + pad),
      new THREE.Vector3(minX - pad, 0.22, minZ - pad)
    ];
    group.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(rectPts),
        guideMat
      )
    );

    // 2. Adhesion loops (Brim, Skirt, or Raft)
    if (adhesionType === "brim-8mm") {
      for (const offset of [3.2, 4.8, 6.4, 8.0]) {
        const bPts = [
          new THREE.Vector3(minX - offset, 0.18, minZ - offset),
          new THREE.Vector3(maxX + offset, 0.18, minZ - offset),
          new THREE.Vector3(maxX + offset, 0.18, maxZ + offset),
          new THREE.Vector3(minX - offset, 0.18, maxZ + offset),
          new THREE.Vector3(minX - offset, 0.18, minZ - offset)
        ];
        group.add(
          new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(bPts),
            brimMat
          )
        );
      }
    } else if (adhesionType === "skirt") {
      for (const offset of [7.5, 9.0]) {
        const sPts = [
          new THREE.Vector3(minX - offset, 0.18, minZ - offset),
          new THREE.Vector3(maxX + offset, 0.18, minZ - offset),
          new THREE.Vector3(maxX + offset, 0.18, maxZ + offset),
          new THREE.Vector3(minX - offset, 0.18, maxZ + offset),
          new THREE.Vector3(minX - offset, 0.18, minZ - offset)
        ];
        group.add(
          new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(sPts),
            brimMat
          )
        );
      }
    } else if (adhesionType === "raft") {
      const rw = maxX - minX + 14;
      const rd = maxZ - minZ + 14;
      const cx = (minX + maxX) / 2;
      const cz = (minZ + maxZ) / 2;
      const raftMesh = new THREE.Mesh(
        new THREE.BoxGeometry(rw, 1.4, rd),
        raftMat
      );
      raftMesh.position.set(cx, 0.7, cz);
      raftMesh.receiveShadow = true;
      group.add(raftMesh);
    }
  }

  return group;
}

/**
 * Generates a 3D toolpath cross-section lattice on the active Z-slice plane
 * showing outer/inner perimeter wall loops, active extrusion nozzle head,
 * and the chosen infill pattern across each nested sub-part box intersected by `sliceY`.
 */
function buildSliceInfillOverlay(
  subBoxes: THREE.Box3[],
  fallbackBox: THREE.Box3,
  sliceY: number,
  pattern: InfillPatternId,
  infillPercent: number,
  wallLoops: number
): THREE.Group {
  const group = new THREE.Group();
  group.position.y = sliceY + 0.25;

  const activeBoxes =
    subBoxes.length > 0
      ? subBoxes.filter((b) => !b.isEmpty() && sliceY >= b.min.y - 0.5 && sliceY <= b.max.y + 1.0)
      : [fallbackBox];

  if (activeBoxes.length === 0 && !fallbackBox.isEmpty()) {
    activeBoxes.push(fallbackBox);
  }

  const wallMat = new THREE.LineBasicMaterial({
    color: 0xe05a36,
    transparent: true,
    opacity: 0.94
  });

  const infillMat = new THREE.LineBasicMaterial({
    color: 0x1da67a,
    transparent: true,
    opacity: 0.88
  });

  const loops = Math.max(2, Math.min(6, wallLoops));
  const pitch = Math.max(4.5, 21 - (infillPercent / 100) * 16.5);

  let nozzleAnchorBox = activeBoxes[0];

  for (const box of activeBoxes) {
    if (!box || box.isEmpty()) continue;
    nozzleAnchorBox = box;
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const halfX = Math.max(10, Math.min(148, size.x * 0.45));
    const halfZ = Math.max(10, Math.min(148, size.z * 0.45));
    const cx = center.x;
    const cz = center.z;
    const chamfer = Math.min(halfX, halfZ) * 0.18;

    // 1. Perimeter Wall Loops
    for (let i = 0; i < loops; i++) {
      const inset = i * 1.1;
      const hx = Math.max(4, halfX - inset);
      const hz = Math.max(4, halfZ - inset);
      const ch = Math.max(1.5, chamfer - inset * 0.5);
      const pts = [
        new THREE.Vector3(cx - hx + ch, 0, cz - hz),
        new THREE.Vector3(cx + hx - ch, 0, cz - hz),
        new THREE.Vector3(cx + hx, 0, cz - hz + ch),
        new THREE.Vector3(cx + hx, 0, cz + hz - ch),
        new THREE.Vector3(cx + hx - ch, 0, cz + hz),
        new THREE.Vector3(cx - hx + ch, 0, cz + hz),
        new THREE.Vector3(cx - hx, 0, cz + hz - ch),
        new THREE.Vector3(cx - hx, 0, cz - hz + ch),
        new THREE.Vector3(cx - hx + ch, 0, cz - hz)
      ];
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wallMat));
    }

    // 2. Internal Infill Toolpath Lattice
    const coreHx = Math.max(4, halfX - loops * 1.2 - 1);
    const coreHz = Math.max(4, halfZ - loops * 1.2 - 1);
    const infillVerts: number[] = [];
    const insideOctagon = (lx: number, lz: number) =>
      Math.abs(lx) <= coreHx &&
      Math.abs(lz) <= coreHz &&
      Math.abs(lx) + Math.abs(lz) <= coreHx + coreHz - chamfer * 0.75;

    if (pattern === "gyroid") {
      const phase = sliceY * 0.22;
      const amp = pitch * 0.34;
      const freq = (Math.PI * 2) / (pitch * 2.1);

      for (let z = -coreHz; z <= coreHz; z += pitch) {
        let prev: [number, number] | null = null;
        for (let x = -coreHx; x <= coreHx; x += 2.5) {
          const wz = z + Math.sin(x * freq + phase) * amp;
          if (insideOctagon(x, wz)) {
            if (prev) {
              infillVerts.push(cx + prev[0], 0, cz + prev[1], cx + x, 0, cz + wz);
            }
            prev = [x, wz];
          } else {
            prev = null;
          }
        }
      }
      for (let x = -coreHx; x <= coreHx; x += pitch) {
        let prev: [number, number] | null = null;
        for (let z = -coreHz; z <= coreHz; z += 2.5) {
          const wx = x + Math.cos(z * freq - phase) * amp;
          if (insideOctagon(wx, z)) {
            if (prev) {
              infillVerts.push(cx + prev[0], 0, cz + prev[1], cx + wx, 0, cz + z);
            }
            prev = [wx, z];
          } else {
            prev = null;
          }
        }
      }
    } else if (pattern === "honeycomb") {
      const r = pitch * 0.62;
      const dx = r * 1.5;
      const dz = r * Math.sqrt(3);
      let col = 0;
      for (let x = -coreHx; x <= coreHx; x += dx) {
        const zShift = col % 2 === 0 ? 0 : dz * 0.5;
        for (let z = -coreHz + zShift; z <= coreHz; z += dz) {
          if (!insideOctagon(x, z)) continue;
          for (let a = 0; a < 6; a++) {
            const a0 = (a * Math.PI) / 3;
            const a1 = ((a + 1) * Math.PI) / 3;
            const x0 = x + Math.cos(a0) * r * 0.58;
            const z0 = z + Math.sin(a0) * r * 0.58;
            const x1 = x + Math.cos(a1) * r * 0.58;
            const z1 = z + Math.sin(a1) * r * 0.58;
            if (insideOctagon(x0, z0) && insideOctagon(x1, z1)) {
              infillVerts.push(cx + x0, 0, cz + z0, cx + x1, 0, cz + z1);
            }
          }
        }
        col++;
      }
    } else if (pattern === "adaptive-cubic") {
      const steps: number[] = [];
      let pos = -coreHx;
      while (pos <= coreHx) {
        steps.push(pos);
        const normDist = 1 - Math.min(1, Math.abs(pos) / Math.max(1, coreHx));
        pos += pitch * (0.55 + normDist * 0.95);
      }
      for (const x of steps) {
        infillVerts.push(cx + x, 0, cz - coreHz * 0.92, cx + x, 0, cz + coreHz * 0.92);
      }
      for (const z of steps) {
        if (Math.abs(z) <= coreHz) {
          infillVerts.push(cx - coreHx * 0.92, 0, cz + z, cx + coreHx * 0.92, 0, cz + z);
        }
      }
    } else {
      const zShift = pattern === "cubic" ? (sliceY % pitch) - pitch * 0.5 : 0;
      const span = coreHx + coreHz;
      for (let d = -span; d <= span; d += pitch) {
        const ptsA: [number, number][] = [];
        const ptsB: [number, number][] = [];
        for (let x = -coreHx; x <= coreHx; x += 3) {
          const z1 = x + d + zShift;
          if (insideOctagon(x, z1)) ptsA.push([x, z1]);
          const z2 = -x + d - zShift;
          if (insideOctagon(x, z2)) ptsB.push([x, z2]);
        }
        if (ptsA.length >= 2) {
          const first = ptsA[0];
          const last = ptsA[ptsA.length - 1];
          infillVerts.push(cx + first[0], 0, cz + first[1], cx + last[0], 0, cz + last[1]);
        }
        if (ptsB.length >= 2) {
          const first = ptsB[0];
          const last = ptsB[ptsB.length - 1];
          infillVerts.push(cx + first[0], 0, cz + first[1], cx + last[0], 0, cz + last[1]);
        }
      }
    }

    if (infillVerts.length > 0) {
      const infillGeo = new THREE.BufferGeometry();
      infillGeo.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(infillVerts, 3)
      );
      group.add(new THREE.LineSegments(infillGeo, infillMat));
    }
  }

  // 3. Animated Extruder Nozzle Tip indicator tracing the active slice layer
  if (nozzleAnchorBox && !nozzleAnchorBox.isEmpty()) {
    const nc = new THREE.Vector3();
    const ns = new THREE.Vector3();
    nozzleAnchorBox.getCenter(nc);
    nozzleAnchorBox.getSize(ns);

    const headAngle = sliceY * 0.45;
    const headX = nc.x + Math.cos(headAngle) * (ns.x * 0.25);
    const headZ = nc.z + Math.sin(headAngle * 1.3) * (ns.z * 0.25);

    const nozzleCone = new THREE.Mesh(
      new THREE.ConeGeometry(3.2, 7.5, 16),
      new THREE.MeshStandardMaterial({
        color: 0xd49b27,
        roughness: 0.3,
        metalness: 0.9
      })
    );
    nozzleCone.rotation.x = Math.PI;
    nozzleCone.position.set(headX, 4.0, headZ);
    group.add(nozzleCone);

    const heatBlock = new THREE.Mesh(
      new THREE.BoxGeometry(9, 6, 9),
      new THREE.MeshStandardMaterial({
        color: 0x991f1f,
        roughness: 0.4,
        metalness: 0.6
      })
    );
    heatBlock.position.set(headX, 10.5, headZ);
    group.add(heatBlock);
  }

  return group;
}

export function FabricationStage({
  selectedPartId,
  selectedMaterialId,
  isRotated90,
  sliceHeightMm = 350,
  explodeAmount = 0,
  showBuildCage = true,
  infillPattern = "gyroid",
  supportStyle = "tree-organic",
  adhesionType = "brim-8mm",
  infillPercent = 25,
  wallLoops = 4,
  printerProfileId = "voron-300",
  cameraView = "isometric"
}: FabricationStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    partGroup: THREE.Group;
    bedGroup: THREE.Group;
    cageGroup: THREE.Group;
    sliceGroup: THREE.Group;
    clipPlane: THREE.Plane;
    partBoundsBox: THREE.Box3;
    subPartBoxes: THREE.Box3[];
    targetSliceY: number;
    currentSliceY: number;
    maxBedZ: number;
    partTopY: number;
    infillPattern: InfillPatternId;
    infillPercent: number;
    wallLoops: number;
    rebuildSliceOverlay: (y: number) => void;
    wake: () => void;
  } | null>(null);

  const [webglError, setWebglError] = useState<string | null>(null);

  // Initialize Three.js Studio Build Plate & Slicer Viewport
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance"
      });
    } catch {
      setWebglError("WebGL is unavailable on this device.");
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0xe5e1d8, 1);
    renderer.localClippingEnabled = true;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.touchAction = "none";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    renderer.domElement.setAttribute(
      "aria-label",
      "Interactive 3D Slicer & Fabrication Bed Viewport"
    );
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const envMap = createStudioEnvMap(renderer);
    if (envMap) {
      scene.environment = envMap;
    }

    const camera = new THREE.PerspectiveCamera(
      32,
      container.clientWidth / Math.max(1, container.clientHeight),
      1,
      3500
    );
    camera.position.set(370, 340, 430);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.85;
    controls.minDistance = 130;
    controls.maxDistance = 1350;
    controls.maxPolarAngle = Math.PI * 0.485;
    controls.target.set(0, 48, 0);

    const hemi = new THREE.HemisphereLight(0xffffff, 0xc8c2b4, 0.85);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfffcf5, 2.1);
    keyLight.position.set(260, 560, 320);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.bias = -0.0005;
    Object.assign(keyLight.shadow.camera, {
      left: -260,
      right: 260,
      top: 260,
      bottom: -260,
      near: 100,
      far: 1200
    });
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xdbe4f3, 0.95);
    fillLight.position.set(-320, 280, -260);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffe7c8, 0.55);
    rimLight.position.set(0, 220, -420);
    scene.add(rimLight);

    const studioFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(1400, 1400),
      new THREE.ShadowMaterial({ opacity: 0.16 })
    );
    studioFloor.rotation.x = -Math.PI / 2;
    studioFloor.position.y = -4.5;
    studioFloor.receiveShadow = true;
    scene.add(studioFloor);

    const bedGroup = new THREE.Group();
    scene.add(bedGroup);

    const cageGroup = new THREE.Group();
    scene.add(cageGroup);

    const sliceGroup = new THREE.Group();
    scene.add(sliceGroup);

    const partGroup = new THREE.Group();
    scene.add(partGroup);

    const clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 350);
    const partBoundsBox = new THREE.Box3();

    let frameId = 0;
    let inAnimate = false;
    let disposed = false;

    const rebuildSliceOverlay = (y: number) => {
      const rt = runtimeRef.current;
      if (!rt) return;
      rt.sliceGroup.traverse((o) => disposeObject(o));
      rt.sliceGroup.clear();

      const active = y < Math.min(rt.maxBedZ - 1.0, rt.partTopY + 6);
      if (!active) {
        rt.clipPlane.constant = rt.maxBedZ + 200;
        return;
      }

      rt.clipPlane.constant = y;
      const printer =
        PRINTER_PROFILES.find((p) => p.id === printerProfileId) ||
        PRINTER_PROFILES[0];
      const [bedX, bedZ] = printer.bedMm;

      const slicePlaneMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(bedX + 12, bedZ + 12),
        new THREE.MeshBasicMaterial({
          color: 0x1da67a,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.11,
          depthWrite: false
        })
      );
      slicePlaneMesh.rotation.x = -Math.PI / 2;
      slicePlaneMesh.position.y = y;
      rt.sliceGroup.add(slicePlaneMesh);

      const borderGeo = new THREE.EdgesGeometry(
        new THREE.PlaneGeometry(bedX + 12, bedZ + 12)
      );
      const borderLines = new THREE.LineSegments(
        borderGeo,
        new THREE.LineBasicMaterial({
          color: 0x1da67a,
          transparent: true,
          opacity: 0.65
        })
      );
      borderLines.rotation.x = -Math.PI / 2;
      borderLines.position.y = y + 0.1;
      rt.sliceGroup.add(borderLines);

      if (y <= rt.partTopY + 3) {
        const infillLattice = buildSliceInfillOverlay(
          rt.subPartBoxes,
          rt.partBoundsBox,
          y,
          rt.infillPattern,
          rt.infillPercent,
          rt.wallLoops
        );
        rt.sliceGroup.add(infillLattice);
      }
    };

    const animate = () => {
      if (disposed) {
        frameId = 0;
        return;
      }
      inAnimate = true;
      const coasting = controls.update();

      const rt = runtimeRef.current;
      let slicingMoving = false;
      if (rt) {
        const diff = rt.targetSliceY - rt.currentSliceY;
        if (Math.abs(diff) > 0.1) {
          rt.currentSliceY += diff * 0.28;
          rebuildSliceOverlay(rt.currentSliceY);
          slicingMoving = true;
        } else if (Math.abs(diff) > 0.001) {
          rt.currentSliceY = rt.targetSliceY;
          rebuildSliceOverlay(rt.currentSliceY);
        }
      }

      renderer.render(scene, camera);
      inAnimate = false;
      frameId =
        coasting || slicingMoving ? requestAnimationFrame(animate) : 0;
    };

    const wake = () => {
      if (!frameId && !inAnimate && !disposed) {
        frameId = requestAnimationFrame(animate);
      }
    };

    controls.addEventListener("change", wake);

    const resizeObserver = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      wake();
    });
    resizeObserver.observe(container);

    runtimeRef.current = {
      renderer,
      scene,
      camera,
      controls,
      partGroup,
      bedGroup,
      cageGroup,
      sliceGroup,
      clipPlane,
      partBoundsBox,
      subPartBoxes: [],
      targetSliceY: 350,
      currentSliceY: 350,
      maxBedZ: 350,
      partTopY: 100,
      infillPattern: "gyroid",
      infillPercent: 25,
      wallLoops: 4,
      rebuildSliceOverlay,
      wake
    };

    wake();

    return () => {
      disposed = true;
      if (frameId) cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      controls.removeEventListener("change", wake);
      controls.dispose();
      scene.traverse((obj) => disposeObject(obj));
      renderer.dispose();
      renderer.domElement.remove();
      runtimeRef.current = null;
    };
  }, []);

  // Camera preset switching
  useEffect(() => {
    const rt = runtimeRef.current;
    if (!rt) return;
    const { camera, controls, wake } = rt;

    if (cameraView === "top") {
      camera.position.set(0, 580, 0.1);
      controls.target.set(0, 15, 0);
    } else if (cameraView === "front") {
      camera.position.set(0, 110, 510);
      controls.target.set(0, 48, 0);
    } else if (cameraView === "side") {
      camera.position.set(510, 110, 0);
      controls.target.set(0, 48, 0);
    } else {
      camera.position.set(370, 340, 430);
      controls.target.set(0, 48, 0);
    }
    controls.update();
    wake();
  }, [cameraView]);

  // Rebuild Printer Bed, Support Structures & Non-Overlapping Nested Components
  useEffect(() => {
    const rt = runtimeRef.current;
    if (!rt) return;

    const { partGroup, bedGroup, cageGroup, clipPlane, wake } = rt;

    partGroup.traverse((o) => disposeObject(o));
    partGroup.clear();
    bedGroup.traverse((o) => disposeObject(o));
    bedGroup.clear();
    cageGroup.traverse((o) => disposeObject(o));
    cageGroup.clear();

    const part =
      CHASSIS_COMPONENTS.find((c) => c.id === selectedPartId) ||
      CHASSIS_COMPONENTS[0];
    const mat =
      FABRICATION_MATERIALS.find((m) => m.id === selectedMaterialId) ||
      FABRICATION_MATERIALS[0];
    const printer =
      PRINTER_PROFILES.find((p) => p.id === printerProfileId) ||
      PRINTER_PROFILES[0];

    const [bedX, bedZ, bedHeightZ] = printer.bedMm;
    rt.maxBedZ = bedHeightZ;

    // =============================================================
    // 1. REALISTIC SPRING-STEEL PEI BUILD PLATE / CNC WORKTABLE
    // =============================================================
    const plateSubBase = new THREE.Mesh(
      new THREE.BoxGeometry(bedX + 12, 4, bedZ + 12),
      new THREE.MeshStandardMaterial({
        color: 0x383b42,
        roughness: 0.5,
        metalness: 0.75
      })
    );
    plateSubBase.position.y = -2.2;
    plateSubBase.receiveShadow = true;
    bedGroup.add(plateSubBase);

    const peiPlate = new THREE.Mesh(
      new THREE.BoxGeometry(bedX, 1.2, bedZ),
      new THREE.MeshStandardMaterial({
        color: printer.id === "cnc-6040" ? 0x454a52 : 0x1e2026,
        roughness: 0.78,
        metalness: 0.35
      })
    );
    peiPlate.position.y = -0.6;
    peiPlate.receiveShadow = true;
    bedGroup.add(peiPlate);

    for (const side of [-1, 1]) {
      const tab = new THREE.Mesh(
        new THREE.BoxGeometry(28, 1.2, 10),
        new THREE.MeshStandardMaterial({
          color: 0x1e2026,
          roughness: 0.75,
          metalness: 0.4
        })
      );
      tab.position.set(side * (bedX * 0.34), -0.6, bedZ * 0.5 + 4);
      bedGroup.add(tab);
    }

    const gridVerts: number[] = [];
    const majorVerts: number[] = [];
    const hx = bedX / 2;
    const hz = bedZ / 2;
    for (let x = -hx; x <= hx; x += 10) {
      const target = Math.abs(x) % 50 === 0 ? majorVerts : gridVerts;
      target.push(x, 0.12, -hz, x, 0.12, hz);
    }
    for (let z = -hz; z <= hz; z += 10) {
      const target = Math.abs(z) % 50 === 0 ? majorVerts : gridVerts;
      target.push(-hx, 0.12, z, hx, 0.12, z);
    }

    if (gridVerts.length > 0) {
      const fineGeo = new THREE.BufferGeometry();
      fineGeo.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(gridVerts, 3)
      );
      bedGroup.add(
        new THREE.LineSegments(
          fineGeo,
          new THREE.LineBasicMaterial({
            color: 0x343842,
            transparent: true,
            opacity: 0.75
          })
        )
      );
    }

    if (majorVerts.length > 0) {
      const majorGeo = new THREE.BufferGeometry();
      majorGeo.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(majorVerts, 3)
      );
      bedGroup.add(
        new THREE.LineSegments(
          majorGeo,
          new THREE.LineBasicMaterial({
            color: 0x626875,
            transparent: true,
            opacity: 0.9
          })
        )
      );
    }

    const purgeLine = new THREE.Mesh(
      new THREE.BoxGeometry(bedX * 0.55, 0.4, 1.4),
      new THREE.MeshBasicMaterial({ color: 0xc84b31 })
    );
    purgeLine.position.set(-bedX * 0.12, 0.2, hz - 6);
    bedGroup.add(purgeLine);

    const refOutlinePts = [
      new THREE.Vector3(-150, 0.25, -150),
      new THREE.Vector3(150, 0.25, -150),
      new THREE.Vector3(150, 0.25, 150),
      new THREE.Vector3(-150, 0.25, 150),
      new THREE.Vector3(-150, 0.25, -150)
    ];
    bedGroup.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(refOutlinePts),
        new THREE.LineBasicMaterial({ color: 0x991f1f })
      )
    );

    // =============================================================
    // 2. BUILD VOLUME CAGE
    // =============================================================
    cageGroup.visible = showBuildCage;
    const cageGeo = new THREE.BoxGeometry(bedX, bedHeightZ, bedZ);
    const cageEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(cageGeo),
      new THREE.LineBasicMaterial({
        color: 0x7e796e,
        transparent: true,
        opacity: 0.55
      })
    );
    cageEdges.position.y = bedHeightZ / 2;
    cageGroup.add(cageEdges);

    const tickMat = new THREE.LineBasicMaterial({ color: 0x991f1f });
    const corners: [number, number][] = [
      [hx, -hz],
      [hx, hz],
      [-hx, -hz],
      [-hx, hz]
    ];
    for (const [cx, cz] of corners) {
      const tGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(cx, 0.3, cz),
        new THREE.Vector3(cx, 22, cz)
      ]);
      cageGroup.add(new THREE.Line(tGeo, tickMat));
    }

    // =============================================================
    // 3. MATERIAL SHADERS & SHARED CLIPPING PLANE
    // =============================================================
    let baseColor = 0x262930;
    let roughness = 0.62;
    let metalness = 0.22;

    if (mat.id === "plapro") {
      baseColor = 0x2c4257;
      roughness = 0.48;
      metalness = 0.12;
    } else if (mat.id === "alu-5052") {
      baseColor = 0xd2cdc2;
      roughness = 0.3;
      metalness = 0.88;
    } else if (mat.id === "abs-esun") {
      baseColor = 0x8f2424;
      roughness = 0.55;
      metalness = 0.15;
    }

    const effLength = isRotated90 ? part.widthMm : part.lengthMm;
    const effWidth = isRotated90 ? part.lengthMm : part.widthMm;
    const exceedsBed = effLength > bedX || effWidth > bedZ;

    const clipPlanes = [clipPlane];

    const standardMat = new THREE.MeshStandardMaterial({
      color: baseColor,
      roughness,
      metalness,
      clippingPlanes: clipPlanes,
      side: THREE.DoubleSide
    });

    const secondaryMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(baseColor).offsetHSL(0, 0, 0.08),
      roughness: Math.max(0.25, roughness - 0.08),
      metalness,
      clippingPlanes: clipPlanes,
      side: THREE.DoubleSide
    });

    const edgeMat = new THREE.LineBasicMaterial({
      color: exceedsBed ? 0x991f1f : 0x14171f,
      transparent: true,
      opacity: exceedsBed ? 0.85 : 0.48,
      clippingPlanes: clipPlanes
    });

    const applyFabricationMaterial = (
      node: THREE.Object3D,
      mode: "primary" | "secondary" | "keepAccent" = "primary"
    ) => {
      node.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (
            mode === "keepAccent" &&
            (child.material instanceof THREE.MeshStandardMaterial ||
              child.material instanceof THREE.MeshPhysicalMaterial)
          ) {
            const clonedMat = child.material.clone();
            clonedMat.clippingPlanes = clipPlanes;
            clonedMat.side = THREE.DoubleSide;
            child.material = clonedMat;
          } else {
            const m = (
              mode === "secondary" ? secondaryMat : standardMat
            ).clone();
            m.clippingPlanes = clipPlanes;
            child.material = m;
          }
          const clonedEdgeMat = edgeMat.clone();
          clonedEdgeMat.clippingPlanes = clipPlanes;
          const wire = new THREE.LineSegments(
            new THREE.EdgesGeometry(child.geometry, 24),
            clonedEdgeMat
          );
          child.add(wire);
        } else if (
          child instanceof THREE.LineSegments ||
          child instanceof THREE.Line
        ) {
          if (child.material instanceof THREE.Material) {
            const m = child.material.clone();
            m.clippingPlanes = clipPlanes;
            child.material = m;
          }
        }
      });
    };

    const spawnAssemblyPart = (
      id: string,
      pos: [number, number, number],
      mode: "primary" | "secondary" | "keepAccent" = "primary"
    ) => {
      const def = assemblyParts.find((p) => p.id === id);
      if (!def) return null;
      const model = createAssemblyModel(def);
      model.position.set(pos[0], pos[1], pos[2]);
      applyFabricationMaterial(model, mode);
      partGroup.add(model);
      return model;
    };

    // =============================================================
    // 4. ZERO-FLOATING BED SEATING (Y = 0), NON-OVERLAPPING NESTING & SUPPORTS
    // =============================================================
    const sep = explodeAmount;
    const nestedItems: THREE.Object3D[] = [];
    const overhangZones: OverhangZone[] = [];

    switch (part.id) {
      case "base-plate": {
        // Lower Base Chassis seated flat on the PEI plate (y_min = 0)
        // Its belly skid pan rests on y = 0 while its cantilevered outer octagonal deck
        // and 4 corner outrigger pads sit at y = 38 mm — supported from y = 0 by slicer supports!
        const m = spawnAssemblyPart("base", [0, 0, 0], "primary");
        if (m) {
          m.scale.set(280 / 360, 1, 240 / 280);
          seatOnBuildPlate(m, 0, [0, 0]);
          nestedItems.push(m);

          // Overhang zones under the cantilevered outer octagonal plate & 4 corner outriggers
          for (const sx of [-102, 102]) {
            for (const sz of [-92, 92]) {
              overhangZones.push({
                x: sx,
                z: sz,
                width: 44,
                depth: 36,
                topY: 38
              });
            }
          }
          for (const sx of [-115, 115]) {
            overhangZones.push({
              x: sx,
              z: 0,
              width: 30,
              depth: 74,
              topY: 37
            });
          }
        }
        break;
      }

      case "electronics-deck": {
        // Middle Avionics & Compute Deck:
        // Previously, `createAssemblyModel(deck)` included 82mm downward brass standoffs in its
        // merged wireframe (`LineSegments`), which caused `seatOnBuildPlate` to float the flat plate
        // at `y = +81 mm` in mid-air!
        // Here we strip the downward standoffs completely from the deck model so the 6mm octagonal
        // plate rests 100% flat on `y = 0.0 mm` (layers 1..40), and we lay the 6 hex standoff pillars
        // HORIZONTALLY on `y = 0.0 mm` in a separate row beside the plate!
        const def = assemblyParts.find((p) => p.id === "deck");
        if (def) {
          const model = createAssemblyModel(def);
          model.scale.set(240 / 310, 1, 180 / 240);
          for (const child of [...model.children]) {
            if (child instanceof THREE.Mesh) {
              child.geometry.computeBoundingBox();
              const bb = child.geometry.boundingBox;
              if (bb && bb.min.y < -10) {
                model.remove(child);
                disposeObject(child);
              }
            } else if (child instanceof THREE.LineSegments) {
              model.remove(child);
              disposeObject(child);
            }
          }
          applyFabricationMaterial(model, "primary");
          partGroup.add(model);
          seatOnBuildPlate(model, 0, [0, -18 - sep * 18]);
          nestedItems.push(model);

          // Lay the 6× M3×80mm Hex Standoff Pillars flat on `y = 0` in a neat row at the front of the bed
          const standoffRow = new THREE.Group();
          const brassMat = new THREE.MeshStandardMaterial({
            color: 0xc8a24a,
            roughness: 0.32,
            metalness: 0.88,
            clippingPlanes: clipPlanes
          });
          for (let i = 0; i < 6; i++) {
            const hexPillar = new THREE.Mesh(
              new THREE.CylinderGeometry(4.2, 4.2, 76, 6),
              brassMat
            );
            hexPillar.rotation.z = Math.PI / 2; // Laid horizontal so it prints flat on y = 0!
            hexPillar.position.set((i % 3 - 1) * 84, 4.2, Math.floor(i / 3) * 14);
            hexPillar.castShadow = true;
            hexPillar.receiveShadow = true;
            standoffRow.add(hexPillar);
          }
          partGroup.add(standoffRow);
          seatOnBuildPlate(standoffRow, 0, [0, 96 + sep * 26]);
          nestedItems.push(standoffRow);
        }
        break;
      }

      case "body-shell": {
        // 3-Piece Modular Bodywork Kit nested into 3 non-overlapping zones on `y = 0.0 mm`
        // of the 300×300mm PEI plate:
        // 1) Rear Faceted Tumblehome Canopy (trimmed to x <= 25 in local shell coords)
        // 2) Forward Multi-Plane V-Prow Nose (trimmed to x >= 25 in local shell coords)
        // 3) 3-Segment Swept Chevron Bullbar (rotated 90° to nest cleanly)
        const spread = sep * 26;
        const shellDef = assemblyParts.find((p) => p.id === "shell");
        const bumperDef = assemblyParts.find((p) => p.id === "bumper");

        if (shellDef && bumperDef) {
          const rearCanopy = createAssemblyModel(shellDef);
          trimModelByLocalX(rearCanopy, 25, "rear");
          rearCanopy.scale.set(0.48, 0.56, 0.48);
          applyFabricationMaterial(rearCanopy, "keepAccent");
          partGroup.add(rearCanopy);

          const noseProw = createAssemblyModel(shellDef);
          trimModelByLocalX(noseProw, 25, "front");
          noseProw.scale.set(0.5, 0.58, 0.48);
          applyFabricationMaterial(noseProw, "keepAccent");
          partGroup.add(noseProw);

          const bullbar = createAssemblyModel(bumperDef);
          bullbar.scale.set(0.56, 0.65, 0.52);
          bullbar.rotation.y = Math.PI / 2;
          applyFabricationMaterial(bullbar, "keepAccent");
          partGroup.add(bullbar);

          // Seat all 3 trimmed pieces flat on `y = 0.0 mm` in 3 non-overlapping bed quadrants!
          seatOnBuildPlate(rearCanopy, 0, [-54 - spread, -38 - spread * 0.6]);
          seatOnBuildPlate(noseProw, 0, [58 + spread, -38 - spread * 0.6]);
          seatOnBuildPlate(bullbar, 0, [0, 82 + spread]);

          nestedItems.push(rearCanopy, noseProw, bullbar);
          const resolvedBoxes = resolvePlanarCollisions(
            nestedItems,
            12 + sep * 18
          );

          // Overhang support zones under the canopy roof crown, nose visor, and bullbar wings
          const rc = new THREE.Vector3();
          const nc = new THREE.Vector3();
          const bc = new THREE.Vector3();
          resolvedBoxes[0].getCenter(rc);
          resolvedBoxes[1].getCenter(nc);
          resolvedBoxes[2].getCenter(bc);

          overhangZones.push(
            {
              x: rc.x,
              z: rc.z,
              width: 56,
              depth: 62,
              topY: Math.max(12, resolvedBoxes[0].max.y * 0.72)
            },
            {
              x: nc.x,
              z: nc.z,
              width: 44,
              depth: 50,
              topY: Math.max(10, resolvedBoxes[1].max.y * 0.68)
            },
            {
              x: bc.x,
              z: bc.z,
              width: 92,
              depth: 20,
              topY: Math.max(6, resolvedBoxes[2].max.y * 0.65)
            }
          );
        }
        break;
      }

      case "sensor-mast": {
        // 3-Piece Flat-Bed Nested Layout:
        // Previously `tilt-frame` and `servo` floated at `y = 128 mm` in mid-air!
        // When `sep <= 0.85` (Print Bed Mode), all 3 sub-assemblies sit directly on `y = 0.0 mm`
        // in 3 non-overlapping zones so every piece prints from layer 1 on the PEI bed:
        // 1) Center: Flanged Mast Pedestal Base & Twin Vertical Risers (y = 0)
        // 2) Front (+Z): U-Shaped Gimbal Yoke seated flat on its base plate (y = 0)
        // 3) Rear (-Z): ST3215 Servo Carrier seated flat on `y = 0`
        const pedestalGroup = new THREE.Group();
        const baseMesh = new THREE.Mesh(
          new THREE.BoxGeometry(116, 6, 88),
          standardMat.clone()
        );
        baseMesh.position.set(0, 3, 0);
        baseMesh.castShadow = true;
        baseMesh.receiveShadow = true;
        pedestalGroup.add(baseMesh);

        for (const zOff of [-32, 32]) {
          const column = new THREE.Mesh(
            new THREE.BoxGeometry(22, 86, 10),
            secondaryMat.clone()
          );
          column.position.set(0, 46, zOff);
          column.castShadow = true;
          column.receiveShadow = true;
          pedestalGroup.add(column);
        }
        applyFabricationMaterial(pedestalGroup, "primary");
        partGroup.add(pedestalGroup);
        seatOnBuildPlate(pedestalGroup, 0, [-36 - sep * 22, 0]);
        nestedItems.push(pedestalGroup);

        const yoke = spawnAssemblyPart("tilt-frame", [0, 0, 0], "secondary");
        if (yoke) {
          seatOnBuildPlate(yoke, 0, [56 + sep * 22, -34 - sep * 16]);
          nestedItems.push(yoke);
        }

        const servoMount = spawnAssemblyPart("servo", [0, 0, 0], "keepAccent");
        if (servoMount) {
          seatOnBuildPlate(servoMount, 0, [56 + sep * 22, 42 + sep * 16]);
          nestedItems.push(servoMount);
        }

        resolvePlanarCollisions(nestedItems, 12 + sep * 16);

        // Bearing bore & servo horn overhang support zones
        if (yoke) {
          overhangZones.push({
            x: yoke.position.x,
            z: yoke.position.z,
            width: 34,
            depth: 56,
            topY: 28
          });
        }
        break;
      }

      case "motor-brackets": {
        // 2×2 Symmetric Grid of 37D C-Channel Motor Mount Bulkheads seated flat on `y = 0.0 mm`
        const spread = 1 + sep * 0.55;
        const bracketConfigs: [string, number, number][] = [
          ["bracket-front-left", -48 * spread, 44 * spread],
          ["bracket-front-right", -48 * spread, -44 * spread],
          ["bracket-rear-left", 48 * spread, 44 * spread],
          ["bracket-rear-right", 48 * spread, -44 * spread]
        ];
        bracketConfigs.forEach(([id, bx, bz], idx) => {
          const b = spawnAssemblyPart(
            id,
            [bx, 0, bz],
            idx % 2 === 0 ? "primary" : "secondary"
          );
          if (b) {
            seatOnBuildPlate(b, 0, [bx, bz]);
            nestedItems.push(b);
            overhangZones.push({
              x: b.position.x,
              z: b.position.z,
              width: 34,
              depth: 24,
              topY: 32
            });
          }
        });
        resolvePlanarCollisions(nestedItems, 14 + sep * 18);
        break;
      }

      case "full-frame": {
        // Complete Assembled Multi-Deck Rover Frame seated on y = 0
        // With support columns bridging the gap between Lower Base (y=44) and Middle Deck (y=130)
        // so the Z-slice simulation never stalls in empty air!
        const e = sep;
        const frameParts: {
          id: string;
          mode: "primary" | "secondary" | "keepAccent";
        }[] = [
          { id: "base", mode: "primary" },
          { id: "deck", mode: "secondary" },
          { id: "rail-left", mode: "secondary" },
          { id: "rail-right", mode: "secondary" },
          { id: "bracket-front-left", mode: "primary" },
          { id: "bracket-front-right", mode: "primary" },
          { id: "bracket-rear-left", mode: "primary" },
          { id: "bracket-rear-right", mode: "primary" },
          { id: "tilt-frame", mode: "primary" },
          { id: "shell", mode: "keepAccent" },
          { id: "bumper", mode: "keepAccent" }
        ];
        for (const item of frameParts) {
          const def = assemblyParts.find((p) => p.id === item.id);
          if (!def) continue;
          const px = def.home[0] + def.explode[0] * e * 0.55;
          const py = def.home[1] - 44 + def.explode[1] * e * 0.55;
          const pz = def.home[2] + def.explode[2] * e * 0.55;
          const m = spawnAssemblyPart(item.id, [px, py, pz], item.mode);
          if (m) nestedItems.push(m);
        }
        if (e < 0.02) {
          seatOnBuildPlate(partGroup, 0);
          overhangZones.push(
            { x: 0, z: 0, width: 180, depth: 140, topY: 128 },
            { x: -65, z: 0, width: 110, depth: 110, topY: 168 }
          );
        }
        break;
      }
    }

    // Add 3D Support Structures (Tree, Snug Grid, Accordion, or Soluble Interface)
    if (mat.type !== "cnc-mill" && supportStyle !== "none") {
      const supportMeshGroup = buildSupportStructureGeometry(
        overhangZones,
        supportStyle,
        clipPlanes
      );
      partGroup.add(supportMeshGroup);
    }

    // Apply Bed Orientation (0° or 90°)
    partGroup.rotation.y = isRotated90 ? Math.PI / 2 : 0;
    partGroup.updateMatrixWorld(true);

    // Compute world-space bounding boxes for each nested sub-part to draw bed outlines & brims
    const subBoxes = nestedItems.map((item) =>
      new THREE.Box3().setFromObject(item)
    );
    rt.subPartBoxes = subBoxes;

    if (mat.type !== "cnc-mill") {
      const outlines = buildBedArrangementOutlines(
        subBoxes,
        adhesionType,
        exceedsBed
      );
      bedGroup.add(outlines);
    }

    // Measure actual seated bounding box so the Z-slice animation knows exact part height & footprint
    rt.partBoundsBox.setFromObject(partGroup);
    rt.partTopY = rt.partBoundsBox.isEmpty()
      ? part.heightMm
      : Math.max(8, rt.partBoundsBox.max.y);

    rt.infillPattern = infillPattern;
    rt.infillPercent = infillPercent;
    rt.wallLoops = wallLoops;
    rt.rebuildSliceOverlay(rt.currentSliceY);

    wake();
  }, [
    selectedPartId,
    selectedMaterialId,
    isRotated90,
    explodeAmount,
    showBuildCage,
    infillPattern,
    supportStyle,
    adhesionType,
    infillPercent,
    wallLoops,
    printerProfileId
  ]);

  // Smoothly animate Z-slice plane when `sliceHeightMm` changes
  useEffect(() => {
    const rt = runtimeRef.current;
    if (!rt) return;
    rt.targetSliceY = Math.max(0.5, Math.min(rt.maxBedZ, sliceHeightMm));
    rt.wake();
  }, [sliceHeightMm]);

  if (webglError) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#E5E1D8] p-6 text-center font-mono text-[11px] text-[#A87914]">
        {webglError}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-[#E5E1D8] select-none cursor-grab active:cursor-grabbing"
    />
  );
}

export default FabricationStage;
