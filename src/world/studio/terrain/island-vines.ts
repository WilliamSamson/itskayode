import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { fbm3 } from "../../math/noise";
import { hash01 } from "../../math/hash";
import { KEEL_CENTRE, MASS_GRID, PLATEAU_Y, type IslandMass } from "./island-mass";

/**
 * Thick vines hanging off the island's lip. Each starts in the turf, drapes
 * over the bullnose, then falls under gravity; the rock only pushes it outward
 * where the wall bulges, so a vine never passes through stone.
 */

export interface VinePath {
  points: THREE.Vector3[];
  radius: number;
}

export interface IslandVines {
  group: THREE.Group;
  paths: VinePath[];
  update: (timeSeconds: number) => void;
}

/** Vines above this height hang from the lip and do not sway. */
const SWAY_TOP = PLATEAU_Y - 0.6;
const STEP = 0.55;
/** Gap kept between a vine's surface and the rock it rests against. */
const CLEARANCE = 0.12;

export function buildIslandVines(mass: IslandMass): IslandVines {
  const position = mass.mesh.geometry.getAttribute("position");
  const { columns, rings, shoulderRings } = MASS_GRID;
  const at = (c: number, r: number) => new THREE.Vector3().fromBufferAttribute(position, r * columns + c);
  // Outward is measured from the keel centre, the point the keel's rays leave from.
  const pole = new THREE.Vector3(KEEL_CENTRE.x, 0, KEEL_CENTRE.z);
  const outlineColumns = columns - 1;

  const paths: VinePath[] = [];
  for (let c = 0; c < outlineColumns; c++) {
    // Clustered along the lip (~25 m groups), sparse between them.
    const cluster = THREE.MathUtils.smoothstep(fbm3(c * 0.045, 0, 0, 3, 41), 0.42, 0.66);
    if (hash01(c, 43) > 0.55 * cluster) continue;
    paths.push(...traceBundle(c, at, pole, rings, shoulderRings, outlineColumns));
  }

  const swayTime = { value: 0 };
  const bark = new THREE.MeshStandardMaterial({ color: 0x4d3d2a, roughness: 0.9, metalness: 0 });
  const leaf = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.78, metalness: 0, side: THREE.DoubleSide });
  for (const material of [bark, leaf]) addSway(material, swayTime);

  const stems = mergeGeometries(paths.map(tubeFor));
  const stemMesh = new THREE.Mesh(stems, bark);
  stemMesh.name = "cliff-vines-vegetation";
  stemMesh.castShadow = true;
  stemMesh.receiveShadow = true;

  const leafMesh = buildLeaves(paths, leaf);

  const group = new THREE.Group();
  group.name = "cliff-vines-vegetation";
  group.add(stemMesh, leafMesh);

  return {
    group,
    paths,
    update: (timeSeconds) => {
      swayTime.value = timeSeconds;
    },
  };
}

/**
 * A main stem plus one or two thinner companions that twist around it. The
 * companions orbit only on the outward half, so they never swing into rock.
 */
function traceBundle(
  c: number,
  at: (c: number, r: number) => THREE.Vector3,
  pole: THREE.Vector3,
  rings: number,
  shoulderRings: number,
  outlineColumns: number
): VinePath[] {
  const next = (c + 1) % outlineColumns;
  const across = hash01(c, 45);
  const blend = (r: number) => at(c, r).lerp(at(next, r), across);
  const radius = 0.16 + 0.22 * hash01(c, 47);
  // Companions orbit up to 1.5 radii out and are half as thick: clear the rock
  // for the whole bundle, not just the main stem.
  const bundleRadius = radius * 2.1;
  const length = 5 + 22 * Math.pow(hash01(c, 49), 1.6);

  const lip = blend(shoulderRings);
  const dir = new THREE.Vector2(lip.x - pole.x, lip.z - pole.z).normalize();
  const side = new THREE.Vector2(-dir.y, dir.x);
  // The wall across this column and its neighbours, top to bottom. The vine
  // wanders sideways by up to ~0.4 m, so clearance is judged against every
  // column it could drift over, not just its own.
  const neighbours = [c - 1, c, next, next + 1].map((k) => (k + outlineColumns) % outlineColumns);
  const wall: { y: number; reach: number }[] = [];
  for (let r = shoulderRings; r < rings; r++) {
    let y = 0;
    let reach = -Infinity;
    for (const k of neighbours) {
      const v = at(k, r);
      y += v.y / neighbours.length;
      reach = Math.max(reach, (v.x - pole.x) * dir.x + (v.z - pole.z) * dir.y);
    }
    wall.push({ y, reach });
  }
  // Between two rings the wall is a slanted face; the more outward of the
  // pair bounds it, so a vine kept clear of both is clear of the face.
  const wallReach = (y: number) => {
    let reach = -Infinity;
    for (let k = 0; k < wall.length - 1; k++) {
      const hi = wall[k];
      const lo = wall[k + 1];
      if (y <= hi.y + 0.6 && y >= lo.y - 0.6) reach = Math.max(reach, hi.reach, lo.reach);
    }
    return reach === -Infinity ? wall[wall.length - 1].reach : reach;
  };

  const start = blend(shoulderRings - 2).add(new THREE.Vector3(0, radius * 0.6, 0));
  const lipReach = (lip.x - pole.x) * dir.x + (lip.z - pole.z) * dir.y;
  const lipSide = (lip.x - pole.x) * side.x + (lip.z - pole.z) * side.y;
  const place = (reach: number, lateral: number, y: number) =>
    new THREE.Vector3(
      pole.x + dir.x * reach + side.x * (lipSide + lateral),
      y,
      pole.z + dir.y * reach + side.y * (lipSide + lateral)
    );
  // Over the bullnose, then a free fall. Reach only ever grows: a vine pushed
  // out by a bulge hangs plumb from it, as gravity would leave it.
  let reach = lipReach + bundleRadius + CLEARANCE;
  const points = [start, place(reach, 0, lip.y + radius)];
  let y = lip.y + radius;
  let travelled = 0;
  let k = 0;
  while (travelled < length) {
    k++;
    y -= STEP;
    reach = Math.max(reach, wallReach(y) + bundleRadius + CLEARANCE);
    // Bounded, non-periodic sideways wander, so strands are not plumb lines.
    const lateral = (fbm3(c * 1.7, k * 0.12, 0, 2, 51) - 0.5) * 0.8;
    const point = place(reach, lateral, y);
    travelled += point.distanceTo(points[points.length - 1]);
    points.push(point);
  }
  // The free end curls outward a little, as a vine tip does.
  const tip = points[points.length - 1];
  tip.x += dir.x * 0.35;
  tip.z += dir.y * 0.35;
  tip.y += 0.2;

  const bundle: VinePath[] = [{ points, radius }];
  const companions = 1 + Math.floor(hash01(c, 65) * 2);
  for (let n = 0; n < companions; n++) {
    const phase = hash01(c * 7 + n, 67) * Math.PI * 2;
    const orbit = radius * 1.5;
    const keep = Math.max(4, Math.floor(points.length * (0.5 + 0.4 * hash01(c * 7 + n, 69))));
    const twisted = points.slice(0, keep).map((p, m) => {
      if (m === 0) return p.clone();
      const theta = phase + m * 0.38;
      // Companions split from the main stem below the lip. Right at the lip a
      // sideways offset could meet the next wall of a concave corner.
      const spread = orbit * THREE.MathUtils.smoothstep(lip.y - p.y, 0.5, 3);
      const outward = Math.abs(Math.sin(theta)) * spread;
      const across = Math.cos(theta) * spread;
      return new THREE.Vector3(
        p.x + side.x * across + dir.x * outward,
        p.y,
        p.z + side.y * across + dir.y * outward
      );
    });
    bundle.push({ points: twisted, radius: radius * 0.5 });
  }
  return bundle;
}

/** A tube whose radius tapers from the lip to the free end. */
function tubeFor(path: VinePath): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(path.points, false, "centripetal");
  const segments = Math.max(8, Math.ceil(curve.getLength() * 2.2));
  const radial = 6;
  const tube = new THREE.TubeGeometry(curve, segments, path.radius, radial, false);
  const position = tube.getAttribute("position");
  const centre = new THREE.Vector3();
  const v = new THREE.Vector3();
  for (let i = 0; i <= segments; i++) {
    const s = i / segments;
    curve.getPointAt(s, centre);
    const taper = 1 - 0.65 * s;
    for (let j = 0; j <= radial; j++) {
      const index = i * (radial + 1) + j;
      v.fromBufferAttribute(position, index).sub(centre).multiplyScalar(taper).add(centre);
      position.setXYZ(index, v.x, v.y, v.z);
    }
  }
  tube.computeVertexNormals();
  return tube;
}

const LEAF_GREENS = [0x2f5a22, 0x3f6f2b, 0x24481b, 0x4d7f33].map((c) => new THREE.Color(c));

function leafGeometry(): THREE.BufferGeometry {
  // A slightly cupped diamond leaf, 0.3 m long, hinged at its stem.
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute([0, 0, 0, 0.08, 0.13, 0.03, 0, 0.3, 0, -0.08, 0.13, 0.03], 3)
  );
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  geometry.computeVertexNormals();
  return geometry;
}

function buildLeaves(paths: VinePath[], material: THREE.Material): THREE.InstancedMesh {
  const placements: { point: THREE.Vector3; outward: THREE.Vector3; seed: number }[] = [];
  paths.forEach((path, p) => {
    const curve = new THREE.CatmullRomCurve3(path.points, false, "centripetal");
    const length = curve.getLength();
    // Denser near the lip, thinning toward the free end.
    let s = 0;
    let n = 0;
    while (s < length) {
      const t = s / length;
      const point = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t);
      const outward = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize();
      if (hash01(p * 977 + n, 55) < 0.5) outward.negate();
      placements.push({ point, outward, seed: p * 977 + n });
      s += 0.09 + 0.35 * t;
      n++;
    }
  });

  const mesh = new THREE.InstancedMesh(leafGeometry(), material, placements.length);
  mesh.name = "cliff-vines-vegetation";
  mesh.receiveShadow = true;
  const dummy = new THREE.Object3D();
  placements.forEach(({ point, outward, seed }, i) => {
    dummy.position.copy(point).addScaledVector(outward, 0.06);
    dummy.lookAt(point.clone().add(outward));
    dummy.rotateX(-0.6 + hash01(seed, 57) * 1.2);
    dummy.rotateZ((hash01(seed, 59) - 0.5) * 2.4);
    const scale = 1 + hash01(seed, 61) * 1.2;
    dummy.scale.set(scale, scale, scale);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    // Luminance varies more than hue (AGENTS.md 8.11.2).
    mesh.setColorAt(i, LEAF_GREENS[Math.floor(hash01(seed, 63) * LEAF_GREENS.length)]);
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
  return mesh;
}

/**
 * Wind sway in world space, growing with how far below the lip a point hangs.
 * Stems and leaves share it, so leaves stay on their stems. The two terms are
 * 1-D temporal envelopes (AGENTS.md 8.12.3 allows these, 8.3 bans spatial ones).
 */
function addSway(material: THREE.Material, time: { value: number }): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uVineTime = time;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uVineTime;")
      .replace(
        "#include <project_vertex>",
        `vec4 swayPos = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
  swayPos = instanceMatrix * swayPos;
#endif
swayPos = modelMatrix * swayPos;
float hang = max(0.0, ${SWAY_TOP.toFixed(3)} - swayPos.y);
float phase = dot(swayPos.xz, vec2(0.11, 0.07));
float gust = sin(uVineTime * 0.7 + phase) * 0.6 + sin(uVineTime * 1.31 + phase * 1.7) * 0.4;
swayPos.xz += vec2(0.8, 0.6) * gust * 0.012 * pow(hang, 1.3);
vec4 mvPosition = viewMatrix * swayPos;
gl_Position = projectionMatrix * mvPosition;`
      );
  };
  material.customProgramCacheKey = () => "island-vine-sway";
}
