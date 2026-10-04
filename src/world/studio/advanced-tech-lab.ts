import * as THREE from "three";

/**
 * ORRA — Advanced Tech Lab: Deep 3-Tier Cryogenic Power Core (Year 3036)
 * ======================================================================
 * Copyright (c) 2026 Kayode. All rights reserved.
 *
 * Faceted architectural research hall featuring:
 * - A 3-tier concentric stepped sunken pit with 0.70m visible vertical depth.
 *   Three distinct rings and heights (Tier 1 @ +0.55m, Tier 2 @ +0.12m, Tier 3 @ -0.15m).
 * - Central Year 3036 Cryogenic Quantum Power System anchored in the deep pit floor,
 *   featuring counter-rotating magnetic stator rings, seismic isolation dampers,
 *   braided coolant manifold piping, and an internal axial emitter needle.
 * - Subtle subterranean conduit raceway with smoked-glass inspection portholes
 *   revealing illuminated fiber bundles and high-voltage conduits diving into bedrock.
 * - Freestanding monolithic glass telemetry console at the south approach.
 * - Atmospheric illumination radiating organically from the subterranean core.
 */

export const LAB_BOUNDS = {
  west: -21,
  east: 15,
  south: -28.988,
  north: -55.288,
  spineX: -3.15,
  corridorStart: -2.3,
  corridorWidth: 3.6,
} as const;

export const LAB_Z_SHIFT = 15.012;

export interface AdvancedTechLab {
  group: THREE.Group;
  update: (timeMs: number, dt: number) => void;
  lights: Array<{ group: THREE.Group; bulb: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>; light: THREE.PointLight }>;
}

export function createAdvancedTechLab(): AdvancedTechLab {
  const group = new THREE.Group();
  group.name = "ORRA_AdvancedTechLab";

  const coreX = LAB_BOUNDS.spineX;
  const coreZ = (LAB_BOUNDS.south + LAB_BOUNDS.north) / 2;

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. HIGH-TECH ARCHITECTURAL MATERIALS (YEAR 3036 CRYOGENIC SYSTEM)
  // ─────────────────────────────────────────────────────────────────────────────
  const titanium = new THREE.MeshStandardMaterial({
    color: 0x2e3846,
    metalness: 0.88,
    roughness: 0.26,
  });

  const graphite = new THREE.MeshStandardMaterial({
    color: 0x161e27,
    metalness: 0.80,
    roughness: 0.38,
  });

  const darkSteel = new THREE.MeshStandardMaterial({
    color: 0x0c131c,
    metalness: 0.92,
    roughness: 0.22,
  });

  const stainless = new THREE.MeshStandardMaterial({
    color: 0xdce2e6,
    metalness: 0.94,
    roughness: 0.16,
  });

  const gold = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    metalness: 0.92,
    roughness: 0.18,
  });

  const copper = new THREE.MeshStandardMaterial({
    color: 0xb98150,
    metalness: 0.85,
    roughness: 0.28,
  });

  const cryoGlow = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 2.2,
    roughness: 0.20,
  });

  const subtleConduitGlow = new THREE.MeshStandardMaterial({
    color: 0x0369a1,
    emissive: 0x0284c7,
    emissiveIntensity: 0.45,
    roughness: 0.40,
  });

  const amberGlow = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 1.8,
    roughness: 0.25,
  });

  const cryoGlass = new THREE.MeshPhysicalMaterial({
    color: 0xbae6fd,
    transparent: true,
    opacity: 0.34,
    roughness: 0.05,
    metalness: 0.10,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const smokedGlass = new THREE.MeshPhysicalMaterial({
    color: 0x0a141d,
    transparent: true,
    opacity: 0.68,
    roughness: 0.12,
    metalness: 0.20,
    depthWrite: false,
  });

  const subtleConduitCover = new THREE.MeshStandardMaterial({
    color: 0x1a212b,
    metalness: 0.82,
    roughness: 0.32,
  });

  const tierLipGlow = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0369a1,
    emissiveIntensity: 1.1,
    roughness: 0.30,
  });

  const fiberCyan = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  const fiberAmber = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });

  const ceramicWhite = new THREE.MeshStandardMaterial({
    color: 0xebedf0,
    roughness: 0.45,
    metalness: 0.15,
  });

  const hudCyan = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 2.8,
    roughness: 0.15,
  });

  const hudAmber = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xd97706,
    emissiveIntensity: 2.2,
    roughness: 0.20,
  });

  const safetyYellow = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    metalness: 0.25,
    roughness: 0.35,
  });

  const safetyRed = new THREE.MeshStandardMaterial({
    color: 0xd9383a,
    metalness: 0.30,
    roughness: 0.30,
  });

  const bioGreen = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    emissive: 0x059669,
    emissiveIntensity: 1.8,
    roughness: 0.20,
  });

  const surgicalGlow = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xf8fafc,
    emissiveIntensity: 2.5,
    roughness: 0.10,
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. 3-TIER CONCENTRIC SUNKEN PIT (DEEP 3-RING ARCHITECTURE)
  // ─────────────────────────────────────────────────────────────────────────────
  // Tier 1 (Outer Raised Rim & Collar): R = 4.2m, Height Y = +0.55m
  // Tier 2 (Middle Observation Deck):  R = 2.8m, Height Y = +0.12m
  // Tier 3 (Deep Inner Core Pit Well): R = 1.8m, Depth  Y = -0.15m
  // Total stepped vertical drop of 0.70m creates immediate, bold 3D depth from orbit
  const pitGroup = new THREE.Group();
  pitGroup.name = "sunken-containment-well";
  pitGroup.position.set(coreX, 0, coreZ);
  group.add(pitGroup);

  const r1 = 4.2;  // Outer rim radius
  const r2 = 2.8;  // Middle tier radius
  const r3 = 1.8;  // Deep well radius

  const h1 = 0.55;  // Tier 1 elevated rim height
  const h2 = 0.12;  // Tier 2 intermediate deck height
  const d3 = -0.15; // Tier 3 deep well floor depth

  // ── TIER 1: ELEVATED CONTAINMENT COLLAR & UPPER CONCENTRIC RING (+0.55m) ──
  // Outer perimeter wall rising from floor (Y = 0) to elevated rim (+0.55m)
  const outerWall = new THREE.Mesh(
    new THREE.CylinderGeometry(r1, r1, h1, 48, 1, true),
    graphite
  );
  outerWall.name = "pit-tier-1-outer-wall";
  outerWall.position.set(0, h1 / 2, 0);
  pitGroup.add(outerWall);

  // Raised architectural containment bezel / coaming rim at top (+0.55m)
  const surfaceBezel = new THREE.Mesh(
    new THREE.RingGeometry(r1 - 0.22, r1 + 0.08, 48),
    titanium
  );
  surfaceBezel.name = "pit-containment-bezel";
  surfaceBezel.rotation.x = -Math.PI / 2;
  surfaceBezel.position.set(0, h1 + 0.001, 0);
  pitGroup.add(surfaceBezel);

  // Outer safety warning telemetry ring at rim
  const surfaceHazardRing = new THREE.Mesh(
    new THREE.RingGeometry(r1 - 0.22, r1 - 0.14, 48),
    tierLipGlow
  );
  surfaceHazardRing.name = "pit-telemetry-hazard-ring";
  surfaceHazardRing.rotation.x = -Math.PI / 2;
  surfaceHazardRing.position.set(0, h1 + 0.002, 0);
  pitGroup.add(surfaceHazardRing);

  // Laser-etched azimuth sector dividers and fine radial tick marks on rim
  for (let t = 0; t < 12; t++) {
    const angle = (t * Math.PI * 2) / 12;
    const isCardinal = t % 3 === 0;
    const tickLen = isCardinal ? 0.26 : 0.14;
    const tickW = isCardinal ? 0.024 : 0.012;
    const tickMat = isCardinal ? tierLipGlow : darkSteel;
    const tick = new THREE.Mesh(
      new THREE.BoxGeometry(tickW, 0.004, tickLen),
      tickMat
    );
    tick.name = `azimuth-tick-${t * 30}`;
    const tickR = r1 - 0.08;
    tick.position.set(Math.cos(angle) * tickR, h1 + 0.003, Math.sin(angle) * tickR);
    tick.rotation.y = -angle;
    pitGroup.add(tick);
  }

  // 4 Radial architectural access steps bridging floor (0.0) up to rim (+0.55m)
  for (let s = 0; s < 4; s++) {
    const angle = (s * Math.PI) / 2;
    for (let step = 0; step < 3; step++) {
      const stepH = (h1 / 3) * (step + 1);
      const stepR = r1 + 0.55 - step * 0.18;
      const stepMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, stepH, 0.24),
        titanium
      );
      stepMesh.position.set(
        Math.cos(angle) * stepR,
        stepH / 2,
        Math.sin(angle) * stepR
      );
      stepMesh.rotation.y = -angle;
      pitGroup.add(stepMesh);

      // Dark carbon non-slip tread plate on step surface
      const tread = new THREE.Mesh(
        new THREE.BoxGeometry(0.82, 0.006, 0.18),
        graphite
      );
      tread.position.set(
        Math.cos(angle) * stepR,
        stepH + 0.003,
        Math.sin(angle) * stepR
      );
      tread.rotation.y = -angle;
      pitGroup.add(tread);
    }
  }

  // Wall 1: Plunges down from Tier 1 rim (+0.55m) to Tier 2 deck (+0.12m)
  const wall1H = h1 - h2;
  const wall1 = new THREE.Mesh(
    new THREE.CylinderGeometry(r1 - 0.22, r1 - 0.22, wall1H, 48, 1, true),
    darkSteel
  );
  wall1.name = "pit-tier-1-wall";
  wall1.position.set(0, (h1 + h2) / 2, 0);
  pitGroup.add(wall1);

  // Shelf 1: Parapet walkway at rim level
  const shelf1 = new THREE.Mesh(
    new THREE.RingGeometry(r1 - 0.22, r1, 48),
    darkSteel
  );
  shelf1.name = "pit-tier-1-shelf";
  shelf1.rotation.x = -Math.PI / 2;
  shelf1.position.set(0, h1, 0);
  shelf1.receiveShadow = true;
  pitGroup.add(shelf1);

  // Under-lip cyan glow ring at Tier 1 inner lip
  const lipGlow1 = new THREE.Mesh(
    new THREE.RingGeometry(r1 - 0.24, r1 - 0.20, 48),
    tierLipGlow
  );
  lipGlow1.rotation.x = -Math.PI / 2;
  lipGlow1.position.set(0, h1 - 0.01, 0);
  pitGroup.add(lipGlow1);

  // ── TIER 2: INTERMEDIATE OBSERVATION DECK & CONCENTRIC RING (+0.12m) ──
  // Shelf 2: Annular walkway deck from r3 (1.8m) to (r1 - 0.22m = 3.98m) at Y = +0.12m
  const shelf2 = new THREE.Mesh(
    new THREE.RingGeometry(r3, r1 - 0.22, 48),
    darkSteel
  );
  shelf2.name = "pit-tier-2-shelf";
  shelf2.rotation.x = -Math.PI / 2;
  shelf2.position.set(0, h2, 0);
  shelf2.receiveShadow = true;
  pitGroup.add(shelf2);

  // Radial expansion joints on Tier 2 deck (12 precision sector divisions)
  for (let j = 0; j < 12; j++) {
    const angle = (j * Math.PI * 2) / 12;
    const jointLen = (r1 - 0.22) - r3;
    const jointMidR = r3 + jointLen / 2;
    const joint = new THREE.Mesh(
      new THREE.BoxGeometry(0.018, 0.005, jointLen),
      graphite
    );
    joint.position.set(Math.cos(angle) * jointMidR, h2 + 0.003, Math.sin(angle) * jointMidR);
    joint.rotation.y = -angle;
    pitGroup.add(joint);
  }

  // Glowing perimeter band along Tier 2 inner edge
  const lipGlow2 = new THREE.Mesh(
    new THREE.RingGeometry(r3 + 0.02, r3 + 0.08, 48),
    tierLipGlow
  );
  lipGlow2.rotation.x = -Math.PI / 2;
  lipGlow2.position.set(0, h2 + 0.002, 0);
  pitGroup.add(lipGlow2);

  // 6 Vertical magnetic stabilizer pylons standing on Tier 2 deck
  for (let p = 0; p < 6; p++) {
    const angle = (p * Math.PI * 2) / 6;
    const pylonR = r2;
    const pylon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.09, 0.55, 12),
      titanium
    );
    pylon.position.set(Math.cos(angle) * pylonR, h2 + 0.275, Math.sin(angle) * pylonR);
    pitGroup.add(pylon);

    // Indicator node atop each pylon
    const node = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 12, 12),
      cryoGlow
    );
    node.position.set(Math.cos(angle) * pylonR, h2 + 0.55 + 0.045, Math.sin(angle) * pylonR);
    pitGroup.add(node);
  }

  // Wall 2: Plunges down from Tier 2 (+0.12m) to Deep Pit Floor (-0.15m)
  const wall2H = h2 - d3;
  const wall2 = new THREE.Mesh(
    new THREE.CylinderGeometry(r3, r3, wall2H, 48, 1, true),
    graphite
  );
  wall2.name = "pit-tier-2-wall";
  wall2.position.set(0, (h2 + d3) / 2, 0);
  pitGroup.add(wall2);

  // ── TIER 3: DEEP SUNKEN INNER PIT WELL & FLOOR (-0.15m) ──
  // Deep Sunken Floor Disc at Y = -0.15m
  const floor3 = new THREE.Mesh(
    new THREE.CylinderGeometry(r3, r3, 0.06, 48),
    darkSteel
  );
  floor3.name = "pit-tier-3-floor";
  floor3.position.set(0, d3, 0);
  floor3.receiveShadow = true;
  pitGroup.add(floor3);

  // Wall 3 lining collar
  const wall3 = new THREE.Mesh(
    new THREE.CylinderGeometry(r3 - 0.05, r3 - 0.05, 0.12, 48, 1, true),
    titanium
  );
  wall3.name = "pit-tier-3-wall";
  wall3.position.set(0, d3 + 0.06, 0);
  pitGroup.add(wall3);

  // Concentric radial ventilation plates in deep floor
  const ventDisc = new THREE.Mesh(
    new THREE.RingGeometry(0.7, r3 - 0.15, 36),
    graphite
  );
  ventDisc.rotation.x = -Math.PI / 2;
  ventDisc.position.set(0, d3 + 0.035, 0);
  pitGroup.add(ventDisc);

  // 6 Heavy Seismic / Magnetic Suspension Dampers cradling the core mount above bedrock
  for (let d = 0; d < 6; d++) {
    const angle = (d * Math.PI * 2) / 6 + Math.PI / 6;
    const damperR = 1.45;
    const damperGroup = new THREE.Group();
    damperGroup.name = `cryo-isolation-damper-${d + 1}`;
    damperGroup.position.set(Math.cos(angle) * damperR, d3 + 0.03, Math.sin(angle) * damperR);
    damperGroup.rotation.y = -angle;

    // Anchor mounting foot
    const foot = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.06, 0.22),
      darkSteel
    );
    foot.position.y = 0.03;
    damperGroup.add(foot);

    // Hydraulic damper cylinder
    const piston = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.18, 12),
      stainless
    );
    piston.position.set(0, 0.12, 0);
    damperGroup.add(piston);

    // Copper compression coil around shaft
    const spring = new THREE.Mesh(
      new THREE.CylinderGeometry(0.052, 0.052, 0.12, 12, 1, true),
      copper
    );
    spring.position.set(0, 0.12, 0);
    damperGroup.add(spring);

    pitGroup.add(damperGroup);
  }

  // Subterranean vertical maintenance ladder running down all 3 tiers on south wall
  const ladderGroup = new THREE.Group();
  ladderGroup.name = "pit-subterranean-ladder";
  ladderGroup.position.set(0, 0, r3 - 0.10);
  pitGroup.add(ladderGroup);

  const numRungs = 10;
  for (let r = 0; r < numRungs; r++) {
    const ry = d3 + 0.08 + (r * (h1 - d3 - 0.12)) / numRungs;
    const rung = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.016, 0.44, 8),
      stainless
    );
    rung.rotation.z = Math.PI / 2;
    rung.position.set(0, ry, 0);
    ladderGroup.add(rung);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. YEAR 3036 CRYOGENIC POWER SYSTEM (3 RINGS & 3 HEIGHTS ANCHORED IN DEPTH)
  // ─────────────────────────────────────────────────────────────────────────────
  const machineGroup = new THREE.Group();
  machineGroup.name = "cryogenic-quantum-power-machine";
  pitGroup.add(machineGroup);

  // Foundation mount anchored on deep pit floor (d3 = -0.15m)
  const baseMount = new THREE.Mesh(
    new THREE.CylinderGeometry(1.1, 1.3, 0.28, 32),
    darkSteel
  );
  baseMount.name = "cryo-deep-foundation-mount";
  baseMount.position.set(0, d3 + 0.14, 0);
  baseMount.receiveShadow = true;
  machineGroup.add(baseMount);

  // Continuous vertical active superconductor core column extending from -0.10m up to +1.80m
  const coreH = 1.80 - (d3 + 0.05); // ~1.90m height
  const coreMidY = (d3 + 0.05 + 1.80) / 2; // ~0.85m

  // Central dark titanium & gold internal axial emitter needle inside the core
  const emitterNeedle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, coreH * 0.90, 16),
    titanium
  );
  emitterNeedle.name = "core-central-emitter-filament";
  emitterNeedle.position.set(0, coreMidY, 0);
  machineGroup.add(emitterNeedle);

  const emitterNode = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 16, 16),
    gold
  );
  emitterNode.position.set(0, coreMidY, 0);
  machineGroup.add(emitterNode);

  const coreMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.48, 0.48, coreH, 32),
    cryoGlow
  );
  coreMesh.name = "superconducting-cryo-core";
  coreMesh.position.set(0, coreMidY, 0);
  machineGroup.add(coreMesh);

  // Outer vacuum containment glass cylinder
  const glassContainment = new THREE.Mesh(
    new THREE.CylinderGeometry(0.74, 0.74, coreH + 0.08, 32),
    cryoGlass
  );
  glassContainment.name = "cryo-vacuum-glass-containment";
  glassContainment.position.set(0, coreMidY, 0);
  machineGroup.add(glassContainment);

  // ── THE 3 MAGNETIC CONFINEMENT RINGS AT 3 VISIBLE HEIGHTS ──
  // Height 1: Lower Confinement Ring (Y = +0.30m, resting just above pit opening)
  // Height 2: Mid-Level Induction Ring (Y = +0.95m, center waist) - counter-rotates
  // Height 3: Upper Acceleration Ring (Y = +1.60m, high output)
  const ringHeights = [
    { y: 0.30, r: 1.35, name: "magnetic-ring-height-1" },
    { y: 0.95, r: 1.65, name: "magnetic-ring-height-2" },
    { y: 1.60, r: 1.25, name: "magnetic-ring-height-3" },
  ];

  const ringsGroup = new THREE.Group();
  ringsGroup.name = "magnetic-confinement-rings";
  machineGroup.add(ringsGroup);

  const ringMeshes: THREE.Group[] = [];

  ringHeights.forEach((ring, ringIdx) => {
    const singleRingGroup = new THREE.Group();
    singleRingGroup.name = ring.name;
    singleRingGroup.position.set(0, ring.y, 0);
    ringsGroup.add(singleRingGroup);
    ringMeshes.push(singleRingGroup);

    const ringTorus = new THREE.Mesh(
      new THREE.TorusGeometry(ring.r, 0.08, 16, 40),
      titanium
    );
    ringTorus.rotation.x = Math.PI / 2;
    singleRingGroup.add(ringTorus);

    // Inner gold superconductor coil strip
    const coil = new THREE.Mesh(
      new THREE.TorusGeometry(ring.r - 0.01, 0.038, 12, 40),
      gold
    );
    coil.rotation.x = Math.PI / 2;
    singleRingGroup.add(coil);

    // 12 Segmented electromagnetic stator poles along the circumference
    for (let s = 0; s < 12; s++) {
      const sAngle = (s * Math.PI * 2) / 12;
      const stator = new THREE.Mesh(
        new THREE.BoxGeometry(0.09, 0.065, 0.09),
        darkSteel
      );
      stator.name = `stator-pole-${ringIdx + 1}-${s + 1}`;
      stator.position.set(Math.cos(sAngle) * ring.r, 0, Math.sin(sAngle) * ring.r);
      stator.rotation.y = -sAngle;
      singleRingGroup.add(stator);

      // Gold inductor core tab
      const inductor = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.04, 0.05),
        gold
      );
      inductor.position.set(Math.cos(sAngle) * (ring.r - 0.03), 0, Math.sin(sAngle) * (ring.r - 0.03));
      inductor.rotation.y = -sAngle;
      singleRingGroup.add(inductor);
    }

    // 4 Structural radial stabilization arms connecting ring to machine frame
    for (let a = 0; a < 4; a++) {
      const angle = (a * Math.PI) / 2 + Math.PI / 4;
      const armLen = ring.r * 0.42;
      const arm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.032, 0.032, armLen, 8),
        stainless
      );
      arm.position.set(
        Math.cos(angle) * (ring.r - armLen / 2),
        0,
        Math.sin(angle) * (ring.r - armLen / 2)
      );
      arm.rotation.z = Math.PI / 2;
      arm.rotation.y = -angle;
      singleRingGroup.add(arm);
    }
  });

  // 6 Vertical cryo radiator heatsink fins running across the active height
  for (let f = 0; f < 6; f++) {
    const angle = (f * Math.PI * 2) / 6;
    const fin = new THREE.Mesh(
      new THREE.BoxGeometry(0.032, coreH * 0.88, 0.38),
      stainless
    );
    fin.name = `cryo-heatsink-fin-${f + 1}`;
    const finRadius = 0.94;
    fin.position.set(Math.cos(angle) * finRadius, coreMidY, Math.sin(angle) * finRadius);
    fin.rotation.y = -angle;
    fin.castShadow = true;
    machineGroup.add(fin);

    // Braided stainless cryogenic coolant supply pipe running vertically beside each fin
    const pipe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, coreH * 0.92, 8),
      stainless
    );
    pipe.name = `cryo-coolant-manifold-pipe-${f + 1}`;
    const pipeRadius = 0.78;
    pipe.position.set(Math.cos(angle) * pipeRadius, coreMidY, Math.sin(angle) * pipeRadius);
    machineGroup.add(pipe);

    // Copper manifold coupler collars at top and bottom of each pipe
    for (const couplerY of [coreMidY - (coreH * 0.44), coreMidY + (coreH * 0.44)]) {
      const coupler = new THREE.Mesh(
        new THREE.CylinderGeometry(0.034, 0.034, 0.05, 12),
        copper
      );
      coupler.position.set(Math.cos(angle) * pipeRadius, couplerY, Math.sin(angle) * pipeRadius);
      machineGroup.add(coupler);
    }
  }

  // Upper suspension cap & corona discharge ring at top (+1.85m to +2.0m)
  const topCrown = new THREE.Mesh(
    new THREE.CylinderGeometry(0.85, 0.72, 0.22, 32),
    titanium
  );
  topCrown.name = "cryo-suspension-crown";
  topCrown.position.set(0, 1.80 + 0.11, 0);
  machineGroup.add(topCrown);

  const coronaRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.62, 0.04, 16, 32),
    copper
  );
  coronaRing.name = "corona-discharge-ring";
  coronaRing.position.set(0, 1.80 + 0.24, 0);
  coronaRing.rotation.x = Math.PI / 2;
  machineGroup.add(coronaRing);

  // Subterranean atmospheric core light casting illumination across the stepped tiers
  const coreLight = new THREE.PointLight(0x38bdf8, 3.8, 22, 1.4);
  coreLight.position.set(0, 0.65, 0);
  pitGroup.add(coreLight);

  const coreBulb = new THREE.Mesh(
    new THREE.BoxGeometry(0.30, 0.30, 0.30),
    cryoGlow
  );
  coreBulb.name = "cryo-core-bulb";
  coreBulb.position.set(0, 0.65, 0);
  pitGroup.add(coreBulb);

  const lights: AdvancedTechLab["lights"] = [
    { group: pitGroup, bulb: coreBulb, light: coreLight },
  ];

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. SUBTLE, REFINED SUBTERRANEAN GRID CONDUIT RUN & PORTHOLES (STRAIGHT EAST)
  // ─────────────────────────────────────────────────────────────────────────────
  // Straight Eastward subterranean conduit raceway running directly from the pit to the east wall:
  // - Slim 0.18m width flush raceway with dark titanium cover plate.
  // - Hairline 0.025m central telemetry slit with flowing, traveling cyan wave pulse.
  // - Flush smoked-glass inspection porthole revealing illuminated fiber bundles beneath.
  // - East Wall interface bulkhead with dual precision pressure gauges pointing to the power grid.
  const conduitsGroup = new THREE.Group();
  conduitsGroup.name = "subtle-grid-conduit-run";
  group.add(conduitsGroup);

  const conduitWidth = 0.18;
  const conduitY = 0.012; // Flush with floor plane

  // Straight East segment: From pit perimeter (X = coreX + r1 ~ 1.05m) straight east to East Wall (X = 14.8m)
  const eastStartX = coreX + r1; // ~ 1.05m
  const eastEndX = 14.8; // LAB_BOUNDS.east - 0.2
  const eastLen = eastEndX - eastStartX; // ~ 13.75m
  const eastMidX = (eastStartX + eastEndX) / 2; // ~ 7.925m
  const eastZ = coreZ; // Aligned perfectly with core center Z (-42.138m)

  // Flush dark architectural raceway cover plate (East)
  const eastPlate = new THREE.Mesh(
    new THREE.BoxGeometry(eastLen, 0.012, conduitWidth),
    subtleConduitCover
  );
  eastPlate.name = "conduit-trace-east";
  eastPlate.position.set(eastMidX, conduitY, eastZ);
  eastPlate.receiveShadow = true;
  conduitsGroup.add(eastPlate);

  // Hairline central telemetry slit (East)
  const eastHairline = new THREE.Mesh(
    new THREE.BoxGeometry(eastLen - 0.08, 0.014, 0.025),
    subtleConduitGlow
  );
  eastHairline.name = "conduit-hairline-east";
  eastHairline.position.set(eastMidX, conduitY + 0.002, eastZ);
  conduitsGroup.add(eastHairline);

  // Smoked-glass inspection porthole on straight East raceway
  const eastPortholeX = eastMidX;
  const eastPortholeFrame = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.014, conduitWidth + 0.06),
    titanium
  );
  eastPortholeFrame.position.set(eastPortholeX, conduitY + 0.001, eastZ);
  conduitsGroup.add(eastPortholeFrame);

  const eastPortholeGlass = new THREE.Mesh(
    new THREE.BoxGeometry(0.30, 0.006, conduitWidth - 0.02),
    smokedGlass
  );
  eastPortholeGlass.name = "porthole-conduit-east";
  eastPortholeGlass.position.set(eastPortholeX, conduitY + 0.007, eastZ);
  conduitsGroup.add(eastPortholeGlass);

  // Illuminated fiber optic lines visible through the East porthole glass
  const eastFiber1 = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.008, 0.012),
    fiberCyan
  );
  eastFiber1.position.set(eastPortholeX, conduitY - 0.012, eastZ - 0.03);
  conduitsGroup.add(eastFiber1);

  const eastFiber2 = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.008, 0.012),
    fiberAmber
  );
  eastFiber2.position.set(eastPortholeX, conduitY - 0.012, eastZ + 0.03);
  conduitsGroup.add(eastFiber2);

  // Flush architectural East Wall interface plate & pressure telemetry gauges
  const wallInterfaceGroup = new THREE.Group();
  wallInterfaceGroup.position.set(eastEndX, 0, eastZ);
  conduitsGroup.add(wallInterfaceGroup);

  const wallInterface = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.42, 0.34),
    titanium
  );
  wallInterface.name = "conduit-east-wall-interface";
  wallInterface.position.set(0, 0.21, 0);
  wallInterfaceGroup.add(wallInterface);

  // Dual precision conduit pressure gauges on East Wall interface
  for (let g = 0; g < 2; g++) {
    const gaugeZ = (g === 0 ? -0.09 : 0.09);
    const gaugeRim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 0.02, 16),
      darkSteel
    );
    gaugeRim.rotation.z = Math.PI / 2;
    gaugeRim.position.set(-0.035, 0.26, gaugeZ);
    wallInterfaceGroup.add(gaugeRim);

    const gaugeFace = new THREE.Mesh(
      new THREE.CylinderGeometry(0.038, 0.038, 0.022, 16),
      g === 0 ? subtleConduitGlow : amberGlow
    );
    gaugeFace.name = `conduit-east-pressure-gauge-${g + 1}`;
    gaugeFace.rotation.z = Math.PI / 2;
    gaugeFace.position.set(-0.036, 0.26, gaugeZ);
    wallInterfaceGroup.add(gaugeFace);
  }

  // Deep subterranean feeder conduit sleeve exiting from Tier 2 wall (+0.12m) heading straight East
  const deepConduitSleeve = new THREE.Mesh(
    new THREE.CylinderGeometry(0.065, 0.065, 1.8, 16),
    darkSteel
  );
  deepConduitSleeve.name = "deep-subterranean-feed-sleeve";
  deepConduitSleeve.position.set(coreX + r1 - 0.5, h2, eastZ);
  deepConduitSleeve.rotation.z = Math.PI / 2;
  conduitsGroup.add(deepConduitSleeve);

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. FREESTANDING MONOLITHIC GLASS TELEMETRY CONSOLE (SOUTH APPROACH)
  // ─────────────────────────────────────────────────────────────────────────────
  const consoleGroup = new THREE.Group();
  consoleGroup.name = "lab-telemetry-console";
  consoleGroup.position.set(coreX - 2.2, 0, LAB_BOUNDS.south - 1.6);
  consoleGroup.rotation.y = Math.PI / 8;
  group.add(consoleGroup);

  // Plinth base
  const consoleBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.68, 0.08, 0.32),
    darkSteel
  );
  consoleBase.position.y = 0.04;
  consoleGroup.add(consoleBase);

  // Monolithic dark glass terminal panel angled at 18 degrees
  const consoleGlass = new THREE.Mesh(
    new THREE.BoxGeometry(0.60, 0.92, 0.04),
    smokedGlass
  );
  consoleGlass.position.set(0, 0.52, 0);
  consoleGlass.rotation.x = 0.31; // ~18 degrees
  consoleGroup.add(consoleGlass);

  // Abstract vector telemetry display inlays on console
  const consoleDisplay = new THREE.Mesh(
    new THREE.PlaneGeometry(0.48, 0.72),
    subtleConduitGlow
  );
  consoleDisplay.position.set(0, 0.52, 0.022);
  consoleDisplay.rotation.x = 0.31;
  consoleGroup.add(consoleDisplay);

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. KEEL GRAVIMETRIC STABILIZER MAST (WEST ARCHITECTURAL WALL)
  // ─────────────────────────────────────────────────────────────────────────────
  // A monumental 4.2m vertical pylon rooted into the basalt floor and reaching
  // the ceiling structure. Houses an internal magnetic reaction mass that moves
  // in dynamic damping response to the island's tidal keel equilibrium.
  const mastGroup = new THREE.Group();
  mastGroup.name = "keel-gravimetric-stabilizer-mast";
  mastGroup.position.set(-20.0, 0, coreZ);
  group.add(mastGroup);

  // Heavy basalt plinth base
  const mastPlinth = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, 0.16, 0.54),
    darkSteel
  );
  mastPlinth.name = "keel-stabilizer-base-plinth";
  mastPlinth.position.y = 0.08;
  mastGroup.add(mastPlinth);

  // Subterranean tie-rod collar sleeve anchored through floor
  const mastTieCollar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.20, 0.22, 16),
    darkSteel
  );
  mastTieCollar.name = "keel-stabilizer-tie-rod-collar";
  mastTieCollar.position.y = 0.20;
  mastGroup.add(mastTieCollar);

  // Twin structural dark-titanium vertical channels (4.2m tall)
  const mastPylonLeft = new THREE.Mesh(
    new THREE.BoxGeometry(0.10, 4.2, 0.22),
    titanium
  );
  mastPylonLeft.name = "keel-stabilizer-pylon-left";
  mastPylonLeft.position.set(-0.18, 2.1, 0);
  mastGroup.add(mastPylonLeft);

  const mastPylonRight = new THREE.Mesh(
    new THREE.BoxGeometry(0.10, 4.2, 0.22),
    titanium
  );
  mastPylonRight.name = "keel-stabilizer-pylon-right";
  mastPylonRight.position.set(0.18, 2.1, 0);
  mastGroup.add(mastPylonRight);

  // Top structural ceiling bracket
  const mastTopBracket = new THREE.Mesh(
    new THREE.BoxGeometry(0.56, 0.14, 0.32),
    darkSteel
  );
  mastTopBracket.name = "keel-stabilizer-top-bracket";
  mastTopBracket.position.y = 4.13;
  mastGroup.add(mastTopBracket);

  // Central vacuum damping quartz tube
  const mastTube = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.11, 3.6, 24),
    cryoGlass
  );
  mastTube.name = "keel-stabilizer-vacuum-tube";
  mastTube.position.y = 2.05;
  mastGroup.add(mastTube);

  // Floating magnetic reaction mass
  const reactionMass = new THREE.Mesh(
    new THREE.CylinderGeometry(0.082, 0.082, 0.44, 24),
    graphite
  );
  reactionMass.name = "keel-stabilizer-reaction-mass";
  reactionMass.position.y = 1.80;
  mastGroup.add(reactionMass);

  // Gold magnetic collar on reaction mass
  const reactionMassCollar = new THREE.Mesh(
    new THREE.TorusGeometry(0.086, 0.012, 12, 24),
    gold
  );
  reactionMassCollar.rotation.x = Math.PI / 2;
  reactionMass.add(reactionMassCollar);

  // Vernier calibration balance rings
  const vernier1 = new THREE.Mesh(
    new THREE.TorusGeometry(0.118, 0.010, 12, 24),
    gold
  );
  vernier1.name = "keel-stabilizer-vernier-ring-1";
  vernier1.position.y = 1.35;
  vernier1.rotation.x = Math.PI / 2;
  mastGroup.add(vernier1);

  const vernier2 = new THREE.Mesh(
    new THREE.TorusGeometry(0.118, 0.010, 12, 24),
    gold
  );
  vernier2.name = "keel-stabilizer-vernier-ring-2";
  vernier2.position.y = 2.45;
  vernier2.rotation.x = Math.PI / 2;
  mastGroup.add(vernier2);

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. HIGH-VACUUM CRYOGENIC COLUMN (NORTHWEST ALCOVE)
  // ─────────────────────────────────────────────────────────────────────────────
  // Multi-stage cryogenic vacuum condensation column providing active cooling
  // to the primary containment pit. Taps directly into the basalt subfloor.
  const cryoColumnGlow = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 1.8,
    roughness: 0.22,
  });

  const cryoColumnGroup = new THREE.Group();
  cryoColumnGroup.name = "high-vacuum-cryogenic-column";
  cryoColumnGroup.position.set(-13.0, 0, -53.2);
  group.add(cryoColumnGroup);

  // Base compression stage (heavy dark steel)
  const cryoBaseStage = new THREE.Mesh(
    new THREE.CylinderGeometry(0.38, 0.42, 0.80, 24),
    darkSteel
  );
  cryoBaseStage.name = "cryo-column-base-stage";
  cryoBaseStage.position.y = 0.40;
  cryoColumnGroup.add(cryoBaseStage);

  // High-pressure ISO-K vacuum flange
  const cryoFlange1 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.45, 0.07, 24),
    stainless
  );
  cryoFlange1.name = "cryo-column-iso-flange-1";
  cryoFlange1.position.y = 0.80;
  cryoColumnGroup.add(cryoFlange1);

  // Mid-stage titanium vacuum vessel
  const cryoMidStage = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.28, 0.90, 24),
    titanium
  );
  cryoMidStage.name = "cryo-column-mid-stage";
  cryoMidStage.position.y = 1.25;
  cryoColumnGroup.add(cryoMidStage);

  // Second sealing flange
  const cryoFlange2 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.32, 0.06, 24),
    stainless
  );
  cryoFlange2.position.y = 1.70;
  cryoColumnGroup.add(cryoFlange2);

  // Frosted sight collar with internal luminescent cryo core
  const cryoSightCollar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.29, 0.29, 0.32, 24),
    smokedGlass
  );
  cryoSightCollar.name = "cryo-column-sight-collar";
  cryoSightCollar.position.y = 1.86;
  cryoColumnGroup.add(cryoSightCollar);

  const cryoLuminescentCore = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.14, 0.28, 20),
    cryoColumnGlow
  );
  cryoLuminescentCore.name = "cryo-column-luminescent-core";
  cryoLuminescentCore.position.y = 1.86;
  cryoColumnGroup.add(cryoLuminescentCore);

  // Upper distillation condenser stage
  const cryoUpperStage = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 0.72, 24),
    graphite
  );
  cryoUpperStage.name = "cryo-column-upper-stage";
  cryoUpperStage.position.y = 2.38;
  cryoColumnGroup.add(cryoUpperStage);

  // Domed cap
  const cryoCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    stainless
  );
  cryoCap.position.y = 2.74;
  cryoColumnGroup.add(cryoCap);

  // Analog cryogenic bypass valve wheel
  const bypassValve = new THREE.Mesh(
    new THREE.TorusGeometry(0.11, 0.016, 12, 20),
    copper
  );
  bypassValve.name = "cryo-column-bypass-valve";
  bypassValve.position.set(0.31, 1.35, 0);
  bypassValve.rotation.y = Math.PI / 2;
  cryoColumnGroup.add(bypassValve);

  const valveStem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.018, 0.12, 12),
    darkSteel
  );
  valveStem.rotation.z = Math.PI / 2;
  valveStem.position.set(0.25, 1.35, 0);
  cryoColumnGroup.add(valveStem);

  // Coolant feed lines diving into the basalt floor
  const feedLine1 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.024, 0.024, 0.60, 12),
    stainless
  );
  feedLine1.name = "cryo-coolant-feed-line-1";
  feedLine1.position.set(0.24, 0.28, 0.24);
  feedLine1.rotation.z = 0.25;
  cryoColumnGroup.add(feedLine1);

  const feedLine2 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.024, 0.024, 0.60, 12),
    stainless
  );
  feedLine2.name = "cryo-coolant-feed-line-2";
  feedLine2.position.set(-0.24, 0.28, 0.24);
  feedLine2.rotation.z = -0.25;
  cryoColumnGroup.add(feedLine2);

  const floorFitting = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.14, 0.06, 16),
    darkSteel
  );
  floorFitting.name = "cryo-coolant-floor-fitting";
  floorFitting.position.set(0.30, 0.03, 0.28);
  cryoColumnGroup.add(floorFitting);

  // ─────────────────────────────────────────────────────────────────────────────
  // 8. DUAL CRYO-STASIS SLEEP PODS (WEST WALL BAY)
  // ─────────────────────────────────────────────────────────────────────────────
  const cryoPodGlowMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 1.4,
    roughness: 0.20,
  });

  const cryoPodsGroup = new THREE.Group();
  cryoPodsGroup.name = "twin-cryo-stasis-pods";
  cryoPodsGroup.position.set(-19.5, 0, -34.5);
  group.add(cryoPodsGroup);

  // 1. Monolithic Structural Cryo-Bay Bulkhead Command Wall
  // Substantial architectural presence spanning 3.80m along Z, 3.40m height along Y
  const cryoBulkhead = new THREE.Mesh(
    new THREE.BoxGeometry(0.70, 3.40, 3.80),
    darkSteel
  );
  cryoBulkhead.name = "cryo-pod-bulkhead";
  cryoBulkhead.position.set(-0.25, 1.70, 0);
  cryoBulkhead.castShadow = true;
  cryoBulkhead.receiveShadow = true;
  cryoPodsGroup.add(cryoBulkhead);

  // Architectural recessed alcove backplates for Pod 1 and Pod 2
  for (const alcZ of [-1.05, 1.05]) {
    const alcoveBezel = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 2.90, 1.40),
      titanium
    );
    alcoveBezel.position.set(0.12, 1.65, alcZ);
    cryoPodsGroup.add(alcoveBezel);

    const alcoveBackplate = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 2.75, 1.25),
      graphite
    );
    alcoveBackplate.position.set(0.15, 1.65, alcZ);
    cryoPodsGroup.add(alcoveBackplate);

    // Vertical edge luminescent guide strip
    for (const gsZ of [-0.60, 0.60]) {
      const guideStrip = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 2.65, 0.04),
        subtleConduitGlow
      );
      guideStrip.position.set(0.18, 1.65, alcZ + gsZ);
      cryoPodsGroup.add(guideStrip);
    }
  }

  // 2. Subfloor Cryogenic Drainage Sump Trench & Perforated Footing Grates
  const subfloorTrench = new THREE.Group();
  subfloorTrench.name = "cryo-subfloor-trench";
  subfloorTrench.position.set(0.85, 0.02, 0);
  cryoPodsGroup.add(subfloorTrench);

  const trenchBase = new THREE.Mesh(
    new THREE.BoxGeometry(2.20, 0.04, 3.90),
    darkSteel
  );
  subfloorTrench.add(trenchBase);

  // Recessed liquid nitrogen drain troughs
  for (const trZ of [-1.05, 0, 1.05]) {
    const drainGrate = new THREE.Mesh(
      new THREE.BoxGeometry(1.80, 0.02, 0.35),
      titanium
    );
    drainGrate.position.set(0, 0.025, trZ);
    subfloorTrench.add(drainGrate);

    const drainGlow = new THREE.Mesh(
      new THREE.BoxGeometry(1.70, 0.01, 0.12),
      subtleConduitGlow
    );
    drainGlow.position.set(0, 0.015, trZ);
    subfloorTrench.add(drainGlow);
  }

  // Sterile zone floor demarcation perimeter lines
  const perimeterLine = new THREE.Mesh(
    new THREE.BoxGeometry(2.35, 0.01, 4.05),
    gold
  );
  perimeterLine.position.set(0, 0.005, 0);
  subfloorTrench.add(perimeterLine);

  // 3. Overhead Cryogenic Coolant Distribution Manifold & Expansion Purge Tanks
  const coolantManifold = new THREE.Group();
  coolantManifold.name = "cryo-coolant-manifold";
  coolantManifold.position.set(0.18, 3.15, 0);
  cryoPodsGroup.add(coolantManifold);

  // Main vacuum-insulated distribution pipe
  const mainManifoldPipe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 3.60, 16),
    stainless
  );
  mainManifoldPipe.rotation.x = Math.PI / 2;
  coolantManifold.add(mainManifoldPipe);

  // Pipe mounting wall brackets
  for (const mbZ of [-1.50, -0.50, 0.50, 1.50]) {
    const bracket = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.12, 0.06),
      darkSteel
    );
    bracket.position.set(-0.10, 0, mbZ);
    coolantManifold.add(bracket);
  }

  // Dual high-pressure expansion purge tanks
  for (const [ptIdx, ptZ] of [[1, -1.65], [2, 1.65]] as const) {
    const purgeTank = new THREE.Group();
    purgeTank.name = `cryo-purge-tank-${ptIdx}`;
    purgeTank.position.set(0.20, 2.25, ptZ);
    cryoPodsGroup.add(purgeTank);

    const tankVessel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.16, 0.95, 16),
      titanium
    );
    purgeTank.add(tankVessel);

    const tankTopCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      titanium
    );
    tankTopCap.position.y = 0.475;
    purgeTank.add(tankTopCap);

    const reliefValve = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.12, 8),
      copper
    );
    reliefValve.position.y = 0.65;
    purgeTank.add(reliefValve);

    const pressureGauge = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.065, 0.03, 16),
      gold
    );
    pressureGauge.rotation.z = Math.PI / 2;
    pressureGauge.position.set(0.17, 0.15, 0);
    purgeTank.add(pressureGauge);

    const gaugeLens = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.035, 16),
      cryoGlow
    );
    gaugeLens.rotation.z = Math.PI / 2;
    gaugeLens.position.set(0.175, 0.15, 0);
    purgeTank.add(gaugeLens);
  }

  // 4. Two Ergonomic, High-Detail Human-Scale Stasis Pods (Pod 1 & Pod 2)
  // Generously sized (radius 0.46m, height 2.50m) and separated along Z (-1.05m and +1.05m)
  const podTilt = 0.48; // ~27.5 degrees ergonomic tilt angle

  for (let podIdx = 1; podIdx <= 2; podIdx++) {
    const podOffsetZ = podIdx === 1 ? -1.05 : 1.05;
    const podGroup = new THREE.Group();
    podGroup.name = `cryo-pod-${podIdx}`;
    podGroup.position.set(0.65, 0.22, podOffsetZ);
    cryoPodsGroup.add(podGroup);

    // ── BASE DOCKING TRUNNION CRADLE & TILT HYDRAULIC ACTUATORS ──
    const trunnionCradle = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 0.42, 0.95),
      darkSteel
    );
    trunnionCradle.position.set(0, 0.15, 0);
    podGroup.add(trunnionCradle);

    // Pivot hubs
    for (const pbZ of [-0.48, 0.48]) {
      const pivotHub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 0.10, 16),
        titanium
      );
      pivotHub.rotation.x = Math.PI / 2;
      pivotHub.position.set(0, 0.32, pbZ);
      podGroup.add(pivotHub);
    }

    // Active hydraulic tilt actuator cylinder
    const tiltActuator = new THREE.Group();
    tiltActuator.name = `cryo-tilt-actuator-${podIdx}`;
    tiltActuator.position.set(-0.35, 0.28, 0);
    tiltActuator.rotation.z = -0.45;
    podGroup.add(tiltActuator);

    const tiltBarrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, 0.55, 12),
      darkSteel
    );
    tiltActuator.add(tiltBarrel);

    const tiltPiston = new THREE.Mesh(
      new THREE.CylinderGeometry(0.032, 0.032, 0.45, 8),
      stainless
    );
    tiltPiston.position.y = 0.32;
    tiltActuator.add(tiltPiston);

    // ── MAIN POD TITANIUM & GRAPHITE COMPOSITE PRESSURE HULL (2.50m Length, 0.46m Radius) ──
    const podHull = new THREE.Mesh(
      new THREE.CylinderGeometry(0.46, 0.42, 2.50, 24),
      titanium
    );
    podHull.rotation.x = podTilt;
    podHull.position.set(0, 1.25, 0);
    podHull.castShadow = true;
    podGroup.add(podHull);

    // Outer reinforced graphite armor keel shell (underside support cradle)
    const armorKeel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.48, 0.44, 2.30, 24, 1, false, Math.PI * 0.5, Math.PI),
      graphite
    );
    armorKeel.rotation.x = podTilt;
    armorKeel.position.set(0, 1.25, -0.01);
    podGroup.add(armorKeel);

    // Lateral structural reinforcement ribs (3 bands along pod length)
    for (let rib = -1; rib <= 1; rib++) {
      const ribRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.475, 0.022, 8, 32),
        darkSteel
      );
      ribRing.rotation.x = podTilt;
      ribRing.position.set(0, 1.25 + rib * 0.75 * Math.cos(podTilt), -rib * 0.75 * Math.sin(podTilt));
      podGroup.add(ribRing);
    }

    // ── DOUBLE-GLAZED PRESSURIZED BIOSTASIS CANOPY ──
    const podCanopy = new THREE.Mesh(
      new THREE.CylinderGeometry(0.47, 0.47, 1.65, 24, 1, true, 0, Math.PI),
      cryoGlass
    );
    podCanopy.name = `cryo-pod-canopy-${podIdx}`;
    podCanopy.rotation.x = podTilt;
    podCanopy.position.set(0, 1.35, 0.06);
    podGroup.add(podCanopy);

    // Machined aerospace aluminum / ceramic white perimeter canopy frame
    const canopyFrameArchTop = new THREE.Mesh(
      new THREE.TorusGeometry(0.48, 0.026, 8, 24, Math.PI),
      ceramicWhite
    );
    canopyFrameArchTop.rotation.x = podTilt;
    canopyFrameArchTop.position.set(0, 1.35 + 0.82 * Math.cos(podTilt), 0.06 - 0.82 * Math.sin(podTilt));
    podGroup.add(canopyFrameArchTop);

    const canopyFrameArchBot = new THREE.Mesh(
      new THREE.TorusGeometry(0.48, 0.026, 8, 24, Math.PI),
      ceramicWhite
    );
    canopyFrameArchBot.rotation.x = podTilt;
    canopyFrameArchBot.position.set(0, 1.35 - 0.82 * Math.cos(podTilt), 0.06 + 0.82 * Math.sin(podTilt));
    podGroup.add(canopyFrameArchBot);

    // Embedded Gold Defroster Filament Grid
    const defrosterGrid = new THREE.Group();
    defrosterGrid.name = `cryo-canopy-defroster-grid-${podIdx}`;
    podGroup.add(defrosterGrid);

    for (let df = -2; df <= 2; df++) {
      const defrosterWire = new THREE.Mesh(
        new THREE.CylinderGeometry(0.003, 0.003, 1.55, 6),
        gold
      );
      defrosterWire.rotation.x = podTilt;
      defrosterWire.position.set(df * 0.16, 1.35, 0.06 + Math.cos(df * 0.35) * 0.38);
      defrosterGrid.add(defrosterWire);
    }

    // Dual pneumatic canopy lifting gas struts
    for (const stSide of [-0.46, 0.46]) {
      const liftStrut = new THREE.Group();
      liftStrut.name = `cryo-pneumatic-lift-strut-${podIdx}`;
      liftStrut.position.set(stSide, 1.45, 0.15);
      liftStrut.rotation.x = podTilt - 0.20;
      podGroup.add(liftStrut);

      const strutBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.018, 0.42, 8),
        darkSteel
      );
      liftStrut.add(strutBody);

      const strutRod = new THREE.Mesh(
        new THREE.CylinderGeometry(0.009, 0.009, 0.35, 6),
        stainless
      );
      strutRod.position.y = 0.24;
      liftStrut.add(strutRod);
    }

    // ── INTERIOR STASIS CAPSULE & ANATOMICAL MEMORY-GEL BIO-BED ──
    const podGlow = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 2.05, 0.08),
      cryoPodGlowMat
    );
    podGlow.name = `cryo-pod-glow-${podIdx}`;
    podGlow.rotation.x = podTilt;
    podGlow.position.set(0, 1.25, 0.14);
    podGroup.add(podGlow);

    // Ergonomic Cervical Spine Cradle & Headrest
    const headrest = new THREE.Group();
    headrest.name = `cryo-cervical-headrest-${podIdx}`;
    const headY = 1.25 + 0.78 * Math.cos(podTilt);
    const headZ = 0.16 - 0.78 * Math.sin(podTilt);
    headrest.position.set(0, headY, headZ);
    headrest.rotation.x = podTilt;
    podGroup.add(headrest);

    const headCushion = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.28, 0.06),
      graphite
    );
    headrest.add(headCushion);

    // Neural telemetry interface halo crown
    const neuralHalo = new THREE.Mesh(
      new THREE.TorusGeometry(0.16, 0.015, 8, 16, Math.PI),
      gold
    );
    neuralHalo.position.set(0, 0.08, 0.05);
    headrest.add(neuralHalo);

    // ── PERIMETER LOCKING LATCH COLLAR & LUG CLAMPS ──
    const latchCollar = new THREE.Mesh(
      new THREE.TorusGeometry(0.485, 0.032, 12, 28),
      gold
    );
    latchCollar.name = `cryo-pod-latch-collar-${podIdx}`;
    latchCollar.rotation.x = podTilt + Math.PI / 2;
    latchCollar.position.set(0, 2.05, -0.42);
    podGroup.add(latchCollar);

    // 6 Radial locking dog clamps around collar
    for (let dg = 0; dg < 6; dg++) {
      const dgAngle = (dg * Math.PI * 2) / 6;
      const dogClamp = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.06, 0.06),
        copper
      );
      dogClamp.position.set(
        Math.cos(dgAngle) * 0.49,
        2.05,
        -0.42 + Math.sin(dgAngle) * 0.49
      );
      podGroup.add(dogClamp);
    }

    // ── REFRIGERATION UMBILICAL CONDUITS (Diving into Subfloor Trench) ──
    const umbilical = new THREE.Group();
    umbilical.name = `cryo-pod-umbilical-${podIdx}`;
    umbilical.position.set(-0.32, 0.55, -0.22);
    podGroup.add(umbilical);

    // Primary vacuum-insulated stainless coolant line
    const mainUmbilical = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.028, 1.15, 12),
      stainless
    );
    mainUmbilical.rotation.z = 0.42;
    mainUmbilical.rotation.x = -0.15;
    umbilical.add(mainUmbilical);

    // Secondary neural power and vitals braided conduit
    const secondaryUmbilical = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, 1.05, 8),
      copper
    );
    secondaryUmbilical.position.set(0.06, -0.05, 0.06);
    secondaryUmbilical.rotation.z = 0.46;
    secondaryUmbilical.rotation.x = -0.10;
    umbilical.add(secondaryUmbilical);

    // Bulkhead floor penetration flange collar
    const floorFlange = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.065, 0.04, 12),
      darkSteel
    );
    floorFlange.position.set(-0.25, -0.52, 0.12);
    umbilical.add(floorFlange);

    // ── OVERHEAD ARTICULATED DIAGNOSTIC CONSOLE & PATIENT VITALS TELEMETRY ──
    const diagConsole = new THREE.Group();
    diagConsole.name = `cryo-diagnostic-console-${podIdx}`;
    diagConsole.position.set(-0.35, 2.55, 0);
    podGroup.add(diagConsole);

    // Articulated cantilever support arm extending from bulkhead
    const boomArm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, 0.72, 8),
      titanium
    );
    boomArm.rotation.z = -1.15;
    boomArm.position.set(0.28, 0.12, 0);
    diagConsole.add(boomArm);

    // Diagnostic monitor casing
    const screenHousing = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.32, 0.65),
      darkSteel
    );
    screenHousing.position.set(0.62, 0, 0);
    screenHousing.rotation.z = 0.35;
    diagConsole.add(screenHousing);

    // Active glowing patient vitals display screen
    const vitalsDisplay = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.28, 0.58),
      hudCyan
    );
    vitalsDisplay.name = `cryo-vitals-display-${podIdx}`;
    vitalsDisplay.position.set(0.65, 0, 0);
    vitalsDisplay.rotation.z = 0.35;
    diagConsole.add(vitalsDisplay);

    // Secondary bio-alert status indicator
    const bioStatusLens = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, 0.02, 12),
      hudAmber
    );
    bioStatusLens.rotation.z = Math.PI / 2;
    bioStatusLens.position.set(0.65, 0.12, 0.26);
    diagConsole.add(bioStatusLens);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 8B. CRYOGENIC MEDICAL & BIOSTASIS PAVILION INFRASTRUCTURE (EXPANDED ARCHITECTURE)
  // ─────────────────────────────────────────────────────────────────────────────
  // Fully populates and densifies the West/NW Cryogenic sector (spanning X in [-21, -8.0],
  // Z in [-52, -30]), extending prominently eastward towards the center of the room.
  // Arranged into dedicated functional zones:
  // - Zone A: Deep Stasis Core (West Wall Bay)
  // - Zone B: Bulk Cryogenic Tank Farm & High-Pressure Pumping Skid (NW Sector)
  // - Zone C: Hyperthermic Reconditioning & Decompression Chamber (Mid-West)
  // - Zone D: Surgical Vitrification & Resuscitation Island (Mid-Quadrant)
  // - Zone E: High-Density Genetic & Specimen Cryo-Vault Library (NE Wing of Quadrant)
  // - Zone F: Master Stasis Medical Command & Biotelemetry Bridge (East Perimeter Gateway)
  // - Zone G: Overhead Patient Transfer Gantry Crane Network (Spanning Pods to Center)
  // - Zone H: Environmental Safety, Emergency Decontamination & Subfloor Trench Network
  // Anchored under cryoPodsGroup (-19.5, 0, -34.5).

  // ── SUBFLOOR UTILITY TRENCH NETWORK & LIQUID NITROGEN CONDUITS ──
  // Interconnects pods, vitrification island, dewar pumping skid, and command console
  const trenchNetwork = new THREE.Group();
  trenchNetwork.name = "cryo-trench-network";
  cryoPodsGroup.add(trenchNetwork);

  // Main East-West trench running from stasis pods (x = 1.0) to command bridge (x = 10.5) at z = 0.5
  const ewTrenchBase = new THREE.Mesh(
    new THREE.BoxGeometry(9.60, 0.04, 0.70),
    darkSteel
  );
  ewTrenchBase.position.set(5.75, 0.02, 0.50);
  trenchNetwork.add(ewTrenchBase);

  // Vacuum-jacketed cryogenic liquid nitrogen trunk pipe in trench
  const ewLN2Pipe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.045, 9.40, 16),
    stainless
  );
  ewLN2Pipe.rotation.z = Math.PI / 2;
  ewLN2Pipe.position.set(5.75, 0.035, 0.40);
  trenchNetwork.add(ewLN2Pipe);

  // Glowing liquid nitrogen tracer line
  const ewLN2Glow = new THREE.Mesh(
    new THREE.BoxGeometry(9.40, 0.015, 0.03),
    cryoGlow
  );
  ewLN2Glow.position.set(5.75, 0.025, 0.52);
  trenchNetwork.add(ewLN2Glow);

  // Perforated titanium floor grates over the trench
  for (let gr = 0; gr < 8; gr++) {
    const grate = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 0.02, 0.65),
      titanium
    );
    grate.position.set(1.60 + gr * 1.18, 0.045, 0.50);
    trenchNetwork.add(grate);
  }

  // North-South feeder trench branch linking pump skid (z = -14.0) to EW trunk (z = 0.5) at x = 3.8
  const nsTrenchBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.65, 0.04, 14.50),
    darkSteel
  );
  nsTrenchBase.position.set(3.80, 0.02, -6.75);
  trenchNetwork.add(nsTrenchBase);

  const nsLN2Pipe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 14.30, 12),
    stainless
  );
  nsLN2Pipe.position.set(3.80, 0.035, -6.75);
  trenchNetwork.add(nsLN2Pipe);

  const nsLN2Glow = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.015, 14.30),
    cryoGlow
  );
  nsLN2Glow.position.set(3.92, 0.025, -6.75);
  trenchNetwork.add(nsLN2Glow);

  // 1. Primary Bulk Liquid Nitrogen Storage Dewar Silos (Twin Industrial Dewar Towers)
  // Monumental vertical scale: 3.85m height, 0.85m radius, located in the NW sector
  const dewarPositions: [number, number, number][] = [
    [1.00, 0, -12.50],
    [1.00, 0, -15.50],
  ];

  dewarPositions.forEach(([siloX, siloY, siloZ], dIdx) => {
    const silo = new THREE.Group();
    silo.name = `cryo-dewar-silo-${dIdx + 1}`;
    silo.position.set(siloX, siloY, siloZ);
    cryoPodsGroup.add(silo);

    // Heavy reinforced foundation plinth ring
    const basePlinth = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 1.02, 0.20, 32),
      darkSteel
    );
    basePlinth.position.y = 0.10;
    silo.add(basePlinth);

    // 8 perimeter foundation anchor bolts with square clamping plates
    for (let al = 0; al < 8; al++) {
      const angle = (al * Math.PI * 2) / 8;
      const lug = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.16, 0.14),
        titanium
      );
      lug.position.set(Math.cos(angle) * 0.95, 0.10, Math.sin(angle) * 0.95);
      silo.add(lug);
    }

    // Main multi-layer vacuum insulated pressure vessel (3.85m total height, 0.85m radius)
    const vessel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 0.85, 3.40, 32),
      stainless
    );
    vessel.position.y = 1.90;
    vessel.castShadow = true;
    silo.add(vessel);

    // Upper hemispherical pressure dome
    const topDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.85, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      stainless
    );
    topDome.position.y = 3.60;
    silo.add(topDome);

    // 4 dark-steel structural hoop stiffening ribs
    for (const hoopY of [0.90, 1.70, 2.50, 3.30]) {
      const hoop = new THREE.Mesh(
        new THREE.TorusGeometry(0.865, 0.026, 8, 32),
        darkSteel
      );
      hoop.rotation.x = Math.PI / 2;
      hoop.position.y = hoopY;
      silo.add(hoop);
    }

    // Cryogenic cold condensation frost ring with drip runoff trough
    const frostCollar = new THREE.Mesh(
      new THREE.TorusGeometry(0.86, 0.018, 8, 32),
      cryoGlow
    );
    frostCollar.rotation.x = Math.PI / 2;
    frostCollar.position.y = 0.65;
    silo.add(frostCollar);

    const frostDripTrough = new THREE.Mesh(
      new THREE.TorusGeometry(0.92, 0.03, 8, 32),
      darkSteel
    );
    frostDripTrough.rotation.x = Math.PI / 2;
    frostDripTrough.position.y = 0.58;
    silo.add(frostDripTrough);

    // Vertical liquid nitrogen level sight gauge tube with protective armor cage
    const sightGlass = new THREE.Mesh(
      new THREE.CylinderGeometry(0.026, 0.026, 2.50, 12),
      cryoGlass
    );
    sightGlass.position.set(0.88, 1.95, 0.22);
    silo.add(sightGlass);

    const sightCore = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 1.75, 8),
      hudCyan
    );
    sightCore.position.set(0.88, 1.575, 0.22);
    silo.add(sightCore);

    // Sight gauge guard rods
    for (const sgSide of [-0.04, 0.04]) {
      const guardRod = new THREE.Mesh(
        new THREE.CylinderGeometry(0.006, 0.006, 2.50, 6),
        darkSteel
      );
      guardRod.position.set(0.88, 1.95, 0.22 + sgSide);
      silo.add(guardRod);
    }

    // Top high-pressure relief manifold, rupture disc & exhaust silencer stack
    const reliefStack = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.60, 12),
      copper
    );
    reliefStack.position.y = 4.45;
    silo.add(reliefStack);

    const silencerCone = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.06, 0.28, 16),
      darkSteel
    );
    silencerCone.position.y = 4.75;
    silo.add(silencerCone);

    const dualReliefValve = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.16, 0.16),
      gold
    );
    dualReliefValve.position.set(0, 4.30, 0.15);
    silo.add(dualReliefValve);

    const pressureGauge = new THREE.Mesh(
      new THREE.CylinderGeometry(0.075, 0.075, 0.035, 16),
      gold
    );
    pressureGauge.rotation.x = Math.PI / 2;
    pressureGauge.position.set(0.16, 4.25, 0);
    silo.add(pressureGauge);

    // Maintenance catwalk ladder on Silo 1
    if (dIdx === 0) {
      const ladderGroup = new THREE.Group();
      ladderGroup.position.set(-0.88, 0, 0);
      silo.add(ladderGroup);

      for (const stSide of [-0.20, 0.20]) {
        const stringer = new THREE.Mesh(
          new THREE.CylinderGeometry(0.016, 0.016, 3.60, 8),
          darkSteel
        );
        stringer.position.set(0, 1.90, stSide);
        ladderGroup.add(stringer);
      }

      for (let r = 0; r < 12; r++) {
        const rung = new THREE.Mesh(
          new THREE.CylinderGeometry(0.010, 0.010, 0.40, 6),
          titanium
        );
        rung.rotation.x = Math.PI / 2;
        rung.position.set(0, 0.40 + r * 0.28, 0);
        ladderGroup.add(rung);
      }

      // Safety hoop cage around upper ladder
      for (let h = 0; h < 4; h++) {
        const hoop = new THREE.Mesh(
          new THREE.TorusGeometry(0.28, 0.014, 6, 16, Math.PI),
          darkSteel
        );
        hoop.rotation.y = -Math.PI / 2;
        hoop.position.set(-0.14, 2.50 + h * 0.35, 0);
        ladderGroup.add(hoop);
      }
    }
  });

  // Inter-dewar vacuum-jacketed transfer conduit with brass isolation valve wheel
  const dewarInterconnect = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.055, 3.00, 16),
    stainless
  );
  dewarInterconnect.position.set(1.00, 2.65, -14.00);
  cryoPodsGroup.add(dewarInterconnect);

  const dewarCenterValve = new THREE.Mesh(
    new THREE.CylinderGeometry(0.10, 0.10, 0.20, 12),
    copper
  );
  dewarCenterValve.position.set(1.00, 2.65, -14.00);
  cryoPodsGroup.add(dewarCenterValve);

  const dewarValveWheel = new THREE.Mesh(
    new THREE.TorusGeometry(0.14, 0.018, 8, 16),
    gold
  );
  dewarValveWheel.rotation.x = Math.PI / 2;
  dewarValveWheel.position.set(1.00, 2.78, -14.00);
  cryoPodsGroup.add(dewarValveWheel);

  // 2. High-Pressure Cryogenic Pumping Skid (Enlarged Industrial Skid)
  // Footprint: 1.80m x 2.80m, located adjacent to dewars at x = 3.80, z = -14.00
  const pumpingSkid = new THREE.Group();
  pumpingSkid.name = "cryo-pumping-skid";
  pumpingSkid.position.set(3.80, 0, -14.00);
  cryoPodsGroup.add(pumpingSkid);

  // Structural skid frame on 4 vibration spring isolators
  const skidPlinth = new THREE.Mesh(
    new THREE.BoxGeometry(1.80, 0.14, 2.80),
    darkSteel
  );
  skidPlinth.position.y = 0.09;
  pumpingSkid.add(skidPlinth);

  // Yellow hazard perimeter stripe along skid base
  const skidBorder = new THREE.Mesh(
    new THREE.BoxGeometry(1.84, 0.02, 2.84),
    safetyYellow
  );
  skidBorder.position.y = 0.08;
  pumpingSkid.add(skidBorder);

  // Diamond-plate aluminum decking
  const skidDeck = new THREE.Mesh(
    new THREE.BoxGeometry(1.72, 0.03, 2.72),
    titanium
  );
  skidDeck.position.y = 0.17;
  pumpingSkid.add(skidDeck);

  // 4 corner vibration spring dampers
  for (const spX of [-0.75, 0.75]) {
    for (const spZ of [-1.20, 1.20]) {
      const isolator = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 0.12, 12),
        gold
      );
      isolator.position.set(spX, 0.06, spZ);
      pumpingSkid.add(isolator);
    }
  }

  // Dual heavy-duty cryogenic reciprocating piston pumps (Pump A & Pump B)
  for (const pumpZ of [-0.75, 0.75]) {
    // High-torque electric drive motor
    const motorCylinder = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 0.68, 16),
      darkSteel
    );
    motorCylinder.rotation.z = Math.PI / 2;
    motorCylinder.position.set(-0.35, 0.45, pumpZ);
    pumpingSkid.add(motorCylinder);

    // Motor cooling fan cowl
    const fanCowl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.25, 0.12, 16),
      titanium
    );
    fanCowl.rotation.z = Math.PI / 2;
    fanCowl.position.set(-0.72, 0.45, pumpZ);
    pumpingSkid.add(fanCowl);

    // Cryogenic cold-end cylinder head with longitudinal thermal dissipation fins
    const coldHead = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.36, 0.42),
      stainless
    );
    coldHead.position.set(0.25, 0.45, pumpZ);
    pumpingSkid.add(coldHead);

    for (let fin = -2; fin <= 2; fin++) {
      const finPlate = new THREE.Mesh(
        new THREE.BoxGeometry(0.40, 0.015, 0.44),
        titanium
      );
      finPlate.position.set(0.25, 0.45 + fin * 0.065, pumpZ);
      pumpingSkid.add(finPlate);
    }

    // Braided copper suction & discharge lines
    const suctionPipe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 0.85, 12),
      copper
    );
    suctionPipe.position.set(0.25, 0.78, pumpZ);
    pumpingSkid.add(suctionPipe);

    const dischargeValve = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 0.14, 8),
      copper
    );
    dischargeValve.position.set(0.25, 1.15, pumpZ);
    pumpingSkid.add(dischargeValve);
  }

  // Dual spherical pulsation dampener accumulators
  for (const dampZ of [-0.25, 0.25]) {
    const pulsationDampener = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 16, 16),
      stainless
    );
    pulsationDampener.position.set(0, 0.75, dampZ);
    pumpingSkid.add(pulsationDampener);
  }

  // Instrumentation mast & digital/analog telemetry control panel
  const pumpTelemetryMast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 1.35, 8),
    titanium
  );
  pumpTelemetryMast.position.set(0.68, 0.75, 1.05);
  pumpingSkid.add(pumpTelemetryMast);

  const pumpGaugeBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.44, 0.62),
    darkSteel
  );
  pumpGaugeBox.position.set(0.68, 1.35, 1.05);
  pumpingSkid.add(pumpGaugeBox);

  const pumpGaugeScreen = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, 0.36, 0.54),
    hudAmber
  );
  pumpGaugeScreen.position.set(0.725, 1.35, 1.05);
  pumpingSkid.add(pumpGaugeScreen);

  // Dual analog dial gauges (suction and discharge pressure)
  for (const agY of [-0.10, 0.10]) {
    const dialGauge = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 0.025, 16),
      gold
    );
    dialGauge.rotation.z = Math.PI / 2;
    dialGauge.position.set(0.725, 1.35 + agY, 1.42);
    pumpingSkid.add(dialGauge);
  }

  // Manual emergency depressurization quarter-turn valve wheel in vivid safety red
  const dumpWheel = new THREE.Mesh(
    new THREE.TorusGeometry(0.14, 0.022, 8, 16),
    safetyRed
  );
  dumpWheel.position.set(0.68, 0.95, 1.05);
  dumpWheel.rotation.y = Math.PI / 2;
  pumpingSkid.add(dumpWheel);

  // 3. Rapid Hyperthermic Reconditioning & Decompression Chamber (Walk-In Chamber)
  // Scaled up to a walk-in airlock chamber: 1.15m radius, 3.25m height, located at x = 3.80, z = -7.20
  const recondChamber = new THREE.Group();
  recondChamber.name = "cryo-reconditioning-chamber";
  recondChamber.position.set(3.80, 0, -7.20);
  cryoPodsGroup.add(recondChamber);

  const chamberBase = new THREE.Mesh(
    new THREE.CylinderGeometry(1.25, 1.35, 0.20, 32),
    darkSteel
  );
  chamberBase.position.y = 0.10;
  recondChamber.add(chamberBase);

  // Diamond-plate entry threshold ramp
  const entryRamp = new THREE.Mesh(
    new THREE.BoxGeometry(0.75, 0.12, 1.10),
    titanium
  );
  entryRamp.position.set(1.45, 0.06, 0);
  entryRamp.rotation.z = -0.12;
  recondChamber.add(entryRamp);

  // Main vertical cylindrical pressure airlock hull (3.25m height, 1.15m radius)
  const chamberHull = new THREE.Mesh(
    new THREE.CylinderGeometry(1.15, 1.15, 3.10, 32),
    titanium
  );
  chamberHull.position.y = 1.70;
  chamberHull.castShadow = true;
  recondChamber.add(chamberHull);

  // Outer structural reinforcement rib rings
  for (const rRibY of [0.85, 1.70, 2.55]) {
    const rib = new THREE.Mesh(
      new THREE.TorusGeometry(1.17, 0.03, 8, 32),
      darkSteel
    );
    rib.rotation.x = Math.PI / 2;
    rib.position.y = rRibY;
    recondChamber.add(rib);
  }

  // Top environmental recirculation & recompression cap
  const chamberTopDome = new THREE.Mesh(
    new THREE.SphereGeometry(1.15, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    titanium
  );
  chamberTopDome.position.y = 3.25;
  recondChamber.add(chamberTopDome);

  // Dual centrifugal exhaust blower turbines atop the dome
  for (const bSide of [-0.45, 0.45]) {
    const turbine = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 0.35, 16),
      darkSteel
    );
    turbine.position.set(bSide, 4.30, 0);
    recondChamber.add(turbine);
  }

  // Heavy sealed pressure door facing the room (+X direction)
  const chamberDoorFrame = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 2.30, 1.35),
    darkSteel
  );
  chamberDoorFrame.position.set(1.10, 1.45, 0);
  recondChamber.add(chamberDoorFrame);

  const chamberDoorSlab = new THREE.Mesh(
    new THREE.BoxGeometry(0.10, 2.18, 1.22),
    graphite
  );
  chamberDoorSlab.position.set(1.14, 1.45, 0);
  recondChamber.add(chamberDoorSlab);

  // Dual circular quartz observation ports (upper and lower viewing angles)
  for (const vpY of [1.40, 1.80]) {
    const chamberViewport = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 0.12, 24),
      smokedGlass
    );
    chamberViewport.rotation.z = Math.PI / 2;
    chamberViewport.position.set(1.20, vpY, 0);
    recondChamber.add(chamberViewport);

    // Glowing hyperthermic internal heater grid visible through port
    const chamberInternalGlow = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.05, 16),
      amberGlow
    );
    chamberInternalGlow.rotation.z = Math.PI / 2;
    chamberInternalGlow.position.set(1.12, vpY, 0);
    recondChamber.add(chamberInternalGlow);

    // Rotary locking dog latch ring
    const chamberLatchRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.26, 0.02, 8, 24),
      gold
    );
    chamberLatchRing.rotation.y = Math.PI / 2;
    chamberLatchRing.position.set(1.20, vpY, 0);
    recondChamber.add(chamberLatchRing);
  }

  // Side-mounted chamber cycling touch panel
  const chamberScreen = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.42, 0.58),
    hudAmber
  );
  chamberScreen.position.set(0.98, 1.55, 0.95);
  recondChamber.add(chamberScreen);

  // 4. Mobile Vitrification & Neuro-Prep Surgical Island (Mid-Quadrant Medical Hub)
  // Scaled to a full surgical procedure island (2.20m x 1.05m), located at x = 6.80, z = -3.20
  const vitrificationCart = new THREE.Group();
  vitrificationCart.name = "cryo-vitrification-cart";
  vitrificationCart.position.set(6.80, 0, -3.20);
  cryoPodsGroup.add(vitrificationCart);

  // Cart tubular titanium perimeter chassis
  const cartChassis = new THREE.Mesh(
    new THREE.BoxGeometry(2.20, 0.08, 1.05),
    darkSteel
  );
  cartChassis.position.y = 0.15;
  vitrificationCart.add(cartChassis);

  // 4 corner upright posts with heavy-duty dual-wheel lockable casters
  for (const cX of [-0.98, 0.98]) {
    for (const cZ of [-0.45, 0.45]) {
      const cornerPost = new THREE.Mesh(
        new THREE.CylinderGeometry(0.028, 0.028, 0.72, 8),
        titanium
      );
      cornerPost.position.set(cX, 0.51, cZ);
      vitrificationCart.add(cornerPost);

      // Swivel caster wheel
      const caster = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.055, 0.035, 12),
        darkSteel
      );
      caster.rotation.z = Math.PI / 2;
      caster.position.set(cX, 0.06, cZ);
      vitrificationCart.add(caster);
    }
  }

  // Stainless steel surgical tray worktop with perimeter fluid retention lip
  const trayTop = new THREE.Mesh(
    new THREE.BoxGeometry(2.24, 0.05, 1.08),
    stainless
  );
  trayTop.position.y = 0.88;
  vitrificationCart.add(trayTop);

  const trayLip = new THREE.Mesh(
    new THREE.BoxGeometry(2.28, 0.04, 1.12),
    darkSteel
  );
  trayLip.position.y = 0.91;
  vitrificationCart.add(trayLip);

  // Sculpted anatomical memory-gel surgical mattress
  const surgicalBed = new THREE.Mesh(
    new THREE.BoxGeometry(1.95, 0.04, 0.75),
    graphite
  );
  surgicalBed.position.set(0, 0.92, 0);
  vitrificationCart.add(surgicalBed);

  const surgicalHeadrest = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.12, 0.32, 16),
    ceramicWhite
  );
  surgicalHeadrest.rotation.z = Math.PI / 2;
  surgicalHeadrest.position.set(-0.82, 0.96, 0);
  vitrificationCart.add(surgicalHeadrest);

  // Lower equipment deck carrying vitrification canisters & perfusion pumps
  const lowerShelf = new THREE.Mesh(
    new THREE.BoxGeometry(2.05, 0.025, 0.90),
    graphite
  );
  lowerShelf.position.y = 0.28;
  vitrificationCart.add(lowerShelf);

  // Dual neuro-vitrification canisters (CryoSolve-A / B)
  for (const canX of [-0.45, 0.45]) {
    const canister = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.15, 0.45, 16),
      ceramicWhite
    );
    canister.position.set(canX, 0.52, -0.22);
    vitrificationCart.add(canister);

    const levelIndicator = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, 0.35, 8),
      hudCyan
    );
    levelIndicator.position.set(canX + 0.14, 0.52, -0.22);
    vitrificationCart.add(levelIndicator);
  }

  // Micro-perfusion rate digital controller panel
  const infusionScreen = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.22, 0.05),
    hudCyan
  );
  infusionScreen.position.set(0, 1.05, 0.50);
  vitrificationCart.add(infusionScreen);

  // Articulated Shadowless Multi-Lens Surgical Ring Lamp
  const surgicalLamp = new THREE.Group();
  surgicalLamp.name = "cryo-surgical-lamp";
  surgicalLamp.position.set(0.85, 0.88, -0.38);
  vitrificationCart.add(surgicalLamp);

  // Cantilever boom arm articulating up and inward over the tray
  const boomBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.045, 0.16, 12),
    darkSteel
  );
  boomBase.position.y = 0.08;
  surgicalLamp.add(boomBase);

  const boomArmLower = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.022, 1.05, 8),
    stainless
  );
  boomArmLower.position.set(-0.35, 0.62, 0);
  boomArmLower.rotation.z = 0.52;
  surgicalLamp.add(boomArmLower);

  const boomKnuckle = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 12, 12),
    darkSteel
  );
  boomKnuckle.position.set(-0.70, 1.15, 0);
  surgicalLamp.add(boomKnuckle);

  const boomArmUpper = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.018, 0.90, 8),
    stainless
  );
  boomArmUpper.position.set(-0.60, 1.55, 0);
  boomArmUpper.rotation.z = -0.72;
  surgicalLamp.add(boomArmUpper);

  // Enlarged circular shadowless surgical inspection lamp ring
  const lampHeadRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.34, 0.038, 12, 32),
    ceramicWhite
  );
  lampHeadRing.rotation.x = Math.PI / 2;
  lampHeadRing.position.set(-0.85, 1.85, 0);
  surgicalLamp.add(lampHeadRing);

  // High-intensity white surgical LED emitter ring
  const lampEmitter = new THREE.Mesh(
    new THREE.TorusGeometry(0.28, 0.022, 8, 32),
    surgicalGlow
  );
  lampEmitter.rotation.x = Math.PI / 2;
  lampEmitter.position.set(-0.85, 1.84, 0);
  surgicalLamp.add(lampEmitter);

  // Center stereo-optical macroscopic camera turret
  const centerOptic = new THREE.Mesh(
    new THREE.CylinderGeometry(0.075, 0.075, 0.10, 16),
    darkSteel
  );
  centerOptic.position.set(-0.85, 1.88, 0);
  surgicalLamp.add(centerOptic);

  // 5. High-Density Genetic & Specimen Cryo-Vault Library (Extended to x = 8.80, z = -12.00)
  // Monumental specimen archive: 3.40m tall, 3.20m wide along Z, 1.20m depth along X
  const specimenVault = new THREE.Group();
  specimenVault.name = "cryo-specimen-vault";
  specimenVault.position.set(8.80, 0, -12.00);
  cryoPodsGroup.add(specimenVault);

  const vaultBody = new THREE.Mesh(
    new THREE.BoxGeometry(1.20, 3.40, 3.20),
    graphite
  );
  vaultBody.position.y = 1.70;
  vaultBody.castShadow = true;
  specimenVault.add(vaultBody);

  // Top architectural header with illuminated status bezel
  const vaultHeader = new THREE.Mesh(
    new THREE.BoxGeometry(1.24, 0.35, 3.26),
    darkSteel
  );
  vaultHeader.position.y = 3.25;
  specimenVault.add(vaultHeader);

  const vaultHeaderGlow = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.10, 2.95),
    subtleConduitGlow
  );
  vaultHeaderGlow.position.set(0.625, 3.25, 0);
  specimenVault.add(vaultHeaderGlow);

  // 6 horizontal tiers of specimen cassette drawers (4 drawers per tier = 24 individual cryo-lockers)
  const drawerYOffsets = [0.45, 0.95, 1.45, 1.95, 2.45, 2.95];
  drawerYOffsets.forEach((dY) => {
    for (const cCol of [-1.15, -0.40, 0.40, 1.15]) {
      const drawerFace = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.38, 0.62),
        titanium
      );
      drawerFace.position.set(0.62, dY, cCol);
      specimenVault.add(drawerFace);

      const drawerHandle = new THREE.Mesh(
        new THREE.BoxGeometry(0.025, 0.06, 0.22),
        darkSteel
      );
      drawerHandle.position.set(0.65, dY, cCol);
      specimenVault.add(drawerHandle);
    }

    // Tier viability status strip (emissive emerald bioGreen)
    const statusStrip = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.03, 2.90),
      bioGreen
    );
    statusStrip.position.set(0.62, dY - 0.22, 0);
    specimenVault.add(statusStrip);
  });

  // Central robotic vertical sample picker gantry
  const pickerRailLeft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 3.00, 8),
    stainless
  );
  pickerRailLeft.position.set(0.66, 1.70, -0.15);
  specimenVault.add(pickerRailLeft);

  const pickerRailRight = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 3.00, 8),
    stainless
  );
  pickerRailRight.position.set(0.66, 1.70, 0.15);
  specimenVault.add(pickerRailRight);

  const pickerCarriage = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.28, 0.38),
    titanium
  );
  pickerCarriage.position.set(0.66, 1.90, 0);
  specimenVault.add(pickerCarriage);

  const pickerScanner = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.04, 0.16),
    hudCyan
  );
  pickerScanner.position.set(0.72, 1.90, 0);
  specimenVault.add(pickerScanner);

  // Side inventory terminal screen
  const vaultIndexScreen = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.55, 0.04),
    hudCyan
  );
  vaultIndexScreen.position.set(0.20, 1.60, 1.62);
  specimenVault.add(vaultIndexScreen);

  // 6. Master Biostasis Medical Command & Telemetry Bridge (Extended Eastward to x = 10.70, z = 0.50)
  // Prominently extended towards the center of the room (World X = -8.80, Z = -34.00)
  const medConsole = new THREE.Group();
  medConsole.name = "cryo-medical-console";
  medConsole.position.set(10.70, 0, 0.50);
  cryoPodsGroup.add(medConsole);

  // Raised architectural command platform with perimeter safety lighting
  const platformPlinth = new THREE.Mesh(
    new THREE.BoxGeometry(3.60, 0.14, 2.80),
    darkSteel
  );
  platformPlinth.position.set(0.40, 0.07, 0);
  medConsole.add(platformPlinth);

  const platformStepBezel = new THREE.Mesh(
    new THREE.BoxGeometry(3.68, 0.02, 2.88),
    subtleConduitGlow
  );
  platformStepBezel.position.set(0.40, 0.13, 0);
  medConsole.add(platformStepBezel);

  // Curved ergonomic command desk structure (3.20m total arc span)
  const deskBase = new THREE.Mesh(
    new THREE.BoxGeometry(1.10, 0.85, 3.20),
    darkSteel
  );
  deskBase.position.set(0, 0.425, 0);
  medConsole.add(deskBase);

  const deskTop = new THREE.Mesh(
    new THREE.BoxGeometry(1.25, 0.07, 3.35),
    graphite
  );
  deskTop.position.set(0, 0.88, 0);
  medConsole.add(deskTop);

  // Center primary stasis telemetry widescreen monitor
  const centerScreen = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.62, 1.25),
    hudCyan
  );
  centerScreen.position.set(-0.35, 1.45, 0);
  centerScreen.rotation.y = -0.05;
  medConsole.add(centerScreen);

  const centerScreenBezel = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.68, 1.30),
    darkSteel
  );
  centerScreenBezel.position.set(-0.38, 1.45, 0);
  centerScreenBezel.rotation.y = -0.05;
  medConsole.add(centerScreenBezel);

  // Overhead secondary monitoring bridge monitor
  const upperScreen = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.32, 1.15),
    hudAmber
  );
  upperScreen.position.set(-0.32, 1.95, 0);
  upperScreen.rotation.x = 0.15;
  medConsole.add(upperScreen);

  // Left angled EEG / neural telemetry monitor
  const leftScreen = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.54, 0.85),
    hudCyan
  );
  leftScreen.position.set(-0.22, 1.42, -1.18);
  leftScreen.rotation.y = 0.46;
  medConsole.add(leftScreen);

  // Right angled coolant & thermal gradient monitor
  const rightScreen = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.54, 0.85),
    hudAmber
  );
  rightScreen.position.set(-0.22, 1.42, 1.18);
  rightScreen.rotation.y = -0.46;
  medConsole.add(rightScreen);

  // Tactile illuminated physical keyboard & slider deck
  const keyDeck = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.025, 1.10),
    titanium
  );
  keyDeck.position.set(0.18, 0.92, 0);
  medConsole.add(keyDeck);

  // Circular holographic telemetry projector halo ring hovering above console
  const holoProjectorRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.75, 0.02, 12, 32),
    hudCyan
  );
  holoProjectorRing.rotation.x = Math.PI / 2;
  holoProjectorRing.position.set(-0.15, 2.45, 0);
  medConsole.add(holoProjectorRing);

  // Operator Ergonomic Saddle Stools (Dual Operator Stools: Primary Physician & Telemetry Specialist)
  const opStool = new THREE.Group();
  opStool.name = "cryo-operator-stool";
  opStool.position.set(10.70, 0, 1.40);
  cryoPodsGroup.add(opStool);

  for (const stZ of [-0.90, 0]) {
    const stoolSub = new THREE.Group();
    stoolSub.position.set(0, 0, stZ);
    opStool.add(stoolSub);

    // Five-star caster pedestal base
    const stoolBaseHub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.09, 0.09, 12),
      darkSteel
    );
    stoolBaseHub.position.y = 0.08;
    stoolSub.add(stoolBaseHub);

    for (let leg = 0; leg < 5; leg++) {
      const lAngle = (leg * Math.PI * 2) / 5;
      const legArm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.018, 0.36, 8),
        darkSteel
      );
      legArm.rotation.z = Math.PI / 2;
      legArm.rotation.y = lAngle;
      legArm.position.set(Math.cos(lAngle) * 0.18, 0.08, Math.sin(lAngle) * 0.18);
      stoolSub.add(legArm);
    }

    // Chrome gas lift spindle
    const stoolPiston = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.028, 0.44, 12),
      stainless
    );
    stoolPiston.position.y = 0.28;
    stoolSub.add(stoolPiston);

    // Contoured saddle seat
    const seatCushion = new THREE.Mesh(
      new THREE.CylinderGeometry(0.26, 0.24, 0.08, 16),
      graphite
    );
    seatCushion.position.y = 0.52;
    stoolSub.add(seatCushion);

    // Lumbar support backrest
    const lumbarPost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 0.42, 8),
      titanium
    );
    lumbarPost.position.set(0, 0.70, 0.22);
    stoolSub.add(lumbarPost);

    const lumbarPad = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.18, 0.06),
      graphite
    );
    lumbarPad.position.set(0, 0.85, 0.22);
    stoolSub.add(lumbarPad);
  }

  // 7. Overhead Patient Transfer Gantry Crane with Magnetic Stasis Sling
  // Extended across the full width: spanning from x = 1.00 (above pods) to x = 11.00 (above console)
  // Ceiling-height dual runway beam network at Y = 3.65m
  const gantryCrane = new THREE.Group();
  gantryCrane.name = "cryo-gantry-crane";
  gantryCrane.position.set(6.00, 3.65, -2.50);
  cryoPodsGroup.add(gantryCrane);

  // Twin East-West bridge crane runway beams (10.40m length spanning the quadrant)
  for (const bZ of [-1.20, 1.20]) {
    const craneBeam = new THREE.Mesh(
      new THREE.BoxGeometry(10.40, 0.28, 0.18),
      darkSteel
    );
    craneBeam.position.set(0, 0, bZ);
    gantryCrane.add(craneBeam);

    const craneFlange = new THREE.Mesh(
      new THREE.BoxGeometry(10.40, 0.04, 0.26),
      safetyYellow
    );
    craneFlange.position.set(0, -0.14, bZ);
    gantryCrane.add(craneFlange);

    // Ceiling suspension hangers
    for (const hX of [-4.5, -1.5, 1.5, 4.5]) {
      const hanger = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.45, 0.14),
        titanium
      );
      hanger.position.set(hX, 0.30, bZ);
      gantryCrane.add(hanger);
    }
  }

  // Cross-travel gantry trolley carriage
  const trolley = new THREE.Mesh(
    new THREE.BoxGeometry(0.85, 0.22, 2.65),
    safetyYellow
  );
  trolley.position.set(-1.50, -0.12, 0);
  gantryCrane.add(trolley);

  const hoistMotor = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.15, 0.45, 16),
    darkSteel
  );
  hoistMotor.rotation.z = Math.PI / 2;
  hoistMotor.position.set(-1.50, 0.04, 0);
  gantryCrane.add(hoistMotor);

  // 4 high-tensile braided steel hoist cables
  for (const cX of [-1.75, -1.25]) {
    for (const cZ of [-0.65, 0.65]) {
      const cable = new THREE.Mesh(
        new THREE.CylinderGeometry(0.007, 0.007, 1.35, 8),
        stainless
      );
      cable.position.set(cX, -0.85, cZ);
      gantryCrane.add(cable);
    }
  }

  // Rigid patient transfer stasis sling / magnetic stretcher
  const stretcher = new THREE.Group();
  stretcher.position.set(-1.50, -1.55, 0);
  gantryCrane.add(stretcher);

  const stretcherFrame = new THREE.Mesh(
    new THREE.BoxGeometry(0.68, 0.08, 2.15),
    ceramicWhite
  );
  stretcher.add(stretcherFrame);

  const stretcherBed = new THREE.Mesh(
    new THREE.BoxGeometry(0.56, 0.04, 2.05),
    graphite
  );
  stretcherBed.position.y = 0.04;
  stretcher.add(stretcherBed);

  // Magnetic stasis corner nodes
  for (const mX of [-0.30, 0.30]) {
    for (const mZ of [-0.98, 0.98]) {
      const magNode = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 0.10, 12),
        hudCyan
      );
      magNode.position.set(mX, 0.03, mZ);
      stretcher.add(magNode);
    }
  }

  // 8. Environmental Safety & Emergency Decontamination Pylon (Extended Eastward to x = 11.00, z = 3.50)
  // Greets visitors entering from the south corridor into the cryo quadrant (World X = -8.50, Z = -31.00)
  const safetyPylon = new THREE.Group();
  safetyPylon.name = "cryo-safety-station";
  safetyPylon.position.set(11.00, 0, 3.50);
  cryoPodsGroup.add(safetyPylon);

  // Recessed safety drainage pan base
  const safetySump = new THREE.Mesh(
    new THREE.BoxGeometry(1.20, 0.04, 1.20),
    darkSteel
  );
  safetySump.position.y = 0.02;
  safetyPylon.add(safetySump);

  const safetySumpGrate = new THREE.Mesh(
    new THREE.BoxGeometry(1.10, 0.02, 1.10),
    titanium
  );
  safetySumpGrate.position.y = 0.04;
  safetyPylon.add(safetySumpGrate);

  // Main safety pylon upright in industrial safety yellow (2.80m height)
  const pylonPost = new THREE.Mesh(
    new THREE.BoxGeometry(0.26, 2.80, 0.26),
    safetyYellow
  );
  pylonPost.position.y = 1.40;
  pylonPost.castShadow = true;
  safetyPylon.add(pylonPost);

  // Overhead emergency drench shower deluge ring & pull chain
  const showerPipe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 0.75, 8),
    stainless
  );
  showerPipe.position.set(-0.35, 2.65, 0);
  showerPipe.rotation.z = Math.PI / 2;
  safetyPylon.add(showerPipe);

  const showerHead = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.18, 0.12, 16),
    safetyYellow
  );
  showerHead.position.set(-0.65, 2.58, 0);
  safetyPylon.add(showerHead);

  const showerPullChain = new THREE.Mesh(
    new THREE.CylinderGeometry(0.005, 0.005, 0.85, 6),
    stainless
  );
  showerPullChain.position.set(-0.58, 2.10, 0);
  safetyPylon.add(showerPullChain);

  // Dual-nozzle emergency eye-wash basin with foot treadle
  const eyewashBasin = new THREE.Mesh(
    new THREE.CylinderGeometry(0.20, 0.14, 0.12, 16),
    safetyYellow
  );
  eyewashBasin.position.set(-0.28, 1.05, 0);
  safetyPylon.add(eyewashBasin);

  for (const nZ of [-0.06, 0.06]) {
    const nozzle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.016, 0.07, 8),
      stainless
    );
    nozzle.position.set(-0.28, 1.13, nZ);
    safetyPylon.add(nozzle);
  }

  // Emergency manual cryo-dump pull lever in safety red
  const emergencyDumpLever = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.25, 0.08),
    safetyRed
  );
  emergencyDumpLever.position.set(0.15, 1.40, 0);
  safetyPylon.add(emergencyDumpLever);

  // Wall-mounted Class D fire extinguisher cylinder
  const extinguisher = new THREE.Mesh(
    new THREE.CylinderGeometry(0.085, 0.085, 0.52, 12),
    safetyRed
  );
  extinguisher.position.set(0, 0.90, 0.20);
  safetyPylon.add(extinguisher);

  // Emergency resuscitation medical pack
  const traumaKit = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.32, 0.26),
    ceramicWhite
  );
  traumaKit.position.set(0, 1.55, 0.19);
  safetyPylon.add(traumaKit);

  // Top flashing hazard beacon lantern
  const beaconBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.10, 0.10, 0.09, 16),
    darkSteel
  );
  beaconBase.position.y = 2.84;
  safetyPylon.add(beaconBase);

  const beaconLens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.085, 0.085, 0.16, 16),
    hudAmber
  );
  beaconLens.position.y = 2.95;
  safetyPylon.add(beaconLens);

  // ─────────────────────────────────────────────────────────────────────────────
  // 9. INDUSTRIAL 6-DOF ROBOTIC MANIPULATOR ARM & SKY-POINTING SENSOR BAY
  // ─────────────────────────────────────────────────────────────────────────────
  // Positioned along the eastern perimeter edge gallery (X = 10.5, Z = -35.5).
  // Finished in high-visibility industrial safety ochre (aerospace orange) with
  // graphite accents. From the elbow (Joint 3), the arm bends downwards toward
  // the calibration pedestal while maintaining an articulated sky-pointing sensor.
  const robotChassis = new THREE.MeshStandardMaterial({
    color: 0xe07a1e, // Vivid industrial safety ochre / international aerospace orange
    metalness: 0.32,
    roughness: 0.28,
  });

  const robotArmGroup = new THREE.Group();
  robotArmGroup.name = "six-dof-robotic-arm";
  robotArmGroup.position.set(10.5, 0, -35.5);
  group.add(robotArmGroup);

  // Demarcation hazard perimeter ring on the floor
  const envelopeRing = new THREE.Mesh(
    new THREE.TorusGeometry(2.8, 0.012, 12, 48),
    gold
  );
  envelopeRing.name = "robot-envelope-ring";
  envelopeRing.rotation.x = Math.PI / 2;
  envelopeRing.position.y = 0.005;
  robotArmGroup.add(envelopeRing);

  // Dual recessed subfloor utility trench covers
  for (const tz of [-0.85, 0.85]) {
    const trenchCover = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.012, 1.8),
      subtleConduitCover
    );
    trenchCover.position.set(0.65, 0.008, tz);
    robotArmGroup.add(trenchCover);
  }

  // ── Curved Beveled Workstation Island around Outer Ring ──
  const workstationIsland = new THREE.Group();
  workstationIsland.name = "robot-workstation-island";
  robotArmGroup.add(workstationIsland);

  // Helper to construct precision curved ribbon shapes in 2D (mapped to 3D XZ via rotateX(-PI/2))
  const createCurvedShape = (rIn: number, rOut: number, a1: number, a2: number, segments: number = 36): THREE.Shape => {
    const shape = new THREE.Shape();
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const a = a1 + t * (a2 - a1);
      const x = rOut * Math.cos(a);
      const y = -rOut * Math.sin(a);
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    for (let i = segments; i >= 0; i--) {
      const t = i / segments;
      const a = a1 + t * (a2 - a1);
      const x = rIn * Math.cos(a);
      const y = -rIn * Math.sin(a);
      shape.lineTo(x, y);
    }
    shape.closePath();
    return shape;
  };

  const wsArcStart = Math.PI * 0.42;
  const wsArcEnd = Math.PI * 1.58;

  // 1. Recessed dark steel toe-kick base (Y: 0 to 0.12m)
  const baseShape = createCurvedShape(3.22, 3.78, wsArcStart, wsArcEnd, 36);
  const baseGeom = new THREE.ExtrudeGeometry(baseShape, { depth: 0.12, bevelEnabled: false, curveSegments: 36 });
  baseGeom.rotateX(-Math.PI / 2);
  const workstationBase = new THREE.Mesh(baseGeom, darkSteel);
  workstationBase.name = "robot-workstation-base";
  workstationBase.position.y = 0;
  workstationBase.receiveShadow = true;
  workstationIsland.add(workstationBase);

  // 2. Graphite island body pedestal (Y: 0.12 to 0.84m)
  const bodyShape = createCurvedShape(3.16, 3.84, wsArcStart, wsArcEnd, 36);
  const bodyGeom = new THREE.ExtrudeGeometry(bodyShape, { depth: 0.72, bevelEnabled: false, curveSegments: 36 });
  bodyGeom.rotateX(-Math.PI / 2);
  const workstationBody = new THREE.Mesh(bodyGeom, graphite);
  workstationBody.name = "robot-workstation-body";
  workstationBody.position.y = 0.12;
  workstationBody.castShadow = true;
  workstationBody.receiveShadow = true;
  workstationIsland.add(workstationBody);

  // 3. Honed titanium countertop slab (Y: 0.84 to 0.90m)
  const countertopShape = createCurvedShape(3.10, 3.90, wsArcStart, wsArcEnd, 36);
  const countertopGeom = new THREE.ExtrudeGeometry(countertopShape, { depth: 0.06, bevelEnabled: false, curveSegments: 36 });
  countertopGeom.rotateX(-Math.PI / 2);
  const workstationCountertop = new THREE.Mesh(countertopGeom, titanium);
  workstationCountertop.name = "robot-workstation-countertop";
  workstationCountertop.position.y = 0.84;
  workstationCountertop.castShadow = true;
  workstationCountertop.receiveShadow = true;
  workstationIsland.add(workstationCountertop);

  // 4. Precision stainless beveled chamfer rim along countertop edge (Y: 0.895 to 0.915m)
  const bevelRimShape = createCurvedShape(3.08, 3.92, wsArcStart, wsArcEnd, 36);
  const bevelRimGeom = new THREE.ExtrudeGeometry(bevelRimShape, {
    depth: 0.018,
    bevelEnabled: true,
    bevelThickness: 0.016,
    bevelSize: 0.016,
    bevelSegments: 3,
    curveSegments: 36,
  });
  bevelRimGeom.rotateX(-Math.PI / 2);
  const workstationBeveledEdge = new THREE.Mesh(bevelRimGeom, stainless);
  workstationBeveledEdge.name = "robot-workstation-beveled-edge";
  workstationBeveledEdge.position.y = 0.895;
  workstationBeveledEdge.castShadow = true;
  workstationIsland.add(workstationBeveledEdge);

  // 5. Embedded amber optical bus groove along the countertop arc (R = 3.50m)
  const wsGroove = new THREE.Mesh(
    new THREE.RingGeometry(3.48, 3.52, 48, 1, wsArcStart, wsArcEnd - wsArcStart),
    amberGlow
  );
  wsGroove.name = "robot-workstation-groove";
  wsGroove.rotation.x = -Math.PI / 2;
  wsGroove.position.y = 0.915;
  workstationIsland.add(wsGroove);

  // 6. Three precision docking calibration targets on the countertop surface
  const dockAngles = [Math.PI * 0.70, Math.PI * 1.00, Math.PI * 1.30];
  dockAngles.forEach((angle, idx) => {
    const dockGroup = new THREE.Group();
    dockGroup.name = `robot-calibration-dock-${idx + 1}`;
    dockGroup.position.set(Math.cos(angle) * 3.50, 0.915, Math.sin(angle) * 3.50);
    workstationIsland.add(dockGroup);

    const dockPad = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.012, 24),
      stainless
    );
    dockGroup.add(dockPad);

    const dockReticle = new THREE.Mesh(
      new THREE.TorusGeometry(0.08, 0.008, 8, 24),
      gold
    );
    dockReticle.rotation.x = Math.PI / 2;
    dockReticle.position.y = 0.008;
    dockGroup.add(dockReticle);
  });

  // ── Workstation Countertop Tools, Workpieces & Project Parts ──
  // Helper to place an object at radius r and angle theta, seated on the countertop (Y = 0.90m)
  const placeOnCountertop = (obj: THREE.Object3D, r: number, theta: number, yOffset: number = 0) => {
    obj.position.set(Math.cos(theta) * r, 0.90 + yOffset, Math.sin(theta) * r);
    obj.rotation.y = -theta + Math.PI / 2;
    workstationIsland.add(obj);
  };

  // 1. Tool Docking Rack (South-East sector: theta = 0.56 * PI, R = 3.50m)
  // Holds 3 quick-change interchangeable robotic end-effector tooling modules
  const toolRackGroup = new THREE.Group();
  toolRackGroup.name = "workstation-tool-rack";
  placeOnCountertop(toolRackGroup, 3.50, Math.PI * 0.56);

  const toolRackBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, 0.04, 0.22),
    darkSteel
  );
  toolRackBase.position.y = 0.02;
  toolRackGroup.add(toolRackBase);

  // 3 Tool Holster sockets
  for (let h = 0; h < 3; h++) {
    const hx = (h - 1) * 0.22;
    const socketRing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.07, 0.03, 16),
      stainless
    );
    socketRing.position.set(hx, 0.045, 0);
    toolRackGroup.add(socketRing);
  }

  // Tool 1: Optical Laser Profilometer End-Effector Module
  const toolLaser = new THREE.Group();
  toolLaser.name = "tool-module-laser-profilometer";
  toolLaser.position.set(-0.22, 0.05, 0);
  toolRackGroup.add(toolLaser);

  const laserBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.055, 0.16, 16),
    titanium
  );
  laserBody.position.y = 0.08;
  toolLaser.add(laserBody);

  const laserOptic = new THREE.Mesh(
    new THREE.ConeGeometry(0.035, 0.06, 16),
    gold
  );
  laserOptic.rotation.x = Math.PI;
  laserOptic.position.y = 0.19;
  toolLaser.add(laserOptic);

  // Tool 2: Adaptive Dual-Vacuum Suction Gripper Module
  const toolVac = new THREE.Group();
  toolVac.name = "tool-module-vacuum-gripper";
  toolVac.position.set(0, 0.05, 0);
  toolRackGroup.add(toolVac);

  const vacPlate = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.025, 0.08),
    titanium
  );
  vacPlate.position.y = 0.02;
  toolVac.add(vacPlate);

  for (const vx of [-0.04, 0.04]) {
    const bellowCup = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.035, 0.08, 12),
      graphite
    );
    bellowCup.position.set(vx, 0.07, 0);
    toolVac.add(bellowCup);

    const bellowFitting = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.03, 8),
      copper
    );
    bellowFitting.position.set(vx, 0.12, 0);
    toolVac.add(bellowFitting);
  }

  // Tool 3: High-Frequency Micro-Spindle Machining Tool
  const toolSpindle = new THREE.Group();
  toolSpindle.name = "tool-module-micro-spindle";
  toolSpindle.position.set(0.22, 0.05, 0);
  toolRackGroup.add(toolSpindle);

  const spindleCasing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.045, 0.18, 16),
    robotChassis
  );
  spindleCasing.position.y = 0.09;
  toolSpindle.add(spindleCasing);

  const spindleCollet = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.03, 0.04, 12),
    stainless
  );
  spindleCollet.position.y = 0.20;
  toolSpindle.add(spindleCollet);

  const spindleBit = new THREE.Mesh(
    new THREE.CylinderGeometry(0.006, 0.006, 0.06, 8),
    darkSteel
  );
  spindleBit.position.y = 0.24;
  toolSpindle.add(spindleBit);

  // 2. Active Aerospace Workpiece: Turbomachine Blisk on Rotary Chuck (theta = 1.00 * PI, West)
  const chuckGroup = new THREE.Group();
  chuckGroup.name = "workstation-rotary-chuck";
  placeOnCountertop(chuckGroup, 3.50, Math.PI * 1.00);

  const chuckBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.26, 0.06, 24),
    darkSteel
  );
  chuckBody.position.y = 0.03;
  chuckBody.castShadow = true;
  chuckGroup.add(chuckBody);

  // 3 Hardened Chuck Jaws
  for (let j = 0; j < 3; j++) {
    const jAngle = (j * Math.PI * 2) / 3;
    const jaw = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.04, 0.10),
      stainless
    );
    jaw.position.set(Math.cos(jAngle) * 0.17, 0.07, Math.sin(jAngle) * 0.17);
    jaw.rotation.y = -jAngle;
    chuckGroup.add(jaw);
  }

  // Workpiece: Integrally Bladed Rotor / Turbine Blisk
  const bliskGroup = new THREE.Group();
  bliskGroup.name = "workpiece-turbomachine-blisk";
  bliskGroup.position.set(0, 0.08, 0);
  chuckGroup.add(bliskGroup);

  const bliskHub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 0.05, 24),
    titanium
  );
  bliskHub.position.y = 0.025;
  bliskGroup.add(bliskHub);

  const bliskBore = new THREE.Mesh(
    new THREE.TorusGeometry(0.045, 0.008, 8, 20),
    gold
  );
  bliskBore.rotation.x = Math.PI / 2;
  bliskBore.position.y = 0.05;
  bliskGroup.add(bliskBore);

  // 14 Aerodynamic curved airfoil blades
  for (let b = 0; b < 14; b++) {
    const bAngle = (b * Math.PI * 2) / 14;
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(0.012, 0.04, 0.11),
      stainless
    );
    blade.position.set(Math.cos(bAngle) * 0.15, 0.035, Math.sin(bAngle) * 0.15);
    blade.rotation.y = -bAngle + 0.35;
    blade.rotation.z = 0.18;
    bliskGroup.add(blade);
  }

  // Metrology height gauge / optical dial indicator inspecting the blisk
  const gaugeGroup = new THREE.Group();
  gaugeGroup.name = "workstation-optical-micrometer";
  gaugeGroup.position.set(0.32, 0, 0);
  chuckGroup.add(gaugeGroup);

  const gaugeBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 0.02, 16),
    darkSteel
  );
  gaugeBase.position.y = 0.01;
  gaugeGroup.add(gaugeBase);

  const gaugeCol = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.24, 12),
    stainless
  );
  gaugeCol.position.y = 0.13;
  gaugeGroup.add(gaugeCol);

  const gaugeArm = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.02, 0.02),
    darkSteel
  );
  gaugeArm.position.set(-0.06, 0.20, 0);
  gaugeGroup.add(gaugeArm);

  const gaugeHead = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 0.05, 12),
    gold
  );
  gaugeHead.position.set(-0.13, 0.18, 0);
  gaugeGroup.add(gaugeHead);

  // 3. Parts Organizer Tray & Calibration Step Gauge (South-West sector: theta = 0.78 * PI)
  const partsGroup = new THREE.Group();
  partsGroup.name = "workstation-parts-tray";
  placeOnCountertop(partsGroup, 3.52, Math.PI * 0.78);

  const trayBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.025, 0.26),
    graphite
  );
  trayBody.position.y = 0.0125;
  partsGroup.add(trayBody);

  // Array of precision ground titanium dowel pins
  const dowelGroup = new THREE.Group();
  dowelGroup.name = "workpiece-dowel-pins";
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 4; c++) {
      const pin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.008, 0.008, 0.04, 8),
        titanium
      );
      pin.position.set(-0.11 + c * 0.035, 0.03, -0.05 + r * 0.04);
      dowelGroup.add(pin);
    }
  }
  partsGroup.add(dowelGroup);

  // Fastener pack and copper alignment shims
  for (let s = 0; s < 3; s++) {
    const shim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, 0.006, 12),
      copper
    );
    shim.position.set(0.08 + s * 0.03, 0.028, -0.04);
    partsGroup.add(shim);
  }

  // Metrology 5-tier Calibration Step Block
  const stepBlock = new THREE.Group();
  stepBlock.name = "workstation-calibration-step-block";
  stepBlock.position.set(0, 0, 0.07);
  partsGroup.add(stepBlock);

  for (let st = 0; st < 4; st++) {
    const stHeight = 0.015 + st * 0.012;
    const stepMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, stHeight, 0.06),
      stainless
    );
    stepMesh.position.set(-0.08 + st * 0.055, stHeight / 2, 0);
    stepBlock.add(stepMesh);
  }

  // 4. Satellite Propulsion Manifold Sub-Assembly (North-West sector: theta = 1.25 * PI)
  const manifoldGroup = new THREE.Group();
  manifoldGroup.name = "workpiece-satellite-manifold";
  placeOnCountertop(manifoldGroup, 3.50, Math.PI * 1.25);

  const viseBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.04, 0.18),
    darkSteel
  );
  viseBase.position.y = 0.02;
  manifoldGroup.add(viseBase);

  // Satellite manifold core block
  const manifoldBlock = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.12, 0.12),
    titanium
  );
  manifoldBlock.position.y = 0.10;
  manifoldBlock.castShadow = true;
  manifoldGroup.add(manifoldBlock);

  // Solenoid valve pods on manifold
  for (const vx of [-0.05, 0.05]) {
    for (const vz of [-0.03, 0.03]) {
      const valve = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.018, 0.07, 12),
        gold
      );
      valve.position.set(vx, 0.18, vz);
      manifoldGroup.add(valve);
    }
  }

  // Curved propellant feed tubes
  const feedTube = new THREE.Mesh(
    new THREE.TorusGeometry(0.07, 0.009, 8, 16, Math.PI),
    copper
  );
  feedTube.rotation.z = Math.PI / 2;
  feedTube.position.set(-0.09, 0.11, 0);
  manifoldGroup.add(feedTube);

  // 5. Minimalist Angled Diagnostic Slate (North sector: theta = 1.45 * PI)
  const slateGroup = new THREE.Group();
  slateGroup.name = "workstation-diagnostic-slate";
  placeOnCountertop(slateGroup, 3.48, Math.PI * 1.45);

  const slateDock = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.03, 0.14),
    darkSteel
  );
  slateDock.position.y = 0.015;
  slateGroup.add(slateDock);

  const slateDisplay = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.18, 0.012),
    smokedGlass
  );
  slateDisplay.position.set(0, 0.11, 0.02);
  slateDisplay.rotation.x = -0.55; // Ergonomic 32-degree viewing angle
  slateGroup.add(slateDisplay);

  const slateBezel = new THREE.Mesh(
    new THREE.BoxGeometry(0.284, 0.008, 0.014),
    amberGlow
  );
  slateBezel.position.set(0, 0.025, 0.06);
  slateGroup.add(slateBezel);

  // ── Dense Workstation Tooling, Workpieces, Fixtures & Project Parts ──
  // 6. Precision Hand Tool Stand (South Entrance Wing: theta = 0.46 * PI, R = 3.55m)
  const handToolGroup = new THREE.Group();
  handToolGroup.name = "workstation-hand-tool-stand";
  placeOnCountertop(handToolGroup, 3.55, Math.PI * 0.46);

  const toolStandBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.03, 0.14),
    darkSteel
  );
  toolStandBase.position.y = 0.015;
  handToolGroup.add(toolStandBase);

  const toolStandRack = new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 0.18, 0.02),
    stainless
  );
  toolStandRack.position.set(0, 0.10, -0.04);
  handToolGroup.add(toolStandRack);

  // Digital vernier caliper mounted on stand
  const caliperGroup = new THREE.Group();
  caliperGroup.name = "tool-digital-caliper";
  caliperGroup.position.set(-0.08, 0.10, 0.01);
  caliperGroup.rotation.z = Math.PI / 2;
  handToolGroup.add(caliperGroup);

  const caliperBeam = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.014, 0.006),
    stainless
  );
  caliperGroup.add(caliperBeam);

  const caliperLcd = new THREE.Mesh(
    new THREE.BoxGeometry(0.045, 0.024, 0.012),
    darkSteel
  );
  caliperLcd.position.x = -0.02;
  caliperGroup.add(caliperLcd);

  const caliperScreen = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.014, 0.002),
    amberGlow
  );
  caliperScreen.position.set(-0.02, 0, 0.007);
  caliperGroup.add(caliperScreen);

  // Precision knurled torque driver
  const torqueDriver = new THREE.Mesh(
    new THREE.CylinderGeometry(0.014, 0.014, 0.13, 12),
    titanium
  );
  torqueDriver.position.set(0.06, 0.10, 0.01);
  handToolGroup.add(torqueDriver);

  // Color-coded hex key drivers
  const hexColors = [gold, copper, stainless, graphite];
  hexColors.forEach((mat, idx) => {
    const driver = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, 0.10 + idx * 0.015, 8),
      mat
    );
    driver.position.set(0.10 + idx * 0.022, 0.08 + idx * 0.008, 0.01);
    handToolGroup.add(driver);
  });

  // 7. Pneumatic Fluid / Thermal Paste Dispenser (theta = 0.50 * PI, R = 3.32m, inner edge)
  const dispenserGroup = new THREE.Group();
  dispenserGroup.name = "workstation-fluid-dispenser";
  placeOnCountertop(dispenserGroup, 3.32, Math.PI * 0.50);

  const dispenserBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.07, 0.03, 16),
    darkSteel
  );
  dispenserBase.position.y = 0.015;
  dispenserGroup.add(dispenserBase);

  for (const sx of [-0.025, 0.025]) {
    const syringe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 0.11, 12),
      stainless
    );
    syringe.position.set(sx, 0.08, 0);
    dispenserGroup.add(syringe);

    const syringeTip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.003, 0.006, 0.03, 8),
      gold
    );
    syringeTip.position.set(sx, 0.14, 0);
    dispenserGroup.add(syringeTip);
  }

  // 8. Avionics Wiring Harness Assembly Board (theta = 0.64 * PI, R = 3.50m)
  const harnessGroup = new THREE.Group();
  harnessGroup.name = "workstation-avionics-harness";
  placeOnCountertop(harnessGroup, 3.50, Math.PI * 0.64);

  const harnessBoard = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.02, 0.24),
    graphite
  );
  harnessBoard.position.y = 0.01;
  harnessGroup.add(harnessBoard);

  // Guide pegs on harness board
  const pegCoords = [
    [-0.14, -0.06], [-0.08, 0.05], [0, -0.04], [0.08, 0.06], [0.14, -0.05],
  ];
  pegCoords.forEach(([px, pz]) => {
    const peg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.005, 0.005, 0.04, 8),
      stainless
    );
    peg.position.set(px, 0.03, pz);
    harnessGroup.add(peg);
  });

  // Braided cable bundles weaving through pegs
  const harnessLoom1 = new THREE.Mesh(
    new THREE.TorusGeometry(0.08, 0.01, 8, 16, Math.PI),
    darkSteel
  );
  harnessLoom1.rotation.x = Math.PI / 2;
  harnessLoom1.position.set(-0.06, 0.025, 0);
  harnessGroup.add(harnessLoom1);

  const harnessLoom2 = new THREE.Mesh(
    new THREE.TorusGeometry(0.08, 0.01, 8, 16, Math.PI),
    darkSteel
  );
  harnessLoom2.rotation.x = -Math.PI / 2;
  harnessLoom2.position.set(0.06, 0.025, 0);
  harnessGroup.add(harnessLoom2);

  // Gold D-sub avionics multipin connectors
  for (const cx of [-0.16, 0.16]) {
    const connector = new THREE.Mesh(
      new THREE.BoxGeometry(0.035, 0.018, 0.028),
      gold
    );
    connector.position.set(cx, 0.02, 0);
    harnessGroup.add(connector);
  }

  // 9. Precision Micro-Soldering Station (theta = 0.68 * PI, R = 3.72m, outer edge)
  const solderGroup = new THREE.Group();
  solderGroup.name = "workstation-soldering-station";
  placeOnCountertop(solderGroup, 3.72, Math.PI * 0.68);

  const solderBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.07, 0.14),
    darkSteel
  );
  solderBase.position.y = 0.035;
  solderGroup.add(solderBase);

  const solderLed = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.02, 0.004),
    amberGlow
  );
  solderLed.position.set(0, 0.05, 0.072);
  solderGroup.add(solderLed);

  const ironRest = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.02, 0.06, 12),
    stainless
  );
  ironRest.rotation.x = 0.45;
  ironRest.position.set(0.05, 0.08, 0.02);
  solderGroup.add(ironRest);

  const solderIron = new THREE.Mesh(
    new THREE.CylinderGeometry(0.007, 0.007, 0.12, 8),
    robotChassis
  );
  solderIron.rotation.x = 0.45;
  solderIron.position.set(0.05, 0.11, 0.035);
  solderGroup.add(solderIron);

  // 10. Multi-Tier Rotating Fastener Carousel (theta = 0.86 * PI, R = 3.68m, outer edge)
  const carouselGroup = new THREE.Group();
  carouselGroup.name = "workstation-fastener-carousel";
  placeOnCountertop(carouselGroup, 3.68, Math.PI * 0.86);

  const carouselShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.014, 0.014, 0.22, 12),
    stainless
  );
  carouselShaft.position.y = 0.11;
  carouselGroup.add(carouselShaft);

  const tierRadii = [0.12, 0.095, 0.075];
  tierRadii.forEach((tr, tIdx) => {
    const tier = new THREE.Mesh(
      new THREE.CylinderGeometry(tr, tr, 0.022, 20),
      graphite
    );
    tier.position.y = 0.03 + tIdx * 0.065;
    carouselGroup.add(tier);

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(tr, 0.004, 6, 20),
      stainless
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.04 + tIdx * 0.065;
    carouselGroup.add(rim);
  });

  // 11. Optical Fiber Spectrometer Head (theta = 0.90 * PI, R = 3.30m, inner edge)
  const spectroGroup = new THREE.Group();
  spectroGroup.name = "workstation-optical-spectrometer";
  placeOnCountertop(spectroGroup, 3.30, Math.PI * 0.90);

  const spectroClamp = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.04, 0.05),
    darkSteel
  );
  spectroClamp.position.y = 0.02;
  spectroGroup.add(spectroClamp);

  const spectroArm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.008, 0.12, 8),
    stainless
  );
  spectroArm.position.set(0, 0.08, 0);
  spectroGroup.add(spectroArm);

  const spectroBarrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.024, 0.024, 0.09, 16),
    titanium
  );
  spectroBarrel.rotation.x = Math.PI / 2;
  spectroBarrel.position.set(0, 0.14, 0.03);
  spectroGroup.add(spectroBarrel);

  const spectroAperture = new THREE.Mesh(
    new THREE.TorusGeometry(0.02, 0.004, 8, 16),
    amberGlow
  );
  spectroAperture.position.set(0, 0.14, 0.08);
  spectroGroup.add(spectroAperture);

  // 12. Aerospace Material Test Coupons in Slotted Rack (theta = 0.93 * PI, R = 3.62m)
  const couponRackGroup = new THREE.Group();
  couponRackGroup.name = "workpiece-material-test-coupons";
  placeOnCountertop(couponRackGroup, 3.62, Math.PI * 0.93);

  const couponRack = new THREE.Mesh(
    new THREE.BoxGeometry(0.20, 0.025, 0.08),
    darkSteel
  );
  couponRack.position.y = 0.0125;
  couponRackGroup.add(couponRack);

  const couponMats = [titanium, gold, copper, graphite, stainless];
  couponMats.forEach((cMat, cIdx) => {
    const coupon = new THREE.Mesh(
      new THREE.BoxGeometry(0.025, 0.07, 0.006),
      cMat
    );
    coupon.position.set(-0.06 + cIdx * 0.03, 0.045, 0);
    couponRackGroup.add(coupon);
  });

  // 13. Stator Casing Half-Ring in Dual V-Blocks (theta = 1.08 * PI, R = 3.48m)
  const statorGroup = new THREE.Group();
  statorGroup.name = "workpiece-stator-casing";
  placeOnCountertop(statorGroup, 3.48, Math.PI * 1.08);

  for (const vx of [-0.08, 0.08]) {
    const vBlock = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.04, 0.12),
      darkSteel
    );
    vBlock.position.set(vx, 0.02, 0);
    statorGroup.add(vBlock);
  }

  // Cylindrical titanium stator shroud half-segment
  const statorShell = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.14, 0.22, 24, 1, true, 0, Math.PI),
    titanium
  );
  statorShell.rotation.z = Math.PI / 2;
  statorShell.position.set(0, 0.07, 0);
  statorShell.castShadow = true;
  statorGroup.add(statorShell);

  // Inner guide vane ribs
  for (let vr = -3; vr <= 3; vr++) {
    const vane = new THREE.Mesh(
      new THREE.BoxGeometry(0.006, 0.025, 0.08),
      stainless
    );
    vane.position.set(vr * 0.025, 0.06, 0);
    statorGroup.add(vane);
  }

  // 14. Precision Micrometer Extension Rod Case (theta = 1.13 * PI, R = 3.70m, outer edge)
  const micrometerCase = new THREE.Group();
  micrometerCase.name = "workstation-micrometer-case";
  placeOnCountertop(micrometerCase, 3.70, Math.PI * 1.13);

  const caseBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.025, 0.14),
    graphite
  );
  caseBody.position.y = 0.0125;
  micrometerCase.add(caseBody);

  for (let mr = 0; mr < 4; mr++) {
    const rod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.004, 0.004, 0.10 + mr * 0.02, 8),
      stainless
    );
    rod.rotation.z = Math.PI / 2;
    rod.position.set(0, 0.028, -0.04 + mr * 0.025);
    micrometerCase.add(rod);
  }

  // 15. Ultrasonic Component Cleaning Bath (theta = 1.17 * PI, R = 3.32m, inner edge)
  const cleanerGroup = new THREE.Group();
  cleanerGroup.name = "workstation-ultrasonic-bath";
  placeOnCountertop(cleanerGroup, 3.32, Math.PI * 1.17);

  const cleanerTank = new THREE.Mesh(
    new THREE.BoxGeometry(0.20, 0.11, 0.15),
    stainless
  );
  cleanerTank.position.y = 0.055;
  cleanerGroup.add(cleanerTank);

  const cleanerLid = new THREE.Mesh(
    new THREE.BoxGeometry(0.19, 0.01, 0.14),
    smokedGlass
  );
  cleanerLid.position.y = 0.115;
  cleanerGroup.add(cleanerLid);

  const cleanerIndicator = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.012, 0.002),
    amberGlow
  );
  cleanerIndicator.position.set(0, 0.08, 0.076);
  cleanerGroup.add(cleanerIndicator);

  // 16. Articulated Stereo Inspection Microscope (theta = 1.34 * PI, R = 3.66m, outer edge)
  const microscopeGroup = new THREE.Group();
  microscopeGroup.name = "tool-inspection-microscope";
  placeOnCountertop(microscopeGroup, 3.66, Math.PI * 1.34);

  const scopeBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.03, 0.14),
    darkSteel
  );
  scopeBase.position.y = 0.015;
  microscopeGroup.add(scopeBase);

  const scopeColumn = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.015, 0.28, 12),
    stainless
  );
  scopeColumn.position.set(-0.04, 0.15, 0);
  microscopeGroup.add(scopeColumn);

  const scopeArm = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.02, 0.025),
    darkSteel
  );
  scopeArm.position.set(0.04, 0.24, 0);
  microscopeGroup.add(scopeArm);

  const scopeHead = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.09, 0.07),
    graphite
  );
  scopeHead.position.set(0.12, 0.21, 0);
  microscopeGroup.add(scopeHead);

  // Dual binocular eyepieces
  for (const ey of [-0.018, 0.018]) {
    const eyepiece = new THREE.Mesh(
      new THREE.CylinderGeometry(0.01, 0.01, 0.045, 10),
      darkSteel
    );
    eyepiece.rotation.x = -0.42;
    eyepiece.position.set(0.12, 0.27, ey);
    microscopeGroup.add(eyepiece);
  }

  // Ring illuminator around objective
  const ringLight = new THREE.Mesh(
    new THREE.TorusGeometry(0.03, 0.005, 8, 20),
    subtleConduitGlow
  );
  ringLight.rotation.x = Math.PI / 2;
  ringLight.position.set(0.12, 0.15, 0);
  microscopeGroup.add(ringLight);

  // 17. Spacecraft Reaction Wheel Sub-Assembly (theta = 1.38 * PI, R = 3.34m, inner edge)
  const reactionWheelGroup = new THREE.Group();
  reactionWheelGroup.name = "workpiece-reaction-wheel";
  placeOnCountertop(reactionWheelGroup, 3.34, Math.PI * 1.38);

  const nestBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.12, 0.025, 20),
    darkSteel
  );
  nestBase.position.y = 0.0125;
  reactionWheelGroup.add(nestBase);

  // Heavy gold inertia rim
  const inertiaRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.09, 0.018, 12, 28),
    gold
  );
  inertiaRim.rotation.x = Math.PI / 2;
  inertiaRim.position.y = 0.035;
  reactionWheelGroup.add(inertiaRim);

  const wheelHub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 0.04, 16),
    stainless
  );
  wheelHub.position.y = 0.035;
  reactionWheelGroup.add(wheelHub);

  // 18. Precision Dual-Channel Bench Power Supply (theta = 1.50 * PI, R = 3.62m, outer edge)
  const powerSupplyGroup = new THREE.Group();
  powerSupplyGroup.name = "workstation-bench-power-supply";
  placeOnCountertop(powerSupplyGroup, 3.62, Math.PI * 1.50);

  const powerBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.15, 0.16),
    darkSteel
  );
  powerBody.position.y = 0.075;
  powerSupplyGroup.add(powerBody);

  const ch1Display = new THREE.Mesh(
    new THREE.BoxGeometry(0.07, 0.03, 0.002),
    amberGlow
  );
  ch1Display.position.set(-0.045, 0.10, 0.082);
  powerSupplyGroup.add(ch1Display);

  const ch2Display = new THREE.Mesh(
    new THREE.BoxGeometry(0.07, 0.03, 0.002),
    subtleConduitGlow
  );
  ch2Display.position.set(0.045, 0.10, 0.082);
  powerSupplyGroup.add(ch2Display);

  // Binding posts
  const postColors = [safetyRed, darkSteel, gold];
  postColors.forEach((pMat, pIdx) => {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, 0.015, 8),
      pMat
    );
    post.rotation.x = Math.PI / 2;
    post.position.set(-0.06 + pIdx * 0.06, 0.035, 0.088);
    powerSupplyGroup.add(post);
  });

  // 19. Low-Profile Industrial Input Keypad (theta = 1.52 * PI, R = 3.36m, inner edge)
  const inputPadGroup = new THREE.Group();
  inputPadGroup.name = "workstation-input-pad";
  placeOnCountertop(inputPadGroup, 3.36, Math.PI * 1.52);

  const padBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.014, 0.12),
    graphite
  );
  padBody.position.y = 0.007;
  inputPadGroup.add(padBody);

  // Keycap grid
  for (let kr = 0; kr < 3; kr++) {
    for (let kc = 0; kc < 4; kc++) {
      const keycap = new THREE.Mesh(
        new THREE.BoxGeometry(0.024, 0.008, 0.022),
        stainless
      );
      keycap.position.set(-0.05 + kc * 0.034, 0.016, -0.03 + kr * 0.03);
      inputPadGroup.add(keycap);
    }
  }

  // 20. High-Visibility Safety Lockout / Emergency Stop Station (North Terminus: theta = 1.56 * PI, R = 3.48m)
  const estopGroup = new THREE.Group();
  estopGroup.name = "workstation-estop-station";
  placeOnCountertop(estopGroup, 3.48, Math.PI * 1.56);

  const estopBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.11, 0.04, 0.11),
    safetyYellow
  );
  estopBox.position.y = 0.02;
  estopGroup.add(estopBox);

  // Red mushroom button
  const estopButton = new THREE.Mesh(
    new THREE.CylinderGeometry(0.026, 0.016, 0.03, 16),
    safetyRed
  );
  estopButton.position.y = 0.045;
  estopGroup.add(estopButton);

  const estopReset = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.008, 0.015, 8),
    subtleConduitGlow
  );
  estopReset.position.set(0.035, 0.042, 0.035);
  estopGroup.add(estopReset);

  // Octagonal vibration-isolated cast-steel base plinth
  const robotPlinth = new THREE.Mesh(
    new THREE.CylinderGeometry(0.95, 1.05, 0.28, 8),
    darkSteel
  );
  robotPlinth.name = "robot-base-plinth";
  robotPlinth.position.y = 0.14;
  robotPlinth.castShadow = true;
  robotPlinth.receiveShadow = true;
  robotArmGroup.add(robotPlinth);

  // 8 Perimeter foundation anchor lugs with stainless washers
  for (let a = 0; a < 8; a++) {
    const aAngle = (a * Math.PI * 2) / 8 + Math.PI / 8;
    const anchorLug = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 0.09, 12),
      stainless
    );
    anchorLug.name = `robot-anchor-bolt-${a + 1}`;
    anchorLug.position.set(Math.cos(aAngle) * 0.94, 0.30, Math.sin(aAngle) * 0.94);
    robotArmGroup.add(anchorLug);
  }

  // Joint 1: Turntable / Base Yaw (Industrial Ochre Drive Housing)
  const robotJoint1 = new THREE.Group();
  robotJoint1.name = "robot-joint-1-turntable";
  robotJoint1.position.y = 0.28;
  robotArmGroup.add(robotJoint1);

  // Slewing ring bearing flange with bolt circle between plinth and turntable
  const j1BearingRing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.76, 0.78, 0.06, 32),
    darkSteel
  );
  j1BearingRing.name = "robot-joint-1-bearing-ring";
  j1BearingRing.position.y = 0.03;
  j1BearingRing.castShadow = true;
  robotJoint1.add(j1BearingRing);

  // Concentric 16-bolt circle pattern on slewing ring
  for (let b = 0; b < 16; b++) {
    const bAngle = (b * Math.PI * 2) / 16;
    const boltHead = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.016, 0.02, 8),
      stainless
    );
    boltHead.position.set(Math.cos(bAngle) * 0.74, 0.065, Math.sin(bAngle) * 0.74);
    robotJoint1.add(boltHead);
  }

  // Laser-etched zero-datum alignment index marker
  const j1DatumMarker = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, 0.04, 0.01),
    gold
  );
  j1DatumMarker.position.set(0, 0.15, 0.782);
  robotJoint1.add(j1DatumMarker);

  const j1Housing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.70, 0.78, 0.30, 24),
    robotChassis
  );
  j1Housing.position.y = 0.15;
  j1Housing.castShadow = true;
  robotJoint1.add(j1Housing);

  // Turntable circular gold encoder status ring
  const j1EncoderRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.64, 0.016, 12, 32),
    gold
  );
  j1EncoderRing.rotation.x = Math.PI / 2;
  j1EncoderRing.position.y = 0.30;
  robotJoint1.add(j1EncoderRing);

  // Dual servo motor pods on turntable flanks
  for (const mSide of [-1, 1]) {
    const motorPod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 0.36, 16),
      graphite
    );
    motorPod.position.set(mSide * 0.60, 0.18, -0.24);
    robotJoint1.add(motorPod);

    const motorCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.15, 0.06, 16),
      copper
    );
    motorCap.position.set(mSide * 0.60, 0.36, -0.24);
    robotJoint1.add(motorCap);
  }

  // Dynamic Hydraulic Counterbalance Cylinder with Nitrogen Accumulators
  const counterbalanceGroup = new THREE.Group();
  counterbalanceGroup.name = "robot-counterbalance-cylinder";
  counterbalanceGroup.position.set(0, 0.30, -0.52);
  robotJoint1.add(counterbalanceGroup);

  const cylBarrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 1.05, 16),
    robotChassis
  );
  cylBarrel.name = "robot-cylinder-barrel";
  cylBarrel.position.y = 0.525;
  counterbalanceGroup.add(cylBarrel);

  const cylCollar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.105, 0.105, 0.08, 16),
    gold
  );
  cylCollar.position.y = 1.02;
  counterbalanceGroup.add(cylCollar);

  const pistonRod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 0.95, 16),
    stainless
  );
  pistonRod.name = "robot-cylinder-rod";
  pistonRod.position.y = 1.25;
  counterbalanceGroup.add(pistonRod);

  // Piston Rod End Clevis with Spherical Bearing
  const cylClevis = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.12, 0.08),
    stainless
  );
  cylClevis.name = "robot-cylinder-clevis";
  cylClevis.position.y = 1.70;
  counterbalanceGroup.add(cylClevis);

  const clevisPin = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 0.11, 12),
    darkSteel
  );
  clevisPin.rotation.z = Math.PI / 2;
  clevisPin.position.y = 1.72;
  counterbalanceGroup.add(clevisPin);

  // Rigid Stainless Hydraulic Hardline with Banjo Fittings
  const hardlineGroup = new THREE.Group();
  hardlineGroup.name = "robot-hydraulic-hardline";
  hardlineGroup.position.set(0.095, 0.52, 0);
  counterbalanceGroup.add(hardlineGroup);

  const hardlinePipe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.01, 0.01, 0.88, 8),
    stainless
  );
  hardlineGroup.add(hardlinePipe);

  for (const by of [-0.42, 0.42]) {
    const banjoFitting = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, 0.025, 12),
      copper
    );
    banjoFitting.rotation.z = Math.PI / 2;
    banjoFitting.position.set(0, by, 0);
    hardlineGroup.add(banjoFitting);
  }

  // Twin Nitrogen Accumulator Tanks on Cylinder Base Trunnion
  const accumTanks = [-0.15, 0.15];
  accumTanks.forEach((atx, atIdx) => {
    const accum = new THREE.Group();
    accum.name = `robot-nitrogen-accumulator-${atIdx + 1}`;
    accum.position.set(atx, 0.38, 0.04);
    counterbalanceGroup.add(accum);

    const tankBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, 0.30, 16),
      darkSteel
    );
    accum.add(tankBody);

    const tankCapTop = new THREE.Mesh(
      new THREE.SphereGeometry(0.054, 12, 12),
      darkSteel
    );
    tankCapTop.position.y = 0.15;
    accum.add(tankCapTop);

    const chargingValve = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.035, 8),
      gold
    );
    chargingValve.position.y = 0.21;
    accum.add(chargingValve);

    const manifoldBlock = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.03, 0.04),
      copper
    );
    manifoldBlock.position.set(0, -0.15, 0);
    accum.add(manifoldBlock);
  });

  // Joint 2: Shoulder Pitch (Heavy transverse pivot axis)
  const robotJoint2 = new THREE.Group();
  robotJoint2.name = "robot-joint-2-shoulder";
  robotJoint2.position.set(0, 0.35, 0);
  robotJoint1.add(robotJoint2);

  const j2PivotBarrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.32, 0.88, 24),
    darkSteel
  );
  j2PivotBarrel.rotation.z = Math.PI / 2;
  j2PivotBarrel.position.y = 0.16;
  robotJoint2.add(j2PivotBarrel);

  // Concentric bearing axis hubs with retention caps on left and right flanks
  const j2PivotHubLeft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.35, 0.08, 24),
    stainless
  );
  j2PivotHubLeft.name = "robot-joint-2-pivot-hub-left";
  j2PivotHubLeft.rotation.z = Math.PI / 2;
  j2PivotHubLeft.position.set(-0.46, 0.16, 0);
  robotJoint2.add(j2PivotHubLeft);

  const j2PivotHubRight = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.35, 0.08, 24),
    stainless
  );
  j2PivotHubRight.name = "robot-joint-2-pivot-hub-right";
  j2PivotHubRight.rotation.z = Math.PI / 2;
  j2PivotHubRight.position.set(0.46, 0.16, 0);
  robotJoint2.add(j2PivotHubRight);

  // Bolt circle arrays on shoulder pivot hubs
  for (const hSide of [-0.46, 0.46]) {
    for (let hb = 0; hb < 8; hb++) {
      const hbAngle = (hb * Math.PI * 2) / 8;
      const hubBolt = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, 0.016, 6),
        darkSteel
      );
      hubBolt.rotation.z = Math.PI / 2;
      hubBolt.position.set(hSide + (hSide > 0 ? 0.042 : -0.042), 0.16 + Math.sin(hbAngle) * 0.24, Math.cos(hbAngle) * 0.24);
      robotJoint2.add(hubBolt);
    }
  }

  // J2 Shoulder High-Torque Brushless Servo Motor with Extruded Heat Sink Fins
  const j2ServoMotor = new THREE.Group();
  j2ServoMotor.name = "robot-j2-servo-motor";
  j2ServoMotor.position.set(0.52, 0.16, -0.32);
  robotJoint2.add(j2ServoMotor);

  const j2MotorBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.22, 0.26),
    darkSteel
  );
  j2ServoMotor.add(j2MotorBody);

  // Heat sink cooling fins along motor body
  for (let fn = -2; fn <= 2; fn++) {
    const fin = new THREE.Mesh(
      new THREE.BoxGeometry(0.012, 0.25, 0.24),
      graphite
    );
    fin.position.set(fn * 0.035, 0, 0);
    j2ServoMotor.add(fin);
  }

  // Rear optical resolver / digital encoder end-cap
  const j2ResolverCap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.075, 0.075, 0.06, 16),
    stainless
  );
  j2ResolverCap.rotation.x = Math.PI / 2;
  j2ResolverCap.position.set(0, 0, -0.16);
  j2ServoMotor.add(j2ResolverCap);

  // High-voltage power gland nut
  const j2GlandNut = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.025, 0.04, 8),
    copper
  );
  j2GlandNut.rotation.z = Math.PI / 2;
  j2GlandNut.position.set(0.10, -0.05, 0);
  j2ServoMotor.add(j2GlandNut);

  // Counterweight block extending backward from the shoulder pivot
  const counterWeight = new THREE.Mesh(
    new THREE.BoxGeometry(0.65, 0.48, 0.95),
    graphite
  );
  counterWeight.name = "robot-counterweight";
  counterWeight.position.set(0, 0.18, -0.62);
  robotJoint2.add(counterWeight);

  const counterWeightAccent = new THREE.Mesh(
    new THREE.BoxGeometry(0.67, 0.08, 0.97),
    copper
  );
  counterWeightAccent.position.set(0, 0.18, -0.62);
  robotJoint2.add(counterWeightAccent);

  // Technical Data Specification Plaque on front shoulder casting
  const specPlate = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.14, 0.008),
    stainless
  );
  specPlate.name = "robot-specification-plate";
  specPlate.position.set(0, 0.38, 0.20);
  robotJoint2.add(specPlate);

  const specStripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.015, 0.002),
    amberGlow
  );
  specStripe.position.set(0, 0.42, 0.205);
  robotJoint2.add(specStripe);

  // Triangular cast stiffening gussets at shoulder base
  for (const gSide of [-1, 1]) {
    const gusset = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.24, 0.24),
      robotChassis
    );
    gusset.rotation.x = -0.45;
    gusset.position.set(gSide * 0.16, 0.35, -0.12);
    robotJoint2.add(gusset);
  }

  // Upper Arm Link: Vivid industrial safety ochre dual-spar girder (2.20m length)
  const upperArm = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 2.20, 0.38),
    robotChassis
  );
  upperArm.name = "robot-upper-arm";
  upperArm.position.y = 1.10;
  upperArm.castShadow = true;
  robotJoint2.add(upperArm);

  // Side weight-reduction pockets with internal conduits
  for (const uSide of [-1, 1]) {
    const pocketInsert = new THREE.Mesh(
      new THREE.BoxGeometry(0.015, 1.80, 0.26),
      graphite
    );
    pocketInsert.position.set(uSide * 0.145, 1.10, 0);
    robotJoint2.add(pocketInsert);

    const conduitLine = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 1.70, 12),
      amberGlow
    );
    conduitLine.position.set(uSide * 0.15, 1.10, 0.05);
    robotJoint2.add(conduitLine);
  }

  // Energy chain carrier along upper arm spine with articulated link clips
  const upperChain = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 1.95, 0.09),
    darkSteel
  );
  upperChain.name = "robot-energy-chain-upper";
  upperChain.position.set(0, 1.10, -0.21);
  robotJoint2.add(upperChain);

  // Articulated cable chain clips along upper arm spine
  for (let cl = 0; cl < 8; cl++) {
    const clip = new THREE.Mesh(
      new THREE.BoxGeometry(0.13, 0.025, 0.105),
      graphite
    );
    clip.position.set(0, 0.25 + cl * 0.24, -0.21);
    robotJoint2.add(clip);
  }

  // Joint 3: Elbow Pitch (Bends arm downwards toward floor / workpiece)
  const robotJoint3 = new THREE.Group();
  robotJoint3.name = "robot-joint-3-elbow";
  robotJoint3.position.set(0, 2.20, 0);
  robotJoint3.rotation.z = 1.75; // Bent downwards
  robotJoint2.add(robotJoint3);

  const j3DriveDrum = new THREE.Mesh(
    new THREE.CylinderGeometry(0.26, 0.26, 0.72, 24),
    robotChassis
  );
  j3DriveDrum.rotation.z = Math.PI / 2;
  robotJoint3.add(j3DriveDrum);

  // Concentric 12-bolt pattern around J3 elbow drive drum
  for (let eb = 0; eb < 12; eb++) {
    const ebAngle = (eb * Math.PI * 2) / 12;
    const ebBolt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.016, 6),
      stainless
    );
    ebBolt.rotation.z = Math.PI / 2;
    ebBolt.position.set(0.37, Math.sin(ebAngle) * 0.20, Math.cos(ebAngle) * 0.20);
    robotJoint3.add(ebBolt);
  }

  // J3 Elbow External Brushless Servo Drive Motor with Heat Sink Fins
  const j3ServoMotor = new THREE.Group();
  j3ServoMotor.name = "robot-j3-servo-motor";
  j3ServoMotor.position.set(-0.42, 0, -0.16);
  robotJoint3.add(j3ServoMotor);

  const j3MotorBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.20, 0.22),
    darkSteel
  );
  j3ServoMotor.add(j3MotorBody);

  for (let fn = -2; fn <= 2; fn++) {
    const fin = new THREE.Mesh(
      new THREE.BoxGeometry(0.012, 0.22, 0.20),
      graphite
    );
    fin.position.set(fn * 0.03, 0, 0);
    j3ServoMotor.add(fin);
  }

  const j3ResolverCap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.065, 0.065, 0.05, 16),
    stainless
  );
  j3ResolverCap.rotation.x = Math.PI / 2;
  j3ResolverCap.position.set(0, 0, -0.13);
  j3ServoMotor.add(j3ResolverCap);

  const j3GlandNut = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.022, 0.035, 8),
    copper
  );
  j3GlandNut.rotation.z = Math.PI / 2;
  j3GlandNut.position.set(-0.09, -0.04, 0);
  j3ServoMotor.add(j3GlandNut);

  // Harmonic drive bearing collar and flexspline casing
  const j3BearingCollar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.28, 0.78, 24),
    darkSteel
  );
  j3BearingCollar.name = "robot-joint-3-bearing-collar";
  j3BearingCollar.rotation.z = Math.PI / 2;
  robotJoint3.add(j3BearingCollar);

  const j3RingBolts = new THREE.Mesh(
    new THREE.TorusGeometry(0.22, 0.016, 12, 24),
    gold
  );
  j3RingBolts.rotation.y = Math.PI / 2;
  j3RingBolts.position.x = 0.37;
  robotJoint3.add(j3RingBolts);

  // Forearm Link: Industrial Ochre spar beam reaching downwards (1.85m length)
  const foreArm = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 1.85, 0.28),
    robotChassis
  );
  foreArm.name = "robot-forearm";
  foreArm.position.y = 0.925;
  foreArm.castShadow = true;
  robotJoint3.add(foreArm);

  // Forearm graphite contrast side plates
  for (const fSide of [-1, 1]) {
    const sparPlate = new THREE.Mesh(
      new THREE.BoxGeometry(0.015, 1.55, 0.18),
      graphite
    );
    sparPlate.position.set(fSide * 0.115, 0.925, 0);
    robotJoint3.add(sparPlate);
  }

  // Lower energy chain along forearm spine with articulated link clips
  const lowerChain = new THREE.Mesh(
    new THREE.BoxGeometry(0.10, 1.65, 0.06),
    darkSteel
  );
  lowerChain.name = "robot-energy-chain-lower";
  lowerChain.position.set(0, 0.925, -0.16);
  robotJoint3.add(lowerChain);

  for (let cl = 0; cl < 7; cl++) {
    const clip = new THREE.Mesh(
      new THREE.BoxGeometry(0.11, 0.022, 0.075),
      graphite
    );
    clip.position.set(0, 0.20 + cl * 0.23, -0.16);
    robotJoint3.add(clip);
  }

  // Joint 4: Wrist Pitch Gimbal Yoke
  const robotJoint4 = new THREE.Group();
  robotJoint4.name = "robot-joint-4-wrist-pitch";
  robotJoint4.position.set(0, 1.85, 0);
  robotJoint4.rotation.x = -0.42;
  robotJoint3.add(robotJoint4);

  const j4Yoke = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.26, 0.26),
    darkSteel
  );
  robotJoint4.add(j4Yoke);

  // Cross-axis trunnion pivot pin with machined bushings
  const j4Trunnion = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.07, 0.42, 16),
    stainless
  );
  j4Trunnion.name = "robot-joint-4-trunnion";
  j4Trunnion.rotation.z = Math.PI / 2;
  robotJoint4.add(j4Trunnion);

  // Joint 5: Wrist Continuous Roll Axis
  const robotJoint5 = new THREE.Group();
  robotJoint5.name = "robot-joint-5-wrist-roll";
  robotJoint5.position.set(0, 0.20, 0);
  robotJoint4.add(robotJoint5);

  const j5Motor = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.18, 0.24, 20),
    robotChassis
  );
  robotJoint5.add(j5Motor);

  // Wrist Pneumatic Solenoid Valve Manifold
  const wristPneumatics = new THREE.Group();
  wristPneumatics.name = "robot-wrist-pneumatic-manifold";
  wristPneumatics.position.set(0.13, 0.08, 0);
  robotJoint5.add(wristPneumatics);

  const pneumoBlock = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.12, 0.09),
    darkSteel
  );
  wristPneumatics.add(pneumoBlock);

  // 3 Solenoid micro-valves
  for (let sv = -1; sv <= 1; sv++) {
    const valvePod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.04, 8),
      gold
    );
    valvePod.position.set(0.045, sv * 0.035, 0);
    valvePod.rotation.z = Math.PI / 2;
    wristPneumatics.add(valvePod);
  }

  // Sintered bronze exhaust mufflers
  for (const my of [-0.04, 0.04]) {
    const muffler = new THREE.Mesh(
      new THREE.CylinderGeometry(0.009, 0.012, 0.022, 8),
      copper
    );
    muffler.position.set(0, my, 0.05);
    muffler.rotation.x = Math.PI / 2;
    wristPneumatics.add(muffler);
  }

  // Cycloidal drive bearing flange with gold index ring
  const j5BearingFlange = new THREE.Mesh(
    new THREE.CylinderGeometry(0.20, 0.20, 0.04, 24),
    stainless
  );
  j5BearingFlange.name = "robot-joint-5-bearing-flange";
  j5BearingFlange.position.y = 0.13;
  robotJoint5.add(j5BearingFlange);

  const j5StatusRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.16, 0.012, 12, 24),
    gold
  );
  j5StatusRing.rotation.x = Math.PI / 2;
  j5StatusRing.position.y = 0.09;
  robotJoint5.add(j5StatusRing);

  // End Effector: Tooling Head & Gripper
  const endEffector = new THREE.Group();
  endEffector.name = "robot-end-effector";
  endEffector.position.set(0, 0.16, 0);
  robotJoint5.add(endEffector);

  // Quick-change tool changer collar
  const toolCollar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.19, 0.21, 0.14, 20),
    stainless
  );
  toolCollar.position.y = 0.07;
  endEffector.add(toolCollar);

  // Multi-Spectrum Optical Ring Sensor
  const sensorRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.20, 0.02, 12, 24),
    subtleConduitGlow
  );
  sensorRing.name = "robot-sensor-ring";
  sensorRing.rotation.x = Math.PI / 2;
  sensorRing.position.y = 0.14;
  endEffector.add(sensorRing);

  // 3-Finger Precision Adaptive Servo Gripper with Linear Actuators
  const gripperPhalanges: THREE.Mesh[] = [];
  for (let f = 0; f < 3; f++) {
    const fAngle = (f * Math.PI * 2) / 3;
    const fingerGroup = new THREE.Group();
    fingerGroup.name = `robot-gripper-finger-${f + 1}`;
    fingerGroup.position.set(Math.cos(fAngle) * 0.16, 0.14, Math.sin(fAngle) * 0.16);
    fingerGroup.rotation.y = -fAngle;
    endEffector.add(fingerGroup);

    // Miniature linear lead-screw actuator behind finger
    const actuatorGroup = new THREE.Group();
    actuatorGroup.name = `robot-gripper-actuator-${f + 1}`;
    actuatorGroup.position.set(-0.04, 0.08, 0);
    fingerGroup.add(actuatorGroup);

    const actuatorCyl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.10, 8),
      stainless
    );
    actuatorCyl.position.y = 0.05;
    actuatorGroup.add(actuatorCyl);

    const knucklePin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.007, 0.007, 0.055, 8),
      copper
    );
    knucklePin.rotation.z = Math.PI / 2;
    knucklePin.position.y = 0.09;
    actuatorGroup.add(knucklePin);

    const proxPhalange = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.22, 0.05),
      robotChassis
    );
    proxPhalange.position.set(0, 0.11, 0);
    proxPhalange.rotation.z = 0.16;
    fingerGroup.add(proxPhalange);
    gripperPhalanges.push(proxPhalange);

    const distClaw = new THREE.Mesh(
      new THREE.BoxGeometry(0.045, 0.17, 0.04),
      darkSteel
    );
    distClaw.position.set(0.045, 0.25, 0);
    distClaw.rotation.z = -0.28;
    fingerGroup.add(distClaw);

    const tactilePad = new THREE.Mesh(
      new THREE.BoxGeometry(0.016, 0.14, 0.03),
      gold
    );
    tactilePad.position.set(0.02, 0.25, 0);
    fingerGroup.add(tactilePad);
  }

  // Central Precision Optical Scanner Emitter (Clean optic lens - no laser beam)
  const laserScanner = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 0.08, 16),
    darkSteel
  );
  laserScanner.name = "robot-laser-scanner";
  laserScanner.position.y = 0.18;
  endEffector.add(laserScanner);

  const scannerOpticLens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.026, 0.026, 0.015, 16),
    gold
  );
  scannerOpticLens.position.y = 0.22;
  endEffector.add(scannerOpticLens);

  // Articulated Sky-Pointing Telemetry Sensor Turret
  // Mounted on the end-effector hub and angled upward pointing at the sky
  const skySensor = new THREE.Group();
  skySensor.name = "robot-sky-pointing-sensor";
  skySensor.position.set(0, 0.14, -0.15);
  skySensor.rotation.x = 1.15; // Angled sky-pointing through open ceiling
  endEffector.add(skySensor);

  const skyOpticBarrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.05, 0.22, 16),
    robotChassis
  );
  skyOpticBarrel.position.y = 0.11;
  skySensor.add(skyOpticBarrel);

  const skyLens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.038, 0.038, 0.02, 16),
    darkSteel
  );
  skyLens.position.y = 0.22;
  skySensor.add(skyLens);


  // ─────────────────────────────────────────────────────────────────────────────
  // 10. 3X SCALE HEAVY PLANETARY ROVER (ROTATING DISPLAY PLINTH)
  // ─────────────────────────────────────────────────────────────────────────────
  const roverPlinthGroup = new THREE.Group();
  roverPlinthGroup.name = "rover-showcase-plinth";
  roverPlinthGroup.position.set(7.5, 0, -49.2);
  group.add(roverPlinthGroup);

  // 3x Scale static beveled floor plinth
  const plinthBase = new THREE.Mesh(
    new THREE.CylinderGeometry(3.50, 3.65, 0.16, 64),
    darkSteel
  );
  plinthBase.position.y = 0.08;
  roverPlinthGroup.add(plinthBase);

  // Glowing perimeter runway ring
  const runwayRing = new THREE.Mesh(
    new THREE.TorusGeometry(3.55, 0.024, 16, 64),
    gold
  );
  runwayRing.rotation.x = Math.PI / 2;
  runwayRing.position.y = 0.16;
  roverPlinthGroup.add(runwayRing);

  // Rotating turntable plate
  const roverTurntable = new THREE.Group();
  roverTurntable.name = "rover-turntable";
  roverTurntable.position.y = 0.16;
  roverPlinthGroup.add(roverTurntable);

  const turnPlate = new THREE.Mesh(
    new THREE.CylinderGeometry(3.40, 3.40, 0.04, 64),
    titanium
  );
  turnPlate.position.y = 0.02;
  roverTurntable.add(turnPlate);

  // Concentric floor telemetry rings on turntable
  const outerTelemetryRing = new THREE.Mesh(
    new THREE.TorusGeometry(2.90, 0.012, 8, 48),
    darkSteel
  );
  outerTelemetryRing.rotation.x = Math.PI / 2;
  outerTelemetryRing.position.y = 0.041;
  roverTurntable.add(outerTelemetryRing);

  const innerTelemetryRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.60, 0.009, 8, 48),
    gold
  );
  innerTelemetryRing.rotation.x = Math.PI / 2;
  innerTelemetryRing.position.y = 0.041;
  roverTurntable.add(innerTelemetryRing);

  // ── 3x Scale Heavy Planetary Exploration Rover ("AUTUPO" Architecture) ──
  const cabArmor = new THREE.MeshStandardMaterial({
    color: 0x48505c,
    roughness: 0.42,
    metalness: 0.60,
  });

  const engineMetal = new THREE.MeshStandardMaterial({
    color: 0x181c22,
    roughness: 0.38,
    metalness: 0.85,
  });

  const tireRubber = new THREE.MeshStandardMaterial({
    color: 0x141619,
    roughness: 0.92,
    metalness: 0.08,
  });

  const bronzeManifold = new THREE.MeshStandardMaterial({
    color: 0x9a6538,
    roughness: 0.35,
    metalness: 0.85,
  });

  const heatBlued = new THREE.MeshStandardMaterial({
    color: 0x4338ca,
    roughness: 0.30,
    metalness: 0.90,
  });

  const holoTreadMat = new THREE.MeshPhysicalMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 2.2,
    transparent: true,
    opacity: 0.65,
    roughness: 0.15,
    transmission: 0.82,
    ior: 1.35,
  });

  const holoLatticeMat = new THREE.MeshBasicMaterial({
    color: 0x7dd3fc,
    wireframe: true,
    transparent: true,
    opacity: 0.75,
  });

  const holoChevronMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    emissive: 0x38bdf8,
    emissiveIntensity: 2.6,
    roughness: 0.20,
    metalness: 0.80,
  });

  // Dynamic animation mesh arrays (zero heap allocation in update loop)
  const turboImpellers: THREE.Mesh[] = [];
  const enginePulleys: THREE.Mesh[] = [];
  const radiatorFans: THREE.Mesh[] = [];

  // Rover Root Group (3x Scale Planetary Titan)
  const roverGroup = new THREE.Group();
  roverGroup.name = "planetary-heavy-rover";
  roverGroup.position.set(0, 0.88, 0);
  roverTurntable.add(roverGroup);

  // 1. Structural Ladder Chassis & Heavy Boxed Subframe
  const chassis = new THREE.Mesh(
    new THREE.BoxGeometry(4.80, 0.42, 1.85),
    darkSteel
  );
  chassis.name = "rover-chassis";
  chassis.position.set(0, 0.18, 0);
  chassis.castShadow = true;
  roverGroup.add(chassis);

  // Underside protective skid plate
  const skidPlate = new THREE.Mesh(
    new THREE.BoxGeometry(4.00, 0.08, 1.70),
    titanium
  );
  skidPlate.position.set(0, -0.05, 0);
  roverGroup.add(skidPlate);

  // Center transfer case & driveshafts
  const transferCase = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.32, 0.50),
    darkSteel
  );
  transferCase.position.set(0, 0.08, 0);
  roverGroup.add(transferCase);

  for (const [diffX, _diffSide] of [[1.60, 1], [-1.60, -1]] as const) {
    const diffPumpkin = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 12, 12),
      engineMetal
    );
    diffPumpkin.position.set(diffX, 0.08, 0);
    roverGroup.add(diffPumpkin);

    const driveShaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.028, Math.abs(diffX) - 0.28, 8),
      stainless
    );
    driveShaft.rotation.z = Math.PI / 2;
    driveShaft.position.set(diffX * 0.5, 0.08, 0);
    roverGroup.add(driveShaft);
  }

  // Tubular lower rocker step rails / rock sliders along both flanks
  for (const rkSide of [-1, 1]) {
    const rockerTube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 2.60, 12),
      stainless
    );
    rockerTube.rotation.z = Math.PI / 2;
    rockerTube.position.set(-0.10, -0.10, rkSide * 1.08);
    roverGroup.add(rockerTube);

    // Step bracket outriggers with perforated titanium footplates
    for (const brkX of [-0.90, 0, 0.90]) {
      const outrigger = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.06, 0.16),
        darkSteel
      );
      outrigger.position.set(brkX, -0.10, rkSide * 1.00);
      roverGroup.add(outrigger);

      const footplate = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.02, 0.14),
        titanium
      );
      footplate.position.set(brkX, -0.06, rkSide * 1.08);
      roverGroup.add(footplate);
    }
  }

  // 2. Front Cab & Chiseled Nose Module
  const noseCone = new THREE.Group();
  noseCone.name = "rover-nose-cone";
  noseCone.position.set(2.25, 0.65, 0);
  roverGroup.add(noseCone);

  // Faceted front nose armor core
  const noseArmorCore = new THREE.Mesh(
    new THREE.BoxGeometry(1.20, 0.85, 1.70),
    cabArmor
  );
  noseCone.add(noseArmorCore);

  // Forward sloping chisel prow plate
  const noseProwBevel = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.70, 1.66),
    cabArmor
  );
  noseProwBevel.position.set(0.40, -0.12, 0);
  noseProwBevel.rotation.z = -0.48;
  noseCone.add(noseProwBevel);

  // Angular side cheek deflectors
  for (const chkSide of [-1, 1]) {
    const sideCheek = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.65, 0.14),
      cabArmor
    );
    sideCheek.position.set(0.25, -0.08, chkSide * 0.82);
    sideCheek.rotation.y = chkSide * -0.22;
    noseCone.add(sideCheek);
  }

  // Lower titanium chin skid ramp
  const chinWedge = new THREE.Mesh(
    new THREE.ConeGeometry(0.75, 0.90, 4),
    titanium
  );
  chinWedge.rotation.y = Math.PI / 4;
  chinWedge.rotation.z = -Math.PI / 2;
  chinWedge.position.set(0.45, -0.20, 0);
  noseCone.add(chinWedge);

  // Pre-Runner Heavy Double-Tube Steel Bull Bar / Push Bumper
  const bullBarMain = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.045, 1.80, 12),
    darkSteel
  );
  bullBarMain.rotation.x = Math.PI / 2;
  bullBarMain.position.set(0.68, -0.15, 0);
  noseCone.add(bullBarMain);

  // Upper protection loop bar
  const bullBarHoop = new THREE.Mesh(
    new THREE.CylinderGeometry(0.038, 0.038, 1.25, 10),
    darkSteel
  );
  bullBarHoop.rotation.x = Math.PI / 2;
  bullBarHoop.position.set(0.62, 0.15, 0);
  noseCone.add(bullBarHoop);

  // Vertical bull bar upright stanchions
  for (const bbSide of [-0.55, 0.55]) {
    const bbStanchion = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.42, 0.04),
      darkSteel
    );
    bbStanchion.position.set(0.65, 0, bbSide);
    noseCone.add(bbStanchion);
  }

  // Under-bumper angled skid plate
  const bullBarSkid = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.03, 1.10),
    titanium
  );
  bullBarSkid.position.set(0.60, -0.28, 0);
  bullBarSkid.rotation.z = 0.55;
  noseCone.add(bullBarSkid);

  // Heavy Center Recovery Winch Assembly
  const winchHousing = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.20, 0.44),
    darkSteel
  );
  winchHousing.position.set(0.62, -0.15, 0);
  noseCone.add(winchHousing);

  const winchDrum = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.07, 0.28, 16),
    stainless
  );
  winchDrum.rotation.x = Math.PI / 2;
  winchDrum.position.set(0.62, -0.15, 0);
  noseCone.add(winchDrum);

  const winchFairlead = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.08, 0.26),
    titanium
  );
  winchFairlead.position.set(0.74, -0.15, 0);
  noseCone.add(winchFairlead);

  // Dual D-Ring Recovery Shackles
  for (const shkSide of [-0.42, 0.42]) {
    const shackleBracket = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.08, 0.04),
      darkSteel
    );
    shackleBracket.position.set(0.70, -0.22, shkSide);
    noseCone.add(shackleBracket);

    const shackleRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.065, 0.016, 8, 16),
      copper
    );
    shackleRing.position.set(0.75, -0.22, shkSide);
    shackleRing.rotation.y = Math.PI / 2;
    noseCone.add(shackleRing);
  }

  // High-Output Forward Projector LED Floodlights
  const floodlightsGroup = new THREE.Group();
  floodlightsGroup.name = "rover-floodlights";
  floodlightsGroup.position.set(2.78, 0.72, 0);
  roverGroup.add(floodlightsGroup);

  const floodHousing = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.18, 0.85),
    darkSteel
  );
  floodlightsGroup.add(floodHousing);

  for (const flSide of [-0.28, 0.28]) {
    const floodBezel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.065, 0.05, 16),
      titanium
    );
    floodBezel.rotation.z = Math.PI / 2;
    floodBezel.position.set(0.08, 0, flSide);
    floodlightsGroup.add(floodBezel);

    const floodLens = new THREE.Mesh(
      new THREE.CylinderGeometry(0.052, 0.052, 0.06, 16),
      cryoGlow
    );
    floodLens.rotation.z = Math.PI / 2;
    floodLens.position.set(0.09, 0, flSide);
    floodlightsGroup.add(floodLens);

    // Protective stone guard bar
    const stoneGuard = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, 0.14, 6),
      darkSteel
    );
    stoneGuard.position.set(0.12, 0, flSide);
    floodlightsGroup.add(stoneGuard);
  }

  // Tubular Fender Stays / Cab A-Pillar Grab Rails
  const fenderStaysGroup = new THREE.Group();
  fenderStaysGroup.name = "rover-fender-stays";
  roverGroup.add(fenderStaysGroup);

  for (const fsSide of [-1, 1]) {
    const stayBar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.024, 0.024, 1.45, 8),
      stainless
    );
    stayBar.position.set(2.05, 0.95, fsSide * 0.92);
    stayBar.rotation.x = fsSide * 0.20;
    stayBar.rotation.z = -0.62;
    fenderStaysGroup.add(stayBar);

    const stayBracket = new THREE.Mesh(
      new THREE.CylinderGeometry(0.038, 0.038, 0.06, 8),
      gold
    );
    stayBracket.position.set(1.50, 1.30, fsSide * 0.88);
    fenderStaysGroup.add(stayBracket);
  }

  // Panoramic Faceted Observation Cockpit Canopy
  const cockpitCanopy = new THREE.Mesh(
    new THREE.BoxGeometry(1.22, 0.95, 1.62),
    smokedGlass
  );
  cockpitCanopy.name = "rover-cockpit-canopy";
  cockpitCanopy.position.set(1.40, 1.25, 0);
  cockpitCanopy.rotation.z = 0.32;
  roverGroup.add(cockpitCanopy);

  // Structural A-pillar header cowl with sun visor brow
  const pillarHeader = new THREE.Mesh(
    new THREE.BoxGeometry(0.20, 0.96, 1.66),
    cabArmor
  );
  pillarHeader.position.set(1.88, 1.05, 0);
  pillarHeader.rotation.z = 0.32;
  roverGroup.add(pillarHeader);

  const sunVisorBrow = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.08, 1.68),
    cabArmor
  );
  sunVisorBrow.position.set(1.72, 1.55, 0);
  sunVisorBrow.rotation.z = 0.22;
  roverGroup.add(sunVisorBrow);

  // ── COCKPIT INTERIOR HUD & TELEMETRY DISPLAYS (Visible through smoked glass) ──
  const cockpitInterior = new THREE.Group();
  cockpitInterior.position.set(1.35, 1.15, 0);
  roverGroup.add(cockpitInterior);

  const dashConsole = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.35, 1.25),
    darkSteel
  );
  dashConsole.rotation.z = 0.32;
  cockpitInterior.add(dashConsole);

  // Dual glowing holographic HUD screens
  const hudScreenL = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.16, 0.32),
    hudCyan
  );
  hudScreenL.position.set(0.18, 0.10, 0.28);
  hudScreenL.rotation.z = 0.32;
  cockpitInterior.add(hudScreenL);

  const hudScreenR = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.16, 0.32),
    hudAmber
  );
  hudScreenR.position.set(0.18, 0.10, -0.28);
  hudScreenR.rotation.z = 0.32;
  cockpitInterior.add(hudScreenR);

  // Dual pilot steering yokes
  for (const yokeZ of [-0.28, 0.28]) {
    const yoke = new THREE.Mesh(
      new THREE.TorusGeometry(0.08, 0.014, 8, 16, Math.PI * 1.4),
      titanium
    );
    yoke.rotation.y = Math.PI / 2;
    yoke.rotation.z = 0.32;
    yoke.position.set(0.10, 0.05, yokeZ);
    cockpitInterior.add(yoke);
  }

  // Roof Tactical Avionics Computer Module
  const avionicsBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.65, 0.35, 0.60),
    darkSteel
  );
  avionicsBox.name = "rover-avionics-box";
  avionicsBox.position.set(1.10, 1.82, 0.25);
  roverGroup.add(avionicsBox);

  // Heat sink cooling fins on avionics pod
  for (let fi = 0; fi < 5; fi++) {
    const avionicsFin = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.04, 0.02),
      titanium
    );
    avionicsFin.position.set(0, 0.19, -0.20 + fi * 0.10);
    avionicsBox.add(avionicsFin);
  }

  // FLIR sensor turret dome
  const flirDome = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 12, 12),
    titanium
  );
  flirDome.position.set(0.20, 0.18, -0.15);
  avionicsBox.add(flirDome);

  const flirLens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 0.04, 12),
    cryoGlow
  );
  flirLens.rotation.z = Math.PI / 2;
  flirLens.position.set(0.28, 0.18, -0.15);
  avionicsBox.add(flirLens);

  const avionicsStatusLens = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.08, 0.16),
    amberGlow
  );
  avionicsStatusLens.position.set(0.33, 0, 0);
  avionicsBox.add(avionicsStatusLens);

  // Front steering rack & active hydraulic steering rams
  const steeringRack = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 1.80, 12),
    titanium
  );
  steeringRack.rotation.x = Math.PI / 2;
  steeringRack.position.set(1.90, 0.12, 0);
  roverGroup.add(steeringRack);

  for (const [stSide, stName] of [[1, "rover-steering-cylinder-left"], [-1, "rover-steering-cylinder-right"]] as const) {
    const steerCyl = new THREE.Group();
    steerCyl.name = stName;
    steerCyl.position.set(1.75, 0.14, stSide * 0.75);
    steerCyl.rotation.y = stSide * 0.35;
    roverGroup.add(steerCyl);

    const steerBarrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, 0.45, 10),
      darkSteel
    );
    steerBarrel.rotation.z = Math.PI / 2;
    steerCyl.add(steerBarrel);

    const steerRod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, 0.35, 8),
      stainless
    );
    steerRod.rotation.z = Math.PI / 2;
    steerRod.position.x = 0.25;
    steerCyl.add(steerRod);
  }

  // 3. Central Crew & Laboratory Module ("AUTUPO" Ceramic Armor Shell)
  const centralHull = new THREE.Mesh(
    new THREE.BoxGeometry(2.10, 1.35, 1.95),
    ceramicWhite
  );
  centralHull.name = "rover-central-hull";
  centralHull.position.set(-0.15, 1.05, 0);
  roverGroup.add(centralHull);

  // Upper tumblehome shoulder chamfers (sloping inward toward the roof)
  for (const shSide of [-1, 1]) {
    const shoulderChamfer = new THREE.Mesh(
      new THREE.BoxGeometry(2.08, 0.38, 0.42),
      ceramicWhite
    );
    shoulderChamfer.position.set(0, 0.62, shSide * 0.88);
    shoulderChamfer.rotation.x = shSide * 0.55;
    centralHull.add(shoulderChamfer);
  }

  // Lower boat-hull belly bevel panels (angled inward toward chassis for obstacle clearance)
  for (const bSide of [-1, 1]) {
    const bellyBevel = new THREE.Mesh(
      new THREE.BoxGeometry(2.08, 0.46, 0.38),
      ceramicWhite
    );
    bellyBevel.position.set(0, -0.60, bSide * 0.86);
    bellyBevel.rotation.x = bSide * 0.52;
    centralHull.add(bellyBevel);

    // Recessed horizontal observation slit window
    const windowSlit = new THREE.Mesh(
      new THREE.BoxGeometry(1.40, 0.16, 0.05),
      smokedGlass
    );
    windowSlit.position.set(0, 0.38, bSide * 0.99);
    centralHull.add(windowSlit);
  }

  // ── CONTOURED WHEEL WELL FENDER ARCHES (Frame all 4 wheels seamlessly) ──
  const wheelArchPositions = [
    [1.60, 1.08],   // Front-Left
    [-1.60, 1.08],  // Rear-Left
    [1.60, -1.08],  // Front-Right
    [-1.60, -1.08], // Rear-Right
  ];

  for (let wa = 0; wa < 4; wa++) {
    const archX = wheelArchPositions[wa][0];
    const archZ = wheelArchPositions[wa][1];
    const isL = archZ > 0;

    // Sculpted fender flare arch in ceramic white wrapping over the tire
    const fenderFlare = new THREE.Mesh(
      new THREE.TorusGeometry(0.88, 0.065, 12, 28, Math.PI),
      ceramicWhite
    );
    fenderFlare.position.set(archX, 0, archZ);
    fenderFlare.rotation.y = isL ? 0 : Math.PI;
    roverGroup.add(fenderFlare);

    // Inner wheel well splash shield liner
    const splashLiner = new THREE.Mesh(
      new THREE.TorusGeometry(0.86, 0.05, 8, 24, Math.PI),
      darkSteel
    );
    splashLiner.position.set(archX, 0, isL ? archZ - 0.06 : archZ + 0.06);
    splashLiner.rotation.y = isL ? 0 : Math.PI;
    roverGroup.add(splashLiner);

    // Flexible rubber mud flap / rock deflector
    const mudFlap = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.38, 0.34),
      tireRubber
    );
    mudFlap.position.set(archX - 0.82, -0.42, archZ);
    roverGroup.add(mudFlap);
  }

  // Stamped structural pill-shaped relief indentations and panel cutline beading
  const hullRibsGroup = new THREE.Group();
  hullRibsGroup.name = "rover-hull-ribs";
  centralHull.add(hullRibsGroup);

  for (const hrSide of [-1, 1]) {
    // Dedicated Stamped "AUTUPO" Brand Nameplate Plate
    const brandBadgePlate = new THREE.Mesh(
      new THREE.BoxGeometry(1.30, 0.22, 0.025),
      titanium
    );
    brandBadgePlate.position.set(0.05, -0.12, hrSide * 0.985);
    hullRibsGroup.add(brandBadgePlate);

    const brandBadgeInner = new THREE.Mesh(
      new THREE.BoxGeometry(1.20, 0.14, 0.035),
      darkSteel
    );
    brandBadgeInner.position.set(0.05, -0.12, hrSide * 0.985);
    hullRibsGroup.add(brandBadgeInner);

    // Embossed brand emblem bars (representing the stylized AUTUPO typography)
    for (let eb = 0; eb < 6; eb++) {
      const typeEmboss = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.08, 0.045),
        ceramicWhite
      );
      typeEmboss.position.set(-0.45 + eb * 0.18, -0.12, hrSide * 0.985);
      hullRibsGroup.add(typeEmboss);
    }

    // Panel seam beading trims & door frame cutline
    const seamVertical = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 1.25, 0.02),
      darkSteel
    );
    seamVertical.position.set(-0.65, 0, hrSide * 0.985);
    hullRibsGroup.add(seamVertical);

    // Exterior door hinge blocks
    for (const hgY of [-0.35, 0.35]) {
      const hinge = new THREE.Mesh(
        new THREE.CylinderGeometry(0.028, 0.028, 0.09, 8),
        darkSteel
      );
      hinge.position.set(-0.65, hgY, hrSide * 1.00);
      hullRibsGroup.add(hinge);
    }

    // Flush door handle latch
    const doorHandle = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.04, 0.03),
      titanium
    );
    doorHandle.position.set(-0.25, 0.05, hrSide * 0.99);
    hullRibsGroup.add(doorHandle);

    // Corner structural fastener rosettes
    for (const [rx, ry] of [[-0.90, 0.50], [-0.90, -0.50], [0.90, 0.50], [0.90, -0.50]]) {
      const rosette = new THREE.Mesh(
        new THREE.CylinderGeometry(0.022, 0.022, 0.02, 8),
        gold
      );
      rosette.rotation.x = Math.PI / 2;
      rosette.position.set(rx, ry, hrSide * 0.985);
      hullRibsGroup.add(rosette);
    }
  }

  // Circular emergency ingress porthole on left flank (as seen in concept)
  const portholeFlange = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.24, 0.05, 24),
    darkSteel
  );
  portholeFlange.rotation.x = Math.PI / 2;
  portholeFlange.position.set(-0.45, 1.05, 0.99);
  roverGroup.add(portholeFlange);

  const portholeGlass = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.18, 0.06, 24),
    smokedGlass
  );
  portholeGlass.rotation.x = Math.PI / 2;
  portholeGlass.position.set(-0.45, 1.05, 0.99);
  roverGroup.add(portholeGlass);

  const copperLatch = new THREE.Mesh(
    new THREE.TorusGeometry(0.20, 0.016, 8, 20),
    copper
  );
  copperLatch.position.set(-0.45, 1.05, 1.02);
  roverGroup.add(copperLatch);

  // Atmospheric pressure relief valves & access ports
  for (const vPos of [[0.40, 0.65], [0.65, 0.65]]) {
    const valve = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, 0.05, 12),
      gold
    );
    valve.rotation.x = Math.PI / 2;
    valve.position.set(vPos[0], vPos[1], 0.99);
    roverGroup.add(valve);
  }

  // 4. Exposed Rear Powertrain & Machinery Bay
  const powertrainBay = new THREE.Group();
  powertrainBay.name = "rover-powertrain-bay";
  powertrainBay.position.set(-1.85, 1.05, 0);
  roverGroup.add(powertrainBay);

  // Rear upper armor cowl / roof spoiler (leaves lower sides open for machinery)
  const rearUpperArmor = new THREE.Mesh(
    new THREE.BoxGeometry(1.05, 0.55, 1.92),
    ceramicWhite
  );
  rearUpperArmor.position.set(-0.20, 0.42, 0);
  powertrainBay.add(rearUpperArmor);

  // Angled rear armor facet (tail cone)
  const rearTailArmor = new THREE.Mesh(
    new THREE.BoxGeometry(0.48, 1.05, 1.82),
    ceramicWhite
  );
  rearTailArmor.position.set(-0.62, 0, 0);
  rearTailArmor.rotation.z = -0.28;
  powertrainBay.add(rearTailArmor);

  // Structural tubular roll-cage framing for exposed bay
  for (const rcSide of [-1, 1]) {
    const rcBent = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, 1.15, 8),
      darkSteel
    );
    rcBent.position.set(-0.15, -0.05, rcSide * 0.92);
    powertrainBay.add(rcBent);
  }

  // Heavy turbine / engine crankcase block
  const engineBlock = new THREE.Mesh(
    new THREE.BoxGeometry(1.00, 0.82, 1.30),
    engineMetal
  );
  engineBlock.position.set(0.12, -0.15, 0);
  powertrainBay.add(engineBlock);

  // Cylinder head cooling finning
  for (let chf = 0; chf < 6; chf++) {
    const fin = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 0.02, 1.25),
      titanium
    );
    fin.position.set(0.12, -0.35 + chf * 0.09, 0);
    powertrainBay.add(fin);
  }

  // ── SERPENTINE PULLEY BELT DRIVE (Animated Spinning Accessory Drive) ──
  const pulleyCrank = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.14, 0.06, 16),
    darkSteel
  );
  pulleyCrank.rotation.z = Math.PI / 2;
  pulleyCrank.position.set(0.64, -0.25, 0.20);
  powertrainBay.add(pulleyCrank);
  enginePulleys.push(pulleyCrank);

  const pulleyAlt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 0.06, 16),
    titanium
  );
  pulleyAlt.rotation.z = Math.PI / 2;
  pulleyAlt.position.set(0.64, 0.08, 0.32);
  powertrainBay.add(pulleyAlt);
  enginePulleys.push(pulleyAlt);

  const pulleyTensioner = new THREE.Mesh(
    new THREE.CylinderGeometry(0.065, 0.065, 0.06, 12),
    gold
  );
  pulleyTensioner.rotation.z = Math.PI / 2;
  pulleyTensioner.position.set(0.64, -0.05, -0.10);
  powertrainBay.add(pulleyTensioner);
  enginePulleys.push(pulleyTensioner);

  // Serpentine drive belt wrapping the pulleys
  const driveBelt = new THREE.Mesh(
    new THREE.TorusGeometry(0.24, 0.022, 6, 20),
    tireRubber
  );
  driveBelt.rotation.y = Math.PI / 2;
  driveBelt.position.set(0.64, -0.08, 0.15);
  powertrainBay.add(driveBelt);

  // Hydraulic oil reservoir tank with vertical sight-glass
  const hydReservoir = new THREE.Group();
  hydReservoir.name = "rover-hydraulic-reservoir";
  hydReservoir.position.set(-0.20, 0.15, 0.72);
  powertrainBay.add(hydReservoir);

  const resCan = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.14, 0.48, 16),
    titanium
  );
  hydReservoir.add(resCan);

  const resCap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 0.05, 12),
    copper
  );
  resCap.position.y = 0.26;
  hydReservoir.add(resCap);

  const sightGlass = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.015, 0.32, 8),
    cryoGlow
  );
  sightGlass.position.set(0.14, 0, 0);
  hydReservoir.add(sightGlass);

  // Twin Turbochargers with heat-treated bronze & burnt-blue exhaust runners
  for (const [tcSide, tcName] of [[1, "rover-turbocharger-1"], [-1, "rover-turbocharger-2"]] as const) {
    const turboGroup = new THREE.Group();
    turboGroup.name = tcName;
    turboGroup.position.set(0.12, 0.05, tcSide * 0.76);
    powertrainBay.add(turboGroup);

    // Compressor scroll snail housing
    const turboHousing = new THREE.Mesh(
      new THREE.TorusGeometry(0.18, 0.06, 12, 24),
      stainless
    );
    turboHousing.rotation.y = Math.PI / 2;
    turboGroup.add(turboHousing);

    const compressorInlet = new THREE.Mesh(
      new THREE.CylinderGeometry(0.10, 0.07, 0.08, 16),
      darkSteel
    );
    compressorInlet.rotation.x = Math.PI / 2;
    compressorInlet.position.z = tcSide * 0.06;
    turboGroup.add(compressorInlet);

    // Spinning gold turbine impeller wheel
    const turboImpeller = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.05, 12),
      gold
    );
    turboImpeller.rotation.x = Math.PI / 2;
    turboGroup.add(turboImpeller);
    turboImpellers.push(turboImpeller);

    // Heat-treated bronze curved exhaust runners
    const bronzeRunner = new THREE.Mesh(
      new THREE.CylinderGeometry(0.032, 0.032, 0.70, 10),
      bronzeManifold
    );
    bronzeRunner.rotation.z = Math.PI / 4;
    bronzeRunner.position.set(-0.22, -0.16, tcSide * 0.03);
    turboGroup.add(bronzeRunner);

    // Burnt-titanium heat-blued exhaust dump elbow
    const dumpElbow = new THREE.Mesh(
      new THREE.TorusGeometry(0.08, 0.028, 8, 16, Math.PI / 2),
      heatBlued
    );
    dumpElbow.position.set(-0.48, -0.22, tcSide * 0.03);
    dumpElbow.rotation.y = tcSide * Math.PI / 2;
    turboGroup.add(dumpElbow);

    // Braided oil feed line
    const oilFeed = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.35, 8),
      copper
    );
    oilFeed.position.set(0.05, 0.22, tcSide * 0.02);
    turboGroup.add(oilFeed);
  }

  // Intercooler radiator cooling matrix with spinning electric fans
  const intercooler = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.65, 0.95),
    darkSteel
  );
  intercooler.position.set(-0.75, -0.10, 0);
  powertrainBay.add(intercooler);

  for (const fanZ of [-0.25, 0.25]) {
    const fanCowl = new THREE.Mesh(
      new THREE.TorusGeometry(0.16, 0.02, 8, 20),
      titanium
    );
    fanCowl.rotation.y = Math.PI / 2;
    fanCowl.position.set(-0.82, -0.10, fanZ);
    powertrainBay.add(fanCowl);

    const fanHub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.03, 12),
      engineMetal
    );
    fanHub.rotation.z = Math.PI / 2;
    fanHub.position.set(-0.82, -0.10, fanZ);
    powertrainBay.add(fanHub);

    // Multi-blade electric cooling fan wheel
    const fanWheel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 0.02, 8),
      darkSteel
    );
    fanWheel.rotation.z = Math.PI / 2;
    fanWheel.position.set(-0.83, -0.10, fanZ);
    powertrainBay.add(fanWheel);
    radiatorFans.push(fanWheel);
  }

  // Circular rear diagnostic reflector / docking port
  const rearReflector = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 0.03, 16),
    amberGlow
  );
  rearReflector.rotation.z = Math.PI / 2;
  rearReflector.position.set(-0.84, 0.05, 0.55);
  powertrainBay.add(rearReflector);

  // Red LED rear tail/brake lamp clusters
  for (const tlSide of [-0.65, 0.65]) {
    const tailLamp = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.10, 0.24),
      hudAmber
    );
    tailLamp.position.set(-0.82, 0.32, tlSide);
    powertrainBay.add(tailLamp);
  }

  // Heavy rear tow pintle hitch
  const rearPintle = new THREE.Mesh(
    new THREE.TorusGeometry(0.08, 0.022, 8, 16),
    darkSteel
  );
  rearPintle.position.set(-0.88, -0.32, 0);
  powertrainBay.add(rearPintle);

  // Roof-Mounted Exhaust Snorkel with Cyclone Pre-Filter & Telemetry Mast
  const exhaustSnorkel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.065, 0.065, 0.85, 12),
    stainless
  );
  exhaustSnorkel.rotation.z = -0.45;
  exhaustSnorkel.position.set(-0.15, 0.95, -0.35);
  powertrainBay.add(exhaustSnorkel);

  const snorkelCyclone = new THREE.Mesh(
    new THREE.ConeGeometry(0.11, 0.16, 12),
    titanium
  );
  snorkelCyclone.position.set(-0.35, 1.30, -0.35);
  powertrainBay.add(snorkelCyclone);

  const telemetryAntenna = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 1.10, 8),
    titanium
  );
  telemetryAntenna.position.set(-0.45, 0.95, 0.55);
  powertrainBay.add(telemetryAntenna);

  const antennaTip = new THREE.Mesh(
    new THREE.SphereGeometry(0.035, 12, 12),
    gold
  );
  antennaTip.position.set(-0.45, 1.50, 0.55);
  powertrainBay.add(antennaTip);

  // 5. Massive 4-Wheel Heavy Planetary Suspension & Holographic Balloon Wheels
  const heavyWheelPositions = [
    [1.60, 0, 1.55],   // 1: Front-Left
    [-1.60, 0, 1.55],  // 2: Rear-Left
    [1.60, 0, -1.55],  // 3: Front-Right
    [-1.60, 0, -1.55], // 4: Rear-Right
  ];

  for (let w = 0; w < 4; w++) {
    const wx = heavyWheelPositions[w][0];
    const wy = heavyWheelPositions[w][1];
    const wz = heavyWheelPositions[w][2];
    const isLeft = wz > 0;

    // Heavy Cast Steering Knuckle & Double-Wishbone A-Arm Sub-Assembly
    const suspKnuckle = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.55, 0.18),
      darkSteel
    );
    suspKnuckle.position.set(wx, wy + 0.15, isLeft ? wz - 0.28 : wz + 0.28);
    roverGroup.add(suspKnuckle);

    const upperAArm = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.08, 0.38),
      titanium
    );
    upperAArm.position.set(wx, wy + 0.35, isLeft ? wz - 0.25 : wz + 0.25);
    roverGroup.add(upperAArm);

    const lowerAArm = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.10, 0.45),
      titanium
    );
    lowerAArm.position.set(wx, wy - 0.08, isLeft ? wz - 0.25 : wz + 0.25);
    roverGroup.add(lowerAArm);

    // Drive axle half-shaft with accordion CV boots
    const driveHalfShaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.38, 8),
      stainless
    );
    driveHalfShaft.rotation.x = Math.PI / 2;
    driveHalfShaft.position.set(wx, wy + 0.08, isLeft ? wz - 0.20 : wz + 0.20);
    roverGroup.add(driveHalfShaft);

    for (const cvz of [isLeft ? wz - 0.32 : wz + 0.32, isLeft ? wz - 0.12 : wz + 0.12]) {
      const cvBoot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.048, 0.048, 0.06, 10),
        tireRubber
      );
      cvBoot.rotation.x = Math.PI / 2;
      cvBoot.position.set(wx, wy + 0.08, cvz);
      roverGroup.add(cvBoot);
    }

    // Dual Heavy Coilover Shock Absorbers
    const shockGroup = new THREE.Group();
    shockGroup.name = `rover-wheel-shock-${w + 1}`;
    shockGroup.position.set(wx, wy + 0.38, isLeft ? wz - 0.22 : wz + 0.22);
    roverGroup.add(shockGroup);

    const shockBarrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 0.48, 12),
      darkSteel
    );
    shockBarrel.position.y = 0.10;
    shockGroup.add(shockBarrel);

    const shockPiston = new THREE.Mesh(
      new THREE.CylinderGeometry(0.024, 0.024, 0.40, 8),
      stainless
    );
    shockPiston.position.y = -0.15;
    shockGroup.add(shockPiston);

    // Outer gold progressive coiled suspension spring
    const shockSpring = new THREE.Mesh(
      new THREE.TorusGeometry(0.055, 0.012, 8, 20),
      gold
    );
    shockSpring.rotation.x = Math.PI / 2;
    shockSpring.position.y = 0.04;
    shockGroup.add(shockSpring);

    // Anodized blue damper adjustment collar
    const collar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.052, 0.052, 0.04, 12),
      holoChevronMat
    );
    collar.position.y = 0.26;
    shockGroup.add(collar);

    // Wheel Station Group
    const wheelStation = new THREE.Group();
    wheelStation.name = `rover-wheel-${w + 1}`;
    wheelStation.position.set(wx, wy, wz);
    roverGroup.add(wheelStation);

    // ── VOLUMETRIC BALLOON TIRE BODY (Deep Rugged Matte Dark Rubber Carcass) ──
    const tireCarcassGeom = new THREE.CylinderGeometry(0.76, 0.76, 0.50, 32);
    tireCarcassGeom.rotateX(Math.PI / 2);
    const tireCarcass = new THREE.Mesh(tireCarcassGeom, tireRubber);
    tireCarcass.castShadow = true;
    wheelStation.add(tireCarcass);

    // Rounded bulbous shoulder donuts (giving authentic balloon tire contour)
    for (const shZ of [-0.19, 0.19]) {
      const shoulderDonut = new THREE.Mesh(
        new THREE.TorusGeometry(0.70, 0.065, 16, 32),
        tireRubber
      );
      shoulderDonut.position.z = shZ;
      wheelStation.add(shoulderDonut);
    }

    // Sidewall transition bevels & bead protector rings
    for (const swZ of [-0.22, 0.22]) {
      const sidewallBevel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.73, 0.65, 0.08, 32),
        tireRubber
      );
      sidewallBevel.rotation.x = Math.PI / 2;
      sidewallBevel.position.z = swZ;
      wheelStation.add(sidewallBevel);

      const beadProtector = new THREE.Mesh(
        new THREE.TorusGeometry(0.61, 0.02, 8, 32),
        tireRubber
      );
      beadProtector.position.z = swZ;
      wheelStation.add(beadProtector);
    }

    // ── TWO-TONE PLANETARY BEADLOCK RIM (Ceramic White Beadlock + Vented Titanium Dish) ──
    const beadlockRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.58, 0.055, 16, 36),
      ceramicWhite
    );
    beadlockRim.position.z = isLeft ? 0.22 : -0.22;
    wheelStation.add(beadlockRim);

    const rimFlange = new THREE.Mesh(
      new THREE.CylinderGeometry(0.54, 0.54, 0.20, 32),
      titanium
    );
    rimFlange.rotation.x = Math.PI / 2;
    wheelStation.add(rimFlange);

    // 8 Radial rim spoke vent pockets
    for (let spk = 0; spk < 8; spk++) {
      const spkAngle = (spk * Math.PI * 2) / 8;
      const spokeVent = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.16, 0.02),
        darkSteel
      );
      spokeVent.position.set(
        Math.cos(spkAngle) * 0.44,
        Math.sin(spkAngle) * 0.44,
        isLeft ? 0.23 : -0.23
      );
      spokeVent.rotation.z = spkAngle;
      wheelStation.add(spokeVent);
    }

    // 16 Socket-head beadlock bolts around the white clamping ring
    for (let bl = 0; bl < 16; bl++) {
      const blAngle = (bl * Math.PI * 2) / 16;
      const bolt = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, 0.04, 6),
        darkSteel
      );
      bolt.rotation.x = Math.PI / 2;
      bolt.position.set(
        Math.cos(blAngle) * 0.58,
        Math.sin(blAngle) * 0.58,
        isLeft ? 0.24 : -0.24
      );
      wheelStation.add(bolt);
    }

    // ── CENTRAL PLANETARY REDUCTION HUB ──
    const magHub = new THREE.Group();
    magHub.name = `rover-wheel-mag-hub-${w + 1}`;
    magHub.position.z = isLeft ? 0.12 : -0.12;
    wheelStation.add(magHub);

    const hubCore = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 0.26, 20),
      darkSteel
    );
    hubCore.rotation.x = Math.PI / 2;
    magHub.add(hubCore);

    const axleEndCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.28, 12),
      copper
    );
    axleEndCap.rotation.x = Math.PI / 2;
    magHub.add(axleEndCap);

    const levEmitter = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.29, 12),
      cryoGlow
    );
    levEmitter.rotation.x = Math.PI / 2;
    magHub.add(levEmitter);

    // Concentric Inner Fastener Ring on Planetary Hub
    const innerBoltRing = new THREE.Group();
    innerBoltRing.name = `rover-wheel-inner-bolt-ring-${w + 1}`;
    wheelStation.add(innerBoltRing);

    for (let ib = 0; ib < 10; ib++) {
      const ibAngle = (ib * Math.PI * 2) / 10;
      const innerBolt = new THREE.Mesh(
        new THREE.CylinderGeometry(0.009, 0.009, 0.03, 6),
        gold
      );
      innerBolt.rotation.x = Math.PI / 2;
      innerBolt.position.set(
        Math.cos(ibAngle) * 0.32,
        Math.sin(ibAngle) * 0.32,
        isLeft ? 0.23 : -0.23
      );
      innerBoltRing.add(innerBolt);
    }

    // ── CONCENTRIC HOLOGRAPHIC LASER EMITTER RING ──
    const holoEmitterRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.62, 0.012, 8, 40),
      gold
    );
    holoEmitterRing.name = `rover-wheel-holo-emitter-ring-${w + 1}`;
    holoEmitterRing.position.z = isLeft ? 0.25 : -0.25;
    wheelStation.add(holoEmitterRing);

    for (let pz = 0; pz < 16; pz++) {
      const pzAngle = (pz * Math.PI * 2) / 16;
      const nozzle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.010, 0.010, 0.03, 6),
        copper
      );
      nozzle.position.set(Math.cos(pzAngle) * 0.62, Math.sin(pzAngle) * 0.62, isLeft ? 0.25 : -0.25);
      wheelStation.add(nozzle);
    }

    // ── HOLOGRAPHIC SOLID-LIGHT TREAD ENVELOPE (Radius 0.775m, Width 0.52m) ──
    const holoTreadGeom = new THREE.CylinderGeometry(0.775, 0.775, 0.52, 32, 1, true);
    holoTreadGeom.rotateX(Math.PI / 2);
    const holoTread = new THREE.Mesh(holoTreadGeom, holoTreadMat);
    holoTread.name = `rover-wheel-holographic-tread-${w + 1}`;
    wheelStation.add(holoTread);

    // Digital wireframe lattice cage
    const holoLatticeGeom = new THREE.CylinderGeometry(0.780, 0.780, 0.525, 32, 6, true);
    holoLatticeGeom.rotateX(Math.PI / 2);
    const holoLattice = new THREE.Mesh(holoLatticeGeom, holoLatticeMat);
    wheelStation.add(holoLattice);

    // ── STAGGERED DIRECTIONAL CHEVRON PADDLE LUGS (True Tractor Flotation Tread) ──
    const chevronGroup = new THREE.Group();
    chevronGroup.name = `rover-wheel-holo-tread-chevron-${w + 1}`;
    wheelStation.add(chevronGroup);

    // Outer shoulder cleats
    for (let ch = 0; ch < 16; ch++) {
      const chAngle = (ch * Math.PI * 2) / 16;
      const cosA = Math.cos(chAngle);
      const sinA = Math.sin(chAngle);

      const rubberLugOuter = new THREE.Mesh(
        new THREE.BoxGeometry(0.065, 0.14, 0.24),
        tireRubber
      );
      rubberLugOuter.position.set(cosA * 0.73, sinA * 0.73, 0.12);
      rubberLugOuter.rotation.z = chAngle;
      chevronGroup.add(rubberLugOuter);

      const cleatLugOuter = new THREE.Mesh(
        new THREE.BoxGeometry(0.045, 0.10, 0.22),
        holoChevronMat
      );
      cleatLugOuter.position.set(cosA * 0.76, sinA * 0.76, 0.12);
      cleatLugOuter.rotation.z = chAngle;
      chevronGroup.add(cleatLugOuter);
    }

    // Inner shoulder cleats (staggered by half-pitch Math.PI / 16 for aggressive tractor traction)
    for (let ch = 0; ch < 16; ch++) {
      const chAngle = ((ch + 0.5) * Math.PI * 2) / 16;
      const cosA = Math.cos(chAngle);
      const sinA = Math.sin(chAngle);

      const rubberLugInner = new THREE.Mesh(
        new THREE.BoxGeometry(0.065, 0.14, 0.24),
        tireRubber
      );
      rubberLugInner.position.set(cosA * 0.73, sinA * 0.73, -0.12);
      rubberLugInner.rotation.z = chAngle;
      chevronGroup.add(rubberLugInner);

      const cleatLugInner = new THREE.Mesh(
        new THREE.BoxGeometry(0.045, 0.10, 0.22),
        holoChevronMat
      );
      cleatLugInner.position.set(cosA * 0.76, sinA * 0.76, -0.12);
      cleatLugInner.rotation.z = chAngle;
      chevronGroup.add(cleatLugInner);
    }

    // ── GROUND HOLOGRAPHIC CONTACT PATCH FOOTPRINT FIELD ──
    const footprintField = new THREE.Mesh(
      new THREE.RingGeometry(0.08, 0.38, 24),
      holoTreadMat
    );
    footprintField.name = `rover-wheel-footprint-field-${w + 1}`;
    footprintField.rotation.x = -Math.PI / 2;
    footprintField.position.set(0, -0.775, 0);
    wheelStation.add(footprintField);

    const footprintOuterRing = new THREE.Mesh(
      new THREE.RingGeometry(0.42, 0.47, 24),
      holoChevronMat
    );
    footprintOuterRing.rotation.x = -Math.PI / 2;
    footprintOuterRing.position.set(0, -0.774, 0);
    wheelStation.add(footprintOuterRing);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 11. HIGH-TECH CALIBRATION TOOL STATION & DIAGNOSTIC BAY (SOUTH-WEST)
  // ─────────────────────────────────────────────────────────────────────────────
  const toolStationGroup = new THREE.Group();
  toolStationGroup.name = "calibration-tool-station";
  toolStationGroup.position.set(-13.0, 0, -29.6);
  group.add(toolStationGroup);

  // Recessed base plinth
  const stationPlinth = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 0.08, 0.88),
    darkSteel
  );
  stationPlinth.name = "tool-station-plinth";
  stationPlinth.position.y = 0.04;
  toolStationGroup.add(stationPlinth);

  // Modular flush drawer cabinets (left & right)
  const drawersL = new THREE.Mesh(
    new THREE.BoxGeometry(0.92, 0.68, 0.80),
    graphite
  );
  drawersL.name = "tool-station-drawers";
  drawersL.position.set(-1.05, 0.42, 0);
  toolStationGroup.add(drawersL);

  const drawersR = new THREE.Mesh(
    new THREE.BoxGeometry(0.92, 0.68, 0.80),
    graphite
  );
  drawersR.position.set(1.05, 0.42, 0);
  toolStationGroup.add(drawersR);

  // Cantilevered honed slate countertop
  const countertop = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 0.10, 0.94),
    titanium
  );
  countertop.name = "tool-station-countertop";
  countertop.position.y = 0.81;
  toolStationGroup.add(countertop);

  // Recessed magnetized shadow tray with calibration laser alignment notches
  const shadowTray = new THREE.Mesh(
    new THREE.BoxGeometry(1.15, 0.015, 0.48),
    darkSteel
  );
  shadowTray.name = "tool-station-shadow-tray";
  shadowTray.position.set(0, 0.87, 0.08);
  toolStationGroup.add(shadowTray);

  // Low-profile angled diagnostic readout screen
  const diagScreen = new THREE.Mesh(
    new THREE.BoxGeometry(0.85, 0.24, 0.03),
    smokedGlass
  );
  diagScreen.name = "tool-station-diagnostic-screen";
  diagScreen.position.set(0, 1.02, -0.32);
  diagScreen.rotation.x = -0.42; // tilted toward operator
  toolStationGroup.add(diagScreen);

  const diagDisplay = new THREE.Mesh(
    new THREE.PlaneGeometry(0.80, 0.20),
    subtleConduitGlow
  );
  diagDisplay.position.set(0, 1.02, -0.30);
  diagDisplay.rotation.x = -0.42;
  toolStationGroup.add(diagDisplay);

  // Overhead task bar with dual vertical stanchions
  const stanchionL = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 1.25, 12),
    titanium
  );
  stanchionL.position.set(-1.50, 1.45, -0.38);
  toolStationGroup.add(stanchionL);

  const stanchionR = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 1.25, 12),
    titanium
  );
  stanchionR.position.set(1.50, 1.45, -0.38);
  toolStationGroup.add(stanchionR);

  const taskBar = new THREE.Mesh(
    new THREE.BoxGeometry(3.08, 0.05, 0.08),
    gold
  );
  taskBar.name = "tool-station-task-bar";
  taskBar.position.set(0, 2.05, -0.38);
  toolStationGroup.add(taskBar);

  // ─────────────────────────────────────────────────────────────────────────────
  // 12. MID-NORTH PLANETARY ROVER SERVICE & DIAGNOSTIC BAY (X in [2.0, 7.5], Z in [-44.0, -30.0])
  // ─────────────────────────────────────────────────────────────────────────────
  const vehicleServiceBay = new THREE.Group();
  vehicleServiceBay.name = "vehicle-service-bay";
  group.add(vehicleServiceBay);

  // Reference for wheel balancer spindle dynamic rotation
  let balancerSpindleMesh: THREE.Group | null = null;

  // ── 1. High-Voltage Umbilical Rapid-Charging Pylon & Catenary Boom ──
  const chargingPylonGroup = new THREE.Group();
  chargingPylonGroup.name = "vehicle-charging-pylon";
  chargingPylonGroup.position.set(6.8, 0, -43.2);
  vehicleServiceBay.add(chargingPylonGroup);

  // Heavy steel base plinth with hazard border
  const chargePlinth = new THREE.Mesh(
    new THREE.BoxGeometry(1.20, 0.12, 1.20),
    darkSteel
  );
  chargePlinth.position.y = 0.06;
  chargePlinth.receiveShadow = true;
  chargingPylonGroup.add(chargePlinth);

  const chargePlinthTrim = new THREE.Mesh(
    new THREE.BoxGeometry(1.24, 0.02, 1.24),
    safetyYellow
  );
  chargePlinthTrim.position.y = 0.01;
  chargingPylonGroup.add(chargePlinthTrim);

  // 4 Foundation Anchor Hex Flanges
  for (const [bx, bz] of [[-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]]) {
    const bolt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.028, 0.06, 6),
      gold
    );
    bolt.position.set(bx, 0.14, bz);
    chargingPylonGroup.add(bolt);
  }

  // Vertical structural mast with ventilation louvers
  const chargeMast = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 3.20, 0.32),
    graphite
  );
  chargeMast.position.y = 1.66;
  chargeMast.castShadow = true;
  chargingPylonGroup.add(chargeMast);

  for (let lz = 0; lz < 6; lz++) {
    const louver = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.03, 0.22),
      titanium
    );
    louver.position.set(0, 1.20 + lz * 0.22, 0);
    chargingPylonGroup.add(louver);
  }

  // High-voltage hazard warning badge
  const hvBadge = new THREE.Mesh(
    new THREE.BoxGeometry(0.01, 0.26, 0.22),
    safetyYellow
  );
  hvBadge.position.set(-0.165, 1.85, 0);
  chargingPylonGroup.add(hvBadge);

  const hvInsignia = new THREE.Mesh(
    new THREE.BoxGeometry(0.012, 0.12, 0.10),
    safetyRed
  );
  hvInsignia.position.set(-0.168, 1.85, 0);
  chargingPylonGroup.add(hvInsignia);

  // Cantilevered overhead crane boom swinging out toward vehicle staging lane
  const chargingBoom = new THREE.Group();
  chargingBoom.name = "vehicle-charging-boom";
  chargingBoom.position.set(0, 3.10, 0);
  chargingPylonGroup.add(chargingBoom);

  const boomBeam = new THREE.Mesh(
    new THREE.BoxGeometry(1.80, 0.12, 0.12),
    titanium
  );
  boomBeam.position.set(-0.90, 0, 0);
  boomBeam.castShadow = true;
  chargingBoom.add(boomBeam);

  const boomGusset = new THREE.Mesh(
    new THREE.BoxGeometry(0.60, 0.60, 0.04),
    darkSteel
  );
  boomGusset.rotation.z = Math.PI / 4;
  boomGusset.position.set(-0.30, -0.30, 0);
  chargingBoom.add(boomGusset);

  // Flexible insulated high-voltage umbilical cable hanging in catenary curve
  const cableGroup = new THREE.Group();
  cableGroup.name = "vehicle-charging-cable";
  chargingBoom.add(cableGroup);

  const cableSegments = 10;
  for (let cs = 0; cs < cableSegments; cs++) {
    const t = cs / cableSegments;
    const catY = -Math.sin(t * Math.PI) * 0.45 - t * 1.55;
    const catX = -1.75 + t * 0.25;
    const segment = new THREE.Mesh(
      new THREE.CylinderGeometry(0.024, 0.024, 0.18, 10),
      safetyYellow
    );
    segment.position.set(catX, catY, 0);
    segment.rotation.z = 0.18;
    cableGroup.add(segment);
  }

  // Magnetic heavy-duty vehicle charge head & docking holster
  const chargeHead = new THREE.Mesh(
    new THREE.BoxGeometry(0.20, 0.22, 0.26),
    darkSteel
  );
  chargeHead.position.set(-1.50, -1.90, 0);
  chargingBoom.add(chargeHead);

  const chargeHalo = new THREE.Mesh(
    new THREE.TorusGeometry(0.08, 0.012, 8, 24),
    hudCyan
  );
  chargeHalo.rotation.y = Math.PI / 2;
  chargeHalo.position.set(-1.61, -1.90, 0);
  chargingBoom.add(chargeHalo);

  // Interactive charge telemetry kiosk pillar
  const chargeKiosk = new THREE.Group();
  chargeKiosk.name = "vehicle-charging-kiosk";
  chargeKiosk.position.set(0.45, 0.12, 0.55);
  chargingPylonGroup.add(chargeKiosk);

  const kioskPedestal = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.95, 0.20),
    graphite
  );
  kioskPedestal.position.y = 0.475;
  chargeKiosk.add(kioskPedestal);

  const kioskScreen = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.24, 0.04),
    smokedGlass
  );
  kioskScreen.position.set(0, 0.98, 0);
  kioskScreen.rotation.x = -0.35;
  chargeKiosk.add(kioskScreen);

  const kioskDisplay = new THREE.Mesh(
    new THREE.PlaneGeometry(0.26, 0.22),
    hudCyan
  );
  kioskDisplay.position.set(0, 0.98, 0.022);
  kioskDisplay.rotation.x = -0.35;
  chargeKiosk.add(kioskDisplay);

  // ── 2. Planetary Wheel & Solid-Light Tread Diagnostic Balancer ──
  const wheelBalancerGroup = new THREE.Group();
  wheelBalancerGroup.name = "vehicle-wheel-balancer";
  wheelBalancerGroup.position.set(5.4, 0, -39.0);
  vehicleServiceBay.add(wheelBalancerGroup);

  // Heavy milled bed plinth
  const balancerBed = new THREE.Mesh(
    new THREE.BoxGeometry(1.40, 0.22, 1.80),
    darkSteel
  );
  balancerBed.position.y = 0.11;
  balancerBed.receiveShadow = true;
  wheelBalancerGroup.add(balancerBed);

  // Dual precision machined T-slots in stainless
  for (const tx of [-0.35, 0.35]) {
    const tSlot = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.015, 1.76),
      stainless
    );
    tSlot.position.set(tx, 0.22, 0);
    wheelBalancerGroup.add(tSlot);
  }

  // Twin cast titanium bearing headstocks
  for (const bz of [-0.45, 0.45]) {
    const headstock = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.85, 0.22),
      titanium
    );
    headstock.position.set(0, 0.58, bz);
    headstock.castShadow = true;
    wheelBalancerGroup.add(headstock);

    const bearingCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 0.24, 16),
      darkSteel
    );
    bearingCap.rotation.x = Math.PI / 2;
    bearingCap.position.set(0, 0.95, bz);
    wheelBalancerGroup.add(bearingCap);
  }

  // Dynamic rotating wheel spindle group
  const spindleGroup = new THREE.Group();
  spindleGroup.name = "vehicle-wheel-balancer-spindle";
  spindleGroup.position.set(0, 0.95, 0);
  wheelBalancerGroup.add(spindleGroup);
  balancerSpindleMesh = spindleGroup;

  const spindleShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.055, 1.15, 20),
    stainless
  );
  spindleShaft.rotation.x = Math.PI / 2;
  spindleGroup.add(spindleShaft);

  // Full 3x-scale spare planetary rover wheel mounted on the arbor
  const spareWheel = new THREE.Group();
  spareWheel.name = "vehicle-spare-wheel";
  spindleGroup.add(spareWheel);

  // Central planetary magnetic hub
  const spareMagHub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.28, 0.26, 24),
    darkSteel
  );
  spareMagHub.rotation.x = Math.PI / 2;
  spareMagHub.castShadow = true;
  spareWheel.add(spareMagHub);

  // Concentric Gold Fastener Ring
  for (let sb = 0; sb < 10; sb++) {
    const sbAngle = (sb * Math.PI * 2) / 10;
    const sBolt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.009, 0.009, 0.03, 6),
      gold
    );
    sBolt.rotation.x = Math.PI / 2;
    sBolt.position.set(Math.cos(sbAngle) * 0.22, Math.sin(sbAngle) * 0.22, 0.135);
    spareWheel.add(sBolt);
  }

  // Holographic Solid-Light Emitter Ring & Nozzles
  const spareEmitterRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.62, 0.012, 8, 36),
    gold
  );
  spareEmitterRing.position.z = 0.14;
  spareWheel.add(spareEmitterRing);

  for (let sp = 0; sp < 16; sp++) {
    const spAngle = (sp * Math.PI * 2) / 16;
    const nozzle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.010, 0.010, 0.03, 6),
      copper
    );
    nozzle.position.set(Math.cos(spAngle) * 0.62, Math.sin(spAngle) * 0.62, 0.14);
    spareWheel.add(nozzle);
  }

  // Cyan Solid-Light Holographic Tread Envelope (Radius 0.775m, Width 0.52m)
  const spareTreadGeom = new THREE.CylinderGeometry(0.775, 0.775, 0.52, 32, 1, true);
  spareTreadGeom.rotateX(Math.PI / 2);
  const spareHoloTread = new THREE.Mesh(spareTreadGeom, holoTreadMat);
  spareHoloTread.name = "vehicle-spare-wheel-tread";
  spareWheel.add(spareHoloTread);

  const spareLatticeGeom = new THREE.CylinderGeometry(0.780, 0.780, 0.525, 32, 6, true);
  spareLatticeGeom.rotateX(Math.PI / 2);
  const spareLattice = new THREE.Mesh(spareLatticeGeom, holoLatticeMat);
  spareWheel.add(spareLattice);

  // Directional Chevron Flotation Cleats
  for (let sc = 0; sc < 16; sc++) {
    const scAngle = (sc * Math.PI * 2) / 16;
    const cosA = Math.cos(scAngle);
    const sinA = Math.sin(scAngle);

    const cleatOuter = new THREE.Mesh(
      new THREE.BoxGeometry(0.055, 0.11, 0.20),
      holoChevronMat
    );
    cleatOuter.position.set(cosA * 0.75, sinA * 0.75, 0.12);
    cleatOuter.rotation.z = scAngle;
    spareWheel.add(cleatOuter);

    const cleatInner = new THREE.Mesh(
      new THREE.BoxGeometry(0.055, 0.11, 0.20),
      tireRubber
    );
    cleatInner.position.set(cosA * 0.75, sinA * 0.75, -0.12);
    cleatInner.rotation.z = scAngle;
    spareWheel.add(cleatInner);
  }

  // Articulated Optical Laser Runout Measurement Arm
  const runoutArm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.016, 0.016, 0.65, 12),
    titanium
  );
  runoutArm.position.set(0.55, 1.25, 0);
  runoutArm.rotation.z = -0.45;
  wheelBalancerGroup.add(runoutArm);

  const laserHead = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.08, 0.14),
    darkSteel
  );
  laserHead.position.set(0.38, 1.48, 0);
  wheelBalancerGroup.add(laserHead);

  const laserEmitter = new THREE.Mesh(
    new THREE.SphereGeometry(0.018, 8, 8),
    hudAmber
  );
  laserEmitter.position.set(0.33, 1.48, 0);
  wheelBalancerGroup.add(laserEmitter);

  // Dynamic balance calibration screen
  const balancerSlate = new THREE.Group();
  balancerSlate.name = "vehicle-balancer-slate";
  balancerSlate.position.set(-0.65, 0.95, -0.75);
  wheelBalancerGroup.add(balancerSlate);

  const slateMast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.022, 0.95, 12),
    titanium
  );
  slateMast.position.y = -0.475;
  balancerSlate.add(slateMast);

  const slateScreen = new THREE.Mesh(
    new THREE.BoxGeometry(0.48, 0.32, 0.024),
    smokedGlass
  );
  slateScreen.rotation.y = 0.35;
  balancerSlate.add(slateScreen);

  const slateGraphic = new THREE.Mesh(
    new THREE.PlaneGeometry(0.44, 0.28),
    hudAmber
  );
  slateGraphic.position.z = 0.014;
  slateGraphic.rotation.y = 0.35;
  balancerSlate.add(slateGraphic);

  // ── 3. Master Technician Roll-Around Tool Chests & Workbenches ──
  const toolChestsGroup = new THREE.Group();
  toolChestsGroup.name = "vehicle-tool-chests";
  toolChestsGroup.position.set(6.2, 0, -34.8);
  vehicleServiceBay.add(toolChestsGroup);

  // Dual heavy steel rolling cabinets
  const chestBody = new THREE.Mesh(
    new THREE.BoxGeometry(2.40, 0.88, 0.82),
    graphite
  );
  chestBody.position.y = 0.52;
  chestBody.castShadow = true;
  toolChestsGroup.add(chestBody);

  // Corner protective bumpers in black rubber
  for (const [bx, bz] of [[-1.21, -0.42], [1.21, -0.42], [-1.21, 0.42], [1.21, 0.42]]) {
    const bumper = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.88, 0.04),
      tireRubber
    );
    bumper.position.set(bx, 0.52, bz);
    toolChestsGroup.add(bumper);
  }

  // 12 Full-extension ball-bearing drawer fronts with brushed stainless handles
  for (let col = 0; col < 2; col++) {
    const cx = -0.60 + col * 1.20;
    for (let row = 0; row < 6; row++) {
      const ry = 0.18 + row * 0.13;
      const drawerFace = new THREE.Mesh(
        new THREE.BoxGeometry(1.05, 0.11, 0.02),
        darkSteel
      );
      drawerFace.position.set(cx, ry, -0.42);
      toolChestsGroup.add(drawerFace);

      const drawerPull = new THREE.Mesh(
        new THREE.BoxGeometry(0.65, 0.018, 0.025),
        stainless
      );
      drawerPull.position.set(cx, ry, -0.435);
      toolChestsGroup.add(drawerPull);
    }
  }

  // Heavy-duty polyurethane swivel casters
  for (const [wx, wz] of [[-1.05, -0.35], [1.05, -0.35], [-1.05, 0.35], [1.05, 0.35]]) {
    const casterWheel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 0.04, 12),
      tireRubber
    );
    casterWheel.rotation.x = Math.PI / 2;
    casterWheel.position.set(wx, 0.045, wz);
    toolChestsGroup.add(casterWheel);
  }

  // Top anti-static grooved work mat
  const workMat = new THREE.Mesh(
    new THREE.BoxGeometry(2.38, 0.025, 0.82),
    tireRubber
  );
  workMat.name = "vehicle-work-mat";
  workMat.position.set(0, 0.9725, 0);
  toolChestsGroup.add(workMat);

  // Precision Tools on the Mat:
  // A. Pneumatic Heavy Impact Wrench
  const impactWrench = new THREE.Group();
  impactWrench.name = "vehicle-impact-wrench";
  impactWrench.position.set(-0.75, 0.985, -0.15);
  toolChestsGroup.add(impactWrench);

  const wrenchBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.09, 0.08),
    darkSteel
  );
  impactWrench.add(wrenchBody);

  const wrenchNose = new THREE.Mesh(
    new THREE.CylinderGeometry(0.032, 0.038, 0.12, 12),
    stainless
  );
  wrenchNose.rotation.z = Math.PI / 2;
  wrenchNose.position.x = -0.12;
  impactWrench.add(wrenchNose);

  const wrenchGrip = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.12, 0.045),
    safetyYellow
  );
  wrenchGrip.position.set(0.04, -0.09, 0);
  impactWrench.add(wrenchGrip);

  // B. Digital Planetary Torque Multiplier
  const torqueMultiplier = new THREE.Group();
  torqueMultiplier.name = "vehicle-torque-multiplier";
  torqueMultiplier.position.set(0.15, 0.985, -0.12);
  toolChestsGroup.add(torqueMultiplier);

  const multBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.042, 0.048, 0.28, 16),
    titanium
  );
  multBody.rotation.z = Math.PI / 2;
  torqueMultiplier.add(multBody);

  const multReactionArm = new THREE.Mesh(
    new THREE.BoxGeometry(0.024, 0.16, 0.04),
    darkSteel
  );
  multReactionArm.position.set(0.10, -0.06, 0);
  torqueMultiplier.add(multReactionArm);

  const multScreen = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.025, 0.015),
    hudCyan
  );
  multScreen.position.set(-0.04, 0.05, 0);
  torqueMultiplier.add(multScreen);

  // C. Socket Organizer Tray with Color-Coded Impact Sockets
  const socketTray = new THREE.Mesh(
    new THREE.BoxGeometry(0.48, 0.02, 0.18),
    darkSteel
  );
  socketTray.position.set(0.75, 0.995, -0.15);
  toolChestsGroup.add(socketTray);

  for (let s = 0; s < 8; s++) {
    const sock = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016 + s * 0.002, 0.016 + s * 0.002, 0.05 + s * 0.005, 12),
      s % 2 === 0 ? safetyRed : stainless
    );
    sock.position.set(0.55 + s * 0.055, 1.025 + s * 0.0025, -0.15);
    toolChestsGroup.add(sock);
  }

  // Perforated Tool Pegboard Backboard
  const pegboard = new THREE.Mesh(
    new THREE.BoxGeometry(2.38, 0.85, 0.04),
    titanium
  );
  pegboard.position.set(0, 1.41, 0.39);
  toolChestsGroup.add(pegboard);

  // Overhead Spring-Retractable Air Hose Reel
  const hoseReelGroup = new THREE.Group();
  hoseReelGroup.name = "vehicle-hose-reel";
  hoseReelGroup.position.set(1.15, 2.10, 0.39);
  toolChestsGroup.add(hoseReelGroup);

  const reelDrum = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.18, 0.12, 18),
    safetyYellow
  );
  reelDrum.rotation.z = Math.PI / 2;
  hoseReelGroup.add(reelDrum);

  const reelHose = new THREE.Mesh(
    new THREE.TorusGeometry(0.14, 0.022, 8, 20),
    safetyYellow
  );
  reelHose.rotation.y = Math.PI / 2;
  hoseReelGroup.add(reelHose);

  // ── 4. Ruggedized Mobile CAN-Bus Vehicle Diagnostic Trolley ──
  const diagTrolleyGroup = new THREE.Group();
  diagTrolleyGroup.name = "vehicle-diagnostic-trolley";
  diagTrolleyGroup.position.set(3.6, 0, -36.5);
  vehicleServiceBay.add(diagTrolleyGroup);

  // Tubular rolling aluminum frame
  const trolleyBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.85, 0.08, 0.65),
    darkSteel
  );
  trolleyBase.position.y = 0.08;
  diagTrolleyGroup.add(trolleyBase);

  for (const [cx, cz] of [[-0.35, -0.25], [0.35, -0.25], [-0.35, 0.25], [0.35, 0.25]]) {
    const wheel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.03, 12),
      tireRubber
    );
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(cx, 0.04, cz);
    diagTrolleyGroup.add(wheel);

    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.016, 1.25, 12),
      titanium
    );
    leg.position.set(cx, 0.70, cz);
    diagTrolleyGroup.add(leg);
  }

  // Upper Telemetry Display (6-Wheel Steer & Active Camber Vectors)
  const upperDiagScreen = new THREE.Group();
  upperDiagScreen.name = "vehicle-diag-screen-upper";
  upperDiagScreen.position.set(0, 1.35, -0.05);
  upperDiagScreen.rotation.x = -0.25;
  diagTrolleyGroup.add(upperDiagScreen);

  const screenBezel1 = new THREE.Mesh(
    new THREE.BoxGeometry(0.68, 0.42, 0.03),
    graphite
  );
  upperDiagScreen.add(screenBezel1);

  const screenPanel1 = new THREE.Mesh(
    new THREE.PlaneGeometry(0.64, 0.38),
    hudCyan
  );
  screenPanel1.position.z = 0.016;
  upperDiagScreen.add(screenPanel1);

  // Lower Telemetry Display (In-Wheel Motor Torque & Thermal Heatmap)
  const lowerDiagScreen = new THREE.Group();
  lowerDiagScreen.name = "vehicle-diag-screen-lower";
  lowerDiagScreen.position.set(0, 0.92, -0.12);
  lowerDiagScreen.rotation.x = -0.38;
  diagTrolleyGroup.add(lowerDiagScreen);

  const screenBezel2 = new THREE.Mesh(
    new THREE.BoxGeometry(0.68, 0.36, 0.03),
    graphite
  );
  lowerDiagScreen.add(screenBezel2);

  const screenPanel2 = new THREE.Mesh(
    new THREE.PlaneGeometry(0.64, 0.32),
    hudAmber
  );
  screenPanel2.position.z = 0.016;
  lowerDiagScreen.add(screenPanel2);

  // Coiled Diagnostic Interface Cable
  const diagCable = new THREE.Mesh(
    new THREE.TorusGeometry(0.12, 0.018, 8, 24),
    darkSteel
  );
  diagCable.name = "vehicle-diag-cable";
  diagCable.position.set(0.44, 0.85, 0);
  diagCable.rotation.y = Math.PI / 2;
  diagTrolleyGroup.add(diagCable);

  // ── 5. Hydraulic Crawler Chassis Floor Jacks & Heavy Service Ramps ──
  const chassisJacksGroup = new THREE.Group();
  chassisJacksGroup.name = "vehicle-chassis-jacks";
  chassisJacksGroup.position.set(3.4, 0, -41.0);
  vehicleServiceBay.add(chassisJacksGroup);

  // Twin Heavy-Duty Low-Profile Hydraulic Floor Jacks
  for (const [jx, rz] of [[-0.45, 0.22], [0.45, -0.18]]) {
    const jack = new THREE.Group();
    jack.position.set(jx, 0, 0);
    jack.rotation.y = rz;
    chassisJacksGroup.add(jack);

    const jackChassis = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.14, 0.78),
      safetyYellow
    );
    jackChassis.position.y = 0.08;
    jack.add(jackChassis);

    const liftPiston = new THREE.Mesh(
      new THREE.CylinderGeometry(0.042, 0.042, 0.28, 14),
      stainless
    );
    liftPiston.position.set(0, 0.20, -0.15);
    jack.add(liftPiston);

    const liftSaddle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.065, 0.024, 16),
      tireRubber
    );
    liftSaddle.position.set(0, 0.34, -0.15);
    jack.add(liftSaddle);

    const pumpHandle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.016, 0.88, 12),
      darkSteel
    );
    pumpHandle.position.set(0, 0.42, 0.42);
    pumpHandle.rotation.x = -0.65;
    jack.add(pumpHandle);
  }

  // Pair of drive-on titanium wheel alignment service ramps
  const rampLeft = new THREE.Mesh(
    new THREE.BoxGeometry(0.62, 0.24, 1.65),
    titanium
  );
  rampLeft.name = "vehicle-service-ramp-left";
  rampLeft.position.set(-1.15, 0.12, 0.15);
  rampLeft.rotation.x = 0.08;
  chassisJacksGroup.add(rampLeft);

  const rampRight = new THREE.Mesh(
    new THREE.BoxGeometry(0.62, 0.24, 1.65),
    titanium
  );
  rampRight.name = "vehicle-service-ramp-right";
  rampRight.position.set(1.15, 0.12, 0.15);
  rampRight.rotation.x = 0.08;
  chassisJacksGroup.add(rampRight);

  // Chevron hazard warning plate on ramp lips
  for (const rx of [-1.15, 1.15]) {
    const rampCurb = new THREE.Mesh(
      new THREE.BoxGeometry(0.64, 0.04, 0.08),
      safetyYellow
    );
    rampCurb.position.set(rx, 0.24, -0.62);
    chassisJacksGroup.add(rampCurb);
  }

  // ── 6. Pressurized Nitrogen Suspension Purge & Fluid Exchange Skid ──
  const fluidSkidGroup = new THREE.Group();
  fluidSkidGroup.name = "vehicle-fluid-service-skid";
  fluidSkidGroup.position.set(6.2, 0, -31.2);
  vehicleServiceBay.add(fluidSkidGroup);

  const skidBase = new THREE.Mesh(
    new THREE.BoxGeometry(1.15, 0.08, 0.82),
    darkSteel
  );
  skidBase.position.y = 0.04;
  skidBase.receiveShadow = true;
  fluidSkidGroup.add(skidBase);

  // 4 Elastomer Vibration Isolator Feet
  for (const [ix, iz] of [[-0.50, -0.34], [0.50, -0.34], [-0.50, 0.34], [0.50, 0.34]]) {
    const foot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.035, 12),
      tireRubber
    );
    foot.position.set(ix, 0.02, iz);
    fluidSkidGroup.add(foot);
  }

  // Twin Vertical High-Pressure Gas Cylinders
  const cylindersGroup = new THREE.Group();
  cylindersGroup.name = "vehicle-nitrogen-cylinders";
  fluidSkidGroup.add(cylindersGroup);

  // Cylinder 1: High-Purity Nitrogen (Olive Green)
  const cyl1 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 1.15, 20),
    new THREE.MeshStandardMaterial({ color: 0x3d4b38, roughness: 0.35, metalness: 0.70 })
  );
  cyl1.position.set(-0.25, 0.655, 0);
  cyl1.castShadow = true;
  cylindersGroup.add(cyl1);

  const cyl1Cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x3d4b38, roughness: 0.35, metalness: 0.70 })
  );
  cyl1Cap.position.set(-0.25, 1.23, 0);
  cylindersGroup.add(cyl1Cap);

  // Cylinder 2: Synthetic Hydro-Pneumatic Damping Fluid (Dark Graphite with Cyan Band)
  const cyl2 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 1.15, 20),
    graphite
  );
  cyl2.position.set(0.25, 0.655, 0);
  cyl2.castShadow = true;
  cylindersGroup.add(cyl2);

  const cyl2Cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    graphite
  );
  cyl2Cap.position.set(0.25, 1.23, 0);
  cylindersGroup.add(cyl2Cap);

  const cyl2Band = new THREE.Mesh(
    new THREE.CylinderGeometry(0.122, 0.122, 0.12, 20),
    tierLipGlow
  );
  cyl2Band.position.set(0.25, 0.92, 0);
  cylindersGroup.add(cyl2Band);

  // Dual-Stage Brass Pressure Regulator Manifold with Analog Dial Gauges
  for (const cx of [-0.25, 0.25]) {
    const valveNeck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.024, 0.024, 0.14, 12),
      stainless
    );
    valveNeck.position.set(cx, 1.34, 0);
    fluidSkidGroup.add(valveNeck);

    const regBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.07, 0.08),
      copper
    );
    regBody.position.set(cx, 1.42, 0);
    fluidSkidGroup.add(regBody);

    const dialGauge = new THREE.Mesh(
      new THREE.CylinderGeometry(0.032, 0.032, 0.02, 16),
      stainless
    );
    dialGauge.rotation.x = Math.PI / 2;
    dialGauge.position.set(cx, 1.44, 0.045);
    fluidSkidGroup.add(dialGauge);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 13. GLAZED ARRIVAL CORRIDOR VEHICLE INFRASTRUCTURE (APPROACHING CENTER)
  // ─────────────────────────────────────────────────────────────────────────────
  const corridorVehicleGroup = new THREE.Group();
  corridorVehicleGroup.name = "corridor-vehicle-infrastructure";
  group.add(corridorVehicleGroup);

  // ── 1. Floor-Embedded Magnetic Logistics / Vehicle Guidance Tracks ──
  const tracksGroup = new THREE.Group();
  tracksGroup.name = "corridor-guidance-tracks";
  tracksGroup.position.set(LAB_BOUNDS.spineX, 0, 0);
  corridorVehicleGroup.add(tracksGroup);

  // Dual parallel stainless steel guide rails along corridor length (-28.0m to -4.0m)
  const trackLength = 24.0;
  const trackCenterZ = -16.0;
  for (const rx of [-0.70, 0.70]) {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.008, trackLength),
      stainless
    );
    rail.position.set(rx, 0.004, trackCenterZ);
    rail.receiveShadow = true;
    tracksGroup.add(rail);

    // Hazard yellow flank stripe
    const flankStripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.025, 0.004, trackLength),
      safetyYellow
    );
    flankStripe.position.set(rx + (rx > 0 ? 0.035 : -0.035), 0.003, trackCenterZ);
    tracksGroup.add(flankStripe);
  }

  // Embedded Optical LED Guidance Nodes along track centerline (every 3m)
  for (let gz = -26.0; gz <= -6.0; gz += 3.0) {
    const nodeDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.024, 0.024, 0.006, 12),
      tierLipGlow
    );
    nodeDisc.position.set(0, 0.003, gz);
    tracksGroup.add(nodeDisc);
  }

  // ── 2. Autonomous Electric Component Tug / Battery Transport Dolly ──
  const agvTugGroup = new THREE.Group();
  agvTugGroup.name = "corridor-agv-tug";
  agvTugGroup.position.set(LAB_BOUNDS.spineX, 0, -16.5);
  corridorVehicleGroup.add(agvTugGroup);

  // Low-profile automated guided vehicle chassis
  const agvChassis = new THREE.Mesh(
    new THREE.BoxGeometry(1.25, 0.22, 1.85),
    darkSteel
  );
  agvChassis.position.y = 0.15;
  agvChassis.castShadow = true;
  agvTugGroup.add(agvChassis);

  // 4 Mecanum Omni-Wheels
  for (const [wx, wz] of [[-0.62, -0.65], [0.62, -0.65], [-0.62, 0.65], [0.62, 0.65]]) {
    const mWheel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 0.07, 16),
      tireRubber
    );
    mWheel.rotation.z = Math.PI / 2;
    mWheel.position.set(wx, 0.09, wz);
    agvTugGroup.add(mWheel);

    const mHub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.075, 12),
      gold
    );
    mHub.rotation.z = Math.PI / 2;
    mHub.position.set(wx, 0.09, wz);
    agvTugGroup.add(mHub);
  }

  // Front & Rear 360-degree laser safety lidar scanner bezels
  for (const lz of [-0.94, 0.94]) {
    const lidarBezel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 0.05, 16),
      darkSteel
    );
    lidarBezel.position.set(0, 0.22, lz);
    agvTugGroup.add(lidarBezel);

    const lidarRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.042, 0.008, 6, 16),
      hudAmber
    );
    lidarRing.rotation.x = Math.PI / 2;
    lidarRing.position.set(0, 0.23, lz);
    agvTugGroup.add(lidarRing);
  }

  // Crated High-Voltage Rover Solid-State Battery Module
  const battCrate = new THREE.Mesh(
    new THREE.BoxGeometry(1.05, 0.44, 1.35),
    graphite
  );
  battCrate.position.set(0, 0.48, 0);
  battCrate.castShadow = true;
  agvTugGroup.add(battCrate);

  // Aluminum cooling fins on battery housing
  for (let f = -0.50; f <= 0.50; f += 0.14) {
    const fin = new THREE.Mesh(
      new THREE.BoxGeometry(1.08, 0.28, 0.015),
      titanium
    );
    fin.position.set(0, 0.48, f);
    agvTugGroup.add(fin);
  }

  // Active Cyan Battery Charge Status LED Bar
  const battStatus = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, 0.06, 0.90),
    hudCyan
  );
  battStatus.position.set(0.535, 0.58, 0);
  agvTugGroup.add(battStatus);

  // ── 3. Wall-Integrated Rapid-Service Tool Station & Diagnostic Kiosk ──
  const corridorKioskGroup = new THREE.Group();
  corridorKioskGroup.name = "corridor-service-kiosk";
  corridorKioskGroup.position.set(-1.45, 0, -22.5);
  corridorVehicleGroup.add(corridorKioskGroup);

  const kioskCabinet = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 1.60, 1.20),
    darkSteel
  );
  kioskCabinet.position.set(0, 1.30, 0);
  corridorKioskGroup.add(kioskCabinet);

  const kioskGlass = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, 1.52, 1.12),
    smokedGlass
  );
  kioskGlass.position.set(-0.09, 1.30, 0);
  corridorKioskGroup.add(kioskGlass);

  const kioskScreenDiag = new THREE.Mesh(
    new THREE.PlaneGeometry(0.48, 0.32),
    hudCyan
  );
  kioskScreenDiag.rotation.y = -Math.PI / 2;
  kioskScreenDiag.position.set(-0.10, 1.45, 0.25);
  corridorKioskGroup.add(kioskScreenDiag);

  // Emergency stop button
  const eStopBezel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.038, 0.038, 0.02, 16),
    safetyYellow
  );
  eStopBezel.rotation.z = Math.PI / 2;
  eStopBezel.position.set(-0.10, 1.15, -0.35);
  corridorKioskGroup.add(eStopBezel);

  const eStopBtn = new THREE.Mesh(
    new THREE.CylinderGeometry(0.026, 0.026, 0.03, 16),
    safetyRed
  );
  eStopBtn.rotation.z = Math.PI / 2;
  eStopBtn.position.set(-0.11, 1.15, -0.35);
  corridorKioskGroup.add(eStopBtn);

  // ─────────────────────────────────────────────────────────────────────────────
  // 14. DYNAMIC QUANTUM FLUX PARTICLES & ORBITAL PLASMA NODES
  // ─────────────────────────────────────────────────────────────────────────────
  const fluxGroup = new THREE.Group();
  fluxGroup.name = "quantum-flux-particles";
  machineGroup.add(fluxGroup);

  const fluxParticleCount = 8;
  const fluxMeshes: THREE.Mesh[] = [];
  const fluxSpeeds: number[] = [1.8, -1.4, 2.2, -1.6, 1.5, -2.4, 1.9, -1.7];
  const fluxRadii: number[] = [0.60, 0.64, 0.58, 0.66, 0.62, 0.59, 0.65, 0.61];
  const fluxHeights: number[] = [0.35, 0.70, 1.05, 1.40, 0.50, 0.85, 1.20, 1.55];
  const fluxAngles: number[] = [0, 0.78, 1.57, 2.35, 3.14, 3.92, 4.71, 5.49];

  for (let p = 0; p < fluxParticleCount; p++) {
    const pMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 12, 12),
      p % 2 === 0 ? cryoGlow : gold
    );
    pMesh.name = `flux-particle-${p + 1}`;
    fluxMeshes.push(pMesh);
    fluxGroup.add(pMesh);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 9. ANIMATION LOOP (ACCUMULATED DELTA ROTATION, FLUX ORBITS & HARMONIC PULSE)
  // ─────────────────────────────────────────────────────────────────────────────
  let rotRing13 = 0;
  let rotRing2 = 0;

  const update = (timeMs: number, dt: number) => {
    // 1. Noticeable clockwise rotation on Ring 1 & 3; counter-rotation on Ring 2
    rotRing13 += dt * 0.18;
    rotRing2 -= dt * 0.12;

    if (ringMeshes.length === 3) {
      ringMeshes[0].rotation.y = rotRing13;
      ringMeshes[1].rotation.y = rotRing2;
      ringMeshes[2].rotation.y = rotRing13 * 0.85;
    }

    // 2. Quantum flux particles orbiting smoothly inside the cryo containment tube
    for (let p = 0; p < fluxParticleCount; p++) {
      fluxAngles[p] += dt * fluxSpeeds[p];
      const a = fluxAngles[p];
      const r = fluxRadii[p];
      const baseY = fluxHeights[p];
      const bob = Math.sin(a * 2) * 0.06;
      fluxMeshes[p].position.set(Math.cos(a) * r, baseY + bob, Math.sin(a) * r);
    }

    // 3. Respiration luminance pulse on the cryogenic power core and traveling wave
    const primaryPulse = Math.sin(timeMs * 0.002);
    const harmonicPulse = Math.sin(timeMs * 0.0055);
    const compositePulse = primaryPulse * 0.7 + harmonicPulse * 0.3;

    coreLight.intensity = 3.6 + compositePulse * 1.1;
    cryoGlow.emissiveIntensity = 2.2 + compositePulse * 0.8;
    subtleConduitGlow.emissiveIntensity = 0.55 + Math.sin(timeMs * 0.004) * 0.35;

    // 4. Keel Gravimetric Stabilizer reaction mass dynamic damping
    reactionMass.position.y =
      1.80 + Math.sin(timeMs * 0.0012) * 0.16 + Math.cos(timeMs * 0.0028) * 0.06;

    // 5. Antiphase cryogenic condenser respiration
    cryoColumnGlow.emissiveIntensity = 1.7 - compositePulse * 0.65;

    // 6. Heavy Planetary Rover turntable rotation, engine rumble, belt drive, radiator fans & holographic respiration
    roverTurntable.rotation.y += dt * 0.05;
    roverGroup.position.y = 0.88 + Math.sin(timeMs * 0.012) * 0.002;
    holoTreadMat.emissiveIntensity = 2.2 + Math.sin(timeMs * 0.003) * 0.35;
    for (let ti = 0; ti < turboImpellers.length; ti++) {
      turboImpellers[ti].rotation.x += dt * 8.0;
    }
    for (let pi = 0; pi < enginePulleys.length; pi++) {
      enginePulleys[pi].rotation.x += dt * 12.0;
    }
    for (let fi = 0; fi < radiatorFans.length; fi++) {
      radiatorFans[fi].rotation.z += dt * 15.0;
    }

    // 7. Choreographed Kinematic Trajectory for Industrial 6-DOF Robotic Arm
    // Synchronized multi-axis choreography calibrated to the curved workstation island:
    // Phase 1 (0-8s): Precision curved workstation arc trace & bench calibration sweep
    // Phase 2 (8-13s): Coordinated elevation & lift with counterbalance compression
    // Phase 3 (13-19s): Sky telemetry & celestial coordinate tracking lock
    // Phase 4 (19-24s): Controlled descent & return to workstation bench pose
    const tCycle = (timeMs * 0.001) % 24.0;
    let targetJ1 = 0.06;
    let targetJ2 = -0.32;
    let targetJ3 = 1.76;
    let targetJ4 = -0.44;
    let targetJ5 = 0;
    let targetSky = 1.15;
    let compliance = 0;

    if (tCycle < 8.0) {
      // Phase 1: Precision curved workstation arc trace & bench calibration sweep
      const u = tCycle / 8.0;
      const s = Math.sin(u * Math.PI * 2);
      targetJ1 = 0.06 + s * 0.22; // Smoothly sweeping along the curved island countertop arc
      targetJ2 = -0.32 + Math.abs(s) * 0.03; // Radial height compensation
      targetJ3 = 1.76 - Math.abs(s) * 0.04; // Downward-bent elbow maintaining exact hover above countertop
      targetJ4 = -0.44 + s * 0.02; // Pitch compensation perpendicular to bench plane
      targetJ5 = -s * 0.18; // Tangential wrist roll along the curved contour
      targetSky = 1.15;
      compliance = Math.sin(u * Math.PI * 6) * 0.5 + 0.5;
    } else if (tCycle < 13.0) {
      // Phase 2: Coordinated elevation & lift with counterbalance compression
      const u = (tCycle - 8.0) / 5.0;
      const e = u * u * (3 - 2 * u); // Cubic smoothstep
      targetJ1 = (1 - e) * 0.06 + e * -0.20;
      targetJ2 = (1 - e) * -0.32 + e * -0.14;
      targetJ3 = (1 - e) * 1.76 + e * 1.52;
      targetJ4 = (1 - e) * -0.44 + e * -0.26;
      targetJ5 = (1 - e) * 0 + e * 0.12;
      targetSky = (1 - e) * 1.15 + e * 1.32;
      compliance = 0;
    } else if (tCycle < 19.0) {
      // Phase 3: Sky telemetry & celestial orbit tracking lock
      const u = (tCycle - 13.0) / 6.0;
      const s = Math.sin(u * Math.PI * 2);
      targetJ1 = -0.20 + Math.sin(u * Math.PI) * 0.06;
      targetJ2 = -0.14 + s * 0.02;
      targetJ3 = 1.52 + Math.cos(u * Math.PI * 2) * 0.03;
      targetJ4 = -0.26;
      targetJ5 = Math.sin(u * Math.PI * 2) * 0.14;
      targetSky = 1.32 + s * 0.08;
      compliance = 0.2;
    } else {
      // Phase 4: Controlled descent & return to workstation calibration pose
      const u = (tCycle - 19.0) / 5.0;
      const e = u * u * (3 - 2 * u); // Cubic smoothstep
      targetJ1 = (1 - e) * -0.20 + e * 0.06;
      targetJ2 = (1 - e) * -0.14 + e * -0.32;
      targetJ3 = (1 - e) * 1.52 + e * 1.76;
      targetJ4 = (1 - e) * -0.26 + e * -0.44;
      targetJ5 = (1 - e) * 0.14 + e * 0;
      targetSky = (1 - e) * 1.32 + e * 1.15;
      compliance = 0;
    }

    // Apply joint kinematic trajectory
    robotJoint1.rotation.y = targetJ1;
    robotJoint2.rotation.z = targetJ2;
    robotJoint3.rotation.z = targetJ3; // Bent downwards across all phases (1.52 to 1.82)
    robotJoint4.rotation.x = targetJ4;
    robotJoint5.rotation.y = targetJ5;
    skySensor.rotation.x = targetSky;

    // Physical coupling: counterbalance cylinder barrel angle and chrome piston extension
    counterbalanceGroup.rotation.z = robotJoint2.rotation.z * 0.52;
    pistonRod.position.y = 1.12 - robotJoint2.rotation.z * 0.42;

    // Gripper finger compliance micro-flexing
    for (let f = 0; f < gripperPhalanges.length; f++) {
      gripperPhalanges[f].rotation.z = 0.16 + compliance * 0.05;
    }

    // 8. Dual Cryo-Stasis Pods biostasis respiration glow
    cryoPodGlowMat.emissiveIntensity = 1.4 + Math.sin(timeMs * 0.0015) * 0.45;

    // 9. Planetary Wheel Balancer spindle dynamic rotation
    if (balancerSpindleMesh) {
      balancerSpindleMesh.rotation.z += dt * 0.45;
    }
  };

  return { group, update, lights };
}
