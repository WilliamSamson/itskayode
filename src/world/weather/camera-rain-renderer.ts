import * as THREE from "three";
import { LivingRainEngine } from "./living-rain-engine";
import { ZOOM_RANGES } from "../navigation/world-navigation";
import { STUDIO_ISLAND_BOUND } from "../studio/island";
import {
  cameraInIslandWeather,
  getBuildingRoofHeight,
  inIslandRainVolume,
  isInsideBuilding,
  isPointUnderRoof,
  overIsland,
} from "./weather-domain";

/**
 * CameraRainRenderer
 * Implements the 3-tier camera-relative perceptual rain model:
 * - 0-15m: Hero rain (large readable streaks, wind deflection, ground splash rings)
 * - 15-60m: Rain volume (dense particle field)
 * - 60m+: Rain curtains (translucent volumetric sheets moving with cell)
 * - Canopy throughfall dripping under tree boughs
 * - Zoom-level culling: Droplets vanish at Regional/World zoom, keeping performance high!
 */
export class CameraRainRenderer {
  public rootGroup: THREE.Group;

  // 1. Hero Rain (0-15m)
  public heroMesh: THREE.InstancedMesh;
  private readonly HERO_COUNT = 320;
  private heroPositions: Float32Array;
  private heroVelocities: Float32Array;
  private heroLengths: Float32Array;
  private heroDummy = new THREE.Object3D();

  // 2. Rain Volume (15-60m)
  public volumeMesh: THREE.InstancedMesh;
  private readonly VOLUME_COUNT = 850;
  private volumePositions: Float32Array;
  private volumeVelocities: Float32Array;
  private volumeDummy = new THREE.Object3D();

  // 3. Canopy Throughfall Dripping
  private dripMesh: THREE.InstancedMesh;
  private readonly DRIP_COUNT = 120;
  private dripPositions: Float32Array;
  private dripVelocities: Float32Array;
  private dripDummy = new THREE.Object3D();

  // 4. Ground Splash Rings
  private splashMesh: THREE.InstancedMesh;
  private readonly SPLASH_COUNT = 64;
  private splashTimes: Float32Array;
  private splashPositions: Float32Array;
  private splashDummy = new THREE.Object3D();

  // 5. Rain Curtains (60m+)
  public curtainsGroup: THREE.Group;

  // Working vectors
  private cameraPos = new THREE.Vector3();
  private prevCameraPos = new THREE.Vector3();

  /**
   * @param worldScale Storm cells live in the rain engine's calibrated units;
   *   world positions are divided by this before sampling them.
   */
  constructor(private engine: LivingRainEngine, private worldScale = 1) {
    this.rootGroup = new THREE.Group();
    this.rootGroup.name = "ORRA_CameraRainRenderer";

    // 1. Hero Rain Streaks: Aerodynamic teardrop streak (needle-fine trailing tail at top, droplet bead at bottom)
    const heroGeo = new THREE.CylinderGeometry(0.0018, 0.0085, 0.50, 6);
    heroGeo.computeVertexNormals();
    const heroMat = new THREE.MeshBasicMaterial({
      color: 0xebf4ff,
      transparent: true,
      opacity: 0.66,
      depthWrite: false,
    });
    this.heroMesh = new THREE.InstancedMesh(heroGeo, heroMat, this.HERO_COUNT);
    this.heroMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.rootGroup.add(this.heroMesh);

    this.heroPositions = new Float32Array(this.HERO_COUNT * 3);
    this.heroVelocities = new Float32Array(this.HERO_COUNT);
    this.heroLengths = new Float32Array(this.HERO_COUNT);
    this.initHeroPositions();

    // 2. Volume Rain Streaks (15-60m): Slender mid-distance streaks
    const volumeGeo = new THREE.CylinderGeometry(0.0012, 0.0055, 0.36, 4);
    const volumeMat = new THREE.MeshBasicMaterial({
      color: 0xbcd8f8,
      transparent: true,
      // Permeability: discrete streaks you see the world through, not a translucent sheet
      opacity: 0.32,
      depthWrite: false,
    });
    this.volumeMesh = new THREE.InstancedMesh(volumeGeo, volumeMat, this.VOLUME_COUNT);
    this.volumeMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.rootGroup.add(this.volumeMesh);

    this.volumePositions = new Float32Array(this.VOLUME_COUNT * 3);
    this.volumeVelocities = new Float32Array(this.VOLUME_COUNT);
    this.initVolumePositions();

    // 3. Canopy Throughfall Dripping (smooth condensed water beads)
    const dripGeo = new THREE.SphereGeometry(0.022, 8, 8);
    const dripMat = new THREE.MeshBasicMaterial({
      color: 0xe8f4ff,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
    });
    this.dripMesh = new THREE.InstancedMesh(dripGeo, dripMat, this.DRIP_COUNT);
    this.dripMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.rootGroup.add(this.dripMesh);

    this.dripPositions = new Float32Array(this.DRIP_COUNT * 3);
    this.dripVelocities = new Float32Array(this.DRIP_COUNT);
    this.initDripPositions();

    // 4. Ground & Roof Splash Rings (fine ripple contours)
    const splashGeo = new THREE.RingGeometry(0.03, 0.24, 16);
    splashGeo.rotateX(-Math.PI / 2);
    const splashMat = new THREE.MeshBasicMaterial({
      color: 0xc8e2ff,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.splashMesh = new THREE.InstancedMesh(splashGeo, splashMat, this.SPLASH_COUNT);
    this.splashMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.rootGroup.add(this.splashMesh);

    this.splashTimes = new Float32Array(this.SPLASH_COUNT);
    this.splashPositions = new Float32Array(this.SPLASH_COUNT * 3);
    this.initSplashPositions();

    // 5. Rain Curtains (60m+)
    this.curtainsGroup = new THREE.Group();
    this.rootGroup.add(this.curtainsGroup);
    this.buildRainCurtains();
  }

  private initHeroPositions(): void {
    for (let i = 0; i < this.HERO_COUNT; i++) {
      this.heroPositions[i * 3 + 0] = (Math.random() * 2 - 1) * 16.0;
      this.heroPositions[i * 3 + 1] = Math.random() * 18.0 - 2.0;
      this.heroPositions[i * 3 + 2] = (Math.random() * 2 - 1) * 16.0;
      this.heroVelocities[i] = 34.0 + Math.random() * 14.0;
      this.heroLengths[i] = 0.85 + Math.random() * 0.35;
    }
  }

  private initVolumePositions(): void {
    for (let i = 0; i < this.VOLUME_COUNT; i++) {
      // Shell between 15m and 55m
      const r = 15.0 + Math.random() * 40.0;
      const theta = Math.random() * Math.PI * 2;
      this.volumePositions[i * 3 + 0] = r * Math.cos(theta);
      this.volumePositions[i * 3 + 1] = Math.random() * 28.0 - 4.0;
      this.volumePositions[i * 3 + 2] = r * Math.sin(theta);
      this.volumeVelocities[i] = 32.0 + Math.random() * 12.0;
    }
  }

  private initDripPositions(): void {
    for (let i = 0; i < this.DRIP_COUNT; i++) {
      // Cluster near overlook canopy (-16.5, 1.8, 14.5)
      this.dripPositions[i * 3 + 0] = -16.5 + (Math.random() * 2 - 1) * 5.0;
      this.dripPositions[i * 3 + 1] = 3.5 + Math.random() * 4.0;
      this.dripPositions[i * 3 + 2] = 14.5 + (Math.random() * 2 - 1) * 5.0;
      this.dripVelocities[i] = 7.5 + Math.random() * 4.0;
    }
  }

  private initSplashPositions(): void {
    for (let i = 0; i < this.SPLASH_COUNT; i++) {
      this.splashTimes[i] = Math.random();
      const sx = (Math.random() * 2 - 1) * 14.0;
      const sz = (Math.random() * 2 - 1) * 14.0;
      const roofY = getBuildingRoofHeight(sx, sz);
      this.splashPositions[i * 3 + 0] = sx;
      this.splashPositions[i * 3 + 1] = roofY > 0 ? roofY + 0.02 : 0.12;
      this.splashPositions[i * 3 + 2] = sz;
    }
  }

  private buildRainCurtains(): void {
    // Flat rectangular billboard sheets removed to eliminate rectangular artifacts moving across the terrain.
    // curtainsGroup is retained for macroscopic rain group visibility control.
  }

  /**
   * Main render update loop.
   */
  public update(camera: THREE.PerspectiveCamera, dt: number, zoomRadius: number): void {
    camera.getWorldPosition(this.cameraPos);
    // Camera-relative rain must not chase the viewer into the cosmic void.
    this.rootGroup.visible = cameraInIslandWeather(this.cameraPos.x, this.cameraPos.y, this.cameraPos.z);
    if (!this.rootGroup.visible) {
      this.heroMesh.visible = false;
      this.volumeMesh.visible = false;
      this.dripMesh.visible = false;
      this.splashMesh.visible = false;
      this.curtainsGroup.visible = false;
      return;
    }
    const localRain = this.engine.evaluateRainAt(
      this.cameraPos.x / this.worldScale,
      this.cameraPos.z / this.worldScale
    );
    const wind = this.engine.wind;
    const windTiltX = wind.dx * (wind.speed / 42.0);
    const windTiltZ = wind.dz * (wind.speed / 42.0);

    // ============================================================
    // ZOOM PERCEPTION RULE:
    // When zoomed out to Regional / World zoom, individual droplets are
    // culled entirely to conserve GPU cycles.
    // ============================================================
    const isRegionalZoom = zoomRadius > ZOOM_RANGES.regional.min;
    const isElevated = this.cameraPos.y > 28;
    const effCamY = isElevated ? Math.min(24.0, Math.max(8.0, this.cameraPos.y * 0.35)) : this.cameraPos.y;
    const effCamX = Math.min(STUDIO_ISLAND_BOUND * 0.85, Math.max(-STUDIO_ISLAND_BOUND * 0.85, this.cameraPos.x));
    const effCamZ = Math.min(STUDIO_ISLAND_BOUND * 0.85, Math.max(-STUDIO_ISLAND_BOUND * 0.85, this.cameraPos.z));

    // 1. Hero Rain (0-15m)
    if (this.heroMesh) {
      if (!isRegionalZoom && localRain > 0.03) {
        this.heroMesh.visible = true;
        const activeCount = Math.floor(this.HERO_COUNT * Math.min(1.0, localRain * 1.3));

        for (let i = 0; i < this.HERO_COUNT; i++) {
          if (i >= activeCount) {
            this.heroDummy.position.set(0, -9999, 0);
            this.heroDummy.updateMatrix();
            this.heroMesh.setMatrixAt(i, this.heroDummy.matrix);
            continue;
          }

          this.heroPositions[i * 3 + 1] -= this.heroVelocities[i] * dt;
          this.heroPositions[i * 3 + 0] += wind.dx * wind.speed * 0.4 * dt;
          this.heroPositions[i * 3 + 2] += wind.dz * wind.speed * 0.4 * dt;

          let wx = (isElevated ? effCamX : this.cameraPos.x) + this.heroPositions[i * 3 + 0];
          let wy = effCamY + this.heroPositions[i * 3 + 1];
          let wz = (isElevated ? effCamZ : this.cameraPos.z) + this.heroPositions[i * 3 + 2];

          const roofY = getBuildingRoofHeight(wx, wz);
          const surfaceY = roofY > 0 ? roofY : 0.15;

          // If droplet hits surface, hits building column, or goes below bottom envelope, respawn
          if (isInsideBuilding(wx, wz) || wy <= surfaceY || this.heroPositions[i * 3 + 1] < -2.0) {
            this.heroPositions[i * 3 + 1] = 16.0;
            this.heroPositions[i * 3 + 0] = (Math.random() * 2 - 1) * 16.0;
            this.heroPositions[i * 3 + 2] = (Math.random() * 2 - 1) * 16.0;
            wx = (isElevated ? effCamX : this.cameraPos.x) + this.heroPositions[i * 3 + 0];
            wy = effCamY + this.heroPositions[i * 3 + 1];
            wz = (isElevated ? effCamZ : this.cameraPos.z) + this.heroPositions[i * 3 + 2];
          }

          const curRoofY = getBuildingRoofHeight(wx, wz);
          const curSurfaceY = curRoofY > 0 ? curRoofY : 0.15;

          this.heroDummy.position.set(wx, wy, wz);
          if (!inIslandRainVolume(wx, wy, wz) || isInsideBuilding(wx, wz) || wy < curSurfaceY) {
            this.heroDummy.position.set(0, -9999, 0);
          }
          this.heroDummy.scale.set(1.0, this.heroLengths[i], 1.0);
          this.heroDummy.rotation.set(-windTiltZ, 0, -windTiltX);
          this.heroDummy.updateMatrix();
          this.heroMesh.setMatrixAt(i, this.heroDummy.matrix);
        }

        this.heroMesh.instanceMatrix.needsUpdate = true;
        (this.heroMesh.material as THREE.MeshBasicMaterial).opacity =
          0.72 * Math.min(1.0, localRain * 1.25);
      } else {
        this.heroMesh.visible = false;
      }
    }

    // 2. Volume Rain (15-60m)
    if (this.volumeMesh) {
      if (!isRegionalZoom && localRain > 0.08) {
        this.volumeMesh.visible = true;
        const activeCount = Math.floor(this.VOLUME_COUNT * Math.min(1.0, localRain * 1.2));

        for (let i = 0; i < this.VOLUME_COUNT; i++) {
          if (i >= activeCount) {
            this.volumeDummy.position.set(0, -9999, 0);
            this.volumeDummy.updateMatrix();
            this.volumeMesh.setMatrixAt(i, this.volumeDummy.matrix);
            continue;
          }

          this.volumePositions[i * 3 + 1] -= this.volumeVelocities[i] * dt;
          this.volumePositions[i * 3 + 0] += wind.dx * wind.speed * 0.35 * dt;
          this.volumePositions[i * 3 + 2] += wind.dz * wind.speed * 0.35 * dt;

          let wx = (isElevated ? effCamX : this.cameraPos.x) + this.volumePositions[i * 3 + 0];
          let wy = effCamY + this.volumePositions[i * 3 + 1];
          let wz = (isElevated ? effCamZ : this.cameraPos.z) + this.volumePositions[i * 3 + 2];

          const roofY = getBuildingRoofHeight(wx, wz);
          const surfaceY = roofY > 0 ? roofY : 0.15;

          if (isInsideBuilding(wx, wz) || wy <= surfaceY || this.volumePositions[i * 3 + 1] < -4.0) {
            this.volumePositions[i * 3 + 1] = 24.0;
            const r = 15.0 + Math.random() * 40.0;
            const theta = Math.random() * Math.PI * 2;
            this.volumePositions[i * 3 + 0] = r * Math.cos(theta);
            this.volumePositions[i * 3 + 2] = r * Math.sin(theta);
            wx = (isElevated ? effCamX : this.cameraPos.x) + this.volumePositions[i * 3 + 0];
            wy = effCamY + this.volumePositions[i * 3 + 1];
            wz = (isElevated ? effCamZ : this.cameraPos.z) + this.volumePositions[i * 3 + 2];
          }

          const curRoofY = getBuildingRoofHeight(wx, wz);
          const curSurfaceY = curRoofY > 0 ? curRoofY : 0.15;

          this.volumeDummy.position.set(wx, wy, wz);
          if (!inIslandRainVolume(wx, wy, wz) || isInsideBuilding(wx, wz) || wy < curSurfaceY) {
            this.volumeDummy.position.set(0, -9999, 0);
          }
          this.volumeDummy.rotation.set(-windTiltZ, 0, -windTiltX);
          this.volumeDummy.updateMatrix();
          this.volumeMesh.setMatrixAt(i, this.volumeDummy.matrix);
        }

        this.volumeMesh.instanceMatrix.needsUpdate = true;
        (this.volumeMesh.material as THREE.MeshBasicMaterial).opacity =
          0.42 * Math.min(1.0, localRain * 1.2);
      } else {
        this.volumeMesh.visible = false;
      }
    }

    // 3. Canopy Throughfall Dripping (Branch drips under foliage)
    if (this.dripMesh) {
      if (!isRegionalZoom && this.engine.canopy.isDripping) {
        this.dripMesh.visible = true;
        const activeDrips = Math.floor(this.DRIP_COUNT * Math.min(1.0, this.engine.canopy.dripRate * 1.5));

        for (let i = 0; i < this.DRIP_COUNT; i++) {
          if (i >= activeDrips) {
            this.dripDummy.position.set(0, -9999, 0);
            this.dripDummy.updateMatrix();
            this.dripMesh.setMatrixAt(i, this.dripDummy.matrix);
            continue;
          }

          this.dripPositions[i * 3 + 1] -= this.dripVelocities[i] * dt;
          // When drip hits ground level (~1.8m), respawn up in branch
          if (this.dripPositions[i * 3 + 1] < 1.8) {
            this.dripPositions[i * 3 + 1] = 4.5 + Math.random() * 3.5;
            this.dripPositions[i * 3 + 0] = -16.5 + (Math.random() * 2 - 1) * 4.8;
            this.dripPositions[i * 3 + 2] = 14.5 + (Math.random() * 2 - 1) * 4.8;
          }

          const dx = this.dripPositions[i * 3 + 0];
          const dy = this.dripPositions[i * 3 + 1];
          const dz = this.dripPositions[i * 3 + 2];

          this.dripDummy.position.set(dx, dy, dz);
          if (isInsideBuilding(dx, dz) || isPointUnderRoof(dx, dy, dz)) {
            this.dripDummy.position.set(0, -9999, 0);
          }
          this.dripDummy.updateMatrix();
          this.dripMesh.setMatrixAt(i, this.dripDummy.matrix);
        }

        this.dripMesh.instanceMatrix.needsUpdate = true;
      } else {
        this.dripMesh.visible = false;
      }
    }

    // 4. Ground Splash Rings
    if (this.splashMesh) {
      if (!isRegionalZoom && localRain > 0.12) {
        this.splashMesh.visible = true;
        for (let i = 0; i < this.SPLASH_COUNT; i++) {
          this.splashTimes[i] += dt * 3.2;
          if (this.splashTimes[i] > 1.0) {
            this.splashTimes[i] = 0;
            const r = 3.0 + Math.random() * 16.0;
            const theta = Math.random() * Math.PI * 2;
            const sx = this.cameraPos.x + r * Math.cos(theta);
            const sz = this.cameraPos.z + r * Math.sin(theta);
            this.splashPositions[i * 3 + 0] = sx;
            this.splashPositions[i * 3 + 1] = 0.12;
            this.splashPositions[i * 3 + 2] = sz;
          }

          const t = this.splashTimes[i];
          const scale = 0.2 + t * 1.5;
          const sx = this.splashPositions[i * 3 + 0];
          const sy = this.splashPositions[i * 3 + 1];
          const sz = this.splashPositions[i * 3 + 2];
          this.splashDummy.position.set(sx, sy, sz);
          if (!overIsland(sx, sz) || isInsideBuilding(sx, sz)) {
            this.splashDummy.position.set(0, -9999, 0);
          }
          this.splashDummy.scale.set(scale, scale, scale);
          this.splashDummy.updateMatrix();
          this.splashMesh.setMatrixAt(i, this.splashDummy.matrix);
        }
        this.splashMesh.instanceMatrix.needsUpdate = true;
      } else {
        this.splashMesh.visible = false;
      }
    }

    // 5. Rain Curtains (60m+)
    const cell = this.engine.cell;
    this.curtainsGroup.visible = cell.intensity > 0.05 && localRain > 0.05;

    this.prevCameraPos.copy(this.cameraPos);
  }

  public dispose(): void {
    this.heroMesh.geometry.dispose();
    (this.heroMesh.material as THREE.Material).dispose();

    this.volumeMesh.geometry.dispose();
    (this.volumeMesh.material as THREE.Material).dispose();

    this.dripMesh.geometry.dispose();
    (this.dripMesh.material as THREE.Material).dispose();

    this.splashMesh.geometry.dispose();
    (this.splashMesh.material as THREE.Material).dispose();
  }
}
