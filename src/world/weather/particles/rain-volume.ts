import * as THREE from "three";
import { STUDIO_ISLAND_BOUND } from "../../studio/island";
import {
  cameraInIslandWeather,
  getBuildingRoofHeight,
  inIslandRainVolume,
  isInsideBuilding,
  overIsland,
  sampleIslandGround,
} from "../weather-domain";
import type { WeatherWorldState } from "../weather-world-state";

export class CameraRainVolume {
  public rainGroup: THREE.Group;
  public splashGroup: THREE.Group;

  public rainMesh: THREE.InstancedMesh;
  public splashMesh: THREE.InstancedMesh;

  private readonly RAIN_COUNT = 900;
  private readonly SPLASH_COUNT = 48;

  private rainPositions: Float32Array;
  private rainVelocities: Float32Array;
  private rainDummy = new THREE.Object3D();

  private splashTimes: Float32Array;
  private splashPositions: Float32Array;
  private splashDummy = new THREE.Object3D();

  constructor() {
    this.rainGroup = new THREE.Group();
    this.rainGroup.name = "ORRA_RainGroup";

    this.splashGroup = new THREE.Group();
    this.splashGroup.name = "ORRA_SplashGroup";

    // 1. Rain streaks: Slender aerodynamic droplet with tapered tail (top) and bead head (bottom)
    const streakGeo = new THREE.CylinderGeometry(0.0016, 0.0075, 0.46, 5);
    streakGeo.computeVertexNormals();

    const rainMat = new THREE.MeshBasicMaterial({
      color: 0xd6e8ff,
      transparent: true,
      opacity: 0.62,
      depthWrite: false,
    });

    this.rainMesh = new THREE.InstancedMesh(streakGeo, rainMat, this.RAIN_COUNT);
    this.rainMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.rainGroup.add(this.rainMesh);

    this.rainPositions = new Float32Array(this.RAIN_COUNT * 3);
    this.rainVelocities = new Float32Array(this.RAIN_COUNT);
    this.initRainPositions();

    // 2. Ground splash ripples: delicate, smooth concentric rings
    const ringGeo = new THREE.RingGeometry(0.03, 0.22, 16);
    ringGeo.rotateX(-Math.PI / 2);

    const splashMat = new THREE.MeshBasicMaterial({
      color: 0xc4dcff,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.splashMesh = new THREE.InstancedMesh(ringGeo, splashMat, this.SPLASH_COUNT);
    this.splashMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.splashGroup.add(this.splashMesh);

    this.splashTimes = new Float32Array(this.SPLASH_COUNT);
    this.splashPositions = new Float32Array(this.SPLASH_COUNT * 3);
    this.initSplashPositions();
  }

  private initRainPositions(): void {
    for (let i = 0; i < this.RAIN_COUNT; i++) {
      const pt = sampleIslandGround(i, this.RAIN_COUNT, STUDIO_ISLAND_BOUND);
      this.rainPositions[i * 3 + 0] = pt.x;
      this.rainPositions[i * 3 + 1] = Math.random() * 44.0 + 1.0;
      this.rainPositions[i * 3 + 2] = pt.z;
      this.rainVelocities[i] = 32.0 + Math.random() * 12.0;
    }
  }

  private initSplashPositions(): void {
    for (let i = 0; i < this.SPLASH_COUNT; i++) {
      this.splashTimes[i] = Math.random();
      const pt = sampleIslandGround(i * 17, this.SPLASH_COUNT * 17, STUDIO_ISLAND_BOUND);
      this.splashPositions[i * 3 + 0] = pt.x;
      this.splashPositions[i * 3 + 1] = 0.15;
      this.splashPositions[i * 3 + 2] = pt.z;
    }
  }

  public update(
    dt: number,
    state: WeatherWorldState,
    cameraPos: THREE.Vector3,
    focus?: THREE.Vector3
  ): void {
    const isRainType =
      state.precipitationType === "rain" || (!state.precipitationType && (state.temperature ?? 20) > 0);
    const isRainActive =
      isRainType && state.precipitation > 0.04 && cameraInIslandWeather(cameraPos.x, cameraPos.y, cameraPos.z);

    if (isRainActive) {
      this.rainMesh.visible = true;
      const windAngleX = state.wind * 0.24;
      const activeRainCount = Math.floor(this.RAIN_COUNT * Math.min(1.0, state.precipitation * 1.2));

      for (let i = 0; i < this.RAIN_COUNT; i++) {
        if (i >= activeRainCount) {
          this.rainDummy.position.set(0, -9999, 0);
          this.rainDummy.updateMatrix();
          this.rainMesh.setMatrixAt(i, this.rainDummy.matrix);
          continue;
        }

        this.rainPositions[i * 3 + 1] -= this.rainVelocities[i] * dt;
        this.rainPositions[i * 3 + 0] += state.wind * 14.0 * dt;

        let wx = this.rainPositions[i * 3 + 0];
        let wy = this.rainPositions[i * 3 + 1];
        let wz = this.rainPositions[i * 3 + 2];

        const roofY = getBuildingRoofHeight(wx, wz);
        const surfaceY = roofY > 0 ? roofY : 0.15;

        // When droplet hits ground, building column, or roof, respawn at cloud base (y ~ 44)
        if (isInsideBuilding(wx, wz) || wy <= surfaceY) {
          this.rainPositions[i * 3 + 1] = 42.0 + Math.random() * 4.5;
          // Respawn: 40% near the camera/focus for high local density, 60% distributed across island
          if (i < 360 && cameraInIslandWeather(cameraPos.x, cameraPos.y, cameraPos.z)) {
            const center = focus ?? cameraPos;
            const r = Math.random() * 26.0;
            const theta = Math.random() * Math.PI * 2;
            const candX = center.x + r * Math.cos(theta);
            const candZ = center.z + r * Math.sin(theta);
            if (overIsland(candX, candZ, 1.5) && !isInsideBuilding(candX, candZ)) {
              this.rainPositions[i * 3 + 0] = candX;
              this.rainPositions[i * 3 + 2] = candZ;
            } else {
              const pt = sampleIslandGround(i, this.RAIN_COUNT, STUDIO_ISLAND_BOUND);
              this.rainPositions[i * 3 + 0] = pt.x;
              this.rainPositions[i * 3 + 2] = pt.z;
            }
          } else {
            const pt = sampleIslandGround(i, this.RAIN_COUNT, STUDIO_ISLAND_BOUND);
            this.rainPositions[i * 3 + 0] = pt.x;
            this.rainPositions[i * 3 + 2] = pt.z;
          }
          wx = this.rainPositions[i * 3 + 0];
          wy = this.rainPositions[i * 3 + 1];
          wz = this.rainPositions[i * 3 + 2];
        }

        const curRoofY = getBuildingRoofHeight(wx, wz);
        const curSurfaceY = curRoofY > 0 ? curRoofY : 0.15;

        this.rainDummy.position.set(wx, wy, wz);
        if (!inIslandRainVolume(wx, wy, wz) || isInsideBuilding(wx, wz) || wy < curSurfaceY) {
          this.rainDummy.position.set(0, -9999, 0);
        }
        this.rainDummy.rotation.set(0, 0, -windAngleX);
        this.rainDummy.updateMatrix();
        this.rainMesh.setMatrixAt(i, this.rainDummy.matrix);
      }

      this.rainMesh.instanceMatrix.needsUpdate = true;
      (this.rainMesh.material as THREE.MeshBasicMaterial).opacity =
        0.65 * Math.min(1.0, state.precipitation * 1.25);
    } else {
      this.rainMesh.visible = false;
    }

    // Splashes
    if (isRainType && state.precipitation > 0.15 && cameraInIslandWeather(cameraPos.x, cameraPos.y, cameraPos.z)) {
      this.splashMesh.visible = true;
      for (let i = 0; i < this.SPLASH_COUNT; i++) {
        this.splashTimes[i] += dt * 3.5;
        if (this.splashTimes[i] > 1.0) {
          this.splashTimes[i] = 0;
          const pt = sampleIslandGround(i * 19, this.SPLASH_COUNT * 19, STUDIO_ISLAND_BOUND);
          this.splashPositions[i * 3 + 0] = pt.x;
          this.splashPositions[i * 3 + 1] = 0.15;
          this.splashPositions[i * 3 + 2] = pt.z;
        }

        const t = this.splashTimes[i];
        const scale = 0.2 + t * 1.4;
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

  public dispose(): void {
    this.rainMesh.geometry.dispose();
    (this.rainMesh.material as THREE.Material).dispose();
    this.splashMesh.geometry.dispose();
    (this.splashMesh.material as THREE.Material).dispose();
  }
}
