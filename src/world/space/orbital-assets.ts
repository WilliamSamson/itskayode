import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const TAU = Math.PI * 2;

function hash3(x: number, y: number, z: number, seed: number): number {
  let h = Math.imul(x, 0x1b873593) ^ Math.imul(y, 0x85ebca6b) ^ Math.imul(z, 0xc2b2ae35) ^ seed;
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function noise3(x: number, y: number, z: number, seed: number): number {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const fx = fade(x - ix), fy = fade(y - iy), fz = fade(z - iz);
  let result = 0;
  for (let dz = 0; dz <= 1; dz++) for (let dy = 0; dy <= 1; dy++) for (let dx = 0; dx <= 1; dx++) {
    result += hash3(ix + dx, iy + dy, iz + dz, seed) *
      (dx ? fx : 1 - fx) * (dy ? fy : 1 - fy) * (dz ? fz : 1 - fz);
  }
  return result;
}

/** Cratered, multi-scale rock silhouette with baked mineral variation. No texture fetches. */
export function buildAsteroidGeometry(seed: number, detail: number): THREE.BufferGeometry {
  const geometry = new THREE.IcosahedronGeometry(1, detail);
  const positions = geometry.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(positions.count * 3);
  const direction = new THREE.Vector3();
  const dark = new THREE.Color(0x3b3d40);
  const stone = new THREE.Color(0x77716a);
  const mineral = new THREE.Color(0xb49b7a);
  const color = new THREE.Color();
  const craters = Array.from({ length: detail >= 2 ? 9 : 3 }, (_, i) => {
    const z = hash3(i, 7, 3, seed) * 2 - 1;
    const azimuth = hash3(i, 11, 9, seed) * TAU;
    const spread = Math.sqrt(1 - z * z);
    return { axis: new THREE.Vector3(spread * Math.cos(azimuth), z, spread * Math.sin(azimuth)), width: 0.045 + hash3(i, 17, 2, seed) * 0.085 };
  });

  for (let i = 0; i < positions.count; i++) {
    direction.set(positions.getX(i), positions.getY(i), positions.getZ(i)).normalize();
    const { x, y, z } = direction;
    const macro = noise3(x * 2.7 + 17, y * 2.7, z * 2.7, seed);
    const ridge = 1 - Math.abs(noise3(x * 6.4, y * 6.4 + 13, z * 6.4, seed + 29) * 2 - 1);
    const grit = noise3(x * 17.1, y * 17.1, z * 17.1 - 7, seed + 59);
    let craterDepth = 0;
    for (const crater of craters) {
      const angularDistance = 1 - direction.dot(crater.axis);
      const u = angularDistance / crater.width;
      if (u < 1) craterDepth += (1 - u) * (1 - u) * 0.13;
      else if (u < 1.28) craterDepth -= (1.28 - u) * 0.018;
    }
    const radius = 0.78 + macro * 0.30 + ridge * 0.21 + grit * 0.09 - craterDepth;
    const ax = 0.88 + hash3(2, 1, 0, seed) * 0.30;
    const ay = 0.80 + hash3(0, 2, 1, seed) * 0.36;
    const az = 0.82 + hash3(1, 0, 2, seed) * 0.34;
    positions.setXYZ(i, x * radius * ax, y * radius * ay, z * radius * az);
    color.copy(dark).lerp(stone, Math.min(1, macro * 0.65 + ridge * 0.45));
    color.lerp(mineral, Math.max(0, (ridge * grit - 0.36) * 0.56));
    if (craterDepth > 0.025) color.multiplyScalar(0.77);
    colors.set([color.r, color.g, color.b], i * 3);
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function axialCylinder(radiusTop: number, radiusBottom: number, length: number, z: number, material: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, length, 20), material);
  mesh.rotation.x = Math.PI / 2;
  mesh.position.z = z;
  return mesh;
}

function solarCells(width: number, height: number, seed: number): THREE.BufferGeometry {
  const columns = 12, rows = 7;
  const positions: number[] = [], colors: number[] = [], indices: number[] = [];
  const tile = new THREE.Color();
  const cellW = width / columns, cellH = height / rows;
  for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
    const x0 = -width / 2 + col * cellW + 0.48;
    const x1 = x0 + cellW - 0.96;
    const y0 = -height / 2 + row * cellH + 0.48;
    const y1 = y0 + cellH - 0.96;
    const base = positions.length / 3;
    positions.push(x0, y0, 0, x1, y0, 0, x0, y1, 0, x1, y1, 0);
    indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    const value = 0.82 + hash3(col, row, 0, seed) * 0.22;
    tile.setRGB(0.14 * value, 0.34 * value, 0.65 * value);
    for (let corner = 0; corner < 4; corner++) colors.push(tile.r, tile.g, tile.b);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function dishGeometry(): THREE.BufferGeometry {
  const segments = 32, rings = 8, positions: number[] = [], indices: number[] = [];
  for (let ring = 0; ring <= rings; ring++) {
    const r = Math.max(0.01, ring / rings * 37);
    const depth = 11 * (r / 37) ** 2;
    for (let j = 0; j <= segments; j++) {
      const angle = j / segments * TAU;
      positions.push(Math.cos(angle) * r, Math.sin(angle) * r, depth);
    }
  }
  for (let ring = 0; ring < rings; ring++) for (let j = 0; j < segments; j++) {
    const a = ring * (segments + 1) + j, b = a + segments + 1;
    indices.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function rod(from: THREE.Vector3, to: THREE.Vector3, radius: number, material: THREE.Material): THREE.Mesh {
  const delta = to.clone().sub(from);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, delta.length(), 6), material);
  mesh.position.copy(from).add(to).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  return mesh;
}

/** Detailed procedural satellite with distinct aerospace archetypes (relay, observatory, sensor, polar). */
export function buildOrbitalSatellite(seed: number, archetypeIndex: number = 0): THREE.Group {
  const group = new THREE.Group();
  const ivory = new THREE.MeshStandardMaterial({ color: 0xd8d4c9, metalness: 0.24, roughness: 0.58, fog: false });
  const graphite = new THREE.MeshStandardMaterial({ color: 0x313942, metalness: 0.56, roughness: 0.41, fog: false });
  const silver = new THREE.MeshStandardMaterial({ color: 0xa8aaa7, metalness: 0.73, roughness: 0.32, fog: false });
  const copper = new THREE.MeshStandardMaterial({ color: 0x9c7050, metalness: 0.65, roughness: 0.36, fog: false });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.85, roughness: 0.22, fog: false });
  const solar = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.50, roughness: 0.32, emissive: 0x0b2652, emissiveIntensity: 0.55, side: THREE.DoubleSide, fog: false });
  // Technical red aerospace anti-collision navigation strobe
  const beacon = new THREE.MeshBasicMaterial({ color: 0xef4444, fog: false });

  // 1. Core Service Bus
  group.add(axialCylinder(22, 22, 78, 0, ivory));
  group.add(axialCylinder(18, 16, 39, -58, graphite));
  group.add(axialCylinder(19, 19, 13, 46, silver));
  group.add(axialCylinder(13, 13, 7, 56, graphite));
  for (const z of [-33, -7, 27, 40]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(z === 40 ? 19 : 22.5, 2.1, 6, 32), z === -7 ? copper : silver);
    band.position.z = z;
    group.add(band);
  }
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * TAU;
    const hatch = new THREE.Mesh(new THREE.BoxGeometry(7, 3, 15), i % 3 ? graphite : copper);
    hatch.position.set(Math.cos(angle) * 21, Math.sin(angle) * 21, i % 2 ? -17 : 14);
    hatch.rotation.z = angle;
    group.add(hatch);
  }

  // 2. Solar Array Wings (symmetrical dual wings)
  const wingWidth = 118, wingHeight = 82;
  for (const side of [-1, 1]) {
    const wing = new THREE.Group();
    wing.position.set(side * 123, 0, -6);
    group.add(wing);
    const base = new THREE.Mesh(new THREE.BoxGeometry(wingWidth + 4, wingHeight + 4, 2.2), silver);
    wing.add(base);
    const cells = new THREE.Mesh(solarCells(wingWidth, wingHeight, seed + side), solar);
    cells.name = "ORRA_SolarArray";
    cells.position.z = 1.25;
    wing.add(cells);
    for (const y of [-wingHeight / 2, wingHeight / 2]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(wingWidth + 5, 2.2, 3.5), graphite);
      rail.position.y = y;
      wing.add(rail);
    }
    for (const x of [-wingWidth / 2, wingWidth / 2]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(2.2, wingHeight + 5, 3.5), graphite);
      rail.position.x = x;
      wing.add(rail);
    }
    const spar = new THREE.Mesh(new THREE.BoxGeometry(73, 3.5, 3.5), silver);
    spar.position.x = side * 47;
    group.add(spar);
    for (const y of [-25, 25]) {
      group.add(rod(new THREE.Vector3(side * 22, 0, -18), new THREE.Vector3(side * 68, y, -6), 1.4, graphite));
    }
    // Wingtip Red Navigation Strobe
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(3.2, 8, 6), beacon);
    lamp.name = "ORRA_Beacon";
    lamp.position.set(side * 186, 0, -6);
    group.add(lamp);
  }

  // 3. Communications High-Gain Dish (Common to all, guaranteed for tests)
  const dish = new THREE.Mesh(dishGeometry(), ivory);
  dish.name = "ORRA_Dish";
  dish.position.z = 80;
  group.add(dish);
  const dishRim = new THREE.Mesh(new THREE.TorusGeometry(37, 1.5, 6, 36), silver);
  dishRim.position.z = 91;
  group.add(dishRim);

  // 4. Archetype-Specific Instrumentation
  const type = archetypeIndex % 4;
  if (type === 0) {
    // Relay Alpha: High-gain feed horn and quad struts
    const feed = new THREE.Mesh(new THREE.CylinderGeometry(4, 3, 9, 8), graphite);
    feed.rotation.x = Math.PI / 2;
    feed.position.z = 111;
    group.add(feed);
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * TAU;
      group.add(rod(new THREE.Vector3(Math.cos(angle) * 31, Math.sin(angle) * 31, 89), new THREE.Vector3(0, 0, 108), 1.1, silver));
    }
  } else if (type === 1) {
    // Observatory Beta: Deep-Space Optical Telescope Barrel & Aperture Ring
    const barrel = axialCylinder(16, 16, 46, 108, graphite);
    group.add(barrel);
    const apertureRing = new THREE.Mesh(new THREE.TorusGeometry(16.5, 1.8, 6, 32), gold);
    apertureRing.position.z = 131;
    group.add(apertureRing);
    for (let i = 0; i < 3; i++) {
      const ang = (i / 3) * TAU;
      group.add(rod(new THREE.Vector3(Math.cos(ang) * 15, Math.sin(ang) * 15, 128), new THREE.Vector3(0, 0, 128), 0.9, silver));
    }
  } else if (type === 2) {
    // Sensor Gamma: Extended Magnetometer Sensor Booms
    for (const side of [-1, 1]) {
      group.add(rod(new THREE.Vector3(side * 20, -15, -15), new THREE.Vector3(side * 80, -65, -45), 1.4, silver));
      const sensorNode = new THREE.Mesh(new THREE.BoxGeometry(6, 6, 6), copper);
      sensorNode.position.set(side * 80, -65, -45);
      group.add(sensorNode);
    }
    const feed = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 2.5, 8, 8), graphite);
    feed.rotation.x = Math.PI / 2;
    feed.position.z = 108;
    group.add(feed);
  } else {
    // Recon Delta: Auxiliary thruster block and forward radar cone
    const thruster = axialCylinder(12, 19, 24, -76, copper);
    group.add(thruster);
    const feed = new THREE.Mesh(new THREE.CylinderGeometry(4, 2.5, 12, 8), silver);
    feed.rotation.x = Math.PI / 2;
    feed.position.z = 112;
    group.add(feed);
  }

  // Aft Sensor Mast & Red Beacon Strobe
  group.add(rod(new THREE.Vector3(0, 0, -78), new THREE.Vector3(0, 0, -103), 1.3, silver));
  const aftBeacon = new THREE.Mesh(new THREE.SphereGeometry(4.5, 8, 6), beacon);
  aftBeacon.name = "ORRA_Beacon";
  aftBeacon.position.z = -104;
  group.add(aftBeacon);

  // Bake static trusses, body modules and frames into one geometry per material.
  // The dish, two arrays, and beacons remain separate so their fine detail and animations stay inspectable.
  group.updateMatrixWorld(true);
  const optimized = new THREE.Group();
  const buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const originalGeometries = new Set<THREE.BufferGeometry>();
  group.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    originalGeometries.add(object.geometry);
    const baked = object.geometry.clone().applyMatrix4(object.matrixWorld);
    const material = object.material as THREE.Material;
    if (object.name === "ORRA_Dish" || object.name === "ORRA_SolarArray" || object.name === "ORRA_Beacon") {
      const preserved = new THREE.Mesh(baked, material);
      preserved.name = object.name;
      optimized.add(preserved);
      return;
    }
    if (!buckets.has(material)) buckets.set(material, []);
    buckets.get(material)!.push(baked);
  });
  for (const [material, parts] of buckets) {
    const merged = mergeGeometries(parts);
    if (!merged) throw new Error("Satellite geometry merge failed");
    const mesh = new THREE.Mesh(merged, material);
    mesh.name = "ORRA_SatelliteStructure";
    optimized.add(mesh);
    parts.forEach((part) => part.dispose());
  }
  originalGeometries.forEach((geometry) => geometry.dispose());
  return optimized;
}
