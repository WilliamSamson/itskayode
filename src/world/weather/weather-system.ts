import * as THREE from "three";
import { GodRaySystem } from "./god-ray-system";
import { WeatherStateManager } from "./weather-world-state";
import type { CameraPerspective } from "../navigation/world-navigation";
import { VolumetricCloudSystem, type CloudFormation, type CloudLobe } from "./atmosphere/cloud-system";
import { ValleyMistSystem } from "./atmosphere/valley-mist-system";
import { CameraRainVolume } from "./particles/rain-volume";
import { CameraSnowVolume } from "./particles/snow-volume";
import { CameraSandVolume } from "./particles/sand-volume";

export type { CloudFormation, CloudLobe };

/**
 * WeatherSystem
 * Modular orchestrator for the ORRA dynamic atmosphere:
 * - Volumetric Cloud System (over-island cumulus deck, advection, perspective lift)
 * - Valley Inversion Ground Mist (pooling in hollows, soft atmospheric scattering)
 * - Camera-Centric Particle Volumes (rain streaks, splashes, snow flurries, sandstorm dust)
 * - Crepuscular Sunbeams (Mie forward-scattering solar god rays)
 */
export class WeatherSystem {
  public rootGroup: THREE.Group;

  // Visual subsystems
  private cloudSystem: VolumetricCloudSystem;
  private shadowGroup: THREE.Group;
  private rainVolume: CameraRainVolume;
  private curtainGroup: THREE.Group;
  private mistGroup: THREE.Group;
  private valleyMist: ValleyMistSystem;
  private godRays: GodRaySystem;
  private snowVolume: CameraSnowVolume;
  private sandVolume: CameraSandVolume;

  // Reusable math objects
  private cameraPos = new THREE.Vector3();
  private cameraForward = new THREE.Vector3();

  constructor(
    private scene: THREE.Scene,
    private weatherManager: WeatherStateManager,
    worldScale = 1,
    cloudLift = 0
  ) {
    this.rootGroup = new THREE.Group();
    this.rootGroup.name = "ORRA_WeatherSystem";

    this.cloudSystem = new VolumetricCloudSystem(worldScale, cloudLift);
    this.shadowGroup = new THREE.Group();
    this.rainVolume = new CameraRainVolume();
    this.curtainGroup = new THREE.Group();
    this.mistGroup = new THREE.Group();
    this.valleyMist = new ValleyMistSystem();
    this.godRays = new GodRaySystem(undefined, worldScale);
    this.snowVolume = new CameraSnowVolume();
    this.sandVolume = new CameraSandVolume();

    // Exact child ordering preserved for domain unit tests
    this.rootGroup.add(this.cloudSystem.group);       // 0: cloudsGroup
    this.rootGroup.add(this.shadowGroup);             // 1: shadowGroup
    this.rootGroup.add(this.rainVolume.rainGroup);    // 2: rainGroup
    this.rootGroup.add(this.rainVolume.splashGroup);  // 3: splashGroup
    this.rootGroup.add(this.curtainGroup);            // 4: curtainGroup
    this.rootGroup.add(this.mistGroup);               // 5: mistGroup
    this.rootGroup.add(this.valleyMist.group);        // 6: valleyInversionGroup
    this.rootGroup.add(this.godRays.group);           // 7: godRays
    this.rootGroup.add(this.snowVolume.group);        // 8: snowGroup
    this.rootGroup.add(this.sandVolume.group);        // 9: sandGroup

    this.scene.add(this.rootGroup);
  }

  /**
   * Cloud formations exposed for inspection and test coverage.
   */
  public get cloudFormations(): CloudFormation[] {
    return this.cloudSystem.cloudFormations;
  }

  /**
   * Aligns crepuscular god rays with the celestial key light.
   */
  public setSunDirection(dir: THREE.Vector3): void {
    this.godRays.setSunDirection(dir);
  }

  public update(
    camera: THREE.PerspectiveCamera,
    dt: number,
    worldTheme: "dark" | "light" = "dark",
    perspective?: CameraPerspective,
    focus?: THREE.Vector3
  ): void {
    const state = this.weatherManager.current;
    camera.getWorldPosition(this.cameraPos);
    camera.getWorldDirection(this.cameraForward);

    let activePerspective: CameraPerspective = perspective || "oblique";
    if (!perspective && camera) {
      const r = this.cameraPos.length();
      if (r > 0.001) {
        const phi = Math.acos(Math.max(-1, Math.min(1, this.cameraPos.y / r)));
        if (phi < 0.58) activePerspective = "overhead";
        else if (phi > 1.12) activePerspective = "horizon";
        else activePerspective = "oblique";
      }
    }

    const isOverhead = activePerspective === "overhead";

    // 1. Clouds
    this.cloudSystem.update(dt, state, worldTheme, activePerspective);

    // 2. Liquid Rain & Splashes
    this.rainVolume.update(dt, state, this.cameraPos, focus);

    // 3. Snow Flurries
    this.snowVolume.update(dt, state, this.cameraPos);

    // 4. Sandstorm Dust Shear
    this.sandVolume.update(dt, state, this.cameraPos);

    // 5. Valley Inversion Ground Mist
    this.valleyMist.update(dt, state, worldTheme, isOverhead);

    // 6. Crepuscular Solar God Rays
    this.godRays.setColor(worldTheme === "light" ? 0xfff2c4 : 0xbcd0f0);
    this.godRays.update(
      camera,
      dt,
      (state.crepuscularRays || 0.0) * state.sunExposure * (worldTheme === "light" ? 1.0 : 0.55),
      0
    );
  }

  public dispose(): void {
    this.cloudSystem.dispose();
    this.rainVolume.dispose();
    this.snowVolume.dispose();
    this.sandVolume.dispose();
    this.valleyMist.dispose();
    this.godRays.dispose();
  }
}
