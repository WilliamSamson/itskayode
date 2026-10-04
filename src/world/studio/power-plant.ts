import * as THREE from "three";

/**
 * ORRA — High-Voltage 100 kW Power Plant & Micro-Grid Substation
 * ==============================================================
 * Copyright (c) 2026 Kayode. All rights reserved.
 *
 * A massive, high-technical energy generation complex detached from the
 * main studio building on the expanded north-east promontory.
 *
 * Baseline Engineering Features:
 * - Reinforced concrete plinth with gravel blast ballast oil-containment beds.
 * - Twin 100 kW turbogenerators with fuel gas trains, lube oil coolers, and cooling flues.
 * - High-voltage oil-filled step-up transformer yard with radiator banks and twin induction coils.
 * - 3-phase air-break gang disconnect switch gantry with articulated copper switch blades.
 * - Surge arresters (metal oxide varistors) with corona grading rings.
 * - Dynamic electric arc (Jacob's ladder plasma discharge) with branching plasma tendrils.
 * - 100 kWh containerized Battery Energy Storage System (BESS) with climate control chiller fans.
 * - Power factor correction capacitor bank and harmonic filter rack.
 * - Bi-facial solar tracking photovoltaic array with weather sensor station.
 * - 415V 3-phase micro-grid telemetry console, vacuum switchgear, and safety rescue hook.
 * - Lattice transmission pylon with suspension insulator strings, catenary spans, and aviation markers.
 * - Galvanized floodlight stanchions illuminating the switchyard.
 *
 * Scientific Evolution Upgrades:
 * - Toroidal Magnetic Confinement / Plasma Pinch Core with glowing relativistic plasma ring.
 * - Optical Directed-Energy Laser Power Beam Emitter beaming coherent energy into the cosmos/orbital fleet.
 * - Subterranean Cryogenic Superconducting Magnetic Energy Storage (SMES) 4.2 K Well.
 * - Magnetohydrodynamic (MHD) Channel converting plasma kinetic energy directly to electricity.
 * - Deep-keel quantum geothermal thermoelectric wells tapping the floating island underbelly.
 */

export const POWER_PLANT_BOUNDS = {
  west: 27.0,
  east: 55.0,
  south: -35.0,
  north: -71.0,
  centerX: 41.0,
  centerZ: -53.0,
} as const;

/**
 * Procedural diamond iron chain-link mesh texture generator.
 * Produces seamless interwoven galvanized steel wire fabric with transparent diamond apertures.
 */
function createChainLinkTexture(): THREE.Texture {
  if (typeof document === "undefined") {
    const dummy = new THREE.DataTexture(new Uint8Array([140, 150, 160, 255]), 1, 1);
    dummy.needsUpdate = true;
    return dummy;
  }
  const canvas = document.createElement("canvas");
  const size = 128;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, size, size);

  // Outer woven wire strand
  ctx.strokeStyle = "#7b8794";
  ctx.lineWidth = 11;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Diamond weave
  ctx.beginPath();
  ctx.moveTo(size / 2, 0);
  ctx.lineTo(size, size / 2);
  ctx.lineTo(size / 2, size);
  ctx.lineTo(0, size / 2);
  ctx.closePath();
  ctx.stroke();

  // Subtle metallic sheen highlight on wire
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(size / 2, 3);
  ctx.lineTo(size - 3, size / 2);
  ctx.lineTo(size / 2, size - 3);
  ctx.lineTo(3, size / 2);
  ctx.closePath();
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

export interface PowerPlant {
  group: THREE.Group;
  hitMesh: THREE.Mesh;
  update: (timeMs: number, dt: number) => void;
  setPowerLevel: (kw: number) => void;
  getPowerLevel: () => number;
  toggleArc: () => boolean;
  isArcActive: () => boolean;
  arcLight: THREE.PointLight;
  toggleScientificUpgrade: () => boolean;
  isScientificUpgraded: () => boolean;
}

export function createPowerPlant(): PowerPlant {
  const group = new THREE.Group();
  group.name = "ORRA_HighVoltagePowerPlant";

  // Calibrated industrial materials (strict architectural palette, no uncalibrated saturated hexes)
  const mat = (color: number, metalness = 0, roughness = 0.55, emissive = 0) =>
    new THREE.MeshStandardMaterial({
      color,
      metalness,
      roughness,
      emissive,
      emissiveIntensity: emissive ? 0.45 : 0,
    });

  const concrete = mat(0x40454a, 0.05, 0.85);
  const gravel = mat(0x272a2e, 0.02, 0.95);
  const frame = mat(0x1f2429, 0.72, 0.35);
  const frameEdge = mat(0x6b7782, 0.78, 0.28);
  const galvanized = mat(0x78848f, 0.82, 0.28);
  const machineGrey = mat(0x8a97a0, 0.55, 0.38);
  const darkSteel = mat(0x0c1117, 0.45, 0.30);
  const safetyYellow = mat(0xf59e0b, 0.20, 0.42);
  const safetyRed = mat(0xd92d20, 0.20, 0.40);
  const copper = mat(0xc27838, 0.88, 0.22);
  const aluminumConductor = mat(0xcad6e2, 0.85, 0.22);
  const insulatedCable = mat(0x182026, 0.25, 0.65);
  const barbedWireMat = mat(0x9ca3af, 0.85, 0.25);
  const superconductorGold = mat(0xd97706, 0.90, 0.18);
  const cryoWhite = mat(0xe2e8f0, 0.30, 0.40);
  const transformerOil = mat(0x283038, 0.65, 0.35);
  const ceramicInsulator = mat(0x8b5a2b, 0.30, 0.35);
  const solarCell = mat(0x0a192f, 0.60, 0.18, 0x0f2d4a);
  const telemetryScreen = mat(0x061822, 0.12, 0.20, 0x38bdf8);
  const aviationOrange = mat(0xea580c, 0.15, 0.38);
  const bessContainer = mat(0x242d35, 0.45, 0.45);
  const ledGreen = mat(0x166534, 0.10, 0.20, 0x22c55e);

  const chainLinkTexture = createChainLinkTexture();
  const chainLinkMat = new THREE.MeshStandardMaterial({
    map: chainLinkTexture,
    alphaTest: 0.25,
    transparent: true,
    side: THREE.DoubleSide,
    metalness: 0.78,
    roughness: 0.38,
  });

  const arcPlasmaMat = new THREE.MeshBasicMaterial({
    color: 0xa5f3fc,
    wireframe: true,
  });

  const arcBranchMat = new THREE.MeshBasicMaterial({
    color: 0x67e8f9,
    transparent: true,
    opacity: 0.75,
  });

  const plasmaCoreMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 1.4,
    roughness: 0.15,
  });

  const laserBeamMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.72,
  });

  const box = (
    parent: THREE.Object3D,
    name: string,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    material: THREE.Material = frame
  ) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.castShadow = h > 0.15;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  const cylinder = (
    parent: THREE.Object3D,
    name: string,
    rt: number,
    rb: number,
    h: number,
    segs: number,
    x: number,
    y: number,
    z: number,
    material: THREE.Material = frame
  ) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, segs), material);
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.castShadow = h > 0.2;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  const wireTube = (
    parent: THREE.Object3D,
    name: string,
    start: THREE.Vector3,
    mid: THREE.Vector3,
    end: THREE.Vector3,
    radius: number = 0.016,
    material: THREE.Material = copper
  ): THREE.Mesh => {
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    const geo = new THREE.TubeGeometry(curve, 16, radius, 5, false);
    const mesh = new THREE.Mesh(geo, material);
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. REINFORCED CONCRETE SUBSTATION PLINTH & GRAVEL BALLAST BASINS
  // ─────────────────────────────────────────────────────────────────────────────
  const plinthW = POWER_PLANT_BOUNDS.east - POWER_PLANT_BOUNDS.west; // 28m
  const plinthD = POWER_PLANT_BOUNDS.south - POWER_PLANT_BOUNDS.north; // 36m
  box(
    group,
    "substation-main-plinth",
    plinthW,
    0.35,
    plinthD,
    POWER_PLANT_BOUNDS.centerX,
    0.175,
    POWER_PLANT_BOUNDS.centerZ,
    concrete
  );

  // High-contrast industrial perimeter safety curbing
  box(group, "substation-curb-north", plinthW, 0.16, 0.25, POWER_PLANT_BOUNDS.centerX, 0.43, POWER_PLANT_BOUNDS.north + 0.12, safetyYellow);
  box(group, "substation-curb-south", plinthW, 0.16, 0.25, POWER_PLANT_BOUNDS.centerX, 0.43, POWER_PLANT_BOUNDS.south - 0.12, safetyYellow);
  box(group, "substation-curb-west", 0.25, 0.16, plinthD, POWER_PLANT_BOUNDS.west + 0.12, 0.43, POWER_PLANT_BOUNDS.centerZ, safetyYellow);
  box(group, "substation-curb-east", 0.25, 0.16, plinthD, POWER_PLANT_BOUNDS.east - 0.12, 0.43, POWER_PLANT_BOUNDS.centerZ, safetyYellow);

  // ─────────────────────────────────────────────────────────────────────────────
  // MILITARY-GRADE IRON CHAIN SECURITY FENCE & ACCESS GATES
  // ─────────────────────────────────────────────────────────────────────────────
  const fenceGroup = new THREE.Group();
  fenceGroup.name = "substation-military-security-fence";
  group.add(fenceGroup);

  const fenceW = POWER_PLANT_BOUNDS.west;
  const fenceE = POWER_PLANT_BOUNDS.east;
  const fenceN = POWER_PLANT_BOUNDS.north;
  const fenceS = POWER_PLANT_BOUNDS.south;

  // Helper to construct a textured chain-link fabric panel between two 3D coordinates
  const createChainLinkPanel = (x1: number, z1: number, x2: number, z2: number) => {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    const angle = Math.atan2(dz, dx);
    const panelH = 1.98;
    const geo = new THREE.PlaneGeometry(len, panelH);
    const uCount = len / 0.12;
    const vCount = panelH / 0.12;
    const uvs = geo.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uvs.count; i++) {
      uvs.setXY(i, uvs.getX(i) * uCount, uvs.getY(i) * vCount);
    }
    uvs.needsUpdate = true;
    const mesh = new THREE.Mesh(geo, chainLinkMat);
    mesh.name = "chain-link-mesh-panel";
    mesh.position.set((x1 + x2) / 2, 0.44 + panelH / 2, (z1 + z2) / 2);
    mesh.rotation.y = -angle;
    fenceGroup.add(mesh);
  };

  // Helper to build a structural fence run (posts, top rail, bottom rail, tension wire, mesh panel, outriggers, barbed wire)
  const createFenceRun = (
    startX: number,
    startZ: number,
    endX: number,
    endZ: number,
    postSpacing: number,
    outwardNormal: { x: number; z: number }
  ) => {
    const dx = endX - startX;
    const dz = endZ - startZ;
    const totalLen = Math.hypot(dx, dz);
    const numBays = Math.max(1, Math.round(totalLen / postSpacing));
    const stepX = dx / numBays;
    const stepZ = dz / numBays;

    // 1. Mesh panel
    createChainLinkPanel(startX, startZ, endX, endZ);

    // 2. Continuous horizontal rails
    const midX = (startX + endX) / 2;
    const midZ = (startZ + endZ) / 2;
    const angle = Math.atan2(dz, dx);

    const makeRail = (y: number, radius: number, name: string) => {
      const rail = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius, totalLen, 8),
        galvanized
      );
      rail.name = name;
      rail.position.set(midX, y, midZ);
      rail.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(dx, 0, dz).normalize()
      );
      rail.castShadow = true;
      fenceGroup.add(rail);
    };

    makeRail(2.42, 0.024, "fence-top-rail");
    makeRail(0.44, 0.020, "fence-bottom-tension-rail");

    // 3. Galvanized line posts with concrete footers and caps
    for (let i = 0; i <= numBays; i++) {
      const px = startX + stepX * i;
      const pz = startZ + stepZ * i;

      // Concrete footer pier
      cylinder(fenceGroup, "fence-footer-pier", 0.11, 0.12, 0.18, 12, px, 0.44, pz, concrete);

      // Line post tubular stanchion
      cylinder(fenceGroup, "fence-line-post", 0.042, 0.045, 2.08, 8, px, 1.48, pz, galvanized);

      // Post top cap
      cylinder(fenceGroup, "fence-post-cap", 0.052, 0.048, 0.06, 8, px, 2.53, pz, frameEdge);
    }
  };

  // Build the 4 perimeter runs
  // North side (facing north: out normal is (0, -1))
  createFenceRun(fenceW, fenceN, fenceE, fenceN, 3.5, { x: 0, z: -1 });

  // East side (facing east: out normal is (1, 0))
  createFenceRun(fenceE, fenceN, fenceE, fenceS, 3.6, { x: 1, z: 0 });

  // West side (facing west: out normal is (-1, 0))
  createFenceRun(fenceW, fenceS, fenceW, fenceN, 3.6, { x: -1, z: 0 });

  // South side wings (facing south: out normal is (0, 1))
  const gateWestX = 38.8;
  const gateEastX = 43.2;
  createFenceRun(fenceW, fenceS, gateWestX, fenceS, 3.0, { x: 0, z: 1 });
  createFenceRun(gateEastX, fenceS, fenceE, fenceS, 3.0, { x: 0, z: 1 });

  // Heavy Corner Strainer Posts with 45-degree diagonal knee braces
  const createCornerStrainer = (cx: number, cz: number, dir1: { x: number; z: number }, dir2: { x: number; z: number }) => {
    cylinder(fenceGroup, "corner-strainer-post", 0.065, 0.070, 2.30, 12, cx, 1.50, cz, frameEdge);
    cylinder(fenceGroup, "corner-post-cap", 0.075, 0.075, 0.08, 12, cx, 2.67, cz, galvanized);
    // Diagonal kicker braces
    for (const dir of [dir1, dir2]) {
      const brace = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.75, 8), galvanized);
      brace.position.set(cx + dir.x * 0.65, 1.45, cz + dir.z * 0.65);
      brace.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dir.x, -1.0, dir.z).normalize());
      fenceGroup.add(brace);
    }
  };

  createCornerStrainer(fenceW, fenceN, { x: 1, z: 0 }, { x: 0, z: 1 });
  createCornerStrainer(fenceE, fenceN, { x: -1, z: 0 }, { x: 0, z: 1 });
  createCornerStrainer(fenceE, fenceS, { x: -1, z: 0 }, { x: 0, z: -1 });
  createCornerStrainer(fenceW, fenceS, { x: 1, z: 0 }, { x: 0, z: -1 });

  // ─────────────────────────────────────────────────────────────────────────────
  // MILITARY VEHICULAR & PERSONNEL DOUBLE-LEAF SECURITY GATE
  // ─────────────────────────────────────────────────────────────────────────────
  const gateGroup = new THREE.Group();
  gateGroup.name = "substation-security-gate";
  fenceGroup.add(gateGroup);

  // Heavy gate posts with hazard safety bands
  for (const gx of [gateWestX, gateEastX]) {
    cylinder(gateGroup, "gate-terminal-post", 0.075, 0.080, 2.50, 12, gx, 1.60, fenceS, frameEdge);
    box(gateGroup, "gate-post-hazard-band", 0.17, 0.85, 0.17, gx, 1.60, fenceS, safetyYellow);
    box(gateGroup, "gate-post-stripe-1", 0.175, 0.12, 0.175, gx, 1.40, fenceS, darkSteel);
    box(gateGroup, "gate-post-stripe-2", 0.175, 0.12, 0.175, gx, 1.70, fenceS, darkSteel);

    // Red omnidirectional security beacon lamp atop gate posts
    cylinder(gateGroup, "gate-beacon-base", 0.065, 0.065, 0.08, 12, gx, 2.89, fenceS, darkSteel);
    cylinder(gateGroup, "gate-beacon-lens", 0.055, 0.055, 0.14, 12, gx, 3.00, fenceS, safetyRed);
  }

  // Left Gate Leaf: X in [38.85, 40.95]
  const createGateLeaf = (leftX: number, rightX: number, isLeft: boolean) => {
    const leafW = rightX - leftX;
    const leafMidX = (leftX + rightX) / 2;
    const leafH = 1.95;
    const leafZ = fenceS;

    const leaf = new THREE.Group();
    leaf.name = isLeft ? "gate-leaf-west" : "gate-leaf-east";
    gateGroup.add(leaf);

    // Tubular perimeter frame
    box(leaf, "gate-top-rail", leafW, 0.06, 0.06, leafMidX, 2.40, leafZ, galvanized);
    box(leaf, "gate-bot-rail", leafW, 0.06, 0.06, leafMidX, 0.48, leafZ, galvanized);
    box(leaf, "gate-mid-rail", leafW, 0.04, 0.04, leafMidX, 1.44, leafZ, galvanized);
    box(leaf, "gate-hinge-stile", 0.06, leafH, 0.06, isLeft ? leftX : rightX, 1.44, leafZ, galvanized);
    box(leaf, "gate-meeting-stile", 0.06, leafH, 0.06, isLeft ? rightX : leftX, 1.44, leafZ, galvanized);

    // Diagonal reinforcing gusset strut
    const diag = new THREE.Mesh(new THREE.BoxGeometry(0.04, Math.hypot(leafW, leafH), 0.04), galvanized);
    diag.position.set(leafMidX, 1.44, leafZ);
    diag.rotation.z = isLeft ? Math.atan2(leafH, leafW) : -Math.atan2(leafH, leafW);
    leaf.add(diag);

    // Chain-link mesh infill
    createChainLinkPanel(leftX, leafZ, rightX, leafZ);

    // Heavy barrel hinges
    for (const hy of [0.75, 2.15]) {
      cylinder(leaf, "gate-barrel-hinge", 0.035, 0.035, 0.22, 8, isLeft ? leftX : rightX, hy, leafZ - 0.04, darkSteel);
    }
  };

  createGateLeaf(gateWestX + 0.05, 40.95, true);
  createGateLeaf(41.05, gateEastX - 0.05, false);

  // Central locking hardware: vertical drop cane bolt & steel padlock shroud
  cylinder(gateGroup, "gate-cane-drop-bolt", 0.022, 0.022, 0.75, 8, 40.95, 0.65, fenceS + 0.04, galvanized);
  cylinder(gateGroup, "cane-bolt-sleeve", 0.035, 0.035, 0.24, 8, 40.95, 0.60, fenceS + 0.04, darkSteel);
  box(gateGroup, "padlock-box-shroud", 0.16, 0.22, 0.12, 41.0, 1.44, fenceS + 0.04, darkSteel);

  // High-Voltage Danger Warning Plaque centered on the gate
  const gateSign = new THREE.Group();
  gateSign.position.set(41.0, 1.62, fenceS + 0.05);
  gateGroup.add(gateSign);
  box(gateSign, "gate-hazard-sign-plate", 1.10, 0.58, 0.02, 0, 0, 0, safetyYellow);
  box(gateSign, "gate-hazard-sign-border", 1.04, 0.52, 0.025, 0, 0, 0, darkSteel);
  box(gateSign, "gate-hazard-sign-inner", 0.96, 0.44, 0.03, 0, 0, 0, safetyYellow);
  box(gateSign, "gate-hazard-symbol-bar", 0.35, 0.08, 0.035, 0, 0.10, 0, safetyRed);
  box(gateSign, "gate-hazard-symbol-lightning", 0.08, 0.24, 0.035, 0, -0.06, 0, darkSteel);

  // High-Voltage Warning Plaques on North, West, and East fence perimeters
  const createFencePlaque = (x: number, y: number, z: number, angleY: number) => {
    const plaque = new THREE.Group();
    plaque.position.set(x, y, z);
    plaque.rotation.y = angleY;
    fenceGroup.add(plaque);
    box(plaque, "fence-plaque-backing", 0.75, 0.45, 0.02, 0, 0, 0, safetyYellow);
    box(plaque, "fence-plaque-inner", 0.70, 0.40, 0.025, 0, 0, 0, darkSteel);
    box(plaque, "fence-plaque-badge", 0.62, 0.32, 0.03, 0, 0, 0, safetyYellow);
    box(plaque, "fence-plaque-symbol", 0.06, 0.18, 0.035, 0, 0, 0, safetyRed);
  };

  createFencePlaque(POWER_PLANT_BOUNDS.centerX, 1.55, fenceN - 0.02, Math.PI); // North
  createFencePlaque(fenceW - 0.02, 1.55, POWER_PLANT_BOUNDS.centerZ, -Math.PI / 2); // West
  createFencePlaque(fenceE + 0.02, 1.55, POWER_PLANT_BOUNDS.centerZ, Math.PI / 2); // East

  // Crushed gravel oil-containment ballast beds
  box(group, "gravel-bed-west", 12.0, 0.08, 20.0, POWER_PLANT_BOUNDS.centerX - 6.5, 0.39, POWER_PLANT_BOUNDS.centerZ, gravel);
  box(group, "gravel-curb-west-n", 12.2, 0.14, 0.12, POWER_PLANT_BOUNDS.centerX - 6.5, 0.42, POWER_PLANT_BOUNDS.centerZ - 10.0, frameEdge);
  box(group, "gravel-curb-west-s", 12.2, 0.14, 0.12, POWER_PLANT_BOUNDS.centerX - 6.5, 0.42, POWER_PLANT_BOUNDS.centerZ + 10.0, frameEdge);
  box(group, "gravel-curb-west-w", 0.12, 0.14, 20.0, POWER_PLANT_BOUNDS.centerX - 12.5, 0.42, POWER_PLANT_BOUNDS.centerZ, frameEdge);
  box(group, "gravel-curb-west-e", 0.12, 0.14, 20.0, POWER_PLANT_BOUNDS.centerX - 0.5, 0.42, POWER_PLANT_BOUNDS.centerZ, frameEdge);

  box(group, "gravel-bed-east", 10.5, 0.08, 14.0, POWER_PLANT_BOUNDS.centerX + 6.0, 0.39, POWER_PLANT_BOUNDS.centerZ - 6.5, gravel);
  box(group, "gravel-curb-east-n", 10.7, 0.14, 0.12, POWER_PLANT_BOUNDS.centerX + 6.0, 0.42, POWER_PLANT_BOUNDS.centerZ - 13.5, frameEdge);
  box(group, "gravel-curb-east-s", 10.7, 0.14, 0.12, POWER_PLANT_BOUNDS.centerX + 6.0, 0.42, POWER_PLANT_BOUNDS.centerZ + 0.5, frameEdge);
  box(group, "gravel-curb-east-w", 0.12, 0.14, 14.0, POWER_PLANT_BOUNDS.centerX + 0.7, 0.42, POWER_PLANT_BOUNDS.centerZ - 6.5, frameEdge);
  box(group, "gravel-curb-east-e", 0.12, 0.14, 14.0, POWER_PLANT_BOUNDS.centerX + 11.3, 0.42, POWER_PLANT_BOUNDS.centerZ - 6.5, frameEdge);

  // Copper grounding busbar grid running through ballast beds
  box(group, "earth-copper-bus-1", 11.5, 0.02, 0.04, POWER_PLANT_BOUNDS.centerX - 6.5, 0.44, POWER_PLANT_BOUNDS.centerZ - 6.5, copper);
  box(group, "earth-copper-bus-2", 11.5, 0.02, 0.04, POWER_PLANT_BOUNDS.centerX - 6.5, 0.44, POWER_PLANT_BOUNDS.centerZ + 6.5, copper);
  box(group, "earth-copper-bus-3", 0.04, 0.02, 13.5, POWER_PLANT_BOUNDS.centerX + 6.0, 0.44, POWER_PLANT_BOUNDS.centerZ - 6.5, copper);

  cylinder(group, "earth-well-1", 0.16, 0.16, 0.06, 12, POWER_PLANT_BOUNDS.centerX - 12.0, 0.43, POWER_PLANT_BOUNDS.centerZ - 6.5, safetyYellow);
  cylinder(group, "earth-well-2", 0.16, 0.16, 0.06, 12, POWER_PLANT_BOUNDS.centerX - 12.0, 0.43, POWER_PLANT_BOUNDS.centerZ + 6.5, safetyYellow);
  cylinder(group, "earth-well-3", 0.16, 0.16, 0.06, 12, POWER_PLANT_BOUNDS.centerX + 11.0, 0.43, POWER_PLANT_BOUNDS.centerZ - 6.5, safetyYellow);

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. TWIN 100 kW ROTARY TURBOGENERATORS & FLUID AUXILIARIES
  // ─────────────────────────────────────────────────────────────────────────────
  const turbineSpinners: THREE.Mesh[] = [];

  const createTurbogenerator = (x: number, z: number, id: number) => {
    const gen = new THREE.Group();
    gen.name = `turbogenerator-unit-${id}`;
    gen.position.set(x, 0.35, z);
    group.add(gen);

    box(gen, "generator-bedplate", 6.4, 0.45, 3.4, 0, 0.225, 0, darkSteel);
    for (const sx of [-2.6, 0, 2.6]) {
      for (const sz of [-1.3, 1.3]) {
        cylinder(gen, "vibration-damper-spring", 0.18, 0.18, 0.25, 8, sx, 0.125, sz, copper);
        cylinder(gen, "damper-tie-bolt", 0.04, 0.04, 0.35, 6, sx, 0.175, sz, frameEdge);
      }
    }

    cylinder(gen, "turbine-casing", 1.05, 1.05, 3.2, 24, -1.2, 1.45, 0, machineGrey).rotation.z = Math.PI / 2;
    for (const bx of [-2.2, -1.2, -0.2]) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(1.08, 0.025, 8, 24), frameEdge);
      band.rotation.y = Math.PI / 2;
      band.position.set(bx, 1.45, 0);
      gen.add(band);
    }

    for (let r = 0; r < 8; r++) {
      const angle = (r * Math.PI) / 4;
      const fin = box(gen, "cooling-strake", 2.8, 0.04, 0.18, -1.2, 1.45 + Math.cos(angle) * 1.08, Math.sin(angle) * 1.08, frameEdge);
      fin.rotation.x = angle;
    }

    box(gen, "alternator-housing", 2.4, 1.9, 2.2, 1.5, 1.35, 0, transformerOil);
    cylinder(gen, "stator-copper-core", 0.82, 0.82, 1.8, 16, 1.5, 1.35, 0, copper).rotation.z = Math.PI / 2;
    box(gen, "alternator-grille", 0.05, 1.4, 1.6, 2.72, 1.35, 0, frame);

    const spinner = cylinder(gen, "turbine-tach-disc", 0.22, 0.22, 0.04, 12, -2.85, 1.45, 0, copper);
    spinner.rotation.z = Math.PI / 2;
    turbineSpinners.push(spinner);

    for (const ez of [-0.65, 0.65]) {
      cylinder(gen, "exhaust-silencer-sleeve", 0.38, 0.38, 1.4, 16, -1.8, 2.8, ez, machineGrey);
      cylinder(gen, "exhaust-stack", 0.26, 0.26, 4.2, 16, -1.8, 3.8, ez, frame);
      cylinder(gen, "exhaust-rain-flapper", 0.32, 0.32, 0.08, 16, -1.8, 5.95, ez, frameEdge);
    }

    box(gen, "air-intake-housing", 1.4, 0.75, 1.1, -1.2, 2.75, 0, machineGrey);
    for (let l = 0; l < 4; l++) {
      box(gen, "intake-louver", 1.25, 0.03, 0.08, -1.2, 2.55 + l * 0.14, 0.56, frameEdge);
    }

    box(gen, "terminal-junction-box", 0.85, 0.75, 0.85, 1.5, 2.65, 0, machineGrey);
    for (const bz of [-0.25, 0, 0.25]) {
      cylinder(gen, "terminal-bushing", 0.06, 0.09, 0.55, 8, 1.5, 3.25, bz, ceramicInsulator);
    }

    cylinder(gen, "fuel-gas-pipe", 0.06, 0.06, 2.8, 8, -0.6, 0.7, 1.85, safetyYellow).rotation.x = Math.PI / 2;
    cylinder(gen, "fuel-gas-pipe-riser", 0.06, 0.06, 1.1, 8, -0.6, 1.25, 0.45, safetyYellow);
    box(gen, "fuel-gas-regulator", 0.32, 0.25, 0.32, -0.6, 0.7, 1.85, machineGrey);
    cylinder(gen, "fuel-gas-regulator-dome", 0.22, 0.22, 0.12, 12, -0.6, 0.86, 1.85, machineGrey);
    cylinder(gen, "gas-ball-valve-lever", 0.02, 0.02, 0.25, 6, -0.6, 0.95, 1.25, safetyRed).rotation.z = Math.PI / 2;
    cylinder(gen, "fuel-pressure-gauge", 0.08, 0.08, 0.03, 12, -0.6, 0.85, 2.05, frameEdge);

    box(gen, "lube-oil-cooler-fin-pack", 0.85, 1.2, 0.55, 1.6, 0.85, -1.85, machineGrey);
    for (let f = 0; f < 6; f++) {
      box(gen, "oil-cooler-fin", 0.75, 0.03, 0.45, 1.6, 0.45 + f * 0.16, -1.85, frameEdge);
    }
    cylinder(gen, "lube-oil-pump-motor", 0.18, 0.18, 0.45, 12, 2.2, 0.55, -1.85, darkSteel).rotation.z = Math.PI / 2;
    cylinder(gen, "oil-pipe-return", 0.05, 0.05, 1.2, 8, 1.6, 0.55, -1.35, copper).rotation.x = Math.PI / 2;
  };

  createTurbogenerator(POWER_PLANT_BOUNDS.centerX - 6.5, POWER_PLANT_BOUNDS.centerZ - 6.5, 1);
  createTurbogenerator(POWER_PLANT_BOUNDS.centerX - 6.5, POWER_PLANT_BOUNDS.centerZ + 6.5, 2);

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. HIGH-VOLTAGE STEP-UP INDUCTION COILS & OIL TRANSFORMER SUBSTATION
  // ─────────────────────────────────────────────────────────────────────────────
  const transformerYard = new THREE.Group();
  transformerYard.name = "induction-transformer-yard";
  transformerYard.position.set(POWER_PLANT_BOUNDS.centerX + 5.5, 0.35, POWER_PLANT_BOUNDS.centerZ - 7.5);
  group.add(transformerYard);

  box(transformerYard, "transformer-tank", 4.4, 2.6, 2.8, 0, 1.3, 0, transformerOil);
  box(transformerYard, "oil-conservator-drum", 0.85, 0.85, 3.4, 0, 3.0, 0, machineGrey).rotation.x = Math.PI / 2;
  cylinder(transformerYard, "silica-gel-breather-pipe", 0.04, 0.04, 1.2, 8, 0.35, 2.6, 1.5, frameEdge);
  cylinder(transformerYard, "buchholz-relay-housing", 0.12, 0.12, 0.22, 8, 0, 2.7, 0, copper);

  for (const rz of [-1.55, 1.55]) {
    for (let fin = 0; fin < 8; fin++) {
      const fx = -1.6 + fin * 0.45;
      box(transformerYard, "radiator-fin", 0.04, 1.8, 0.65, fx, 1.3, rz, frameEdge);
    }
  }

  for (const cx of [-2.8, 2.8]) {
    const coilTower = new THREE.Group();
    coilTower.name = "high-voltage-induction-coil-tower";
    coilTower.position.set(cx, 0, 0);
    transformerYard.add(coilTower);

    cylinder(coilTower, "coil-base-plinth", 0.85, 0.95, 0.35, 16, 0, 0.175, 0, darkSteel);
    cylinder(coilTower, "coil-winding-body", 0.65, 0.65, 3.2, 20, 0, 1.95, 0, copper);
    for (let w = 0; w < 10; w++) {
      const wy = 0.55 + w * 0.28;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.70, 0.035, 8, 24), copper);
      ring.name = "coil-copper-turn";
      ring.rotation.x = Math.PI / 2;
      ring.position.set(0, wy, 0);
      coilTower.add(ring);
    }

    const toroid = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.28, 12, 32), frameEdge);
    toroid.name = "toroid-top-load";
    toroid.rotation.x = Math.PI / 2;
    toroid.position.set(0, 3.65, 0);
    coilTower.add(toroid);

    for (let b = 0; b < 4; b++) {
      const by = 0.6 + b * 0.45;
      cylinder(coilTower, "ceramic-bell-disc", 0.38, 0.28, 0.18, 12, 0, by, 0.95, ceramicInsulator);
    }
  }

  for (let sa = 0; sa < 3; sa++) {
    const sx = -1.2 + sa * 1.2;
    const arrester = new THREE.Group();
    arrester.name = `surge-arrester-phase-${sa + 1}`;
    arrester.position.set(sx, 0, -1.8);
    transformerYard.add(arrester);

    cylinder(arrester, "arrester-base", 0.18, 0.18, 0.3, 8, 0, 0.15, 0, darkSteel);
    cylinder(arrester, "arrester-porcelain-body", 0.10, 0.10, 2.2, 12, 0, 1.4, 0, ceramicInsulator);
    for (let s = 0; s < 6; s++) {
      cylinder(arrester, "arrester-shed", 0.22, 0.14, 0.08, 12, 0, 0.6 + s * 0.28, 0, ceramicInsulator);
    }
    const coronaRing = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.025, 8, 16), frameEdge);
    coronaRing.rotation.x = Math.PI / 2;
    coronaRing.position.set(0, 2.55, 0);
    arrester.add(coronaRing);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. 3-PHASE AIR-BREAK DISCONNECT SWITCH GANTRY (GANG ISOLATORS)
  // ─────────────────────────────────────────────────────────────────────────────
  const disconnectGantry = new THREE.Group();
  disconnectGantry.name = "air-break-disconnect-gantry";
  disconnectGantry.position.set(POWER_PLANT_BOUNDS.centerX + 7.5, 0.35, POWER_PLANT_BOUNDS.centerZ + 0.5);
  group.add(disconnectGantry);

  for (const gx of [-2.0, 2.0]) {
    cylinder(disconnectGantry, "gantry-leg", 0.08, 0.08, 3.8, 8, gx, 1.9, 0, galvanized);
    box(disconnectGantry, "gantry-foot-plate", 0.45, 0.08, 0.45, gx, 0.04, 0, darkSteel);
  }
  box(disconnectGantry, "gantry-beam", 4.6, 0.16, 0.25, 0, 3.8, 0, galvanized);

  for (let phase = 0; phase < 3; phase++) {
    const px = -1.4 + phase * 1.4;
    const isoGroup = new THREE.Group();
    isoGroup.position.set(px, 3.88, 0);
    disconnectGantry.add(isoGroup);

    cylinder(isoGroup, "iso-insulator-hinge", 0.11, 0.14, 0.75, 8, 0, 0.375, -0.35, ceramicInsulator);
    cylinder(isoGroup, "iso-insulator-jaw", 0.11, 0.14, 0.75, 8, 0, 0.375, 0.35, ceramicInsulator);

    const blade = box(isoGroup, "knife-switch-blade", 0.04, 0.08, 0.75, 0, 0.78, 0, copper);
    blade.rotation.x = -0.12;
    box(isoGroup, "contact-jaw-terminal", 0.12, 0.12, 0.14, 0, 0.80, 0.35, frameEdge);
    cylinder(isoGroup, "corona-cap", 0.08, 0.08, 0.06, 12, 0, 0.88, -0.35, frameEdge);
  }
  cylinder(disconnectGantry, "torque-operating-tube", 0.045, 0.045, 3.6, 8, 0, 3.65, -0.35, galvanized).rotation.z = Math.PI / 2;
  cylinder(disconnectGantry, "crank-vertical-rod", 0.03, 0.03, 2.4, 8, 2.0, 2.4, -0.35, galvanized);
  box(disconnectGantry, "manual-crank-handle", 0.06, 0.25, 0.15, 2.0, 1.2, -0.30, safetyYellow);

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. THE ELECTRIC ARC (JACOB'S LADDER PLASMA DISCHARGER)
  // ─────────────────────────────────────────────────────────────────────────────
  const arcStand = new THREE.Group();
  arcStand.name = "electric-arc-jacobs-ladder";
  arcStand.position.set(POWER_PLANT_BOUNDS.centerX + 3.0, 0.35, POWER_PLANT_BOUNDS.centerZ);
  group.add(arcStand);

  box(arcStand, "arc-pedestal", 1.8, 0.65, 1.2, 0, 0.325, 0, darkSteel);
  box(arcStand, "arc-pedestal-rim", 1.84, 0.08, 1.24, 0, 0.65, 0, safetyYellow);

  cylinder(arcStand, "arc-ceramic-post-left", 0.14, 0.18, 0.65, 12, -0.45, 0.975, 0, ceramicInsulator);
  cylinder(arcStand, "arc-ceramic-post-right", 0.14, 0.18, 0.65, 12, 0.45, 0.975, 0, ceramicInsulator);

  const ballLeft = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), copper);
  ballLeft.position.set(-0.16, 1.35, 0);
  arcStand.add(ballLeft);
  const ballRight = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), copper);
  ballRight.position.set(0.16, 1.35, 0);
  arcStand.add(ballRight);

  const hornLeft = cylinder(arcStand, "arc-horn-left", 0.035, 0.035, 3.4, 8, -0.45, 2.85, 0, copper);
  hornLeft.rotation.z = -0.16;
  const hornRight = cylinder(arcStand, "arc-horn-right", 0.035, 0.035, 3.4, 8, 0.45, 2.85, 0, copper);
  hornRight.rotation.z = 0.16;

  const arcSegmentsCount = 8;
  const arcLinePositions = new Float32Array(arcSegmentsCount * 3);
  const arcGeometry = new THREE.BufferGeometry();
  arcGeometry.setAttribute("position", new THREE.BufferAttribute(arcLinePositions, 3));
  const arcMesh = new THREE.Line(arcGeometry, arcPlasmaMat);
  arcMesh.name = "electric-arc-plasma-line";
  arcStand.add(arcMesh);

  const branchSegmentsCount = 6;
  const branchPositions = new Float32Array(branchSegmentsCount * 3);
  const branchGeometry = new THREE.BufferGeometry();
  branchGeometry.setAttribute("position", new THREE.BufferAttribute(branchPositions, 3));
  const branchMesh = new THREE.Line(branchGeometry, arcBranchMat);
  branchMesh.name = "electric-arc-plasma-branch";
  arcStand.add(branchMesh);

  const arcLight = new THREE.PointLight(0x38bdf8, 4.8, 24, 1.5);
  arcLight.name = "electric-arc-strobe-light";
  arcLight.position.set(0, 2.8, 0);
  arcStand.add(arcLight);

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. 100 kWh CONTAINERIZED BATTERY ENERGY STORAGE SYSTEM (BESS)
  // ─────────────────────────────────────────────────────────────────────────────
  const bessContainerGroup = new THREE.Group();
  bessContainerGroup.name = "containerized-bess-unit";
  bessContainerGroup.position.set(POWER_PLANT_BOUNDS.centerX - 6.5, 0.35, POWER_PLANT_BOUNDS.north + 4.5);
  group.add(bessContainerGroup);

  const bessFanSpinners: THREE.Mesh[] = [];

  box(bessContainerGroup, "bess-iso-shell", 6.2, 2.45, 2.4, 0, 1.225, 0, bessContainer);
  box(bessContainerGroup, "bess-corner-frame-top-n", 6.24, 0.12, 0.12, 0, 2.45, -1.2, frame);
  box(bessContainerGroup, "bess-corner-frame-top-s", 6.24, 0.12, 0.12, 0, 2.45, 1.2, frame);
  box(bessContainerGroup, "bess-corner-frame-bot-n", 6.24, 0.12, 0.12, 0, 0.06, -1.2, frame);
  box(bessContainerGroup, "bess-corner-frame-bot-s", 6.24, 0.12, 0.12, 0, 0.06, 1.2, frame);

  for (let rib = -12; rib <= 12; rib++) {
    const rx = rib * 0.24;
    box(bessContainerGroup, "bess-corrugation-rib-s", 0.08, 2.2, 0.05, rx, 1.25, 1.22, frame);
    box(bessContainerGroup, "bess-corrugation-rib-n", 0.08, 2.2, 0.05, rx, 1.25, -1.22, frame);
  }

  box(bessContainerGroup, "bess-door-recess", 0.05, 2.1, 2.1, 3.12, 1.25, 0, darkSteel);
  cylinder(bessContainerGroup, "bess-door-lockbar-1", 0.025, 0.025, 2.0, 8, 3.16, 1.25, -0.45, frameEdge);
  cylinder(bessContainerGroup, "bess-door-lockbar-2", 0.025, 0.025, 2.0, 8, 3.16, 1.25, 0.45, frameEdge);
  box(bessContainerGroup, "bess-door-cam-latch", 0.04, 0.18, 0.14, 3.18, 1.25, -0.45, safetyYellow);

  box(bessContainerGroup, "bess-hazard-plate", 0.02, 0.45, 0.95, 3.16, 1.85, 0, safetyYellow);
  box(bessContainerGroup, "bess-warning-symbol", 0.03, 0.25, 0.35, 3.17, 1.85, 0, darkSteel);

  box(bessContainerGroup, "bess-soc-frame", 0.04, 0.95, 0.22, 3.15, 1.25, 0.85, darkSteel);
  for (let bar = 0; bar < 5; bar++) {
    box(bessContainerGroup, `bess-soc-bar-${bar}`, 0.05, 0.12, 0.16, 3.16, 0.92 + bar * 0.16, 0.85, ledGreen);
  }

  for (const hvacX of [-1.6, 1.6]) {
    const hvac = new THREE.Group();
    hvac.name = "bess-hvac-condenser";
    hvac.position.set(hvacX, 2.45, 0);
    bessContainerGroup.add(hvac);

    box(hvac, "hvac-cabinet", 1.8, 0.65, 1.4, 0, 0.325, 0, machineGrey);
    cylinder(hvac, "hvac-fan-shroud", 0.52, 0.52, 0.15, 16, 0, 0.725, 0, darkSteel);

    const fanAssembly = new THREE.Group();
    fanAssembly.position.set(0, 0.725, 0);
    hvac.add(fanAssembly);
    for (let b = 0; b < 4; b++) {
      const angle = (b * Math.PI) / 2;
      const blade = box(fanAssembly, "condenser-fan-blade", 0.42, 0.02, 0.12, Math.cos(angle) * 0.22, 0, Math.sin(angle) * 0.22, frameEdge);
      blade.rotation.y = angle;
    }
    bessFanSpinners.push(fanAssembly as unknown as THREE.Mesh);
  }

  for (const fz of [-0.4, 0.4]) {
    cylinder(bessContainerGroup, "fire-suppression-cylinder", 0.16, 0.16, 1.4, 12, -3.25, 0.85, fz, safetyRed);
    cylinder(bessContainerGroup, "fire-cylinder-valve", 0.04, 0.04, 0.2, 8, -3.25, 1.65, fz, copper);
  }
  cylinder(bessContainerGroup, "fire-manifold-pipe", 0.035, 0.035, 1.1, 8, -3.25, 1.75, 0, safetyRed).rotation.x = Math.PI / 2;

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. HIGH-VOLTAGE POWER FACTOR CORRECTION CAPACITOR BANK
  // ─────────────────────────────────────────────────────────────────────────────
  const capBank = new THREE.Group();
  capBank.name = "power-factor-capacitor-bank";
  capBank.position.set(POWER_PLANT_BOUNDS.centerX + 7.5, 0.35, POWER_PLANT_BOUNDS.north + 4.5);
  group.add(capBank);

  box(capBank, "cap-rack-base", 3.8, 0.12, 1.4, 0, 0.06, 0, darkSteel);
  box(capBank, "cap-rack-tier-1", 3.8, 0.08, 1.4, 0, 1.4, 0, galvanized);
  box(capBank, "cap-rack-tier-2", 3.8, 0.08, 1.4, 0, 2.7, 0, galvanized);
  for (const cx of [-1.8, 1.8]) {
    for (const cz of [-0.65, 0.65]) {
      cylinder(capBank, "cap-rack-post", 0.06, 0.06, 2.7, 8, cx, 1.35, cz, galvanized);
    }
  }

  for (let tier = 0; tier < 2; tier++) {
    const ty = 0.14 + tier * 1.34;
    for (let c = 0; c < 3; c++) {
      const cx = -1.1 + c * 1.1;
      const can = new THREE.Group();
      can.position.set(cx, ty, 0);
      capBank.add(can);

      box(can, "cap-can-body", 0.55, 0.95, 0.45, 0, 0.475, 0, machineGrey);
      cylinder(can, "cap-bushing-1", 0.05, 0.07, 0.35, 8, -0.14, 1.12, 0, ceramicInsulator);
      cylinder(can, "cap-bushing-2", 0.05, 0.07, 0.35, 8, 0.14, 1.12, 0, ceramicInsulator);
      cylinder(can, "hrc-fuse-link", 0.02, 0.02, 0.28, 8, 0, 1.38, 0, copper).rotation.z = Math.PI / 2;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 8. MASSIVE BI-FACIAL TRACKING SOLAR PHOTOVOLTAIC ARRAY (SOLAR PANELS)
  // ─────────────────────────────────────────────────────────────────────────────
  const solarTrackers: THREE.Group[] = [];

  const createSolarTracker = (x: number, z: number, id: number) => {
    const tracker = new THREE.Group();
    tracker.name = `solar-tracker-array-${id}`;
    tracker.position.set(x, 0.35, z);
    group.add(tracker);

    cylinder(tracker, "tracker-pier", 0.35, 0.35, 0.5, 12, 0, 0.25, 0, concrete);
    cylinder(tracker, "tracker-mast", 0.18, 0.18, 2.2, 12, 0, 1.35, 0, frame);
    box(tracker, "gearbox-hub", 0.65, 0.55, 0.65, 0, 2.45, 0, machineGrey);

    const torqueTube = new THREE.Group();
    torqueTube.name = "solar-tilt-assembly";
    torqueTube.position.set(0, 2.45, 0);
    torqueTube.rotation.x = -Math.PI / 6;
    tracker.add(torqueTube);
    solarTrackers.push(torqueTube);

    cylinder(torqueTube, "torque-tube", 0.12, 0.12, 9.6, 12, 0, 0, 0, frameEdge).rotation.z = Math.PI / 2;

    for (let col = -3; col <= 2; col++) {
      for (const row of [-1.15, 1.15]) {
        const px = col * 1.55 + 0.75;
        box(torqueTube, "pv-frame", 1.48, 0.05, 2.15, px, 0.08, row, frame);
        box(torqueTube, "pv-cell-glass", 1.42, 0.02, 2.08, px, 0.11, row, solarCell);
        box(torqueTube, "pv-busbar-1", 1.40, 0.005, 0.02, px, 0.125, row - 0.45, frameEdge);
        box(torqueTube, "pv-busbar-2", 1.40, 0.005, 0.02, px, 0.125, row + 0.45, frameEdge);
      }
    }

    box(tracker, "solar-string-inverter", 0.72, 0.95, 0.35, 0, 1.25, 0.35, machineGrey);
    box(tracker, "inverter-display", 0.28, 0.14, 0.02, 0, 1.45, 0.53, telemetryScreen);
    cylinder(tracker, "inverter-conduit", 0.05, 0.05, 1.0, 8, 0, 0.5, 0.35, copper);

    if (id === 1) {
      const weatherMast = new THREE.Group();
      weatherMast.position.set(0, 2.45, 4.5);
      tracker.add(weatherMast);
      cylinder(weatherMast, "weather-mast-pole", 0.03, 0.03, 1.6, 8, 0, 0.8, 0, galvanized);
      cylinder(weatherMast, "anemometer-hub", 0.06, 0.06, 0.08, 8, 0, 1.6, 0, darkSteel);
      for (let c = 0; c < 3; c++) {
        const ca = (c * Math.PI * 2) / 3;
        cylinder(weatherMast, "cup-arm", 0.015, 0.015, 0.22, 6, Math.cos(ca) * 0.11, 1.6, Math.sin(ca) * 0.11, frameEdge).rotation.y = ca;
      }
      cylinder(weatherMast, "pyranometer-body", 0.08, 0.08, 0.12, 12, 0.25, 1.4, 0, machineGrey);
      new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), frameEdge).position.set(0.25, 1.48, 0);
    }
  };

  createSolarTracker(POWER_PLANT_BOUNDS.centerX - 6.5, POWER_PLANT_BOUNDS.centerZ + 12.0, 1);
  createSolarTracker(POWER_PLANT_BOUNDS.centerX + 6.5, POWER_PLANT_BOUNDS.centerZ + 12.0, 2);

  // ─────────────────────────────────────────────────────────────────────────────
  // 9. 100 kW MICRO-GRID TELEMETRY CONSOLE & SWITCHGEAR KIOSK
  // ─────────────────────────────────────────────────────────────────────────────
  const consoleKiosk = new THREE.Group();
  consoleKiosk.name = "micro-grid-command-kiosk";
  consoleKiosk.position.set(POWER_PLANT_BOUNDS.centerX, 0.35, POWER_PLANT_BOUNDS.south - 3.2);
  group.add(consoleKiosk);

  box(consoleKiosk, "kiosk-base-deck", 5.2, 0.18, 3.2, 0, 0.09, 0, concrete);
  for (const cx of [-2.4, 2.4]) {
    for (const cz of [-1.4, 1.4]) {
      cylinder(consoleKiosk, "canopy-column", 0.06, 0.06, 2.8, 8, cx, 1.4, cz, frame);
    }
  }
  box(consoleKiosk, "canopy-roof", 5.6, 0.12, 3.6, 0, 2.85, 0, frame);
  box(consoleKiosk, "canopy-fascia-hazard", 5.62, 0.08, 3.62, 0, 2.82, 0, safetyYellow);

  const mainConsole = new THREE.Group();
  mainConsole.name = "telemetry-console-desk";
  mainConsole.position.set(0, 0.18, 0);
  consoleKiosk.add(mainConsole);

  box(mainConsole, "console-desk-body", 3.8, 1.15, 1.2, 0, 0.575, 0, frame);
  box(mainConsole, "console-turret-bezel", 3.6, 0.95, 0.25, 0, 1.625, -0.45, darkSteel);

  box(mainConsole, "generation-display-100kw", 1.6, 0.72, 0.02, -0.9, 1.625, -0.32, telemetryScreen);
  box(mainConsole, "grid-synchronizer-display", 1.6, 0.72, 0.02, 0.9, 1.625, -0.32, telemetryScreen);

  for (let led = 0; led < 6; led++) {
    const lx = -1.5 + led * 0.6;
    box(mainConsole, "telemetry-status-led", 0.14, 0.04, 0.02, lx, 1.05, 0.45, led % 2 === 0 ? safetyYellow : telemetryScreen);
  }

  box(mainConsole, "governor-dial-plate", 0.22, 0.04, 0.22, 0.8, 1.17, 0.2, machineGrey);
  cylinder(mainConsole, "governor-rotary-knob", 0.08, 0.08, 0.08, 12, 0.8, 1.22, 0.2, frameEdge);
  box(mainConsole, "grid-estop-collar", 0.18, 0.06, 0.18, -0.8, 1.17, 0.2, safetyYellow);
  cylinder(mainConsole, "grid-estop-mushroom", 0.09, 0.09, 0.07, 12, -0.8, 1.23, 0.2, safetyYellow);

  for (const bx of [-1.2, 0, 1.2]) {
    box(consoleKiosk, "vacuum-circuit-breaker-cabinet", 0.95, 2.1, 0.85, bx, 1.23, -1.2, machineGrey);
    cylinder(consoleKiosk, "breaker-insulator", 0.07, 0.07, 0.45, 8, bx, 2.5, -1.2, ceramicInsulator);
  }

  cylinder(consoleKiosk, "kiosk-fire-extinguisher", 0.09, 0.09, 0.65, 12, -2.2, 1.35, 0, safetyRed);
  cylinder(consoleKiosk, "extinguisher-hose", 0.02, 0.02, 0.45, 6, -2.1, 1.3, 0, darkSteel);
  cylinder(consoleKiosk, "rescue-hook-pole", 0.03, 0.03, 2.2, 8, 2.25, 1.4, 0, safetyYellow);
  new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.025, 8, 16), safetyYellow).position.set(2.25, 2.45, 0);

  // ─────────────────────────────────────────────────────────────────────────────
  // 10. OVERHEAD TRANSMISSION LATTICE PYLONS & WIRINGS
  // ─────────────────────────────────────────────────────────────────────────────
  const pylon = new THREE.Group();
  pylon.name = "substation-transmission-pylon";
  pylon.position.set(POWER_PLANT_BOUNDS.east - 2.5, 0.35, POWER_PLANT_BOUNDS.centerZ);
  group.add(pylon);

  for (const lx of [-0.9, 0.9]) {
    for (const lz of [-0.9, 0.9]) {
      cylinder(pylon, "pylon-leg", 0.07, 0.12, 8.8, 8, lx, 4.4, lz, galvanized);
    }
  }
  for (let brace = 0; brace < 4; brace++) {
    const by = 1.6 + brace * 1.8;
    box(pylon, "pylon-brace-x1", 1.8, 0.05, 0.05, 0, by, -0.9, frameEdge);
    box(pylon, "pylon-brace-x2", 1.8, 0.05, 0.05, 0, by, 0.9, frameEdge);
    box(pylon, "pylon-brace-z1", 0.05, 0.05, 1.8, -0.9, by, 0, frameEdge);
    box(pylon, "pylon-brace-z2", 0.05, 0.05, 1.8, 0.9, by, 0, frameEdge);
  }

  for (const armY of [6.2, 7.8]) {
    box(pylon, "pylon-crossarm", 4.8, 0.18, 0.22, 0, armY, 0, frameEdge);
    for (const ax of [-2.2, 0, 2.2]) {
      cylinder(pylon, "suspension-insulator-string", 0.12, 0.16, 0.85, 8, ax, armY - 0.45, 0, ceramicInsulator);
    }
  }

  cylinder(pylon, "pylon-lightning-peak-mast", 0.04, 0.06, 1.8, 8, 0, 9.4, 0, frameEdge);

  // ─────────────────────────────────────────────────────────────────────────────
  // 10. HIGH-VOLTAGE SUBSTATION GRID WIRINGS & 3-PHASE BUSBAR DISTRIBUTION
  // ─────────────────────────────────────────────────────────────────────────────
  const wiringGroup = new THREE.Group();
  wiringGroup.name = "substation-engineered-wiring-system";
  group.add(wiringGroup);

  // 1. DEDICATED OVERHEAD 3-PHASE RIGID TUBULAR BUSBAR GANTRY
  // Two structural gantry portal frames spanning along the switchyard
  const busGantryZ = [-60.5, -52.5];
  for (let g = 0; g < busGantryZ.length; g++) {
    const gz = busGantryZ[g];
    const gantry = new THREE.Group();
    gantry.position.set(0, 0.35, gz);
    wiringGroup.add(gantry);

    // Upright galvanized columns
    for (const gx of [45.0, 51.0]) {
      cylinder(gantry, "bus-gantry-column", 0.09, 0.12, 5.2, 8, gx, 2.6, 0, galvanized);
      box(gantry, "bus-gantry-footplate", 0.45, 0.08, 0.45, gx, 0.04, 0, darkSteel);
    }
    // Heavy crossbeam spanning the switchyard
    box(gantry, "bus-gantry-crossbeam", 6.8, 0.20, 0.25, 48.0, 5.2, 0, galvanized);

    // 3 Porcelain post insulator stacks on crossbeam (Phases A, B, C)
    for (let p = 0; p < 3; p++) {
      const px = 46.5 + p * 1.5;
      cylinder(gantry, "bus-post-insulator", 0.08, 0.11, 0.38, 8, px, 5.49, 0, ceramicInsulator);
      box(gantry, "bus-conductor-clamp", 0.14, 0.08, 0.14, px, 5.72, 0, frameEdge);
    }
  }

  // 3 Rigid horizontal aluminum tubular busbars (Phase A, B, C)
  // Aligned strictly along Z, spanning from Z = -63.5 to Z = -51.5 (12m long)
  const busY = 5.72;
  const busLen = 12.0;
  for (let p = 0; p < 3; p++) {
    const px = 46.5 + p * 1.5;
    const busbar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.024, 0.024, busLen, 12),
      aluminumConductor
    );
    busbar.name = `hv-rigid-busbar-phase-${["A", "B", "C"][p]}`;
    busbar.position.set(px, busY, -57.5);
    busbar.rotation.x = Math.PI / 2;
    busbar.castShadow = true;
    wiringGroup.add(busbar);

    // Corona end-bells on each busbar tip
    cylinder(wiringGroup, "bus-corona-bell-n", 0.06, 0.024, 0.08, 12, px, busY, -57.5 - busLen / 2, aluminumConductor);
    cylinder(wiringGroup, "bus-corona-bell-s", 0.024, 0.06, 0.08, 12, px, busY, -57.5 + busLen / 2, aluminumConductor);
  }

  // 2. LOW/MEDIUM VOLTAGE GENERATOR FEEDER CABLE TRAYS & CONDUCTORS
  // Elevated cable ladder running along X = 37.0 connecting Turbogenerator 1 and 2
  box(wiringGroup, "gen-feeder-cable-tray", 0.55, 0.12, 16.0, 37.0, 4.4, -53.0, galvanized);
  cylinder(wiringGroup, "tray-support-post-1", 0.05, 0.05, 4.0, 8, 37.0, 2.4, -59.5, galvanized);
  cylinder(wiringGroup, "tray-support-post-2", 0.05, 0.05, 4.0, 8, 37.0, 2.4, -53.0, galvanized);
  cylinder(wiringGroup, "tray-support-post-3", 0.05, 0.05, 4.0, 8, 37.0, 2.4, -46.5, galvanized);

  // Generator 1 (North) 3-phase bundled copper feeder cables
  for (let p = 0; p < 3; p++) {
    const pz = -59.75 + p * 0.25;
    wireTube(
      wiringGroup,
      `gen1-feeder-lead-${p + 1}`,
      new THREE.Vector3(36.0, 3.6, pz),
      new THREE.Vector3(36.4, 4.2, pz),
      new THREE.Vector3(37.0, 4.48, -59.0 + p * 0.12),
      0.018,
      copper
    );
  }

  // Generator 2 (South) 3-phase bundled copper feeder cables
  for (let p = 0; p < 3; p++) {
    const pz = -46.75 + p * 0.25;
    wireTube(
      wiringGroup,
      `gen2-feeder-lead-${p + 1}`,
      new THREE.Vector3(36.0, 3.6, pz),
      new THREE.Vector3(36.4, 4.2, pz),
      new THREE.Vector3(37.0, 4.48, -47.0 - p * 0.12),
      0.018,
      copper
    );
  }

  // Converged feeder bus duct crossing eastward to Step-Up Transformer primary
  box(wiringGroup, "transformer-primary-bus-duct", 7.0, 0.35, 0.45, 40.5, 4.4, -53.0, machineGrey);
  wireTube(
    wiringGroup,
    "transformer-primary-feed-cable",
    new THREE.Vector3(44.0, 4.4, -53.0),
    new THREE.Vector3(44.0, 3.6, -56.5),
    new THREE.Vector3(44.0, 3.1, -60.5),
    0.035,
    insulatedCable
  );

  // 3. STEP-UP TRANSFORMER HIGH-VOLTAGE DROPPERS TO OVERHEAD BUSBARS
  // 3 porcelain bushings atop transformer at Z = -60.5, Y = 3.8m
  for (let p = 0; p < 3; p++) {
    const px = 46.5 + p * 1.5;
    // Upward arcing dropper jumper from transformer bushing to busbar clamp
    wireTube(
      wiringGroup,
      `transformer-hv-dropper-${p + 1}`,
      new THREE.Vector3(px, 3.8, -60.5),
      new THREE.Vector3(px - 0.25, 4.8, -60.5),
      new THREE.Vector3(px, busY, -60.5),
      0.016,
      copper
    );

    // Surge arrester tap lead connecting busbar directly down to surge arrester corona ring
    wireTube(
      wiringGroup,
      `surge-arrester-tap-${p + 1}`,
      new THREE.Vector3(px, busY, -62.3),
      new THREE.Vector3(px + 0.08, 4.1, -62.3),
      new THREE.Vector3(px, 2.9, -62.3),
      0.012,
      copper
    );
  }

  // 4. AIR-BREAK DISCONNECT SWITCH DROPPERS & EXPANSION JUMPERS
  // From overhead busbars down into the 3-phase disconnect gang switch at Z = -52.5
  for (let p = 0; p < 3; p++) {
    const busPx = 46.5 + p * 1.5;
    const switchPx = 47.1 + p * 1.4;
    wireTube(
      wiringGroup,
      `disconnect-switch-dropper-${p + 1}`,
      new THREE.Vector3(busPx, busY, -52.5),
      new THREE.Vector3(switchPx + 0.15, 5.1, -52.5),
      new THREE.Vector3(switchPx, 4.65, -52.85),
      0.016,
      copper
    );
  }

  // 5. POWER FACTOR CAPACITOR BANK FUSED DROPPERS
  // Dropping from northern busbar end (Z = -63.5) to capacitor rack at (48.5, 0.35, -66.5)
  for (let p = 0; p < 3; p++) {
    const busPx = 46.5 + p * 1.5;
    const capPx = 47.4 + p * 1.1;
    wireTube(
      wiringGroup,
      `cap-bank-dropper-${p + 1}`,
      new THREE.Vector3(busPx, busY, -63.5),
      new THREE.Vector3(capPx, 4.5, -64.8),
      new THREE.Vector3(capPx, 3.1, -66.5),
      0.014,
      copper
    );
  }


  // ─────────────────────────────────────────────────────────────────────────────
  // 11. SUBSTATION WORKING FLOODLIGHT STANCHIONS
  // ─────────────────────────────────────────────────────────────────────────────
  const floodlightPositions = [
    { x: POWER_PLANT_BOUNDS.west + 1.8, z: POWER_PLANT_BOUNDS.north + 2.0 },
    { x: POWER_PLANT_BOUNDS.east - 1.8, z: POWER_PLANT_BOUNDS.north + 2.0 },
    { x: POWER_PLANT_BOUNDS.west + 1.8, z: POWER_PLANT_BOUNDS.south - 2.0 },
    { x: POWER_PLANT_BOUNDS.east - 1.8, z: POWER_PLANT_BOUNDS.south - 2.0 },
  ];

  for (let i = 0; i < floodlightPositions.length; i++) {
    const pos = floodlightPositions[i];
    const stanchion = new THREE.Group();
    stanchion.name = `substation-floodlight-mast-${i + 1}`;
    stanchion.position.set(pos.x, 0.35, pos.z);
    group.add(stanchion);

    box(stanchion, "mast-flange-base", 0.45, 0.08, 0.45, 0, 0.04, 0, darkSteel);
    cylinder(stanchion, "mast-tubular-pole", 0.09, 0.14, 5.2, 8, 0, 2.64, 0, galvanized);
    box(stanchion, "mast-crossarm", 0.85, 0.08, 0.12, 0, 5.24, 0, frameEdge);
    for (const fx of [-0.32, 0.32]) {
      const head = box(stanchion, "floodlight-fixture", 0.28, 0.18, 0.24, fx, 5.34, 0.12, darkSteel);
      head.rotation.x = 0.45;
      box(head, "floodlight-lens", 0.24, 0.14, 0.02, 0, 0, 0.13, telemetryScreen);
    }
  }

  const yardFillLight = new THREE.PointLight(0xe0f2fe, 0.75, 45, 1.8);
  yardFillLight.name = "substation-yard-fill-light";
  yardFillLight.position.set(POWER_PLANT_BOUNDS.centerX, 6.0, POWER_PLANT_BOUNDS.centerZ);
  group.add(yardFillLight);

  // ─────────────────────────────────────────────────────────────────────────────
  // 12. SCIENTIFIC UPGRADE: TOROIDAL MAGNETIC CONFINEMENT / PLASMA PINCH CORE
  // ─────────────────────────────────────────────────────────────────────────────
  const plasmaCoreGroup = new THREE.Group();
  plasmaCoreGroup.name = "toroidal-plasma-pinch-core";
  plasmaCoreGroup.position.set(POWER_PLANT_BOUNDS.centerX, 0.35, POWER_PLANT_BOUNDS.centerZ - 4.5);
  group.add(plasmaCoreGroup);

  // Heavy octagonal support plinth
  cylinder(plasmaCoreGroup, "plasma-core-base", 1.8, 1.95, 0.45, 8, 0, 0.225, 0, darkSteel);
  cylinder(plasmaCoreGroup, "plasma-core-ring-bezel", 1.6, 1.6, 0.12, 16, 0, 0.51, 0, superconductorGold);

  // Transparent quartz vacuum chamber envelope
  cylinder(plasmaCoreGroup, "plasma-quartz-envelope", 1.45, 1.45, 1.4, 24, 0, 1.25, 0, frame);

  // Rotating toroidal relativistic plasma pinch
  const plasmaTorusGeo = new THREE.TorusGeometry(0.78, 0.14, 16, 48);
  const plasmaTorus = new THREE.Mesh(plasmaTorusGeo, plasmaCoreMat);
  plasmaTorus.name = "plasma-pinch-torus";
  plasmaTorus.position.set(0, 1.25, 0);
  plasmaCoreGroup.add(plasmaTorus);

  // 8 Superconducting Poloidal Magnetic Field Coils wrapped around the torus
  for (let c = 0; c < 8; c++) {
    const angle = (c * Math.PI) / 4;
    const coil = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.045, 8, 24), superconductorGold);
    coil.position.set(Math.cos(angle) * 0.78, 1.25, Math.sin(angle) * 0.78);
    coil.rotation.y = angle;
    plasmaCoreGroup.add(coil);
  }

  // Liquid helium vacuum-jacketed cryogenic feed lines & turbomolecular pump
  cylinder(plasmaCoreGroup, "turbo-pump-housing", 0.28, 0.28, 0.65, 12, 1.15, 0.75, 0.85, cryoWhite);
  cylinder(plasmaCoreGroup, "cryo-vacuum-line", 0.05, 0.05, 1.4, 8, 0.65, 0.65, 0.5, superconductorGold).rotation.x = Math.PI / 4;

  // Dedicated core plasma illumination
  const plasmaLight = new THREE.PointLight(0x38bdf8, 2.5, 16, 1.6);
  plasmaLight.name = "plasma-core-glow";
  plasmaLight.position.set(0, 1.25, 0);
  plasmaCoreGroup.add(plasmaLight);

  // ─────────────────────────────────────────────────────────────────────────────
  // 13. SCIENTIFIC UPGRADE: DIRECTED-ENERGY OPTICAL LASER POWER BEAM EMITTER
  // ─────────────────────────────────────────────────────────────────────────────
  const laserTurret = new THREE.Group();
  laserTurret.name = "optical-power-beam-emitter";
  laserTurret.position.set(POWER_PLANT_BOUNDS.east - 2.5, 9.8, POWER_PLANT_BOUNDS.centerZ);
  group.add(laserTurret);

  // Motorized gimbal housing & aperture lens
  cylinder(laserTurret, "gimbal-base", 0.45, 0.55, 0.35, 12, 0, 0.175, 0, darkSteel);
  cylinder(laserTurret, "gimbal-optical-barrel", 0.32, 0.38, 0.65, 16, 0, 0.65, 0, machineGrey);
  cylinder(laserTurret, "aperture-focusing-lens", 0.26, 0.26, 0.06, 16, 0, 0.98, 0, telemetryScreen);

  // Photonic accelerator ring collars
  for (let r = 0; r < 3; r++) {
    const pRing = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.025, 8, 20), superconductorGold);
    pRing.rotation.x = Math.PI / 2;
    pRing.position.set(0, 0.45 + r * 0.18, 0);
    laserTurret.add(pRing);
  }

  // Collimated 140m Vertical Laser Beam (Projected into the deep cosmos toward orbit)
  const beamGeo = new THREE.CylinderGeometry(0.14, 0.18, 140, 16);
  const beamMesh = new THREE.Mesh(beamGeo, laserBeamMat);
  beamMesh.name = "orbital-optical-power-beam";
  beamMesh.position.set(0, 71.0, 0);
  beamMesh.visible = false; // Ignites when scientific mode is engaged
  laserTurret.add(beamMesh);

  const beamLight = new THREE.PointLight(0x0ea5e9, 0, 35, 1.2);
  beamLight.position.set(0, 1.5, 0);
  laserTurret.add(beamLight);

  // ─────────────────────────────────────────────────────────────────────────────
  // 14. SCIENTIFIC UPGRADE: CRYOGENIC SUPERCONDUCTING SMES WELL (4.2 KELVIN)
  // ─────────────────────────────────────────────────────────────────────────────
  const smesGroup = new THREE.Group();
  smesGroup.name = "cryogenic-smes-well";
  smesGroup.position.set(POWER_PLANT_BOUNDS.centerX, 0.35, POWER_PLANT_BOUNDS.north + 4.5);
  group.add(smesGroup);

  // Circular stainless steel cryostat manhole lid with 16 vacuum bolts
  cylinder(smesGroup, "smes-cryostat-rim", 1.25, 1.35, 0.22, 16, 0, 0.11, 0, darkSteel);
  cylinder(smesGroup, "smes-cryostat-hatch", 1.15, 1.15, 0.12, 24, 0, 0.28, 0, frameEdge);
  for (let b = 0; b < 12; b++) {
    const ba = (b * Math.PI * 2) / 12;
    cylinder(smesGroup, "cryo-bolt", 0.025, 0.025, 0.06, 6, Math.cos(ba) * 1.05, 0.35, Math.sin(ba) * 1.05, galvanized);
  }

  // Vacuum-insulated transfer pipes with white frost collars
  cylinder(smesGroup, "cryo-supply-line-1", 0.06, 0.06, 1.8, 8, -0.65, 0.65, 0, cryoWhite).rotation.z = Math.PI / 4;
  cylinder(smesGroup, "cryo-supply-line-2", 0.06, 0.06, 1.8, 8, 0.65, 0.65, 0, cryoWhite).rotation.z = -Math.PI / 4;
  cylinder(smesGroup, "frost-relief-vent", 0.04, 0.04, 1.4, 8, 0, 0.95, -0.55, frameEdge);

  // Digital cryogenic telemetry display: "4.2 K LIQUID He"
  box(smesGroup, "cryo-temp-display-bezel", 0.65, 0.28, 0.08, 0, 0.45, 0.75, darkSteel);
  box(smesGroup, "cryo-temp-display-screen", 0.55, 0.18, 0.02, 0, 0.45, 0.80, telemetryScreen);

  // ─────────────────────────────────────────────────────────────────────────────
  // 15. SCIENTIFIC UPGRADE: MAGNETOHYDRODYNAMIC (MHD) CHANNEL
  // ─────────────────────────────────────────────────────────────────────────────
  const mhdGroup = new THREE.Group();
  mhdGroup.name = "mhd-plasma-channel";
  mhdGroup.position.set(POWER_PLANT_BOUNDS.centerX - 1.2, 0.35, POWER_PLANT_BOUNDS.centerZ - 6.5);
  group.add(mhdGroup);

  // Rectangular ceramic-lined plasma acceleration channel
  box(mhdGroup, "mhd-channel-body", 3.2, 0.65, 0.85, 0, 0.95, 0, machineGrey);
  // Transverse superconducting saddle magnet coil pair
  box(mhdGroup, "mhd-saddle-magnet-top", 2.4, 0.22, 1.15, 0, 1.38, 0, superconductorGold);
  box(mhdGroup, "mhd-saddle-magnet-bot", 2.4, 0.22, 1.15, 0, 0.52, 0, superconductorGold);
  // Heavy copper electrode taps for direct DC power extraction
  cylinder(mhdGroup, "mhd-electrode-tap-1", 0.06, 0.06, 0.55, 8, 0.45, 1.25, 0.55, copper);
  cylinder(mhdGroup, "mhd-electrode-tap-2", 0.06, 0.06, 0.55, 8, -0.45, 1.25, 0.55, copper);

  // ─────────────────────────────────────────────────────────────────────────────
  // 16. SCIENTIFIC UPGRADE: DEEP-KEEL QUANTUM GEOTHERMAL WELLS
  // ─────────────────────────────────────────────────────────────────────────────
  const keelWell = new THREE.Group();
  keelWell.name = "keel-quantum-thermoelectric-well";
  keelWell.position.set(POWER_PLANT_BOUNDS.west + 3.0, 0.35, POWER_PLANT_BOUNDS.centerZ);
  group.add(keelWell);

  // Borehole pressure casing penetrating down through the island's basalt keel
  cylinder(keelWell, "borehole-flange", 0.75, 0.85, 0.28, 12, 0, 0.14, 0, darkSteel);
  cylinder(keelWell, "borehole-head", 0.55, 0.55, 0.85, 12, 0, 0.65, 0, machineGrey);
  // 4 braided thermal superconducting ribbons
  for (let r = 0; r < 4; r++) {
    const ra = (r * Math.PI) / 2;
    cylinder(keelWell, "thermal-ribbon", 0.04, 0.04, 0.75, 8, Math.cos(ra) * 0.35, 1.15, Math.sin(ra) * 0.35, superconductorGold);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 17. INTERACTIVE HITBOX (CLICK TO FOCUS POWER GRID)
  // ─────────────────────────────────────────────────────────────────────────────
  const hitGeo = new THREE.BoxGeometry(plinthW, 4.5, plinthD);
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  const hitMesh = new THREE.Mesh(hitGeo, hitMat);
  hitMesh.name = "power-grid-interactive-hitbox";
  hitMesh.position.set(POWER_PLANT_BOUNDS.centerX, 2.25, POWER_PLANT_BOUNDS.centerZ);
  (hitMesh as unknown as { isInteractiveStation: boolean; stationId: string }).isInteractiveStation = true;
  (hitMesh as unknown as { isInteractiveStation: boolean; stationId: string }).stationId = "power-grid";
  group.add(hitMesh);

  // ─────────────────────────────────────────────────────────────────────────────
  // 18. ANIMATION LOOP & INTERACTIVE STATE
  // ─────────────────────────────────────────────────────────────────────────────
  let powerLevelKw = 100;
  let arcActive = true;
  let scientificUpgraded = false;
  let arcClimbHeight = 0;

  const update = (timeMs: number, dt: number) => {
    // Turbogenerator shaft spinning
    const spinRate = (powerLevelKw / 100) * dt * 35;
    for (const spinner of turbineSpinners) {
      spinner.rotation.y += spinRate;
    }

    // BESS HVAC Condenser fans spinning
    const hvacFanRate = dt * 24;
    for (const fan of bessFanSpinners) {
      fan.rotation.y += hvacFanRate;
    }

    // Solar tracker slow celestial tracking
    for (const tracker of solarTrackers) {
      tracker.rotation.x = -Math.PI / 6 + Math.sin(timeMs * 0.00015) * 0.12;
    }

    // Scientific Toroidal Plasma Pinch Rotation & Dynamic Core Luminance
    const plasmaSpinSpeed = scientificUpgraded ? 9.5 : 1.2;
    plasmaTorus.rotation.z += dt * plasmaSpinSpeed;
    plasmaTorus.rotation.y += dt * (plasmaSpinSpeed * 0.5);
    if (scientificUpgraded) {
      plasmaLight.intensity = 3.6 + Math.sin(timeMs * 0.007) * 0.9;
      beamMesh.visible = true;
      beamLight.intensity = 3.2;
      beamMesh.rotation.y += dt * 1.5;
    } else {
      plasmaLight.intensity = 1.2;
      beamMesh.visible = false;
      beamLight.intensity = 0;
    }

    // Electric Arc Plasma dynamic climbing & spark jitter
    if (arcActive) {
      const arcSpeed = scientificUpgraded ? 2.6 : 1.8;
      arcClimbHeight = (arcClimbHeight + dt * arcSpeed) % 2.6; // Climbs up the Jacob's ladder
      const baseHeight = 1.6 + arcClimbHeight;
      const hornSpan = 0.28 + arcClimbHeight * 0.26; // Horns spread out as they climb

      const positions = arcGeometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < arcSegmentsCount; i++) {
        const t = i / (arcSegmentsCount - 1);
        const px = -hornSpan / 2 + t * hornSpan;
        const jitterX = (Math.random() - 0.5) * (scientificUpgraded ? 0.12 : 0.08);
        const jitterY = (Math.random() - 0.5) * (scientificUpgraded ? 0.16 : 0.12);
        const jitterZ = (Math.random() - 0.5) * (scientificUpgraded ? 0.12 : 0.08);
        positions.setXYZ(i, px + jitterX, baseHeight + jitterY, jitterZ);
      }
      positions.needsUpdate = true;
      arcMesh.visible = true;

      // Secondary branching plasma tendril
      const branchPos = branchGeometry.attributes.position as THREE.BufferAttribute;
      const midPointIdx = Math.floor(arcSegmentsCount / 2);
      const startX = positions.getX(midPointIdx);
      const startY = positions.getY(midPointIdx);
      const startZ = positions.getZ(midPointIdx);
      for (let b = 0; b < branchSegmentsCount; b++) {
        const bt = b / (branchSegmentsCount - 1);
        const bx = startX + bt * (Math.random() > 0.5 ? 0.4 : -0.4) + (Math.random() - 0.5) * 0.08;
        const by = startY + bt * 0.45 + (Math.random() - 0.5) * 0.10;
        const bz = startZ + (Math.random() - 0.5) * 0.10;
        branchPos.setXYZ(b, bx, by, bz);
      }
      branchPos.needsUpdate = true;
      branchMesh.visible = Math.random() > 0.25;

      const flicker = 0.7 + Math.random() * 0.6;
      arcLight.intensity = (powerLevelKw / 100) * 4.8 * flicker;
      arcLight.position.y = baseHeight;
    } else {
      arcMesh.visible = false;
      branchMesh.visible = false;
      arcLight.intensity = 0;
    }
  };

  const setPowerLevel = (kw: number) => {
    powerLevelKw = THREE.MathUtils.clamp(kw, 0, scientificUpgraded ? 1200 : 120);
  };

  const getPowerLevel = () => powerLevelKw;

  const toggleArc = () => {
    arcActive = !arcActive;
    return arcActive;
  };

  const isArcActive = () => arcActive;

  const toggleScientificUpgrade = () => {
    scientificUpgraded = !scientificUpgraded;
    if (scientificUpgraded) {
      powerLevelKw = 1000; // 1.0 MW Scientific Generation Core
    } else {
      powerLevelKw = 100; // 100 kW Nominal Industrial Grid
    }
    return scientificUpgraded;
  };

  const isScientificUpgraded = () => scientificUpgraded;

  return {
    group,
    hitMesh,
    update,
    setPowerLevel,
    getPowerLevel,
    toggleArc,
    isArcActive,
    arcLight,
    toggleScientificUpgrade,
    isScientificUpgraded,
  };
}
