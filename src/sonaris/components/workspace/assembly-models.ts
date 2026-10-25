import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ConvexGeometry } from "three/examples/jsm/geometries/ConvexGeometry.js";
import type { AssemblyPart } from "@/sonaris/lib/sonaris-assembly";

/**
 * Generates a procedural studio softbox environment texture (inspired by ARES-4)
 * so anodised aluminium, brass standoffs, steel shafts, and optical lenses catch
 * realistic specular reflections without external HDR asset fetches.
 */
export function createStudioEnvMap(renderer: THREE.WebGLRenderer): THREE.Texture | null {
  if (typeof document === "undefined") return null;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.48, "#e2ded4");
    grad.addColorStop(0.52, "#9a9488");
    grad.addColorStop(1, "#645f56");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);

    // Overhead studio softbox highlights
    ctx.fillStyle = "#ffffff";
    const softboxes: [number, number, number, number][] = [
      [28, 26, 145, 42],
      [235, 18, 135, 36],
      [405, 38, 92, 44],
      [145, 88, 65, 22]
    ];
    for (const [x, y, w, h] of softboxes) {
      ctx.fillRect(x, y, w, h);
    }

    const eqTex = new THREE.CanvasTexture(canvas);
    eqTex.colorSpace = THREE.SRGBColorSpace;
    eqTex.mapping = THREE.EquirectangularReflectionMapping;

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envMap = pmrem.fromEquirectangular(eqTex).texture;
    eqTex.dispose();
    pmrem.dispose();
    return envMap;
  } catch {
    return null;
  }
}

// Cached T-slot and lathe profiles so geometry construction stays fast
let cachedTSlotShape: THREE.Shape | null = null;
function getTSlotShape(halfSize = 10): THREE.Shape {
  if (cachedTSlotShape && halfSize === 10) return cachedTSlotShape;
  const s = new THREE.Shape();
  const h = halfSize;
  const n = halfSize * 0.3;
  const d = halfSize * 0.44;

  s.moveTo(-h, -h);
  s.lineTo(-n, -h);
  s.lineTo(-n, -h + d);
  s.lineTo(n, -h + d);
  s.lineTo(n, -h);
  s.lineTo(h, -h);

  s.lineTo(h, -n);
  s.lineTo(h - d, -n);
  s.lineTo(h - d, n);
  s.lineTo(h, n);
  s.lineTo(h, h);

  s.lineTo(n, h);
  s.lineTo(n, h - d);
  s.lineTo(-n, h - d);
  s.lineTo(-n, h);
  s.lineTo(-h, h);

  s.lineTo(-h, n);
  s.lineTo(-h + d, n);
  s.lineTo(-h + d, -n);
  s.lineTo(-h, -n);
  s.lineTo(-h, -h);

  const bore = new THREE.Path();
  bore.absarc(0, 0, halfSize * 0.28, 0, Math.PI * 2, true);
  s.holes.push(bore);

  if (halfSize === 10) cachedTSlotShape = s;
  return s;
}

/**
 * Authentic 3D component models for the SONARIS rover assembly.
 * Incorporates high-craft mechanical detailing:
 * - Perforated aluminium Mecanum hubs + lathed grooved parabolic rubber rollers at ±45°
 * - Extruded 2020 T-slot aluminium side rails with gussets and socket-head cap screws
 * - Chamfered octagonal lower base and upper electronics deck with brass hex standoffs
 * - Pololu #4694 37D gearmotors with brass gearbox, 6-bolt faceplate, and rear quadrature encoder PCB
 * - RPLIDAR S2 optical scanner with dual recessed laser lenses, ST3215 12V servo, and U-yoke gimbal
 * - Raspberry Pi 5 + 7-blade impeller active cooler, Pi Pico RP2040, BNO085 IMU, 2x Cytron MDD10A
 * - Bioenno BLF-1212AS 12.8V 12Ah LiFePO4 pack, 20A blade fuse block, contactor, and E-Stop mushroom
 */
export function createAssemblyModel(part: AssemblyPart, shellColorHex = 0xded8ca): THREE.Group {
  const root = new THREE.Group();
  const [w, h, d] = part.size;

  const mat = (color: number, metalness = 0.15, roughness = 0.5) =>
    new THREE.MeshStandardMaterial({ color, metalness, roughness });

  const aluminum = mat(0xc6cbd0, 0.88, 0.3);
  const darkTitanium = mat(0x23272e, 0.52, 0.42);
  const brushedSteel = mat(0xa2a8b0, 0.82, 0.32);
  const brass = mat(0xd4af37, 0.88, 0.28);
  const copper = mat(0xb87333, 0.86, 0.26);
  const rubberBlack = mat(0x141619, 0.06, 0.88);
  const plasticBlack = mat(0x1c1f24, 0.12, 0.58);
  const pcbGreen = mat(0x145a38, 0.2, 0.44);
  const pcbBlue = mat(0x1b4c84, 0.2, 0.44);
  const deepRed = mat(0x991f1f, 0.24, 0.4);
  const safetyYellow = mat(0xe0ad1f, 0.18, 0.42);
  const cyanLaser = mat(0x1d8fb0, 0.25, 0.22);
  const chassisIvory = mat(shellColorHex, 0.18, 0.54);
  const terminalGreen = mat(0x247544, 0.15, 0.48);
  const tintedGlass = mat(0x0b0e12, 0.6, 0.12);

  // Panel edges collected from faceted hulls and merged into one LineSegments at the end
  const edgeGeometries: THREE.BufferGeometry[] = [];

  type P3 = [number, number, number];
  /** Convex hull panel; mirrorZ adds the lateral (+Z ↔ -Z) twin of every off-centre point. */
  const hull = (pts: P3[], material: THREE.Material, mirrorZ = false) => {
    const all = mirrorZ
      ? [...pts, ...pts.filter((p) => p[2] !== 0).map((p) => [p[0], p[1], -p[2]] as P3)]
      : pts;
    const geometry = new ConvexGeometry(all.map((p) => new THREE.Vector3(p[0], p[1], p[2])));
    edgeGeometries.push(new THREE.EdgesGeometry(geometry, 20));
    return add(geometry, material);
  };

  const add = (
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    x = 0,
    y = 0,
    z = 0,
    targetGroup: THREE.Object3D = root
  ) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    targetGroup.add(mesh);
    return mesh;
  };

  const box = (
    sx: number,
    sy: number,
    sz: number,
    material: THREE.Material,
    px = 0,
    py = 0,
    pz = 0,
    targetGroup: THREE.Object3D = root
  ) => add(new THREE.BoxGeometry(sx, sy, sz), material, px, py, pz, targetGroup);

  const cylinder = (
    radiusTop: number,
    radiusBottom: number,
    height: number,
    segments: number,
    material: THREE.Material,
    x = 0,
    y = 0,
    z = 0,
    axis: "x" | "y" | "z" = "y",
    targetGroup: THREE.Object3D = root
  ) => {
    const mesh = add(
      new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments),
      material,
      x,
      y,
      z,
      targetGroup
    );
    if (axis === "z") mesh.rotation.x = Math.PI / 2;
    if (axis === "x") mesh.rotation.z = Math.PI / 2;
    return mesh;
  };

  // Socket-head cap screw with hex recess
  const socketScrew = (
    x: number,
    y: number,
    z: number,
    r = 2.4,
    axis: "x" | "y" | "z" = "y"
  ) => {
    cylinder(r, r, 1.8, 12, brushedSteel, x, y, z, axis);
    cylinder(
      r * 0.48,
      r * 0.48,
      0.8,
      6,
      darkTitanium,
      axis === "x" ? x + (x >= 0 ? 0.8 : -0.8) : x,
      axis === "y" ? y + 0.8 : y,
      axis === "z" ? z + (z >= 0 ? 0.8 : -0.8) : z,
      axis
    );
  };

  // Chamfered octagonal structural plate with optional lightening cutouts
  const chamferedPlate = (
    width: number,
    thickness: number,
    depth: number,
    material: THREE.Material,
    py = 0,
    chamferFrac = 0.14,
    withCutouts = false
  ) => {
    const hw = width / 2;
    const hd = depth / 2;
    const cx = width * chamferFrac;
    const cz = depth * chamferFrac;

    const shape = new THREE.Shape();
    shape.moveTo(-hw + cx, -hd);
    shape.lineTo(hw - cx, -hd);
    shape.lineTo(hw, -hd + cz);
    shape.lineTo(hw, hd - cz);
    shape.lineTo(hw - cx, hd);
    shape.lineTo(-hw + cx, hd);
    shape.lineTo(-hw, hd - cz);
    shape.lineTo(-hw, -hd + cz);
    shape.closePath();

    if (withCutouts) {
      for (const zSign of [-1, 1]) {
        for (let i = -1; i <= 1; i++) {
          const hole = new THREE.Path();
          const hx = i * width * 0.22;
          const hz = zSign * depth * 0.26;
          const rw = width * 0.065;
          const rd = depth * 0.065;
          hole.moveTo(hx - rw, hz - rd);
          hole.lineTo(hx + rw, hz - rd);
          hole.lineTo(hx + rw, hz + rd);
          hole.lineTo(hx - rw, hz + rd);
          hole.closePath();
          shape.holes.push(hole);
        }
      }
    }

    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: thickness,
      bevelEnabled: true,
      bevelSize: Math.min(1.0, thickness * 0.22),
      bevelThickness: Math.min(0.8, thickness * 0.22),
      bevelSegments: 2,
      steps: 1,
      curveSegments: 12
    });
    geometry.rotateX(-Math.PI / 2);
    geometry.center();
    return add(geometry, material, 0, py, 0);
  };

  const roundedPlate = (
    width: number,
    thickness: number,
    depth: number,
    material: THREE.Material,
    py = 0
  ) => {
    const radius = Math.min(width, depth) * 0.08;
    const x = -width / 2;
    const z = -depth / 2;
    const shape = new THREE.Shape();
    shape.moveTo(x + radius, z);
    shape.lineTo(x + width - radius, z);
    shape.quadraticCurveTo(x + width, z, x + width, z + radius);
    shape.lineTo(x + width, z + depth - radius);
    shape.quadraticCurveTo(x + width, z + depth, x + width - radius, z + depth);
    shape.lineTo(x + radius, z + depth);
    shape.quadraticCurveTo(x, z + depth, x, z + depth - radius);
    shape.lineTo(x, z + radius);
    shape.quadraticCurveTo(x, z, x + radius, z);

    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: thickness,
      bevelEnabled: true,
      bevelSize: Math.min(1.0, thickness / 4),
      bevelThickness: Math.min(0.8, thickness / 4),
      bevelSegments: 2,
      steps: 1,
      curveSegments: 8
    });
    geometry.rotateX(-Math.PI / 2);
    geometry.center();
    return add(geometry, material, 0, py);
  };

  const bolts = (sx: number, sz: number, y: number) => {
    for (const x of [-sx, sx]) {
      for (const z of [-sz, sz]) {
        socketScrew(x, y, z, 2.2, "y");
      }
    }
  };

  const kind =
    part.kind === "board"
      ? part.id.includes("pi5")
        ? "pi"
        : part.id.includes("pico")
          ? "pico"
          : part.id.includes("monitor")
            ? "monitor"
            : "imu"
      : part.kind;

  switch (kind) {
    // -------------------------------------------------------------------------
    // 1. CHAMFERED STRUCTURAL CHASSIS PLATES & 2020 T-SLOT RAILS
    // -------------------------------------------------------------------------
    case "plate":
    case "base":
    case "deck": {
      const isBase = part.id === "base";
      chamferedPlate(
        w,
        h * 0.72,
        d,
        isBase ? darkTitanium : chassisIvory,
        0,
        0.19,
        true
      );

      // Perimeter stiffening trim & mounting bolts
      for (const zSign of [-1, 1]) {
        box(w * 0.58, h * 0.85, 3.5, isBase ? aluminum : darkTitanium, 0, 0, zSign * (d * 0.48));
        for (const xFrac of [-0.26, -0.09, 0.09, 0.26]) {
          socketScrew(w * xFrac, h * 0.42, zSign * (d * 0.43), 2.4, "y");
        }
      }

      // Integrated Under-Chassis Belly Pan & 4-Corner Axle Outrigger Saddles on Lower Base Plate (y = 88 mm)
      if (isBase) {
        box(10, h * 1.35, d * 0.48, deepRed, w * 0.49, h * 0.25, 0);
        box(8, h * 1.15, d * 0.48, aluminum, -w * 0.49, h * 0.2, 0);

        // Central dropped belly skid pan (y = -4..-40 => world y = 48..84 mm, cradling inboard of the motors)
        hull(
          [
            [-148, -3, 0],
            [-148, -3, 62],
            [148, -3, 62],
            [148, -3, 0],
            [-132, -38, 0],
            [-132, -38, 52],
            [132, -38, 52],
            [132, -38, 0]
          ],
          darkTitanium,
          true
        );
        // Longitudinal brushed-aluminium belly skid rails along bottom of under-tray
        for (const zRail of [-34, 0, 34]) {
          box(248, 3.5, 8, aluminum, 0, -39, zRail);
        }

        // 4 Integrated Corner Motor Mount Outrigger Pads & Inboard Axle Saddles (x = ±130)
        for (const ax of [-130, 130]) {
          for (const zSign of [-1, 1]) {
            // Outrigger bridge pad over motor bracket flange (|z| = 104..136, y = -2..+3)
            box(56, 5.5, 34, aluminum, ax, 0, zSign * 120);
            socketScrew(ax - 18, 3.2, zSign * 124, 2.2, "y");
            socketScrew(ax + 18, 3.2, zSign * 124, 2.2, "y");

            // Inboard drop-down motor rear-can saddle bulkhead (|z| = 74, cradling motor at y = -24.5)
            box(44, 34, 6, darkTitanium, ax, -18, zSign * 74);
            cylinder(19.5, 19.5, 8, 24, aluminum, ax, -24.5, zSign * 74, "z");
          }
        }
      }

      // Full-height hex brass standoffs coupling upper electronics deck (y=174) to lower base plate (y=88)
      if (part.id === "deck") {
        for (const x of [-w * 0.34, 0, w * 0.34]) {
          for (const z of [-d * 0.36, d * 0.36]) {
            cylinder(4.5, 4.5, 82, 6, brass, x, -42, z);
            socketScrew(x, h * 0.45, z, 2.5, "y");
          }
        }
      }
      break;
    }

    case "rail": {
      // Coupled 2-tier 2020 T-Slot Extruded Aluminium Side Cage (bridges base y=88 to deck y=174)
      const zInboard = part.home[2] >= 0 ? -18 : 18;
      const span = w * 0.68;
      const profileHalf = Math.min(h * 0.22, d * 0.9);
      const shape = getTSlotShape(profileHalf);
      const beamGeo = new THREE.ExtrudeGeometry(shape, {
        depth: span,
        bevelEnabled: false
      });
      beamGeo.translate(0, 0, -span / 2);
      beamGeo.rotateY(Math.PI / 2);

      // Lower beam (at base plate level y = -18 => world 92) and upper beam (at deck level y = +58 => world 168)
      add(beamGeo, aluminum, 0, -18, zInboard);
      add(beamGeo.clone(), aluminum, 0, 58, zInboard);

      // Full-height vertical structural columns coupling lower base and upper deck
      for (const xFrac of [-0.31, -0.1, 0.1, 0.31]) {
        box(14, 80, d * 1.05, darkTitanium, w * xFrac, 20, zInboard);
        socketScrew(w * xFrac, 58, zInboard - Math.sign(zInboard) * (d * 0.56), 2.0, "z");
        socketScrew(w * xFrac, -18, zInboard - Math.sign(zInboard) * (d * 0.56), 2.0, "z");
      }
      // Mid-level horizontal stiffening bar with SONARIS red inlay
      box(span * 0.96, 8, d * 0.95, darkTitanium, 0, 20, zInboard);
      box(span * 0.9, 3.2, d * 1.08, deepRed, 0, 20, zInboard);
      break;
    }

    case "bracket": {
      // Heavy-Duty CNC C-Channel Motor Mount Bulkhead (home: [±130, 68, ±126], size: [52, 46, 36])
      // Bridges base plate (y = +20 => world 88), motor axle (y = -4.5 => world 63.5), and wheel hub (|z| = 144)
      // Mirror right-side brackets so +Z always points outboard toward the wheel
      if (part.home[2] < 0) root.rotation.y = Math.PI;

      // 1. Upper Horizontal Chassis Mounting Flange (y = +16 => world y = 84, bolts to underside of base y = 88)
      box(w, 5.5, d * 0.88, darkTitanium, 0, 16, -2);
      for (const sx of [-w * 0.34, w * 0.34]) {
        for (const sz of [-10, 6]) {
          socketScrew(sx, 19.2, sz, 2.2, "y");
        }
      }

      // 2. Outboard Vertical Gearbox Faceplate Bulkhead (z = +8 => world |z| = 134, centered on axle y = -4.5)
      box(w * 0.92, h * 0.92, 6.0, darkTitanium, 0, -2, 8);
      // Machined aluminium 6-bolt motor faceplate boss & outboard sealed bearing housing (reaches |z| = 143)
      cylinder(20.5, 20.5, 7.5, 28, aluminum, 0, -4.5, 8.5, "z");
      cylinder(11.5, 13.0, 10.0, 24, darkTitanium, 0, -4.5, 13.5, "z");
      cylinder(8.2, 8.2, 11.5, 20, brushedSteel, 0, -4.5, 14.2, "z");
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        socketScrew(Math.cos(a) * 15.5, -4.5 + Math.sin(a) * 15.5, 12.2, 1.5, "z");
      }

      // 3. Inboard Motor-Can Support Ring (z = -14 => world |z| = 112) + Twin Side Gusset Walls
      cylinder(20.5, 20.5, 5.0, 28, aluminum, 0, -4.5, -14, "z");
      for (const xSign of [-1, 1]) {
        hull(
          [
            [xSign * (w * 0.44), 14, -16],
            [xSign * (w * 0.44), 14, 10],
            [xSign * (w * 0.44), -21, 10],
            [xSign * (w * 0.44), -12, -16],
            [xSign * (w * 0.36), 14, -16],
            [xSign * (w * 0.36), 14, 10],
            [xSign * (w * 0.36), -21, 10],
            [xSign * (w * 0.36), -12, -16]
          ],
          aluminum
        );
      }
      // Lower protective tie-bar under gearbox
      box(w * 0.92, 4.0, 26, darkTitanium, 0, -21.5, -3);
      break;
    }

    // -------------------------------------------------------------------------
    // 2. 127 MM MECANUM WHEELS (Perforated Aluminium Plates + Lathed Rollers + Inboard Hub Collar)
    // -------------------------------------------------------------------------
    case "wheel": {
      const radius = Math.min(w, h) / 2;
      const isRight = part.home[0] * part.home[2] < 0;
      const rollerSign = isRight ? 1 : -1;
      const inboardSign = part.home[2] >= 0 ? -1 : 1;

      // Central Aluminium Hub Barrel & Extended Brass D-Shaft Coupling
      cylinder(radius * 0.34, radius * 0.34, d * 0.88, 28, aluminum, 0, 0, 0, "z");
      cylinder(radius * 0.18, radius * 0.18, d * 1.05, 6, brass, 0, 0, inboardSign * 2, "z");

      // Inboard Clamping Hub Collar & Flange Boss (bridges wheel inner face |z|=143.5 to bracket bearing |z|=135)
      cylinder(
        radius * 0.28,
        radius * 0.24,
        14,
        24,
        aluminum,
        0,
        0,
        inboardSign * (d * 0.48),
        "z"
      );
      cylinder(
        radius * 0.21,
        radius * 0.21,
        18,
        20,
        darkTitanium,
        0,
        0,
        inboardSign * (d * 0.56),
        "z"
      );

      // Perforated Aluminium Side Plates (Extruded disc with 6 circular lightening holes)
      const plateR = radius * 0.74;
      const plateShape = new THREE.Shape();
      plateShape.absarc(0, 0, plateR, 0, Math.PI * 2, false);
      const centerBore = new THREE.Path();
      centerBore.absarc(0, 0, radius * 0.18, 0, Math.PI * 2, true);
      plateShape.holes.push(centerBore);
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        const hole = new THREE.Path();
        hole.absarc(
          Math.cos(a) * plateR * 0.62,
          Math.sin(a) * plateR * 0.62,
          plateR * 0.17,
          0,
          Math.PI * 2,
          true
        );
        plateShape.holes.push(hole);
      }
      const sidePlateGeo = new THREE.ExtrudeGeometry(plateShape, {
        depth: d * 0.08,
        bevelEnabled: false,
        curveSegments: 24
      });

      for (const zSign of [-1, 1]) {
        add(sidePlateGeo.clone(), aluminum, 0, 0, zSign * (d * 0.34) - d * 0.04);
        const rimTorus = new THREE.TorusGeometry(plateR * 0.98, d * 0.035, 8, 36);
        add(rimTorus, darkTitanium, 0, 0, zSign * (d * 0.36));

        const dome = new THREE.SphereGeometry(
          radius * 0.18,
          16,
          8,
          0,
          Math.PI * 2,
          0,
          Math.PI / 2
        );
        dome.rotateX(zSign * (Math.PI / 2));
        add(dome, brushedSteel, 0, 0, zSign * (d * 0.44));

        for (let k = 0; k < 3; k++) {
          const a = (k * Math.PI * 2) / 3 + 0.5;
          cylinder(
            1.8,
            1.8,
            3.5,
            8,
            darkTitanium,
            Math.cos(a) * radius * 0.32,
            Math.sin(a) * radius * 0.32,
            zSign * (d * 0.4),
            "z"
          );
        }
      }
      sidePlateGeo.dispose();

      // 10 Contoured Lathed Rubber Rollers with Tread Grooves at ±45°
      const lathePts: THREE.Vector2[] = [];
      const rMax = radius * 0.165;
      const halfLen = d * 0.38;
      for (let i = 0; i <= 20; i++) {
        const t = -1 + (2 * i) / 20;
        const barrel = rMax * Math.pow(Math.max(0, 1 - t * t * 0.72), 0.5);
        const groove = i % 2 === 1 ? rMax * 0.055 : 0;
        lathePts.push(new THREE.Vector2(barrel + groove, t * halfLen));
      }
      const baseRollerGeo = new THREE.LatheGeometry(lathePts, 16);
      const baseAxleGeo = new THREE.CylinderGeometry(1.7, 1.7, halfLen * 2.15, 8);

      const upAxis = new THREE.Vector3(0, 1, 0);
      const rollerScale = new THREE.Vector3(1, 1, 1);
      const rollerMat = new THREE.Matrix4();

      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const rad = new THREE.Vector3(Math.cos(a), Math.sin(a), 0);
        const tan = new THREE.Vector3(-Math.sin(a), Math.cos(a), 0);
        const axis = tan
          .multiplyScalar(Math.SQRT1_2)
          .add(new THREE.Vector3(0, 0, rollerSign * Math.SQRT1_2))
          .normalize();
        const quat = new THREE.Quaternion().setFromUnitVectors(upAxis, axis);
        const pos = new THREE.Vector3(rad.x * radius * 0.82, rad.y * radius * 0.82, 0);
        rollerMat.compose(pos, quat, rollerScale);

        const rGeo = baseRollerGeo.clone().applyMatrix4(rollerMat);
        add(rGeo, rubberBlack);

        const aGeo = baseAxleGeo.clone().applyMatrix4(rollerMat);
        add(aGeo, brushedSteel);
      }

      baseRollerGeo.dispose();
      baseAxleGeo.dispose();
      root.userData.motion = "wheel";
      break;
    }

    // -------------------------------------------------------------------------
    // 3. POLOLU #4694 37D 70:1 GEARMOTORS WITH QUADRATURE ENCODER
    //    Home: [±130, 63.5, ±102], size: [37, 37, 86]. +Z points outboard toward wheel.
    // -------------------------------------------------------------------------
    case "motor": {
      const motorR = Math.min(w, h) * 0.45;

      // Brass/Gold Helical Spur Gearbox Housing (z = +4..+31 => world |z| = 106..133, flush against bracket!)
      cylinder(motorR, motorR, 27, 32, brass, 0, 0, 17.5, "z");
      // Dark Anodised Gearbox Mounting Faceplate at z = +31 (world |z| = 133) with 6 Ring Screws
      cylinder(motorR * 1.06, motorR * 1.06, 3.5, 32, darkTitanium, 0, 0, 31, "z");
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        cylinder(
          1.5,
          1.5,
          4.5,
          8,
          aluminum,
          Math.cos(a) * motorR * 0.76,
          Math.sin(a) * motorR * 0.76,
          31.5,
          "z"
        );
      }
      // Stepped Gearbox Output Boss + Heavy 6 mm D-Shaft & Keyed Wheel Hub Coupling (reaches |z| = 166!)
      cylinder(6.5, 6.5, 12, 20, aluminum, 0, 0, 37, "z");
      cylinder(4.2, 4.2, 34, 18, brushedSteel, 0, 0, 48, "z");
      cylinder(7.8, 7.8, 10, 6, brass, 0, 0, 56, "z");

      // 37 mm Brushed DC Motor Can (z = -31..+4 => world |z| = 71..106)
      cylinder(motorR * 0.95, motorR * 0.95, 35, 32, brushedSteel, 0, 0, -13.5, "z");
      // Magnetic Flux Return Ring around Motor Can
      cylinder(motorR * 0.99, motorR * 0.99, 16, 32, darkTitanium, 0, 0, -12, "z");

      // Green Quadrature Hall Encoder PCB + Neodymium Magnet Ring + Rear Cap (z = -31..-42)
      cylinder(motorR * 0.88, motorR * 0.88, 2.2, 24, pcbGreen, 0, 0, -32.5, "z");
      cylinder(motorR * 0.32, motorR * 0.32, 3.5, 16, aluminum, 0, 0, -33.5, "z");
      cylinder(motorR * 0.92, motorR * 0.92, 11, 28, plasticBlack, 0, 0, -38, "z");

      // Dual Gold Armature Solder Terminals + 6-Pin Encoder Header Housing
      for (const k of [-1, 1]) {
        cylinder(1.4, 1.4, 6, 8, brass, k * motorR * 0.38, 0, -45, "z");
      }
      box(w * 0.32, h * 0.16, d * 0.1, darkTitanium, 0, h * 0.38, -37);
      for (let i = 0; i < 6; i++) {
        cylinder(0.65, 0.65, 4.5, 8, brass, (i - 2.5) * 1.8, h * 0.46, -37);
      }

      if (part.home[2] < 0) root.rotation.y = Math.PI;
      break;
    }

    // -------------------------------------------------------------------------
    // 4. RASPBERRY PI 5 (8 GB) & ACTIVE COOLER BLOWER
    // -------------------------------------------------------------------------
    case "pi": {
      roundedPlate(w, 2.0, d, pcbGreen, -h * 0.32);

      // 4 Brass Standoffs + Corner Socket Screws
      for (const [sx, sz] of [
        [-w * 0.42, -d * 0.42],
        [w * 0.42, -d * 0.42],
        [-w * 0.42, d * 0.42],
        [w * 0.42, d * 0.42]
      ]) {
        cylinder(2.6, 2.6, 5.5, 6, brass, sx, -h * 0.45, sz);
        socketScrew(sx, -h * 0.22, sz, 2.0, "y");
      }

      // Broadcom BCM2712 SoC Heatspreader + PMIC + RP1 I/O Controller
      box(17, 2.4, 17, brushedSteel, -w * 0.08, -h * 0.18, 0);
      box(12, 2.0, 12, darkTitanium, w * 0.16, -h * 0.18, d * 0.08);
      box(7, 1.8, 7, darkTitanium, -w * 0.28, -h * 0.18, d * 0.15);

      // Dual USB 3.0 (Cyan Tongue) + Dual USB 2.0 Stacks
      for (const z of [-d * 0.27, d * 0.02]) {
        box(w * 0.2, h * 0.85, d * 0.22, brushedSteel, w * 0.4, h * 0.12, z);
        box(w * 0.04, h * 0.22, d * 0.16, cyanLaser, w * 0.49, h * 0.18, z);
      }
      // Gigabit Ethernet RJ45 Shielded Jack with Link LEDs
      box(w * 0.24, h * 0.78, d * 0.26, brushedSteel, w * 0.38, h * 0.1, d * 0.31);
      box(2.0, 2.0, 1.5, safetyYellow, w * 0.49, h * 0.22, d * 0.41);

      // USB-C PD Power Port + Dual Micro-HDMI + PCIe FPC Header
      box(9, 3.2, 7.5, brushedSteel, -w * 0.28, -h * 0.1, -d * 0.45);
      box(6.5, 2.8, 6.5, brushedSteel, -w * 0.08, -h * 0.1, -d * 0.45);
      box(6.5, 2.8, 6.5, brushedSteel, w * 0.08, -h * 0.1, -d * 0.45);
      box(3.5, 4.0, d * 0.36, chassisIvory, -w * 0.44, -h * 0.08, 0);

      // 40-Pin GPIO Header (Dual 20-Pin Gold Array)
      box(w * 0.6, 3.2, 5.5, plasticBlack, -w * 0.04, -h * 0.16, d * 0.42);
      for (let i = 0; i < 20; i++) {
        cylinder(0.45, 0.45, 5.2, 6, brass, -w * 0.32 + i * 2.54, -h * 0.02, d * 0.4);
        cylinder(0.45, 0.45, 5.2, 6, brass, -w * 0.32 + i * 2.54, -h * 0.02, d * 0.44);
      }
      break;
    }

    case "cooler": {
      // Anodised Aluminium Finned Heatsink + 7-Blade Impeller Fan
      box(w * 0.86, h * 0.28, d * 0.86, aluminum, 0, -h * 0.28, 0);
      for (let i = 0; i < 11; i++) {
        box(
          1.4,
          h * 0.52,
          d * 0.84,
          aluminum,
          -w * 0.38 + i * (w * 0.076),
          0,
          0
        );
      }
      // Circular Blower Shroud & 7 Angled Impeller Blades
      const shroud = new THREE.TorusGeometry(Math.min(w, d) * 0.34, 1.8, 8, 28);
      shroud.rotateX(Math.PI / 2);
      add(shroud, darkTitanium, 4, h * 0.22, 0);
      cylinder(5.5, 5.5, 3.5, 16, plasticBlack, 4, h * 0.2, 0);
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        const blade = new THREE.BoxGeometry(9.5, 1.2, 3.5);
        blade.rotateZ(0.32);
        blade.rotateY(a);
        blade.translate(4 + Math.cos(a) * 8.5, h * 0.2, -Math.sin(a) * 8.5);
        add(blade, plasticBlack);
      }
      break;
    }

    // -------------------------------------------------------------------------
    // 5. RASPBERRY PI PICO (RP2040), BNO085 IMU & INA226 BUS MONITOR
    // -------------------------------------------------------------------------
    case "pico":
    case "imu":
    case "monitor": {
      const pcbMat = kind === "pico" ? pcbGreen : kind === "monitor" ? deepRed : pcbBlue;
      roundedPlate(w, 1.8, d, pcbMat, -h * 0.28);

      // Central IC Package
      box(w * 0.22, 2.0, d * 0.36, darkTitanium, 0, -h * 0.1, 0);

      if (kind === "pico") {
        // Micro-USB Connector + BOOTSEL Button + 40 Gold Header Pins
        box(w * 0.16, 3.0, d * 0.38, brushedSteel, -w * 0.42, -h * 0.05, 0);
        box(4.2, 2.2, 3.2, chassisIvory, -w * 0.2, -h * 0.08, 0);
        for (const z of [-d * 0.44, d * 0.44]) {
          for (let i = 0; i < 20; i++) {
            cylinder(0.5, 0.5, 3.6, 6, brass, -w * 0.38 + i * (w * 0.04), -h * 0.1, z);
          }
        }
      } else if (kind === "imu") {
        // Dual STEMMA QT / JST-SH 4-Pin Connectors + Crystal + Corner Holes
        for (const xSign of [-1, 1]) {
          box(4.5, 3.2, 6.2, plasticBlack, xSign * (w * 0.38), -h * 0.04, 0);
        }
        bolts(w * 0.38, d * 0.38, -h * 0.15);
      } else {
        // INA226 Precision Shunt Resistor + Screw Terminal Block
        box(w * 0.34, 2.4, d * 0.24, copper, -w * 0.18, -h * 0.06, 0);
        box(w * 0.24, h * 0.55, d * 0.52, terminalGreen, w * 0.3, h * 0.08, 0);
        for (const z of [-d * 0.14, d * 0.14]) {
          cylinder(1.4, 1.4, 2.5, 8, brass, w * 0.3, h * 0.36, z);
        }
      }
      break;
    }

    // -------------------------------------------------------------------------
    // 6. CYTRON MDD10A DUAL 10A MOTOR DRIVERS & DC-DC BUCK CONVERTERS
    // -------------------------------------------------------------------------
    case "driver":
    case "converter": {
      const isDriver = part.kind === "driver";
      roundedPlate(w, 2.2, d, isDriver ? pcbBlue : pcbGreen, -h * 0.32);
      bolts(w * 0.44, d * 0.42, -h * 0.22);

      // Multi-Fin Extruded Aluminium Heatsink Array
      for (const z of isDriver ? [-d * 0.24, d * 0.24] : [0]) {
        box(w * 0.48, h * 0.45, d * 0.26, darkTitanium, 0, h * 0.02, z);
        for (let i = 0; i < 6; i++) {
          box(
            w * 0.46,
            h * 0.38,
            1.4,
            aluminum,
            0,
            h * 0.22,
            z + (i - 2.5) * 2.6
          );
        }
      }

      // Electrolytic Filter Capacitors (Black Cylinders with Silver Tops)
      for (const k of [-1, 1]) {
        cylinder(4.8, 4.8, h * 0.62, 16, plasticBlack, -w * 0.18, h * 0.08, k * (d * 0.22));
        cylinder(4.2, 4.2, 0.8, 16, aluminum, -w * 0.18, h * 0.4, k * (d * 0.22));
      }

      // Heavy-Duty Barrier Screw Terminal Blocks with Brass Screws
      for (const x of [-w * 0.38, w * 0.38]) {
        box(w * 0.15, h * 0.52, d * 0.72, terminalGreen, x, h * 0.02, 0);
        for (const z of [-d * 0.24, 0, d * 0.24]) {
          cylinder(1.7, 1.7, 2.4, 10, brass, x, h * 0.3, z);
        }
      }

      // Buck Converter Toroidal Inductor + Multi-Turn Blue Trim Potentiometer
      if (!isDriver) {
        const toroid = new THREE.TorusGeometry(7.5, 3.2, 12, 24);
        toroid.rotateX(Math.PI / 2);
        add(toroid, copper, w * 0.12, h * 0.12, -d * 0.18);
        box(5.5, 5.5, 4.5, pcbBlue, w * 0.18, h * 0.08, d * 0.26);
        cylinder(1.2, 1.2, 1.5, 8, brass, w * 0.18, h * 0.38, d * 0.26);
      }
      break;
    }

    // -------------------------------------------------------------------------
    // 7. BIOENNO BLF-1212AS LiFePO4 BATTERY (12.8V 12Ah) & HOLD-DOWN STRAP
    // -------------------------------------------------------------------------
    case "battery": {
      roundedPlate(w, h * 0.88, d, plasticBlack, -h * 0.04);

      // Top Recessed Lid & Side Reinforcement Ribs
      roundedPlate(w * 0.94, h * 0.12, d * 0.92, darkTitanium, h * 0.4);
      for (const x of [-w * 0.3, 0, w * 0.3]) {
        box(w * 0.06, h * 0.86, d * 0.96, darkTitanium, x, -h * 0.03, 0);
      }

      // Top Specification Placard + Chemistry Accent Strip
      box(w * 0.62, 1.0, d * 0.64, chassisIvory, -w * 0.05, h * 0.47, 0);
      box(w * 0.16, 1.3, d * 0.64, deepRed, -w * 0.28, h * 0.475, 0);
      box(w * 0.38, 1.3, d * 0.14, darkTitanium, w * 0.04, h * 0.475, -d * 0.18);
      box(w * 0.32, 1.3, d * 0.1, safetyYellow, w * 0.01, h * 0.475, d * 0.14);

      // M5 Red (+) & Black (-) Heavy-Duty Terminal Posts with Brass Bolts
      cylinder(5.5, 5.5, 8, 18, deepRed, w * 0.36, h * 0.48, -d * 0.26);
      cylinder(3.2, 3.2, 11, 6, brass, w * 0.36, h * 0.54, -d * 0.26);

      cylinder(5.5, 5.5, 8, 18, darkTitanium, w * 0.36, h * 0.48, d * 0.26);
      cylinder(3.2, 3.2, 11, 6, brass, w * 0.36, h * 0.54, d * 0.26);

      // Anderson Powerpole 30A Output Housing
      box(14, 9, 16, deepRed, w * 0.46, h * 0.36, 0);
      for (const zOff of [-3.5, 3.5]) {
        box(4, 3, 4, brass, w * 0.52, h * 0.36, zOff);
      }
      break;
    }

    case "restraint": {
      // Twin Hold-Down Straps with Machined Aluminium Cam Buckles
      for (const xOff of [-w * 0.24, w * 0.24]) {
        box(16, h * 0.85, d, deepRed, xOff, 0, 0);
        box(22, h * 1.3, 18, aluminum, xOff, h * 0.2, 0);
        socketScrew(xOff, h * 0.5, d * 0.46, 2.4, "y");
        socketScrew(xOff, h * 0.5, -d * 0.46, 2.4, "y");
      }
      box(w * 0.72, h * 0.7, 14, darkTitanium, 0, 0, 0);
      break;
    }

    // -------------------------------------------------------------------------
    // 8. RPLIDAR S2 OPTICAL 2D LASER SCANNER (Dual Optics + Bearing Turret)
    // -------------------------------------------------------------------------
    case "lidar": {
      const radius = Math.min(w, d) * 0.48;

      // 4 Brass Standoffs + Stationary Base Housing & Bearing Ring
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        cylinder(
          2.2,
          2.2,
          h * 0.28,
          6,
          brass,
          Math.cos(a) * radius * 0.88,
          -h * 0.36,
          Math.sin(a) * radius * 0.88
        );
      }
      cylinder(radius * 1.04, radius * 1.04, h * 0.22, 36, darkTitanium, 0, -h * 0.32, 0);
      cylinder(radius * 0.98, radius * 0.98, 2.5, 36, aluminum, 0, -h * 0.19, 0);

      // Rotating Optical Scan Turret (kept as dynamic child group so scanner spins)
      const turret = new THREE.Group();
      turret.position.set(0, h * 0.06, 0);
      turret.userData.dynamic = true;

      add(
        new THREE.CylinderGeometry(radius * 0.9, radius * 0.92, h * 0.56, 36),
        plasticBlack,
        0,
        0,
        0,
        turret
      );
      add(
        new THREE.CylinderGeometry(radius * 0.88, radius * 0.88, 2.8, 36),
        aluminum,
        0,
        h * 0.29,
        0,
        turret
      );
      add(
        new THREE.CylinderGeometry(radius * 0.26, radius * 0.26, 3.6, 24),
        deepRed,
        0,
        h * 0.31,
        0,
        turret
      );

      // Recessed Optical Bezel + Dual Transmit/Receive Laser Lenses
      box(radius * 0.42, h * 0.36, radius * 0.58, darkTitanium, radius * 0.74, 0, 0, turret);
      for (const zOff of [-radius * 0.15, radius * 0.15]) {
        cylinder(
          radius * 0.11,
          radius * 0.11,
          4.0,
          18,
          cyanLaser,
          radius * 0.92,
          0,
          zOff,
          "x",
          turret
        );
        const lensRing = new THREE.TorusGeometry(radius * 0.115, 1.0, 8, 20);
        lensRing.rotateY(Math.PI / 2);
        add(lensRing, brushedSteel, radius * 0.94, 0, zOff, turret);
      }

      turret.userData.motion = "scanner";
      root.add(turret);
      root.userData.motion = "tilt";
      break;
    }

    // -------------------------------------------------------------------------
    // 9. TILT GIMBAL YOKE & ST3215 12V SERIAL BUS SERVO
    // -------------------------------------------------------------------------
    case "tilt-frame":
    case "tilt": {
      // Machined U-Shaped Aluminium Gimbal Yoke with Flanged Ball Bearings
      roundedPlate(w * 0.96, h * 0.14, d * 0.88, aluminum, -h * 0.42);
      for (const z of [-d * 0.44, d * 0.44]) {
        box(w * 0.52, h * 0.92, d * 0.11, aluminum, 0, 0, z);
        box(w * 0.32, h * 0.65, d * 0.13, darkTitanium, 0, -h * 0.06, z);
        // Flanged Stainless Bearing Race & Trunnion Shaft
        cylinder(8.5, 8.5, d * 0.16, 24, darkTitanium, 0, h * 0.26, z, "z");
        cylinder(4.5, 4.5, d * 0.24, 18, brushedSteel, 0, h * 0.26, z, "z");
      }
      bolts(w * 0.38, d * 0.32, -h * 0.32);
      break;
    }

    case "servo": {
      // ST3215 Serial Bus Servo Casing + Red Anodised Center Heatsink
      box(w * 0.82, h * 0.78, d * 0.86, plasticBlack, 0, 0, 0);
      box(w * 0.86, h * 0.32, d * 0.9, deepRed, 0, 0, 0);
      for (let i = 0; i < 4; i++) {
        box(w * 0.88, 1.0, d * 0.92, aluminum, 0, (i - 1.5) * 2.4, 0);
      }
      // Brass 25T Output Spline & Clamping Aluminium Horn
      cylinder(w * 0.26, w * 0.26, h * 0.24, 24, aluminum, 0, h * 0.46, 0);
      cylinder(w * 0.13, w * 0.13, h * 0.34, 16, brass, 0, h * 0.54, 0);
      box(w * 0.78, h * 0.09, d * 0.22, brushedSteel, w * 0.24, h * 0.62, 0);
      break;
    }

    // -------------------------------------------------------------------------
    // 10. SAFETY SWITCHES: E-STOP MUSHROOM, CONTACTOR & 20A FUSE BLOCK
    // -------------------------------------------------------------------------
    case "estop": {
      const r = Math.min(w, d) * 0.46;
      // High-Visibility Safety Yellow Enclosure Bezel
      roundedPlate(w, h * 0.28, d, safetyYellow, -h * 0.28);
      bolts(w * 0.36, d * 0.36, -h * 0.12);
      // Knurled Threaded Collar
      cylinder(r * 0.68, r * 0.68, h * 0.34, 24, darkTitanium, 0, -h * 0.02, 0);
      // Contoured Red Mushroom Push-Button Cap (Cylinder + Hemispherical Dome)
      cylinder(r * 0.92, r * 0.82, h * 0.22, 28, deepRed, 0, h * 0.22, 0);
      const mushroomDome = new THREE.SphereGeometry(
        r * 0.92,
        28,
        12,
        0,
        Math.PI * 2,
        0,
        Math.PI * 0.42
      );
      add(mushroomDome, deepRed, 0, h * 0.32, 0);
      break;
    }

    case "disconnect": {
      roundedPlate(w, h * 0.56, d, darkTitanium, -h * 0.12);
      // Heavy-Duty M6 Copper Busbar Studs
      for (const x of [-w * 0.32, w * 0.32]) {
        cylinder(3.6, 3.6, h * 0.68, 16, copper, x, h * 0.1, 0);
        cylinder(5.5, 5.5, 3.0, 6, brass, x, -h * 0.08, 0);
      }
      // Red Rotary Isolator Handle
      cylinder(Math.min(w, d) * 0.26, Math.min(w, d) * 0.28, h * 0.34, 24, deepRed, 0, h * 0.3, 0);
      box(w * 0.72, h * 0.16, d * 0.22, deepRed, 0, h * 0.5, 0);
      bolts(w * 0.38, d * 0.36, h * 0.2);
      break;
    }

    case "protection": {
      // Molded ABS Inline Fuse Block + M5 Brass Studs + 20A ATC Blade Fuse
      roundedPlate(w, h * 0.5, d, plasticBlack, -h * 0.24);
      for (const x of [-w * 0.34, w * 0.34]) {
        cylinder(3.2, 3.2, h * 0.58, 12, brass, x, h * 0.08, 0);
        cylinder(5.0, 5.0, 2.8, 6, brass, x, -h * 0.04, 0);
      }
      box(w * 0.4, h * 0.32, d * 0.62, darkTitanium, 0, -h * 0.04, 0);
      // 20A Yellow ATC Blade Fuse
      box(w * 0.34, h * 0.48, d * 0.24, safetyYellow, 0, h * 0.22, 0);
      box(w * 0.26, 1.4, d * 0.26, aluminum, 0, h * 0.47, 0);
      break;
    }

    // -------------------------------------------------------------------------
    // 11. SCULPTED POLYHEDRAL BODY SHELL & TAPERED V-PROW NOSE
    //     Local origin sits on deck top (y = 178 mm; +X forward, +Y up, ±Z left/right).
    //     Couples upper canopy (y = +44) to lower base plate (y = -88) with tumblehome
    //     facets, flared mid-body sponsons, stepped wheel cutouts, and a raked wedge nose.
    // -------------------------------------------------------------------------
    case "shell": {
      // 1. Multi-Faceted Polyhedral Rear Cab Canopy (low-profile crown y = +44, clearing cooler at y = +35)
      hull(
        [
          // Canopy waist ring (y = +16..+20)
          [-172, 16, 0],
          [-168, 16, 86],
          [-134, 18, 118],
          [-18, 20, 118],
          [14, 20, 96],
          [18, 20, 0],
          // Mid-shoulder tumblehome crease (y = +32..+35)
          [-162, 32, 0],
          [-156, 32, 76],
          [-126, 35, 102],
          [-22, 35, 102],
          [6, 30, 84],
          [10, 30, 0],
          // Upper roof crown (y = +44 => world y = 222 mm, clearing cooler top y = 213 mm)
          [-142, 44, 0],
          [-138, 44, 62],
          [-24, 44, 66],
          [-6, 39, 56],
          [-4, 39, 0]
        ],
        chassisIvory,
        true
      );

      // Forward raked tinted polycarbonate visor sloping from canopy crown toward LiDAR well
      hull(
        [
          [-8, 41, 0],
          [-10, 41, 58],
          [-20, 35, 96],
          [12, 22, 92],
          [18, 22, 56],
          [20, 22, 0],
          [-8, 37, 0],
          [14, 18, 0]
        ],
        tintedGlass,
        true
      );

      // Extruded Bevelled Oval Roof Deck Plate + Cooling Louvers + Carry Hoop
      const roofOval = new THREE.Shape();
      roofOval.absellipse(0, 0, 54, 44, 0, Math.PI * 2, false, 0);
      const roofPlateGeo = new THREE.ExtrudeGeometry(roofOval, {
        depth: 3.2,
        bevelEnabled: true,
        bevelThickness: 1.4,
        bevelSize: 1.4,
        bevelSegments: 2,
        curveSegments: 32
      });
      roofPlateGeo.rotateX(-Math.PI / 2);
      add(roofPlateGeo, darkTitanium, -82, 44, 0);

      for (let i = -2; i <= 2; i++) {
        box(3.2, 1.4, 56, aluminum, -82 + i * 14, 47.6, 0);
      }
      for (const sx of [-124, -40]) {
        for (const sz of [-44, 44]) {
          socketScrew(sx, 44.5, sz, 2.0, "y");
        }
      }

      // Tubular SONARIS deep-red carry handle hoop with machined clamps & grips
      const hoopCurve = new THREE.CatmullRomCurve3(
        (
          [
            [-14, 41, 58],
            [-18, 56, 58],
            [-122, 58, 58],
            [-142, 58, 48],
            [-148, 58, 24],
            [-148, 58, -24],
            [-142, 58, -48],
            [-122, 58, -58],
            [-18, 56, -58],
            [-14, 41, -58]
          ] as P3[]
        ).map((p) => new THREE.Vector3(p[0], p[1], p[2])),
        false,
        "centripetal"
      );
      add(new THREE.TubeGeometry(hoopCurve, 96, 3.2, 10, false), deepRed);
      for (const s of [-1, 1]) {
        box(12, 7, 11, darkTitanium, -14, 42, 58 * s);
        cylinder(4.8, 4.8, 44, 12, darkTitanium, -70, 57, 58 * s, "x");
        cylinder(2.4, 2.4, 16, 10, darkTitanium, -134, 49, 54 * s);
        box(10, 6, 10, darkTitanium, -134, 43, 54 * s);
      }

      // 2. Sculpted Flanks, Stepped Wheel Cutouts & Flared Mid-Body Sponsons
      for (const s of [-1, 1]) {
        // Raised 3D dark-titanium shoulder vent frame & angled louvers on canopy flank
        hull(
          [
            [-124, 21, 115 * s],
            [-36, 21, 115 * s],
            [-40, 33, 102 * s],
            [-120, 33, 102 * s],
            [-120, 23, 120 * s],
            [-40, 23, 120 * s],
            [-44, 31, 107 * s],
            [-116, 31, 107 * s]
          ],
          darkTitanium
        );
        for (let i = 0; i < 5; i++) {
          const louver = box(8, 1.8, 14, aluminum, -108 + i * 14, 27.5, 113 * s);
          louver.rotation.x = s * 0.52;
        }

        // Core upper side body beam (steps inward at z = ±118 so wheels & brackets stand proud)
        hull(
          [
            [-168, 16, 86 * s],
            [-134, 18, 118 * s],
            [116, 18, 118 * s],
            [164, 10, 92 * s],
            [160, -30, 96 * s],
            [114, -30, 118 * s],
            [-134, -30, 118 * s],
            [-172, -30, 90 * s],
            [-160, 16, 80 * s],
            [156, 10, 84 * s],
            [152, -30, 88 * s],
            [-164, -30, 82 * s]
          ],
          chassisIvory
        );

        // Lower tapered dark-titanium chassis tub wall (spans from y=-30 down to base plate y=-88 => world y=90)
        hull(
          [
            [-172, -30, 90 * s],
            [-134, -30, 118 * s],
            [114, -30, 118 * s],
            [160, -30, 96 * s],
            [146, -88, 82 * s],
            [106, -88, 108 * s],
            [-126, -88, 108 * s],
            [-158, -88, 80 * s],
            [-150, -30, 80 * s],
            [144, -30, 84 * s],
            [136, -88, 74 * s],
            [-148, -88, 72 * s]
          ],
          darkTitanium
        );

        // Flared 3D Hexagonal Mid-Body Sponson Pod between front & rear Mecanum wheels (x = -64..+64)
        hull(
          [
            [-64, 10, 116 * s],
            [64, 10, 116 * s],
            [68, -26, 116 * s],
            [-68, -26, 116 * s],
            [-52, 4, 138 * s],
            [52, 4, 138 * s],
            [56, -24, 144 * s],
            [-56, -24, 144 * s]
          ],
          chassisIvory
        );
        hull(
          [
            [-68, -26, 116 * s],
            [68, -26, 116 * s],
            [58, -86, 108 * s],
            [-58, -86, 108 * s],
            [-56, -24, 144 * s],
            [56, -24, 144 * s],
            [46, -78, 134 * s],
            [-46, -78, 134 * s]
          ],
          darkTitanium
        );

        // Raised armor plate & recessed service hatch on the mid-body sponson
        hull(
          [
            [-44, -30, 140 * s],
            [44, -30, 140 * s],
            [38, -70, 132 * s],
            [-38, -70, 132 * s],
            [-40, -34, 145 * s],
            [40, -34, 145 * s],
            [34, -66, 137 * s],
            [-34, -66, 137 * s]
          ],
          chassisIvory
        );
        box(38, 7, 3, darkTitanium, 0, -44, 143.5 * s);
        for (const sx of [-32, 32]) {
          for (const sy of [-38, -62]) {
            socketScrew(sx, sy, 142 * s, 1.8, "z");
          }
        }

        // Sculpted SONARIS deep-red chine accent spear along the flared sponson
        hull(
          [
            [-58, -21, 143 * s],
            [58, -21, 143 * s],
            [54, -27, 145 * s],
            [-54, -27, 145 * s],
            [-58, -21, 136 * s],
            [58, -21, 136 * s],
            [54, -27, 136 * s],
            [-54, -27, 136 * s]
          ],
          deepRed
        );

        // Forward Hood Cheeks flanking the LiDAR Gimbal Well (tapers inward toward the nose)
        hull(
          [
            [14, 20, 58 * s],
            [132, 15, 58 * s],
            [164, 10, 92 * s],
            [116, 18, 118 * s],
            [14, 18, 118 * s],
            [14, 12, 58 * s],
            [132, 9, 58 * s],
            [160, 4, 88 * s],
            [116, 12, 112 * s]
          ],
          chassisIvory
        );

        // SONARIS deep-red angled hood accent strake (ARES-4 style hood stripe)
        hull(
          [
            [36, 18.5, 72 * s],
            [36, 18.5, 92 * s],
            [144, 11.5, 66 * s],
            [144, 11.5, 80 * s],
            [36, 16, 72 * s],
            [36, 16, 92 * s],
            [144, 9, 66 * s],
            [144, 9, 80 * s]
          ],
          deepRed
        );

        // Inner dark-titanium coaming wall around LiDAR well
        box(122, 24, 3.5, darkTitanium, 74, 6, 57 * s);
      }

      // Rear coaming wall closing the back of the LiDAR well
      box(3.5, 24, 116, darkTitanium, 15, 6, 0);

      // 3. Multi-Plane Wedge Nose Prow (tapers to V-prow at x = +208)
      hull(
        [
          [132, 15, 0],
          [132, 15, 58],
          [164, 10, 92],
          [190, 0, 68],
          [206, -4, 32],
          [208, -4, 0],
          [132, 8, 0],
          [132, 8, 56],
          [160, 2, 88],
          [186, -8, 64],
          [202, -10, 30],
          [204, -10, 0]
        ],
        chassisIvory,
        true
      );

      // Recessed Raked Front Optical & Stereo Sensor Visor (angled chevron plane from y = -6 to y = -30)
      hull(
        [
          [205, -6, 0],
          [203, -6, 32],
          [187, -4, 68],
          [161, 4, 90],
          [157, -30, 92],
          [182, -30, 68],
          [197, -30, 32],
          [199, -30, 0],
          [192, -6, 0],
          [190, -30, 0]
        ],
        darkTitanium,
        true
      );

      // Center Tinted Glass Optical Sensor Fascia Window + Stereo Camera Lenses
      hull(
        [
          [206.5, -8, 0],
          [204.5, -8, 30],
          [193, -7, 52],
          [189, -26, 52],
          [198.5, -27, 30],
          [200.5, -27, 0],
          [198, -8, 0],
          [195, -27, 0]
        ],
        tintedGlass,
        true
      );
      // Stereo depth & RGB optical lenses inside the front nose visor
      for (const zOff of [-22, 0, 22]) {
        cylinder(
          zOff === 0 ? 4.2 : 5.5,
          zOff === 0 ? 4.2 : 5.5,
          4.0,
          18,
          zOff === 0 ? cyanLaser : brushedSteel,
          202.5 - Math.abs(zOff) * 0.12,
          -17,
          zOff,
          "x"
        );
      }

      // Twin Angled Dual-Projector LED Headlamp Pods on the swept nose cheeks (z = ±74)
      for (const s of [-1, 1]) {
        const lampGroup = new THREE.Group();
        lampGroup.position.set(174, -16, 74 * s);
        lampGroup.rotation.y = -s * 0.42;
        for (const rOff of [-8.5, 8.5]) {
          const bezel = new THREE.TorusGeometry(5.2, 1.2, 8, 20);
          bezel.rotateY(Math.PI / 2);
          bezel.translate(2.5, 0, rOff);
          lampGroup.add(new THREE.Mesh(bezel, aluminum));

          const lens = new THREE.CylinderGeometry(4.2, 4.2, 2.4, 16);
          lens.rotateZ(Math.PI / 2);
          lens.translate(2.2, 0, rOff);
          lampGroup.add(new THREE.Mesh(lens, chassisIvory));
        }
        // Amber corner indicator bar
        const cornerBar = new THREE.BoxGeometry(2.5, 3.2, 22);
        cornerBar.translate(2.6, -8.5, 0);
        lampGroup.add(new THREE.Mesh(cornerBar, safetyYellow));
        lampGroup.updateMatrixWorld(true);
        for (const child of [...lampGroup.children]) {
          if (child instanceof THREE.Mesh) {
            const g = child.geometry.clone().applyMatrix4(lampGroup.matrix);
            add(g, child.material as THREE.Material);
            child.geometry.dispose();
          }
        }
      }

      // Swept Lower Chin & Approach Skid Plate (rakes backward from prow y=-30 down to base y=-88)
      hull(
        [
          [199, -30, 0],
          [197, -30, 32],
          [182, -30, 68],
          [160, -30, 96],
          [146, -88, 82],
          [162, -88, 48],
          [170, -88, 0],
          [182, -30, 0],
          [156, -88, 0]
        ],
        darkTitanium,
        true
      );
      // Brushed Aluminium Ribbed Front Approach Skid Plate Insert + SONARIS Red Chin Lip
      hull(
        [
          [200, -31, 0],
          [198, -31, 30],
          [188, -29, 0],
          [199, -35, 0],
          [197, -35, 30],
          [186, -35, 0]
        ],
        deepRed,
        true
      );
      hull(
        [
          [196, -38, 0],
          [194, -38, 34],
          [168, -86, 30],
          [172, -86, 0],
          [186, -38, 0],
          [162, -86, 0]
        ],
        aluminum,
        true
      );
      for (const zRib of [-20, -7, 7, 20]) {
        const rib = box(4.0, 42, 2.8, darkTitanium, 184, -62, zRib);
        rib.rotation.z = -0.44;
      }

      // 4. Sculpted Boat-Tail Rear Transom & Diffuser (meets base plate at y = -88)
      hull(
        [
          [-172, 16, 0],
          [-168, 16, 86],
          [-188, -12, 72],
          [-192, -12, 0],
          [-172, -30, 90],
          [-186, -30, 68],
          [-190, -30, 0],
          [-158, 16, 0],
          [-168, -30, 0]
        ],
        chassisIvory,
        true
      );
      hull(
        [
          [-190, -30, 0],
          [-186, -30, 68],
          [-172, -30, 90],
          [-158, -88, 80],
          [-166, -88, 52],
          [-170, -88, 0],
          [-174, -30, 0],
          [-156, -88, 0]
        ],
        darkTitanium,
        true
      );
      // Rear recessed diagnostic bezel & vertical corner LED tail-lamp bars
      box(4, 15, 88, plasticBlack, -190.5, -20, 0);
      for (const s of [-1, 1]) {
        box(5, 20, 10, darkTitanium, -181, -18, 76 * s);
        box(3, 14, 6, deepRed, -183, -16, 76 * s);
        box(3, 4, 6, safetyYellow, -183, -25, 76 * s);
      }
      break;
    }

    case "bumper": {
      // 3-Segment Swept Chevron Bullbar (spans |z| = 152 ahead of front wheels while sweeping forward to x = +24 at prow)
      hull(
        [
          [24, 13, 0],
          [18, 13, 68],
          [4, 11, 152],
          [24, -13, 0],
          [18, -13, 68],
          [4, -11, 152],
          [6, 14, 0],
          [2, 14, 64],
          [-10, 12, 148],
          [6, -14, 0],
          [2, -14, 64],
          [-10, -12, 148]
        ],
        darkTitanium,
        true
      );

      // Sculpted SONARIS Deep-Red Upper Chevron Bullbar Cap
      hull(
        [
          [23, 13, 0],
          [17, 13, 67],
          [3, 11, 149],
          [22, 17.5, 0],
          [16, 17.5, 66],
          [2, 15, 147],
          [9, 14, 0],
          [5, 14, 62],
          [-7, 12, 145],
          [9, 17.5, 0],
          [5, 17.5, 62],
          [-7, 15, 145]
        ],
        deepRed,
        true
      );

      // Center recessed ultrasonic / proximity sensor bezel + dual transducers
      box(6, 13, 46, aluminum, 22.5, 0, 0);
      for (const zSens of [-12, 12]) {
        cylinder(4.8, 4.8, 4, 16, brushedSteel, 24.5, 0, zSens, "x");
        cylinder(3.4, 3.4, 4.6, 14, darkTitanium, 24.8, 0, zSens, "x");
      }

      // Twin Forged Red Tow Loops + Clevis Mounts + Swept Chassis Mounting Arms
      for (const s of [-1, 1]) {
        box(10, 10, 12, aluminum, 16, -4, 62 * s);
        const towLoop = new THREE.TorusGeometry(8.5, 2.2, 8, 24);
        towLoop.rotateX(Math.PI / 2);
        towLoop.rotateZ(s * 0.22);
        add(towLoop, deepRed, 23, -4, 62 * s);

        // Angled ultrasonic pod on each swept wing
        const wingPod = new THREE.Group();
        wingPod.position.set(10, 0, 106 * s);
        wingPod.rotation.y = -s * 0.18;
        for (const k of [-7, 7]) {
          const tCyl = new THREE.CylinderGeometry(4.2, 4.2, 4, 14);
          tCyl.rotateZ(Math.PI / 2);
          tCyl.translate(2, 0, k);
          wingPod.add(new THREE.Mesh(tCyl, aluminum));
        }
        wingPod.updateMatrixWorld(true);
        for (const child of [...wingPod.children]) {
          if (child instanceof THREE.Mesh) {
            add(child.geometry.clone().applyMatrix4(wingPod.matrix), aluminum);
            child.geometry.dispose();
          }
        }

        // Gusseted mounting arms tying back into the lower base plate (inboard of wheel track)
        box(34, 13, 16, darkTitanium, -14, -2, 52 * s);
        socketScrew(-24, 5.5, 52 * s, 2.2, "y");
      }
      break;
    }

    default: {
      roundedPlate(w, h, d, darkTitanium);
    }
  }

  // Merge collected hull edges into a single hairline overlay
  if (edgeGeometries.length > 0) {
    const mergedEdges = mergeGeometries(edgeGeometries, false);
    for (const g of edgeGeometries) g.dispose();
    if (mergedEdges) {
      root.add(
        new THREE.LineSegments(
          mergedEdges,
          new THREE.LineBasicMaterial({ color: 0x23272b, transparent: true, opacity: 0.55 })
        )
      );
    }
  }

  // Dispose unreferenced materials
  const used = new Set<THREE.Material>();
  root.traverse((node) => {
    if (node instanceof THREE.Mesh) used.add(node.material as THREE.Material);
  });
  for (const m of [
    aluminum,
    darkTitanium,
    brushedSteel,
    brass,
    copper,
    rubberBlack,
    plasticBlack,
    pcbGreen,
    pcbBlue,
    deepRed,
    safetyYellow,
    cyanLaser,
    chassisIvory,
    terminalGreen,
    tintedGlass
  ]) {
    if (!used.has(m)) m.dispose();
  }

  // Merge static geometry per material to keep draw calls minimal
  const batches = new Map<THREE.Material, THREE.Mesh[]>();
  for (const child of [...root.children]) {
    if (child instanceof THREE.Mesh && !child.userData.dynamic) {
      const m = child.material as THREE.Material;
      const batch = batches.get(m) ?? [];
      batch.push(child);
      batches.set(m, batch);
    }
  }

  for (const [m, meshes] of batches) {
    if (meshes.length < 2) continue;
    const geometries = meshes.map((mesh) => {
      mesh.updateMatrix();
      const cloned = mesh.geometry.clone();
      const geometry = cloned.index ? cloned.toNonIndexed() : cloned;
      if (geometry !== cloned) cloned.dispose();
      // Normalize attributes so ConvexGeometry (no UV) and Box/Cylinder/Extrude (with UV) merge cleanly
      geometry.deleteAttribute("uv");
      geometry.deleteAttribute("uv1");
      if (!geometry.getAttribute("normal")) {
        geometry.computeVertexNormals();
      }
      return geometry.applyMatrix4(mesh.matrix);
    });
    const merged = mergeGeometries(geometries, false);
    for (const g of geometries) g.dispose();
    if (!merged) continue;
    for (const mesh of meshes) {
      root.remove(mesh);
      mesh.geometry.dispose();
    }
    const mesh = new THREE.Mesh(merged, m);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
  }

  return root;
}
