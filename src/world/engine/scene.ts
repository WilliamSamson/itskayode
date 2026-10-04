/**
 * ORRA — A Living World
 * =====================
 * Copyright (c) 2026 Kayode. All rights reserved.
 *
 * Authoritative 3D Scene Orchestration, WebGL Render Pipeline,
 * and Environmental Simulation Controller.
 *
 * The world is the studio island (src/world/studio) floating in ORRA's cosmic
 * space. ORRA owns everything above and around it: sun, sky, fog, clouds,
 * rain, god rays, asteroids and world time (AGENTS.md 8.12.1).
 */

import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import {
  WorldNavigationController,
  CameraPerspective,
} from "../navigation/world-navigation";
import {
  WeatherStateManager,
  WeatherPresetName,
  WeatherWorldState,
  WEATHER_PRESETS,
} from "../weather/weather-world-state";
import { WeatherSystem } from "../weather/weather-system";
import { LivingRainEngine } from "../weather/living-rain-engine";
import { WorldClock, type WorldTime, REAL_SECONDS_PER_DAY } from "../life/world-clock";
import { resolveClimateWeather } from "../life/climate-weather";
import { CameraRainRenderer } from "../weather/camera-rain-renderer";
import { RainPhase, LivingRainTelemetry } from "../weather/living-rain-types";
import { CelestialSystem, type CelestialLightingState } from "../environment/celestial-system";
import { PerformanceProfile, type RenderProfile } from "./performance-profile";
import { SpaceEnvironment } from "../space/space-environment";
import { WORLD_SCALE } from "./world-scale";
import { LightPool } from "./light-pool";
import { STUDIO_ISLAND_BOUND } from "../studio/island";
import { buildStudioWorld, type WorldObjects, type StudioLightId } from "../studio/studio-world";
import { resetRand } from "../studio/rand";
import { STUDIO_STATIONS, type StudioObjectId } from "../studio/stations";
import { hash01 } from "../math/hash";

export type { WeatherPresetName, WeatherWorldState, RainPhase, LivingRainTelemetry, CelestialLightingState };
export { WEATHER_PRESETS };

export type OrraPhase =
  | "ready"
  | "forming terrain"
  | "placing structures"
  | "synthesizing atmosphere";

/**
 * 10 Environmental Color Tokens:
 * Sunrise coral #FF6B4A, solar yellow #FFD84D, hot amber #FFB21A, crimson #8D2635,
 * violet #7654A8, mountain blue #46577C, emerald #1F6B45, moss #607A3A,
 * ochre #C68B2C, burnt orange #C9572E.
 */
export const ORRA_COLORS = {
  sunriseCoral: 0xff6b4a,
  solarYellow: 0xffd84d,
  hotAmber: 0xffb21a,
  crimson: 0x8d2635,
  violet: 0x7654a8,
  mountainBlue: 0x46577c,
  emerald: 0x1f6b45,
  moss: 0x607a3a,
  ochre: 0xc68b2c,
  burntOrange: 0xc9572e,
} as const;

/** Live renderer readouts for the engine drawer. */
export interface RenderStats {
  fps: number;
  frameTimeMs: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  /** Grass clumps planted on the island, counted from the built scene. */
  grassClumps: number;
  /** Farthest horizontal reach of the main landmass from the island centre, in metres. */
  islandReach: number;
  cameraPosition: { x: number; y: number; z: number };
}

export class OrraScene {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer | null = null;
  private animId: number | null = null;
  private performanceProfile: PerformanceProfile | null = null;
  private activeRenderProfile: RenderProfile | null = null;
  private envTarget: THREE.WebGLRenderTarget | null = null;

  // Camera States
  public mode: "establishing" | "transitioning" | "interactive" = "establishing";
  public worldTheme: "dark" | "light" = "dark";
  public spaceEnvironment: SpaceEnvironment | null = null;
  private transitionStart = 0;
  private transitionDuration = 2400; // ms for cinematic pull-back trajectory

  // Establishing shot: a low three-quarter view across the south lawn toward
  // the office, with the companion islets and asteroid lane behind it.
  private readonly establishingPos = new THREE.Vector3(155, 120, 300);
  private readonly establishingTarget = new THREE.Vector3(-4, 1, -6);

  // Dynamic establishing state for responsive aspect ratios (portrait mobile to ultrawide)
  public currentEstablishingPos = this.establishingPos.clone();
  public currentEstablishingTarget = this.establishingTarget.clone();

  // Quadratic Bezier transition waypoints
  private transitionStartPos = new THREE.Vector3();
  private transitionStartTarget = new THREE.Vector3();
  private transitionApexPos = new THREE.Vector3();
  private transitionApexTarget = new THREE.Vector3();
  private transitionEndPos = new THREE.Vector3();
  private transitionEndTarget = new THREE.Vector3();

  /** The studio island. Built into its own group so it can be raycast and disposed as one. */
  public readonly studioRoot = new THREE.Group();
  public studio: WorldObjects | null = null;
  private focusedStation: StudioObjectId | null = null;

  private dirLight: THREE.DirectionalLight | null = null;
  /** The studio's shadow-casting room spots. Each one is a full extra shadow pass. */
  private lightPool: LightPool | null = null;
  private islandFacts = { grassClumps: 0, islandReach: 0 };
  private shadowSunDir = new THREE.Vector3();
  private shadowTarget = new THREE.Vector3(Infinity, Infinity, Infinity);
  private prevLookTarget = new THREE.Vector3();
  private lastTargetMoveMs = 0;
  private ambientLight: THREE.AmbientLight | null = null;
  private hemiLight: THREE.HemisphereLight | null = null;

  public weatherManager = new WeatherStateManager("clear");
  public weatherSystem: WeatherSystem | null = null;
  public livingRainEngine = new LivingRainEngine("pressure_change");
  public cameraRainRenderer: CameraRainRenderer | null = null;

  /** Authority for world time: seasons and day/night. */
  public worldClock = new WorldClock();
  /** When true, the season chooses the weather. Manual selection suspends it. */
  private climateWeatherEnabled = true;

  /** Authority for celestial solar orbit and diurnal lighting. */
  public celestialSystem = new CelestialSystem();
  /** Cached live celestial state. */
  public celestialState: CelestialLightingState | null = null;

  /**
   * Inversion ceiling, in metres. The office roofline sits at ~4.3 m, so a
   * 20 m ceiling pools fog around the buildings; the default overview camera
   * (~34 m up) sits in the thinning band, and climbing higher breaks out into
   * clear air with the island floating in its own cloud.
   */
  public static readonly FOG_INVERSION_TOP = 20;
  /** Altitude band over which the inversion thins out rather than cutting off. */
  public static readonly FOG_INVERSION_FALLOFF = 30;
  /** Sun placement distance from the look target; only its direction matters for light. */
  private static readonly SUN_DISTANCE = 90;
  /**
   * Lift the scaled cloud deck in proportion to the expanded orbital bound so
   * it clears the regional overview camera instead of covering the new rim.
   */
  private static readonly CLOUD_LIFT = STUDIO_ISLAND_BOUND * 0.72;
  private static readonly LIGHTNING_FOG = new THREE.Color(0xbdd5f0);
  /** Shadows re-render only when the sun or the view has moved this much. */
  private static readonly SHADOW_SUN_EPSILON = Math.cos((1.0 * Math.PI) / 180);
  private static readonly SHADOW_TARGET_EPSILON = 0.5;
  /**
   * What each quality tier spends besides pixels. Pixel ratio and shadows alone
   * cannot recover frames on GPUs that are geometry- or CPU-bound, so the tiers
   * also scale grass detail and asteroid update rate. Light count stays fixed:
   * changing it recompiles every material, a multi-second hitch on the very
   * devices that just dropped a tier.
   */
  private static readonly QUALITY_BUDGETS = {
    high: { grassFar: 26, grassCull: 105, asteroidStride: 2 },
    balanced: { grassFar: 16, grassCull: 75, asteroidStride: 4 },
    low: { grassFar: 10, grassCull: 48, asteroidStride: 8 },
  } as const;
  /** Stillness before a moved view re-renders its shadows. */
  private static readonly SHADOW_SETTLE_MS = 150;
  /** Re-render mid-move once the target has drifted this far toward the map edge. */
  private static readonly SHADOW_EDGE_FRACTION = 0.4;

  /**
   * Fog range for an effective visibility and camera orbit radius.
   *
   * Crisp near field: nothing closer than 12 m is veiled, so the desks and
   * glass in front of you keep their colour. Dense fog closes inside the far
   * rim (the island is ~53 m in radius, so from the default 58 m orbit the far
   * edge is ~110 m away); clear air reaches past the stars. Near eases in with
   * smoothstep; far uses a power curve because extinction falls off faster
   * than linearly (AGENTS.md 8.12.2).
   *
   * The exponent is measured, not inherited. At the 58 m default orbit:
   *   pow 2.2 (the 5 km world's value): fog 180 / rain 769 / clear 3000 m
   *   pow 3.2:                          fog  98 / rain 436 / clear 3000 m
   * 2.2 never closes inside the ~111 m far rim, so fog could not dissolve it.
   */
  public static fogRange(visibility: number, radius: number): { near: number; far: number } {
    const FOG_NEAR_DENSE = 12;
    const FOG_NEAR_CLEAR = 600;
    const FOG_FAR_DENSE = 75;
    const FOG_FAR_CLEAR = 3000;
    const vis = THREE.MathUtils.clamp(visibility, 0, 1);
    const visEase = vis * vis * (3 - 2 * vis);
    const visFar = Math.pow(vis, 3.2);
    return {
      near: THREE.MathUtils.lerp(FOG_NEAR_DENSE, FOG_NEAR_CLEAR, visEase),
      far: THREE.MathUtils.lerp(
        Math.max(FOG_FAR_DENSE, radius * 0.9),
        Math.max(FOG_FAR_CLEAR, radius + 300),
        visFar
      ),
    };
  }

  public nav = new WorldNavigationController();
  public isReady = false;
  private raycaster = new THREE.Raycaster();
  private mouseCoords = new THREE.Vector2();
  private container: HTMLElement | null = null;

  private startTime = performance.now();
  private lastTime = performance.now();
  private frameMsEma = 16.6;
  private lastRenderInfo = { calls: 0, triangles: 0 };
  private lastShadowUpdateMs = 0;
  private lastClockMs: number | null = null;

  /** Reused so per-frame updates do not allocate. */
  private tmpFogColor = new THREE.Color();
  private tmpSimPos = new THREE.Vector3();
  private tmpLookTarget = new THREE.Vector3();
  private tmpSunDir = new THREE.Vector3();

  constructor(width: number, height: number) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    this.scene.fog = new THREE.Fog(0x020106, 600, 3000);

    const aspect = width / height;
    // Far plane clears the scaled starfield (~0.8 km) from the widest orbit.
    this.camera = new THREE.PerspectiveCamera(34, aspect, 0.5, 2500);
    this.updateCameraFraming(aspect);

    // An entered session restored from persistence frames the saved target
    // directly, so the camera does not flash the establishing shot.
    const restored = this.nav.restoreState();
    if (restored && restored.hasEntered) {
      this.mode = "interactive";
      const savedPos = this.nav.update(0);
      this.camera.position.copy(savedPos);
      this.camera.lookAt(this.nav.currentTarget);
    } else {
      this.camera.position.copy(this.currentEstablishingPos);
      this.camera.lookAt(this.currentEstablishingTarget);
    }
  }

  /**
   * Narrow and portrait windows widen the lens and pull back along the view
   * axis so the whole island stays in frame (aspect < 1.6 down to ~0.56).
   */
  public updateCameraFraming(aspect: number) {
    if (this.mode !== "establishing") return;

    const factor = aspect < 1.6 ? Math.min(1.0, Math.max(0, (1.6 - aspect) / 1.05)) : 0;
    this.camera.fov = 34 + factor * 14;
    this.currentEstablishingTarget.copy(this.establishingTarget);
    this.currentEstablishingPos
      .copy(this.establishingPos)
      .sub(this.establishingTarget)
      .multiplyScalar(1 + factor * 0.35)
      .add(this.establishingTarget);
    this.camera.updateProjectionMatrix();
  }

  public setupRenderer(container: HTMLDivElement, width: number, height: number) {
    this.container = container;
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      logarithmicDepthBuffer: false,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    // Start conservatively on touch / integrated-graphics devices. Quality can
    // rise only after sustained headroom, never during a movement hitch.
    this.performanceProfile = new PerformanceProfile(width);
    this.activeRenderProfile = this.performanceProfile.current();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.activeRenderProfile.pixelRatio));

    // Throttled shadow updates and ACES tone mapping
    renderer.shadowMap.enabled = this.activeRenderProfile.shadows;
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.78;

    // Image-based lighting: without an environment the studio's glass
    // partitions render flat and its metals have nothing to reflect.
    const pmrem = new THREE.PMREMGenerator(renderer);
    this.envTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = this.envTarget.texture;
    this.scene.environmentIntensity = 0.40;
    pmrem.dispose();

    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.top = "0";
    renderer.domElement.style.left = "0";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";

    // Clean any previous canvas elements to avoid stacking during HMR / Fast Refresh
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    container.appendChild(renderer.domElement);
    this.renderer = renderer;

    this.startAnimationLoop();
    return renderer;
  }

  public async initializeWorld(onPhase?: (phase: OrraPhase) => void) {
    onPhase?.("forming terrain");
    this.setupLighting();

    onPhase?.("placing structures");
    this.buildStudioIsland();

    onPhase?.("synthesizing atmosphere");
    this.weatherSystem = new WeatherSystem(this.scene, this.weatherManager, WORLD_SCALE, OrraScene.CLOUD_LIFT);
    this.cameraRainRenderer = new CameraRainRenderer(this.livingRainEngine, WORLD_SCALE);
    this.scene.add(this.cameraRainRenderer.rootGroup);
    this.ensureSpaceEnvironment();
    this.applyThemeLighting();

    // Precompile shaders before unveiling world so mobile devices never hitch or display black.
    // Guard with a strict 300ms timeout: Qualcomm Adreno GPUs (Snapdragon in Samsung Galaxy Tab)
    // defer linking until draw/useProgram, causing compileAsync's COMPLETION_STATUS_KHR check to hang indefinitely.
    if (this.renderer) {
      try {
        if (typeof this.renderer.compileAsync === "function") {
          await Promise.race([
            this.renderer.compileAsync(this.scene, this.camera),
            new Promise((resolve) => setTimeout(resolve, 300)),
          ]);
        } else {
          this.renderer.compile(this.scene, this.camera);
        }
      } catch {
        // Safe fallback on constrained mobile GPUs
      }
    }
    this.isReady = true;
    onPhase?.("ready");
  }

  /** The studio builds canvas textures, so it needs a DOM; headless tests skip it. */
  private buildStudioIsland() {
    if (typeof document === "undefined" || this.studio) return;
    resetRand();
    this.studio = buildStudioWorld(this.studioRoot);
    this.scene.add(this.studioRoot);
    const localLights: THREE.Light[] = [];
    this.studioRoot.traverse((o) => {
      if (o instanceof THREE.PointLight || o instanceof THREE.SpotLight) localLights.push(o);
    });
    this.lightPool = new LightPool(this.scene, localLights);
    this.islandFacts = OrraScene.measureIsland(this.studioRoot);
    this.applyRoomSpotShadows();
    this.freezeStaticStudioMatrices();
  }

  /**
   * Freezes transform calculations for static structural elements on the island
   * (foundations, columns, slabs, trusses, glass curtain walls).
   * Dynamic moving parts (fans, pins, LEDs, radar, arc) retain matrixAutoUpdate.
   */
  private freezeStaticStudioMatrices(): void {
    if (!this.studioRoot) return;
    this.studioRoot.updateMatrixWorld(true);
    const dynamicKeywords = ["pin", "led", "fan", "radar", "arc", "centrifuge", "water", "indicator", "door", "bench"];
    this.studioRoot.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        let isDynamic = false;
        let curr: THREE.Object3D | null = obj;
        while (curr && curr !== this.studioRoot) {
          const name = curr.name.toLowerCase();
          if (dynamicKeywords.some((kw) => name.includes(kw))) {
            isDynamic = true;
            break;
          }
          curr = curr.parent;
        }
        if (!isDynamic) {
          obj.matrixAutoUpdate = false;
        }
      }
    });
  }

  private setupLighting() {
    const ambient = new THREE.AmbientLight(ORRA_COLORS.violet, 0.18);
    ambient.layers.set(0); // Island climate never illuminates orbital assets.
    this.ambientLight = ambient;
    this.scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0xe8f3ff, 0x526b48, 0.45);
    hemi.position.set(0, 40, 0);
    hemi.layers.set(0);
    this.hemiLight = hemi;
    this.scene.add(hemi);

    // Key light follows the celestial sun. Sized to the expanded island rim.
    const dirLight = new THREE.DirectionalLight(ORRA_COLORS.solarYellow, 1.4);
    dirLight.position.set(40, 60, -30);
    dirLight.layers.set(0);
    dirLight.castShadow = true;
    const isMobile = this.activeRenderProfile?.quality !== "high";
    const shadowMapSize = isMobile ? 1024 : 2048;
    dirLight.shadow.mapSize.set(shadowMapSize, shadowMapSize);
    dirLight.shadow.camera.near = 1;
    dirLight.shadow.camera.far = OrraScene.SUN_DISTANCE * 2.4;
    const shadowSpan = isMobile ? 85 : 110;
    dirLight.shadow.camera.left = -shadowSpan;
    dirLight.shadow.camera.right = shadowSpan;
    dirLight.shadow.camera.top = shadowSpan;
    dirLight.shadow.camera.bottom = -shadowSpan;
    dirLight.shadow.bias = -0.0005;
    dirLight.shadow.normalBias = 0.02;
    this.dirLight = dirLight;
    this.scene.add(dirLight);
    this.scene.add(dirLight.target);
  }

  private ensureSpaceEnvironment(): void {
    if (this.spaceEnvironment) return;
    this.spaceEnvironment = new SpaceEnvironment();
    // Asteroid lanes and starfield are proportions of the island rim.
    this.spaceEnvironment.rootGroup.scale.setScalar(WORLD_SCALE);
    this.camera.layers.enable(1);
    this.scene.add(this.spaceEnvironment.rootGroup);
  }

  public setWorldTheme(theme: "dark" | "light") {
    this.worldTheme = theme;
    this.applyThemeLighting();
  }

  public toggleWorldTheme(): "dark" | "light" {
    const next = this.worldTheme === "dark" ? "light" : "dark";
    this.setWorldTheme(next);
    return next;
  }

  /** Theme sets the sky fill; the sun itself always comes from the celestial system. */
  private applyThemeLighting() {
    if (this.hemiLight) {
      if (this.worldTheme === "light") {
        this.hemiLight.color.setHex(0xe8f3ff);
        this.hemiLight.groundColor.setHex(0x526b48);
        this.hemiLight.intensity = 0.45;
      } else {
        this.hemiLight.color.setHex(ORRA_COLORS.violet);
        this.hemiLight.groundColor.setHex(ORRA_COLORS.emerald);
        this.hemiLight.intensity = 0.18;
      }
    }
  }

  /**
   * Enter Transition: an aerial Bezier from the establishing shot into the
   * interactive orbit, lifting over the roofline on the way.
   */
  public triggerEnterTransition(onComplete?: () => void) {
    if (this.mode !== "establishing") return;
    this.mode = "transitioning";
    this.transitionStart = performance.now();

    this.transitionStartPos.copy(this.camera.position);
    this.transitionStartTarget.copy(this.currentEstablishingTarget);

    const finalPos = this.nav.update(0);
    this.transitionEndPos.copy(finalPos);
    this.transitionEndTarget.copy(this.nav.currentTarget);

    const midX = (this.transitionStartPos.x + this.transitionEndPos.x) / 2;
    const midZ = (this.transitionStartPos.z + this.transitionEndPos.z) / 2;
    const horizDist = Math.hypot(
      this.transitionEndPos.x - this.transitionStartPos.x,
      this.transitionEndPos.z - this.transitionStartPos.z
    );
    const apexLift = Math.min(40.0, Math.max(8.0, horizDist * 0.3));
    const apexY = Math.max(this.transitionStartPos.y, this.transitionEndPos.y) + apexLift;

    this.transitionApexPos.set(midX, apexY, midZ);
    this.transitionApexTarget.set(
      (this.transitionStartTarget.x + this.transitionEndTarget.x) / 2,
      (this.transitionStartTarget.y + this.transitionEndTarget.y) / 2 + 3.0,
      (this.transitionStartTarget.z + this.transitionEndTarget.z) / 2
    );

    setTimeout(() => {
      this.mode = "interactive";
      this.nav.saveState(true);
      onComplete?.();
    }, this.transitionDuration);
  }

  public enterImmediately(onComplete?: () => void) {
    this.mode = "interactive";
    onComplete?.();
  }

  public getInteractiveCameraPos(): THREE.Vector3 {
    return this.nav.update(0);
  }

  public pan(deltaX: number, deltaY: number) {
    if (this.mode !== "interactive") return;
    this.focusedStation = null;
    const vh = this.container ? this.container.clientHeight : 800;
    this.nav.pan(deltaX, deltaY, vh);
  }

  public orbit(deltaX: number, deltaY: number) {
    if (this.mode !== "interactive") return;
    this.nav.orbit(deltaX, deltaY);
  }

  public zoom(deltaY: number) {
    if (this.mode !== "interactive") return;
    this.nav.zoom(deltaY);
  }

  public stepZoom = (direction: "in" | "out") => {
    this.nav.stepZoom(direction);
  };

  public setThreeQuarterView = () => {
    this.focusedStation = null;
    this.nav.setThreeQuarterView();
  };

  public setPerspective = (preset: CameraPerspective, immediate = false) => {
    this.focusedStation = null;
    this.nav.setPerspective(preset, immediate);
  };

  public cyclePerspective = (): CameraPerspective => {
    this.focusedStation = null;
    return this.nav.cyclePerspective();
  };

  public resetView = () => {
    this.focusedStation = null;
    this.nav.resetView(true);
  };

  public focusAt = (point: THREE.Vector3) => {
    this.nav.focusAt(point);
  };

  private setPointer(clientX: number, clientY: number, width: number, height: number): boolean {
    if (this.mode !== "interactive" || width <= 0 || height <= 0) return false;
    this.mouseCoords.x = (clientX / width) * 2 - 1;
    this.mouseCoords.y = -(clientY / height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouseCoords, this.camera);
    return true;
  }

  /** The clickable station under a viewport point, if any. Cheap: tests only station meshes. */
  public stationAt(clientX: number, clientY: number, width: number, height: number): StudioObjectId | null {
    if (!this.studio || !this.setPointer(clientX, clientY, width, height)) return null;
    const meshes = Array.from(this.studio.interactiveMeshes.keys());
    const hits = this.raycaster.intersectObjects(meshes, true);
    for (const hit of hits) {
      let obj: THREE.Object3D | null = hit.object;
      while (obj) {
        const id = this.studio.interactiveMeshes.get(obj as THREE.Mesh);
        if (id) return id;
        obj = obj.parent;
      }
    }
    return null;
  }

  /** Control a room or zone's lighting state. */
  public setRoomLightState(id: StudioLightId, isOn: boolean): void {
    this.studio?.setLightState?.(id, isOn);
  }

  public getRoomLightState(id: StudioLightId): boolean {
    return this.studio?.getLightState?.(id) ?? true;
  }

  /** Toggle the high-voltage Jacob's ladder electric arc in the power plant. */
  public togglePowerPlantArc(): boolean {
    return this.studio?.togglePowerPlantArc?.() ?? false;
  }

  public isPowerPlantArcActive(): boolean {
    return this.studio?.isPowerPlantArcActive?.() ?? false;
  }

  /** Set the power plant microgrid generation capacity (0-120 kW). */
  public setPowerPlantLevel(kw: number): void {
    this.studio?.setPowerPlantLevel?.(kw);
  }

  public getPowerPlantLevel(): number {
    return this.studio?.getPowerPlantLevel?.() ?? 100;
  }

  /** Toggle the scientific core upgrade (toroidal plasma pinch + orbital laser beam). */
  public toggleScientificUpgrade(): boolean {
    return this.studio?.toggleScientificUpgrade?.() ?? false;
  }

  public isScientificUpgraded(): boolean {
    return this.studio?.isScientificUpgraded?.() ?? false;
  }

  /** Glides the camera to a station's designed focus framing. */
  public focusStation(id: StudioObjectId): void {
    const station = STUDIO_STATIONS[id];
    if (!station) return;
    if (station.focusCameraPosition && station.focusCameraTarget) {
      this.nav.focusFrom(
        new THREE.Vector3(...station.focusCameraPosition),
        new THREE.Vector3(...station.focusCameraTarget)
      );
    } else {
      this.nav.focusAt(new THREE.Vector3(...station.worldPosition));
    }
    this.focusedStation = id;
  }

  public getFocusedStation(): StudioObjectId | null {
    return this.focusedStation;
  }

  /** Double-click: a station focuses its framing; anything else on the island recentres the orbit there. */
  public raycastAndFocus(clientX: number, clientY: number, width: number, height: number): boolean {
    const station = this.stationAt(clientX, clientY, width, height);
    if (station) {
      this.focusStation(station);
      return true;
    }
    if (!this.setPointer(clientX, clientY, width, height)) return false;
    const hits = this.raycaster.intersectObject(this.studioRoot, true);
    if (hits.length > 0) {
      this.focusedStation = null;
      this.nav.focusAt(hits[0].point);
      return true;
    }
    return false;
  }

  public returnToEntry(onComplete?: () => void) {
    this.mode = "establishing";
    this.focusedStation = null;
    this.nav.clearState();
    this.camera.position.copy(this.currentEstablishingPos);
    this.camera.lookAt(this.currentEstablishingTarget);
    onComplete?.();
  }

  /**
   * The studio portal rendered its shadows once; ORRA's moving sun re-renders
   * them, and every shadow-casting spot adds a full pass over the casters.
   * Pooled spot shadows are kept only at "high" quality.
   */
  private applyRoomSpotShadows(): void {
    const enabled = this.activeRenderProfile?.quality === "high";
    for (const spot of this.lightPool?.spotSlots ?? []) spot.castShadow = enabled;
  }

  private applyRenderProfile(profile: RenderProfile): void {
    if (!this.renderer || !this.container) return;
    this.activeRenderProfile = profile;
    const dpr = Math.min(window.devicePixelRatio, profile.pixelRatio);
    if (this.renderer.getPixelRatio() !== dpr) {
      this.renderer.setPixelRatio(dpr);
    }
    if (this.renderer.shadowMap.enabled !== profile.shadows) {
      this.renderer.shadowMap.enabled = profile.shadows;
      this.renderer.shadowMap.needsUpdate = profile.shadows;
    }
    if (this.dirLight) {
      const shadowSpan = profile.quality === "low" ? 60 : profile.quality === "balanced" ? 85 : 110;
      if (this.dirLight.shadow.camera.right !== shadowSpan) {
        this.dirLight.shadow.camera.left = -shadowSpan;
        this.dirLight.shadow.camera.right = shadowSpan;
        this.dirLight.shadow.camera.top = shadowSpan;
        this.dirLight.shadow.camera.bottom = -shadowSpan;
        this.dirLight.shadow.camera.updateProjectionMatrix();
        this.renderer.shadowMap.needsUpdate = profile.shadows;
      }
    }
    this.applyRoomSpotShadows();
  }

  private updateRenderProfile(averageFrameMs: number, nowMs: number): void {
    const next = this.performanceProfile?.update(averageFrameMs, nowMs);
    if (next) this.applyRenderProfile(next);
  }

  public resize(width: number, height: number) {
    const aspect = width / height;
    this.camera.aspect = aspect;
    this.updateCameraFraming(aspect);
    this.camera.updateProjectionMatrix();
    if (this.renderer) {
      this.renderer.setSize(width, height);
    }
  }

  /**
   * Whether the key-light shadow map should re-render this frame. `drift` is
   * how far the view target is from where the map was last centred;
   * `coverage` is the shadow camera's half-span.
   */
  public static shadowRefreshDue(s: {
    nowMs: number;
    lastShadowMs: number;
    lastMoveMs: number;
    drift: number;
    coverage: number;
    sunMoved: boolean;
    throttleMs: number;
  }): boolean {
    if (s.nowMs - s.lastShadowMs < s.throttleMs) return false;
    if (s.sunMoved) return true;
    if (s.drift <= OrraScene.SHADOW_TARGET_EPSILON) return false;
    const settled = s.nowMs - s.lastMoveMs >= OrraScene.SHADOW_SETTLE_MS;
    return settled || s.drift > s.coverage * OrraScene.SHADOW_EDGE_FRACTION;
  }

  /** Stats the HUD shows about the island itself, measured once from the built scene. */
  public static measureIsland(root: THREE.Object3D): { grassClumps: number; islandReach: number } {
    root.updateMatrixWorld(true);
    let grassClumps = 0;
    root.getObjectByName("volumetric-grass")?.children.forEach((tile) => {
      grassClumps += (tile as THREE.InstancedMesh).count;
    });
    const land = root.getObjectByName("terrace-main-island");
    let islandReach = 0;
    if (land) {
      const box = new THREE.Box3().setFromObject(land);
      islandReach = Math.round(
        Math.max(Math.abs(box.min.x), Math.abs(box.max.x), Math.abs(box.min.z), Math.abs(box.max.z))
      );
    }
    return { grassClumps, islandReach };
  }

  /** Where the camera is looking this frame. */
  private currentLookTarget(out: THREE.Vector3): THREE.Vector3 {
    if (this.mode === "interactive") {
      const minY = WorldNavigationController.TARGET_GROUND_CLEARANCE;
      out.copy(this.nav.currentTarget);
      if (out.y < minY) out.y = minY;
      return out;
    }
    return out.copy(this.currentEstablishingTarget);
  }

  /** Climate chooses the preset unless the visitor has taken manual control (AGENTS.md 8.13.3). */
  private updateClimateWeather(worldTime: WorldTime) {
    if (!this.climateWeatherEnabled) return;
    const want = resolveClimateWeather(
      worldTime.worldSeconds / REAL_SECONDS_PER_DAY,
      worldTime.seasonPhase,
      worldTime.dayFraction
    );
    if (want !== this.weatherManager.activePreset) {
      this.weatherManager.setPreset(want);
    }
  }

  private startAnimationLoop() {
    let ledTick = -1;
    const animate = () => {
      this.animId = requestAnimationFrame(animate);
      const now = performance.now();
      const elapsed = (now - this.startTime) / 1000;
      const dt = Math.min(0.1, (now - this.lastTime) / 1000);
      this.lastTime = now;
      this.frameMsEma = THREE.MathUtils.lerp(this.frameMsEma, dt * 1000, 0.08);

      // 1. World time, climate, weather and sun. The clock gets true elapsed
      // time, not the capped physics dt, so time passes while the tab is hidden.
      this.worldClock.advance((now - (this.lastClockMs ?? now)) / 1000);
      this.lastClockMs = now;
      const worldTime = this.worldClock.getTime();
      this.updateClimateWeather(worldTime);

      this.weatherManager.update(dt);
      const weatherState = this.weatherManager.current;

      const celestialState = this.celestialSystem.update(
        worldTime,
        weatherState,
        weatherState.cloudCoverage,
        this.worldTheme === "dark"
      );
      this.celestialState = celestialState;

      const rainLightning = this.livingRainEngine.getLightningIntensity();
      const lightning = Math.max(this.weatherManager.getLightningIntensity(), rainLightning);

      // 2. Camera orchestration
      if (this.mode === "establishing") {
        // Subtle micro-parallax breath while waiting
        const driftX = Math.sin(elapsed * 0.16) * 0.12;
        const driftY = Math.cos(elapsed * 0.13) * 0.08;
        this.camera.position.set(
          this.currentEstablishingPos.x + driftX,
          this.currentEstablishingPos.y + driftY,
          this.currentEstablishingPos.z
        );
        this.camera.lookAt(this.currentEstablishingTarget);
      } else if (this.mode === "transitioning") {
        const progress = Math.min(1.0, (performance.now() - this.transitionStart) / this.transitionDuration);
        // Quintic smoothstep easing for zero jerk
        const s = progress * progress * progress * (progress * (progress * 6.0 - 15.0) + 10.0);
        const invS = 1.0 - s;
        const w0 = invS * invS;
        const w1 = 2.0 * invS * s;
        const w2 = s * s;
        this.camera.position.set(
          w0 * this.transitionStartPos.x + w1 * this.transitionApexPos.x + w2 * this.transitionEndPos.x,
          w0 * this.transitionStartPos.y + w1 * this.transitionApexPos.y + w2 * this.transitionEndPos.y,
          w0 * this.transitionStartPos.z + w1 * this.transitionApexPos.z + w2 * this.transitionEndPos.z
        );
        this.tmpLookTarget.set(
          w0 * this.transitionStartTarget.x + w1 * this.transitionApexTarget.x + w2 * this.transitionEndTarget.x,
          w0 * this.transitionStartTarget.y + w1 * this.transitionApexTarget.y + w2 * this.transitionEndTarget.y,
          w0 * this.transitionStartTarget.z + w1 * this.transitionApexTarget.z + w2 * this.transitionEndTarget.z
        );
        this.camera.lookAt(this.tmpLookTarget);
      } else {
        this.camera.position.copy(this.nav.update(dt));
        this.camera.lookAt(this.currentLookTarget(this.tmpLookTarget));
      }
      // Mid-flight the look target is the Bezier point computed above.
      const lookTarget =
        this.mode === "transitioning" ? this.tmpLookTarget : this.currentLookTarget(this.tmpLookTarget);

      // 3. Key light: direction from the celestial sun, frustum centred on the view.
      if (this.dirLight) {
        this.tmpSunDir.copy(celestialState.sunDirection).normalize();
        this.dirLight.position.copy(lookTarget).addScaledVector(this.tmpSunDir, OrraScene.SUN_DISTANCE);
        this.dirLight.target.position.copy(lookTarget);
        this.dirLight.target.updateMatrixWorld();
        // The shadow pass re-draws every caster. A stale map stays correct
        // in world space (its matrix is only refreshed when it re-renders), so
        // while the view moves the old map is kept and redrawn once the view
        // settles, or earlier if the target nears the edge of its coverage.
        // The sun moves slowly and is only throttled.
        if (lookTarget.distanceTo(this.prevLookTarget) > 0.01) {
          this.prevLookTarget.copy(lookTarget);
          this.lastTargetMoveMs = now;
        }
        const isMobileOrTablet = this.performanceProfile?.isMobileOrTablet ?? false;
        if (
          this.renderer &&
          OrraScene.shadowRefreshDue({
            nowMs: now,
            lastShadowMs: this.lastShadowUpdateMs,
            lastMoveMs: this.lastTargetMoveMs,
            drift: lookTarget.distanceTo(this.shadowTarget),
            coverage: this.dirLight.shadow.camera.right,
            sunMoved: this.tmpSunDir.dot(this.shadowSunDir) < OrraScene.SHADOW_SUN_EPSILON,
            throttleMs: isMobileOrTablet ? 75 : 40,
          })
        ) {
          this.renderer.shadowMap.needsUpdate = true;
          this.shadowSunDir.copy(this.tmpSunDir);
          this.shadowTarget.copy(lookTarget);
          this.lastShadowUpdateMs = now;
        }
        if (lightning > 0.05) {
          this.dirLight.color.set(0xd8e8ff);
          this.dirLight.intensity = celestialState.sunIntensity * 0.60 + lightning * 3.5;
        } else {
          this.dirLight.color.copy(celestialState.sunColor);
          const sunScale = this.worldTheme === "dark" ? 0.35 : 0.60;
          this.dirLight.intensity = THREE.MathUtils.lerp(
            this.dirLight.intensity,
            celestialState.sunIntensity * sunScale,
            0.2
          );
        }
      }
      if (this.ambientLight) {
        this.ambientLight.color.copy(celestialState.ambientColor);
        const ambScale = this.worldTheme === "dark" ? 0.22 : 0.42;
        const targetAmb = celestialState.ambientIntensity * ambScale + lightning * 1.8;
        this.ambientLight.intensity = THREE.MathUtils.lerp(this.ambientLight.intensity, targetAmb, 0.2);
      }
      // Subtle image-based reflection fill
      const daylight = THREE.MathUtils.clamp(celestialState.sunIntensity / 2.4, 0, 1);
      const targetEnv = this.worldTheme === "dark" ? 0.03 : 0.04 + 0.32 * daylight;
      this.scene.environmentIntensity = THREE.MathUtils.lerp(
        this.scene.environmentIntensity,
        targetEnv,
        Math.min(1, dt * 2)
      );

      // 4. Clouds, rain streaks, splashes and god rays
      if (this.weatherSystem) {
        this.weatherSystem.setSunDirection(this.tmpSunDir.copy(celestialState.sunDirection).normalize());
        this.weatherSystem.update(this.camera, dt, this.worldTheme, this.nav.activePerspective, lookTarget);
      }

      // 5. Living rain. The weather preset is the single authority on
      // precipitation; authority follows the *interpolated* precipitation so
      // rain fades with the transition instead of being cut off. Storm cells
      // live in the engine's calibrated units (engine/world-scale.ts).
      // Liquid rain strictly gates rain engine authority (sandstorm and snow have zero liquid rain).
      const isLiquidRain =
        (weatherState.precipitationType === "rain" ||
          (!weatherState.precipitationType &&
            (this.weatherManager.activePreset === "rain" ||
              this.weatherManager.activePreset === "passing_showers" ||
              this.weatherManager.activePreset === "thunderstorms"))) &&
        weatherState.precipitation > 0.04;

      const rainAuthority = isLiquidRain
        ? THREE.MathUtils.clamp(
            weatherState.precipitation / WEATHER_PRESETS.rain.precipitation,
            0,
            1
          )
        : 0;
      this.livingRainEngine.setAuthority(rainAuthority);
      this.livingRainEngine.update(dt, this.tmpSimPos.copy(this.camera.position).divideScalar(WORLD_SCALE));

      const zoomRadius =
        this.mode === "interactive" ? this.nav.currentSpherical.radius : this.camera.position.distanceTo(lookTarget);
      if (isLiquidRain) {
        this.cameraRainRenderer?.update(this.camera, dt, zoomRadius);
      } else if (this.cameraRainRenderer) {
        this.cameraRainRenderer.rootGroup.visible = false;
        this.cameraRainRenderer.heroMesh.visible = false;
        this.cameraRainRenderer.volumeMesh.visible = false;
        this.cameraRainRenderer.curtainsGroup.visible = false;
      }

      // 6. Studio island: water, room fixtures, station pins, server LEDs
      if (this.studio) {
        this.studio.updateWater?.(now, dt);
        this.studio.updateLighting?.(dt);
        const sec = now * 0.0015;
        this.studio.stationPins.forEach((group, id) => {
          group.position.y = 1.75 + Math.sin(sec + group.position.x) * 0.04;
          group.rotation.y = sec * 0.7;
          group.scale.setScalar(this.focusedStation === id ? 1.25 : 1);
        });
        const tick = Math.floor(now / 400);
        if (tick !== ledTick) {
          ledTick = tick;
          this.studio.serverLeds.forEach((led, i) => {
            led.visible = hash01(tick, i) > 0.3;
          });
        }
      }

      const budget = OrraScene.QUALITY_BUDGETS[this.activeRenderProfile?.quality ?? "balanced"];
      this.studio?.updateGrassLod?.(this.camera.position, budget.grassFar, budget.grassCull);
      if (this.spaceEnvironment) {
        this.spaceEnvironment.updateStride = budget.asteroidStride;
        this.spaceEnvironment.update(dt);
      }

      // Pooled local lights copy the fixture intensities animated above.
      if (this.lightPool) {
        this.lightPool.update(lookTarget, dt);
        if (this.lightPool.spotMoved && this.renderer) {
          this.lightPool.spotMoved = false;
          this.renderer.shadowMap.needsUpdate = true;
        }
      }

      if (this.mode === "interactive") {
        this.updateRenderProfile(this.frameMsEma, now);
      }

      // 7. Atmospheric perspective. Visibility must map monotonically onto the
      // fog range (AGENTS.md 8.12.2); fog pools under an inversion ceiling and
      // clears as the camera climbs above it (8.12.3).
      if (this.scene.fog instanceof THREE.Fog) {
        const rawVis = THREE.MathUtils.clamp(weatherState.visibility, 0, 1);
        const isFogOrSand =
          this.weatherManager.activePreset === "fog" ||
          this.weatherManager.activePreset === "sandstorm" ||
          (weatherState.fogDensity ?? 0) > 0.6;
        const aboveLayer = THREE.MathUtils.clamp(
          (this.camera.position.y - OrraScene.FOG_INVERSION_TOP) / OrraScene.FOG_INVERSION_FALLOFF,
          0,
          1
        );
        // In fog and sandstorm presets, atmospheric density envelops the island even when zooming out;
        // breakout only applies to localized inversion mist in fair weather.
        const breakout = isFogOrSand ? 0 : aboveLayer * aboveLayer * (3 - 2 * aboveLayer);

        // Two incommensurate slow terms keep the air drifting without a visible loop.
        const breath = 1 + Math.sin(elapsed * 0.061) * 0.07 + Math.sin(elapsed * 0.1373 + 1.7) * 0.045;
        const vis = THREE.MathUtils.clamp(THREE.MathUtils.lerp(rawVis / breath, 1.0, breakout * 0.88), 0, 1);

        const target = OrraScene.fogRange(vis, zoomRadius);
        this.scene.fog.near = THREE.MathUtils.lerp(this.scene.fog.near, target.near, 0.08);
        this.scene.fog.far = THREE.MathUtils.lerp(this.scene.fog.far, target.far, 0.08);

        // Colour follows the weather state, never the rain engine's internal
        // phase. Fog is tested first: the fog preset is also heavily clouded.
        const targetFogCol = this.tmpFogColor;
        const isSand =
          weatherState.precipitationType === "sand" || this.weatherManager.activePreset === "sandstorm";
        const isSnow =
          weatherState.precipitationType === "snow" ||
          this.weatherManager.activePreset === "snow" ||
          this.weatherManager.activePreset === "light_snow";
        const isFrost = this.weatherManager.activePreset === "frost";
        const isFoggy =
          (weatherState.fogDensity ?? 0) > 0.5 || (vis < 0.45 && weatherState.precipitation < 0.3);
        const isStorm =
          weatherState.precipitation > 0.4 || this.weatherManager.activePreset === "thunderstorms";
        const isOvercast = weatherState.cloudCoverage > 0.6;

        if (this.worldTheme === "light") {
          if (isSand) targetFogCol.set(0x9a7246);
          else if (isSnow) targetFogCol.set(0xdde8f5);
          else if (isFrost) targetFogCol.set(0xc8def8);
          else if (isFoggy) targetFogCol.set(0xc8d6e4);
          else if (isStorm) targetFogCol.set(0x5c6a7e);
          else if (isOvercast) targetFogCol.set(0x8294ab);
          else targetFogCol.set(0x000000);
        } else {
          // Fog scatters light, so night mist lifts toward grey rather than the void.
          if (isSand) targetFogCol.set(0x362412);
          else if (isSnow) targetFogCol.set(0x1c2436);
          else if (isFrost) targetFogCol.set(0x12182c);
          else if (isFoggy) targetFogCol.set(0x6b7488);
          else if (isStorm) targetFogCol.set(0x121822);
          else if (isOvercast) targetFogCol.set(0x282635);
          else targetFogCol.set(0x020106);
        }

        // Lightning flash spikes fog illumination
        if (lightning > 0.1) {
          targetFogCol.lerp(OrraScene.LIGHTNING_FOG, Math.min(1.0, lightning * 0.85));
        }

        this.scene.fog.color.lerp(targetFogCol, 0.05);
      }

      if (this.renderer) {
        if (!this.isReady && this.mode === "establishing") {
          this.renderer.clear();
        } else {
          this.renderer.render(this.scene, this.camera);
          this.lastRenderInfo.calls = this.renderer.info.render.calls;
          this.lastRenderInfo.triangles = this.renderer.info.render.triangles;
        }
      }
    };
    animate();
  }

  public getRenderStats(): RenderStats {
    const p = this.camera.position;
    return {
      fps: Math.round(1000 / Math.max(1, this.frameMsEma)),
      frameTimeMs: Math.round(this.frameMsEma * 10) / 10,
      drawCalls: this.lastRenderInfo.calls,
      triangles: this.lastRenderInfo.triangles,
      geometries: this.renderer ? this.renderer.info.memory.geometries : 0,
      textures: this.renderer ? this.renderer.info.memory.textures : 0,
      grassClumps: this.islandFacts.grassClumps,
      islandReach: this.islandFacts.islandReach,
      cameraPosition: { x: p.x, y: p.y, z: p.z },
    };
  }

  /** Current world time. Drives the HUD readout. */
  public getWorldTime = (): WorldTime => this.worldClock.getTime();

  /** Steps the time scale preset (1x -> 5x -> 30x -> 120x). Returns the new rate. */
  public cycleTimeScale = (): number => this.worldClock.cycleTimeScale();

  /** Jumps the world forward. Used to inspect seasons without waiting. */
  public skipWorldDays = (days: number): void => this.worldClock.skipDays(days);

  /** Resets world time back to the canonical initial morning and 1x speed. */
  public resetWorldTime = (): void => {
    this.worldClock.resetTime();
  };

  /** Locks simulation back to 1:1 live real time matching the visitor device clock. */
  public syncToLiveTime = (): void => {
    this.worldClock.syncToLive();
  };

  /** Toggles pause state on the world simulation clock. */
  public togglePauseTime = (): boolean => this.worldClock.togglePause();

  /** Sets explicit time scale multiplier. */
  public setTimeScale = (scale: number): void => this.worldClock.setTimeScale(scale);

  /** Scrubs time of day to a dayFraction [0, 1). */
  public scrubWorldTime = (dayFraction: number): void =>
    this.worldClock.scrubToDayFraction(dayFraction);

  /** Scrubs seasonal cycle to seasonPhase [0, 4). */
  public scrubSeasonPhase = (phase: number): void =>
    this.worldClock.scrubToSeasonPhase(phase);

  /** Returns latest celestial lighting telemetry. */
  public getCelestialState = (): CelestialLightingState | null => this.celestialState;

  /**
   * Renders the current composition to a clean postcard data URL
   * (default 1200x630) without HUD elements.
   */
  public captureHighResPreview = (width = 1200, height = 630): string | null => {
    if (!this.renderer || !this.scene || !this.camera) return null;
    const originalSize = new THREE.Vector2();
    this.renderer.getSize(originalSize);
    const originalAspect = this.camera.aspect;

    try {
      this.renderer.setSize(width, height, false);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.render(this.scene, this.camera);
      return this.renderer.domElement.toDataURL("image/png");
    } finally {
      this.renderer.setSize(originalSize.x, originalSize.y, false);
      this.camera.aspect = originalAspect;
      this.camera.updateProjectionMatrix();
    }
  };

  /**
   * Manual weather override. Taking manual control suspends the climate
   * scheduler, otherwise the next spell boundary would silently undo the
   * visitor's choice a few world hours later.
   */
  public setWeatherPreset(preset: WeatherPresetName): void {
    this.climateWeatherEnabled = false;
    this.weatherManager.setPreset(preset);
  }

  /** Hands the sky back to the season. */
  public enableClimateWeather(): void {
    this.climateWeatherEnabled = true;
    this.updateClimateWeather(this.worldClock.getTime());
  }

  /** Explicitly sets climate auto/manual mode. */
  public setClimateWeatherEnabled(enabled: boolean): void {
    this.climateWeatherEnabled = enabled;
    if (enabled) {
      this.updateClimateWeather(this.worldClock.getTime());
    }
  }

  /** Toggles climate auto mode on/off. */
  public toggleClimateWeather = (): boolean => {
    this.climateWeatherEnabled = !this.climateWeatherEnabled;
    if (this.climateWeatherEnabled) {
      this.updateClimateWeather(this.worldClock.getTime());
    }
    return this.climateWeatherEnabled;
  };

  public isClimateWeatherEnabled(): boolean {
    return this.climateWeatherEnabled;
  }

  public getWeatherState(): WeatherWorldState {
    return { ...this.weatherManager.current };
  }

  public getWeatherPresetName(): WeatherPresetName {
    return this.weatherManager.activePreset;
  }

  public getTransitionProgress(): number {
    return this.weatherManager.getTransitionProgress();
  }

  public setRainPhase = (phase: RainPhase): void => {
    this.livingRainEngine.setPhase(phase);
  };

  public setRainPhaseProgress = (progressFraction: number): void => {
    this.livingRainEngine.setPhaseProgress(progressFraction);
  };

  public getRainTelemetry = (): LivingRainTelemetry => {
    return this.livingRainEngine.getTelemetry(
      this.tmpSimPos.copy(this.camera.position).divideScalar(WORLD_SCALE)
    );
  };

  public dispose() {
    if (this.animId !== null) {
      cancelAnimationFrame(this.animId);
    }
    if (this.spaceEnvironment) {
      this.spaceEnvironment.dispose();
      this.scene.remove(this.spaceEnvironment.rootGroup);
      this.spaceEnvironment = null;
    }
    if (this.weatherSystem) {
      this.weatherSystem.dispose();
      this.weatherSystem = null;
    }
    if (this.cameraRainRenderer) {
      this.cameraRainRenderer.dispose();
      this.cameraRainRenderer = null;
    }
    // The studio shares materials and textures across meshes; dispose each once.
    const materials = new Set<THREE.Material>();
    this.studioRoot.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const mat = mesh.material;
      if (Array.isArray(mat)) mat.forEach((m) => materials.add(m));
      else if (mat) materials.add(mat as THREE.Material);
    });
    materials.forEach((m) => {
      for (const value of Object.values(m)) {
        if (value instanceof THREE.Texture) value.dispose();
      }
      m.dispose();
    });
    this.studioRoot.clear();
    this.studio = null;
    this.envTarget?.dispose();
    this.envTarget = null;
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.domElement.remove();
      this.renderer = null;
    }
    this.container = null;
  }
}
