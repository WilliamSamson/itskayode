import * as THREE from "three";

/**
 * ORRA Crepuscular God Ray System
 * ================================
 *
 * Volumetric light shafts cast through breaks in the cloud deck.
 *
 * The system this replaces was five hardcoded cones at fixed world positions with
 * fixed rotations and a flat `MeshBasicMaterial`. That fails for four reasons, and
 * each one is corrected here:
 *
 *  1. The shafts never pointed at the sun. Real crepuscular rays are *parallel* --
 *     the sun is effectively at infinity, and the apparent fanning is pure
 *     perspective. Cones aimed in arbitrary directions read as glowing cones.
 *  2. Flat uniform opacity on a hard-edged cylinder shows its own silhouette. A
 *     light shaft has no edge; it has a density that falls off to nothing.
 *  3. No view dependence. God rays are a forward-scattering (Mie) phenomenon --
 *     they are brilliant looking toward the sun and nearly invisible looking away.
 *     That angular response is the single strongest realism cue, and a constant
 *     opacity throws it away entirely.
 *  4. They intersected terrain and the camera with hard clipped edges.
 *
 * Everything is geometry + one shader, so this runs without a post-processing
 * pass and stays inside the existing draw budget.
 */

/** Density falloff and shaft-count constants, calibrated to the 5km continental landmass. */
const SHAFT_COUNT = 7;
/** Shafts span the continental basin; length must clear the inversion ceiling down to terrain. */
const SHAFT_LENGTH = 1400;
const SHAFT_RADIUS_TOP = 85;
const SHAFT_RADIUS_BOTTOM = 260;

const godRayVertexShader = /* glsl */ `
  varying vec3 vWorldPos;
  varying vec2 vUv;
  varying float vRadial;

  void main() {
    vUv = uv;

    // Distance from the shaft's own axis, normalised against the LOCAL radius at
    // this height rather than a single constant. The shaft is a cone, so a fixed
    // divisor would leave the narrow top never reaching zero density and showing
    // a hard rim. uv.y runs 0 at the wide bottom to 1 at the narrow top.
    float localRadius = mix(radiusBottom, radiusTop, uv.y);
    vRadial = length(position.xz) / max(localRadius, 0.0001);

    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const godRayFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uSunDir;      // normalised, world space, pointing TOWARD the sun
  uniform vec3 uCameraPos;
  uniform float uIntensity;  // master gain from weather state
  uniform float uTime;
  uniform float uSeed;
  uniform float uGroundY;    // terrain height the shaft lands on
  uniform float uScale;      // world scale (engine/world-scale.ts)

  varying vec3 vWorldPos;
  varying vec2 vUv;
  varying float vRadial;

  // Cheap 1D value noise for density mottling along the shaft.
  float hash11(float p) {
    p = fract(p * 0.1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
  }

  float noise11(float x) {
    float i = floor(x);
    float f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(hash11(i), hash11(i + 1.0), f);
  }

  void main() {
    // --- 1. Radial density -------------------------------------------------
    // Smooth falloff to zero at the shaft boundary, so the shaft never shows a
    // silhouette. Squared for a soft core-weighted profile.
    float radial = 1.0 - clamp(vRadial, 0.0, 1.0);
    radial = radial * radial;

    // --- 2. Longitudinal density -------------------------------------------
    // Brightest where the beam leaves the cloud break, scattering out as it
    // descends. vUv.y runs 0 at the bottom to 1 at the top for a cylinder.
    float along = clamp(vUv.y, 0.0, 1.0);
    float longitudinal = pow(along, 1.35);

    // Fade out where the shaft meets the ground so it never shows a hard
    // intersection edge against terrain.
    float groundFade = smoothstep(0.0, 55.0 * uScale, vWorldPos.y - uGroundY);

    // --- 3. Forward scattering (the realism cue) ---------------------------
    // Mie scattering is strongly forward-biased: shafts blaze when you look
    // toward the sun and all but vanish when you look away. Without this the
    // rays read as static geometry no matter where the camera is.
    vec3 viewDir = normalize(vWorldPos - uCameraPos);
    float cosAngle = dot(viewDir, -uSunDir);
    // Henyey-Greenstein, g = 0.76 (strongly forward scattering aerosol).
    float g = 0.76;
    float gg = g * g;
    float denom = 1.0 + gg - 2.0 * g * cosAngle;
    float phase = (1.0 - gg) / (4.0 * 3.14159265 * pow(max(denom, 0.0001), 1.5));
    // Normalise into a usable 0..1-ish gain and keep a floor so shafts remain
    // faintly visible from the side rather than popping out of existence.
    float scatter = clamp(phase * 2.6, 0.0, 1.6) + 0.12;

    // --- 4. Drifting density mottling --------------------------------------
    // Real shafts flicker as cloud edges move across the break. Two
    // incommensurate rates keep it from looping perceptibly.
    float mottle =
      0.78 +
      0.22 * noise11(along * 3.1 + uTime * 0.21 + uSeed) *
             noise11(along * 7.7 - uTime * 0.13 + uSeed * 2.7);

    // --- 5. Near-camera fade ------------------------------------------------
    // Prevents a bright wall when the camera passes through a shaft.
    float camDist = distance(uCameraPos, vWorldPos);
    float nearFade = smoothstep(12.0 * uScale, 70.0 * uScale, camDist);

    // Confine atmospheric scattering to the island column, not cosmic space.
    float islandMask = 1.0 - smoothstep(72.0, 102.0, length(vWorldPos.xz));
    float skyCeiling = 1.0 - smoothstep(95.0, 155.0, vWorldPos.y);
    float density =
      radial * longitudinal * groundFade * scatter * mottle * nearFade *
      islandMask * skyCeiling * uIntensity;

    if (density <= 0.001) discard;

    gl_FragColor = vec4(uColor, clamp(density, 0.0, 1.0));
  }
`;

interface Shaft {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
  /** Origin of the cloud break this shaft falls through, in world XZ. */
  breakX: number;
  breakZ: number;
  driftX: number;
  driftZ: number;
  baseIntensity: number;
}

export class GodRaySystem {
  public group: THREE.Group;

  private shafts: Shaft[] = [];
  private elapsed = 0;

  /** World-space direction pointing toward the sun (normalised). */
  private sunDir = new THREE.Vector3(0.24, 0.62, -0.75).normalize();

  private tmpCamPos = new THREE.Vector3();
  private tmpQuat = new THREE.Quaternion();
  private readonly up = new THREE.Vector3(0, 1, 0);

  /**
   * @param scale Shaft dimensions, placement and fades are calibrated to the
   *   original island rim; scale maps them onto the current island.
   */
  constructor(private color = new THREE.Color(0xffe9a8), private scale = 1) {
    this.group = new THREE.Group();
    this.group.name = "ORRA_GodRays";
    // Shafts are additive volumetrics: they must draw after opaque geometry and
    // must not occlude each other.
    this.group.renderOrder = 12;

    this.build();
  }

  private build(): void {
    // A single shared open-ended cone. Radius is carried into the shader as a
    // uniform-like constant via a geometry attribute define so the vertex stage
    // can normalise the radial term.
    const geo = new THREE.CylinderGeometry(
      SHAFT_RADIUS_TOP * this.scale,
      SHAFT_RADIUS_BOTTOM * this.scale,
      SHAFT_LENGTH * this.scale,
      14,
      6,
      true
    );

    for (let i = 0; i < SHAFT_COUNT; i++) {
      // Golden-angle placement of cloud breaks so shafts never form a visible
      // row or grid (same reasoning as vegetation scatter, AGENTS.md 8.11.3).
      const angle = i * 2.39996322972865332;
      const radius = (120 + Math.sqrt((i + 0.5) / SHAFT_COUNT) * 1650) * this.scale;

      const material = new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: this.color.clone() },
          uSunDir: { value: this.sunDir.clone() },
          uCameraPos: { value: new THREE.Vector3() },
          uIntensity: { value: 0.0 },
          uTime: { value: 0.0 },
          uSeed: { value: i * 13.37 },
          uGroundY: { value: 0.0 },
          uScale: { value: this.scale },
        },
        vertexShader: godRayVertexShader
          .replace("radiusBottom", (SHAFT_RADIUS_BOTTOM * this.scale).toFixed(4))
          .replace("radiusTop", (SHAFT_RADIUS_TOP * this.scale).toFixed(4)),
        fragmentShader: godRayFragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        // Shafts are volumes: they must be visible from inside as well as out.
        side: THREE.DoubleSide,
        // Still depth-tested, so terrain and trees correctly occlude them.
        depthTest: true,
      });

      const mesh = new THREE.Mesh(geo, material);
      mesh.frustumCulled = false;
      mesh.renderOrder = 12;

      const shaft: Shaft = {
        mesh,
        material,
        breakX: Math.cos(angle) * radius,
        breakZ: Math.sin(angle) * radius,
        // Slow independent drift so the light pattern migrates across the valley.
        driftX: Math.cos(angle * 1.7 + 0.4) * 2.6 * this.scale,
        driftZ: Math.sin(angle * 2.3 - 0.9) * 2.6 * this.scale,
        baseIntensity: 0.55 + ((i * 37) % 11) / 11 * 0.45,
      };

      this.shafts.push(shaft);
      this.group.add(mesh);
    }

    this.orientShafts();
  }

  /**
   * Aligns every shaft to the sun direction. Crepuscular rays are parallel:
   * the fan you see in photographs is perspective, not divergence. Orienting
   * each shaft independently is what made the previous cones read as props.
   */
  private orientShafts(): void {
    // The cylinder's local axis is +Y; rotate that onto the sun direction.
    this.tmpQuat.setFromUnitVectors(this.up, this.sunDir);
    for (const s of this.shafts) {
      s.mesh.quaternion.copy(this.tmpQuat);
    }
  }

  /** Points the shafts at a moving key light. */
  public setSunDirection(dir: THREE.Vector3): void {
    this.sunDir.copy(dir).normalize();
    for (const s of this.shafts) {
      (s.material.uniforms.uSunDir.value as THREE.Vector3).copy(this.sunDir);
    }
    this.orientShafts();
  }

  public setColor(color: THREE.ColorRepresentation): void {
    this.color.set(color);
    for (const s of this.shafts) {
      (s.material.uniforms.uColor.value as THREE.Color).copy(this.color);
    }
  }

  /**
   * @param intensity Master gain, normally crepuscularRays * sunExposure.
   * @param groundY   Terrain height under the valley, for the ground fade.
   */
  public update(
    camera: THREE.Camera,
    dt: number,
    intensity: number,
    groundY = 0
  ): void {
    this.elapsed += dt;

    const gain = THREE.MathUtils.clamp(intensity, 0, 1);
    // Fully off costs nothing: skip the whole group rather than drawing
    // seven transparent meshes that resolve to zero.
    this.group.visible = gain > 0.01;
    if (!this.group.visible) return;

    camera.getWorldPosition(this.tmpCamPos);

    for (const s of this.shafts) {
      // Drift the cloud break slowly across the basin, wrapping inside the rim.
      const bx = s.breakX + Math.sin(this.elapsed * 0.017) * s.driftX * 14;
      const bz = s.breakZ + Math.cos(this.elapsed * 0.013) * s.driftZ * 14;

      // Place the shaft so its centre sits on the sun axis above the break,
      // i.e. the beam lands on (bx, bz) and rises toward the sun.
      const half = SHAFT_LENGTH * this.scale * 0.5;
      s.mesh.position.set(
        bx + this.sunDir.x * half,
        groundY + this.sunDir.y * half,
        bz + this.sunDir.z * half
      );

      const u = s.material.uniforms;
      (u.uCameraPos.value as THREE.Vector3).copy(this.tmpCamPos);
      u.uTime.value = this.elapsed;
      u.uGroundY.value = groundY;
      // Smoothed so shafts swell and fade with the weather rather than snapping.
      u.uIntensity.value = THREE.MathUtils.lerp(
        u.uIntensity.value as number,
        gain * s.baseIntensity,
        Math.min(1, dt * 1.8)
      );
    }
  }

  public dispose(): void {
    for (const s of this.shafts) {
      s.material.dispose();
    }
    // Geometry is shared across all shafts; dispose once.
    if (this.shafts.length > 0) {
      this.shafts[0].mesh.geometry.dispose();
    }
    this.shafts = [];
    this.group.clear();
  }
}
