import * as THREE from "three";
import { fbm3, loopNoise } from "../../math/noise";
import { STUDIO_MAIN_FOOTPRINT, MAIN_ISLAND_FOOTPRINT_SCALE } from "../island";

/**
 * The main island's landmass: a flat plateau, a rounded turf shoulder that
 * rolls over the edge, a soil band, and a rock keel hanging below.
 *
 * Every consumer reads the outlines and `surfaceY` from here (AGENTS.md
 * 8.14.1): the plateau is exactly the old footprint, so nothing built on it
 * moves; the shoulder lives outside the footprint, where no structure stands.
 */

type Vec2 = { x: number; z: number };

/** Plateau height: floors sit just above it. */
export const PLATEAU_Y = -0.16;

/**
 * Depth of the keel's conical taper below the soil band. With the spires and
 * lumps added on top, the underside reaches ~60 m under a lip that spans
 * ~125 m: depth/width near 0.5. Floating islands read as mountains from ~0.4
 * up, and as slabs below ~0.2 (the old extrusion was ~0.1).
 */
export const KEEL_DEPTH = 52;

/**
 * Point the plateau outline is star-shaped from, found by grid search: every
 * outline vertex is visible from it, so scaling rings toward it never folds
 * them. The margin is thin (min angular step ~0.003 rad), which is why the
 * tests check ring simplicity directly rather than trusting it.
 */
export const KEEL_CENTRE: Readonly<Vec2> = { x: -7, z: 1 };
/**
 * Hanging spires on the underside, in world x/z. Offset from the keel tip and
 * from each other so the underside is lopsided without twisting: depth is a
 * function of position, so every column agrees on it where they converge.
 */
const SPIRES = [
  { x: 9, z: -14, depth: 13, radius: 11 },
  { x: -20, z: 10, depth: 9, radius: 8 },
  { x: 4, z: 22, depth: 6, radius: 6.5 },
];

const OUTLINE_SPACING = 1.2;
const SHOULDER_RINGS = 7;
const KEEL_RINGS = 46;
/** Keel rings (from the lip) painted as the soil-and-root band. */
const SOIL_RINGS = 3;

function roundedFootprint(): Vec2[] {
  const points = STUDIO_MAIN_FOOTPRINT.map((p) => ({
    x: p.x * MAIN_ISLAND_FOOTPRINT_SCALE,
    y: p.y * MAIN_ISLAND_FOOTPRINT_SCALE,
    r: p.r * MAIN_ISLAND_FOOTPRINT_SCALE,
  }));
  const shape = new THREE.Shape();
  points.forEach((curr, i) => {
    const prev = points[(i - 1 + points.length) % points.length];
    const next = points[(i + 1) % points.length];
    const inLen = Math.hypot(curr.x - prev.x, curr.y - prev.y);
    const outLen = Math.hypot(next.x - curr.x, next.y - curr.y);
    const r = Math.min(curr.r, inLen / 2.05, outLen / 2.05);
    const start = { x: curr.x - ((curr.x - prev.x) / inLen) * r, y: curr.y - ((curr.y - prev.y) / inLen) * r };
    const end = { x: curr.x + ((next.x - curr.x) / outLen) * r, y: curr.y + ((next.y - curr.y) / outLen) * r };
    if (i === 0) shape.moveTo(start.x, start.y);
    else shape.lineTo(start.x, start.y);
    shape.quadraticCurveTo(curr.x, curr.y, end.x, end.y);
  });
  shape.closePath();
  const length = shape.getLength();
  const spaced = shape.getSpacedPoints(Math.round(length / OUTLINE_SPACING));
  spaced.pop(); // closed path repeats its first point
  // Shape plane y maps to world -z (the old mesh was rotated -90 degrees about x).
  return spaced.map((p) => ({ x: p.x, z: -p.y }));
}

function outwardNormals(outline: Vec2[]): Vec2[] {
  const n = outline.length;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const a = outline[i];
    const b = outline[(i + 1) % n];
    area += a.x * b.z - b.x * a.z;
  }
  const sign = area > 0 ? 1 : -1;
  let normals = outline.map((_, i) => {
    const prev = outline[(i - 1 + n) % n];
    const next = outline[(i + 1) % n];
    const dx = next.x - prev.x;
    const dz = next.z - prev.z;
    const len = Math.hypot(dx, dz) || 1;
    return { x: (sign * dz) / len, z: (-sign * dx) / len };
  });
  // Smooth over ~8 m so the offset fans through concave corners instead of
  // folding: the shoulder is up to 3.8 m wide and the corner radii are ~1.5 m.
  for (let pass = 0; pass < 3; pass++) {
    normals = normals.map((_, i) => {
      let x = 0;
      let z = 0;
      for (let k = -3; k <= 3; k++) {
        const m = normals[(i + k + n) % n];
        x += m.x;
        z += m.z;
      }
      const len = Math.hypot(x, z) || 1;
      return { x: x / len, z: z / len };
    });
  }
  return normals;
}

const PLATEAU = roundedFootprint();
const NORMALS = outwardNormals(PLATEAU);
const COLUMNS = PLATEAU.length;
const ARC: number[] = [];
PLATEAU.reduce((acc, p, i) => {
  ARC[i] = acc;
  const next = PLATEAU[(i + 1) % COLUMNS];
  return acc + Math.hypot(next.x - p.x, next.z - p.z);
}, 0);
const LOOP = ARC[COLUMNS - 1] + Math.hypot(PLATEAU[0].x - PLATEAU[COLUMNS - 1].x, PLATEAU[0].z - PLATEAU[COLUMNS - 1].z);

/**
 * Value-noise fbm never spans [0, 1], and each series spans a different part
 * of it, so each is stretched by its own measured p1..p99 over this ~470 m loop
 * (2026-09-25): feature 5 m 0.188..0.779, 18 m 0.256..0.773, 24 m 0.399..0.721.
 * Re-measure if the outline or the noise parameters change.
 */
const spread = (v: number, p1: number, p99: number) => THREE.MathUtils.clamp((v - p1) / (p99 - p1), 0, 1);

/** Shoulder width per column: how far the turf rolls out past the plateau before the rock. */
const SHOULDER_WIDTH = ARC.map((s) => 1.6 + 2.2 * spread(loopNoise(s, LOOP, 18, 1), 0.256, 0.773));
/** Vertical drop from plateau to the top of the rock wall. */
const LIP_DROP = ARC.map((s) => 0.75 + 0.7 * spread(loopNoise(s, LOOP, 24, 2), 0.399, 0.721));
/**
 * Soil band thickness in metres. The band always spans SOIL_RINGS rings, but
 * how deep those rings reach varies smoothly per column, so the lower edge
 * wanders like a root mat instead of stepping column by column.
 */
const SOIL_THICKNESS = ARC.map((s) => 0.5 + 1.8 * spread(loopNoise(s, LOOP, 5, 4), 0.188, 0.779));

/** The flat plateau's edge: the old footprint, where every structure stands. */
export const PLATEAU_OUTLINE: readonly Vec2[] = PLATEAU;
/** The visible lip, where turf meets rock. Planting reaches this far. */
export const LIP_OUTLINE: readonly Vec2[] = PLATEAU.map((p, i) => ({
  x: p.x + NORMALS[i].x * SHOULDER_WIDTH[i],
  z: p.z + NORMALS[i].z * SHOULDER_WIDTH[i],
}));

/**
 * How far each column's ray from the keel centre travels before it first
 * leaves the lip outline. Equals the lip distance where the outline is
 * star-shaped from the centre; shorter where it only barely is, and that
 * shorter bound is what keeps rock under the turf.
 */
const SAFE_REACH = LIP_OUTLINE.map((lip, i) => {
  const dx = lip.x - KEEL_CENTRE.x;
  const dz = lip.z - KEEL_CENTRE.z;
  const len = Math.hypot(dx, dz);
  const ux = dx / len;
  const uz = dz / len;
  let reach = len;
  for (let j = 0; j < COLUMNS; j++) {
    if (j === i || (j + 1) % COLUMNS === i) continue;
    const a = LIP_OUTLINE[j];
    const b = LIP_OUTLINE[(j + 1) % COLUMNS];
    const ex = b.x - a.x;
    const ez = b.z - a.z;
    const denom = ux * ez - uz * ex;
    if (Math.abs(denom) < 1e-9) continue;
    const ax = a.x - KEEL_CENTRE.x;
    const az = a.z - KEEL_CENTRE.z;
    const along = (ax * ez - az * ex) / denom;
    const onEdge = (ax * uz - az * ux) / denom;
    if (along > 0.01 && onEdge >= 0 && onEdge <= 1) reach = Math.min(reach, along);
  }
  return reach;
});

/** Rounded bullnose: flat where it leaves the plateau, vertical where it meets the rock. */
const shoulderDrop = (u: number) => 1 - Math.sqrt(Math.max(0, 1 - u * u));

/**
 * The keel is a body and a spire. The body holds near full width for its
 * first third (a cliff), then tapers like an inverted mountain down to the
 * spire's base; the spire then narrows to the tip. Every column meets at the
 * tip, and the spire's small, fixed radius is what keeps that convergence
 * reading as a stalactite point rather than a pinched fan across the underside.
 */
const BODY_END = 0.8;
/** Spire radius at its base, in metres; fixed so the spire is round whatever the footprint. */
const SPIRE_RADIUS = 7;
/** Share of KEEL_DEPTH the body takes; the spire adds the rest below it. */
const BODY_DEPTH = 0.78;
const SPIRE_DEPTH = 0.5;

/** Horizontal distance from the keel centre, in metres, at depth fraction q. */
function keelReach(q: number, rayLen: number): number {
  const spireBase = Math.min(SPIRE_RADIUS, rayLen * 0.5);
  if (q <= BODY_END) {
    const u = q / BODY_END;
    return spireBase + (rayLen - spireBase) * Math.pow(Math.max(0, 1 - Math.pow(u, 1.8)), 0.9);
  }
  return spireBase * Math.pow(1 - (q - BODY_END) / (1 - BODY_END), 0.8);
}

/** Sideways lean of the spire at depth fraction q: zero on the body, growing toward the tip. */
const SPIRE_LEAN = { x: 3.2, z: -2.4 };
function spireLean(q: number): Vec2 {
  const s = Math.max(0, (q - BODY_END) / (1 - BODY_END));
  return { x: SPIRE_LEAN.x * s * s, z: SPIRE_LEAN.z * s * s };
}

/** Depth below the soil band, in metres, at depth fraction q. */
const keelDepth = (q: number) =>
  q <= BODY_END
    ? KEEL_DEPTH * BODY_DEPTH * (q / BODY_END)
    : KEEL_DEPTH * (BODY_DEPTH + SPIRE_DEPTH * ((q - BODY_END) / (1 - BODY_END)));

const MEAN_LIP_DROP = LIP_DROP.reduce((a, b) => a + b, 0) / COLUMNS;
const MEAN_SOIL = SOIL_THICKNESS.reduce((a, b) => a + b, 0) / COLUMNS;

/**
 * Extra underside depth at a world position: spires, broad lumps and fine
 * crags. Position-only, so converging columns always agree.
 */
function undersideRelief(x: number, z: number): number {
  let relief = 0;
  for (const spire of SPIRES) {
    const d = Math.hypot(x - spire.x, z - spire.z) / spire.radius;
    if (d < 1) relief += spire.depth * Math.pow(1 - d, 1.4);
  }
  relief += 7 * (fbm3(x * 0.03, 0, z * 0.03, 3, 21) - 0.5);
  relief += 3 * (fbm3(x * 0.13, 0, z * 0.13, 3, 23) - 0.5);
  return relief;
}

/** Deepest point of the keel: the pole where every column meets. */
const TIP_Y = PLATEAU_Y - MEAN_LIP_DROP - MEAN_SOIL - keelDepth(1) - undersideRelief(KEEL_CENTRE.x, KEEL_CENTRE.z);

/** Vertex layout of the mass: vertex(c, r) = r * columns + c, then one tip vertex. Exported for tests. */
export const MASS_GRID = { columns: COLUMNS + 1, rings: SHOULDER_RINGS + KEEL_RINGS + 1, shoulderRings: SHOULDER_RINGS };

export interface IslandMass {
  mesh: THREE.Mesh;
  /** Ground height on the island top (plateau and shoulder), or null off the island. */
  surfaceY: (x: number, z: number) => number | null;
}

/** Materials: [turf, rock, soil]. */
export function buildIslandMass(materials: [THREE.Material, THREE.Material, THREE.Material]): IslandMass {
  const cols = COLUMNS + 1; // one duplicated seam column so UVs do not smear across the wrap
  const rings = SHOULDER_RINGS + KEEL_RINGS + 1;
  const positions = new Float32Array((cols * rings + 1) * 3);
  const uvs = new Float32Array((cols * rings + 1) * 2);
  const vertex = (c: number, r: number) => r * cols + c;

  for (let c = 0; c < cols; c++) {
    const i = c % COLUMNS;
    const arc = c === COLUMNS ? LOOP : ARC[i];
    const p = PLATEAU[i];
    const n = NORMALS[i];
    const w = SHOULDER_WIDTH[i];
    const lip = LIP_OUTLINE[i];
    const lipY = PLATEAU_Y - LIP_DROP[i];
    const rayX = lip.x - KEEL_CENTRE.x;
    const rayZ = lip.z - KEEL_CENTRE.z;
    const rayLen = Math.hypot(rayX, rayZ);
    const dirX = rayX / rayLen;
    const dirZ = rayZ / rayLen;

    for (let r = 0; r < rings; r++) {
      let x: number;
      let y: number;
      let z: number;
      if (r <= SHOULDER_RINGS) {
        // Denser toward the lip, where the bullnose curves hardest.
        const u = Math.sin(((r / SHOULDER_RINGS) * Math.PI) / 2);
        x = p.x + n.x * u * w;
        z = p.z + n.z * u * w;
        y = PLATEAU_Y - LIP_DROP[i] * shoulderDrop(u);
        uvs.set([x, -z], vertex(c, r) * 2);
      } else {
        const k = r - SHOULDER_RINGS;
        let base: number; // metres from the keel centre along the ray
        let q = 0; // depth fraction through the rock taper
        if (k <= SOIL_RINGS) {
          y = lipY - (SOIL_THICKNESS[i] * k) / SOIL_RINGS;
          base = rayLen;
        } else {
          // The last ring stops just short of the pole; the tip vertex closes it.
          q = ((k - SOIL_RINGS) / (KEEL_RINGS - SOIL_RINGS)) * 0.985;
          base = keelReach(q, rayLen);
          // Per-column lip and soil values blend to their means toward the
          // tip, so all columns arrive at one height there.
          const own = THREE.MathUtils.smoothstep(base / rayLen, 0, 0.6);
          const lipDrop = MEAN_LIP_DROP + (LIP_DROP[i] - MEAN_LIP_DROP) * own;
          const soilDepth = MEAN_SOIL + (SOIL_THICKNESS[i] - MEAN_SOIL) * own;
          const px = KEEL_CENTRE.x + dirX * base;
          const pz = KEEL_CENTRE.z + dirZ * base;
          y = PLATEAU_Y - lipDrop - soilDepth - keelDepth(q)
            - undersideRelief(px, pz) * THREE.MathUtils.smoothstep(q, 0.25, 0.75);
        }
        // Rock detail displaces along each column's own ray from the keel
        // centre. Rays never cross, so rings keep their angular order.
        const sx = KEEL_CENTRE.x + dirX * base;
        const sz = KEEL_CENTRE.z + dirZ * base;
        const warp = fbm3(sx * 0.03, y * 0.03, sz * 0.03, 2, 11) - 0.5;
        const rock = (fbm3(sx * 0.1 + warp * 2.5, y * 0.14, sz * 0.1 - warp * 2.5, 5, 17) - 0.5) * 2;
        // Erosion ribs: noise stretched vertically, like runoff fluting.
        const ribs = (fbm3(sx * 0.18, y * 0.035, sz * 0.18, 3, 19) - 0.5) * 2;
        // Ridged noise folds to sharp crests: crisp arêtes instead of soft lumps.
        const ridged = 1 - Math.abs(fbm3(sx * 0.22, y * 0.2, sz * 0.22, 3, 25) * 2 - 1);
        const settle = THREE.MathUtils.smoothstep(k / SOIL_RINGS, 0.4, 2.5);
        // Full crags on the body; the spire keeps a rough skin that fades only
        // at its last metre, where displacement would fold the point.
        const amp = settle * (0.6 * THREE.MathUtils.smoothstep(base, 3, 16) + 0.4 * THREE.MathUtils.smoothstep(base, 0.5, 4));
        // Ribs converging on the spire's base would draw a fan; stop them short.
        const ribWeight = THREE.MathUtils.smoothstep(base, 8, 24);
        // Bedding shelves: a sawtooth in warped height, so each bed steps in at
        // its base. The warp keeps the beds from reading as level contour lines.
        const bed = (y + warp * 14) / 6.5;
        const shelf = 1.4 * amp * THREE.MathUtils.smoothstep(bed - Math.floor(bed), 0.72, 1);
        // Rock never pushes past the lip: the turf overhangs, never the reverse.
        let reach = Math.max(0.3, Math.min(base + amp * (4.5 * rock + 2.2 * ribs * ribWeight + 1.6 * (ridged - 0.5)) - shelf, SAFE_REACH[i] - 0.05));
        // The spire leans as it descends. Every ring moves as a whole, so the
        // lean bends the spire without twisting it.
        const lean = spireLean(q);
        x = KEEL_CENTRE.x + dirX * reach + lean.x;
        z = KEEL_CENTRE.z + dirZ * reach + lean.z;
        // Belt and braces where the outline is only barely star-shaped.
        while (reach > 0.3 && !pointInPolygon(x, z, LIP_OUTLINE)) {
          reach -= 0.25;
          x = KEEL_CENTRE.x + dirX * reach + lean.x;
          z = KEEL_CENTRE.z + dirZ * reach + lean.z;
        }
        uvs.set([arc, y], vertex(c, r) * 2);
      }
      positions.set([x, y, z], vertex(c, r) * 3);
    }
  }
  // Tip closing the keel at the pole.
  const tip = cols * rings;
  positions.set([KEEL_CENTRE.x + SPIRE_LEAN.x, TIP_Y, KEEL_CENTRE.z + SPIRE_LEAN.z], tip * 3);
  uvs.set([0, 0], tip * 2);

  // Index buffer, grouped by material: turf shoulder + plateau, soil band, rock.
  const turf: number[] = [];
  const soil: number[] = [];
  const rock: number[] = [];
  for (let r = 0; r < rings - 1; r++) {
    const target = r < SHOULDER_RINGS ? turf : r < SHOULDER_RINGS + SOIL_RINGS ? soil : rock;
    for (let c = 0; c < cols - 1; c++) {
      const a = vertex(c, r);
      const b = vertex(c + 1, r);
      const d = vertex(c, r + 1);
      const e = vertex(c + 1, r + 1);
      target.push(a, d, b, b, d, e);
    }
  }
  for (let c = 0; c < cols - 1; c++) rock.push(vertex(c, rings - 1), tip, vertex(c + 1, rings - 1));

  // The flat plateau: an earcut cap sharing the shoulder's first ring, so the
  // seam is watertight. It needs no interior vertices because it is flat.
  // Winding depends on the outline's orientation. The first shoulder face
  // leaves the plateau almost flat, so it must face up; flip everything if not.
  const flip = (list: number[], from = 0, to = list.length) => {
    for (let k = from; k < to; k += 3) [list[k + 1], list[k + 2]] = [list[k + 2], list[k + 1]];
  };
  if (!facesUp(positions, turf, 0)) [turf, soil, rock].forEach((list) => flip(list));

  const capStart = turf.length;
  const contour = PLATEAU.map((p) => new THREE.Vector2(p.x, p.z));
  for (const [a, b, d] of THREE.ShapeUtils.triangulateShape(contour, [])) {
    turf.push(vertex(a, 0), vertex(b, 0), vertex(d, 0));
  }
  if (!facesUp(positions, turf, capStart)) flip(turf, capStart);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex([...turf, ...rock, ...soil]);
  geometry.addGroup(0, turf.length, 0);
  geometry.addGroup(turf.length, rock.length, 1);
  geometry.addGroup(turf.length + rock.length, soil.length, 2);
  geometry.computeVertexNormals();
  weldSeamNormals(geometry, cols, rings);
  // The plateau is flat: give it exactly vertical normals rather than averages
  // pulled sideways by the shoulder faces sharing ring 0.
  const normals = geometry.getAttribute("normal") as THREE.BufferAttribute;
  for (let c = 0; c < cols; c++) normals.setXYZ(vertex(c, 0), 0, 1, 0);
  bakeRockColours(geometry);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  const mesh = new THREE.Mesh(geometry, materials);

  // Surface queries: flat inside the plateau, raycast onto the shoulder outside it.
  const shoulderGeometry = new THREE.BufferGeometry();
  shoulderGeometry.setAttribute("position", geometry.getAttribute("position"));
  shoulderGeometry.setIndex(turf.slice(0, capStart));
  const shoulder = new THREE.Mesh(shoulderGeometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  const raycaster = new THREE.Raycaster();
  const down = new THREE.Vector3(0, -1, 0);
  const origin = new THREE.Vector3();
  const surfaceY = (x: number, z: number): number | null => {
    if (pointInPolygon(x, z, PLATEAU)) return PLATEAU_Y;
    raycaster.set(origin.set(x, PLATEAU_Y + 5, z), down);
    const hit = raycaster.intersectObject(shoulder, false)[0];
    return hit ? hit.point.y : null;
  };

  return { mesh, surfaceY };
}

function facesUp(positions: Float32Array, indices: number[], start: number): boolean {
  const [a, b, c] = [indices[start], indices[start + 1], indices[start + 2]];
  const ax = positions[b * 3] - positions[a * 3];
  const az = positions[b * 3 + 2] - positions[a * 3 + 2];
  const bx = positions[c * 3] - positions[a * 3];
  const bz = positions[c * 3 + 2] - positions[a * 3 + 2];
  return az * bx - ax * bz > 0; // y component of (b - a) x (c - a)
}

const STONE_LIGHT = new THREE.Color(0.58, 0.53, 0.46);
const STONE_DARK = new THREE.Color(0.39, 0.36, 0.32);
const MOSS = new THREE.Color(0.22, 0.32, 0.13);
const UNDERSIDE = new THREE.Color(0.3, 0.3, 0.32);

/**
 * Macro colour for the rock, which the rock material multiplies with grain:
 * warped strata tones, moss on upward ledges near the lip, crevice shading,
 * and a cooler, darker underside that never sees the sun.
 */
function bakeRockColours(geometry: THREE.BufferGeometry): void {
  const position = geometry.getAttribute("position");
  const normal = geometry.getAttribute("normal");
  const colours = new Float32Array(position.count * 3);
  const colour = new THREE.Color();
  for (let v = 0; v < position.count; v++) {
    const x = position.getX(v);
    const y = position.getY(v);
    const z = position.getZ(v);
    const below = PLATEAU_Y - y;
    const warp = fbm3(x * 0.04, y * 0.04, z * 0.04, 2, 31) - 0.5;
    const bed = (y + warp * 12) / 3.2;
    const band = Math.abs((bed - Math.floor(bed)) * 2 - 1); // triangle wave across each bed
    colour.copy(STONE_DARK).lerp(STONE_LIGHT, 0.35 + 0.65 * band * fbm3(x * 0.2, y * 0.2, z * 0.2, 2, 33));
    // Sky light falls off down the keel and barely reaches the underside.
    colour.lerp(UNDERSIDE, THREE.MathUtils.smoothstep(below, 6, 55) * 0.75);
    colour.lerp(UNDERSIDE, THREE.MathUtils.smoothstep(-normal.getY(v), 0.2, 0.8) * 0.35);
    // Moss holds on ledges that face up, and only in the damp upper band.
    const ledge = THREE.MathUtils.smoothstep(normal.getY(v), 0.25, 0.7);
    const damp = 1 - THREE.MathUtils.smoothstep(below, 3, 16);
    const patch = THREE.MathUtils.smoothstep(fbm3(x * 0.15, y * 0.15, z * 0.15, 3, 35), 0.4, 0.62);
    colour.lerp(MOSS, ledge * damp * patch * 0.85);
    // Crevices: a cheap stand-in for ambient occlusion.
    colour.multiplyScalar(0.72 + 0.4 * fbm3(x * 0.35, y * 0.35, z * 0.35, 3, 37));
    colours.set([colour.r, colour.g, colour.b], v * 3);
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colours, 3));
}

/** The duplicated seam column gets the average of both sides, so no lighting seam shows. */
function weldSeamNormals(geometry: THREE.BufferGeometry, cols: number, rings: number): void {
  const normals = geometry.getAttribute("normal") as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let r = 0; r < rings; r++) {
    const first = r * cols;
    const last = r * cols + cols - 1;
    v.set(
      normals.getX(first) + normals.getX(last),
      normals.getY(first) + normals.getY(last),
      normals.getZ(first) + normals.getZ(last)
    ).normalize();
    normals.setXYZ(first, v.x, v.y, v.z);
    normals.setXYZ(last, v.x, v.y, v.z);
  }
}

export function pointInPolygon(x: number, z: number, polygon: readonly Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    if (a.z > z !== b.z > z && x < ((b.x - a.x) * (z - a.z)) / (b.z - a.z) + a.x) inside = !inside;
  }
  return inside;
}
