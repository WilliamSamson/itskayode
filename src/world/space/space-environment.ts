import * as THREE from "three";
import { buildAsteroidGeometry, buildOrbitalSatellite } from "./orbital-assets";

// A seeded orbital sculpture, not a sky dome or a planet-sized bubble.
const TAU = Math.PI * 2;
// Provable upper bound of the current harmonic island rim: 1260 + 55 + 42 + 30 + 18 + 10.
// The innermost rock's centre stays at least 330 m beyond this bound before its size is deducted.
export const LANDMASS_OUTER_BOUND = 1415;
export const ORBIT_LANE_RADII = [LANDMASS_OUTER_BOUND + 420, LANDMASS_OUTER_BOUND + 885, LANDMASS_OUTER_BOUND + 1485] as const;
const ORBIT_LANE_WIDTHS = [180, 260, 330] as const;
export const MIN_ORBIT_CLEARANCE = 200;
function random(seed: number): number {
  let x = seed | 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

interface Rock {
  dummy: THREE.Object3D;
  angle: number;
  radius: number;
  height: number;
  incline: number;
  speed: number;
  spin: THREE.Vector3;
  baseRotation: THREE.Euler;
}

/** Three inclined orbital streams made of rock, dust and two engineered satellites. */
export class SpaceEnvironment {
  readonly rootGroup = new THREE.Group();
  readonly STAR_COUNT = 2800;
  readonly ASTEROID_COUNT = 48;
  readonly HERO_COUNT = 12;
  readonly MEDIUM_COUNT = 240;
  readonly DUST_COUNT = 960;
  readonly starPoints: THREE.Points;
  readonly asteroidMesh: THREE.InstancedMesh;
  readonly dustMesh: THREE.InstancedMesh;
  readonly heroMesh: THREE.InstancedMesh;
  readonly mediumMesh: THREE.InstancedMesh;
  readonly satellites: THREE.Group[] = [];
  readonly orbitalKey = new THREE.DirectionalLight(0xffcb98, 2.8);
  private readonly rocks: Rock[] = [];
  private readonly dust: Rock[] = [];
  private readonly heroes: Rock[] = [];
  private readonly medium: Rock[] = [];
  private readonly satelliteOrbits = [
    { radius: LANDMASS_OUTER_BOUND + 635, height: 170, angle: 0.5, speed: 0.0018, scale: 1.25, name: "ORRA_OrbitalRelay_Alpha" },
    { radius: LANDMASS_OUTER_BOUND + 1150, height: 260, angle: 2.1, speed: 0.0012, scale: 1.10, name: "ORRA_OrbitalOptics_Beta" },
    { radius: LANDMASS_OUTER_BOUND + 1685, height: -190, angle: 3.8, speed: -0.00085, scale: 0.95, name: "ORRA_OrbitalSensor_Gamma" },
    { radius: LANDMASS_OUTER_BOUND + 2150, height: -310, angle: 5.4, speed: -0.00065, scale: 0.85, name: "ORRA_OrbitalRecon_Delta" },
  ];
  private elapsed = 0;
  /**
   * Rocks are updated round-robin, 1/stride of them per frame. The fastest
   * lane takes ~58 minutes per orbit, so at stride 4 a rock steps well under a
   * pixel between its updates. The scene raises it on weaker quality tiers.
   */
  updateStride = 4;
  private beacons: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>[][] = [];
  private readonly rockStreams: readonly [THREE.InstancedMesh, Rock[]][];

  private orbitalHeight(lane: number, radius: number, angle: number): number {
    const l = ((lane % 3) + 3) % 3;
    return [95, -125, 255][l] + radius * Math.sin(angle + [0.2, 1.4, -0.6][l]) * [0.13, -0.18, 0.24][l];
  }

  constructor() {
    this.rootGroup.name = "ORRA_SpaceEnvironment";
    this.starPoints = this.buildStars();
    this.heroMesh = this.buildRocks(this.HERO_COUNT, 59, 75, this.heroes, 200, 3);
    this.asteroidMesh = this.buildRocks(this.ASTEROID_COUNT, 24, 58, this.rocks, 100, 2);
    this.mediumMesh = this.buildRocks(this.MEDIUM_COUNT, 7, 21, this.medium, 350, 1);
    this.dustMesh = this.buildRocks(this.DUST_COUNT, 1.8, 6.5, this.dust, 500, 0);
    this.rockStreams = [
      [this.heroMesh, this.heroes],
      [this.asteroidMesh, this.rocks],
      [this.mediumMesh, this.medium],
      [this.dustMesh, this.dust],
    ];
    this.rootGroup.add(this.starPoints, this.dustMesh, this.mediumMesh, this.asteroidMesh, this.heroMesh);
    // A warm grazing key lights orbital objects only; it never bleaches island terrain.
    this.orbitalKey.layers.set(1);
    this.orbitalKey.position.set(-2800, 2100, 1700);
    this.rootGroup.add(this.orbitalKey);
    for (let i = 0; i < this.satelliteOrbits.length; i++) {
      const satellite = this.buildSatellite(i);
      satellite.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.layers.set(1);
        if (object.material instanceof THREE.MeshStandardMaterial) object.material.envMapIntensity = 0;
      });
      this.satellites.push(satellite);
      this.rootGroup.add(satellite);
    }
    this.beacons = this.satellites.map((sat) => {
      const found: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>[] = [];
      sat.traverse((child) => {
        if (child instanceof THREE.Mesh && child.name === "ORRA_Beacon") found.push(child as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>);
      });
      return found;
    });
    for (let k = 0; k < this.updateStride; k++) this.update(0);
  }

  private buildStars(): THREE.Points {
    const positions = new Float32Array(this.STAR_COUNT * 3);
    const colors = new Float32Array(this.STAR_COUNT * 3);
    const palette = [0xd6dce2, 0xa9b8c9, 0xffe1aa, 0x9f9caf].map((c) => new THREE.Color(c));
    for (let i = 0; i < this.STAR_COUNT; i++) {
      const radius = 12000 + random(i * 13 + 1) * 11000;
      const azimuth = random(i * 13 + 2) * TAU;
      const elevation = Math.asin(random(i * 13 + 3) * 2 - 1);
      positions.set([
        radius * Math.cos(elevation) * Math.cos(azimuth),
        radius * Math.sin(elevation),
        radius * Math.cos(elevation) * Math.sin(azimuth),
      ], i * 3);
      const tint = palette[Math.floor(random(i * 13 + 4) * palette.length)];
      const luminance = 0.16 + Math.pow(random(i * 13 + 5), 5) * 0.73;
      colors.set([tint.r * luminance, tint.g * luminance, tint.b * luminance], i * 3);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return new THREE.Points(geometry, new THREE.ShaderMaterial({
      vertexShader: `
        attribute vec3 color;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * viewPosition;
          float brightness = max(color.r, max(color.g, color.b));
          gl_PointSize = 1.2 + 1.8 * pow(brightness, 3.0);
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          float radius = length(gl_PointCoord - vec2(0.5));
          float alpha = 1.0 - smoothstep(0.23, 0.48, radius);
          if (alpha < 0.01) discard;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true, depthWrite: false, fog: false,
    }));
  }

  private buildRocks(count: number, minSize: number, maxSize: number, records: Rock[], salt: number, detail: number): THREE.InstancedMesh {
    const geometry = buildAsteroidGeometry(salt, detail);
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.96, metalness: 0.025, flatShading: detail < 2, fog: false });
    material.envMapIntensity = 0; // Space has its own orbital key, not island climate IBL.
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    mesh.layers.set(1);
    mesh.frustumCulled = false; // The parent origin is not the bounds of a wide orbital lane.
    const tint = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const lane = i % 3;
      const radius = ORBIT_LANE_RADII[lane] + (random(i * 17 + salt + 1) - 0.5) * ORBIT_LANE_WIDTHS[lane];
      // Three dense arcs separated by true empty gaps: the rock itself draws the ring.
      const arc = Math.floor(random(i * 17 + salt + 2) * 3);
      const angle = arc * TAU / 3 + lane * 0.22 + 0.16 + random(i * 17 + salt + 12) * 1.34;
      const height = (random(i * 17 + salt + 3) - 0.5) * [130, 200, 290][lane];
      const size = minSize + Math.pow(random(i * 17 + salt + 4), 3) * (maxSize - minSize);
      const dummy = new THREE.Object3D();
      dummy.scale.set(size, size * (0.48 + random(i * 17 + salt + 5) * 0.7), size * (0.58 + random(i * 17 + salt + 6) * 0.65));
      dummy.rotation.set(random(i * 17 + salt + 7) * TAU, random(i * 17 + salt + 8) * TAU, random(i * 17 + salt + 9) * TAU);
      records.push({ dummy, angle, radius, height, incline: lane, speed: [0.0018, -0.0012, 0.0008][lane], spin: new THREE.Vector3(0.003, 0.005, -0.002), baseRotation: dummy.rotation.clone() });
      tint.setHex([0xd5d0c8, 0xe7ddcf, 0xb8b6b7, 0xf2dfc6][Math.floor(random(i * 17 + salt + 11) * 4)]);
      mesh.setColorAt(i, tint);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    return mesh;
  }

  private buildSatellite(index: number): THREE.Group {
    const orbit = this.satelliteOrbits[index];
    const group = buildOrbitalSatellite(900 + index * 31, index);
    group.name = orbit.name;
    group.scale.setScalar(orbit.scale);
    return group;
  }

  private frameIndex = 0;

  update(dt: number): void {
    this.elapsed += Math.max(0, dt);
    this.frameIndex++;

    const stride = Math.max(1, Math.floor(this.updateStride));
    const phase = this.frameIndex % stride;
    for (let g = 0; g < this.rockStreams.length; g++) {
      const [mesh, records] = this.rockStreams[g];
      if (phase >= records.length) continue;
      for (let i = phase; i < records.length; i += stride) {
        const rock = records[i];
        const angle = rock.angle + this.elapsed * rock.speed;
        rock.dummy.position.set(rock.radius * Math.cos(angle), this.orbitalHeight(rock.incline, rock.radius, angle) + rock.height + Math.sin(angle * 2 + i) * 12, rock.radius * Math.sin(angle));
        // Spin from elapsed time, so skipped frames cost no accuracy.
        rock.dummy.rotation.set(
          rock.baseRotation.x + rock.spin.x * this.elapsed,
          rock.baseRotation.y + rock.spin.y * this.elapsed,
          rock.baseRotation.z
        );
        rock.dummy.updateMatrix();
        mesh.setMatrixAt(i, rock.dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
    for (let i = 0; i < this.satellites.length; i++) {
      const orbit = this.satelliteOrbits[i];
      const sat = this.satellites[i];
      const angle = orbit.angle + this.elapsed * orbit.speed;
      sat.position.set(
        orbit.radius * Math.cos(angle),
        orbit.height + this.orbitalHeight(i, orbit.radius, angle),
        orbit.radius * Math.sin(angle)
      );
      // Tangential velocity heading with reverse for retrograde orbits
      const heading = orbit.speed >= 0 ? -angle + Math.PI / 2 : -angle - Math.PI / 2;
      sat.rotation.y = heading;
      // Multi-axis physical gyroscopic precession
      sat.rotation.z = Math.sin(this.elapsed * 0.015 + i) * 0.045;
      sat.rotation.x = Math.cos(this.elapsed * 0.012 + i * 2) * 0.035;

      // Solar wing articulation: continuous gentle solar alignment
      const wingPitch = Math.sin(this.elapsed * 0.04 + i * 1.1) * 0.22;
      for (const child of sat.children) {
        if (child.name === "ORRA_SolarArray") {
          child.rotation.x = wingPitch;
        }
      }

      // Aerospace anti-collision strobe pulse (double-flash sequence every 1.5s)
      const strobePhase = (this.elapsed * 1.4 + i * 0.45) % 1.5;
      const isFlash = strobePhase < 0.08 || (strobePhase > 0.18 && strobePhase < 0.26);
      const intensity = isFlash ? 1.0 : 0.08;

      for (const beacon of this.beacons[i]) beacon.material.color.setRGB(0.94 * intensity, 0.27 * intensity, 0.27 * intensity);
    }
  }

  dispose(): void {
    for (const object of [this.starPoints, this.heroMesh, this.asteroidMesh, this.mediumMesh, this.dustMesh]) {
      object.geometry.dispose();
      (object.material as THREE.Material).dispose();
    }
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    for (const satellite of this.satellites) satellite.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        geometries.add(object.geometry);
        materials.add(object.material as THREE.Material);
      }
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
  }
}
