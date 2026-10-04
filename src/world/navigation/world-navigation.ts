import * as THREE from "three";
import { STUDIO_ISLAND_BOUND, studioGroundHeight } from "../studio/island";
import { STUDIO_STATIONS, type StudioObjectId } from "../studio/stations";

export type ZoomRange = "ground" | "local" | "district" | "regional" | "world";
export type NavigationTool = "pan" | "orbit";

export interface ZoomRangeConfig {
  name: ZoomRange;
  min: number;
  max: number;
  defaultDistance: number;
  label: string;
}

/**
 * Orbit radii for the expanded 100 m main island and companion islets at
 * approximately 112 m. Local views stay human-scale; regional and world views
 * provide enough distance to frame the new rim and orbital lanes.
 */
export const ZOOM_RANGES: Record<ZoomRange, ZoomRangeConfig> = {
  ground: { name: "ground", min: 6, max: 14, defaultDistance: 10, label: "Ground" },
  local: { name: "local", min: 14, max: 30, defaultDistance: 22, label: "Local" },
  district: { name: "district", min: 30, max: 110, defaultDistance: 80, label: "District" },
  regional: { name: "regional", min: 110, max: 230, defaultDistance: 160, label: "Regional" },
  world: { name: "world", min: 230, max: 650, defaultDistance: 350, label: "World" },
};

export const ORDERED_ZOOM_RANGES: ZoomRange[] = [
  "ground",
  "local",
  "district",
  "regional",
  "world",
];

export interface PersistedNavState {
  hasEntered: boolean;
  target: { x: number; y: number; z: number };
  spherical: { theta: number; phi: number; radius: number };
  zoomRange: ZoomRange;
  activeTool: NavigationTool;
  perspective?: CameraPerspective;
  timestamp: number;
}

// v4: the island and framing grew; v3 states hold obsolete camera radii.

const STORAGE_KEY = "orra_world_navigation_state_v4";

export type CameraPerspective = "oblique" | "office" | "boardroom" | "solarium" | "tech-lab" | "power-grid" | "overhead" | "horizon" | "satellite";

/** The studio portal's overview pivot: the centre of the main office floor. */
const ISLAND_CENTER = { x: -2.6, y: 0.8, z: 1.4 };

/** A landmark framing taken from the portal registry's designed focus shot. */
function stationPerspective(id: StudioObjectId) {
  const station = STUDIO_STATIONS[id];
  const [tx, ty, tz] = station.focusCameraTarget ?? station.worldPosition;
  const [px, py, pz] = station.focusCameraPosition ?? [tx + 10, ty + 10, tz + 10];
  const dx = px - tx;
  const dy = py - ty;
  const dz = pz - tz;
  const radius = Math.hypot(dx, dy, dz);
  return {
    target: { x: tx, y: ty, z: tz },
    theta: Math.atan2(dx, dz),
    phi: Math.acos(dy / radius),
    radius,
    label: station.label,
  };
}

export const PERSPECTIVE_CONFIGS: Record<
  CameraPerspective,
  {
    target?: { x: number; y: number; z: number };
    theta: number;
    phi: number;
    radius: number;
    label: string;
  }
> = {
  oblique: {
    target: ISLAND_CENTER,
    theta: Math.PI * 0.25, // the studio's isometric diagonal
    phi: (48 * Math.PI) / 180, // restored classic three-quarter camera pitch
    radius: 150,
    label: "3/4 Oblique",
  },
  office: stationPerspective("command-desk"),
  boardroom: stationPerspective("boardroom"),
  solarium: stationPerspective("talent-desk"),
  "tech-lab": stationPerspective("advanced-tech-lab"),
  "power-grid": stationPerspective("power-grid"),
  overhead: {
    target: ISLAND_CENTER,
    theta: 0.0,
    phi: (24 * Math.PI) / 180,
    radius: 350,
    label: "Overhead",
  },
  satellite: {
    target: { x: 25, y: 15, z: 25 },
    theta: Math.PI * 0.35,
    phi: (68 * Math.PI) / 180,
    radius: 250,
    label: "Orbital Fleet",
  },
  horizon: {
    target: ISLAND_CENTER,
    theta: Math.PI * 0.5,
    phi: (74 * Math.PI) / 180,
    radius: 90,
    label: "Eye-Level",
  },
};

export const ORDERED_PERSPECTIVES: CameraPerspective[] = [
  "oblique",
  "office",
  "boardroom",
  "overhead",
  "horizon",
  "satellite",
];

// 3/4 Oblique default: frames the whole studio island floating in space.
export const DEFAULT_THREE_QUARTER = PERSPECTIVE_CONFIGS.oblique;

// Constrained pitch bounds: 18° downward to 82° pitch
// Keeps camera strictly above the horizon so it never dives below terrain or penetrates the island's hollow interior
export const PITCH_BOUNDS = {
  min: (18 * Math.PI) / 180, // ~0.31 rad (high top-down overview)
  max: (82 * Math.PI) / 180, // ~1.43 rad (82°, strictly above horizontal)
};

export class WorldNavigationController {
  /** The look target stays over the island; beyond it there is only space. */
  public static readonly MAX_TARGET_RADIUS = STUDIO_ISLAND_BOUND;
  /** Look target never sits below this height above the plateau (desk height). */
  public static readonly TARGET_GROUND_CLEARANCE = 0.8;
  /** Camera never drops below standing eye height over the plateau. */
  public static readonly CAMERA_GROUND_CLEARANCE = 1.6;

  // Focus / orbit target
  public currentTarget = new THREE.Vector3(ISLAND_CENTER.x, ISLAND_CENTER.y, ISLAND_CENTER.z);
  public desiredTarget = new THREE.Vector3(ISLAND_CENTER.x, ISLAND_CENTER.y, ISLAND_CENTER.z);

  // Spherical camera coordinates relative to target
  public currentSpherical = {
    theta: DEFAULT_THREE_QUARTER.theta,
    phi: DEFAULT_THREE_QUARTER.phi,
    radius: DEFAULT_THREE_QUARTER.radius,
  };
  public desiredSpherical = {
    theta: DEFAULT_THREE_QUARTER.theta,
    phi: DEFAULT_THREE_QUARTER.phi,
    radius: DEFAULT_THREE_QUARTER.radius,
  };

  // Inertial velocities for smooth short acceleration/deceleration
  private panVelocity = new THREE.Vector3(0, 0, 0);
  private orbitVelocity = { theta: 0, phi: 0 };
  private zoomVelocity = 0;

  // Active interaction tool
  public activeTool: NavigationTool = "pan";

  // Reusable vectors for camera matrix math
  private camForward = new THREE.Vector3();
  private camRight = new THREE.Vector3();
  private computedCamPos = new THREE.Vector3();

  private saveTimeout: ReturnType<typeof setTimeout> | null = null;

  /**
   * Debounced save to persist world view state across page refreshes
   */
  public scheduleSaveState(delayMs = 250): void {
    if (typeof window === "undefined") return;
    if (this.saveTimeout !== null) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveState(true);
      this.saveTimeout = null;
    }, delayMs);
  }

  constructor() {
    this.restoreState();
  }

  /**
   * Direct Manipulation Panning:
   * Drag left -> world follows left.
   * Drag up -> world follows up.
   * Drag down -> world follows down.
   * Pan speed scales proportionally with distance/radius so controls feel identical at all zoom levels.
   */
  public pan(deltaX: number, deltaY: number, viewportHeight = 800): void {
    // Project camera look angle on ground plane (XZ)
    const sinTheta = Math.sin(this.currentSpherical.theta);
    const cosTheta = Math.cos(this.currentSpherical.theta);

    // Forward direction on XZ plane
    this.camForward.set(-sinTheta, 0, -cosTheta).normalize();
    // Right direction on XZ plane
    this.camRight.set(cosTheta, 0, -sinTheta).normalize();

    // Scale displacement to match viewport screen pixels to ground meters:
    const metersPerPixel = (this.currentSpherical.radius * 0.9) / Math.max(300, viewportHeight);

    // Drag navigation:
    // Dragging down (deltaY > 0) advances forward into the scene (+camForward)
    // Dragging up (deltaY < 0) retreats backward (-camForward)
    // Dragging right moves view left (tracks finger across terrain: -camRight)
    // Dragging left moves view right (+camRight)
    const moveX = -deltaX * metersPerPixel;
    const moveZ = deltaY * metersPerPixel;

    const displacement = new THREE.Vector3()
      .addScaledVector(this.camRight, moveX)
      .addScaledVector(this.camForward, moveZ);

    this.desiredTarget.add(displacement);

    const targetDist = Math.hypot(this.desiredTarget.x, this.desiredTarget.z);
    const MAX_TARGET_RADIUS = WorldNavigationController.MAX_TARGET_RADIUS;
    if (targetDist > MAX_TARGET_RADIUS) {
      const scale = MAX_TARGET_RADIUS / targetDist;
      this.desiredTarget.x *= scale;
      this.desiredTarget.z *= scale;
    }

    // Add controlled momentum velocity (short acceleration/deceleration)
    this.panVelocity.copy(displacement).multiplyScalar(0.4);
    this.scheduleSaveState();
  }

  /**
   * Orbit around current focus target with natural drag direction and constrained pitch.
   * Dragging up tilts view up; dragging down tilts view down.
   */
  public orbit(deltaX: number, deltaY: number): void {
    const sensX = 0.005;
    const sensY = 0.004;

    this.desiredSpherical.theta -= deltaX * sensX;
    this.desiredSpherical.phi = Math.max(
      PITCH_BOUNDS.min,
      Math.min(PITCH_BOUNDS.max, this.desiredSpherical.phi - deltaY * sensY)
    );

    this.orbitVelocity.theta = -deltaX * sensX * 0.35;
    this.orbitVelocity.phi = -deltaY * sensY * 0.35;
    this.scheduleSaveState();
  }

  /**
   * Smooth zoom using exponential scale factor to feel natural across all ranges.
   */
  public zoom(deltaY: number): void {
    const zoomFactor = Math.exp(deltaY * 0.0012);
    const minRadius = ZOOM_RANGES.ground.min;
    const maxRadius = ZOOM_RANGES.world.max;

    this.desiredSpherical.radius = Math.max(
      minRadius,
      Math.min(maxRadius, this.desiredSpherical.radius * zoomFactor)
    );

    this.zoomVelocity = (this.desiredSpherical.radius * (zoomFactor - 1)) * 0.2;
    this.scheduleSaveState();
  }

  /**
   * Discrete step zoom between the 5 behavioral ranges.
   */
  public stepZoom(direction: "in" | "out"): void {
    const currentRange = this.getCurrentZoomRange();
    const currentIndex = ORDERED_ZOOM_RANGES.indexOf(currentRange);

    let nextIndex = currentIndex;
    if (direction === "in" && currentIndex > 0) {
      nextIndex = currentIndex - 1;
    } else if (direction === "out" && currentIndex < ORDERED_ZOOM_RANGES.length - 1) {
      nextIndex = currentIndex + 1;
    }

    const targetRange = ORDERED_ZOOM_RANGES[nextIndex];
    this.desiredSpherical.radius = ZOOM_RANGES[targetRange].defaultDistance;
    this.scheduleSaveState();
  }

  /**
   * Directly configures spherical camera coordinates around target with optional immediacy.
   */
  public setSpherical(
    spherical: Partial<{ theta: number; phi: number; radius: number }>,
    immediate = false
  ): void {
    if (spherical.theta !== undefined) {
      this.desiredSpherical.theta = spherical.theta;
      if (immediate) this.currentSpherical.theta = spherical.theta;
    }
    if (spherical.phi !== undefined) {
      this.desiredSpherical.phi = Math.max(
        PITCH_BOUNDS.min,
        Math.min(PITCH_BOUNDS.max, spherical.phi)
      );
      if (immediate) this.currentSpherical.phi = this.desiredSpherical.phi;
    }
    if (spherical.radius !== undefined) {
      this.desiredSpherical.radius = spherical.radius;
      if (immediate) this.currentSpherical.radius = spherical.radius;
    }
    this.scheduleSaveState();
  }

  /**
   * Directly configures look target with optional immediacy.
   */
  public setTarget(
    target: Partial<{ x: number; y: number; z: number }>,
    immediate = false
  ): void {
    if (target.x !== undefined) {
      this.desiredTarget.x = target.x;
      if (immediate) this.currentTarget.x = target.x;
    }
    if (target.y !== undefined) {
      this.desiredTarget.y = target.y;
      if (immediate) this.currentTarget.y = target.y;
    }
    if (target.z !== undefined) {
      this.desiredTarget.z = target.z;
      if (immediate) this.currentTarget.z = target.z;
    }
    this.scheduleSaveState();
  }

  public activePerspective: CameraPerspective = "oblique";

  /**
   * Directly configures one of the designed camera perspectives.
   */
  public setPerspective(preset: CameraPerspective, immediate = false): void {
    const cfg = PERSPECTIVE_CONFIGS[preset];
    if (!cfg) return;
    this.activePerspective = preset;
    if (cfg.target) {
      this.desiredTarget.set(cfg.target.x, cfg.target.y, cfg.target.z);
      if (immediate) this.currentTarget.copy(this.desiredTarget);
    }
    this.desiredSpherical.theta = cfg.theta;
    this.desiredSpherical.phi = cfg.phi;
    this.desiredSpherical.radius = cfg.radius;
    if (immediate) {
      this.currentSpherical.theta = cfg.theta;
      this.currentSpherical.phi = cfg.phi;
      this.currentSpherical.radius = cfg.radius;
    }
    this.scheduleSaveState();
  }

  /**
   * Cycles cleanly through standard perspectives: 3/4 Oblique -> Overhead -> Eye-Level.
   */
  public cyclePerspective(): CameraPerspective {
    const idx = ORDERED_PERSPECTIVES.indexOf(this.activePerspective);
    const nextIdx = (idx + 1) % ORDERED_PERSPECTIVES.length;
    const nextPreset = ORDERED_PERSPECTIVES[nextIdx];
    this.setPerspective(nextPreset);
    return nextPreset;
  }

  /**
   * Resets camera smoothly to the designed 3/4 oblique view (45° pitch, 45° azimuth, Local range).
   */
  public setThreeQuarterView(): void {
    this.setPerspective("oblique");
  }

  /**
   * Smoothly glides the focus target to a specific world location (e.g. double-click raycast).
   */
  public focusAt(point: THREE.Vector3): void {
    this.desiredTarget.copy(point);
    this.scheduleSaveState();
  }

  /**
   * Glides to a designed framing: look at `target` from `position`. Used for
   * studio stations, whose focus framings come from the portal registry.
   */
  public focusFrom(position: THREE.Vector3, target: THREE.Vector3): void {
    const offset = position.clone().sub(target);
    const radius = offset.length();
    this.desiredTarget.copy(target);
    this.desiredSpherical.radius = THREE.MathUtils.clamp(radius, ZOOM_RANGES.ground.min, ZOOM_RANGES.world.max);
    this.desiredSpherical.theta = Math.atan2(offset.x, offset.z);
    this.desiredSpherical.phi = THREE.MathUtils.clamp(
      Math.acos(THREE.MathUtils.clamp(offset.y / Math.max(radius, 1e-6), -1, 1)),
      PITCH_BOUNDS.min,
      PITCH_BOUNDS.max
    );
    this.scheduleSaveState();
  }

  /**
   * Evaluates current active behavioral zoom range.
   */
  public getCurrentZoomRange(): ZoomRange {
    const r = this.currentSpherical.radius;
    for (const key of ORDERED_ZOOM_RANGES) {
      const config = ZOOM_RANGES[key];
      if (r >= config.min && r <= config.max) {
        return key;
      }
    }
    return r < ZOOM_RANGES.ground.min ? "ground" : "world";
  }

  /**
   * Frame update with critically damped lerp for rotation, target glide, and zoom.
   * Eliminates abrupt snapping and avoids slippery infinite drift.
   */
  public update(dt: number): THREE.Vector3 {
    // 1. Momentum damping (decays smoothly within ~300ms)
    const damping = Math.pow(0.05, dt); // tight deceleration

    this.panVelocity.multiplyScalar(damping);
    this.orbitVelocity.theta *= damping;
    this.orbitVelocity.phi *= damping;
    this.zoomVelocity *= damping;

    // Apply residual momentum to desired positions
    this.desiredTarget.addScaledVector(this.panVelocity, dt * 10);
    const residualDist = Math.hypot(this.desiredTarget.x, this.desiredTarget.z);
    if (residualDist > WorldNavigationController.MAX_TARGET_RADIUS) {
      const scale = WorldNavigationController.MAX_TARGET_RADIUS / residualDist;
      this.desiredTarget.x *= scale;
      this.desiredTarget.z *= scale;
    }
    this.desiredSpherical.theta += this.orbitVelocity.theta * dt * 10;
    this.desiredSpherical.phi = Math.max(
      PITCH_BOUNDS.min,
      Math.min(PITCH_BOUNDS.max, this.desiredSpherical.phi + this.orbitVelocity.phi * dt * 10)
    );

    // 2. Smooth critically damped lerp from current to desired
    const lerpRate = 1 - Math.pow(0.001, dt); // ~10-12 / sec

    this.currentTarget.lerp(this.desiredTarget, lerpRate);
    this.currentSpherical.theta = THREE.MathUtils.lerp(
      this.currentSpherical.theta,
      this.desiredSpherical.theta,
      lerpRate
    );
    this.currentSpherical.phi = THREE.MathUtils.lerp(
      this.currentSpherical.phi,
      this.desiredSpherical.phi,
      lerpRate
    );
    this.currentSpherical.radius = THREE.MathUtils.lerp(
      this.currentSpherical.radius,
      this.desiredSpherical.radius,
      lerpRate
    );

    // 3. Compute 3D Cartesian camera position from spherical coordinates around target.
    // The effective target rides at or above desk height over the plateau
    // (AGENTS.md 8.8.1).
    const targetGroundH = studioGroundHeight(this.currentTarget.x, this.currentTarget.z);
    const effectiveTargetY =
      targetGroundH === null
        ? this.currentTarget.y
        : Math.max(this.currentTarget.y, targetGroundH + WorldNavigationController.TARGET_GROUND_CLEARANCE);

    const sinPhi = Math.sin(this.currentSpherical.phi);
    const cosPhi = Math.cos(this.currentSpherical.phi);
    const sinTheta = Math.sin(this.currentSpherical.theta);
    const cosTheta = Math.cos(this.currentSpherical.theta);

    const x = this.currentTarget.x + this.currentSpherical.radius * sinPhi * sinTheta;
    let y = effectiveTargetY + this.currentSpherical.radius * cosPhi;
    const z = this.currentTarget.z + this.currentSpherical.radius * sinPhi * cosTheta;

    // 4. Ground clearance: over the plateau the camera stays at eye height or above.
    const camGroundH = studioGroundHeight(x, z);
    if (camGroundH !== null) {
      y = Math.max(y, camGroundH + WorldNavigationController.CAMERA_GROUND_CLEARANCE);
    }

    this.computedCamPos.set(x, y, z);
    return this.computedCamPos;
  }

  /**
   * Persistence: save world view state to localStorage
   */
  public saveState(hasEntered = true): void {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      const state: PersistedNavState = {
        hasEntered,
        target: {
          x: Math.round(this.desiredTarget.x * 10) / 10,
          y: Math.round(this.desiredTarget.y * 10) / 10,
          z: Math.round(this.desiredTarget.z * 10) / 10,
        },
        spherical: {
          theta: Math.round(this.desiredSpherical.theta * 100) / 100,
          phi: Math.round(this.desiredSpherical.phi * 100) / 100,
          radius: Math.round(this.desiredSpherical.radius * 10) / 10,
        },
        zoomRange: this.getCurrentZoomRange(),
        activeTool: this.activeTool,
        perspective: this.activePerspective,
        timestamp: Date.now(),
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage unavailable or quota exceeded
    }
  }

  /**
   * Persistence: restore world view state from localStorage
   */
  public restoreState(): PersistedNavState | null {
    if (typeof window === "undefined" || !window.localStorage) return null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const state = JSON.parse(raw) as PersistedNavState;

      if (state && state.target && state.spherical) {
        // Retired outer-void landmarks must not restore the camera into empty space.
        if (
          (state.perspective && !ORDERED_PERSPECTIVES.includes(state.perspective)) ||
          Math.hypot(state.target.x, state.target.z) > WorldNavigationController.MAX_TARGET_RADIUS ||
          state.spherical.radius > ZOOM_RANGES.world.max
        ) {
          state.target = { ...PERSPECTIVE_CONFIGS.oblique.target! };
          state.spherical = {
            theta: PERSPECTIVE_CONFIGS.oblique.theta,
            phi: PERSPECTIVE_CONFIGS.oblique.phi,
            radius: PERSPECTIVE_CONFIGS.oblique.radius,
          };
          state.perspective = "oblique";
          state.zoomRange = "district";
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        }
        this.currentTarget.set(state.target.x, state.target.y, state.target.z);
        this.desiredTarget.set(state.target.x, state.target.y, state.target.z);

        this.currentSpherical = { ...state.spherical };
        this.desiredSpherical = { ...state.spherical };

        if (state.perspective) {
          this.activePerspective = state.perspective;
        }
        if (state.activeTool) {
          this.activeTool = state.activeTool;
        }
        return state;
      }
    } catch {
      // Invalid persisted state
    }
    return null;
  }

  /**
   * Persistence: clear stored view (e.g. on explicit "Return to Entry")
   */
  public clearState(): void {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage unavailable
    }
  }

  public resetView(animated = true): void {
    this.setThreeQuarterView();
    if (!animated) {
      this.currentTarget.copy(this.desiredTarget);
      this.currentSpherical = { ...this.desiredSpherical };
    }
  }

  public resetToDefault(): void {
    this.resetView(false);
  }
}
