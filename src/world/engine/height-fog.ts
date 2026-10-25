import * as THREE from "three";

/**
 * Physically based height fog (AGENTS.md §4.4).
 *
 * Extinction follows Beer-Lambert, T = exp(-τ). Base extinction comes from a
 * meteorological visibility distance via Koschmieder (σ = 3.912 / V, the
 * distance at which contrast falls to 2%). Density is constant below the
 * inversion base and falls off exponentially above it, and the optical depth
 * along each view ray is integrated in closed form per pixel, so valleys fill
 * while the camera above the layer still looks down through it.
 *
 * In-scatter is single scattering: the ambient sky term is isotropic, and the
 * sun term is weighted by a Henyey-Greenstein phase (the same g as the god
 * rays), so mist glows toward the sun and stays dim away from it.
 *
 * The GLSL below and `fogTransmittance` must stay identical; the tests
 * calibrate against the TypeScript mirror.
 */

/** Koschmieder constant: ln(1 / 0.02). */
export const KOSCHMIEDER = 3.912;
/** Henyey-Greenstein asymmetry for water droplets; matches god-ray-system. */
export const FOG_PHASE_G = 0.76;
/** Inversion base, in metres. The office roofline is ~4.3 m, so fog pools around the buildings. */
export const FOG_BASE_HEIGHT = 20;
/** Scale height of a fair-weather inversion pool: thins out within ~30 m of its base. */
export const FOG_SCALE_SHALLOW = 30;
/** Scale height of a fog bank or dust storm: effectively the whole column. */
export const FOG_SCALE_DEEP = 600;

/**
 * Visibility range, in metres, across the 0..1 weather visibility.
 *
 * Log-interpolated because real visibility spans orders of magnitude.
 * Calibrated 2026-10-04 from the default 3/4 view (150 m orbit, island bound
 * 120 m: front rim ~100 m, centre 150 m, far rim ~250 m away). Transmittance
 * front / centre / far rim:
 *   fog 0.20       → 246 m: 0.67 / 0.32 / 0.07 (front reads, far rim dissolves)
 *   sandstorm 0.24 → 307 m: 0.90 / 0.50 / 0.15
 *   rain 0.42      → 728 m: 1.00 / 1.00 / 0.92 (haze on the far rim only)
 *   clear 1.0      → 6 km, past the starfield
 */
const VIS_MIN_M = 40;
const VIS_MAX_M = 6000;
const VIS_EXPONENT = 0.63;
/**
 * The subject stays crisp: no extinction within this fraction of the
 * visibility distance (AGENTS.md §4.4, "a crisp near field"). Physical fog
 * has no such zone; it is the art direction's one deliberate departure.
 */
const CLEAR_FRACTION = 0.3;

export interface FogField {
  /** Extinction at and below the inversion base, per metre. */
  extinction: number;
  /** Exponential scale height above the base, in metres. */
  scaleHeight: number;
  /** Distance from the camera before extinction begins, in metres. */
  clearDistance: number;
}

export function visibilityMetres(visibility: number): number {
  const v = THREE.MathUtils.clamp(visibility, 0, 1);
  const t = Math.pow(v, VIS_EXPONENT);
  return Math.exp(THREE.MathUtils.lerp(Math.log(VIS_MIN_M), Math.log(VIS_MAX_M), t));
}

/**
 * Fog field for a weather state. `fogDensity` is the interpolated weather
 * authority (§5.3): above ~0.5 the fog stops being a pool and becomes a bank,
 * so the scale height grows and climbing no longer escapes it.
 */
export function fogFieldFor(visibility: number, fogDensity: number): FogField {
  const metres = visibilityMetres(visibility);
  const d = THREE.MathUtils.clamp((fogDensity - 0.5) / 0.25, 0, 1);
  const deep = d * d * (3 - 2 * d);
  return {
    extinction: KOSCHMIEDER / metres,
    scaleHeight: THREE.MathUtils.lerp(FOG_SCALE_SHALLOW, FOG_SCALE_DEEP, deep),
    clearDistance: CLEAR_FRACTION * metres,
  };
}

/** Antiderivative of the relative density exp(-max(h, 0) / H), with h measured from the base. */
function cumulativeDensity(h: number, scaleHeight: number): number {
  return h <= 0 ? h : scaleHeight * (1 - Math.exp(-h / scaleHeight));
}

type Point = { x: number; y: number; z: number };

/** Fraction of light from `point` that reaches `camera`. Mirrors the fog_fragment chunk. */
export function fogTransmittance(field: FogField, camera: Point, point: Point): number {
  const dist = Math.hypot(point.x - camera.x, point.y - camera.y, point.z - camera.z);
  const a = camera.y - FOG_BASE_HEIGHT;
  const b = point.y - FOG_BASE_HEIGHT;
  const dh = b - a;
  const avg =
    Math.abs(dh) > 1e-3
      ? (cumulativeDensity(b, field.scaleHeight) - cumulativeDensity(a, field.scaleHeight)) / dh
      : Math.exp(-Math.max(a, 0) / field.scaleHeight);
  const tau = field.extinction * avg * Math.max(dist - field.clearDistance, 0);
  return Math.exp(-tau);
}

/** Henyey-Greenstein phase relative to isotropic scattering (1 when g = 0). */
export function henyeyGreenstein(cosTheta: number, g = FOG_PHASE_G): number {
  return (1 - g * g) / Math.pow(1 + g * g - 2 * g * cosTheta, 1.5);
}

/**
 * Uniforms shared by every built-in material. Their values are plain objects,
 * which `UniformsUtils.clone` copies by reference, so one write per frame
 * reaches every program (tests/height-fog.test.ts guards this).
 */
export const heightFogUniforms = {
  fogParams: { value: { x: 0, y: FOG_SCALE_SHALLOW, z: FOG_BASE_HEIGHT, w: 0 } },
  fogSunDir: { value: { x: 0, y: 1, z: 0 } },
  /** Linear sun radiance reaching the fog. */
  fogSunColor: { value: { x: 0, y: 0, z: 0 } },
};

export function applyFogField(field: FogField): void {
  const p = heightFogUniforms.fogParams.value;
  p.x = field.extinction;
  p.y = field.scaleHeight;
  p.w = field.clearDistance;
}

const PARS_VERTEX = /* glsl */ `
#ifdef USE_FOG
	varying float vFogDepth;
	varying vec3 vFogWorld;
#endif`;

const VERTEX = /* glsl */ `
#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
	// The view matrix is rigid, so its inverse rotation is its transpose.
	vFogWorld = cameraPosition + transpose( mat3( viewMatrix ) ) * mvPosition.xyz;
#endif`;

const PARS_FRAGMENT = /* glsl */ `
#ifdef USE_FOG
	uniform vec3 fogColor;
	uniform vec4 fogParams; // x extinction (1/m), y scale height, z base height, w clear distance
	uniform vec3 fogSunDir;
	uniform vec3 fogSunColor;
	varying float vFogDepth;
	varying vec3 vFogWorld;
	float orraFogCumulative( float h ) {
		return h <= 0.0 ? h : fogParams.y * ( 1.0 - exp( - h / fogParams.y ) );
	}
#endif`;

const FRAGMENT = /* glsl */ `
#ifdef USE_FOG
	vec3 fogRay = vFogWorld - cameraPosition;
	float fogDist = length( fogRay );
	float fogA = cameraPosition.y - fogParams.z;
	float fogB = vFogWorld.y - fogParams.z;
	float fogDh = fogB - fogA;
	float fogAvg = abs( fogDh ) > 1e-3
		? ( orraFogCumulative( fogB ) - orraFogCumulative( fogA ) ) / fogDh
		: exp( - max( fogA, 0.0 ) / fogParams.y );
	float fogTau = fogParams.x * fogAvg * max( fogDist - fogParams.w, 0.0 );
	float fogFactor = 1.0 - exp( - fogTau );
	float fogCos = dot( fogRay / max( fogDist, 1e-4 ), fogSunDir );
	float fogG = ${FOG_PHASE_G.toFixed(2)};
	float fogPhase = ( 1.0 - fogG * fogG ) / pow( 1.0 + fogG * fogG - 2.0 * fogG * fogCos, 1.5 );
	// fogColor arrives in output (sRGB) space; light adds in linear.
	vec3 fogLinear = sRGBTransferEOTF( vec4( fogColor, 1.0 ) ).rgb + fogSunColor * fogPhase;
	vec3 fogInscatter = sRGBTransferOETF( vec4( min( fogLinear, vec3( 1.0 ) ), 1.0 ) ).rgb;
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogInscatter, fogFactor );
#endif`;

let installed = false;

/** Replaces three's fog chunks. Call before the first render. */
export function installHeightFog(): void {
  if (installed) return;
  installed = true;
  THREE.ShaderChunk.fog_pars_vertex = PARS_VERTEX;
  THREE.ShaderChunk.fog_vertex = VERTEX;
  THREE.ShaderChunk.fog_pars_fragment = PARS_FRAGMENT;
  THREE.ShaderChunk.fog_fragment = FRAGMENT;
  for (const shader of Object.values(THREE.ShaderLib)) {
    Object.assign(shader.uniforms, heightFogUniforms);
  }
}
