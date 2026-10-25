import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { AssemblyPart } from "@/sonaris/lib/sonaris-assembly";

/**
 * Authentic 3D component models for the SONARIS rover assembly.
 * Built with calibrated physical dimensions and rich mechanical details:
 * - RPLIDAR S2 optical scanner with rotating laser window and mounting flange
 * - ST3215 12V high-torque serial bus servo and aluminum tilt yoke
 * - 127 mm Mecanum wheels with dual aluminum hubs and 10 angled rubber rollers
 * - Pololu #4694 70:1 spur gearmotors with rear magnetic encoders
 * - Raspberry Pi 5 with Broadcom BCM2712 SoC, active cooler heatsink and fan, ports
 * - Raspberry Pi Pico RP2040 coprocessor with gold castellated header pins
 * - BLF-1212AS LiFePO4 12.8V 12Ah battery with brass screw terminals and strap
 * - Dual Cytron MDD10A 10A motor drivers with dual heatsinks and terminal blocks
 * - CNC milled lower and upper chassis decks with hex standoffs
 * - E-Stop switch, contactor, and DC-DC buck converters
 */
export function createAssemblyModel(part: AssemblyPart): THREE.Group {
  const root = new THREE.Group();
  const [w, h, d] = part.size;

  // Material Palette (Calibrated non-emissive PBR materials)
  const mat = (color: number, metalness = 0.1, roughness = 0.55) =>
    new THREE.MeshStandardMaterial({ color, metalness, roughness });

  const aluminum = mat(0xc2c6cc, 0.85, 0.28);
  const darkTitanium = mat(0x282a30, 0.45, 0.4);
  const brushedSteel = mat(0x9aa0a6, 0.75, 0.35);
  const brass = mat(0xd4af37, 0.8, 0.3);
  const copper = mat(0xb87333, 0.85, 0.25);
  const rubberBlack = mat(0x1a1a1f, 0.05, 0.85);
  const plasticBlack = mat(0x22242b, 0.1, 0.6);
  const pcbGreen = mat(0x1d5e3c, 0.15, 0.45);
  const pcbBlue = mat(0x214470, 0.15, 0.45);
  const deepRed = mat(0x991f1f, 0.2, 0.45);
  const safetyYellow = mat(0xd9a41e, 0.2, 0.4);
  const cyanLaser = mat(0x2299bb, 0.1, 0.25);
  const chassisIvory = mat(0xe5ded0, 0.1, 0.65);
  const terminalGreen = mat(0x277a4a, 0.1, 0.5);

  const add = (geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
    return mesh;
  };

  const box = (x: number, y: number, z: number, material: THREE.Material, px = 0, py = 0, pz = 0) =>
    add(new THREE.BoxGeometry(x, y, z), material, px, py, pz);

  const cylinder = (
    radiusTop: number,
    radiusBottom: number,
    height: number,
    segments: number,
    material: THREE.Material,
    x = 0,
    y = 0,
    z = 0,
    axis: "x" | "y" | "z" = "y"
  ) => {
    const mesh = add(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material, x, y, z);
    if (axis === "z") mesh.rotation.x = Math.PI / 2;
    if (axis === "x") mesh.rotation.z = Math.PI / 2;
    return mesh;
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
      bevelSize: Math.min(1.2, thickness / 4),
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
        cylinder(2.4, 2.4, 1.6, 12, aluminum, x, y, z);
        box(3, 0.4, 0.6, darkTitanium, x, y + 0.9, z);
      }
    }
  };

  // Switch by part kind or specific hardware type
  const kind =
    part.kind === "board"
      ? part.id.includes("pi5")
        ? "pi"
        : part.id.includes("pico")
          ? "pico"
          : "imu"
      : part.kind;

  switch (kind) {
    // -------------------------------------------------------------------------
    // 1. STRUCTURAL CHASSIS PLATES
    // -------------------------------------------------------------------------
    case "plate":
    case "base":
    case "deck": {
      roundedPlate(w, h * 0.5, d, chassisIvory);
      // Weight reduction pockets & cable slots
      for (const z of [-d * 0.28, d * 0.28]) {
        for (let i = 0; i < 4; i++) {
          box(w * 0.12, h * 0.55, d * 0.08, darkTitanium, (i - 1.5) * w * 0.2, h * 0.01, z);
        }
      }
      // Standoff pillars
      if (part.id === "deck") {
        for (const x of [-w * 0.4, w * 0.4]) {
          for (const z of [-d * 0.4, d * 0.4]) {
            cylinder(3.5, 3.5, 32, 12, brass, x, -20, z);
          }
        }
      }
      bolts(w * 0.44, d * 0.42, h * 0.28);
      break;
    }

    case "rail":
    case "bracket": {
      box(w, h * 0.22, d, aluminum, 0, -h * 0.39);
      box(w, h, d * 0.18, aluminum, 0, 0, -d * 0.41);
      // Fastener slot array
      for (const x of [-w * 0.35, -w * 0.12, w * 0.12, w * 0.35]) {
        cylinder(2.2, 2.2, h * 0.25, 12, darkTitanium, x, -h * 0.37, d * 0.1);
      }
      break;
    }

    // -------------------------------------------------------------------------
    // 2. 127 MM MECANUM WHEELS (High-Fidelity 10-Roller Assemblies)
    // -------------------------------------------------------------------------
    case "wheel": {
      const radius = Math.min(w, h) / 2;
      const isRight = part.home[0] * part.home[2] < 0;

      // Inner & Outer Aluminum Hub Discs
      cylinder(radius * 0.75, radius * 0.75, d * 0.3, 32, darkTitanium, 0, 0, -d * 0.25, "z");
      cylinder(radius * 0.75, radius * 0.75, d * 0.3, 32, darkTitanium, 0, 0, d * 0.25, "z");

      // Central Aluminum Web & Hex Hub
      cylinder(radius * 0.48, radius * 0.48, d * 0.85, 24, aluminum, 0, 0, 0, "z");
      cylinder(radius * 0.22, radius * 0.22, d * 1.05, 6, brass, 0, 0, 0, "z"); // 12mm hex hub
      cylinder(3, 3, d * 1.15, 12, darkTitanium, 0, 0, 0, "z"); // axle bore

      // 6 Outer Flange Screws
      for (let j = 0; j < 6; j++) {
        const a = (j / 6) * Math.PI * 2;
        cylinder(2, 2, d * 1.02, 10, aluminum, Math.cos(a) * radius * 0.38, Math.sin(a) * radius * 0.38, 0, "z");
      }

      // 10 Contoured Vulcanized Rubber Rollers at 45° offset
      const rollerAngle = (isRight ? 1 : -1) * (Math.PI / 4);
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const rx = Math.cos(a) * radius * 0.82;
        const ry = Math.sin(a) * radius * 0.82;

        const rollerGroup = new THREE.Group();
        rollerGroup.position.set(rx, ry, 0);

        // Roller body: Barrel capsule with rubber tread
        const rollerMesh = new THREE.Mesh(
          new THREE.CapsuleGeometry(radius * 0.13, d * 0.65, 8, 16),
          rubberBlack
        );
        rollerMesh.castShadow = true;
        rollerMesh.receiveShadow = true;
        rollerGroup.add(rollerMesh);

        // Stainless steel axle pin
        const axleMesh = new THREE.Mesh(
          new THREE.CylinderGeometry(1.6, 1.6, d * 0.85, 12),
          brushedSteel
        );
        rollerGroup.add(axleMesh);

        rollerGroup.rotation.set(rollerAngle, 0, a);
        root.add(rollerGroup);
      }
      root.userData.motion = "wheel";
      break;
    }

    // -------------------------------------------------------------------------
    // 3. POLOLU #4694 70:1 ENCODER GEARMOTORS
    // -------------------------------------------------------------------------
    case "motor": {
      const motorR = Math.min(w, h) * 0.44;

      // 37 mm Cylindrical Spur Gearbox (Front Metal Section)
      cylinder(motorR, motorR, d * 0.4, 28, aluminum, 0, 0, d * 0.25, "z");

      // Gearbox Mounting Faceplate with 6 M3 Tap Holes
      cylinder(motorR * 1.05, motorR * 1.05, 3, 28, aluminum, 0, 0, d * 0.46, "z");
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        cylinder(1.5, 1.5, 4, 8, darkTitanium, Math.cos(a) * motorR * 0.78, Math.sin(a) * motorR * 0.78, d * 0.46, "z");
      }

      // 6 mm D-Shaped Output Drive Shaft
      cylinder(3, 3, d * 0.35, 16, brushedSteel, 0, 0, d * 0.62, "z");

      // Brushed Motor Housing (Main Steel Cylinder)
      cylinder(motorR * 0.95, motorR * 0.95, d * 0.42, 28, brushedSteel, 0, 0, -d * 0.15, "z");

      // Rear Magnetic Encoder Housing (Black Plastic Cup + PCB)
      cylinder(motorR * 0.92, motorR * 0.92, d * 0.18, 28, plasticBlack, 0, 0, -d * 0.44, "z");
      // 6-pin wiring connector lead
      box(w * 0.25, h * 0.15, d * 0.1, darkTitanium, 0, h * 0.35, -d * 0.44);
      for (let i = 0; i < 6; i++) {
        cylinder(0.7, 0.7, 4, 8, copper, (i - 2.5) * 2, h * 0.44, -d * 0.44);
      }

      if (part.home[2] < 0) root.rotation.y = Math.PI;
      break;
    }

    // -------------------------------------------------------------------------
    // 4. RASPBERRY PI 5 (8 GB) + ACTIVE COOLER HEATSINK & FAN
    // -------------------------------------------------------------------------
    case "pi": {
      // 85 x 56 mm Mainboard PCB
      roundedPlate(w, 2, d, pcbGreen, -h * 0.32);
      bolts(w * 0.42, d * 0.42, -h * 0.28);

      // Broadcom BCM2712 Quad-Core SoC with Heatspreader
      box(17, 2.2, 17, brushedSteel, -w * 0.1, -h * 0.18, 0);

      // Aluminum Active Cooler Heatsink Stack
      box(w * 0.68, h * 0.35, d * 0.72, darkTitanium, -w * 0.05, 0, 0);
      for (let i = 0; i < 11; i++) {
        box(1.5, h * 0.4, d * 0.68, aluminum, -w * 0.32 + i * (w * 0.055), h * 0.05, 0);
      }
      // Micro-blower fan housing & impeller blades
      cylinder(13, 13, 3, 24, plasticBlack, -w * 0.05, h * 0.22, 0);
      cylinder(4, 4, 3.5, 12, darkTitanium, -w * 0.05, h * 0.24, 0);

      // Dual USB 3.0 Ports (Blue) + Dual USB 2.0 (Black)
      for (const z of [-d * 0.26, d * 0.18]) {
        box(w * 0.22, h * 0.65, d * 0.24, aluminum, w * 0.39, h * 0.05, z);
        box(w * 0.05, h * 0.4, d * 0.18, cyanLaser, w * 0.48, h * 0.05, z);
      }

      // Gigabit Ethernet Port RJ45 with LEDs
      box(w * 0.26, h * 0.55, d * 0.28, aluminum, -w * 0.28, 0, -d * 0.34);

      // 40-Pin GPIO Header (Dual Gold Pin Array)
      box(w * 0.62, 3.5, 6, plasticBlack, -w * 0.05, -h * 0.25, d * 0.42);
      for (let i = 0; i < 20; i++) {
        cylinder(0.5, 0.5, 5, 8, brass, -w * 0.33 + i * 2.54, -h * 0.15, d * 0.4);
        cylinder(0.5, 0.5, 5, 8, brass, -w * 0.33 + i * 2.54, -h * 0.15, d * 0.44);
      }
      break;
    }

    // -------------------------------------------------------------------------
    // 5. RASPBERRY PI PICO (RP2040) & BNO085 IMU
    // -------------------------------------------------------------------------
    case "pico":
    case "imu": {
      const isPico = kind === "pico";
      roundedPlate(w, 1.8, d, isPico ? pcbGreen : pcbBlue, -h * 0.3);

      // RP2040 / BNO085 Chip
      box(w * 0.22, 1.8, d * 0.35, darkTitanium, 0, -h * 0.15, 0);

      // Micro-USB / USB-C Port
      box(w * 0.18, 3.2, d * 0.35, aluminum, -w * 0.42, -h * 0.1, 0);

      // Gold Castellated Header Pins along both edges
      for (const z of [-d * 0.44, d * 0.44]) {
        for (let i = 0; i < (isPico ? 20 : 8); i++) {
          cylinder(0.6, 0.6, 3, 8, brass, -w * 0.38 + i * (w * 0.048), -h * 0.15, z);
        }
      }
      break;
    }

    // -------------------------------------------------------------------------
    // 6. CYTRON MDD10A DUAL 10A MOTOR DRIVERS & DC-DC CONVERTERS
    // -------------------------------------------------------------------------
    case "driver":
    case "converter": {
      const isDriver = part.kind === "driver";
      roundedPlate(w, 2, d, isDriver ? pcbBlue : deepRed, -h * 0.3);

      // Dual High-Profile Aluminum Heatsinks
      for (const z of [-d * 0.26, d * 0.26]) {
        box(w * 0.55, h * 0.55, d * 0.28, darkTitanium, 0, h * 0.08, z);
        for (let i = 0; i < 5; i++) {
          box(w * 0.52, 1.5, d * 0.26, aluminum, 0, h * 0.2 + i * 2, z);
        }
      }

      // Heavy-Duty Screw Terminal Blocks (Green)
      for (const x of [-w * 0.38, w * 0.38]) {
        box(w * 0.16, h * 0.45, d * 0.75, terminalGreen, x, 0, 0);
        for (const z of [-d * 0.25, 0, d * 0.25]) {
          cylinder(1.5, 1.5, 2, 8, brass, x, h * 0.25, z);
        }
      }

      // Toroidal Inductor for Buck Converters
      if (!isDriver) {
        add(new THREE.TorusGeometry(8, 3.5, 12, 24), copper, 0, h * 0.2, 0);
        cylinder(5, 5, 12, 16, darkTitanium, 15, h * 0.2, 0);
      }
      break;
    }

    // -------------------------------------------------------------------------
    // 7. BLF-1212AS LiFePO4 BATTERY (12.8 V, 12 Ah)
    // -------------------------------------------------------------------------
    case "battery": {
      // Matte Black Impact-Resistant ABS Shell
      roundedPlate(w, h * 0.88, d, plasticBlack);

      // Top Terminal Flange & Structural Reinforcement Ribs
      for (const x of [-w * 0.28, w * 0.28]) {
        box(w * 0.08, h * 0.95, d * 0.95, darkTitanium, x, 0, 0);
      }

      // Specification Label Plate
      box(w * 0.55, 0.8, d * 0.6, chassisIvory, 0, h * 0.45, 0);
      box(w * 0.15, 1.2, d * 0.25, deepRed, -w * 0.15, h * 0.46, 0);

      // Heavy-Duty Screw Terminals (Red Positive, Black Negative)
      cylinder(4.5, 4.5, 7, 16, deepRed, -w * 0.28, h * 0.48, -d * 0.28);
      cylinder(2.5, 2.5, 9, 12, brass, -w * 0.28, h * 0.52, -d * 0.28); // M5 brass terminal bolt

      cylinder(4.5, 4.5, 7, 16, darkTitanium, w * 0.28, h * 0.48, -d * 0.28);
      cylinder(2.5, 2.5, 9, 12, brass, w * 0.28, h * 0.52, -d * 0.28);

      // Heavy-Duty Nylon Hold-Down Strap & Metal Cam Buckle
      box(w * 1.02, 3, d * 0.16, rubberBlack, 0, h * 0.42, d * 0.15);
      box(w * 0.14, 5, d * 0.22, aluminum, 0, h * 0.46, d * 0.15);
      break;
    }

    // -------------------------------------------------------------------------
    // 8. RPLIDAR S2 OPTICAL 2D LASER SCANNER
    // -------------------------------------------------------------------------
    case "lidar": {
      const radius = Math.min(w, d) * 0.48;

      // Lower Stationary Base (Flange with 4x M2.5 Mounting Holes)
      cylinder(radius * 1.05, radius * 1.05, h * 0.2, 32, darkTitanium, 0, -h * 0.38, 0);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        cylinder(1.5, 1.5, h * 0.24, 8, brushedSteel, Math.cos(a) * radius * 0.95, -h * 0.38, Math.sin(a) * radius * 0.95);
      }

      // Upper Rotating Optical Turret
      const turret = new THREE.Group();
      turret.position.set(0, h * 0.05, 0);

      // Turret Black Casing
      const turretBody = new THREE.Mesh(
        new THREE.CylinderGeometry(radius * 0.92, radius * 0.92, h * 0.6, 32),
        plasticBlack
      );
      turretBody.castShadow = true;
      turretBody.receiveShadow = true;
      turret.add(turretBody);

      // Optical Laser Transmit & Receive Aperture Windows
      const windowMesh = new THREE.Mesh(
        new THREE.BoxGeometry(radius * 0.45, h * 0.42, radius * 0.35),
        cyanLaser
      );
      windowMesh.position.set(radius * 0.78, 0, 0);
      turret.add(windowMesh);

      // Top Turret Disc with Slamtec Logo Cavity
      const topDisc = new THREE.Mesh(
        new THREE.CylinderGeometry(radius * 0.94, radius * 0.94, 2.5, 32),
        darkTitanium
      );
      topDisc.position.set(0, h * 0.32, 0);
      turret.add(topDisc);

      root.add(turret);
      root.userData.motion = "scanner";
      break;
    }

    // -------------------------------------------------------------------------
    // 9. TILT GIMBAL FRAME & ST3215 12V HIGH-TORQUE SERIAL SERVO
    // -------------------------------------------------------------------------
    case "tilt-frame":
    case "tilt": {
      // U-Shaped Machined Aluminum Gimbal Yoke
      box(w * 0.95, h * 0.12, d * 0.85, aluminum, 0, -h * 0.42, 0);
      for (const z of [-d * 0.44, d * 0.44]) {
        box(w * 0.55, h * 0.92, d * 0.12, aluminum, 0, 0, z);
        // Miniature Ball Bearing Assemblies with Stainless Races
        cylinder(6.5, 6.5, d * 0.16, 20, darkTitanium, 0, h * 0.25, z, "z");
        cylinder(3.5, 3.5, d * 0.22, 16, brushedSteel, 0, h * 0.25, z, "z"); // Pivot pin
      }
      bolts(w * 0.38, d * 0.32, -h * 0.34);
      break;
    }

    case "servo": {
      // ST3215 Black Composite Casing
      box(w * 0.8, h * 0.78, d * 0.85, plasticBlack, 0, 0, 0);
      // Red Anodized Aluminum Middle Heat Sink Section
      box(w * 0.84, h * 0.26, d * 0.88, deepRed, 0, 0, 0);
      for (let i = 0; i < 4; i++) {
        box(w * 0.86, 0.8, d * 0.9, darkTitanium, 0, (i - 1.5) * 2.2, 0);
      }
      // Metal Output Spline & Servo Horn
      cylinder(w * 0.24, w * 0.24, h * 0.25, 20, aluminum, 0, h * 0.48, 0);
      cylinder(w * 0.12, w * 0.12, h * 0.35, 12, brass, 0, h * 0.55, 0);
      box(w * 0.75, h * 0.08, d * 0.16, aluminum, w * 0.25, h * 0.65, 0);
      break;
    }

    // -------------------------------------------------------------------------
    // 10. SAFETY SWITCHES: E-STOP & BATTERY DISCONNECT
    // -------------------------------------------------------------------------
    case "estop": {
      // High-Visibility Safety Yellow Bezel
      roundedPlate(w, h * 0.25, d, safetyYellow, -h * 0.28);
      // Threaded Switch Collar
      cylinder(Math.min(w, d) * 0.35, Math.min(w, d) * 0.35, h * 0.35, 24, darkTitanium, 0, -h * 0.02, 0);
      // Large Red Mushroom Push Button with directional twist arrows
      cylinder(Math.min(w, d) * 0.45, Math.min(w, d) * 0.42, h * 0.32, 28, deepRed, 0, h * 0.3, 0);
      cylinder(Math.min(w, d) * 0.46, Math.min(w, d) * 0.46, 2, 28, deepRed, 0, h * 0.45, 0);
      break;
    }

    case "disconnect": {
      roundedPlate(w, h * 0.55, d, darkTitanium, -h * 0.1);
      // Red Master Rotary Switch Key
      cylinder(Math.min(w, d) * 0.25, Math.min(w, d) * 0.25, h * 0.35, 20, deepRed, 0, h * 0.32, 0);
      box(w * 0.68, h * 0.16, d * 0.2, deepRed, 0, h * 0.52, 0);
      bolts(w * 0.38, d * 0.36, h * 0.22);
      break;
    }

    case "protection": {
      // Molded ABS In-Line Fuse Base
      roundedPlate(w, h * 0.5, d, plasticBlack, -h * 0.25);
      // M4 Brass Input & Output Connection Studs
      for (const x of [-w * 0.32, w * 0.32]) {
        cylinder(3, 3, h * 0.55, 12, brass, x, h * 0.05, 0);
        cylinder(4.5, 4.5, 2.5, 6, brass, x, -h * 0.05, 0); // Hex nut
      }
      // Center Fuse Socket Cavity
      box(w * 0.38, h * 0.3, d * 0.6, darkTitanium, 0, -h * 0.05, 0);
      // 20A Yellow ATO/ATC Blade Fuse Body
      box(w * 0.32, h * 0.45, d * 0.22, safetyYellow, 0, h * 0.2, 0);
      box(w * 0.24, 1.2, d * 0.24, aluminum, 0, h * 0.44, 0); // Fuse amp stamp
      // Zinc Blade Terminal Prongs
      cylinder(1.2, 1.2, h * 0.3, 8, brushedSteel, -w * 0.08, h * 0.05, 0);
      cylinder(1.2, 1.2, h * 0.3, 8, brushedSteel, w * 0.08, h * 0.05, 0);
      break;
    }

    // Default Fallback
    default: {
      roundedPlate(w, h, d, darkTitanium);
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
    terminalGreen
  ]) {
    if (!used.has(m)) m.dispose();
  }

  // Merge static geometry per material to minimize draw calls
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
